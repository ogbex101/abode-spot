import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useCreateProperty } from "@/hooks/useProperties";
import { ImageUpload } from "@/components/property/ImageUpload";
import { PROPERTY_TYPES } from "@/lib/constants";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import type { PropertyType, ListingType, PropertyStatus } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/_admin/admin/add-property")({
  component: AdminAddProperty,
});

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150),
  description: z.string().max(2000).optional(),
  price: z.number({ invalid_type_error: "Price is required" }).positive("Price must be positive"),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  area_sqft: z.number().int().min(0).optional(),
  property_type: z.enum(["house", "apartment", "land", "commercial"]),
  listing_type: z.enum(["sale", "rent"]),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  address: z.string().max(200).optional(),
  status: z.enum(["pending", "approved", "rejected", "sold"]),
});

const STATUSES: { value: PropertyStatus; label: string }[] = [
  { value: "approved", label: "Approved (live immediately)" },
  { value: "pending", label: "Pending (needs review)" },
  { value: "rejected", label: "Rejected" },
  { value: "sold", label: "Sold" },
];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function AdminAddProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const create = useCreateProperty();

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    bedrooms: "",
    bathrooms: "",
    area_sqft: "",
    property_type: "house" as PropertyType,
    listing_type: "sale" as ListingType,
    city: "",
    state: "",
    address: "",
    status: "approved" as PropertyStatus,
  });
  const [images, setImages] = useState<string[]>([]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

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
      status: form.status,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!user) return;

    try {
      await create.mutateAsync({
        ...parsed.data,
        images,
        agent_id: user.id,
      });
      toast.success("Property created successfully!");
      navigate({ to: "/admin/properties" });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not create this property. Please try again."));
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          Add New Property
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Properties added here are owned by you (admin). Set the status to <strong>Approved</strong> to make them live immediately.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* Basic info */}
        <div className="rounded-2xl border bg-card p-6 space-y-5">
          <h2 className="font-semibold text-base">Basic Information</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Title *">
                <Input
                  value={form.title}
                  onChange={set("title")}
                  placeholder="e.g. Modern 3-Bedroom Apartment in Lekki"
                  required
                  className="h-11"
                />
              </Field>
            </div>

            <Field label="Property Type *">
              <Select value={form.property_type} onValueChange={(v) => setForm((f) => ({ ...f, property_type: v as PropertyType }))}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Listing Type *">
              <Select value={form.listing_type} onValueChange={(v) => setForm((f) => ({ ...f, listing_type: v as ListingType }))}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">For Sale</SelectItem>
                  <SelectItem value="rent">For Rent</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Price (₦) *">
              <Input
                type="number"
                min="0"
                value={form.price}
                onChange={set("price")}
                placeholder="e.g. 85000000"
                required
                className="h-11"
              />
            </Field>

            <Field label="Status *" hint="Approved = visible to the public right away">
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as PropertyStatus }))}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Description">
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
                  placeholder="Describe the property — features, condition, nearby landmarks…"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{form.description.length}/2000</p>
              </Field>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-2xl border bg-card p-6 space-y-5">
          <h2 className="font-semibold text-base">Property Details</h2>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Bedrooms">
              <Input
                type="number"
                min="0"
                max="50"
                value={form.bedrooms}
                onChange={set("bedrooms")}
                placeholder="e.g. 3"
                className="h-11"
              />
            </Field>
            <Field label="Bathrooms">
              <Input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={form.bathrooms}
                onChange={set("bathrooms")}
                placeholder="e.g. 2"
                className="h-11"
              />
            </Field>
            <Field label="Area (sqft)">
              <Input
                type="number"
                min="0"
                value={form.area_sqft}
                onChange={set("area_sqft")}
                placeholder="e.g. 2400"
                className="h-11"
              />
            </Field>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-2xl border bg-card p-6 space-y-5">
          <h2 className="font-semibold text-base">Location</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={set("address")}
                  placeholder="e.g. 12 Admiralty Way"
                  className="h-11"
                />
              </Field>
            </div>
            <Field label="City">
              <Input
                value={form.city}
                onChange={set("city")}
                placeholder="e.g. Lagos"
                className="h-11"
              />
            </Field>
            <Field label="State">
              <Input
                value={form.state}
                onChange={set("state")}
                placeholder="e.g. Lagos"
                className="h-11"
              />
            </Field>
          </div>
        </div>

        {/* Images */}
        <div className="rounded-2xl border bg-card p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-base">Images</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Upload up to 12 photos. Drag to reorder — the first image is the cover.</p>
          </div>
          <ImageUpload
            value={images}
            onChange={setImages}
            pathPrefix={user?.id ?? "admin"}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pb-6">
          <Button
            type="submit"
            size="lg"
            className="gap-2 font-semibold"
            disabled={create.isPending}
          >
            {create.isPending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating…
              </>
            ) : (
              "Create Property"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => navigate({ to: "/admin/properties" })}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
