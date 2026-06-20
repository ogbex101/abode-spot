import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/agent/inquiries")({
  component: AgentInquiries,
});

function AgentInquiries() {
  const { role } = useAuth();

  if (role !== "agent" && role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold">Agent access required</h1>
        <Link to="/dashboard" className="mt-4 inline-block text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MessageSquare className="h-7 w-7" />
      </div>
      <h1 className="text-3xl font-bold">Messages moved to chat rooms</h1>
      <p className="mt-3 text-muted-foreground">
        Buyer and agent replies now happen in the shared Messages screen.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/messages">
          <Button className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Open Messages
          </Button>
        </Link>
        <Link to="/agent">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
