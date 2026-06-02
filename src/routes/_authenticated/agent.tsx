import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Pencil, Inbox, Plus, Trash2, Eye, BarChart2, Building2, ArrowRight, Mail, Phone, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useCreateProperty, useProperties, useDeleteProperty } from "@/hooks/useProperties";
import { useInquiries, useUpdateInquiryStatus } from "@/hooks/useInquiries";
import { PROPERTY_TYPES } from "@/lib/constants";
import { ImageUpload } from "@/components/property/ImageUpload";
import { formatPrice, formatDate } from "@/lib/format";
import { toast } from "sonner";
import type { PropertyType, ListingType, Inquiry } from "@/lib/types";

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
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const create = useCreateProperty();
  const del = useDeleteProperty();
  const updateInquiry = useUpdateInquiryStatus();
  const myProps = useProperties({ agentId: user?.id, status: "all" });
  const inquiries = useInquiries({ scope: "agent" });
  const unread = (inquiries.data ?? []).filter((i: any) => i.status === "unread").length;

  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState<string[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);

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

  const handleMarkAsRead = async (inquiryId: string) => {
    try {
      await updateInquiry.mutateAsync({ id: inquiryId, status: "read" });
      toast.success("Marked as read");
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAsReplied = async (inquiryId: string) => {
    try {
      await updateInquiry.mutateAsync({ id: inquiryId, status: "replied" });
      toast.success("Marked as replied");
      setReplyDialogOpen(false);
      setReplyMessage("");
    } catch (error) {
      toast.error("Failed to mark as replied");
    }
  };

  const handleReply = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setReplyDialogOpen(true);
  };

  const handleSendReply = () => {
    if (!replyMessage.trim()) {
      toast.error("Please enter a reply message");
      return;
    }
    if (selectedInquiry?.user?.email) {
      window.location.href = `mailto:${selectedInquiry.user.email}?subject=Re: ${encodeURIComponent(selectedInquiry.property?.title || "Property Inquiry")}&body=${encodeURIComponent(replyMessage)}`;
      handleMarkAsReplied(selectedInquiry.id);
    } else {
      toast.error("No email address found for this user");
    }
  };

  const props = myProps.data ?? [];
  const approved = props.filter((p) => p.status === "approved").length;
  const pending = props.filter((p) => p.status === "pending").length;
  const totalViews = props.reduce((s, p) => s + (p.views ?? 0), 0);
  const inquiryItems = inquiries.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Agent Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and inquiries.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total listings", value: props.length, icon: <Building2 className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
          { label: "Live / approved", value: approved, icon: <Eye className="h-4 w-4" />, color: "bg-success/10 text-success" },
          { label: "Pending review", value: pending, icon: <Plus className="h-4 w-4" />, color: "bg-warning/10 text-warning-foreground" },
          { label: "Unread Inquiries", value: unread, icon: <Inbox className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${s.color} mb-2`}>
              {s.icon}
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="inquiries" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="inquiries" className="gap-2">
            <Inbox className="h-4 w-4" /> Inquiries
            {unread > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                {unread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-2">
            <Building2 className="h-4 w-4" /> My Listings
          </TabsTrigger>
          <TabsTrigger value="add" className="gap-2">
            <Plus className="h-4 w-4" /> Add Property
          </TabsTrigger>
        </TabsList>

        {/* ── INQUIRIES TAB ── */}
        <TabsContent value="inquiries" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Received Inquiries</CardTitle>
              <CardDescription>
                Messages from potential buyers interested in your properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inquiries.isLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : inquiryItems.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Inbox className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No inquiries yet</p>
                  <p className="text-sm mt-1">When buyers contact you, their messages will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {inquiryItems.map((inq: any) => {
                    const property = inq.property as { id?: string; title?: string; city?: string; images?: string[] } | null;
                    const sender = inq.user as { id?: string; full_name?: string; email?: string; phone?: string } | null;
                    
                    return (
                      <div
                        key={inq.id}
                        className={`rounded-lg border p-4 transition-all ${
                          inq.status === "unread" 
                            ? "border-primary/50 bg-primary/5 shadow-sm" 
                            : "bg-card"
                        }`}
                      >
                        <div className="flex flex-wrap gap-4">
                          {/* Property image */}
                          {property?.images?.[0] && (
                            <img
                              src={property.images[0]}
                              alt=""
                              className="h-20 w-24 rounded-lg object-cover shrink-0"
                            />
                          )}
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <Link 
                                  to="/property/$id" 
                                  params={{ id: property?.id || "" }}
                                  className="font-semibold hover:underline"
                                >
                                  {property?.title || "Unknown Property"}
                                </Link>
                                {property?.city && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    {property.city}
                                  </span>
                                )}
                              </div>
                              <InquiryStatusBadge status={inq.status} />
                            </div>
                            
                            <p className="text-sm bg-muted/30 rounded-lg p-3">
                              "{inq.message}"
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              <span className="font-medium text-foreground">
                                {sender?.full_name || "Anonymous"}
                              </span>
                              {sender?.email && (
                                <a 
                                  href={`mailto:${sender.email}`}
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Mail className="h-3 w-3" /> {sender.email}
                                </a>
                              )}
                              {sender?.phone && (
                                <a 
                                  href={`tel:${sender.phone}`}
                                  className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Phone className="h-3 w-3" /> {sender.phone}
                                </a>
                              )}
                              <span className="text-muted-foreground">
                                {formatDate(inq.created_at)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            {inq.status === "unread" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsRead(inq.id)}
                              >
                                Mark as read
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleReply(inq)}
                              className="gap-2"
                            >
                              <Mail className="h-3.5 w-3.5" /> Reply
                            </Button>
                            {inq.status !== "replied" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMarkAsReplied(inq.id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Mark replied
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LISTINGS TAB ── */}
        <TabsContent value="listings" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>My Properties</CardTitle>
              <CardDescription>Manage your property listings</CardDescription>
            </CardHeader>
            <CardContent>
              {myProps.isLoading ? (
                <div className="flex justify-center py-20">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : props.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No listings yet.</p>
                  <p className="text-sm mt-1">Use the "Add Property" tab to post your first listing.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Property</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3 hidden md:table-cell">Type</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 hidden lg:table-cell">Views</th>
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
                          <td className="px-4 py-3 capitalize hidden md:table-cell">{p.property_type}</td>
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
                          <td className="px-4 py-3 hidden lg:table-cell">{p.views ?? 0}</td>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ADD PROPERTY TAB ── */}
        <TabsContent value="add" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>New Property Listing</CardTitle>
              <CardDescription>Add a new property to your portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input placeholder="e.g. 3-Bedroom Flat, Lekki Phase 1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Price (₦) *</Label>
                  <Input type="number" min="0" placeholder="e.g. 85000000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Property type</Label>
                  <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v as PropertyType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Listing type</Label>
                  <Select value={form.listing_type} onValueChange={(v) => setForm({ ...form, listing_type: v as ListingType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">For sale</SelectItem>
                      <SelectItem value="rent">For rent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bedrooms</Label>
                  <Input type="number" min="0" placeholder="e.g. 3" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Bathrooms</Label>
                  <Input type="number" min="0" step="0.5" placeholder="e.g. 2" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Area (sqft)</Label>
                  <Input type="number" min="0" placeholder="e.g. 2200" value={form.area_sqft} onChange={(e) => setForm({ ...form, area_sqft: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input placeholder="e.g. 14 Admiralty Way" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input placeholder="e.g. Lekki" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input placeholder="e.g. Lagos" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to {selectedInquiry?.user?.full_name || "Buyer"}</DialogTitle>
            <DialogDescription>
              Respond to inquiry about "{selectedInquiry?.property?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/30 p-3 text-sm">
              <p className="font-semibold mb-1">Original message:</p>
              <p className="text-muted-foreground">"{selectedInquiry?.message}"</p>
            </div>
            <div className="space-y-2">
              <Label>Your reply</Label>
              <Textarea
                placeholder="Type your response here..."
                rows={5}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendReply} className="gap-2">
              <Mail className="h-4 w-4" /> Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InquiryStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unread: "bg-destructive/15 text-destructive border-destructive/30",
    read: "bg-muted text-muted-foreground",
    replied: "bg-success/15 text-success border-success/30",
  };
  return (
    <Badge variant="outline" className={styles[status] || "bg-muted"}>
      {status}
    </Badge>
  );
}
