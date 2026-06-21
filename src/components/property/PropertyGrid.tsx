import type { Property } from "@/lib/types";
import { PropertyCard } from "./PropertyCard";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Home } from "lucide-react";

export function PropertyGrid({
  properties,
  loading,
  emptyTitle = "No properties found",
  emptyDescription = "Try adjusting your filters.",
  priorityCount = 3,
}: {
  properties: Property[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  priorityCount?: number;
}) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }
  if (properties.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} icon={<Home className="h-6 w-6 text-muted-foreground" />} />;
  }
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {properties.map((p, index) => (
        <PropertyCard key={p.id} property={p} priority={index < priorityCount} />
      ))}
    </div>
  );
}
