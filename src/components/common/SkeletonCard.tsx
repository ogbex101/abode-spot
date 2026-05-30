export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card animate-pulse">
      <div className="aspect-[4/3] skeleton-shimmer bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-6 w-2/5 rounded-lg skeleton-shimmer bg-muted" />
        <div className="h-4 w-4/5 rounded-md skeleton-shimmer bg-muted" />
        <div className="h-3.5 w-3/5 rounded-md skeleton-shimmer bg-muted" />
        <div className="flex gap-3 pt-2 border-t">
          <div className="h-3.5 w-12 rounded skeleton-shimmer bg-muted" />
          <div className="h-3.5 w-12 rounded skeleton-shimmer bg-muted" />
          <div className="h-3.5 w-16 rounded skeleton-shimmer bg-muted" />
        </div>
      </div>
    </div>
  );
}
