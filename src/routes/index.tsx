import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search, MapPin, Building2, Users, Award, ArrowRight, Star,
  TrendingUp, Shield, Home as HomeIcon, CheckCircle2, Quote, ChevronRight,
  Zap, Globe, Clock, HeartHandshake, Phone, Mail, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PropertyGrid } from "@/components/property/PropertyGrid";
import { useProperties } from "@/hooks/useProperties";
import { useHomepageSection } from "@/hooks/useHomepageContent";
import { PROPERTY_TYPES } from "@/lib/constants";
import type { PropertyType } from "@/lib/types";

export const Route = createFileRoute("/")({
  component: Home,
});

type HeroContent = {
  badge: string; heading_line1: string; heading_accent: string; subtext: string;
  background_image: string; stat_properties: string; stat_clients: string; stat_agents: string;
};
type CategoryItem = { type: string; label: string; icon: string; desc: string; img: string; count: string };
type BrowseCatContent = { heading: string; subtext: string; categories: CategoryItem[] };
type Step = { step: string; title: string; desc: string };
type HowContent = { heading: string; subtext: string; steps: Step[] };
type Feature = { title: string; desc: string };
type WhyContent = { heading: string; features: Feature[] };
type Testimonial = { name: string; role: string; rating: number; text: string };
type TestimonialsContent = { heading: string; items: Testimonial[] };
type CityItem = { city: string; state: string; count: string; img: string };
type CitiesContent = { heading: string; locations: CityItem[] };
type CtaContent = {
  heading: string; subtext: string; contact_heading: string; contact_subtext: string;
  phone: string; email: string; hours: string;
};

function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<PropertyType | "all">("all");
  const [beds, setBeds] = useState<string>("any");
  const featured = useProperties({ featured: true });

  const hero = useHomepageSection<HeroContent>("hero");
  const browseCat = useHomepageSection<BrowseCatContent>("browse_categories");
  const howItWorks = useHomepageSection<HowContent>("how_it_works");
  const whyUs = useHomepageSection<WhyContent>("why_us");
  const testimonials = useHomepageSection<TestimonialsContent>("testimonials");
  const cities = useHomepageSection<CitiesContent>("cities");
  const cta = useHomepageSection<CtaContent>("agent_cta");

  const h = hero.data || {
    badge: "500+ verified listings", heading_line1: "Find where", heading_accent: "life happens.",
    subtext: "Curated homes, transparent prices, and verified agents",
    background_image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=90",
    stat_properties: "500+", stat_clients: "100+", stat_agents: "50+"
  };
  const bc = browseCat.data || { heading: "Browse by property type", subtext: "", categories: [] };
  const hiw = howItWorks.data || { heading: "How it works", subtext: "", steps: [] };
  const wu = whyUs.data || { heading: "Why choose us", features: [] };
  const testi = testimonials.data || { heading: "Testimonials", items: [] };
  const citData = cities.data || { heading: "Explore cities", locations: [] };
  const ctaData = cta.data || { heading: "List your property", subtext: "", contact_heading: "", contact_subtext: "", phone: "", email: "", hours: "" };

  const handleSearch = () => {
    navigate({
      to: "/properties",
      search: {
        q: search || undefined,
        type: type !== "all" ? type : undefined,
        beds: beds !== "any" ? Number(beds) : undefined,
      } as never,
    });
  };

  return (
    <>
      <section className="relative isolate min-h-[92vh] overflow-hidden flex items-center">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center scale-105 transition-transform duration-[20s] hover:scale-110"
          style={{ backgroundImage: `url(${h.background_image})` }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[oklch(0.10_0.06_160/0.96)] via-[oklch(0.12_0.06_160/0.80)] to-[oklch(0.14_0.06_160/0.30)]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[oklch(0.10_0.06_160/0.60)] via-transparent to-transparent" />
        
        <div className="mx-auto w-full max-w-7xl px-4 py-24 md:px-6 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90 backdrop-blur-sm mb-6">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
                <span>{h.badge}</span>
              </div>
              <h1 className="animate-fade-up delay-100 text-5xl font-bold leading-[1.08] text-white md:text-7xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                {h.heading_line1}
                <br />
                <span className="text-accent italic">{h.heading_accent}</span>
              </h1>
              <p className="animate-fade-up delay-200 mt-6 text-lg text-white/75 md:text-xl leading-relaxed max-w-lg">
                {h.subtext}
              </p>
              <div className="animate-fade-up delay-300 mt-10 rounded-2xl bg-white/97 p-3 shadow-2xl backdrop-blur-sm md:p-4 border border-white/20">
                <div className="grid gap-2.5 md:grid-cols-[2fr_1fr_1fr_auto]">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="City, neighborhood, or address"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="h-12 pl-10 border-0 bg-muted/60 focus-visible:bg-background text-sm"
                    />
                  </div>
                  <Select value={type} onValueChange={(v) => setType(v as PropertyType | "all")}>
                    <SelectTrigger className="h-12 border-0 bg-muted/60 text-sm">
                      <SelectValue placeholder="Property type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any type</SelectItem>
                      {PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={beds} onValueChange={setBeds}>
                    <SelectTrigger className="h-12 border-0 bg-muted/60 text-sm">
                      <SelectValue placeholder="Beds" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any beds</SelectItem>
                      <SelectItem value="1">1+ beds</SelectItem>
                      <SelectItem value="2">2+ beds</SelectItem>
                      <SelectItem value="3">3+ beds</SelectItem>
                      <SelectItem value="4">4+ beds</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="lg" className="h-12 gap-2 px-6 text-sm font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105" onClick={handleSearch}>
                    <Search className="h-4 w-4" /> Search
                  </Button>
                </div>
              </div>
              <div className="animate-fade-up delay-400 mt-5 flex flex-wrap gap-2">
                {["Lagos Island", "Lekki", "Victoria Island", "Abuja", "Ikeja"].map((place) => (
                  <button
                    key={place}
                    onClick={() => { setSearch(place); navigate({ to: "/properties", search: { q: place } as never }); }}
                    className="text-xs text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-full px-3 py-1 transition-all hover:bg-white/10"
                  >
                    {place}
                  </button>
                ))}
              </div>
              <div className="animate-fade-up delay-500 mt-8 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 backdrop-blur-sm border border-white/15">
                  <Building2 className="h-4 w-4 text-white/70" />
                  <span className="text-white font-bold">{h.stat_properties}</span>
                  <span className="text-white/60 text-sm">Properties</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 backdrop-blur-sm border border-white/15">
                  <Users className="h-4 w-4 text-white/70" />
                  <span className="text-white font-bold">{h.stat_clients}</span>
                  <span className="text-white/60 text-sm">Happy clients</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 backdrop-blur-sm border border-white/15">
                  <Award className="h-4 w-4 text-white/70" />
                  <span className="text-white font-bold">{h.stat_agents}</span>
                  <span className="text-white/60 text-sm">Verified agents</span>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex justify-end">
              <div className="animate-fade-up delay-300 relative">
                <div className="rounded-2xl overflow-hidden bg-white/95 backdrop-blur-md shadow-2xl w-80 border border-white/30">
                  <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80" alt="Featured property" className="h-48 w-full object-cover" />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase tracking-widest text-primary">Featured</span>
                      <span className="flex items-center gap-1 text-xs text-amber-500"><Star className="h-3 w-3 fill-current" />4.9</span>
                    </div>
                    <h3 className="font-bold text-foreground text-base">Modern Villa, Lekki Phase 1</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">4 bed · 3 bath · 3,200 sqft</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="font-bold text-lg text-primary">₦85,000,000</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">For Sale</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      <section className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-medium"><Shield className="h-4 w-4 text-primary" />Verified Listings</div>
            <div className="flex items-center gap-2 font-medium"><Star className="h-4 w-4 text-accent" />Top-Rated Agents</div>
            <div className="flex items-center gap-2 font-medium"><TrendingUp className="h-4 w-4 text-primary" />Market Insights</div>
            <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-success" />Secure Transactions</div>
            <div className="flex items-center gap-2 font-medium"><Award className="h-4 w-4 text-accent" />Award Winning</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Explore</p>
          <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>{bc.heading}</h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">{bc.subtext}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(bc.categories || []).map((cat) => (
            <button
              key={cat.type}
              onClick={() => navigate({ to: "/properties", search: { type: cat.type } as never })}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] text-left hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              {cat.img ? <img src={cat.img} alt={cat.label} className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="absolute inset-0 bg-muted flex items-center justify-center text-4xl">{cat.icon}</div>}
              <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.10_0.06_160/0.85)] via-[oklch(0.10_0.06_160/0.3)] to-transparent" />
              <div className="absolute bottom-0 p-4">
                <div className="text-2xl mb-1">{cat.icon}</div>
                <h3 className="text-white font-bold text-lg">{cat.label}</h3>
                <p className="text-white/70 text-xs">{cat.desc}</p>
                <span className="mt-2 inline-block text-xs text-accent font-semibold">{cat.count} listings</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Hand-picked for you</p>
              <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Featured properties</h2>
            </div>
            <Link to="/properties" className="hidden items-center gap-1.5 text-sm font-medium text-primary hover:gap-3 transition-all md:flex">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <PropertyGrid properties={featured.data ?? []} loading={featured.isLoading} />
          <div className="mt-8 text-center md:hidden">
            <Link to="/properties"><Button variant="outline" className="gap-2">View all properties <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>
    </>
  );
}
