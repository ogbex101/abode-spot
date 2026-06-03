// ============================================
// Auth Provider — no email verification required.
// Role is fetched from `user_roles` table (server-side enforced via RLS).
// ============================================
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { AppRole, AppUser } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: AppUser | null;
  role: AppRole;
  isVerified: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    desiredRole?: "user" | "agent"
  ) => Promise<{ error: string | null; needsVerification: boolean; role?: AppRole }>;
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

  const loadProfileAndRole = async (uid: string) => {
    if (!supabase) return;
    const [{ data: prof }, { data: roles }] = await Promise.all([
      supabase.from("users").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as AppUser) ?? null);
    const roleList = (roles ?? []).map((r: { role: AppRole }) => r.role);

    // user_roles is the authoritative source — resolve effective role from it
    const resolved: AppRole = roleList.includes("admin")
      ? "admin"
      : roleList.includes("agent")
      ? "agent"
      : "user";
    setRole(resolved);
    return resolved;
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const resolvedRole = await loadProfileAndRole(s.user.id);
        router.invalidate();
      } else {
        setProfile(null);
        setRole("user");
      }
      queryClient.invalidateQueries();
    });
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadProfileAndRole(s.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, fullName, desiredRole = "user") => {
    if (!supabase) return { error: "Supabase not configured", needsVerification: false };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) return { error: error.message, needsVerification: false };
    if (!data.user) return { error: "Signup failed — no user returned", needsVerification: false };

    // Wait for the DB trigger to create the users row
    await new Promise((r) => setTimeout(r, 1500));

    // Upsert the user profile
    await supabase.from("users").upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName,
        role: desiredRole,
        is_verified: true,
      },
      { onConflict: "id" }
    );

    // Assign the correct role in user_roles
    if (desiredRole === "agent") {
      await supabase
        .from("user_roles")
        .upsert({ user_id: data.user.id, role: "user" }, { onConflict: "user_id,role" });
      await supabase
        .from("user_roles")
        .upsert({ user_id: data.user.id, role: "agent" }, { onConflict: "user_id,role" });
    } else {
      await supabase
        .from("user_roles")
        .upsert({ user_id: data.user.id, role: "user" }, { onConflict: "user_id,role" });
    }

    // Wait additional time for role to be fully committed
    await new Promise((r) => setTimeout(r, 1000));

    // Refresh the session to get the latest role
    await supabase.auth.refreshSession();
    
    // Load the role directly
    const resolvedRole = await loadProfileAndRole(data.user.id);

    return { error: null, needsVerification: false, role: resolvedRole };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfileAndRole(user.id);
  };

  const isVerified = useMemo(
    () => Boolean(user) || role === "admin",
    [user, role]
  );

  const value: AuthContextValue = {
    user,
    session,
    profile,
    role,
    isVerified,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export { isSupabaseConfigured };
