import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

// Default homepage content (used as fallback when Supabase is not configured)
export const DEFAULT_HOMEPAGE_CONTENT: Record<string, unknown> = {
  hero: {
    badge: "500+ verified listings this month",
    heading_line1: "Find where",
    heading_accent: "life happens.",
    subtext: "Curated homes, transparent prices, and verified agents — all in one trusted platform.",
    background_image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=90",
    stat_properties: "500+",
    stat_clients: "100+",
    stat_agents: "50+",
  },
  browse_categories: {
    heading: "Browse by property type",
    subtext: "From cosy apartments to sprawling estates — find exactly what you're looking for.",
    categories: [
      { type: "house", label: "Houses", icon: "🏠", desc: "Family homes & villas", img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80", count: "220+" },
      { type: "apartment", label: "Apartments", icon: "🏢", desc: "Modern urban living", img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80", count: "180+" },
      { type: "land", label: "Land", icon: "🌿", desc: "Build your dream", img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80", count: "60+" },
      { type: "commercial", label: "Commercial", icon: "🏪", desc: "Offices & retail spaces", img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80", count: "40+" },
    ],
  },
  how_it_works: {
    heading: "How AbodeSpot works",
    subtext: "Finding your perfect property takes just three easy steps.",
    steps: [
      { step: "01", title: "Search & Filter", desc: "Use our powerful search to find properties by location, type, price, and more." },
      { step: "02", title: "Visit & Compare", desc: "Schedule viewings, compare listings side by side, and save your favourites." },
      { step: "03", title: "Connect & Close", desc: "Contact verified agents directly and make your move with confidence." },
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
      { name: "Adaeze Okonkwo", role: "First-time Buyer", rating: 5, text: "AbodeSpot made finding my first home completely stress-free. The verified listings saved me so much time." },
      { name: "Chukwuemeka Eze", role: "Real Estate Investor", rating: 5, text: "I've used several platforms and AbodeSpot stands out. The agent quality is top-notch." },
      { name: "Funmilayo Adeyemi", role: "Tenant", rating: 5, text: "Found my dream apartment in Lekki within a week! The search filters are precise and the contact process was smooth." },
    ],
  },
  cities: {
    heading: "Explore top cities",
    locations: [
      { city: "Lagos", state: "Lagos", count: "180+", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80" },
      { city: "Abuja", state: "FCT", count: "95+", img: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80" },
      { city: "Port Harcourt", state: "Rivers", count: "60+", img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80" },
      { city: "Ibadan", state: "Oyo", count: "40+", img: "https://images.unsplash.com/photo-1591474200742-8e512e6f98f8?w=600&q=80" },
    ],
  },
  agent_cta: {
    heading: "List your property today.",
    subtext: "Reach thousands of buyers and renters. Quick setup, no commission until you close.",
    contact_heading: "Need help finding a home?",
    contact_subtext: "Our team of property experts is ready to guide you. Reach out anytime.",
    phone: "+234 800 ABODE SPOT",
    email: "hello@abodespot.com",
    hours: "Mon–Fri, 9am–6pm WAT",
  },
};

export function useHomepageSection<T = unknown>(sectionKey: string): {
  data: T;
  isLoading: boolean;
} {
  const defaults = DEFAULT_HOMEPAGE_CONTENT[sectionKey] as T;
  const { data, isLoading } = useQuery({
    queryKey: ["homepage_content", sectionKey],
    queryFn: async () => {
      if (!isSupabaseConfigured || !supabase) return defaults;
      const { data, error } = await supabase
        .from("homepage_content")
        .select("data")
        .eq("section_key", sectionKey)
        .maybeSingle();
      if (error || !data) return defaults;
      return data.data as T;
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
      if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");
      const { error } = await supabase
        .from("homepage_content")
        .upsert({ section_key: sectionKey, data, updated_at: new Date().toISOString() }, { onConflict: "section_key" });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, { sectionKey }) => {
      qc.invalidateQueries({ queryKey: ["homepage_content"] });
    },
  });
}
