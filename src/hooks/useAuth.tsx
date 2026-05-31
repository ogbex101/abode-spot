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
    const roleList = (roles ?? []).map((r: { role: AppRole }) => r.role);

    // user_roles is the authoritative source — resolve effective role from it
    const resolved: AppRole = roleList.includes("admin")
      ? "admin"
      : roleList.includes("agent")
      ? "agent"
      : "user";
    setRole(resolved);

    // Keep public.users.role in sync so admin panel and profile display match
    if (prof && (prof as AppUser).role !== resolved) {
      await supabase.from("users").update({ role: resolved }).eq("id", uid);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfileAndRole(s.user.id), 0);
      } else {
        setProfile(null);
        setRole("user");
      }
      queryClient.invalidateQueries();
      router.invalidate();
    });
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

  const signUp: AuthContextValue["signUp"] = async (email, password, fullName, desiredRole = "user") => {
    if (!supabase) return { error: "Supabase not configured", needsVerification: false };

    // Sign up WITHOUT email confirmation — users get immediate access.
    // Make sure "Enable email confirmations" is OFF in Supabase Dashboard > Auth > Settings.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) return { error: error.message, needsVerification: false };
    if (!data.user) return { error: "Signup failed — no user returned", needsVerification: false };

    // Auto-confirm the email via our secure Vercel API route so the user
    // can sign in immediately — no confirmation email required.
    try {
      await fetch("/api/confirm-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.user.id }),
      });
    } catch (confirmErr) {
      console.warn("Auto-confirm request failed (non-fatal):", confirmErr);
    }

    // Wait a moment for the DB trigger to create the users row
    await new Promise((r) => setTimeout(r, 800));

    // Upsert the user profile (trigger may have already created it)
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
      // First ensure the default 'user' row exists (from trigger)
      await supabase
        .from("user_roles")
        .upsert({ user_id: data.user.id, role: "user" }, { onConflict: "user_id,role" });
      // Then add the agent role
      await supabase
        .from("user_roles")
        .upsert({ user_id: data.user.id, role: "agent" }, { onConflict: "user_id,role" });
    } else {
      await supabase
        .from("user_roles")
        .upsert({ user_id: data.user.id, role: "user" }, { onConflict: "user_id,role" });
    }

    return { error: null, needsVerification: false };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfileAndRole(user.id);
  };

  // isVerified is always true — we removed the verification gate
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
