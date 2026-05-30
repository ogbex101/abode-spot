import { createFileRoute } from "@tanstack/react-router";
import { useProperties, useToggleFeatured } from "@/hooks/useProperties";
import { PropertyCard } from "@/components/property/PropertyCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin/featured")({
  component: AdminFeatured,
});

function AdminFeatured() {
  const featured = useProperties({ featured: true, status: "all" });
  const approved = useProperties({ status: "approved" });
  const toggle = useToggleFeatured();

  const candidates = (approved.data ?? []).filter((p) => !p.featured).slice(0, 6);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-lg font-semibold">Currently featured ({featured.data?.length ?? 0})</h2>
        {(featured.data ?? []).length === 0 ? (
          <EmptyState title="No featured properties yet" icon={<Star className="h-6 w-6 text-muted-foreground" />} />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(featured.data ?? []).map((p) => (
              <div key={p.id} className="relative">
                <PropertyCard property={p} />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute right-3 bottom-3"
                  onClick={() => toggle.mutateAsync({ id: p.id, featured: false }).then(() => toast.success("Unfeatured"))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Suggested to feature</h2>
        {candidates.length === 0 ? (
          <EmptyState title="No more candidates" />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {candidates.map((p) => (
              <div key={p.id} className="relative">
                <PropertyCard property={p} />
                <Button
                  size="sm"
                  className="absolute right-3 bottom-3"
                  onClick={() => toggle.mutateAsync({ id: p.id, featured: true }).then(() => toast.success("Featured!"))}
                >
                  <Star className="mr-1 h-4 w-4" /> Feature
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
