import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { MOCK_INQUIRIES } from "@/lib/mock-data";
import type { Inquiry, InquiryStatus } from "@/lib/types";

export function useInquiries(opts: { scope: "user" | "admin" | "agent" } = { scope: "user" }) {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ["inquiries", opts.scope, user?.id ?? "anon", role],
    queryFn: async () => {
      if (!isSupabaseConfigured || !supabase) return MOCK_INQUIRIES;

      // Base query with full joins
      let q = supabase
        .from("inquiries")
        .select("*, property:properties(*, agent:users!properties_agent_id_fkey(*)), user:users!inquiries_user_id_fkey(*)")
        .order("created_at", { ascending: false });

      if (opts.scope === "user" && user) {
        // Buyer sees their own sent inquiries
        q = q.eq("user_id", user.id);
      } else if (opts.scope === "agent" && user) {
        // Agent sees inquiries on their own listed properties
        // We filter client-side after fetching since RLS already restricts
        const { data, error } = await q;
        if (error) throw new Error(error.message);
        const items = (data as Inquiry[]) ?? [];
        // Filter to only inquiries where property.agent_id === current user
        return items.filter((i) => i.property?.agent_id === user.id || role === "admin");
      }
      // admin: RLS lets them see all

      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data as Inquiry[]) ?? [];
    },
    enabled: !!user || opts.scope === "admin",
  });
}

export function useCreateInquiry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, message }: { propertyId: string; message: string }) => {
      if (!isSupabaseConfigured || !supabase || !user) {
        await new Promise((r) => setTimeout(r, 400));
        return;
      }
      const { error } = await supabase
        .from("inquiries")
        .insert({ property_id: propertyId, user_id: user.id, message });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
  });
}

export function useUpdateInquiryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InquiryStatus }) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
  });
}
