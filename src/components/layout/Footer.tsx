import { Leaf, Github, Twitter, Instagram } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Leaf className="h-4 w-4" />
              </div>
              <span
                className="text-lg font-bold"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Abode<span className="text-primary">Spot</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The modern way to find, list, and sell real estate. Trusted by thousands of homebuyers and agents nationwide.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <SocialIcon href="#"><Twitter className="h-4 w-4" /></SocialIcon>
              <SocialIcon href="#"><Instagram className="h-4 w-4" /></SocialIcon>
              <SocialIcon href="#"><Github className="h-4 w-4" /></SocialIcon>
            </div>
          </div>

          <FooterCol title="Discover" links={[
            { label: "Buy a home", to: "/properties" },
            { label: "Rent a home", to: "/properties" },
            { label: "Featured listings", to: "/properties" },
          ]} />
          <FooterCol title="Account" links={[
            { label: "Sign in", to: "/login" },
            { label: "Register", to: "/register" },
            { label: "Dashboard", to: "/dashboard" },
          ]} />
          <FooterCol title="Company" links={[
            { label: "About us", to: "/" },
            { label: "Contact", to: "/" },
            { label: "Privacy policy", to: "/" },
            { label: "Terms of service", to: "/" },
          ]} />
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-8 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} AbodeSpot. All rights reserved.</span>
          <div className="flex gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/" className="hover:text-foreground transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-foreground mb-4">{title}</div>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialIcon({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="flex h-8 w-8 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
    >
      {children}
    </a>
  );
}
