// ============================================
// Auth Provider — Simplified with proper role handling
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
    
    try {
      // Fetch user profile
      const { data: prof, error: profError } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      
      if (profError) {
        console.error("Error loading profile:", profError);
        return;
      }
      
      setProfile((prof as AppUser) ?? null);
      
      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      
      if (rolesError) {
        console.error("Error loading roles:", rolesError);
        return;
      }
      
      const roleList = (roles ?? []).map((r: { role: AppRole }) => r.role);
      
      // Determine role: admin > agent > user
      let resolvedRole: AppRole = "user";
      if (roleList.includes("admin")) resolvedRole = "admin";
      else if (roleList.includes("agent")) resolvedRole = "agent";
      else resolvedRole = "user";
      
      setRole(resolvedRole);
      
      // Update public.users.role for consistency (don't await, let it run in background)
      if (prof && (prof as AppUser).role !== resolvedRole) {
        supabase.from("users").update({ role: resolvedRole }).eq("id", uid);
      }
    } catch (error) {
      console.error("Error in loadProfileAndRole:", error);
    }
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
        await loadProfileAndRole(s.user.id);
      } else {
        setProfile(null);
        setRole("user");
      }
      queryClient.invalidateQueries();
      router.invalidate();
    });
    
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadProfileAndRole(s.user.id);
      setLoading(false);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp: AuthContextValue["signUp"] = async (email, password, fullName, desiredRole = "user") => {
    if (!supabase) return { error: "Supabase not configured", needsVerification: false };

    try {
      // Sign up - email confirmation should be OFF in Supabase settings
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      
      if (error) return { error: error.message, needsVerification: false };
      if (!data.user) return { error: "Signup failed — no user returned", needsVerification: false };

      // Wait a moment for the database trigger to create the users row
      await new Promise((r) => setTimeout(r, 1000));

      // Upsert the user profile
      const { error: upsertError } = await supabase.from("users").upsert(
        {
          id: data.user.id,
          email,
          full_name: fullName,
          role: desiredRole,
          is_verified: true,
        },
        { onConflict: "id" }
      );
      
      if (upsertError) console.error("Error upserting user:", upsertError);

      // Assign the role in user_roles
      if (desiredRole === "agent") {
        // Add user role first
        await supabase
          .from("user_roles")
          .upsert({ user_id: data.user.id, role: "user" }, { onConflict: "user_id,role" });
        // Add agent role
        await supabase
          .from("user_roles")
          .upsert({ user_id: data.user.id, role: "agent" }, { onConflict: "user_id,role" });
      } else {
        await supabase
          .from("user_roles")
          .upsert({ user_id: data.user.id, role: "user" }, { onConflict: "user_id,role" });
      }

      return { error: null, needsVerification: false };
    } catch (err) {
      console.error("Signup error:", err);
      return { error: "An unexpected error occurred", needsVerification: false };
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await loadProfileAndRole(user.id);
  };

  const isVerified = useMemo(() => Boolean(user), [user]);

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
