import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ConversationParticipant, useAgentDirectory, useCreateConversation } from "@/hooks/useMessages";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function displayName(user: ConversationParticipant | null | undefined) {
  return user?.full_name?.trim() || user?.email || "Unknown user";
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
}

export function NewAgentChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const agents = useAgentDirectory();
  const createConversation = useCreateConversation();
  const [selectedAgent, setSelectedAgent] = useState<ConversationParticipant | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedAgent(null);
      setMessage("");
    }
  }, [open]);

  const handleStart = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedAgent || !message.trim()) return;

    try {
      const conversationId = await createConversation.mutateAsync({
        otherUserId: selectedAgent.id,
        conversationType: "direct",
        initialMessage: message,
      });
      onOpenChange(false);
      navigate({ to: "/messages", search: { conversation: conversationId } });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not start this chat. Please try again."));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New agent chat</DialogTitle>
          <DialogDescription>Start a direct room with another approved agent.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleStart}>
          <div className="space-y-2">
            <Label>Agent</Label>
            {agents.isLoading ? (
              <div className="flex justify-center rounded-lg border py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (agents.data ?? []).length === 0 ? (
              <div className="rounded-lg border p-4 text-sm text-muted-foreground">No other agents found.</div>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border p-2">
                {agents.data?.map((agent) => {
                  const name = displayName(agent);
                  const active = selectedAgent?.id === agent.id;
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setSelectedAgent(agent)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                        active && "bg-primary/10 text-primary"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 truncate">Chat with {name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-direct-message">Initial message</Label>
            <Textarea
              id="agent-direct-message"
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 1000))}
              placeholder="Write the first message..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedAgent || !message.trim() || createConversation.isPending} className="gap-2">
              {createConversation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Start chat
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
