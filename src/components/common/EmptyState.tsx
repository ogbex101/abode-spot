import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: { label: string; to: string };
  icon?: React.ReactNode;
}

export function EmptyState({
  title = "No properties found",
  description = "Try adjusting your filters or check back later for new listings.",
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted">
        {icon ?? <Home className="h-7 w-7 text-muted-foreground/50" />}
      </div>
      <h3 className="text-lg font-semibold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">{description}</p>
      {action && (
        <Link to={action.to} className="mt-6">
          <Button variant="outline" className="gap-2">
            {action.label}
          </Button>
        </Link>
      )}
    </div>
  );
}