import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowLeft, Building2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCreateProperty } from "@/hooks/useProperties";
import { PROPERTY_TYPES } from "@/lib/constants";
import { ImageUpload } from "@/components/property/ImageUpload";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import type { ListingType, PropertyType } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/agent/add-property")({
  component: AgentAddProperty,
});

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().max(2000).optional(),
  price: z.number({ invalid_type_error: "Price is required" }).positive("Price must be positive"),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  property_type: z.enum(["house", "apartment", "land", "commercial"]),
  listing_type: z.enum(["sale", "rent"]),
  state: z.string().max(50).optional(),
  address: z.string().max(200).optional(),
});

const EMPTY_FORM = {
  title: "",
  description: "",
  price: "",
  bedrooms: "",
  bathrooms: "",
  property_type: "house" as PropertyType,
  listing_type: "sale" as ListingType,
  state: "",
  address: "",
};

function AgentAddProperty() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const create = useCreateProperty();
  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState<string[]>([]);

  if (role === "pending_agent") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/15 text-warning-foreground">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold">Agent approval pending</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your agent account is awaiting admin approval. You can list properties after an admin approves you.
        </p>
        <Button type="button" variant="outline" className="mt-5" onClick={() => void navigate({ to: "/agent" })}>
          Back to Agent Portal
        </Button>
      </div>
    );
  }

  if (role !== "agent" && role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Building2 className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold">Agent access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only approved agents can create live property listings.</p>
        <Link to="/dashboard" className="mt-5 inline-block text-sm text-primary hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
      property_type: form.property_type,
      listing_type: form.listing_type,
      state: form.state.trim() || undefined,
      address: form.address.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!user) return;

    try {
      await create.mutateAsync({ ...parsed.data, images, agent_id: user.id, status: "approved" });
      toast.success("Property is now live");
      await navigate({ to: "/agent" });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not submit this property. Please try again."));
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Add Property</h1>
          <p className="mt-1 text-muted-foreground">Create a live listing that appears to buyers immediately.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void navigate({ to: "/agent" })} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-5 text-base font-semibold">Basic Information</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label htmlFor="agent-title">Property Title *</Label><Input id="agent-title" required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Modern 3-Bedroom Apartment in Lekki" /></div>
            <div className="space-y-2"><Label htmlFor="agent-property-type">Property Type *</Label><Select value={form.property_type} onValueChange={(value) => setForm((current) => ({ ...current, property_type: value as PropertyType }))}><SelectTrigger id="agent-property-type"><SelectValue /></SelectTrigger><SelectContent>{PROPERTY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="agent-listing-type">Listing Type *</Label><Select value={form.listing_type} onValueChange={(value) => setForm((current) => ({ ...current, listing_type: value as ListingType }))}><SelectTrigger id="agent-listing-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sale">For Sale</SelectItem><SelectItem value="rent">For Rent</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="agent-price">Price (₦) *</Label><Input id="agent-price" type="number" min="0" required value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="e.g. 85000000" /></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="agent-bedrooms">Bedrooms</Label><Input id="agent-bedrooms" type="number" min="0" max="50" value={form.bedrooms} onChange={(event) => setForm((current) => ({ ...current, bedrooms: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="agent-bathrooms">Bathrooms</Label><Input id="agent-bathrooms" type="number" min="0" max="50" step="0.5" value={form.bathrooms} onChange={(event) => setForm((current) => ({ ...current, bathrooms: event.target.value }))} /></div></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="agent-description">Description</Label><Textarea id="agent-description" rows={5} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value.slice(0, 2000) }))} placeholder="Describe the property, nearby landmarks, condition, and main selling points." /></div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-5 text-base font-semibold">Location</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><Label htmlFor="agent-address">Address</Label><Input id="agent-address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="e.g. Lekki Phase 1" /></div>
            <div className="space-y-2"><Label htmlFor="agent-state">State</Label><Input id="agent-state" value={form.state} onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))} placeholder="e.g. Lagos" /></div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6"><div className="mb-4"><h2 className="text-base font-semibold">Images</h2><p className="mt-1 text-sm text-muted-foreground">Use clear real photos where possible. The first image becomes the cover photo.</p></div><ImageUpload value={images} onChange={setImages} pathPrefix={user?.id ?? "agent"} /></section>
        <div className="flex flex-wrap gap-3 pb-6"><Button type="submit" disabled={create.isPending}>{create.isPending ? "Submitting..." : "Submit Property"}</Button><Button type="button" variant="outline" onClick={() => { setForm(EMPTY_FORM); setImages([]); }}>Clear</Button></div>
      </form>
    </div>
  );
}
