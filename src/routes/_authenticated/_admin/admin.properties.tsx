import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, X, Star, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useProperties,
  useUpdatePropertyStatus,
  useToggleFeatured,
  useDeleteProperty,
  useBulkUpdatePropertyStatus,
  useBulkDeleteProperties,
} from "@/hooks/useProperties";
import { Link } from "@tanstack/react-router";
import { formatPrice, formatDate } from "@/lib/format";
import { toast } from "sonner";
import type { PropertyStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/_admin/admin/properties")({
  component: AdminProperties,
});

const PAGE_SIZE = 10;

function AdminProperties() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PropertyStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading } = useProperties({ search: search || undefined, status });
  const updateStatus = useUpdatePropertyStatus();
  const toggleFeat = useToggleFeatured();
  const del = useDeleteProperty();
  const bulkStatus = useBulkUpdatePropertyStatus();
  const bulkDelete = useBulkDeleteProperties();

  const all = data ?? [];
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => all.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [all, safePage]
  );
  const allSelectedOnPage = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));

  const toggleOne = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAllOnPage = () => {
    setSelected((s) => {
      const next = new Set(s);
      if (allSelectedOnPage) pageItems.forEach((p) => next.delete(p.id));
      else pageItems.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const act = (fn: () => Promise<unknown> | unknown, ok: string) =>
    Promise.resolve(fn()).then(() => toast.success(ok)).catch((e: Error) => toast.error(e.message));

  const ids = Array.from(selected);
  const runBulk = async (s: PropertyStatus) => {
    if (!ids.length) return;
    await act(() => bulkStatus.mutateAsync({ ids, status: s }), `${ids.length} updated`);
    setSelected(new Set());
  };
  const runBulkDelete = async () => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} properties? This cannot be undone.`)) return;
    await act(() => bulkDelete.mutateAsync(ids), `${ids.length} deleted`);
    setSelected(new Set());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
        <Input
          placeholder="Search title/city"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Select value={status} onValueChange={(v) => { setStatus(v as PropertyStatus | "all"); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          {all.length} total
        </div>
      </div>

      {ids.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-medium">{ids.length} selected</span>
          <Button size="sm" variant="outline" onClick={() => runBulk("approved")}>Approve</Button>
          <Button size="sm" variant="outline" onClick={() => runBulk("rejected")}>Reject</Button>
          <Button size="sm" variant="outline" onClick={() => runBulk("sold")}>Mark sold</Button>
          <Button size="sm" variant="destructive" onClick={runBulkDelete}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3">
                <Checkbox checked={allSelectedOnPage} onCheckedChange={toggleAllOnPage} aria-label="Select page" />
              </th>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!isLoading && pageItems.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No properties.</td></tr>
            )}
            {pageItems.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)} aria-label={`Select ${p.title}`} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={p.images[0]} alt="" className="h-10 w-14 rounded object-cover" />
                    <div>
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.city}, {p.state}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{formatPrice(p.price, p.listing_type)}</td>
                <td className="px-4 py-3 capitalize">{p.listing_type}</td>
                <td className="px-4 py-3"><StatusBadge s={p.status} /></td>
                <td className="px-4 py-3">{p.views}</td>
                <td className="px-4 py-3">{formatDate(p.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link to="/property/$id" params={{ id: p.id }}>
                      <Button size="icon" variant="ghost" aria-label={`View ${p.title}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {p.status !== "approved" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Approve ${p.title}`}
                        onClick={() => act(() => updateStatus.mutateAsync({ id: p.id, status: "approved" }), "Approved")}
                      >
                        <Check className="h-4 w-4 text-success" />
                      </Button>
                    )}
                    {p.status !== "rejected" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Reject ${p.title}`}
                        onClick={() => act(() => updateStatus.mutateAsync({ id: p.id, status: "rejected" }), "Rejected")}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`${p.featured ? "Unfeature" : "Feature"} ${p.title}`}
                      onClick={() => act(() => toggleFeat.mutateAsync({ id: p.id, featured: !p.featured }), p.featured ? "Unfeatured" : "Featured")}
                    >
                      <Star className={"h-4 w-4 " + (p.featured ? "fill-accent text-accent" : "")} />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={`Delete ${p.title}`} onClick={() => {
                      if (confirm("Delete this property?")) act(() => del.mutateAsync(p.id), "Deleted");
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {safePage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Prev
          </Button>
          <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: PropertyStatus }) {
  const cls = s === "approved" ? "bg-success text-success-foreground" :
              s === "pending" ? "bg-warning text-warning-foreground" :
              s === "rejected" ? "bg-destructive text-destructive-foreground" : "bg-muted";
  return <Badge className={cls}>{s}</Badge>;
}
