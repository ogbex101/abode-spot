import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Bed, Bath, Square, MapPin, Heart, Share2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useProperty, useProperties } from "@/hooks/useProperties";
import { useSavedIds, useToggleSave } from "@/hooks/useFavorites";
import { useCreateInquiry } from "@/hooks/useInquiries";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/format";
import { PROPERTY_FEATURES } from "@/lib/constants";
import { PropertyGrid } from "@/components/property/PropertyGrid";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/property/$id")({
  component: PropertyDetail,
});

function PropertyDetail() {
  const { id } = Route.useParams();
  const { data: property, isLoading } = useProperty(id);
  const { data: savedIds = [] } = useSavedIds();
  const toggle = useToggleSave();
  const similar = useProperties({ status: "approved" });

  const [activeImg, setActiveImg] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
        <Skeleton className="mt-6 h-8 w-1/2" />
        <Skeleton className="mt-2 h-4 w-1/3" />
      </div>
    );
  }
  if (!property) throw notFound();

  const saved = savedIds.includes(property.id);
  const images = property.images.length ? property.images : [];
  const similarItems = (similar.data ?? []).filter((p) => p.id !== property.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* MAIN */}
        <div>
          {/* Gallery */}
          <div className="overflow-hidden rounded-2xl">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block aspect-[16/10] w-full bg-muted"
            >
              <img
                src={images[activeImg]}
                alt={property.title}
                className="h-full w-full object-cover"
              />
            </button>
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={cn(
                    "h-20 w-28 shrink-0 overflow-hidden rounded-lg border-2",
                    i === activeImg ? "border-primary" : "border-transparent"
                  )}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Header */}
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge className={property.listing_type === "sale" ? "bg-primary" : "bg-accent text-accent-foreground"}>
                For {property.listing_type}
              </Badge>
              <h1 className="mt-3 text-3xl font-bold">{property.title}</h1>
              <div className="mt-2 flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[property.address, property.city, property.state, property.zip_code].filter(Boolean).join(", ")}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{formatPrice(property.price, property.listing_type)}</div>
              <div className="mt-2 flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => toggle.mutate({ propertyId: property.id, currentlySaved: saved })}
                >
                  <Heart className={cn("h-4 w-4", saved && "fill-destructive text-destructive")} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success("Link copied!");
                    }
                  }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Key details */}
          <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border bg-card p-6 md:grid-cols-4">
            {property.bedrooms != null && <KV icon={<Bed className="h-5 w-5" />} label="Bedrooms" value={String(property.bedrooms)} />}
            {property.bathrooms != null && <KV icon={<Bath className="h-5 w-5" />} label="Bathrooms" value={String(property.bathrooms)} />}
            {property.area_sqft != null && <KV icon={<Square className="h-5 w-5" />} label="Area" value={`${property.area_sqft.toLocaleString()} sqft`} />}
            <KV icon={<MapPin className="h-5 w-5" />} label="Type" value={property.property_type} />
          </div>

          {/* Description */}
          {property.description && (
            <section className="mt-8">
              <h2 className="text-xl font-bold">Description</h2>
              <p className="mt-2 whitespace-pre-line text-muted-foreground">{property.description}</p>
            </section>
          )}

          {/* Features (mock chips) */}
          <section className="mt-8">
            <h2 className="text-xl font-bold">Features</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROPERTY_FEATURES.slice(0, 6).map((f) => (
                <Badge key={f} variant="secondary">{f}</Badge>
              ))}
            </div>
          </section>
        </div>

        {/* SIDEBAR — Agent */}
        <AgentSidebar propertyId={property.id} agent={property.agent} />
      </div>

      {/* Similar */}
      {similarItems.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold">Similar properties</h2>
          <div className="mt-6">
            <PropertyGrid properties={similarItems} />
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <img src={images[activeImg]} alt="" className="max-h-full max-w-full rounded" />
        </div>
      )}
    </div>
  );
}

function KV({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs uppercase">{label}</span></div>
      <div className="mt-1 text-base font-semibold capitalize">{value}</div>
    </div>
  );
}

function AgentSidebar({ propertyId, agent }: { propertyId: string; agent?: import("@/lib/types").AppUser | null }) {
  const { user } = useAuth();
  const create = useCreateInquiry();
  const [message, setMessage] = useState("");

  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {(agent?.full_name ?? "A").slice(0, 1)}
          </div>
          <div>
            <div className="font-semibold">{agent?.full_name ?? "Listing Agent"}</div>
            <div className="text-xs text-muted-foreground">{agent?.company_name ?? "Independent"}</div>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {agent?.phone && (
            <a href={`tel:${agent.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Phone className="h-4 w-4" /> {agent.phone}
            </a>
          )}
          {agent?.email && (
            <a href={`mailto:${agent.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <Mail className="h-4 w-4" /> {agent.email}
            </a>
          )}
        </div>
      </div>

      <form
        className="space-y-3 rounded-2xl border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!user) {
            toast.error("Please sign in to send an inquiry");
            return;
          }
          if (message.trim().length < 5) {
            toast.error("Message is too short");
            return;
          }
          create.mutate(
            { propertyId, message: message.trim() },
            {
              onSuccess: () => {
                toast.success("Inquiry sent!");
                setMessage("");
              },
              onError: (e: Error) => toast.error(e.message),
            }
          );
        }}
      >
        <h3 className="font-semibold">Contact agent</h3>
        {!user && (
          <p className="text-xs text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">Sign in</Link> to contact this agent.
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="msg">Message</Label>
          <Textarea
            id="msg"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
            placeholder="I'm interested in this property…"
            disabled={!user}
          />
        </div>
        <Button type="submit" className="w-full" disabled={!user || create.isPending}>
          {create.isPending ? "Sending…" : "Send message"}
        </Button>
      </form>
    </aside>
  );
}
