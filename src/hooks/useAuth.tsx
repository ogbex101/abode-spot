// ============================================
// Auth Provider with Agent Approval Flow
// ============================================
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { AppRole, AppUser } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { getErrorMessage, toAppError } from "@/lib/errors";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: AppUser | null;
  role: AppRole;
  isVerified: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, desiredRole?: "user" | "agent") => Promise<{ error: string | null; needsVerification: boolean }>;
  applyForAgent: (data: any) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [role, setRole] = useState<AppRole>("user");
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();
  const profileLoadForUser = useRef<string | null>(null);

  const clearAuthState = useCallback(async () => {
    profileLoadForUser.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole("user");
    await queryClient.cancelQueries();
    queryClient.clear();
    await router.invalidate();
  }, [queryClient, router]);

  const loadProfileAndRole = useCallback(async (authUser: User) => {
    if (!supabase) return;
    try {
      const { data: prof, error: profError } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();
      if (profError) throw profError;

      let profileRow = prof as AppUser | null;
      if (!profileRow) {
        const { data: repairedProfile, error: repairError } = await supabase
          .from("users")
          .upsert({
            id: authUser.id,
            email: authUser.email ?? "",
            full_name: (authUser.user_metadata?.full_name as string | undefined) ?? "",
            role: "user",
            is_verified: Boolean(authUser.email_confirmed_at),
            agent_status: "not_applied",
          }, { onConflict: "id" })
          .select("*")
          .single();
        if (repairError) throw repairError;
        profileRow = repairedProfile as AppUser;
      }

      setProfile(profileRow);

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUser.id);
      if (rolesError) throw rolesError;

      let roleList = (roles ?? []).map((item: { role: string }) => item.role);
      if (roleList.length === 0) {
        const { error: basicRoleError } = await supabase.from("user_roles").upsert({
          user_id: authUser.id,
          role: "user",
        }, { onConflict: "user_id,role", ignoreDuplicates: true });
        if (basicRoleError) throw basicRoleError;
        roleList = ["user"];
      }

      let resolvedRole: AppRole = "user";
      if (roleList.includes("admin")) resolvedRole = "admin";
      else if (roleList.includes("agent")) resolvedRole = "agent";
      else if (roleList.includes("pending_agent")) resolvedRole = "pending_agent";
      setRole(resolvedRole);

      if (profileRow.role !== resolvedRole) {
        void supabase.from("users").update({ role: resolvedRole }).eq("id", authUser.id);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, []);

  const startProfileLoad = useCallback((authUser: User) => {
    if (profileLoadForUser.current === authUser.id) return;
    profileLoadForUser.current = authUser.id;
    void loadProfileAndRole(authUser).finally(() => {
      if (profileLoadForUser.current === authUser.id) profileLoadForUser.current = null;
    });
  }, [loadProfileAndRole]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (nextSession?.user) {
        startProfileLoad(nextSession.user);
        queryClient.invalidateQueries();
        void router.invalidate();
      } else {
        void clearAuthState();
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);
    });

    supabase.auth.getSession()
      .then(({ data: { session: nextSession } }) => applySession(nextSession))
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearAuthState, queryClient, router, startProfileLoad]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: getErrorMessage("Supabase not configured") };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? getErrorMessage(error, "Could not sign in. Please try again.") : null };
  };

  const signUp = async (email: string, password: string, fullName: string, desiredRole: "user" | "agent" = "user") => {
    if (!supabase) return { error: getErrorMessage("Supabase not configured"), needsVerification: false };
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: getErrorMessage(error, "Could not create your account. Please try again."), needsVerification: false };
      if (!data.user) return { error: "Signup failed", needsVerification: false };

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const initialRole = desiredRole === "agent" ? "pending_agent" : "user";
      await supabase.from("users").upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: initialRole,
        is_verified: true,
        agent_status: desiredRole === "agent" ? "pending" : "not_applied",
      }, { onConflict: "id" });
      const { error: roleError } = await supabase.from("user_roles").upsert({
        user_id: data.user.id,
        role: initialRole,
      }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (roleError) throw roleError;
      return { error: null, needsVerification: false };
    } catch (error) {
      console.error("Signup error:", error);
      return { error: getErrorMessage(error, "Could not create your account. Please try again."), needsVerification: false };
    }
  };

  const applyForAgent = async (applicationData: any) => {
    if (!supabase || !user) return { error: getErrorMessage("Not logged in") };
    try {
      const { error: roleError } = await supabase.from("user_roles").upsert({
        user_id: user.id,
        role: "pending_agent",
      }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (roleError) throw roleError;
      const { error: userError } = await supabase.from("users").update({
        role: "pending_agent",
        agent_status: "pending",
      }).eq("id", user.id);
      if (userError) throw userError;
      const { error } = await supabase.from("agent_applications").insert({
        user_id: user.id,
        full_name: applicationData.fullName,
        email: user.email,
        phone: applicationData.phone,
        company_name: applicationData.companyName,
        license_number: applicationData.licenseNumber,
        message: applicationData.message,
        status: "pending",
      });
      if (error) throw toAppError(error, "Could not submit your application. Please try again.");
      return { error: null };
    } catch (error) {
      return { error: getErrorMessage(error, "Could not submit your application. Please try again.") };
    }
  };

  const signOut = async () => {
    if (!supabase) {
      await clearAuthState();
      return;
    }
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) console.warn("Sign out error:", getErrorMessage(error, "Could not complete sign out."));
    await clearAuthState();
  };

  const refreshProfile = async () => {
    if (!user) return;
    profileLoadForUser.current = null;
    await loadProfileAndRole(user);
  };

  const isVerified = useMemo(() => Boolean(user), [user]);

  return (
    <AuthContext.Provider value={{ user, session, profile, role, isVerified, loading, signIn, signUp, applyForAgent, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

export { isSupabaseConfigured };
