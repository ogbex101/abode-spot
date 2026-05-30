import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Inbox, Users, Eye, Star, Clock, TrendingUp, TrendingDown, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import { useInquiries } from "@/hooks/useInquiries";
import { formatDate } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";

export const Route = createFileRoute("/_authenticated/_admin/admin/dashboard")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const all = useProperties({ status: "all" });
  const pending = useProperties({ status: "pending" });
  const featured = useProperties({ featured: true, status: "all" });
  const inquiries = useInquiries({ scope: "admin" });

  const props = all.data ?? [];
  const totalViews = props.reduce((s, p) => s + (p.views ?? 0), 0);
  const unread = (inquiries.data ?? []).filter((i) => i.status === "unread").length;
  const approved = props.filter((p) => p.status === "approved").length;
  const rejected = props.filter((p) => p.status === "rejected").length;

  const byType = ["house", "apartment", "land", "commercial"].map((t) => ({
    name: t.charAt(0).toUpperCase() + t.slice(1),
    value: props.filter((p) => p.property_type === t).length,
  }));
  const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];

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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
          value={pending.data?.length ?? 0}
          icon={<Clock className="h-5 w-5" />}
          color="bg-warning/15 text-warning-foreground"
          sub="Awaiting review"
          alert={(pending.data?.length ?? 0) > 0}
        />
        <StatCard
          label="Total Views"
          value={totalViews.toLocaleString()}
          icon={<Eye className="h-5 w-5" />}
          trend="+8%"
          trendUp
          color="bg-blue-100 text-blue-600"
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

      {/* Charts */}
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
                  <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid var(--color-border)", fontSize: 12 }} />
              <Area type="monotone" dataKey="listings" stroke="var(--color-chart-1)" fill="url(#grad1)" strokeWidth={2} name="New listings" />
              <Bar dataKey="views" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} name="Views" />
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

      {/* Recent activity */}
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
                <img src={p.images[0]} alt="" className="h-10 w-14 rounded-lg object-cover shrink-0" />
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
    <div className={`rounded-2xl border bg-card p-5 ${alert ? "ring-2 ring-warning/30" : ""}`}>
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
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendUp ? "text-success" : "text-destructive"}`}>
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
    approved: "bg-success",
    pending: "bg-warning",
    rejected: "bg-destructive",
    sold: "bg-muted-foreground",
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2 w-2 rounded-full ${map[status] ?? "bg-muted"}`} />
      <span className="text-xs text-muted-foreground capitalize">{status}</span>
    </div>
  );
}

function InqBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    unread: "bg-warning/15 text-warning-foreground",
    read: "bg-muted text-muted-foreground",
    replied: "bg-success/15 text-success",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize shrink-0 ${map[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}
