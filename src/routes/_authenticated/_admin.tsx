// Admin gate: role must be 'admin' (from user_roles table, RLS-enforced).
import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2, LayoutDashboard, Globe, Building2, Users, Inbox, Star, LogOut,
  Bell, Search, Menu, X, Leaf, ChevronRight, Settings, ExternalLink,
  PlusCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Overview & analytics" },
  { to: "/admin/properties", label: "Properties", icon: Building2, desc: "Manage all listings" },
  { to: "/admin/add-property", label: "Add Property", icon: PlusCircle, desc: "Create a new listing" },
  { to: "/admin/users", label: "Users", icon: Users, desc: "User management" },
  { to: "/admin/featured", label: "Featured", icon: Star, desc: "Featured listings" },
  { to: "/admin/homepage", label: "Homepage", icon: Globe, desc: "Edit homepage sections" },
  { to: "/admin/inquiries", label: "Inquiries", icon: Inbox, desc: "Messages & leads" },
];

function AdminLayout() {
  const { role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (role !== "admin") navigate({ to: "/dashboard" });
  }, [role, loading, navigate]);

  if (loading || role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading admin panel…</p>
        </div>
      </div>
    );
  }

  const currentPage = NAV.find((n) => n.to === path);

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform duration-300 md:static md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar header */}
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-sm" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              AbodeSpot
            </span>
            <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">Admin Panel</p>
          </div>
          <button className="ml-auto md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3 pt-4">
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 mb-1">
            Management
          </p>
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = path === n.to;
            const isAdd = n.to === "/admin/add-property";
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all hover:bg-sidebar-accent",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                    : isAdd
                    ? "text-primary font-medium hover:text-primary"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div>{n.label}</div>
                </div>
                {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t p-3 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
          >
            <ExternalLink className="h-4 w-4" /> View live site
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 rounded-xl px-3 py-2.5 h-auto text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-destructive"
            onClick={async () => { await signOut(); navigate({ to: "/" }); }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 shadow-sm">
          <button
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Admin</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold">{currentPage?.label ?? "Overview"}</span>
          </div>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-xs mx-4">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Quick search…" className="pl-9 h-9 bg-muted/50 border-0 focus-visible:bg-background" />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link to="/admin/inquiries">
              <Button variant="ghost" size="icon" className="relative rounded-xl" title="Inquiries">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button variant="ghost" size="icon" className="rounded-xl" title="Manage users">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              AD
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {/* Page header */}
          {currentPage && currentPage.to !== "/admin/add-property" && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                {currentPage.label}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{currentPage.desc}</p>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}