import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart, Inbox, User as UserIcon, Settings, Home, ArrowRight,
  Bell, TrendingUp, Eye, Star, MapPin, Building2, Phone, ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSavedProperties } from "@/hooks/useFavorites";
import { useInquiries } from "@/hooks/useInquiries";
import { PropertyGrid } from "@/components/property/PropertyGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
  const { user, profile, role, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const sp = Route.useSearch();
  const [tab, setTab] = useState(sp.tab ?? "overview");
  const saved = useSavedProperties();
  const inquiries = useInquiries({ scope: "user" });

  useEffect(() => {
    if (role === "admin") navigate({ to: "/admin/dashboard" });
  }, [role, navigate]);

  const unreadCount = (inquiries.data ?? []).filter((i) => i.status === "unread").length;
  const displayName = profile?.full_name ? profile.full_name.split(" ")[0] : "there";
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header banner */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-lg font-bold">
                {initials}
              </div>
              <div>
                <p className="text-sm text-primary-foreground/60 mb-0.5">Welcome back,</p>
                <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                  {displayName}! 👋
                </h1>
                <p className="text-sm text-primary-foreground/60 mt-0.5">{user?.email}</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              {unreadCount > 0 && (
                <div className="flex items-center gap-2 bg-white/15 rounded-full px-4 py-2 text-sm">
                  <Bell className="h-4 w-4" />
                  <span>{unreadCount} new message{unreadCount > 1 ? "s" : ""}</span>
                </div>
              )}
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => navigate({ to: "/properties" })}>
                <Building2 className="h-4 w-4" /> Browse properties
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-8 h-auto bg-transparent p-0 gap-1 flex flex-wrap">
            {[
              { value: "overview", icon: <Home className="h-4 w-4" />, label: "Overview" },
              { value: "saved", icon: <Heart className="h-4 w-4" />, label: "Saved", count: saved.data?.length },
              { value: "inquiries", icon: <Inbox className="h-4 w-4" />, label: "Inquiries", count: unreadCount, accent: true },
              { value: "profile", icon: <Settings className="h-4 w-4" />, label: "Profile" },
            ].map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="relative gap-2 rounded-xl px-5 py-2.5 text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:text-primary border border-transparent data-[state=active]:border-border"
              >
                {t.icon} {t.label}
                {(t.count ?? 0) > 0 && (
                  <span className={`inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold ml-0.5 ${t.accent ? "bg-destructive text-destructive-foreground" : "bg-primary/15 text-primary"}`}>
                    {t.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid gap-4 sm:grid-cols-3 mb-8">
              <StatCard
                label="Saved Properties"
                value={saved.data?.length ?? 0}
                icon={<Heart className="h-5 w-5" />}
                sub="Properties you loved"
                color="text-rose-500 bg-rose-50"
                onClick={() => setTab("saved")}
              />
              <StatCard
                label="Inquiries Sent"
                value={inquiries.data?.length ?? 0}
                icon={<Inbox className="h-5 w-5" />}
                sub={`${unreadCount} awaiting reply`}
                color="text-blue-500 bg-blue-50"
                onClick={() => setTab("inquiries")}
              />
              <StatCard
                label="Account Type"
                value={role ?? "user"}
                icon={<UserIcon className="h-5 w-5" />}
                sub="Verified member"
                color="text-primary bg-primary/10"
                onClick={() => setTab("profile")}
                capitalize
              />
            </div>

            {/* Activity feed */}
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
                    <Heart className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="font-medium text-muted-foreground mb-4">No saved properties yet</p>
                    <Button size="sm" variant="outline" onClick={() => navigate({ to: "/properties" })}>
                      Browse properties
                    </Button>
                  </div>
                ) : (
                  <PropertyGrid
                    properties={(saved.data ?? []).slice(0, 3)}
                    loading={saved.isLoading}
                  />
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Recent activity</h2>
                </div>
                <div className="rounded-2xl border bg-card divide-y overflow-hidden">
                  {(inquiries.data ?? []).slice(0, 4).length === 0 ? (
                    <div className="p-6 text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">Your activity will appear here</p>
                    </div>
                  ) : (
                    (inquiries.data ?? []).slice(0, 4).map((inq) => (
                      <div key={inq.id} className="p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Inbox className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{inq.property?.title ?? "Property inquiry"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{truncate(inq.message, 40)}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <InquiryBadge status={inq.status} />
                              <span className="text-xs text-muted-foreground">{formatDate(inq.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {(inquiries.data ?? []).length > 4 && (
                    <button onClick={() => setTab("inquiries")} className="w-full p-3 text-sm text-primary hover:bg-muted/30 transition-colors flex items-center justify-center gap-1">
                      View all inquiries <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Quick links */}
                <div className="mt-4 rounded-2xl border bg-card p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Quick Links</p>
                  {[
                    { label: "Browse all properties", icon: <Building2 className="h-4 w-4" />, to: "/properties" },
                    { label: "Saved favourites", icon: <Heart className="h-4 w-4" />, to: "/dashboard", tab: "saved" },
                    { label: "Update profile", icon: <UserIcon className="h-4 w-4" />, to: "/dashboard", tab: "profile" },
                  ].map((link, i) => (
                    <button
                      key={i}
                      onClick={() => link.tab ? setTab(link.tab) : navigate({ to: link.to as "/" })}
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

          {/* Saved */}
          <TabsContent value="saved" className="mt-0">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">Saved Properties</h2>
              <Badge variant="secondary">{saved.data?.length ?? 0} properties</Badge>
            </div>
            <PropertyGrid
              properties={saved.data ?? []}
              loading={saved.isLoading}
              emptyTitle="No saved properties"
              emptyDescription="Tap the heart on any listing to save it here."
            />
          </TabsContent>

          {/* Inquiries */}
          <TabsContent value="inquiries" className="mt-0">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">My Inquiries</h2>
              {unreadCount > 0 && <Badge className="bg-destructive text-destructive-foreground">{unreadCount} unread</Badge>}
            </div>
            {inquiries.isLoading ? (
              <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            ) : (inquiries.data ?? []).length === 0 ? (
              <EmptyState title="No inquiries yet" description="Reach out to agents from any property page." />
            ) : (
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="hidden md:grid grid-cols-[2fr_3fr_1fr_1fr] gap-4 px-5 py-3 bg-muted/50 text-xs uppercase text-muted-foreground font-semibold tracking-wide">
                  <span>Property</span><span>Message</span><span>Date</span><span>Status</span>
                </div>
                {(inquiries.data ?? []).map((inq) => (
                  <div key={inq.id} className="border-t px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="grid md:grid-cols-[2fr_3fr_1fr_1fr] gap-2 md:gap-4 items-start">
                      <div>
                        <p className="font-medium text-sm">{inq.property?.title ?? "—"}</p>
                        {inq.property?.city && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />{inq.property.city}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{truncate(inq.message, 80)}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(inq.created_at)}</p>
                      <InquiryBadge status={inq.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Profile */}
          <TabsContent value="profile" className="mt-0">
            <div className="mb-6">
              <h2 className="text-xl font-bold">My Profile</h2>
              <p className="text-muted-foreground text-sm mt-1">Manage your personal information</p>
            </div>
            <ProfileForm onSaved={refreshProfile} user={user} profile={profile} role={role} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


function StatCard({
  label, value, icon, sub, color, onClick, capitalize
}: {
  label: string; value: string | number; icon: React.ReactNode; sub?: string;
  color?: string; onClick?: () => void; capitalize?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border bg-card p-5 hover:shadow-md transition-all hover:-translate-y-0.5 group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${color ?? "bg-primary/10 text-primary"}`}>
          {icon}
        </div>
      </div>
      <div className={`text-3xl font-bold ${capitalize ? "capitalize" : ""}`}>{value}</div>
      {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </button>
  );
}

function InquiryBadge({ status }: { status: "unread" | "read" | "replied" }) {
  const map = {
    unread: "bg-warning/15 text-warning-foreground border-warning/30",
    read: "bg-muted text-muted-foreground border-border",
    replied: "bg-success/15 text-success border-success/30",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

function ProfileForm({ onSaved, user, profile, role }: {
  onSaved: () => void;
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof useAuth>["profile"];
  role: ReturnType<typeof useAuth>["role"];
}) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return toast.error("Not connected");
    setLoading(true);
    const { error } = await supabase
      .from("users")
      .update({ full_name: fullName.trim(), phone: phone.trim() })
      .eq("id", user.id);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Profile saved!");
    onSaved();
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <form className="md:col-span-2 space-y-5 rounded-2xl border bg-card p-6" onSubmit={save}>
        <h3 className="font-semibold mb-1">Personal Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value.slice(0, 100))} placeholder="Your full name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 40))} placeholder="+234 800 000 0000" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" value={user?.email ?? ""} disabled className="bg-muted/50" />
          <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
        </div>
        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? "Saving…" : "Save changes"}
        </Button>
      </form>

      {/* Account info sidebar */}
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">Account Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <UserIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Account type</p>
                <p className="text-sm font-medium capitalize">{role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Member status</p>
                <p className="text-sm font-medium text-success">Verified</p>
              </div>
            </div>
            {profile?.phone && (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{profile.phone}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">Preferences</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            More profile options like notification settings and saved searches are coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
