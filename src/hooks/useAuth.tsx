// ============================================
// Auth Provider with Agent Approval Flow
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

  const loadProfileAndRole = async (uid: string) => {
    if (!supabase) return;
    
    try {
      const { data: prof, error: profError } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      
      if (profError) throw profError;
      setProfile((prof as AppUser) ?? null);
      
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      
      if (rolesError) throw rolesError;
      
      const roleList = (roles ?? []).map((r: { role: string }) => r.role);
      
      let resolvedRole: AppRole = "user";
      if (roleList.includes("admin")) resolvedRole = "admin";
      else if (roleList.includes("agent")) resolvedRole = "agent";
      else if (roleList.includes("pending_agent")) resolvedRole = "pending_agent";
      else resolvedRole = "user";
      
      setRole(resolvedRole);
      
      if (prof && (prof as AppUser).role !== resolvedRole) {
        supabase.from("users").update({ role: resolvedRole }).eq("id", uid);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
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
    
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string, fullName: string, desiredRole: "user" | "agent" = "user") => {
    if (!supabase) return { error: "Supabase not configured", needsVerification: false };

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      
      if (error) return { error: error.message, needsVerification: false };
      if (!data.user) return { error: "Signup failed", needsVerification: false };

      await new Promise((r) => setTimeout(r, 1000));

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
        role: initialRole 
      }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (roleError) throw roleError;

      return { error: null, needsVerification: false };
    } catch (err) {
      console.error("Signup error:", err);
      return { error: "An unexpected error occurred", needsVerification: false };
    }
  };

  const applyForAgent = async (applicationData: any) => {
    if (!supabase || !user) return { error: "Not logged in" };
    
    try {
      const { error: roleError } = await supabase.from("user_roles").upsert({
        user_id: user.id,
        role: "pending_agent"
      }, { onConflict: "user_id,role", ignoreDuplicates: true });
      if (roleError) throw roleError;
      
      const { error: userError } = await supabase.from("users").update({
        role: "pending_agent",
        agent_status: "pending"
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
      
      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: (err as Error).message };
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

  return (
    <AuthContext.Provider value={{
      user, session, profile, role, isVerified, loading,
      signIn, signUp, applyForAgent, signOut, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export { isSupabaseConfigured };
