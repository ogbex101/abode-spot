import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/property/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { useProperty, useUpdateProperty } from "@/hooks/useProperties";
import { PROPERTY_TYPES } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import type { ListingType, PropertyType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/agent/edit/$id")({ component: EditProperty });

const schema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().max(2000).optional(),
  price: z.number().positive(),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  property_type: z.enum(["house", "apartment", "land", "commercial"]),
  listing_type: z.enum(["sale", "rent"]),
  address: z.string().max(200).optional(),
  state: z.string().max(50).optional(),
});

function EditProperty() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { data: property, isLoading } = useProperty(id);
  const update = useUpdateProperty();
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", description: "", price: "", bedrooms: "", bathrooms: "", property_type: "house" as PropertyType, listing_type: "sale" as ListingType, address: "", state: "" });

  useEffect(() => {
    if (!property) return;
    setForm({
      title: property.title,
      description: property.description ?? "",
      price: String(property.price),
      bedrooms: property.bedrooms == null ? "" : String(property.bedrooms),
      bathrooms: property.bathrooms == null ? "" : String(property.bathrooms),
      property_type: property.property_type,
      listing_type: property.listing_type,
      address: property.address ?? "",
      state: property.state ?? "",
    });
    setImages(property.images ?? []);
  }, [property]);

  if (isLoading) return <div className="mx-auto max-w-3xl px-4 py-10">Loading…</div>;
  if (!property) return <div className="mx-auto max-w-3xl px-4 py-10">Property not found.</div>;
  if (role !== "admin" && !(role === "agent" && property.agent_id === user?.id)) {
    return <div className="mx-auto max-w-md px-4 py-20 text-center"><h1 className="text-xl font-bold">Not allowed</h1><Link to="/agent" className="mt-4 inline-block text-primary hover:underline">Back</Link></div>;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse({
      title: form.title.trim(), description: form.description.trim() || undefined, price: Number(form.price),
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined, bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
      property_type: form.property_type, listing_type: form.listing_type, address: form.address.trim() || undefined, state: form.state.trim() || undefined,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    try {
      await update.mutateAsync({ id: property.id, ...parsed.data, images });
      toast.success("Property updated");
      await navigate({ to: "/agent" });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update this property. Please try again."));
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Edit Property</h1><p className="text-muted-foreground">Changes update the live listing immediately.</p></div><Link to="/agent" className="text-sm text-primary hover:underline">← Back</Link></div>
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border bg-card p-6 md:grid-cols-2">
        <Field label="Title"><Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /></Field>
        <Field label="Price (₦)"><Input type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required /></Field>
        <Field label="Property Type"><Select value={form.property_type} onValueChange={(value) => setForm({ ...form, property_type: value as PropertyType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROPERTY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Listing Type"><Select value={form.listing_type} onValueChange={(value) => setForm({ ...form, listing_type: value as ListingType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sale">For Sale</SelectItem><SelectItem value="rent">For Rent</SelectItem></SelectContent></Select></Field>
        <Field label="Bedrooms"><Input type="number" min="0" value={form.bedrooms} onChange={(event) => setForm({ ...form, bedrooms: event.target.value })} /></Field>
        <Field label="Bathrooms"><Input type="number" min="0" step="0.5" value={form.bathrooms} onChange={(event) => setForm({ ...form, bathrooms: event.target.value })} /></Field>
        <Field label="Address"><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
        <Field label="State"><Input value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} /></Field>
        <div className="md:col-span-2"><Label>Images</Label><div className="mt-2"><ImageUpload value={images} onChange={setImages} pathPrefix={user?.id ?? "uploads"} /></div></div>
        <div className="md:col-span-2"><Label>Description</Label><Textarea className="mt-2" rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value.slice(0, 2000) })} /></div>
        <div className="flex justify-end gap-2 md:col-span-2"><Link to="/agent"><Button type="button" variant="outline">Cancel</Button></Link><Button type="submit" disabled={update.isPending}>{update.isPending ? "Saving…" : "Save Changes"}</Button></div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
