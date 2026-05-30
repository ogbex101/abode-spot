import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { MOCK_INQUIRIES } from "@/lib/mock-data";
import type { Inquiry, InquiryStatus } from "@/lib/types";

export function useInquiries(opts: { scope: "user" | "admin" | "agent" } = { scope: "user" }) {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ["inquiries", opts.scope, user?.id ?? "anon"],
    queryFn: async () => {
      // ── MOCK MODE ────────────────────────────────────────────────────────────
      if (!isSupabaseConfigured || !supabase) {
        if (opts.scope === "admin") return MOCK_INQUIRIES;
        if (opts.scope === "agent") return MOCK_INQUIRIES; // mock agent sees all
        return MOCK_INQUIRIES.filter((i) => i.user_id === "user-demo");
      }

      // ── SUPABASE MODE ─────────────────────────────────────────────────────────
      // For agent scope: fetch ALL inquiries where the property belongs to this agent.
      // RLS `inq_select_involved` already allows agents to see inquiries on their properties.
      if (opts.scope === "agent" && user) {
        const { data, error } = await supabase
          .from("inquiries")
          .select(`
            *,
            property:properties(
              id, title, city, state, images, agent_id,
              agent:users!properties_agent_id_fkey(id, full_name, email, phone)
            ),
            user:users!inquiries_user_id_fkey(id, full_name, email, phone)
          `)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        const all = (data as Inquiry[]) ?? [];
        // Client-side guard: only show inquiries for THIS agent's properties
        return all.filter(
          (i) => (i.property as { agent_id?: string } | null)?.agent_id === user.id
        );
      }

      // User: their sent inquiries
      if (opts.scope === "user" && user) {
        const { data, error } = await supabase
          .from("inquiries")
          .select(`
            *,
            property:properties(id, title, city, state, images, price, listing_type),
            user:users!inquiries_user_id_fkey(id, full_name, email)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        return (data as Inquiry[]) ?? [];
      }

      // Admin: all inquiries
      const { data, error } = await supabase
        .from("inquiries")
        .select(`
          *,
          property:properties(id, title, city, state, images, agent_id),
          user:users!inquiries_user_id_fkey(id, full_name, email, phone)
        `)
        .order("created_at", { ascending: false });

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
      if (!user) throw new Error("You must be signed in to send an inquiry");
      if (!isSupabaseConfigured || !supabase) {
        // Mock mode: simulate success
        await new Promise((r) => setTimeout(r, 500));
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
      if (!isSupabaseConfigured || !supabase) {
        await new Promise((r) => setTimeout(r, 300));
        return;
      }
      const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
  });
}
