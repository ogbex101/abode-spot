import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { MOCK_INQUIRIES, MOCK_PROPERTIES } from "@/lib/mock-data";
import type { Inquiry, InquiryStatus } from "@/lib/types";

export function useInquiries(opts: { scope: "user" | "admin" | "agent" } = { scope: "user" }) {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ["inquiries", opts.scope, user?.id ?? "anon"],
    queryFn: async () => {
      // ── MOCK MODE ─────────────────────────────────────────────────────────────
      if (!isSupabaseConfigured || !supabase) {
        if (opts.scope === "admin") return MOCK_INQUIRIES;
        if (opts.scope === "agent") {
          // In mock mode, the agent sees inquiries on their own mock properties.
          // We use MOCK_AGENT's id ("agent-1") as the owner of several listings.
          // Since the logged-in user won't match "agent-1", we just return all
          // mock inquiries so the agent dashboard isn't empty during development.
          return MOCK_INQUIRIES;
        }
        return MOCK_INQUIRIES.filter((i) => i.user_id === "user-demo");
      }

      // ── SUPABASE MODE ──────────────────────────────────────────────────────────

      // ── AGENT: inquiries on MY properties ─────────────────────────────────────
      if (opts.scope === "agent" && user) {
        // Strategy: fetch this agent's property IDs first, then get
        // all inquiries for those properties. This is more reliable than
        // a join because RLS may block the nested filter approach.
        const { data: myProps, error: propErr } = await supabase
          .from("properties")
          .select("id")
          .eq("agent_id", user.id);

        if (propErr) throw new Error(propErr.message);
        const myPropIds = (myProps ?? []).map((p: { id: string }) => p.id);

        // If the agent has no properties, return empty immediately
        if (myPropIds.length === 0) return [] as Inquiry[];

        // Now fetch inquiries for those specific property IDs
        const { data, error } = await supabase
          .from("inquiries")
          .select(`
            *,
            property:properties(
              id, title, city, state, images, agent_id
            ),
            user:users!inquiries_user_id_fkey(id, full_name, email, phone)
          `)
          .in("property_id", myPropIds)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        return (data as Inquiry[]) ?? [];
      }

      // ── USER: their own sent inquiries ────────────────────────────────────────
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

      // ── ADMIN: all inquiries ───────────────────────────────────────────────────
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
