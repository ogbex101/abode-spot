import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search, MapPin, Building2, Users, Award, ArrowRight, Star,
  TrendingUp, Shield, Home, CheckCircle2, Quote, ChevronRight,
  Zap, Globe, Clock, HeartHandshake, Phone, Mail, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PropertyGrid } from "@/components/property/PropertyGrid";
import { useProperties } from "@/hooks/useProperties";
import { PROPERTY_TYPES } from "@/lib/constants";
import type { PropertyType } from "@/lib/types";

export const Route = createFileRoute("/")(
  { component: Home }
);

function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [type, setType] = useState<PropertyType | "all">("all");
  const [beds, setBeds] = useState<string>("any");
  const featured = useProperties({ featured: true });

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
      {/* ── HERO ── */}
      <section className="relative isolate min-h-[92vh] overflow-hidden flex items-center grain">
        {/* Background image */}
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center scale-105 transition-transform duration-[20s] hover:scale-110"
          style={{
            backgroundImage: "url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2400&q=90)",
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[oklch(0.10_0.06_160/0.96)] via-[oklch(0.12_0.06_160/0.80)] to-[oklch(0.14_0.06_160/0.30)]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[oklch(0.10_0.06_160/0.60)] via-transparent to-transparent" />

        {/* Decorative floating shapes */}
        <div className="absolute top-20 right-[10%] -z-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-20 right-[25%] -z-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl animate-pulse" style={{ animationDuration: '9s', animationDelay: '2s' }} />

        <div className="mx-auto w-full max-w-7xl px-4 py-24 md:px-6 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90 backdrop-blur-sm mb-6">
                <TrendingUp className="h-3.5 w-3.5 text-accent" />
                <span>500+ verified listings this month</span>
              </div>

              <h1
                className="animate-fade-up delay-100 text-5xl font-bold leading-[1.08] text-white md:text-7xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Find where
                <br />
                <span className="text-accent italic">life happens.</span>
              </h1>

              <p className="animate-fade-up delay-200 mt-6 text-lg text-white/75 md:text-xl leading-relaxed max-w-lg">
                Curated homes, transparent prices, and verified agents — all in one trusted platform.
              </p>

              {/* Search box */}
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
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Any type</SelectItem>
                      {PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={beds} onValueChange={setBeds}>
                    <SelectTrigger className="h-12 border-0 bg-muted/60 text-sm">
                      <SelectValue placeholder="Beds" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="any">Any beds</SelectItem>
                      <SelectItem value="1">1+ beds</SelectItem>
                      <SelectItem value="2">2+ beds</SelectItem>
                      <SelectItem value="3">3+ beds</SelectItem>
                      <SelectItem value="4">4+ beds</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="lg"
                    className="h-12 gap-2 px-6 text-sm font-semibold shadow-md hover:shadow-lg transition-all hover:scale-105"
                    onClick={handleSearch}
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>

              {/* Quick filters */}
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

              {/* Stats */}
              <div className="animate-fade-up delay-500 mt-8 flex flex-wrap gap-4">
                <StatPill icon={<Building2 className="h-4 w-4" />} value="500+" label="Properties" />
                <StatPill icon={<Users className="h-4 w-4" />} value="100+" label="Happy clients" />
                <StatPill icon={<Award className="h-4 w-4" />} value="50+" label="Verified agents" />
              </div>
            </div>

            {/* Hero right — floating property card preview */}
            <div className="hidden lg:flex justify-end">
              <div className="animate-fade-up delay-300 relative">
                {/* Main card */}
                <div className="rounded-2xl overflow-hidden bg-white/95 backdrop-blur-md shadow-2xl w-80 border border-white/30">
                  <img
                    src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"
                    alt="Featured property"
                    className="h-48 w-full object-cover"
                  />
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
                {/* Floating badge */}
                <div className="absolute -top-4 -left-8 bg-accent text-accent-foreground rounded-2xl px-4 py-3 shadow-xl animate-bounce" style={{ animationDuration: '3s' }}>
                  <div className="text-xs font-semibold">🎉 Just Listed</div>
                  <div className="text-xs opacity-80">2 hours ago</div>
                </div>
                {/* Floating verified badge */}
                <div className="absolute -bottom-4 -right-4 bg-white rounded-xl px-3 py-2.5 shadow-xl border flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">Verified</div>
                    <div className="text-xs text-muted-foreground">Agent checked</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-sm text-muted-foreground">
            <TrustItem icon={<Shield className="h-4 w-4 text-primary" />} label="Verified Listings" />
            <TrustItem icon={<Star className="h-4 w-4 text-accent" />} label="Top-Rated Agents" />
            <TrustItem icon={<TrendingUp className="h-4 w-4 text-primary" />} label="Market Insights" />
            <TrustItem icon={<CheckCircle2 className="h-4 w-4 text-success" />} label="Secure Transactions" />
            <TrustItem icon={<Award className="h-4 w-4 text-accent" />} label="Award Winning" />
          </div>
        </div>
      </section>

      {/* ── BROWSE BY CATEGORY ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Explore</p>
          <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Browse by property type
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            From cosy apartments to sprawling estates — find exactly what you're looking for.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { type: "house", label: "Houses", icon: "🏠", desc: "Family homes & villas", img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80", count: "220+" },
            { type: "apartment", label: "Apartments", icon: "🏢", desc: "Modern urban living", img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&q=80", count: "180+" },
            { type: "land", label: "Land", icon: "🌿", desc: "Build your dream", img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&q=80", count: "60+" },
            { type: "commercial", label: "Commercial", icon: "🏪", desc: "Offices & retail spaces", img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80", count: "40+" },
          ].map((cat) => (
            <button
              key={cat.type}
              onClick={() => navigate({ to: "/properties", search: { type: cat.type } as never })}
              className="group relative overflow-hidden rounded-2xl aspect-[3/4] text-left hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
            >
              <img src={cat.img} alt={cat.label} className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.10_0.06_160/0.85)] via-[oklch(0.10_0.06_160/0.3)] to-transparent" />
              <div className="absolute bottom-0 p-4">
                <div className="text-2xl mb-1">{cat.icon}</div>
                <h3 className="text-white font-bold text-lg">{cat.label}</h3>
                <p className="text-white/70 text-xs">{cat.desc}</p>
                <span className="mt-2 inline-block text-xs text-accent font-semibold">{cat.count} listings</span>
              </div>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-1.5">
                  <ChevronRight className="h-4 w-4 text-white" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── FEATURED LISTINGS ── */}
      <section className="bg-muted/30 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Hand-picked for you</p>
              <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Featured properties
              </h2>
            </div>
            <Link
              to="/properties"
              className="hidden items-center gap-1.5 text-sm font-medium text-primary hover:gap-3 transition-all md:flex"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <PropertyGrid properties={featured.data ?? []} loading={featured.isLoading} />
          <div className="mt-8 text-center md:hidden">
            <Link to="/properties">
              <Button variant="outline" className="gap-2">View all properties <ArrowRight className="h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Simple process</p>
          <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            How AbodeSpot works
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Finding your perfect property takes just three easy steps.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-[calc(16.66%+24px)] right-[calc(16.66%+24px)] h-0.5 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20" />
          {[
            {
              step: "01",
              icon: <Search className="h-7 w-7" />,
              title: "Search & Filter",
              desc: "Use our powerful search to find properties by location, type, price, and more."
            },
            {
              step: "02",
              icon: <Home className="h-7 w-7" />,
              title: "Visit & Compare",
              desc: "Schedule viewings, compare listings side by side, and save your favourites."
            },
            {
              step: "03",
              icon: <CheckCircle2 className="h-7 w-7" />,
              title: "Connect & Close",
              desc: "Contact verified agents directly and make your move with confidence."
            },
          ].map((s, i) => (
            <div key={i} className="relative text-center group">
              <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300 group-hover:scale-110">
                {s.icon}
              </div>
              <div className="text-xs font-bold text-muted-foreground/50 mb-2 tracking-widest">{s.step}</div>
              <h3 className="text-xl font-bold mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button size="lg" className="gap-2 font-semibold shadow-md" onClick={() => navigate({ to: "/properties" })}>
            Start searching <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* ── WHY ABODESPOT ── */}
      <section className="bg-primary text-primary-foreground py-16 md:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent/15 blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="mx-auto max-w-7xl px-4 md:px-6 relative">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/60 mb-2">Why us</p>
            <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              The AbodeSpot advantage
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Zap className="h-6 w-6" />, title: "Instant Alerts", desc: "Get notified the moment a matching property is listed." },
              { icon: <Shield className="h-6 w-6" />, title: "Verified Agents", desc: "Every agent is identity-checked and professionally rated." },
              { icon: <Globe className="h-6 w-6" />, title: "Wide Coverage", desc: "Listings across major cities and emerging neighbourhoods." },
              { icon: <HeartHandshake className="h-6 w-6" />, title: "Zero Hidden Fees", desc: "Transparent pricing — what you see is what you pay." },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl bg-white/10 border border-white/15 p-6 hover:bg-white/15 transition-colors">
                <div className="mb-4 h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center">
                  {f.icon}
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-primary-foreground/70 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Happy clients</p>
          <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            What our users say
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: "Adaeze Okonkwo",
              role: "First-time Buyer",
              avatar: "AO",
              rating: 5,
              text: "AbodeSpot made finding my first home completely stress-free. The verified listings saved me so much time — I knew every property I viewed was legit.",
            },
            {
              name: "Chukwuemeka Eze",
              role: "Real Estate Investor",
              avatar: "CE",
              rating: 5,
              text: "I've used several platforms and AbodeSpot stands out. The agent quality is top-notch and the market insights helped me close three great deals this year.",
            },
            {
              name: "Funmilayo Adeyemi",
              role: "Tenant",
              avatar: "FA",
              rating: 5,
              text: "Found my dream apartment in Lekki within a week! The search filters are precise and the contact process with the agent was smooth from start to finish.",
            },
          ].map((t, i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 hover:shadow-lg transition-shadow">
              <Quote className="h-8 w-8 text-primary/20 mb-4" />
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">{t.text}</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-accent text-accent" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LOCATION HIGHLIGHTS ── */}
      <section className="bg-muted/30 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-2">Explore cities</p>
              <h2 className="text-3xl font-bold md:text-4xl" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Top locations
              </h2>
            </div>
            <Link to="/properties" className="hidden items-center gap-1.5 text-sm font-medium text-primary hover:gap-3 transition-all md:flex">
              All locations <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { city: "Lagos", count: "180+", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80", state: "Lagos" },
              { city: "Abuja", count: "95+", img: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80", state: "FCT" },
              { city: "Port Harcourt", count: "60+", img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80", state: "Rivers" },
              { city: "Ibadan", count: "40+", img: "https://images.unsplash.com/photo-1591474200742-8e512e6f98f8?w=600&q=80", state: "Oyo" },
            ].map((loc) => (
              <button
                key={loc.city}
                onClick={() => navigate({ to: "/properties", search: { q: loc.city } as never })}
                className="group relative overflow-hidden rounded-2xl aspect-square hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <img src={loc.img} alt={loc.city} className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 p-4 text-left">
                  <h3 className="text-white font-bold text-xl">{loc.city}</h3>
                  <p className="text-white/70 text-sm">{loc.count} listings</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENT CTA ── */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Agent CTA */}
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-12 text-primary-foreground grain">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/8 blur-2xl" />
            <Building2 className="h-10 w-10 mb-4 opacity-80" />
            <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              List your property today.
            </h3>
            <p className="text-primary-foreground/70 mb-6 text-sm leading-relaxed">
              Reach thousands of buyers and renters. Quick setup, no commission until you close.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="gap-2 font-semibold shadow-lg hover:scale-105 transition-transform"
              onClick={() => navigate({ to: "/register" })}
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Contact CTA */}
          <div className="relative overflow-hidden rounded-3xl bg-accent/15 border border-accent/20 px-8 py-12">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-accent/10 blur-2xl" />
            <MessageSquare className="h-10 w-10 mb-4 text-accent" />
            <h3 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Need help finding a home?
            </h3>
            <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
              Our team of property experts is ready to guide you. Reach out anytime.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-9 w-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-accent" />
                </div>
                <span className="text-muted-foreground">+234 800 ABODE SPOT</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-9 w-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-accent" />
                </div>
                <span className="text-muted-foreground">hello@abodespot.com</span>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Mon–Fri, 9am–6pm WAT</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 backdrop-blur-sm border border-white/15">
      <span className="text-white/70">{icon}</span>
      <span className="text-white font-bold">{value}</span>
      <span className="text-white/60 text-sm">{label}</span>
    </div>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 font-medium">
      {icon}
      {label}
    </div>
  );
}
