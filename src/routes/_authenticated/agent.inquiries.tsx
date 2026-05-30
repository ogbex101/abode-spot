// Agent: inquiries received on my listings.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useInquiries, useUpdateInquiryStatus } from "@/hooks/useInquiries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { Inbox, Mail, Phone, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agent/inquiries")({
  component: AgentInquiries,
});

function AgentInquiries() {
  const { role } = useAuth();
  const { data, isLoading } = useInquiries({ scope: "agent" });
  const update = useUpdateInquiryStatus();

  if (role !== "agent" && role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Agent access required</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const items = data ?? [];
  const unread = items.filter((i) => i.status === "unread").length;

  const markStatus = async (id: string, status: "read" | "replied") => {
    try {
      await update.mutateAsync({ id, status });
      toast.success(status === "replied" ? "Marked as replied" : "Marked as read");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            Inquiries Received
          </h1>
          <p className="text-muted-foreground mt-1">
            {items.length} total · {unread} unread
          </p>
        </div>
        <Link to="/agent">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6 text-muted-foreground" />}
          title="No inquiries yet"
          description="When buyers contact you about your listings, their messages will appear here."
        />
      ) : (
        <div className="space-y-4">
          {items.map((inq) => {
            const prop = inq.property as { id?: string; title?: string; city?: string; images?: string[] } | null;
            const sender = inq.user as { full_name?: string; email?: string; phone?: string } | null;

            return (
              <div
                key={inq.id}
                className={`rounded-2xl border bg-card p-5 transition-all ${inq.status === "unread" ? "border-primary/30 bg-primary/2 shadow-sm" : ""}`}
              >
                <div className="flex flex-wrap gap-4 items-start">
                  {/* Property thumbnail */}
                  {prop?.images?.[0] && (
                    <img
                      src={prop.images[0]}
                      alt=""
                      className="h-16 w-24 rounded-xl object-cover shrink-0 hidden sm:block"
                    />
                  )}

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Property link + status */}
                    <div className="flex flex-wrap items-center gap-2">
                      {prop?.id ? (
                        <Link to="/property/$id" params={{ id: prop.id }} className="font-semibold hover:underline">
                          {prop.title ?? "Property"}
                        </Link>
                      ) : (
                        <span className="font-semibold text-muted-foreground">Property removed</span>
                      )}
                      {prop?.city && <span className="text-xs text-muted-foreground">· {prop.city}</span>}
                      <StatusBadge status={inq.status} />
                    </div>

                    {/* Message */}
                    <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 rounded-xl p-3">
                      "{inq.message}"
                    </p>

                    {/* Sender info */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{sender?.full_name ?? "Anonymous"}</span>
                      {sender?.email && (
                        <a href={`mailto:${sender.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Mail className="h-3 w-3" /> {sender.email}
                        </a>
                      )}
                      {sender?.phone && (
                        <a href={`tel:${sender.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <Phone className="h-3 w-3" /> {sender.phone}
                        </a>
                      )}
                      <span>{formatDate(inq.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    {sender?.email && (
                      <a href={`mailto:${sender.email}?subject=Re: ${encodeURIComponent(prop?.title ?? "Your inquiry")}`}>
                        <Button size="sm" className="gap-2 w-full">
                          <Mail className="h-3.5 w-3.5" /> Reply by Email
                        </Button>
                      </a>
                    )}
                    {inq.status === "unread" && (
                      <Button size="sm" variant="outline" onClick={() => markStatus(inq.id, "read")}>
                        Mark as read
                      </Button>
                    )}
                    {inq.status !== "replied" && (
                      <Button size="sm" variant="ghost" onClick={() => markStatus(inq.id, "replied")}>
                        Mark replied
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unread: "bg-warning/15 text-warning-foreground border-warning/30",
    read: "bg-muted text-muted-foreground",
    replied: "bg-success/15 text-success border-success/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}
