import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Pencil, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCreateProperty, useProperties, useDeleteProperty } from "@/hooks/useProperties";
import { PROPERTY_TYPES } from "@/lib/constants";
import { ImageUpload } from "@/components/property/ImageUpload";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import type { PropertyType, ListingType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/agent")({
  component: AgentHome,
});

const schema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().max(2000).optional(),
  price: z.number().positive(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  area_sqft: z.number().int().min(0).optional(),
  property_type: z.enum(["house", "apartment", "land", "commercial"]),
  listing_type: z.enum(["sale", "rent"]),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  address: z.string().max(200).optional(),
});

function AgentHome() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const create = useCreateProperty();
  const del = useDeleteProperty();
  const myProps = useProperties({ agentId: user?.id, status: "all" });

  const [form, setForm] = useState({
    title: "", description: "", price: "", bedrooms: "", bathrooms: "", area_sqft: "",
    property_type: "house" as PropertyType, listing_type: "sale" as ListingType,
    city: "", state: "", address: "",
  });
  const [images, setImages] = useState<string[]>([]);

  if (role !== "agent" && role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Agent access required</h1>
        <p className="mt-2 text-muted-foreground">
          Your account doesn't have agent permissions. Ask an admin to upgrade your role.
        </p>
        <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
      area_sqft: form.area_sqft ? Number(form.area_sqft) : undefined,
      property_type: form.property_type,
      listing_type: form.listing_type,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      address: form.address.trim() || undefined,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!user) return;
    try {
      await create.mutateAsync({
        ...parsed.data,
        images,
        agent_id: user.id,
        status: "pending",
      });
      toast.success("Property submitted for approval");
      setForm({ ...form, title: "", description: "", price: "", address: "" });
      setImages([]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Agent dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and inquiries.</p>
        </div>
        <Link to="/agent/inquiries">
          <Button variant="outline"><Inbox className="mr-2 h-4 w-4" /> Inquiries received</Button>
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-bold">My listings ({myProps.data?.length ?? 0})</h2>
        {myProps.isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (myProps.data ?? []).length === 0 ? (
          <p className="text-muted-foreground">No listings yet. Add your first below.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(myProps.data ?? []).map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.images[0]} alt="" className="h-10 w-14 rounded object-cover" />
                        <div>
                          <Link to="/property/$id" params={{ id: p.id }} className="font-medium hover:underline">{p.title}</Link>
                          <div className="text-xs text-muted-foreground">{p.city}, {p.state}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatPrice(p.price, p.listing_type)}</td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="capitalize">{p.status}</Badge></td>
                    <td className="px-4 py-3">{p.views}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link to="/agent/edit/$id" params={{ id: p.id }}>
                          <Button size="sm" variant="ghost"><Pencil className="mr-1 h-3 w-3" />Edit</Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={async () => {
                            if (!confirm("Delete this listing?")) return;
                            try {
                              await del.mutateAsync(p.id);
                              toast.success("Deleted");
                            } catch (e) { toast.error((e as Error).message); }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10 rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-bold">Add new property</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Price"><Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required /></Field>
          <Field label="Property type">
            <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v as PropertyType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Listing type">
            <Select value={form.listing_type} onValueChange={(v) => setForm({ ...form, listing_type: v as ListingType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">For sale</SelectItem>
                <SelectItem value="rent">For rent</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Bedrooms"><Input type="number" min="0" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} /></Field>
          <Field label="Bathrooms"><Input type="number" min="0" step="0.5" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} /></Field>
          <Field label="Area (sqft)"><Input type="number" min="0" value={form.area_sqft} onChange={(e) => setForm({ ...form, area_sqft: e.target.value })} /></Field>
          <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="City"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="State"><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
          <div className="md:col-span-2">
            <Label>Images</Label>
            <div className="mt-2">
              <ImageUpload value={images} onChange={setImages} pathPrefix={user?.id ?? "uploads"} />
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              className="mt-2"
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 2000) })}
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Submitting…" : "Submit for approval"}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
