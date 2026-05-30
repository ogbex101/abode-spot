// ============================================
// Auth Provider
// - Wraps Supabase auth, exposes user + role + verification state.
// - Role is fetched from `user_roles` table (server-side enforced via RLS).
// - DOES NOT do client-side role overrides for any email — privilege
//   escalation is prevented at the DB layer. Admin accounts are
//   provisioned in Supabase (see supabase/schema.sql instructions).
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
    fullName: string
  ) => Promise<{ error: string | null; needsVerification: boolean }>;
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
    // Highest privilege wins.
    const roleList = (roles ?? []).map((r: { role: AppRole }) => r.role);
    const resolved: AppRole = roleList.includes("admin")
      ? "admin"
      : roleList.includes("agent")
      ? "agent"
      : "user";
    setRole(resolved);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Set listener FIRST (Supabase recommendation)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer DB calls to avoid deadlock inside listener
        setTimeout(() => loadProfileAndRole(s.user.id), 0);
      } else {
        setProfile(null);
        setRole("user");
      }
      // Invalidate caches on any auth change
      queryClient.invalidateQueries();
      router.invalidate();
    });
    // Then read existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadProfileAndRole(s.user.id);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, fullName) => {
    if (!supabase) return { error: "Supabase not configured", needsVerification: false };
    const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { full_name: fullName },
      },
    });
    if (error) return { error: error.message, needsVerification: false };
    const needsVerification = !data.session;
    return { error: null, needsVerification };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfileAndRole(user.id);
  };

  const isVerified = useMemo(
    () => Boolean(user?.email_confirmed_at) || role === "admin",
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
