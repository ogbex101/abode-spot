import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Leaf, ArrowRight, Eye, EyeOff, CheckCircle2, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const schema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

export const Route = createFileRoute("/register")({
  component: Register,
});

type DesiredRole = "user" | "agent";

const ROLES: { value: DesiredRole; label: string; description: string; perks: string[]; icon: React.ReactNode }[] = [
  {
    value: "user",
    label: "I'm a Buyer / Renter",
    description: "Looking for a property to buy or rent",
    icon: <User className="h-5 w-5" />,
    perks: ["Save & compare listings", "Contact verified agents", "Get price alerts", "Unlimited searches"],
  },
  {
    value: "agent",
    label: "I'm an Agent / Seller",
    description: "I want to list properties for sale or rent",
    icon: <Building2 className="h-5 w-5" />,
    perks: ["List unlimited properties", "Manage inquiries", "Track listing views", "Featured placement"],
  },
];

function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [desiredRole, setDesiredRole] = useState<DesiredRole>("user");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const pwStrength =
    form.password.length === 0 ? 0 : form.password.length < 8 ? 1 : form.password.length < 12 ? 2 : 3;
  const pwLabels = ["", "Weak", "Good", "Strong"];
  const pwColors = ["", "bg-destructive", "bg-warning", "bg-success"];

  const selectedRole = ROLES.find((r) => r.value === desiredRole)!;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { 
      toast.error(parsed.error.issues[0].message); 
      return; 
    }
    
    setLoading(true);
    
    const { error, role: assignedRole } = await signUp(
      parsed.data.email,
      parsed.data.password,
      parsed.data.fullName,
      desiredRole
    );
    
    if (error) { 
      setLoading(false);
      toast.error(error); 
      return; 
    }
    
    toast.success("Account created! Welcome to AbodeSpot.");
    
    // Navigate based on the role that was actually assigned
    setTimeout(() => {
      setLoading(false);
      if (desiredRole === "agent" || assignedRole === "agent") {
        navigate({ to: "/agent" });
      } else {
        navigate({ to: "/dashboard" });
      }
    }, 2000);
  };

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
              {step === 1 ? "Join thousands of happy homebuyers." : `Welcome aboard as ${desiredRole === "agent" ? "an Agent" : "a Buyer"}.`}
            </h2>
            <ul className="space-y-3">
              {selectedRole.perks.map((p) => (
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
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              Abode<span className="text-primary">Spot</span>
            </span>
          </div>

          {/* ── STEP 1: Role selection ── */}
          {step === 1 && (
            <div className="animate-fade-up">
              <h1 className="text-3xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Create account
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">How do you want to use AbodeSpot?</p>

              <div className="mt-8 space-y-3">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setDesiredRole(r.value)}
                    className={cn(
                      "w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 hover:border-primary/50 hover:bg-muted/30",
                      desiredRole === r.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                        desiredRole === r.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {r.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-semibold text-sm transition-colors",
                          desiredRole === r.value ? "text-primary" : "text-foreground"
                        )}>
                          {r.label}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>
                      </div>
                      <div className={cn(
                        "h-4 w-4 shrink-0 rounded-full border-2 transition-all",
                        desiredRole === r.value
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/30"
                      )}>
                        {desiredRole === r.value && (
                          <div className="h-full w-full rounded-full flex items-center justify-center">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                className="w-full h-11 gap-2 font-semibold text-sm shadow-sm mt-6"
                onClick={() => setStep(2)}
              >
                Continue as {desiredRole === "agent" ? "Agent" : "Buyer / Renter"} <ArrowRight className="h-4 w-4" />
              </Button>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: Account details ── */}
          {step === 2 && (
            <div className="animate-fade-up">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>

              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                {selectedRole.icon}
                {selectedRole.label}
              </div>

              <h1 className="mt-3 text-3xl font-bold" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                Your details
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Free forever. No credit card needed.</p>

              <form className="mt-8 space-y-5" onSubmit={onSubmit}>
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
                          <div
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-all duration-300",
                              i <= pwStrength ? pwColors[pwStrength] : "bg-muted"
                            )}
                          />
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

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
