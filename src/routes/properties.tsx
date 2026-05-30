import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyGrid } from "@/components/property/PropertyGrid";
import { useProperties, type PropertyFilters } from "@/hooks/useProperties";
import { PROPERTY_TYPES } from "@/lib/constants";
import type { PropertyType } from "@/lib/types";
import { Search, SlidersHorizontal } from "lucide-react";

interface SearchParams {
  q?: string;
  type?: PropertyType;
  beds?: number;
  listing?: "sale" | "rent";
}

export const Route = createFileRoute("/properties")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" ? s.q : undefined,
    type: (s.type as PropertyType) || undefined,
    beds: typeof s.beds === "number" ? s.beds : undefined,
    listing: (s.listing as "sale" | "rent") || undefined,
  }),
  component: PropertiesPage,
});

function PropertiesPage() {
  const sp = Route.useSearch();
  const [search, setSearch] = useState(sp.q ?? "");
  const [type, setType] = useState<PropertyType | "all">(sp.type ?? "all");
  const [beds, setBeds] = useState<string>(sp.beds ? String(sp.beds) : "any");
  const [listing, setListing] = useState<"all" | "sale" | "rent">(sp.listing ?? "all");

  const filters: PropertyFilters = {
    search: search || undefined,
    propertyType: type,
    listingType: listing,
    bedrooms: beds === "any" ? undefined : Number(beds),
    status: "approved",
  };
  const { data, isLoading } = useProperties(filters);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-1">Listings</p>
        <h1
          className="text-3xl font-bold md:text-4xl"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          All properties
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isLoading ? "Loading listings…" : `${data?.length ?? 0} listing${(data?.length ?? 0) === 1 ? "" : "s"} found`}
        </p>
      </div>

      <div className="mb-8 rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by city, title, address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 border-0 bg-muted/60 focus-visible:bg-background"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />

            <Tabs value={listing} onValueChange={(v) => setListing(v as never)}>
              <TabsList className="h-10">
                <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
                <TabsTrigger value="sale" className="text-xs px-3">For Sale</TabsTrigger>
                <TabsTrigger value="rent" className="text-xs px-3">For Rent</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={type} onValueChange={(v) => setType(v as PropertyType | "all")}>
              <SelectTrigger className="h-10 w-36 text-xs border-0 bg-muted/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Any type</SelectItem>
                {PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={beds} onValueChange={setBeds}>
              <SelectTrigger className="h-10 w-28 text-xs border-0 bg-muted/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="any">Any beds</SelectItem>
                <SelectItem value="1">1+ beds</SelectItem>
                <SelectItem value="2">2+ beds</SelectItem>
                <SelectItem value="3">3+ beds</SelectItem>
                <SelectItem value="4">4+ beds</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <PropertyGrid properties={data ?? []} loading={isLoading} />
    </div>
  );
}
