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
          return MOCK_INQUIRIES;
        }
        return MOCK_INQUIRIES.filter((i) => i.user_id === "user-demo");
      }

      // ── SUPABASE MODE ──────────────────────────────────────────────────────────

      // ── AGENT: inquiries sent TO this agent ─────────────────────────────────────
      if (opts.scope === "agent" && user) {
        const { data, error } = await supabase
          .from("inquiries")
          .select(`
            *,
            property:properties(
              id, title, city, state, images, price, listing_type, address, agent_id
            ),
            user:users!inquiries_user_id_fkey(id, full_name, email, phone)
          `)
          .eq("agent_id", user.id)  // ← FIXED: Direct filter by agent_id
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
            user:users!inquiries_user_id_fkey(id, full_name, email),
            agent:users!inquiries_agent_id_fkey(id, full_name, email, phone)
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
          user:users!inquiries_user_id_fkey(id, full_name, email, phone),
          agent:users!inquiries_agent_id_fkey(id, full_name, email)
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
        await new Promise((r) => setTimeout(r, 500));
        return;
      }
      
      // CRITICAL FIX: Get the property's agent_id first
      const { data: property, error: propError } = await supabase
        .from("properties")
        .select("agent_id")
        .eq("id", propertyId)
        .single();
      
      if (propError) throw new Error("Property not found");
      if (!property.agent_id) throw new Error("This property doesn't have an assigned agent");
      
      const { error } = await supabase
        .from("inquiries")
        .insert({ 
          property_id: propertyId, 
          user_id: user.id,
          agent_id: property.agent_id,  // ← FIXED: Include agent_id
          message,
          status: "unread"
        });
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
