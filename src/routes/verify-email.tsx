import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmail,
});

function VerifyEmail() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
      <p className="mt-2 text-muted-foreground">
        We sent a verification link. Click it to activate your account, then sign in.
      </p>
      <Link to="/login" className="mt-6 text-sm font-medium text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
