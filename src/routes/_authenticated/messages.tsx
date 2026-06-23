import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Building2, Check, CheckCheck, Loader2, MessageSquare, Plus, Send, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NewAgentChatDialog } from "@/components/messages/NewAgentChatDialog";
import { useAuth } from "@/hooks/useAuth";
import { type Conversation, type ConversationParticipant, PENDING_AGENT_CHAT_MESSAGE, useConversation, useConversations, useMessages } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "sonner";

interface Search { conversation?: string }

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
  const selectedId = search.conversation ?? null;
  const hasSelectedConversation = Boolean(selectedId);
  const selectedFromList = conversations.data?.find((conversation) => conversation.id === selectedId) ?? null;
  const selectedQuery = useConversation(selectedFromList ? null : selectedId);
  const selectedConversation = selectedFromList ?? selectedQuery.data ?? null;
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const isPendingAgent = role === "pending_agent";
  const totalUnread = useMemo(() => conversations.data?.reduce((count, conversation) => count + conversation.unread_count, 0) ?? 0, [conversations.data]);

  if (!user) return null;

  const openConversation = (conversationId: string) => navigate({ to: "/messages", search: { conversation: conversationId } });
  const closeConversation = () => navigate({ to: "/messages", search: {} });

  return (
    <div className={cn("bg-muted/20", hasSelectedConversation ? "h-[calc(100dvh-4rem)] overflow-hidden md:min-h-screen md:h-auto" : "min-h-screen")}>
      <div className={cn("border-b bg-background", hasSelectedConversation && "hidden md:block")}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 md:px-6">
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-sm text-muted-foreground">All your chat rooms with buyers and agents.</p>
          </div>
          {role === "agent" && <Button className="gap-2" onClick={() => setAgentDialogOpen(true)}><Plus className="h-4 w-4" />New agent chat</Button>}
        </div>
      </div>

      <main className={cn("mx-auto grid", hasSelectedConversation ? "h-full min-h-0 max-w-7xl md:h-auto md:grid-cols-[360px_minmax(0,1fr)] md:gap-4 md:px-6 md:py-6" : "max-w-3xl px-4 py-6 md:px-6")}>
        <aside className={cn("overflow-hidden border bg-card", hasSelectedConversation ? "hidden md:block md:rounded-lg" : "rounded-lg")}>
          <div className="flex items-center justify-between border-b px-4 py-3"><div className="font-semibold">Rooms</div>{totalUnread > 0 && <Badge variant="secondary">{totalUnread} unread</Badge>}</div>
          <div className={cn("overflow-y-auto", hasSelectedConversation ? "md:h-[74vh]" : "max-h-[calc(100vh-14rem)]")}>
            {conversations.isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : (conversations.data ?? []).length === 0 ? <div className="px-5 py-12 text-center text-sm text-muted-foreground"><MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-30" />No chat rooms yet.</div> : conversations.data?.map((conversation) => <ConversationButton key={conversation.id} conversation={conversation} selected={conversation.id === selectedId} onClick={() => openConversation(conversation.id)} />)}
          </div>
        </aside>

        {hasSelectedConversation && (
          <section className="h-full min-h-0 overflow-hidden border bg-card md:h-[74vh] md:rounded-lg">
            {selectedConversation ? <MessageThread conversation={selectedConversation} currentUserId={user.id} onBack={closeConversation} canSend={!isPendingAgent} disabledReason={isPendingAgent ? PENDING_AGENT_CHAT_MESSAGE : undefined} /> : selectedQuery.isLoading ? <div className="flex h-full min-h-0 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : <div className="flex h-full min-h-0 items-center justify-center p-8 text-center text-muted-foreground"><div><MessageSquare className="mx-auto mb-4 h-12 w-12 opacity-30" /><p className="font-medium">This room could not be opened</p><Button variant="outline" className="mt-4" onClick={closeConversation}>Back to rooms</Button></div></div>}
          </section>
        )}
      </main>

      <NewAgentChatDialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen} />
    </div>
  );
}

function ConversationButton({ conversation, selected, onClick }: { conversation: Conversation; selected: boolean; onClick: () => void }) {
  const name = displayName(conversation.other_user);
  const initials = getInitials(name);
  const subtitle = conversation.conversation_type === "property" ? conversation.property?.title ?? "Property chat" : "Agent direct chat";

  return (
    <button type="button" onClick={onClick} aria-current={selected ? "true" : undefined} className={cn("flex w-full gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/50", selected && "bg-primary/8")}>
      <Avatar className="h-10 w-10 shrink-0"><AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback></Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold">{name}</p>
          <div className="flex shrink-0 items-center gap-2">
            {conversation.unread_count > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{conversation.unread_count}</span>}
            <span className="text-[11px] text-muted-foreground">{conversation.last_message_at ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true }) : ""}</span>
          </div>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">{conversation.conversation_type === "property" ? <Building2 className="h-3 w-3" /> : <UserRound className="h-3 w-3" />}<span className="truncate">{subtitle}</span></div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.last_message || "No messages yet"}</p>
      </div>
    </button>
  );
}

function MessageThread({ conversation, currentUserId, onBack, canSend = true, disabledReason }: { conversation: Conversation; currentUserId: string; onBack: () => void; canSend?: boolean; disabledReason?: string }) {
  const { messages, isLoading, sendMessageAsync, isSending, markAsRead } = useMessages(conversation.id);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const receiverId = conversation.other_user?.id;
  const otherName = displayName(conversation.other_user);

  useEffect(() => { markAsRead(); }, [conversation.id, markAsRead]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages.length]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = message.trim();
    if (!canSend) { toast.info(disabledReason ?? "Messaging is not available for this account yet."); return; }
    if (!receiverId || !body) return;
    setMessage("");
    try { await sendMessageAsync({ conversationId: conversation.id, receiverId, message: body }); }
    catch (error) { setMessage(body); toast.error(getErrorMessage(error, "Could not send this message. Please try again.")); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-3 md:px-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Back to rooms"><ArrowLeft className="h-4 w-4" /></Button>
          <Avatar className="h-10 w-10"><AvatarFallback className="text-xs font-semibold">{getInitials(otherName)}</AvatarFallback></Avatar>
          <div>
            <h2 className="font-semibold">{otherName}</h2>
            {conversation.conversation_type === "property" && conversation.property_id ? <Link to="/property/$id" params={{ id: conversation.property_id }} className="text-xs text-primary hover:underline">{conversation.property?.title ?? "Property chat"}</Link> : <p className="text-xs text-muted-foreground">Agent direct chat</p>}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 md:px-4">
        {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : messages.length === 0 ? <div className="py-16 text-center text-sm text-muted-foreground">No messages yet.</div> : <div className="space-y-4">
          {messages.map((item) => {
            const isOwn = item.sender_id === currentUserId;
            return <div key={item.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}><div className="max-w-[78%]"><div className={cn("rounded-2xl px-4 py-2 text-sm", isOwn ? "bg-primary text-primary-foreground" : "bg-muted")}><p className="break-words">{item.message}</p></div><div className={cn("mt-1 flex items-center gap-1 text-xs text-muted-foreground", isOwn && "justify-end")}><span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>{isOwn && (item.is_read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}</div></div></div>;
          })}
          <div ref={messagesEndRef} />
        </div>}
      </div>

      <form className="shrink-0 border-t bg-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:p-4" onSubmit={handleSend}>
        {!canSend && disabledReason && <p className="mb-2 text-xs text-muted-foreground">{disabledReason}</p>}
        <div className="flex items-end gap-2">
          <Label htmlFor="message-body" className="sr-only">Message</Label>
          <Textarea id="message-body" rows={1} value={message} onChange={(event) => setMessage(event.target.value.slice(0, 1000))} placeholder={canSend ? "Type your message..." : "Messaging unlocks after approval"} disabled={!canSend || !receiverId || isSending} className="max-h-32 min-h-12 resize-none rounded-2xl bg-muted/60 px-4 py-3 focus-visible:bg-background" />
          <Button type="submit" size="icon" disabled={!canSend || !message.trim() || !receiverId || isSending} className="h-12 w-12 shrink-0 rounded-full" aria-label="Send message">{isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
        </div>
      </form>
    </div>
  );
}

function displayName(user: ConversationParticipant | null | undefined) {
  return user?.full_name?.trim() || user?.email || "Unknown user";
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "U";
}
