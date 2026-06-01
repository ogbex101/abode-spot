import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Pencil, Inbox, Plus, Trash2, Eye, BarChart2, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useCreateProperty, useProperties, useDeleteProperty } from "@/hooks/useProperties";
import { useInquiries } from "@/hooks/useInquiries";
import { PROPERTY_TYPES } from "@/lib/constants";
import { ImageUpload } from "@/components/property/ImageUpload";
import { formatPrice, formatDate } from "@/lib/format";
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

const EMPTY_FORM = {
  title: "", description: "", price: "", bedrooms: "", bathrooms: "", area_sqft: "",
  property_type: "house" as PropertyType, listing_type: "sale" as ListingType,
  city: "", state: "", address: "",
};

function AgentHome() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const create = useCreateProperty();
  const del = useDeleteProperty();
  const myProps = useProperties({ agentId: user?.id, status: "all" });
  const inquiries = useInquiries({ scope: "agent" });
  const unread = (inquiries.data ?? []).filter((i) => i.status === "unread").length;

  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState<string[]>([]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Non-agents see a "request to list" prompt instead of a hard block
  if (role !== "agent" && role !== "admin") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
          List your property on AbodeSpot
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Want to sell or rent out a property? Create an Agent account to get access to our full listing dashboard, inquiry management, and featured placement.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" className="gap-2" onClick={() => navigate({ to: "/register" })}>
            Sign up as an Agent <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate({ to: "/properties" })}>
            Browse listings
          </Button>
        </div>
        <div className="mt-10 grid sm:grid-cols-3 gap-4 text-left">
          {[
            { title: "Free to list", desc: "Post as many properties as you need with zero upfront cost." },
            { title: "Reach buyers fast", desc: "Your listings go live immediately and show in search." },
            { title: "Manage inquiries", desc: "Receive and respond to buyer messages in one place." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-4">
              <div className="font-semibold text-sm mb-1">{f.title}</div>
              <div className="text-xs text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
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
      setForm(EMPTY_FORM);
      setImages([]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const props = myProps.data ?? [];
  const approved = props.filter((p) => p.status === "approved").length;
  const pending = props.filter((p) => p.status === "pending").length;
  const totalViews = props.reduce((s, p) => s + (p.views ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Agent Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and inquiries.</p>
        </div>
        <Link to="/agent/inquiries">
          <Button variant="outline" className="relative gap-2">
            <Inbox className="h-4 w-4" /> Inquiries
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                {unread}
              </span>
            )}
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total listings", value: props.length, icon: <Building2 className="h-4 w-4" /> },
          { label: "Live / approved", value: approved, icon: <Eye className="h-4 w-4" /> },
          { label: "Pending review", value: pending, icon: <Plus className="h-4 w-4" /> },
          { label: "Total views", value: totalViews, icon: <BarChart2 className="h-4 w-4" /> },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">{s.icon}<span className="text-xs">{s.label}</span></div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="listings">
        <TabsList className="mb-6">
          <TabsTrigger value="listings">My Listings ({props.length})</TabsTrigger>
          <TabsTrigger value="add">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add New Property
          </TabsTrigger>
        </TabsList>

        {/* ── Listings tab ── */}
        <TabsContent value="listings">
          {myProps.isLoading ? (
            <p className="text-muted-foreground py-10 text-center">Loading…</p>
          ) : props.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="font-medium">No listings yet.</p>
              <p className="text-sm mt-1">Use the "Add New Property" tab to post your first listing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Views</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {props.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {p.images[0] ? (
                            <img src={p.images[0]} alt="" className="h-10 w-14 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="h-10 w-14 rounded-lg bg-muted shrink-0" />
                          )}
                          <div>
                            <Link to="/property/$id" params={{ id: p.id }} className="font-medium hover:underline line-clamp-1">
                              {p.title}
                            </Link>
                            <div className="text-xs text-muted-foreground">{p.city}{p.state ? `, ${p.state}` : ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatPrice(p.price, p.listing_type)}</td>
                      <td className="px-4 py-3 capitalize">{p.property_type}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className={
                            p.status === "approved" ? "bg-success/15 text-success" :
                            p.status === "pending" ? "bg-warning/15 text-warning-foreground" :
                            p.status === "rejected" ? "bg-destructive/15 text-destructive" :
                            "bg-muted"
                          }
                        >
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{p.views ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link to="/agent/edit/$id" params={{ id: p.id }}>
                            <Button size="sm" variant="outline" className="gap-1">
                              <Pencil className="h-3 w-3" /> Edit
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive gap-1"
                            onClick={async () => {
                              if (!confirm("Delete this listing? This cannot be undone.")) return;
                              try {
                                await del.mutateAsync(p.id);
                                toast.success("Listing deleted");
                              } catch (e) { toast.error((e as Error).message); }
                            }}
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ── Add property tab ── */}
        <TabsContent value="add">
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-bold mb-5">New Property Listing</h2>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
              <Field label="Title *">
                <Input placeholder="e.g. 3-Bedroom Flat, Lekki Phase 1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </Field>
              <Field label="Price (₦) *">
                <Input type="number" min="0" placeholder="e.g. 85000000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </Field>
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
              <Field label="Bedrooms">
                <Input type="number" min="0" placeholder="e.g. 3" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
              </Field>
              <Field label="Bathrooms">
                <Input type="number" min="0" step="0.5" placeholder="e.g. 2" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
              </Field>
              <Field label="Area (sqft)">
                <Input type="number" min="0" placeholder="e.g. 2200" value={form.area_sqft} onChange={(e) => setForm({ ...form, area_sqft: e.target.value })} />
              </Field>
              <Field label="Address">
                <Input placeholder="e.g. 14 Admiralty Way" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Field>
              <Field label="City">
                <Input placeholder="e.g. Lekki" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </Field>
              <Field label="State">
                <Input placeholder="e.g. Lagos" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea
                  className="mt-2"
                  rows={4}
                  placeholder="Describe the property — features, condition, nearby landmarks…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 2000) })}
                />
                <div className="text-xs text-muted-foreground mt-1 text-right">{form.description.length}/2000</div>
              </div>
              <div className="md:col-span-2">
                <Label>Photos (upload or paste URL)</Label>
                <div className="mt-2">
                  <ImageUpload value={images} onChange={setImages} pathPrefix={user?.id ?? "uploads"} />
                </div>
              </div>
              <div className="md:col-span-2 flex gap-3">
                <Button type="submit" disabled={create.isPending} className="gap-2">
                  {create.isPending ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Submitting…</>
                  ) : (
                    <><Plus className="h-4 w-4" /> Submit for approval</>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => setForm(EMPTY_FORM)}>Clear form</Button>
              </div>
            </form>
          </div>
        </TabsContent>
      </Tabs>
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
