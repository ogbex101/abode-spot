import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { MOCK_PROPERTIES, MOCK_INQUIRIES } from "@/lib/mock-data";
import { toAppError } from "@/lib/errors";

// ── Derive real counts from mock data ────────────────────────────────────────
// Instead of fake "500+ / 100+ / 50+" numbers that don't match reality,
// we compute the actual figures from mock data (or real DB when connected).
const MOCK_PROPERTY_COUNT = MOCK_PROPERTIES.length;                       // 14
const MOCK_AGENT_IDS = [...new Set(MOCK_PROPERTIES.map((p) => p.agent_id))];
const MOCK_AGENT_COUNT = MOCK_AGENT_IDS.length;                           // 2
// "Happy clients" = unique users who sent inquiries in mock data
const MOCK_CLIENT_COUNT = [...new Set(MOCK_INQUIRIES.map((i) => i.user_id))].length; // 1

// Category counts from mock data
function mockCountByType(type: string) {
  return MOCK_PROPERTIES.filter((p) => p.property_type === type && p.status === "approved").length;
}

// City counts from mock data
function mockCountByCity(city: string) {
  return MOCK_PROPERTIES.filter(
    (p) => (p.city ?? "").toLowerCase().includes(city.toLowerCase()) && p.status === "approved"
  ).length;
}

// Default homepage content — stats now match actual mock data
export const DEFAULT_HOMEPAGE_CONTENT: Record<string, unknown> = {
  hero: {
    badge: `${MOCK_PROPERTY_COUNT} verified listings on the platform`,
    heading_line1: "Find where",
    heading_accent: "life happens.",
    subtext:
      "Curated homes, transparent prices, and verified agents — all in one trusted platform.",
    background_image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=90",
    // These three stats are computed from real mock data
    stat_properties: `${MOCK_PROPERTY_COUNT}`,
    stat_clients: `${MOCK_CLIENT_COUNT}`,
    stat_agents: `${MOCK_AGENT_COUNT}`,
  },
  browse_categories: {
    heading: "Browse by property type",
    subtext:
      "From cosy apartments to sprawling estates — find exactly what you're looking for.",
    categories: [
      {
        type: "house",
        label: "Houses",
        icon: "🏠",
        desc: "Family homes & villas",
        img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80",
        count: `${mockCountByType("house")}`,
      },
      {
        type: "apartment",
        label: "Apartments",
        icon: "🏢",
        desc: "Modern urban living",
        img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80",
        count: `${mockCountByType("apartment")}`,
      },
      {
        type: "land",
        label: "Land",
        icon: "🌿",
        desc: "Build your dream",
        img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80",
        count: `${mockCountByType("land")}`,
      },
      {
        type: "commercial",
        label: "Commercial",
        icon: "🏪",
        desc: "Offices & retail spaces",
        img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80",
        count: `${mockCountByType("commercial")}`,
      },
    ],
  },
  how_it_works: {
    heading: "How AbodeSpot works",
    subtext: "Finding your perfect property takes just three easy steps.",
    steps: [
      {
        step: "01",
        title: "Search & Filter",
        desc: "Use our powerful search to find properties by location, type, price, and more.",
      },
      {
        step: "02",
        title: "Visit & Compare",
        desc: "Schedule viewings, compare listings side by side, and save your favourites.",
      },
      {
        step: "03",
        title: "Connect & Close",
        desc: "Contact verified agents directly and make your move with confidence.",
      },
    ],
  },
  why_us: {
    heading: "The AbodeSpot advantage",
    features: [
      { title: "Instant Alerts", desc: "Get notified the moment a matching property is listed." },
      { title: "Verified Agents", desc: "Every agent is identity-checked and professionally rated." },
      { title: "Wide Coverage", desc: "Listings across major cities and emerging neighbourhoods." },
      { title: "Zero Hidden Fees", desc: "Transparent pricing — what you see is what you pay." },
    ],
  },
  testimonials: {
    heading: "What our users say",
    items: [
      {
        name: "Adaeze Okonkwo",
        role: "First-time Buyer",
        rating: 5,
        text: "AbodeSpot made finding my first home completely stress-free. The verified listings saved me so much time.",
      },
      {
        name: "Chukwuemeka Eze",
        role: "Real Estate Investor",
        rating: 5,
        text: "I've used several platforms and AbodeSpot stands out. The agent quality is top-notch.",
      },
      {
        name: "Funmilayo Adeyemi",
        role: "Tenant",
        rating: 5,
        text: "Found my dream apartment in Lekki within a week! The search filters are precise and the contact process was smooth.",
      },
    ],
  },
  cities: {
    heading: "Explore top cities",
    locations: [
      {
        city: "Lagos",
        state: "Lagos",
        count: `${mockCountByCity("lagos") + mockCountByCity("lekki") + mockCountByCity("ikoyi") + mockCountByCity("victoria") + mockCountByCity("eko")}`,
        img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80",
      },
      {
        city: "Abuja",
        state: "FCT",
        count: `${mockCountByCity("abuja") + mockCountByCity("gwarinpa") + mockCountByCity("wuse") + mockCountByCity("maitama")}`,
        img: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80",
      },
      {
        city: "Port Harcourt",
        state: "Rivers",
        count: `${mockCountByCity("port harcourt")}`,
        img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80",
      },
      {
        city: "Epe / Ajah",
        state: "Lagos",
        count: `${mockCountByCity("epe") + mockCountByCity("ajah")}`,
        img: "https://images.unsplash.com/photo-1591474200742-8e512e6f98f8?w=600&q=80",
      },
    ],
  },
  agent_cta: {
    heading: "List your property today.",
    subtext:
      "Reach thousands of buyers and renters. Quick setup, no commission until you close.",
    contact_heading: "Need help finding a home?",
    contact_subtext:
      "Our team of property experts is ready to guide you. Reach out anytime.",
    phone: "+234 800 ABODE SPOT",
    email: "hello@abodespot.com",
    hours: "Mon–Fri, 9am–6pm WAT",
  },
};

// ── Live stat fetcher (used when Supabase IS connected) ───────────────────────
// Pulls real counts from the DB so the homepage always shows accurate numbers.
async function fetchLiveStats(): Promise<{
  stat_properties: string;
  stat_clients: string;
  stat_agents: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      stat_properties: `${MOCK_PROPERTY_COUNT}`,
      stat_clients: `${MOCK_CLIENT_COUNT}`,
      stat_agents: `${MOCK_AGENT_COUNT}`,
    };
  }

  const [propRes, clientRes, agentRes] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "user"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "agent"),
  ]);

  return {
    stat_properties: `${propRes.count ?? MOCK_PROPERTY_COUNT}`,
    stat_clients: `${clientRes.count ?? MOCK_CLIENT_COUNT}`,
    stat_agents: `${agentRes.count ?? MOCK_AGENT_COUNT}`,
  };
}

// ── Live category count fetcher ───────────────────────────────────────────────
async function fetchCategoryCounts(): Promise<Record<string, number>> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      house: mockCountByType("house"),
      apartment: mockCountByType("apartment"),
      land: mockCountByType("land"),
      commercial: mockCountByType("commercial"),
    };
  }

  const types = ["house", "apartment", "land", "commercial"] as const;
  const results = await Promise.all(
    types.map((t) =>
      supabase!
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .eq("property_type", t)
    )
  );

  return Object.fromEntries(types.map((t, i) => [t, results[i].count ?? 0]));
}

// ── Live city count fetcher ───────────────────────────────────────────────────
async function fetchCityCounts(cities: string[]): Promise<Record<string, number>> {
  if (!isSupabaseConfigured || !supabase) {
    return Object.fromEntries(cities.map((c) => [c, mockCountByCity(c)]));
  }

  const results = await Promise.all(
    cities.map((c) =>
      supabase!
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved")
        .ilike("city", `%${c}%`)
    )
  );

  return Object.fromEntries(cities.map((c, i) => [c, results[i].count ?? 0]));
}

// ── useHomepageSection ────────────────────────────────────────────────────────
export function useHomepageSection<T = unknown>(sectionKey: string): {
  data: T;
  isLoading: boolean;
} {
  const defaults = DEFAULT_HOMEPAGE_CONTENT[sectionKey] as T;

  const { data, isLoading } = useQuery({
    queryKey: ["homepage_content", sectionKey],
    queryFn: async () => {
      // Step 1: Try to load content from Supabase homepage_content table
      let base: T = defaults;
      if (isSupabaseConfigured && supabase) {
        const { data: row, error } = await supabase
          .from("homepage_content")
          .select("data")
          .eq("section_key", sectionKey)
          .maybeSingle();
        if (!error && row) base = row.data as T;
      }

      // Step 2: Overlay live counts on top so numbers are always accurate
      if (sectionKey === "hero") {
        const stats = await fetchLiveStats();
        return { ...(base as object), ...stats } as T;
      }

      if (sectionKey === "browse_categories") {
        const counts = await fetchCategoryCounts();
        const b = base as { heading: string; subtext: string; categories: { type: string; count: string; [k: string]: unknown }[] };
        return {
          ...b,
          categories: b.categories.map((cat) => ({
            ...cat,
            count: `${counts[cat.type] ?? cat.count}`,
          })),
        } as T;
      }

      if (sectionKey === "cities") {
        const b = base as { heading: string; locations: { city: string; count: string; [k: string]: unknown }[] };
        const cityNames = b.locations.map((l) => l.city);
        const counts = await fetchCityCounts(cityNames);
        return {
          ...b,
          locations: b.locations.map((loc) => ({
            ...loc,
            count: `${counts[loc.city] ?? loc.count}`,
          })),
        } as T;
      }

      return base;
    },
    staleTime: 60_000,
  });

  return { data: data ?? defaults, isLoading };
}

export function useAllHomepageContent() {
  return useQuery({
    queryKey: ["homepage_content", "all"],
    queryFn: async () => {
      if (!isSupabaseConfigured || !supabase) return DEFAULT_HOMEPAGE_CONTENT;
      const { data, error } = await supabase.from("homepage_content").select("*");
      if (error || !data) return DEFAULT_HOMEPAGE_CONTENT;
      const result: Record<string, unknown> = { ...DEFAULT_HOMEPAGE_CONTENT };
      for (const row of data) {
        result[row.section_key] = row.data;
      }
      return result;
    },
  });
}

export function useUpsertHomepageSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sectionKey, data }: { sectionKey: string; data: unknown }) => {
      if (!isSupabaseConfigured || !supabase) throw toAppError("Supabase not configured");
      const { error } = await supabase
        .from("homepage_content")
        .upsert(
          { section_key: sectionKey, data, updated_at: new Date().toISOString() },
          { onConflict: "section_key" }
        );
      if (error) throw toAppError(error, "Could not save homepage content. Please try again.");
    },
    onSuccess: (_d, { sectionKey }) => {
      qc.invalidateQueries({ queryKey: ["homepage_content"] });
    },
  });
}
