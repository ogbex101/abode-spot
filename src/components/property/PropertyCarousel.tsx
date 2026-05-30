import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PropertyCarousel({
  images,
  alt,
  className,
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  const safe = images.length > 0 ? images : ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200"];

  const go = (e: React.MouseEvent, dir: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => (i + dir + safe.length) % safe.length);
  };

  return (
    <div className={cn("group relative overflow-hidden bg-muted", className)}>
      <img
        src={safe[idx]}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {safe.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => go(e, -1)}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 opacity-0 shadow transition group-hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => go(e, 1)}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1.5 opacity-0 shadow transition group-hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {safe.map((_, i) => (
              <span
                key={i}
                className={cn("h-1.5 w-1.5 rounded-full bg-white/60", i === idx && "w-4 bg-white")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
