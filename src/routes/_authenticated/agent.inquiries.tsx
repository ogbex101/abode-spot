// Agent: inquiries received on my listings.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useInquiries, useUpdateInquiryStatus } from "@/hooks/useInquiries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agent/inquiries")({
  component: AgentInquiries,
});

function AgentInquiries() {
  const { user, role } = useAuth();
  const { data, isLoading } = useInquiries({ scope: "agent" });
  const update = useUpdateInquiryStatus();

  // RLS should already filter; this is a defensive client-side guard.
  const items = useMemo(
    () => (data ?? []).filter((i) => !user || i.property?.agent_id === user.id || role === "admin"),
    [data, user, role]
  );

  if (role !== "agent" && role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Agent access required</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inquiries received</h1>
          <p className="text-muted-foreground">Messages from interested buyers and renters.</p>
        </div>
        <Link to="/agent" className="text-sm text-primary hover:underline">← Back to listings</Link>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={<Inbox className="h-6 w-6 text-muted-foreground" />} title="No inquiries yet" description="When buyers contact you, their messages will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t align-top">
                  <td className="px-4 py-3 font-medium">
                    {i.property?.id ? (
                      <Link to="/property/$id" params={{ id: i.property.id }} className="hover:underline">
                        {i.property.title}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div>{i.user?.full_name ?? i.user?.email ?? "—"}</div>
                    {i.user?.phone && <div className="text-xs">{i.user.phone}</div>}
                  </td>
                  <td className="px-4 py-3 max-w-md text-muted-foreground">{i.message}</td>
                  <td className="px-4 py-3">
                    <Badge className={
                      i.status === "unread" ? "bg-warning text-warning-foreground" :
                      i.status === "replied" ? "bg-success text-success-foreground" : "bg-muted"
                    }>{i.status}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(i.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {i.user?.email && (
                        <a href={`mailto:${i.user.email}`}>
                          <Button size="sm" variant="outline">Email</Button>
                        </a>
                      )}
                      {i.status === "unread" && (
                        <Button size="sm" variant="ghost" onClick={() => update.mutateAsync({ id: i.id, status: "read" }).then(() => toast.success("Marked read")).catch((e: Error) => toast.error(e.message))}>
                          Mark read
                        </Button>
                      )}
                      {i.status !== "replied" && (
                        <Button size="sm" onClick={() => update.mutateAsync({ id: i.id, status: "replied" }).then(() => toast.success("Marked replied")).catch((e: Error) => toast.error(e.message))}>
                          Mark replied
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
