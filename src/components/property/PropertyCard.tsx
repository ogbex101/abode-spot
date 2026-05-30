import { Link } from "@tanstack/react-router";
import { Bed, Bath, Square, Heart, MapPin, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PropertyCarousel } from "./PropertyCarousel";
import type { Property } from "@/lib/types";
import { formatPrice, truncate } from "@/lib/format";
import { useSavedIds, useToggleSave } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

export function PropertyCard({ property }: { property: Property }) {
  const { data: savedIds = [] } = useSavedIds();
  const toggle = useToggleSave();
  const saved = savedIds.includes(property.id);

  return (
    <article className="property-card group overflow-hidden rounded-2xl border bg-card">
      <Link to="/property/$id" params={{ id: property.id }} className="block">
        {/* Image area */}
        <div className="relative overflow-hidden">
          <PropertyCarousel
            images={property.images.slice(0, 3)}
            alt={property.title}
            className="aspect-[4/3] transition-transform duration-500 group-hover:scale-[1.03]"
          />

          {/* Listing badge */}
          <Badge
            className={cn(
              "absolute left-3 top-3 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1",
              property.listing_type === "sale"
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground"
            )}
          >
            For {property.listing_type}
          </Badge>

          {property.featured && (
            <Badge
              variant="secondary"
              className="absolute left-3 top-10 mt-1 text-[10px] font-semibold uppercase tracking-wider gap-1"
            >
              ★ Featured
            </Badge>
          )}

          {/* Save button */}
          <button
            className={cn(
              "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
              saved
                ? "bg-destructive/90 text-white scale-110"
                : "bg-white/90 text-foreground hover:bg-white hover:scale-110"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle.mutate({ propertyId: property.id, currentlySaved: saved });
            }}
            aria-label={saved ? "Unsave" : "Save"}
          >
            <Heart className={cn("h-4 w-4", saved && "fill-current")} />
          </button>

          {/* Views ghost pill */}
          {property.views != null && property.views > 0 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
              <Eye className="h-3 w-3" />
              {property.views}
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-4">
          {/* Price */}
          <div
            className="text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {formatPrice(property.price, property.listing_type)}
          </div>

          {/* Title */}
          <h3 className="mt-1.5 line-clamp-1 text-sm font-semibold text-foreground">
            {truncate(property.title, 52)}
          </h3>

          {/* Location */}
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">
              {[property.address, property.city, property.state].filter(Boolean).join(", ")}
            </span>
          </div>

          {/* Specs row */}
          <div className="mt-3 flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
            {property.bedrooms != null && (
              <span className="flex items-center gap-1">
                <Bed className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{property.bedrooms}</span> bd
              </span>
            )}
            {property.bathrooms != null && (
              <span className="flex items-center gap-1">
                <Bath className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{property.bathrooms}</span> ba
              </span>
            )}
            {property.area_sqft != null && (
              <span className="flex items-center gap-1">
                <Square className="h-3.5 w-3.5" />
                <span className="font-medium text-foreground">{property.area_sqft.toLocaleString()}</span> ft²
              </span>
            )}
            {property.agent?.full_name && (
              <span className="ml-auto text-[11px] truncate max-w-[100px]">
                {property.agent.full_name}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
