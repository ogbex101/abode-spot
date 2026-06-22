// Properties data layer — uses Supabase when configured, mock data otherwise.
import { keepPreviousData, useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { MOCK_PROPERTIES } from "@/lib/mock-data";
import type { Property, PropertyStatus, PropertyType, ListingType } from "@/lib/types";
import { toAppError } from "@/lib/errors";

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

function normalizeSearchTerm(search: string | undefined) {
  const normalized = search?.trim().replace(/\s+/g, " ");
  return normalized || undefined;
}

function normalizeFilters(filters: PropertyFilters): PropertyFilters {
  const normalized: PropertyFilters = { ...filters };
  const search = normalizeSearchTerm(filters.search);
  if (search) normalized.search = search;
  else delete normalized.search;
  return normalized;
}

function toPostgrestSearchTerm(search: string) {
  return search.replace(/[%,()*]/g, " ").replace(/\s+/g, " ").trim();
}

function invalidatePropertyCaches(qc: QueryClient, ids: string[] = []) {
  qc.invalidateQueries({ queryKey: ["properties"] });
  qc.invalidateQueries({ queryKey: ["homepage_content"] });
  ids.forEach((id) => qc.invalidateQueries({ queryKey: ["property", id] }));
}

function applyFilters(props: Property[], f: PropertyFilters): Property[] {
  return props.filter((p) => {
    if (f.search) {
      const q = f.search.toLowerCase();
      const searchable = [
        p.title,
        p.city,
        p.state,
        p.address,
        p.property_type,
        p.listing_type,
      ];
      if (!searchable.some((value) => (value ?? "").toLowerCase().includes(q)))
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
  const normalizedFilters = normalizeFilters(filters);

  return useQuery({
    queryKey: ["properties", normalizedFilters],
    queryFn: async () => {
      if (!isSupabaseConfigured || !supabase) {
        const effectiveStatus = normalizedFilters.status ?? "approved";
        // In mock mode, ignore agentId so agents see all mock data
        const filtersWithoutAgent = { ...normalizedFilters };
        delete filtersWithoutAgent.agentId;
        return applyFilters(MOCK_PROPERTIES, { ...filtersWithoutAgent, status: effectiveStatus });
      }
      let q = supabase
        .from("properties")
        .select("*, agent:users!properties_agent_id_fkey(*)")
        .order("created_at", { ascending: false });
      if (normalizedFilters.status && normalizedFilters.status !== "all") q = q.eq("status", normalizedFilters.status);
      if (normalizedFilters.propertyType && normalizedFilters.propertyType !== "all")
        q = q.eq("property_type", normalizedFilters.propertyType);
      if (normalizedFilters.listingType && normalizedFilters.listingType !== "all")
        q = q.eq("listing_type", normalizedFilters.listingType);
      if (isNum(normalizedFilters.minPrice)) q = q.gte("price", normalizedFilters.minPrice);
      if (isNum(normalizedFilters.maxPrice)) q = q.lte("price", normalizedFilters.maxPrice);
      if (isNum(normalizedFilters.bedrooms)) q = q.gte("bedrooms", normalizedFilters.bedrooms);
      if (normalizedFilters.agentId) q = q.eq("agent_id", normalizedFilters.agentId);
      if (typeof normalizedFilters.featured === "boolean") q = q.eq("featured", normalizedFilters.featured);
      if (normalizedFilters.search) {
        const searchTerm = toPostgrestSearchTerm(normalizedFilters.search);
        if (searchTerm) {
          q = q.or(
            [
              "title",
              "city",
              "state",
              "address",
              "property_type",
              "listing_type",
            ].map((column) => `${column}.ilike.%${searchTerm}%`).join(",")
          );
        }
      }
      const { data, error } = await q;
      if (error) throw toAppError(error, "Could not load properties. Please try again.");
      return (data as Property[]) ?? [];
    },
    placeholderData: keepPreviousData,
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
      if (error) throw toAppError(error, "Could not load this property. Please try again.");
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
          status: payload.status ?? "approved",
          featured: false,
          views: 0,
          created_at: new Date().toISOString(),
        };
        MOCK_PROPERTIES.push(newProp);
        return newProp;
      }
      const { data, error } = await supabase
        .from("properties")
        .insert({ ...payload, status: payload.status ?? "approved" })
        .select()
        .single();
      if (error) throw toAppError(error, "Could not create this property. Please check the details and try again.");
      return data as Property;
    },
    onSuccess: (data) => invalidatePropertyCaches(qc, data ? [data.id] : []),
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
      if (error) throw toAppError(error, "Could not update this property. Please try again.");
    },
    onSuccess: (_d, vars) => {
      invalidatePropertyCaches(qc, [vars.id]);
    },
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
      if (error) throw toAppError(error, "Could not update the featured status. Please try again.");
    },
    onSuccess: (_d, vars) => invalidatePropertyCaches(qc, [vars.id]),
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
      if (error) throw toAppError(error, "Could not delete this property. Please try again.");
    },
    onSuccess: (_d, id) => invalidatePropertyCaches(qc, [id]),
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
      if (error) throw toAppError(error, "Could not delete the selected properties. Please try again.");
    },
    onSuccess: (_d, ids) => invalidatePropertyCaches(qc, ids),
  });
}
