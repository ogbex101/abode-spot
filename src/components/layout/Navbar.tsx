import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Heart, Menu, Leaf, LogOut, User as UserIcon, LayoutDashboard, Plus, X, Search } from "lucide-react";
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
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: savedIds = [] } = useSavedIds();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (path.startsWith("/admin")) return null;

  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "border-b bg-background/95 shadow-sm backdrop-blur-md"
          : "border-transparent bg-background/60 backdrop-blur-sm"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2">
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
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 md:flex">
          {user && (
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
              <Search className="h-4.5 w-4.5" />
            </Button>
          </Link>
          <Link to="/dashboard" className="relative">
            <Button variant="ghost" size="icon" aria-label="Saved properties">
              <Heart className="h-4.5 w-4.5" />
            </Button>
            {savedIds.length > 0 && (
              <Badge className="absolute -right-1 -top-1 h-4.5 min-w-4.5 rounded-full px-1 text-[10px] font-bold">
                {savedIds.length}
              </Badge>
            )}
          </Link>

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
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })} className="gap-2 cursor-pointer">
                  <UserIcon className="h-4 w-4" /> My Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard", search: { tab: "saved" } as never })} className="gap-2 cursor-pointer">
                  <Heart className="h-4 w-4" /> Saved Properties
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => { await signOut(); navigate({ to: "/" }); }}
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
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t bg-background/98 backdrop-blur-xl md:hidden animate-fade-up">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 p-4">
            <MobLink to="/" label="Home" onClick={() => setMobileOpen(false)} />
            <MobLink to="/properties" label="Properties" onClick={() => setMobileOpen(false)} />
            <MobLink to="/dashboard" label="My Dashboard" onClick={() => setMobileOpen(false)} />
            {role === "agent" && (
              <MobLink to="/agent" label="Agent Portal" onClick={() => setMobileOpen(false)} />
            )}
            {role === "admin" && (
              <MobLink to="/admin/dashboard" label="Admin" onClick={() => setMobileOpen(false)} />
            )}
            {!user ? (
              <div className="mt-3 flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => { setMobileOpen(false); navigate({ to: "/login" }); }}>
                  Login
                </Button>
                <Button className="flex-1" onClick={() => { setMobileOpen(false); navigate({ to: "/register" }); }}>
                  Sign up
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="mt-3 gap-2"
                onClick={async () => { setMobileOpen(false); await signOut(); navigate({ to: "/" }); }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            )}
          </div>
        </div>
      )}
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

function MobLink({ to, label, onClick }: { to: string; label: string; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="rounded-lg px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">
      {label}
    </Link>
  );
}
