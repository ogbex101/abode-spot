// Properties data layer — uses Supabase when configured, mock data otherwise.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { MOCK_PROPERTIES } from "@/lib/mock-data";
import type { Property, PropertyStatus, PropertyType, ListingType } from "@/lib/types";

export interface PropertyFilters {
  search?: string;
  city?: string;
  propertyType?: PropertyType | "all";
  listingType?: ListingType | "all";
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number; // minimum
  status?: PropertyStatus | "all";
  agentId?: string;
  featured?: boolean;
}

function applyFilters(props: Property[], f: PropertyFilters): Property[] {
  return props.filter((p) => {
    if (f.search) {
      const q = f.search.toLowerCase();
      if (
        !p.title.toLowerCase().includes(q) &&
        !(p.city ?? "").toLowerCase().includes(q) &&
        !(p.address ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    if (f.city && p.city?.toLowerCase() !== f.city.toLowerCase()) return false;
    if (f.propertyType && f.propertyType !== "all" && p.property_type !== f.propertyType)
      return false;
    if (f.listingType && f.listingType !== "all" && p.listing_type !== f.listingType)
      return false;
    if (typeof f.minPrice === "number" && p.price < f.minPrice) return false;
    if (typeof f.maxPrice === "number" && p.price > f.maxPrice) return false;
    if (typeof f.bedrooms === "number" && (p.bedrooms ?? 0) < f.bedrooms) return false;
    if (f.status && f.status !== "all" && p.status !== f.status) return false;
    if (f.agentId && p.agent_id !== f.agentId) return false;
    if (typeof f.featured === "boolean" && p.featured !== f.featured) return false;
    return true;
  });
}

export function useProperties(filters: PropertyFilters = {}) {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: async () => {
      if (!isSupabaseConfigured || !supabase) {
        // Mock mode — non-admin queries shouldn't see pending/rejected unless explicitly asked
        const effectiveStatus = filters.status ?? "approved";
        return applyFilters(MOCK_PROPERTIES, { ...filters, status: effectiveStatus });
      }
      let q = supabase
        .from("properties")
        .select("*, agent:users!properties_agent_id_fkey(*)")
        .order("created_at", { ascending: false });
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.propertyType && filters.propertyType !== "all")
        q = q.eq("property_type", filters.propertyType);
      if (filters.listingType && filters.listingType !== "all")
        q = q.eq("listing_type", filters.listingType);
      if (f_(filters.minPrice)) q = q.gte("price", filters.minPrice!);
      if (f_(filters.maxPrice)) q = q.lte("price", filters.maxPrice!);
      if (f_(filters.bedrooms)) q = q.gte("bedrooms", filters.bedrooms!);
      if (filters.agentId) q = q.eq("agent_id", filters.agentId);
      if (typeof filters.featured === "boolean") q = q.eq("featured", filters.featured);
      if (filters.search) {
        q = q.or(
          `title.ilike.%${filters.search}%,city.ilike.%${filters.search}%,address.ilike.%${filters.search}%`
        );
      }
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data as Property[]) ?? [];
    },
  });
}

// Tiny helper to avoid repeating typeof X === 'number' checks
function f_(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ["property", id],
    enabled: !!id,
    queryFn: async () => {
      if (!isSupabaseConfigured || !supabase) {
        return MOCK_PROPERTIES.find((p) => p.id === id) ?? null;
      }
      const { data, error } = await supabase
        .from("properties")
        .select("*, agent:users!properties_agent_id_fkey(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as Property | null;
    },
  });
}

export function useUpdatePropertyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PropertyStatus }) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.from("properties").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useToggleFeatured() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.from("properties").update({ featured }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Property> & { agent_id: string }) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { data, error } = await supabase.from("properties").insert(payload).select().single();
      if (error) throw new Error(error.message);
      return data as Property;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Property> & { id: string }) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.from("properties").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", vars.id] });
    },
  });
}

export function useBulkUpdatePropertyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: PropertyStatus }) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.from("properties").update({ status }).in("id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useBulkDeleteProperties() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase.from("properties").delete().in("id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}
