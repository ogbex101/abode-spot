import { Leaf } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="mb-3 flex items-center gap-2">
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
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              The modern way to find, list, and sell real estate. Trusted by thousands of homebuyers and agents nationwide.
            </p>
          </div>

          <FooterCol
            title="Discover"
            links={[
              { label: "Buy a home", to: "/properties" },
              { label: "Rent a home", to: "/properties" },
              { label: "Featured listings", to: "/properties" },
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              { label: "Sign in", to: "/login" },
              { label: "Register", to: "/register" },
              { label: "Dashboard", to: "/dashboard" },
            ]}
          />
        </div>

        <div className="mt-10 border-t pt-8 text-center text-xs text-muted-foreground md:text-left">
          © {new Date().getFullYear()} AbodeSpot. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <div className="mb-4 text-sm font-semibold text-foreground">{title}</div>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
