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
      let q = supabase
        .from("inquiries")
        .select("*, property:properties(*), user:users!inquiries_user_id_fkey(*)")
        .order("created_at", { ascending: false });
      if (opts.scope === "user" && user) q = q.eq("user_id", user.id);
      // for agent + admin, RLS handles filtering server-side
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data as Inquiry[]) ?? [];
    },
  });
}

export function useCreateInquiry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, message }: { propertyId: string; message: string }) => {
      if (!isSupabaseConfigured || !supabase || !user) {
        // mock: do nothing persistent
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
