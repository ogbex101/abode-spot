// Agent: edit one of their own properties.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useProperty, useUpdateProperty, useDeleteProperty } from "@/hooks/useProperties";
import { PROPERTY_TYPES } from "@/lib/constants";
import { ImageUpload } from "@/components/property/ImageUpload";
import type { PropertyType, ListingType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/agent/edit/$id")({
  component: EditProperty,
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

function EditProperty() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { data: property, isLoading } = useProperty(id);
  const update = useUpdateProperty();
  const del = useDeleteProperty();

  const [form, setForm] = useState({
    title: "", description: "", price: "", bedrooms: "", bathrooms: "", area_sqft: "",
    property_type: "house" as PropertyType, listing_type: "sale" as ListingType,
    city: "", state: "", address: "",
  });
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    if (!property) return;
    setForm({
      title: property.title,
      description: property.description ?? "",
      price: String(property.price),
      bedrooms: property.bedrooms != null ? String(property.bedrooms) : "",
      bathrooms: property.bathrooms != null ? String(property.bathrooms) : "",
      area_sqft: property.area_sqft != null ? String(property.area_sqft) : "",
      property_type: property.property_type,
      listing_type: property.listing_type,
      city: property.city ?? "",
      state: property.state ?? "",
      address: property.address ?? "",
    });
    setImages(property.images ?? []);
  }, [property]);

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-10">Loading…</div>;
  if (!property) return <div className="mx-auto max-w-3xl px-4 py-10">Property not found.</div>;

  const canEdit = role === "admin" || (role === "agent" && property.agent_id === user?.id);
  if (!canEdit) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Not allowed</h1>
        <p className="mt-2 text-muted-foreground">You can only edit your own listings.</p>
        <Link to="/agent" className="mt-4 inline-block text-primary hover:underline">Back</Link>
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
    try {
      await update.mutateAsync({
        id: property.id,
        ...parsed.data,
        images,
        // Editing resets status to pending unless the user is admin
        ...(role === "admin" ? {} : { status: "pending" as const }),
      });
      toast.success("Property updated");
      navigate({ to: "/agent" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onDelete = async () => {
    if (!confirm("Delete this property? This cannot be undone.")) return;
    try {
      await del.mutateAsync(property.id);
      toast.success("Property deleted");
      navigate({ to: "/agent" });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Edit property</h1>
          <p className="text-muted-foreground">
            Changes will resubmit the listing for admin approval.
          </p>
        </div>
        <Link to="/agent" className="text-sm text-primary hover:underline">← Back</Link>
      </div>

      <form className="grid gap-4 rounded-2xl border bg-card p-6 md:grid-cols-2" onSubmit={onSubmit}>
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
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 2000) })}
          />
        </div>

        <div className="md:col-span-2 flex flex-wrap justify-between gap-2">
          <Button type="button" variant="destructive" onClick={onDelete} disabled={del.isPending}>
            Delete listing
          </Button>
          <div className="flex gap-2">
            <Link to="/agent"><Button type="button" variant="outline">Cancel</Button></Link>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </form>
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
