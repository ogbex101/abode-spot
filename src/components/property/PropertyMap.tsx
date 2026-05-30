// Lightweight map using OpenStreetMap embed — no API key, no extra deps.
// For more advanced features (markers, geocoding accuracy), swap for Mapbox/Leaflet.
import { MapPin } from "lucide-react";

interface Props {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export function PropertyMap({ address, city, state, zip }: Props) {
  const query = [address, city, state, zip].filter(Boolean).join(", ");
  if (!query) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl border bg-muted">
        <div className="text-center text-sm text-muted-foreground">
          <MapPin className="mx-auto h-8 w-8" />
          <p className="mt-2">No location available</p>
        </div>
      </div>
    );
  }
  // Nominatim-based search; pans/zooms via bbox query string.
  const src = `https://www.openstreetmap.org/export/embed.html?layer=mapnik&search=${encodeURIComponent(query)}`;
  const link = `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
  return (
    <div className="overflow-hidden rounded-2xl border">
      <iframe
        title={`Map of ${query}`}
        src={src}
        className="aspect-[16/9] w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="flex items-center justify-between border-t bg-card px-4 py-2 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-3 w-3" /> {query}
        </span>
        <a href={link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          Open in maps →
        </a>
      </div>
    </div>
  );
}
