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
  bedrooms?: number;
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
    if (f.propertyType && f.propertyType !== "all" && p.property_type !== f.propertyType) return false;
    if (f.listingType && f.listingType !== "all" && p.listing_type !== f.listingType) return false;
    if (typeof f.minPrice === "number" && p.price < f.minPrice) return false;
    if (typeof f.maxPrice === "number" && p.price > f.maxPrice) return false;
    if (typeof f.bedrooms === "number" && (p.bedrooms ?? 0) < f.bedrooms) return false;
    if (f.status && f.status !== "all" && p.status !== f.status) return false;
    // In mock mode, agentId filter is ignored (mock properties use demo agent IDs)
    // so agents can still see the mock listings in their dashboard
    if (typeof f.featured === "boolean" && p.featured !== f.featured) return false;
    return true;
  });
}

export function useProperties(filters: PropertyFilters = {}) {
  return useQuery({
    queryKey: ["properties", filters],
    queryFn: async () => {
      if (!isSupabaseConfigured || !supabase) {
        const effectiveStatus = filters.status ?? "approved";
        // In mock mode, ignore agentId so agents see all mock data
        const { agentId: _ignored, ...filtersWithoutAgent } = filters;
        return applyFilters(MOCK_PROPERTIES, { ...filtersWithoutAgent, status: effectiveStatus });
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
      if (isNum(filters.minPrice)) q = q.gte("price", filters.minPrice!);
      if (isNum(filters.maxPrice)) q = q.lte("price", filters.maxPrice!);
      if (isNum(filters.bedrooms)) q = q.gte("bedrooms", filters.bedrooms!);
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

function isNum(v: unknown): v is number {
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

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Property> & { agent_id: string }) => {
      if (!isSupabaseConfigured || !supabase) {
        // Mock mode: add to in-memory list temporarily
        const newProp: Property = {
          id: `mock-${Date.now()}`,
          title: payload.title ?? "Untitled",
          description: payload.description ?? null,
          price: payload.price ?? 0,
          bedrooms: payload.bedrooms ?? null,
          bathrooms: payload.bathrooms ?? null,
          area_sqft: payload.area_sqft ?? null,
          property_type: payload.property_type ?? "house",
          listing_type: payload.listing_type ?? "sale",
          address: payload.address ?? null,
          city: payload.city ?? null,
          state: payload.state ?? null,
          zip_code: null,
          images: payload.images ?? [],
          agent_id: payload.agent_id,
          status: "pending",
          featured: false,
          views: 0,
          created_at: new Date().toISOString(),
        };
        MOCK_PROPERTIES.push(newProp);
        return newProp;
      }
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
      if (!isSupabaseConfigured || !supabase) {
        const idx = MOCK_PROPERTIES.findIndex((p) => p.id === id);
        if (idx !== -1) Object.assign(MOCK_PROPERTIES[idx], patch);
        return;
      }
      const { error } = await supabase.from("properties").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["property", vars.id] });
    },
  });
}

export function useUpdatePropertyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PropertyStatus }) => {
      if (!isSupabaseConfigured || !supabase) {
        const idx = MOCK_PROPERTIES.findIndex((p) => p.id === id);
        if (idx !== -1) MOCK_PROPERTIES[idx].status = status;
        return;
      }
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
      if (!isSupabaseConfigured || !supabase) {
        const idx = MOCK_PROPERTIES.findIndex((p) => p.id === id);
        if (idx !== -1) MOCK_PROPERTIES[idx].featured = featured;
        return;
      }
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
      if (!isSupabaseConfigured || !supabase) {
        const idx = MOCK_PROPERTIES.findIndex((p) => p.id === id);
        if (idx !== -1) MOCK_PROPERTIES.splice(idx, 1);
        return;
      }
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useBulkUpdatePropertyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: PropertyStatus }) => {
      if (!isSupabaseConfigured || !supabase) {
        ids.forEach((id) => {
          const idx = MOCK_PROPERTIES.findIndex((p) => p.id === id);
          if (idx !== -1) MOCK_PROPERTIES[idx].status = status;
        });
        return;
      }
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
      if (!isSupabaseConfigured || !supabase) {
        ids.forEach((id) => {
          const idx = MOCK_PROPERTIES.findIndex((p) => p.id === id);
          if (idx !== -1) MOCK_PROPERTIES.splice(idx, 1);
        });
        return;
      }
      const { error } = await supabase.from("properties").delete().in("id", ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}
