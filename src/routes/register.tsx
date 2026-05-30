import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Leaf, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export const Route = createFileRoute("/register")({
  component: Register,
});

function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwStrength = form.password.length === 0 ? 0 : form.password.length < 8 ? 1 : form.password.length < 12 ? 2 : 3;
  const pwLabels = ["", "Weak", "Good", "Strong"];
  const pwColors = ["", "bg-destructive", "bg-warning", "bg-success"];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error, needsVerification } = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName);
    setLoading(false);
    if (error) { toast.error(error); return; }
    if (needsVerification) {
      toast.success("Check your email to verify your account.");
      navigate({ to: "/verify-email" });
    } else {
      toast.success("Account created!");
      navigate({ to: "/dashboard" });
    }
  };

  const perks = ["Save & compare listings", "Contact verified agents", "Get price alerts", "Unlimited searches"];

  return (
    <div className="flex min-h-[100dvh]">
      {/* Left visual panel */}
      <div
        className="hidden lg:flex lg:flex-col lg:w-[45%] relative overflow-hidden"
        style={{
          backgroundImage: "url(https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=85)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.18_0.08_160/0.93)] to-[oklch(0.18_0.08_160/0.65)]" />
        <div className="relative z-10 flex flex-col justify-between h-full p-10 text-white">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Leaf className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>AbodeSpot</span>
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-6" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Join thousands of happy homebuyers.
            </h2>
            <ul className="space-y-3">
              {perks.map((p) => (
                <li key={p} className="flex items-center gap-3 text-sm text-white/85">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
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
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>Create account</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Free forever. No credit card needed.</p>
          </div>

          <form className="animate-fade-up delay-100 mt-8 space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Full name</Label>
              <Input
                id="name"
                required
                placeholder="Jane Smith"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  required
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              {form.password.length > 0 && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-300", i <= pwStrength ? pwColors[pwStrength] : "bg-muted")} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{pwLabels[pwStrength]}</span>
                </div>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 gap-2 font-semibold text-sm shadow-sm hover:shadow-md transition-shadow"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating account…
                </span>
              ) : (
                <span className="flex items-center gap-2">Create account <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              By signing up, you agree to our{" "}
              <Link to="/" className="underline hover:text-foreground">Terms</Link> and{" "}
              <Link to="/" className="underline hover:text-foreground">Privacy Policy</Link>.
            </p>
          </form>

          <p className="animate-fade-up delay-200 mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
