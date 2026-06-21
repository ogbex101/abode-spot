import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { 
  Pencil, Inbox, Plus, Trash2, Eye, Building2,
  Loader2, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useCreateProperty, useProperties, useDeleteProperty } from "@/hooks/useProperties";
import { useConversations, type Conversation } from "@/hooks/useMessages";
import { PROPERTY_TYPES } from "@/lib/constants";
import { ImageUpload } from "@/components/property/ImageUpload";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
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
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const create = useCreateProperty();
  const del = useDeleteProperty();
  const myProps = useProperties({ agentId: user?.id, status: "all" });
  const conversations = useConversations();

  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("messages");

  if (role !== "agent" && role !== "admin") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">List your property on AbodeSpot</h1>
        <p className="mt-4 text-muted-foreground">Want to sell or rent out a property? Create an Agent account.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => navigate({ to: "/register" })}>Sign up as an Agent</Button>
          <Button size="lg" variant="outline" onClick={() => navigate({ to: "/properties" })}>Browse listings</Button>
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
      setActiveTab("listings");
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not submit this property. Please try again."));
    }
  };

  const props = myProps.data ?? [];
  const approved = props.filter((p) => p.status === "approved").length;
  const pending = props.filter((p) => p.status === "pending").length;
  const conversationItems = conversations.data ?? [];
  const unreadMessages = conversationItems.reduce((count, conversation) => count + conversation.unread_count, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agent Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and reply from shared chat rooms.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total listings", value: props.length, icon: <Building2 className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
          { label: "Live listings", value: approved, icon: <Eye className="h-4 w-4" />, color: "bg-success/10 text-success" },
          { label: "Pending", value: pending, icon: <Plus className="h-4 w-4" />, color: "bg-warning/10 text-warning-foreground" },
          { label: "Unread messages", value: unreadMessages, icon: <Inbox className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${s.color} mb-2`}>{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 p-1 sm:grid-cols-3 lg:w-[680px]">
          <TabsTrigger value="messages" className="min-h-10 gap-2 px-3 text-xs leading-tight sm:text-sm">
            <Inbox className="h-4 w-4" /> Messages
            {unreadMessages > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 rounded-full px-1 text-xs">{unreadMessages}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="listings" className="min-h-10 gap-2 whitespace-normal px-3 text-center text-xs leading-tight sm:text-sm">
            <Building2 className="h-4 w-4" /> My Listings ({props.length})
          </TabsTrigger>
          <TabsTrigger value="add" className="min-h-10 gap-2 px-3 text-xs leading-tight sm:text-sm">
            <Plus className="h-4 w-4" /> Add Property
          </TabsTrigger>
        </TabsList>

        {/* MESSAGES TAB */}
        <TabsContent value="messages" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Chat Rooms</CardTitle>
              <CardDescription>Reply to buyers and other agents in the shared messages screen.</CardDescription>
            </CardHeader>
            <CardContent>
              {conversations.isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : conversationItems.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Inbox className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No chat rooms yet</p>
                  <p className="text-sm mt-1">When buyers or agents message you, rooms will appear here.</p>
                  <Button className="mt-4 gap-2" onClick={() => navigate({ to: "/messages" })}>
                    <MessageSquare className="h-4 w-4" />
                    Open Messages
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversationItems.map((conversation) => (
                    <AgentConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      onOpen={() => navigate({ to: "/messages", search: { conversation: conversation.id } })}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LISTINGS TAB */}
        <TabsContent value="listings" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>My Properties</CardTitle>
              <CardDescription>Manage your property listings</CardDescription>
            </CardHeader>
            <CardContent>
              {myProps.isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : props.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No listings yet.</p>
                  <Button className="mt-4" onClick={() => setActiveTab("add")}>
                    Add Your First Property
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase">
                      <tr><th className="px-4 py-3">Property</th><th className="px-4 py-3">Price</th><th className="px-4 py-3 hidden md:table-cell">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                    </thead>
                    <tbody>
                      {props.map((p) => (
                        <tr key={p.id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {p.images[0] ? <img src={p.images[0]} alt="" className="h-10 w-14 rounded-lg object-cover" /> : <div className="h-10 w-14 rounded-lg bg-muted" />}
                              <div><Link to="/property/$id" params={{ id: p.id }} className="font-medium hover:underline">{p.title}</Link><div className="text-xs text-muted-foreground">{p.city}</div></div>
                            </div>
                          </td>
                          <td className="px-4 py-3">{formatPrice(p.price, p.listing_type)}</td>
                          <td className="px-4 py-3 capitalize hidden md:table-cell">{p.property_type}</td>
                          <td className="px-4 py-3"><Badge className={p.status === "approved" ? "bg-success/15 text-success" : "bg-warning/15"}>{p.status}</Badge></td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Link to="/agent/edit/$id" params={{ id: p.id }}><Button size="sm" variant="outline"><Pencil className="h-3 w-3" /></Button></Link>
                              <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { if (confirm("Delete?")) await del.mutateAsync(p.id); }}><Trash2 className="h-3 w-3" /></Button>
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

        {/* ADD PROPERTY TAB */}
        <TabsContent value="add" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Add Property</CardTitle>
              <CardDescription>Submit a new listing for admin approval</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="agent-title">Title *</Label>
                    <Input
                      id="agent-title"
                      required
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. Modern 3-Bedroom Apartment in Lekki"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-property-type">Property Type *</Label>
                    <Select value={form.property_type} onValueChange={(v) => setForm((f) => ({ ...f, property_type: v as PropertyType }))}>
                      <SelectTrigger id="agent-property-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-listing-type">Listing Type *</Label>
                    <Select value={form.listing_type} onValueChange={(v) => setForm((f) => ({ ...f, listing_type: v as ListingType }))}>
                      <SelectTrigger id="agent-listing-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">For Sale</SelectItem>
                        <SelectItem value="rent">For Rent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-price">Price *</Label>
                    <Input
                      id="agent-price"
                      type="number"
                      min="0"
                      required
                      value={form.price}
                      onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="e.g. 85000000"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="agent-bedrooms">Bedrooms</Label>
                      <Input
                        id="agent-bedrooms"
                        type="number"
                        min="0"
                        max="50"
                        value={form.bedrooms}
                        onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agent-bathrooms">Bathrooms</Label>
                      <Input
                        id="agent-bathrooms"
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={form.bathrooms}
                        onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="agent-area">Area</Label>
                      <Input
                        id="agent-area"
                        type="number"
                        min="0"
                        value={form.area_sqft}
                        onChange={(e) => setForm((f) => ({ ...f, area_sqft: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="agent-description">Description</Label>
                    <Textarea
                      id="agent-description"
                      rows={4}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
                      placeholder="Describe the property, condition, nearby landmarks, and key selling points."
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="agent-address">Address</Label>
                    <Input
                      id="agent-address"
                      value={form.address}
                      onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-city">City</Label>
                    <Input
                      id="agent-city"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agent-state">State</Label>
                    <Input
                      id="agent-state"
                      value={form.state}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Images</Label>
                    <p className="text-xs text-muted-foreground">Optional, but better listings should include at least one real photo.</p>
                  </div>
                  <ImageUpload value={images} onChange={setImages} pathPrefix={user?.id ?? "agent"} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={create.isPending}>
                    {create.isPending ? "Submitting..." : "Submit Property"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setForm(EMPTY_FORM);
                      setImages([]);
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AgentConversationCard({ conversation, onOpen }: { conversation: Conversation; onOpen: () => void }) {
  const property = conversation.property;
  const otherUser = conversation.other_user;

  return (
    <div className="rounded-lg border bg-card p-4 transition-all hover:bg-muted/30">
      <div className="flex flex-wrap gap-4">
        {property?.images?.[0] && (
          <img src={property.images[0]} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover" />
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{otherUser?.full_name || otherUser?.email || "Chat room"}</p>
              {property?.title && (
                <Link to="/property/$id" params={{ id: property.id }} className="text-xs text-primary hover:underline">
                  {property.title}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              {conversation.unread_count > 0 && <Badge>{conversation.unread_count} unread</Badge>}
              <Badge variant="outline">{conversation.conversation_type === "property" ? "Property" : "Direct"}</Badge>
            </div>
          </div>

          <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
            {conversation.last_message || "No messages yet"}
          </p>
        </div>

        <div className="flex flex-col justify-center gap-2">
          <Button size="sm" onClick={onOpen} className="gap-2">
            <MessageSquare className="h-3.5 w-3.5" /> Open Chat
          </Button>
        </div>
      </div>
    </div>
  );
}
