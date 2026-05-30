import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Property } from "@/lib/types";
import { MOCK_PROPERTIES } from "@/lib/mock-data";

const LOCAL_KEY = "mock_saved_property_ids";

function readLocal(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeLocal(ids: string[]) {
  if (typeof window !== "undefined") localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
}

export function useSavedIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved_ids", user?.id ?? "anon"],
    queryFn: async () => {
      if (!isSupabaseConfigured || !supabase || !user) return readLocal();
      const { data, error } = await supabase
        .from("saved_properties")
        .select("property_id")
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: { property_id: string }) => r.property_id);
    },
  });
}

export function useSavedProperties() {
  const ids = useSavedIds();
  return useQuery({
    queryKey: ["saved_properties_full", ids.data],
    enabled: !!ids.data,
    queryFn: async () => {
      const idList = ids.data ?? [];
      if (idList.length === 0) return [] as Property[];
      if (!isSupabaseConfigured || !supabase) {
        return MOCK_PROPERTIES.filter((p) => idList.includes(p.id));
      }
      const { data, error } = await supabase
        .from("properties")
        .select("*, agent:users!properties_agent_id_fkey(*)")
        .in("id", idList);
      if (error) throw new Error(error.message);
      return (data as Property[]) ?? [];
    },
  });
}

export function useToggleSave() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, currentlySaved }: { propertyId: string; currentlySaved: boolean }) => {
      if (!isSupabaseConfigured || !supabase || !user) {
        const list = readLocal();
        const next = currentlySaved ? list.filter((i) => i !== propertyId) : [...list, propertyId];
        writeLocal(next);
        return;
      }
      if (currentlySaved) {
        const { error } = await supabase
          .from("saved_properties")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", propertyId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("saved_properties")
          .insert({ user_id: user.id, property_id: propertyId });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saved_ids"] });
      qc.invalidateQueries({ queryKey: ["saved_properties_full"] });
    },
  });
}
