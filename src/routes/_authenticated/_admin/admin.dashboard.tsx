import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Inbox, Users, Eye, Star, Clock, TrendingUp, TrendingDown, ArrowRight, CheckCircle2, XCircle, UserCheck, UserX, Loader2, Mail, Phone, Briefcase } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import { useInquiries } from "@/hooks/useInquiries";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

export const Route = createFileRoute("/_authenticated/_admin/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  
  const all = useProperties({ status: "all" });
  const pending = useProperties({ status: "pending" });
  const featured = useProperties({ featured: true, status: "all" });
  const inquiries = useInquiries({ scope: "admin" });
  
  // Fetch pending agent applications
  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ["agent-applications"],
    queryFn: async () => {
      if (!isSupabaseConfigured || !supabase) return [];
      
      const { data, error } = await supabase
        .from("agent_applications")
        .select(`
          *,
          user:users(
            id, 
            email, 
            full_name, 
            phone,
            avatar_url,
            created_at
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isSupabaseConfigured,
  });

  // Approve agent mutation
  const approveAgent = useMutation({
    mutationFn: async ({ userId, applicationId }: { userId: string; applicationId: string }) => {
      if (!supabase) throw new Error("Supabase not configured");
      
      // Add agent role
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "agent" }, { onConflict: "user_id,role" });
      if (roleError) throw roleError;
      
      // Remove pending_agent role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "pending_agent");
      
      // Update users table
      const { error: userError } = await supabase
        .from("users")
        .update({ role: "agent", agent_status: "approved" })
        .eq("id", userId);
      if (userError) throw userError;
      
      // Update application
      const { error: appError } = await supabase
        .from("agent_applications")
        .update({ 
          status: "approved", 
          reviewed_at: new Date().toISOString(),
          admin_notes: "Approved"
        })
        .eq("id", applicationId);
      if (appError) throw appError;
      
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Agent approved successfully!");
      queryClient.invalidateQueries({ queryKey: ["agent-applications"] });
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve agent: ${error.message}`);
    },
  });

  // Reject agent mutation
  const rejectAgent = useMutation({
    mutationFn: async ({ userId, applicationId, reason }: { userId: string; applicationId: string; reason: string }) => {
      if (!supabase) throw new Error("Supabase not configured");
      
      // Update users table
      const { error: userError } = await supabase
        .from("users")
        .update({ agent_status: "rejected" })
        .eq("id", userId);
      if (userError) throw userError;
      
      // Update application
      const { error: appError } = await supabase
        .from("agent_applications")
        .update({ 
          status: "rejected", 
          reviewed_at: new Date().toISOString(),
          admin_notes: reason
        })
        .eq("id", applicationId);
      if (appError) throw appError;
      
      return { success: true };
    },
    onSuccess: () => {
      toast.success("Application rejected");
      queryClient.invalidateQueries({ queryKey: ["agent-applications"] });
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedApplication(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const props = all.data ?? [];
  const totalViews = props.reduce((s, p) => s + (p.views ?? 0), 0);
  const unread = (inquiries.data ?? []).filter((i) => i.status === "unread").length;
  const approved = props.filter((p) => p.status === "approved").length;
  const rejected = props.filter((p) => p.status === "rejected").length;
  const pendingCount = pending.data?.length ?? 0;
  const pendingAgents = applications?.length ?? 0;

  const byType = ["house", "apartment", "land", "commercial"].map((t) => ({
    name: t.charAt(0).toUpperCase() + t.slice(1),
    value: props.filter((p) => p.property_type === t).length,
  }));
  const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => ({
    name: m,
    listings: Math.max(1, Math.round((props.length / 6) * (1 + Math.sin(i)))),
    views: Math.max(10, Math.round((totalViews / 6) * (0.8 + Math.random() * 0.4))),
  }));

  const recentProps = [...props].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
  const recentInquiries = [...(inquiries.data ?? [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Properties"
          value={props.length}
          icon={<Building2 className="h-5 w-5" />}
          trend="+12%"
          trendUp
          color="bg-primary/10 text-primary"
          sub="All listings"
        />
        <StatCard
          label="Pending Approval"
          value={pendingCount}
          icon={<Clock className="h-5 w-5" />}
          color="bg-warning/15 text-warning-foreground"
          sub="Awaiting review"
          alert={pendingCount > 0}
        />
        <StatCard
          label="Pending Agents"
          value={pendingAgents}
          icon={<Users className="h-5 w-5" />}
          color="bg-blue-100 text-blue-600"
          sub="Need approval"
          alert={pendingAgents > 0}
        />
        <StatCard
          label="Total Views"
          value={totalViews.toLocaleString()}
          icon={<Eye className="h-5 w-5" />}
          trend="+8%"
          trendUp
          color="bg-purple-100 text-purple-600"
          sub="Across all listings"
        />
        <StatCard
          label="Unread Inquiries"
          value={unread}
          icon={<Inbox className="h-5 w-5" />}
          color="bg-rose-100 text-rose-600"
          sub="Need response"
          alert={unread > 0}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Featured" value={featured.data?.length ?? 0} icon={<Star className="h-5 w-5" />} color="bg-accent/15 text-accent-foreground" sub="Highlighted listings" />
        <StatCard label="Approved" value={approved} icon={<CheckCircle2 className="h-5 w-5" />} color="bg-success/15 text-success" sub="Live listings" />
        <StatCard label="Rejected" value={rejected} icon={<XCircle className="h-5 w-5" />} color="bg-destructive/10 text-destructive" sub="Declined listings" />
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Agent Applications ({pendingAgents})</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border bg-card p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold">Listing Activity (last 6 months)</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">New listings vs Views</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={months}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid var(--color-border)", fontSize: 12 }} />
                  <Area type="monotone" dataKey="listings" stroke="#3b82f6" fill="url(#grad1)" strokeWidth={2} name="New listings" />
                  <Bar dataKey="views" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Views" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold mb-5">Property Types</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byType} dataKey="value" nameKey="name" outerRadius={70} innerRadius={40} paddingAngle={3}>
                    {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {byType.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-muted-foreground">{t.name}</span>
                    </div>
                    <span className="font-medium">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Agent Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          {appsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !isSupabaseConfigured ? (
            <Card>
              <CardContent className="py-20 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium">Supabase not configured</p>
                <p className="text-sm text-muted-foreground">Please check your environment variables.</p>
              </CardContent>
            </Card>
          ) : applications?.length === 0 ? (
            <Card>
              <CardContent className="py-20 text-center">
                <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium">No pending agent applications</p>
                <p className="text-sm text-muted-foreground">When users apply to become agents, their applications will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            applications?.map((app: any) => (
              <Card key={app.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {app.full_name}
                        <Badge variant="outline" className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30">
                          Pending Review
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Applied on {formatDate(app.created_at)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="gap-2 bg-green-600 hover:bg-green-700"
                        onClick={() => approveAgent.mutate({ userId: app.user_id, applicationId: app.id })}
                        disabled={approveAgent.isPending}
                      >
                        {approveAgent.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve Agent
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="gap-2"
                        onClick={() => {
                          setSelectedApplication(app);
                          setRejectDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Information</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{app.email}</span>
                        </div>
                        {app.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{app.phone}</span>
                          </div>
                        )}
                        {app.company_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                            <span>{app.company_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Professional Information</h4>
                      <div className="space-y-2">
                        {app.license_number && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">License #:</span> {app.license_number}
                          </div>
                        )}
                        {app.message && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Application message:</span>
                            <p className="mt-1 p-3 bg-muted/30 rounded-lg">{app.message}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Recent listings */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b">
                <h3 className="font-semibold">Recent Listings</h3>
                <Link to="/admin/properties" className="text-xs text-primary flex items-center gap-1 hover:gap-1.5 transition-all">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="divide-y">
                {recentProps.length === 0 && (
                  <p className="p-5 text-sm text-muted-foreground">No listings yet.</p>
                )}
                {recentProps.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="h-10 w-14 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-14 rounded-lg bg-muted shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.city} · {formatDate(p.created_at)}</p>
                    </div>
                    <StatusDot status={p.status} />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent inquiries */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b">
                <h3 className="font-semibold">Recent Inquiries</h3>
                <Link to="/admin/inquiries" className="text-xs text-primary flex items-center gap-1 hover:gap-1.5 transition-all">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="divide-y">
                {recentInquiries.length === 0 && (
                  <p className="p-5 text-sm text-muted-foreground">No inquiries yet.</p>
                )}
                {recentInquiries.map((inq) => (
                  <div key={inq.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                      {(inq.user?.full_name ?? inq.user?.email ?? "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inq.property?.title ?? "Unknown property"}</p>
                      <p className="text-xs text-muted-foreground truncate">{inq.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(inq.created_at)}</p>
                    </div>
                    <InqBadge status={inq.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Agent Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting {selectedApplication?.full_name}'s application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejectReason.trim()) {
                  toast.error("Please provide a reason for rejection");
                  return;
                }
                rejectAgent.mutate({
                  userId: selectedApplication?.user_id,
                  applicationId: selectedApplication?.id,
                  reason: rejectReason
                });
              }}
              disabled={rejectAgent.isPending}
            >
              {rejectAgent.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label, value, icon, trend, trendUp, color, sub, alert
}: {
  label: string; value: string | number; icon: React.ReactNode;
  trend?: string; trendUp?: boolean; color?: string; sub?: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-2xl border bg-card p-5 ${alert ? "ring-2 ring-yellow-500/30" : ""}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${color ?? "bg-primary/10 text-primary"}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">{sub}</p>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendUp ? "text-green-600" : "text-red-600"}`}>
            {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-green-500",
    pending: "bg-yellow-500",
    rejected: "bg-red-500",
    sold: "bg-gray-400",
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${map[status] ?? "bg-gray-400"}`} />
      <span className="text-xs text-muted-foreground capitalize">{status}</span>
    </div>
  );
}

function InqBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    unread: "bg-yellow-500/15 text-yellow-600",
    read: "bg-gray-100 text-gray-600",
    replied: "bg-green-500/15 text-green-600",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize shrink-0 ${map[status] ?? "bg-gray-100"}`}>
      {status}
    </span>
  );
}
