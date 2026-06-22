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
import { toast } from "sonner";

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
const PROFILE_LOAD_TIMEOUT_MS = 30_000;

function fallbackProfile(authUser: User): AppUser {
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    role: "user",
    is_verified: Boolean(authUser.email_confirmed_at),
    full_name: (authUser.user_metadata?.full_name as string | undefined) ?? null,
    phone: null,
    company_name: null,
    avatar_url: null,
    created_at: new Date().toISOString(),
  };
}

function isAppRole(value: unknown): value is AppRole {
  return value === "admin" || value === "agent" || value === "pending_agent" || value === "user";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Profile load timed out")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [role, setRole] = useState<AppRole>("user");
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();
  const activeSessionUserId = useRef<string | null>(null);
  const profileLoadedForUser = useRef<string | null>(null);
  const profileSeenForUser = useRef<string | null>(null);
  const profileLoadForUser = useRef<{ userId: string; promise: Promise<void> } | null>(null);
  const previousRole = useRef<AppRole | null>(null);
  const approvalToastForUser = useRef<string | null>(null);

  const clearAuthState = useCallback(async () => {
    activeSessionUserId.current = null;
    profileLoadedForUser.current = null;
    profileSeenForUser.current = null;
    profileLoadForUser.current = null;
    previousRole.current = null;
    approvalToastForUser.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole("user");
    setLoading(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await router.invalidate();
  }, [queryClient, router]);

  const loadProfileAndRole = useCallback(async (authUser: User) => {
    if (!supabase) {
      setProfile(fallbackProfile(authUser));
      setRole("user");
      return;
    }

    const isCurrentUser = () => activeSessionUserId.current === authUser.id;
    const { data: prof, error: profError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();
    if (profError) throw profError;
    if (!isCurrentUser()) return;

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
      if (!isCurrentUser()) return;
      profileRow = repairedProfile as AppUser;
    }

    setProfile(profileRow);
    profileSeenForUser.current = authUser.id;
    setRole(isAppRole(profileRow.role) ? profileRow.role : "user");

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id);
    if (rolesError) throw rolesError;
    if (!isCurrentUser()) return;

    let roleList = (roles ?? []).map((item: { role: string }) => item.role);
    if (roleList.length === 0) {
      const { error: basicRoleError } = await supabase.from("user_roles").upsert({
        user_id: authUser.id,
        role: "user",
      }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (basicRoleError) throw basicRoleError;
      if (!isCurrentUser()) return;
      roleList = ["user"];
    }

    let resolvedRole: AppRole = "user";
    if (roleList.includes("admin")) resolvedRole = "admin";
    else if (roleList.includes("agent")) resolvedRole = "agent";
    else if (roleList.includes("pending_agent")) resolvedRole = "pending_agent";
    setRole(resolvedRole);

    if (profileRow.role !== resolvedRole && isCurrentUser()) {
      void supabase.from("users").update({ role: resolvedRole }).eq("id", authUser.id);
    }
  }, []);

  const startProfileLoad = useCallback((authUser: User) => {
    if (profileLoadedForUser.current === authUser.id) return Promise.resolve();
    if (profileLoadForUser.current?.userId === authUser.id) return profileLoadForUser.current.promise;

    let loadedProfile = false;
    const promise = withTimeout(loadProfileAndRole(authUser), PROFILE_LOAD_TIMEOUT_MS)
      .then(() => {
        loadedProfile = true;
      })
      .catch((error) => {
        if (activeSessionUserId.current !== authUser.id) return;
        const rawMessage = error instanceof Error ? error.message : "";
        if (/timed out/i.test(rawMessage)) {
          console.warn("Profile load timed out; using a temporary profile fallback.");
        } else {
          console.error("Error loading profile:", error);
        }
        if (profileSeenForUser.current !== authUser.id) {
          setProfile(fallbackProfile(authUser));
          setRole("user");
        }
      })
      .finally(() => {
        if (loadedProfile && activeSessionUserId.current === authUser.id) {
          profileLoadedForUser.current = authUser.id;
        }
        if (profileLoadForUser.current?.userId === authUser.id) profileLoadForUser.current = null;
      });

    profileLoadForUser.current = { userId: authUser.id, promise };
    return promise;
  }, [loadProfileAndRole]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;
      const nextUserId = nextSession?.user.id ?? null;
      const isDifferentUser = activeSessionUserId.current !== nextUserId;
      activeSessionUserId.current = nextUserId;
      if (isDifferentUser) {
        profileLoadedForUser.current = null;
        profileSeenForUser.current = null;
        profileLoadForUser.current = null;
        setProfile(null);
        setRole("user");
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        const profilePromise = startProfileLoad(nextSession.user);
        setLoading(profileLoadedForUser.current !== nextSession.user.id);
        void profilePromise.finally(() => {
          if (!mounted || activeSessionUserId.current !== nextSession.user.id) return;
          setLoading(false);
          queryClient.invalidateQueries();
          void router.invalidate();
        });
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

  useEffect(() => {
    if (!user) {
      previousRole.current = null;
      approvalToastForUser.current = null;
      return;
    }

    if (
      previousRole.current === "pending_agent"
      && role === "agent"
      && approvalToastForUser.current !== user.id
    ) {
      toast.success("Your agent account has been approved. You can now list properties and chat with clients.", {
        duration: 5000,
      });
      approvalToastForUser.current = user.id;
    }

    previousRole.current = role;
  }, [role, user]);

  useEffect(() => {
    if (!user || !supabase) return;

    const refreshCurrentProfile = () => {
      if (profileLoadForUser.current?.userId === user.id) return;
      profileLoadedForUser.current = null;
      void startProfileLoad(user).finally(() => {
        if (activeSessionUserId.current !== user.id) return;
        queryClient.invalidateQueries();
        void router.invalidate();
      });
    };

    const subscription = supabase
      .channel(`auth-profile:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users", filter: `id=eq.${user.id}` },
        refreshCurrentProfile
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${user.id}` },
        refreshCurrentProfile
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, router, startProfileLoad, user]);

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
    if (!supabase) return { error: getErrorMessage("Supabase not configured") };
    try {
      const currentUser = user ?? (await supabase.auth.getUser()).data.user;
      if (!currentUser) return { error: getErrorMessage("Not logged in") };

      const { error: roleError } = await supabase.from("user_roles").upsert({
        user_id: currentUser.id,
        role: "pending_agent",
      }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (roleError) throw roleError;
      const { error: userError } = await supabase.from("users").update({
        role: "pending_agent",
        agent_status: "pending",
      }).eq("id", currentUser.id);
      if (userError) throw userError;
      const { error } = await supabase.from("agent_applications").insert({
        user_id: currentUser.id,
        full_name: applicationData.fullName,
        email: currentUser.email,
        phone: applicationData.phone,
        company_name: applicationData.companyName,
        license_number: applicationData.licenseNumber,
        message: applicationData.message,
        status: "pending",
      });
      if (error) throw toAppError(error, "Could not submit your application. Please try again.");
      setProfile((current) => ({
        ...(current && current.id === currentUser.id ? current : fallbackProfile(currentUser)),
        role: "pending_agent",
        phone: applicationData.phone || current?.phone || null,
        company_name: applicationData.companyName || current?.company_name || null,
      }));
      setRole("pending_agent");
      activeSessionUserId.current = currentUser.id;
      profileLoadedForUser.current = currentUser.id;
      profileSeenForUser.current = currentUser.id;
      queryClient.invalidateQueries();
      void router.invalidate();
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
    profileLoadedForUser.current = null;
    profileLoadForUser.current = null;
    setLoading(true);
    await startProfileLoad(user);
    if (activeSessionUserId.current === user.id) setLoading(false);
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
