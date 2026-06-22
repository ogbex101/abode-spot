import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Heart, Menu, Leaf, LogOut, User as UserIcon, LayoutDashboard, Plus, X, Search, Home, Building2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useSavedIds } from "@/hooks/useFavorites";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: savedIds = [] } = useSavedIds();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  if (path.startsWith("/admin")) return null;

  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  const close = () => setMobileOpen(false);
  const handleSignOut = async () => {
    close();
    await signOut();
    await navigate({ to: "/", replace: true });
  };

  return (
    <header
      ref={menuRef}
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b bg-background/95 shadow-sm backdrop-blur-md"
          : "border-transparent bg-background/60 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2" onClick={close}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105">
            <Leaf className="h-4 w-4" />
          </div>
          <span
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Abode<span className="text-primary">Spot</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" label="Home" active={path === "/"} />
          <NavLink to="/properties" label="Properties" active={path === "/properties"} />
          {role === "agent" && (
            <NavLink to="/agent" label="Agent Portal" active={path.startsWith("/agent")} />
          )}
          {user && (
            <NavLink to="/messages" label="Messages" active={path === "/messages"} />
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 md:flex">
          {(role === "agent" || role === "admin") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/agent" })}
              className="gap-1.5 text-sm font-medium hover:bg-primary/8"
            >
              <Plus className="h-3.5 w-3.5" />
              List Property
            </Button>
          )}
          <Link to="/properties" className="relative">
            <Button variant="ghost" size="icon" aria-label="Search properties">
              <Search className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/dashboard" className="relative">
            <Button variant="ghost" size="icon" aria-label="Saved properties">
              <Heart className="h-4 w-4" />
            </Button>
            {savedIds.length > 0 && (
              <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[10px] font-bold">
                {savedIds.length}
              </Badge>
            )}
          </Link>
          {user && (
            <Link to="/messages" className="relative">
              <Button variant="ghost" size="icon" aria-label="Messages">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl border shadow-lg">
                <DropdownMenuLabel className="font-normal py-2.5">
                  <div className="text-sm font-medium">{user.email}</div>
                  <div className="text-xs text-muted-foreground capitalize mt-0.5">{role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin/dashboard" })} className="gap-2 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                  </DropdownMenuItem>
                )}
                {role === "agent" && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/agent" })} className="gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" /> Agent Portal
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })} className="gap-2 cursor-pointer">
                  <UserIcon className="h-4 w-4" /> My Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/messages" })} className="gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4" /> Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard", search: { tab: "saved" } as never })} className="gap-2 cursor-pointer">
                  <Heart className="h-4 w-4" /> Saved Properties
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleSignOut();
                  }}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/login" })} className="font-medium">
                Login
              </Button>
              <Button size="sm" onClick={() => navigate({ to: "/register" })} className="font-medium shadow-sm">
                Sign up
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted transition-colors md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu — full-width panel below the header */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t bg-background",
          mobileOpen ? "max-h-[100vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none border-transparent"
        )}
      >
        <nav className="mx-auto flex max-w-7xl flex-col px-4 py-3 pb-6 gap-0.5">
          {/* Primary nav links */}
          <MobLink to="/" label="Home" icon={<Home className="h-4 w-4" />} active={path === "/"} onClick={close} />
          <MobLink to="/properties" label="Properties" icon={<Search className="h-4 w-4" />} active={path === "/properties"} onClick={close} />
          {role === "agent" && (
            <MobLink to="/agent" label="Agent Portal" icon={<Building2 className="h-4 w-4" />} active={path.startsWith("/agent")} onClick={close} />
          )}
          {role === "admin" && (
            <MobLink to="/admin/dashboard" label="Admin Panel" icon={<LayoutDashboard className="h-4 w-4" />} active={path.startsWith("/admin")} onClick={close} />
          )}
          {user && (
            <MobLink to="/dashboard" label="My Dashboard" icon={<UserIcon className="h-4 w-4" />} active={path === "/dashboard"} onClick={close} />
          )}
          {user && (
            <MobLink to="/messages" label="Messages" icon={<MessageSquare className="h-4 w-4" />} active={path === "/messages"} onClick={close} />
          )}
          {user && (
            <MobLink
              to="/dashboard"
              label={`Saved${savedIds.length > 0 ? ` (${savedIds.length})` : ""}`}
              icon={<Heart className="h-4 w-4" />}
              active={false}
              onClick={close}
              search={{ tab: "saved" } as never}
            />
          )}

          <div className="mt-4 border-t pt-4">
            {!user ? (
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => { close(); navigate({ to: "/login" }); }}
                >
                  Login
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => { close(); navigate({ to: "/register" }); }}
                >
                  Sign up
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {(role === "agent" || role === "admin") && (
                  <Button
                    className="w-full gap-2"
                    variant="outline"
                    onClick={() => { close(); navigate({ to: "/agent" }); }}
                  >
                    <Plus className="h-4 w-4" /> List a Property
                  </Button>
                )}
                <div className="flex items-center justify-between px-1 py-2">
                  <div>
                    <div className="text-sm font-medium">{user.email}</div>
                    <div className="text-xs text-muted-foreground capitalize">{role}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => { void handleSignOut(); }}
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors hover:text-primary",
        active
          ? "text-primary after:absolute after:bottom-0.5 after:left-1/2 after:h-0.5 after:w-4 after:-translate-x-1/2 after:rounded-full after:bg-primary"
          : "text-muted-foreground"
      )}
    >
      {label}
    </Link>
  );
}

function MobLink({
  to, label, icon, active, onClick, search,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  search?: Record<string, unknown>;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
        active
          ? "bg-primary/8 text-primary"
          : "text-foreground hover:bg-muted"
      )}
    >
      <span className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground")}>{icon}</span>
      {label}
    </Link>
  );
}
