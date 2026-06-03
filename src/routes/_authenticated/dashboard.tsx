import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart, Inbox, User as UserIcon, Settings, Home, ArrowRight,
  TrendingUp, Building2, ChevronRight, Plus, Phone, Mail,
  Star, Loader2, Save, CheckCircle2, Clock, Send, ReplyAll, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useSavedProperties } from "@/hooks/useFavorites";
import { useInquiries, useUpdateInquiryStatus, useSendReply } from "@/hooks/useInquiries";
import { PropertyGrid } from "@/components/property/PropertyGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDate, truncate } from "@/lib/format";

interface Search { tab?: string }

export const Route = createFileRoute("/_authenticated/dashboard")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, profile, role, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const sp = Route.useSearch();
  const [tab, setTab] = useState(sp.tab ?? "overview");
  const saved = useSavedProperties();
  const inquiries = useInquiries({ scope: "user" });
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [conversationReplies, setConversationReplies] = useState<any[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const sendReply = useSendReply();

  useEffect(() => {
    if (loading) return;
    if (role === "admin") {
      navigate({ to: "/admin/dashboard" });
    } else if (role === "agent") {
      navigate({ to: "/agent" });
    }
  }, [role, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role === "admin" || role === "agent") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const unreadCount = (inquiries.data ?? []).filter((i) => i.status === "unread").length;
  const displayName = profile?.full_name ? profile.full_name.split(" ")[0] : "there";
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email ?? "U").slice(0, 2).toUpperCase();

  const isPendingAgent = role === "pending_agent";

  const handleOpenConversation = async (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setLoadingReplies(true);
    setReplyDialogOpen(true);
    
    if (!supabase) {
      toast.error("Database connection not available");
      setLoadingReplies(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("inquiries")
        .select(`
          *,
          user:users!inquiries_user_id_fkey(id, full_name, email, role),
          agent:users!inquiries_agent_id_fkey(id, full_name, email, role)
        `)
        .or(`id.eq.${inquiry.id},parent_inquiry_id.eq.${inquiry.id}`)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      setConversationReplies(data || []);
      
      if (inquiry.status === "unread" && supabase) {
        const { error: updateError } = await supabase
          .from("inquiries")
          .update({ status: "read" })
          .eq("id", inquiry.id);
        if (!updateError) {
          inquiries.refetch();
        }
      }
    } catch (error) {
      console.error("Error fetching replies:", error);
      toast.error("Could not load conversation");
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedInquiry) return;
    
    sendReply.mutate({
      parentInquiryId: selectedInquiry.id,
      propertyId: selectedInquiry.property_id,
      agentId: selectedInquiry.agent_id,
      message: replyMessage.trim()
    }, {
      onSuccess: () => {
        toast.success("Reply sent!");
        setReplyMessage("");
        handleOpenConversation(selectedInquiry);
        inquiries.refetch();
      },
      onError: (error: Error) => {
        toast.error(error.message);
      }
    });
  };

  const TABS = [
    { value: "overview", icon: <Home className="h-4 w-4" />, label: "Overview" },
    { value: "saved", icon: <Heart className="h-4 w-4" />, label: "Saved", count: saved.data?.length },
    { value: "inquiries", icon: <Inbox className="h-4 w-4" />, label: "Inquiries", count: unreadCount || undefined },
    { value: "profile", icon: <Settings className="h-4 w-4" />, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-lg font-bold shrink-0">
                {initials}
              </div>
              <div>
                <p className="text-sm text-primary-foreground/60 mb-0.5">Welcome back,</p>
                <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  {displayName}
                </h1>
                {isPendingAgent && (
                  <p className="text-xs text-yellow-300 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Agent application pending admin approval
                  </p>
                )}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {!isPendingAgent && (
                <Button variant="secondary" size="sm" className="gap-2" onClick={() => navigate({ to: "/agent" })}>
                  <Plus className="h-3.5 w-3.5" /> List Property
                </Button>
              )}
              <Link to="/properties">
                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-2">
                  <Building2 className="h-3.5 w-3.5" /> Browse
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1 bg-card border rounded-2xl p-1.5 shadow-sm">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="relative gap-2 rounded-xl data-[state=active]:shadow-sm"
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label}</span>
                {t.count != null && t.count > 0 && (
                  <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {t.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <StatCard
                label="Saved Properties"
                value={saved.data?.length ?? 0}
                icon={<Heart className="h-5 w-5" />}
                sub="Properties you loved"
                color="text-rose-500 bg-rose-50 dark:bg-rose-950"
                onClick={() => setTab("saved")}
              />
              <StatCard
                label="Inquiries Sent"
                value={inquiries.data?.length ?? 0}
                icon={<Inbox className="h-5 w-5" />}
                sub={unreadCount > 0 ? `${unreadCount} with new replies` : "All caught up"}
                color="text-blue-500 bg-blue-50 dark:bg-blue-950"
                onClick={() => setTab("inquiries")}
              />
              <StatCard
                label="Account Type"
                value={isPendingAgent ? "pending_agent" : (role ?? "user")}
                icon={<UserIcon className="h-5 w-5" />}
                sub={isPendingAgent ? "Awaiting approval" : "Active member"}
                color="text-primary bg-primary/10"
                onClick={() => setTab("profile")}
                capitalize
              />
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Recently saved</h2>
                  <button onClick={() => setTab("saved")} className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all">
                    View all <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                {(saved.data ?? []).length === 0 && !saved.isLoading ? (
                  <div className="rounded-2xl border bg-card p-8 text-center">
                    <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="font-medium text-muted-foreground mb-4">No saved properties yet</p>
                    <Button size="sm" variant="outline" onClick={() => navigate({ to: "/properties" })}>
                      Browse properties
                    </Button>
                  </div>
                ) : (
                  <PropertyGrid properties={(saved.data ?? []).slice(0, 3)} loading={saved.isLoading} />
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold">Recent Inquiries</h2>
                  </div>
                  <div className="rounded-2xl border bg-card divide-y overflow-hidden">
                    {(inquiries.data ?? []).length === 0 ? (
                      <div className="p-5 text-center">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">No inquiries yet</p>
                      </div>
                    ) : (
                      (inquiries.data ?? []).slice(0, 4).map((inq) => (
                        <div 
                          key={inq.id} 
                          className="p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => handleOpenConversation(inq)}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Inbox className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{(inq.property as { title?: string } | null)?.title ?? "Property inquiry"}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{truncate(inq.message, 40)}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <InquiryBadge status={inq.status} />
                                <span className="text-xs text-muted-foreground">{formatDate(inq.created_at)}</span>
                              </div>
                            </div>
                            <ReplyAll className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </div>
                      ))
                    )}
                    {(inquiries.data ?? []).length > 4 && (
                      <button onClick={() => setTab("inquiries")} className="w-full p-3 text-sm text-primary hover:bg-muted/30 transition-colors flex items-center justify-center gap-1">
                        View all <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Quick Links</p>
                  {[
                    { label: "Browse all properties", icon: <Building2 className="h-4 w-4" />, action: () => navigate({ to: "/properties" }) },
                    { label: "Saved favourites", icon: <Heart className="h-4 w-4" />, action: () => setTab("saved") },
                    { label: "Update profile", icon: <UserIcon className="h-4 w-4" />, action: () => setTab("profile") },
                  ].map((link, i) => (
                    <button
                      key={i}
                      onClick={link.action}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/50 text-left transition-colors"
                    >
                      <span className="text-primary">{link.icon}</span>
                      {link.label}
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── SAVED ── */}
          <TabsContent value="saved" className="mt-0">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Saved Properties</h2>
              <Badge variant="secondary">{saved.data?.length ?? 0} properties</Badge>
            </div>
            {saved.isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (saved.data ?? []).length === 0 ? (
              <EmptyState
                icon={<Heart className="h-6 w-6 text-muted-foreground" />}
                title="No saved properties"
                description="Tap the heart on any listing to save it here."
              />
            ) : (
              <PropertyGrid properties={saved.data ?? []} loading={false} />
            )}
          </TabsContent>

          {/* ── INQUIRIES TAB ── */}
          <TabsContent value="inquiries" className="mt-0">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">My Inquiries & Conversations</h2>
              <Badge variant="secondary">{inquiries.data?.length ?? 0} total</Badge>
            </div>
            {inquiries.isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (inquiries.data ?? []).length === 0 ? (
              <EmptyState
                icon={<Inbox className="h-6 w-6 text-muted-foreground" />}
                title="No inquiries yet"
                description="Reach out to agents from any property page."
              />
            ) : (
              <div className="space-y-4">
                {(inquiries.data ?? []).map((inq) => (
                  <InquiryCard 
                    key={inq.id} 
                    inquiry={inq} 
                    onOpenConversation={() => handleOpenConversation(inq)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── PROFILE ── */}
          <TabsContent value="profile" className="mt-0">
            <ProfileForm user={user} profile={profile} role={role} onSaved={refreshProfile} isPendingAgent={isPendingAgent} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Conversation Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation with Agent
            </DialogTitle>
            <DialogDescription>
              {selectedInquiry?.property?.title && (
                <span>About: {selectedInquiry.property.title}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            {loadingReplies ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : conversationReplies.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {conversationReplies.map((msg, idx) => {
                  const isUser = msg.user_id === user?.id;
                  const senderName = isUser ? "You" : (msg.agent?.full_name || "Agent");
                  
                  return (
                    <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {senderName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                        <div className={`rounded-2xl px-4 py-2 ${
                          isUser 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        }`}>
                          <p className="text-sm break-words">{msg.message}</p>
                        </div>
                        {idx === 0 && !isUser && msg.status === "replied" && (
                          <p className="text-xs text-green-600 mt-1">✓ Agent has responded</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          
          <div className="border-t pt-4 mt-4">
            <div className="space-y-2">
              <Label>Your Reply</Label>
              <Textarea
                placeholder="Type your message here..."
                rows={3}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReplyDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendReply} disabled={!replyMessage.trim() || sendReply.isPending} className="gap-2">
                  {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inquiry Card Component
function InquiryCard({ inquiry, onOpenConversation }: { inquiry: any; onOpenConversation: () => void }) {
  const property = inquiry.property as { id?: string; title?: string; city?: string; images?: string[] } | null;
  const isReplied = inquiry.status === "replied" || inquiry.has_agent_reply;
  
  return (
    <div className="rounded-2xl border bg-card overflow-hidden hover:shadow-md transition-all">
      <div className="p-4">
        <div className="flex gap-4">
          {property?.images && property.images[0] && (
            <img src={property.images[0]} alt="" className="h-16 w-20 rounded-lg object-cover shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <Link 
                  to="/property/$id" 
                  params={{ id: property?.id || "" }}
                  className="font-semibold hover:underline"
                >
                  {property?.title || "Unknown Property"}
                </Link>
                {property?.city && (
                  <span className="text-xs text-muted-foreground ml-2">{property.city}</span>
                )}
              </div>
              <InquiryBadge status={isReplied ? "replied" : inquiry.status} />
            </div>
            
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {inquiry.message}
            </p>
            
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-muted-foreground">
                Sent {formatDate(inquiry.created_at)}
              </div>
              <Button 
                size="sm" 
                variant={isReplied ? "outline" : "default"}
                className="gap-2"
                onClick={onOpenConversation}
              >
                {isReplied ? (
                  <><MessageSquare className="h-3.5 w-3.5" /> View Conversation</>
                ) : (
                  <><ReplyAll className="h-3.5 w-3.5" /> Reply to Agent</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Form Component
function ProfileForm({
  user, profile, role, onSaved, isPendingAgent,
}: {
  user: any;
  profile: any;
  role: string;
  onSaved: () => Promise<void>;
  isPendingAgent: boolean;
}) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [company, setCompany] = useState(profile?.company_name ?? "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setCompany(profile?.company_name ?? "");
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Not signed in");

    setLoading(true);
    try {
      if (!isSupabaseConfigured || !supabase) {
        await new Promise((r) => setTimeout(r, 500));
        toast.success("Profile saved! (mock mode)");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setLoading(false);
        return;
      }

      const updateData: Record<string, string> = {
        full_name: fullName.trim(),
        phone: phone.trim(),
      };
      if (role === "agent" && !isPendingAgent) {
        updateData.company_name = company.trim();
      }

      const { error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile saved successfully!");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <form className="md:col-span-2 rounded-2xl border bg-card p-6 space-y-5" onSubmit={handleSave}>
        <h3 className="font-semibold text-lg">Personal Information</h3>

        {isPendingAgent && (
          <div className="rounded-lg bg-yellow-500/15 border border-yellow-500/30 p-4">
            <p className="text-sm font-medium text-yellow-600 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Agent Application Pending
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your application to become an agent is being reviewed by an administrator. 
              You will be notified once a decision is made.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value.slice(0, 100))}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.slice(0, 40))}
              placeholder="+234 800 000 0000"
            />
          </div>
        </div>

        {(role === "agent" && !isPendingAgent) && (
          <div className="space-y-2">
            <Label htmlFor="company">Company / Agency name</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value.slice(0, 100))}
              placeholder="e.g. Okafor Realty Group"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" value={user?.email ?? ""} disabled className="bg-muted/50 cursor-not-allowed" />
          <p className="text-xs text-muted-foreground">Email is managed through your account settings.</p>
        </div>

        <div className="pt-1">
          <Button type="submit" disabled={loading || saved} className="gap-2 min-w-32">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : saved ? (
              <><CheckCircle2 className="h-4 w-4" /> Saved!</>
            ) : (
              <><Save className="h-4 w-4" /> Save changes</>
            )}
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">Account Details</h3>
          <div className="space-y-3">
            <InfoRow icon={<UserIcon className="h-4 w-4 text-primary" />} label="Account type" value={<span className="capitalize font-medium">{isPendingAgent ? "Pending Agent" : role}</span>} />
            <InfoRow icon={<CheckCircle2 className="h-4 w-4 text-success" />} label="Status" value={<span className="text-success font-medium">Active</span>} />
            {profile?.phone && <InfoRow icon={<Phone className="h-4 w-4 text-accent" />} label="Phone" value={profile.phone} />}
            {user?.email && <InfoRow icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="Email" value={user.email} />}
          </div>
        </div>

        {!isPendingAgent && role !== "agent" && (
          <div className="rounded-2xl border bg-primary/5 border-primary/20 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-4 w-4 text-accent" />
              <h3 className="font-semibold text-sm">Want to list properties?</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Apply to become an agent to list properties, manage inquiries, and grow your business.
            </p>
            <Link to="/agent">
              <Button size="sm" variant="outline" className="w-full gap-2">
                <Plus className="h-3.5 w-3.5" />
                Apply to become an Agent
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  label, value, icon, sub, color, onClick, capitalize,
}: {
  label: string; value: string | number; icon: React.ReactNode;
  sub: string; color: string; onClick?: () => void; capitalize?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border bg-card p-5 text-left hover:shadow-md transition-all group w-full"
    >
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${color}`}>
        {icon}
      </div>
      <div className={`text-2xl font-bold mb-0.5 ${capitalize ? "capitalize" : ""}`}>{value}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
    </button>
  );
}

function InquiryBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    unread: "bg-yellow-500/15 text-yellow-700",
    read: "bg-muted text-muted-foreground",
    replied: "bg-green-500/15 text-green-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status] ?? "bg-muted"}`}>
      {status === "replied" ? "Has Reply" : status}
    </span>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}
