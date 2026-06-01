import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { MOCK_INQUIRIES } from "@/lib/mock-data";
import type { Inquiry, InquiryStatus } from "@/lib/types";

const INQUIRY_SELECT = `
  *,
  property:properties(id, title, city, state, images, price, listing_type, agent_id),
  sender:users!inquiries_user_id_fkey(id, full_name, email, phone)
`;

// NOTE: inquiries.user_id references auth.users, not public.users, so
// the !inquiries_user_id_fkey hint won't resolve. We fetch sender profiles
// in a separate step instead.
async function attachSenderProfiles(inquiries: Inquiry[]): Promise<Inquiry[]> {
  if (!supabase || inquiries.length === 0) return inquiries;
  const userIds = [...new Set(inquiries.map((i) => i.user_id).filter(Boolean))];
  const { data: profiles } = await supabase
    .from("users")
    .select("id, full_name, email, phone")
    .in("id", userIds);
  const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  return inquiries.map((i) => ({ ...i, user: (byId[i.user_id] ?? null) as Inquiry["user"] }));
}

export function useInquiries(opts: { scope: "user" | "admin" | "agent" } = { scope: "user" }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["inquiries", opts.scope, user?.id ?? "anon"],
    queryFn: async () => {
      // ── MOCK MODE ──────────────────────────────────────────────────────────────
      if (!isSupabaseConfigured || !supabase) {
        if (opts.scope === "admin") return MOCK_INQUIRIES;
        if (opts.scope === "agent") return MOCK_INQUIRIES;
        return MOCK_INQUIRIES.filter((i) => i.user_id === "user-demo");
      }

      // ── SUPABASE MODE ──────────────────────────────────────────────────────────

      // AGENT: direct filter on agent_id column
      if (opts.scope === "agent" && user) {
        const { data, error } = await supabase
          .from("inquiries")
          .select(`*, property:properties(id, title, city, state, images, agent_id)`)
          .eq("agent_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        return attachSenderProfiles((data as Inquiry[]) ?? []);
      }

      // USER: inquiries they sent
      if (opts.scope === "user" && user) {
        const { data, error } = await supabase
          .from("inquiries")
          .select(`*, property:properties(id, title, city, state, images, price, listing_type)`)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        return (data as Inquiry[]) ?? [];
      }

      // ADMIN: all inquiries
      const { data, error } = await supabase
        .from("inquiries")
        .select(`*, property:properties(id, title, city, state, images, agent_id)`)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return attachSenderProfiles((data as Inquiry[]) ?? []);
    },
    enabled: !!user || opts.scope === "admin",
  });
}

export function useCreateInquiry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      propertyId,
      agentId,
      message,
    }: {
      propertyId: string;
      agentId: string;
      message: string;
    }) => {
      if (!user) throw new Error("You must be signed in to send an inquiry");
      if (!isSupabaseConfigured || !supabase) {
        await new Promise((r) => setTimeout(r, 500));
        return;
      }
      const { error } = await supabase
        .from("inquiries")
        .insert({ property_id: propertyId, agent_id: agentId, user_id: user.id, message });
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
