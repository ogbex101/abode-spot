import { MessageSquare } from "lucide-react";
import type { Conversation } from "@/hooks/useMessages";

export type ConversationListItemProps = {
  conversation: Conversation;
  onOpen: () => void;
  compact?: boolean;
};

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "now";
  if (diffMs < 60 * 60_000) return `${Math.max(1, Math.floor(diffMs / 60_000))}m`;

  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  if (diffMs < 6 * 24 * 60 * 60_000) {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationListItem({ conversation, onOpen, compact = false }: ConversationListItemProps) {
  const property = conversation.property;
  const displayName = conversation.other_user?.full_name || conversation.other_user?.email || "Chat room";
  const contextLabel = property?.title || (conversation.conversation_type === "property" ? "Property enquiry" : "Direct chat");

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open chat with ${displayName}`}
      className={`group w-full text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${compact
        ? "p-3 hover:bg-muted/40"
        : "rounded-xl border bg-card p-3 hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm sm:p-4"
      }`}
    >
      <div className={`flex min-w-0 items-center ${compact ? "gap-2.5" : "gap-3 sm:gap-4"}`}>
        {property?.images?.[0] ? (
          <img
            src={property.images[0]}
            alt=""
            className={compact ? "h-8 w-8 shrink-0 rounded-lg object-cover" : "h-14 w-16 shrink-0 rounded-lg object-cover sm:h-16 sm:w-20"}
          />
        ) : (
          <div className={`flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ${compact ? "h-8 w-8" : "h-14 w-16 sm:h-16 sm:w-20"}`}>
            <MessageSquare className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className={`${compact ? "text-sm" : "font-semibold"} truncate group-hover:text-primary`}>{displayName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{contextLabel}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-[11px] text-muted-foreground">{formatConversationTime(conversation.last_message_at || conversation.updated_at)}</span>
              {conversation.unread_count > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                </span>
              )}
            </div>
          </div>
          <p className={`${compact ? "mt-1 text-xs" : "mt-2 text-sm"} truncate text-muted-foreground`}>
            {conversation.last_message || "No messages yet"}
          </p>
        </div>
      </div>
    </button>
  );
}
