import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Building2, Check, CheckCheck, Loader2, MessageSquare, Plus, Send, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  type Conversation,
  type ConversationParticipant,
  useAgentDirectory,
  useConversation,
  useConversations,
  useCreateConversation,
  useMessages,
} from "@/hooks/useMessages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Search {
  conversation?: string;
}

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    conversation: typeof search.conversation === "string" ? search.conversation : undefined,
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const conversations = useConversations();
  const selectedId = search.conversation ?? conversations.data?.[0]?.id ?? null;
  const selectedFromList = conversations.data?.find((conversation) => conversation.id === selectedId) ?? null;
  const selectedQuery = useConversation(selectedFromList ? null : selectedId);
  const selectedConversation = selectedFromList ?? selectedQuery.data ?? null;
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);

  const totalUnread = useMemo(() => (
    conversations.data?.reduce((count, conversation) => count + conversation.unread_count, 0) ?? 0
  ), [conversations.data]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 md:px-6">
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-sm text-muted-foreground">All your chat rooms with buyers and agents.</p>
          </div>
          {role === "agent" && (
            <Button className="gap-2" onClick={() => setAgentDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New agent chat
            </Button>
          )}
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 md:grid-cols-[330px_1fr] md:px-6">
        <aside className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="font-semibold">Rooms</div>
            {totalUnread > 0 && <Badge variant="secondary">{totalUnread} unread</Badge>}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {conversations.isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (conversations.data ?? []).length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                <MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-30" />
                No chat rooms yet.
              </div>
            ) : (
              conversations.data?.map((conversation) => (
                <ConversationButton
                  key={conversation.id}
                  conversation={conversation}
                  selected={conversation.id === selectedId}
                  onClick={() => navigate({ to: "/messages", search: { conversation: conversation.id } })}
                />
              ))
            )}
          </div>
        </aside>

        <section className="min-h-[70vh] rounded-lg border bg-card">
          {selectedConversation ? (
            <MessageThread conversation={selectedConversation} currentUserId={user.id} />
          ) : (
            <div className="flex min-h-[70vh] items-center justify-center p-8 text-center text-muted-foreground">
              <div>
                <MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-30" />
                <p className="font-medium">Select a room to start chatting</p>
                <p className="mt-1 text-sm">Property contacts and agent chats will appear here.</p>
              </div>
            </div>
          )}
        </section>
      </main>

      <NewAgentChatDialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen} />
    </div>
  );
}

function ConversationButton({
  conversation,
  selected,
  onClick,
}: {
  conversation: Conversation;
  selected: boolean;
  onClick: () => void;
}) {
  const name = displayName(conversation.other_user);
  const initials = getInitials(name);
  const subtitle = conversation.conversation_type === "property"
    ? conversation.property?.title ?? "Property chat"
    : "Agent direct chat";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50",
        selected && "bg-primary/8"
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          <div className="flex shrink-0 items-center gap-2">
            {conversation.unread_count > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {conversation.unread_count}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {conversation.last_message_at
                ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
                : ""}
            </span>
          </div>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          {conversation.conversation_type === "property" ? (
            <Building2 className="h-3 w-3" />
          ) : (
            <UserRound className="h-3 w-3" />
          )}
          <span className="truncate">{subtitle}</span>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {conversation.last_message || "No messages yet"}
        </p>
      </div>
    </button>
  );
}

function MessageThread({
  conversation,
  currentUserId,
}: {
  conversation: Conversation;
  currentUserId: string;
}) {
  const { messages, isLoading, sendMessageAsync, isSending, markAsRead } = useMessages(conversation.id);
  const [message, setMessage] = useState("");
  const receiverId = conversation.other_user?.id;
  const otherName = displayName(conversation.other_user);

  useEffect(() => {
    markAsRead();
  }, [conversation.id, markAsRead]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!receiverId || !message.trim()) return;
    try {
      await sendMessageAsync({
        conversationId: conversation.id,
        receiverId,
        message,
      });
      setMessage("");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="flex min-h-[70vh] flex-col">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="text-xs font-semibold">{getInitials(otherName)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{otherName}</h2>
            {conversation.conversation_type === "property" ? (
              <Link
                to="/property/$id"
                params={{ id: conversation.property_id ?? "" }}
                className="text-xs text-primary hover:underline"
              >
                {conversation.property?.title ?? "Property chat"}
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground">Agent direct chat</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No messages yet.
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((item) => {
              const isOwn = item.sender_id === currentUserId;
              return (
                <div key={item.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                  <div className="max-w-[78%]">
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2 text-sm",
                        isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      <p className="break-words">{item.message}</p>
                    </div>
                    <div className={cn("mt-1 flex items-center gap-1 text-xs text-muted-foreground", isOwn && "justify-end")}>
                      <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                      {isOwn && (item.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form className="border-t p-4" onSubmit={handleSend}>
        <div className="space-y-2">
          <Label htmlFor="message-body">Message</Label>
          <div className="flex gap-2">
            <Textarea
              id="message-body"
              rows={2}
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 1000))}
              placeholder="Type your message..."
              disabled={!receiverId || isSending}
              className="min-h-12 resize-none"
            />
            <Button type="submit" disabled={!message.trim() || !receiverId || isSending} className="h-auto gap-2">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send message
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function NewAgentChatDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
      toast.error((error as Error).message);
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
