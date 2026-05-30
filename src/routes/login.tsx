import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Leaf, ArrowRight, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { signIn, user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [didSignIn, setDidSignIn] = useState(false);

  // Once auth state resolves after sign-in, redirect to the correct portal
  useEffect(() => {
    if (!didSignIn || loading || !user) return;
    if (role === "admin") navigate({ to: "/admin/dashboard" });
    else if (role === "agent") navigate({ to: "/agent" });
    else navigate({ to: "/dashboard" });
  }, [didSignIn, loading, user, role, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) { toast.error(error); return; }
    toast.success("Welcome back!");
    setDidSignIn(true);
  };

  return (
    <div className="flex min-h-[100dvh]">
      {/* Left visual panel */}
      <div
        className="hidden lg:flex lg:flex-col lg:w-[45%] relative overflow-hidden"
        style={{
          backgroundImage: "url(https://images.unsplash.com/photo-1560184897-ae75f418493e?w=1200&q=85)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/60" />
        <div className="relative z-10 flex flex-col justify-between h-full p-10 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Leaf className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              AbodeSpot
            </span>
          </div>
          <div>
            <blockquote
              className="text-2xl font-bold leading-snug mb-4"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              "Found our dream home in just 3 days. The process was seamless."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold">SA</div>
              <div>
                <div className="text-sm font-semibold">Sarah A.</div>
                <div className="text-xs text-white/70">Happy homeowner</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Abode<span className="text-primary">Spot</span>
            </span>
          </div>

          <div className="animate-fade-up">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Sign in to continue exploring.</p>
          </div>

          <form className="animate-fade-up delay-100 mt-8 space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <button type="button" className="text-xs text-primary hover:underline">Forgot password?</button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 gap-2 font-semibold text-sm"
              disabled={submitting || didSignIn}
            >
              {submitting || didSignIn ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {didSignIn ? "Redirecting…" : "Signing in…"}
                </span>
              ) : (
                <span className="flex items-center gap-2">Sign in <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>

          <p className="animate-fade-up delay-200 mt-6 text-center text-sm text-muted-foreground">
            No account?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
