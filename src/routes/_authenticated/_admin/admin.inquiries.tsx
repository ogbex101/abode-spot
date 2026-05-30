import { createFileRoute } from "@tanstack/react-router";
import { useInquiries, useUpdateInquiryStatus } from "@/hooks/useInquiries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, truncate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_admin/admin/inquiries")({
  component: AdminInquiries,
});

function AdminInquiries() {
  const { data, isLoading } = useInquiries({ scope: "admin" });
  const update = useUpdateInquiryStatus();

  return (
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
          {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
          {(data ?? []).map((i) => (
            <tr key={i.id} className="border-t">
              <td className="px-4 py-3 font-medium">{i.property?.title ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{i.user?.email ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{truncate(i.message, 60)}</td>
              <td className="px-4 py-3"><Badge className={i.status === "unread" ? "bg-warning text-warning-foreground" : i.status === "replied" ? "bg-success text-success-foreground" : "bg-muted"}>{i.status}</Badge></td>
              <td className="px-4 py-3">{formatDate(i.created_at)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  {i.status === "unread" && (
                    <Button size="sm" variant="ghost" onClick={() => update.mutateAsync({ id: i.id, status: "read" }).then(() => toast.success("Marked read"))}>
                      Mark read
                    </Button>
                  )}
                  {i.status !== "replied" && (
                    <Button size="sm" onClick={() => update.mutateAsync({ id: i.id, status: "replied" }).then(() => toast.success("Marked replied"))}>
                      Reply
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
