import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/property/ImageUpload";
import { useAuth } from "@/hooks/useAuth";
import { useCreateProperty } from "@/hooks/useProperties";
import { PROPERTY_TYPES } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import type { ListingType, PropertyStatus, PropertyType } from "@/lib/types";

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
  status: z.enum(["pending", "approved", "rejected", "sold"]),
});

const statuses: { value: PropertyStatus; label: string }[] = [
  { value: "approved", label: "Approved (live immediately)" },
  { value: "pending", label: "Pending (needs review)" },
  { value: "rejected", label: "Rejected" },
  { value: "sold", label: "Sold" },
];

export function AdminCreatePropertyForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const create = useCreateProperty();
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({ title: "", description: "", price: "", bedrooms: "", bathrooms: "", property_type: "house" as PropertyType, listing_type: "sale" as ListingType, address: "", state: "", status: "approved" as PropertyStatus });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = schema.safeParse({
      title: form.title.trim(), description: form.description.trim() || undefined, price: Number(form.price),
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined, bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
      property_type: form.property_type, listing_type: form.listing_type, address: form.address.trim() || undefined, state: form.state.trim() || undefined, status: form.status,
    });
    if (!result.success) return toast.error(result.error.issues[0].message);
    if (!user) return;
    try {
      await create.mutateAsync({ ...result.data, images, agent_id: user.id });
      toast.success("Property created successfully!");
      await navigate({ to: "/admin/properties" });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not create this property. Please try again."));
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6"><h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Add New Property</h1><p className="mt-1 text-sm text-muted-foreground">Set the listing status to control when it appears publicly.</p></div>
      <form onSubmit={submit} className="space-y-8">
        <Card title="Basic Information"><div className="grid gap-5 md:grid-cols-2">
          <Field label="Title *"><Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Modern 3-Bedroom Apartment in Lekki" /></Field>
          <Field label="Price (₦) *"><Input required type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></Field>
          <Field label="Property Type"><Select value={form.property_type} onValueChange={(value) => setForm({ ...form, property_type: value as PropertyType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROPERTY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Listing Type"><Select value={form.listing_type} onValueChange={(value) => setForm({ ...form, listing_type: value as ListingType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sale">For Sale</SelectItem><SelectItem value="rent">For Rent</SelectItem></SelectContent></Select></Field>
          <Field label="Status"><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as PropertyStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{statuses.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent></Select></Field>
          <div className="md:col-span-2"><Field label="Description"><Textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value.slice(0, 2000) })} /></Field></div>
        </div></Card>
        <Card title="Property Details"><div className="grid gap-5 md:grid-cols-2"><Field label="Bedrooms"><Input type="number" min="0" value={form.bedrooms} onChange={(event) => setForm({ ...form, bedrooms: event.target.value })} /></Field><Field label="Bathrooms"><Input type="number" min="0" step="0.5" value={form.bathrooms} onChange={(event) => setForm({ ...form, bathrooms: event.target.value })} /></Field></div></Card>
        <Card title="Location"><div className="grid gap-5 md:grid-cols-2"><Field label="Address"><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="e.g. Lekki Phase 1" /></Field><Field label="State"><Input value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} placeholder="e.g. Lagos" /></Field></div></Card>
        <Card title="Images"><ImageUpload value={images} onChange={setImages} pathPrefix={user?.id ?? "admin"} /></Card>
        <div className="flex gap-3 pb-6"><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create Property"}</Button><Button type="button" variant="outline" onClick={() => void navigate({ to: "/admin/properties" })}>Cancel</Button></div>
      </form>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="space-y-5 rounded-2xl border bg-card p-6"><h2 className="text-base font-semibold">{title}</h2>{children}</section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
