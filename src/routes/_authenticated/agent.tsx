import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { 
  Pencil, Inbox, Plus, Trash2, Eye, BarChart2, Building2, ArrowRight, 
  Mail, Phone, CheckCircle2, Send, Loader2, ReplyAll
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useCreateProperty, useProperties, useDeleteProperty } from "@/hooks/useProperties";
import { useInquiries, useUpdateInquiryStatus } from "@/hooks/useInquiries";
import { useCreateConversation, useMessages } from "@/hooks/useMessages";
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
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const create = useCreateProperty();
  const del = useDeleteProperty();
  const updateInquiry = useUpdateInquiryStatus();
  const myProps = useProperties({ agentId: user?.id, status: "all" });
  const inquiries = useInquiries({ scope: "agent" });
  const createConversation = useCreateConversation();

  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState<string[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const unread = (inquiries.data ?? []).filter((i: any) => i.status === "unread").length;

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

  const handleOpenChat = async (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setReplyMessage("");
    setChatMessages([]);
    setChatLoading(true);
    
    // Create or get conversation
    try {
      const convId = await createConversation.mutateAsync({
        propertyId: inquiry.property_id,
        agentId: user?.id || "",
        initialMessage: inquiry.message
      });
      setConversationId(convId);
      
      // Mark inquiry as read when opening chat
      if (inquiry.status === "unread") {
        await updateInquiry.mutateAsync({ id: inquiry.id, status: "read" });
      }
    } catch (err) {
      console.error("Error creating conversation:", err);
    } finally {
      setChatLoading(false);
    }
    
    setReplyDialogOpen(true);
  };

  const handleSendReply = async () => {
  if (!replyMessage.trim() || !conversationId || !selectedInquiry) return;
  
  try {
    // Dynamic import to ensure supabase is available
    const { supabase } = await import("@/integrations/supabase/client");
    
    // Check if supabase is configured
    if (!supabase) {
      toast.error("Database connection not available");
      return;
    }
    
    // Send message through the conversation system
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user?.id,
      receiver_id: selectedInquiry.user_id,
      message: replyMessage.trim(),
      is_read: false,
    });
    
    if (error) throw error;
    
    // Update inquiry status to replied
    await updateInquiry.mutateAsync({ id: selectedInquiry.id, status: "replied" });
    
    toast.success("Reply sent!");
    setReplyMessage("");
    setReplyDialogOpen(false);
  } catch (error) {
    console.error("Error sending reply:", error);
    toast.error("Failed to send reply");
  }
};
  const props = myProps.data ?? [];
  const approved = props.filter((p) => p.status === "approved").length;
  const pending = props.filter((p) => p.status === "pending").length;
  const totalViews = props.reduce((s, p) => s + (p.views ?? 0), 0);
  const inquiryItems = inquiries.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agent Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and respond to buyer inquiries.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total listings", value: props.length, icon: <Building2 className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
          { label: "Live listings", value: approved, icon: <Eye className="h-4 w-4" />, color: "bg-success/10 text-success" },
          { label: "Pending", value: pending, icon: <Plus className="h-4 w-4" />, color: "bg-warning/10 text-warning-foreground" },
          { label: "Inquiries", value: unread, icon: <Inbox className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4">
            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${s.color} mb-2`}>{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="inquiries" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="inquiries" className="gap-2">
            <Inbox className="h-4 w-4" /> Inquiries
            {unread > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">{unread}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-2">
            <Building2 className="h-4 w-4" /> My Listings ({props.length})
          </TabsTrigger>
        </TabsList>

        {/* INQUIRIES TAB - Now with chat functionality */}
        <TabsContent value="inquiries" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Buyer Inquiries</CardTitle>
              <CardDescription>View and respond to messages from potential buyers</CardDescription>
            </CardHeader>
            <CardContent>
              {inquiries.isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : inquiryItems.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <Inbox className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No inquiries yet</p>
                  <p className="text-sm mt-1">When buyers message you, they'll appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {inquiryItems.map((inq: any) => {
                    const property = inq.property;
                    const sender = inq.user;
                    
                    return (
                      <div key={inq.id} className={`rounded-lg border p-4 transition-all ${
                        inq.status === "unread" ? "border-primary/50 bg-primary/5 shadow-sm" : "bg-card"
                      }`}>
                        <div className="flex flex-wrap gap-4">
                          {property?.images?.[0] && (
                            <img src={property.images[0]} alt="" className="h-20 w-24 rounded-lg object-cover shrink-0" />
                          )}
                          
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <Link to="/property/$id" params={{ id: property?.id }} className="font-semibold hover:underline">
                                  {property?.title || "Unknown Property"}
                                </Link>
                                {property?.city && <span className="text-xs text-muted-foreground ml-2">{property.city}</span>}
                              </div>
                              <InquiryStatusBadge status={inq.status} />
                            </div>
                            
                            <div className="bg-muted/30 rounded-lg p-3">
                              <p className="text-sm font-medium text-muted-foreground mb-1">Buyer's message:</p>
                              <p className="text-sm">"{inq.message}"</p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              <span className="font-medium">{sender?.full_name || "Anonymous"}</span>
                              {sender?.email && <a href={`mailto:${sender.email}`} className="flex items-center gap-1 text-primary hover:underline"><Mail className="h-3 w-3" /> {sender.email}</a>}
                              {sender?.phone && <a href={`tel:${sender.phone}`} className="flex items-center gap-1"><Phone className="h-3 w-3" /> {sender.phone}</a>}
                              <span className="text-muted-foreground">{formatDate(inq.created_at)}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {inq.status === "unread" && (
                              <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(inq.id)}>Mark as read</Button>
                            )}
                            <Button size="sm" onClick={() => handleOpenChat(inq)} className="gap-2">
                              <ReplyAll className="h-3.5 w-3.5" /> Reply
                            </Button>
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
                  <Button className="mt-4" onClick={() => document.querySelector('[value="add"]')?.dispatchEvent(new Event('click'))}>
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
      </Tabs>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to {selectedInquiry?.user?.full_name || "Buyer"}</DialogTitle>
            <DialogDescription>Respond to inquiry about "{selectedInquiry?.property?.title}"</DialogDescription>
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
            <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendReply} disabled={!replyMessage.trim() || chatLoading} className="gap-2">
              {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InquiryStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unread: "bg-destructive/15 text-destructive",
    read: "bg-muted text-muted-foreground",
    replied: "bg-success/15 text-success",
  };
  return <Badge variant="outline" className={styles[status] || "bg-muted"}>{status}</Badge>;
}
