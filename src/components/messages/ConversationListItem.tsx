import { Building2, MessageSquare } from "lucide-react";
import type { Conversation } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

export type ConversationListItemProps = {
  conversation: Conversation;
  onOpen: () => void;
  compact?: boolean;
  className?: string;
};

function formatConversationTime(value: string | null | undefined) {
  if (!value) return "";
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

export function ConversationListItem({
  conversation,
  onOpen,
  compact = false,
  className,
}: ConversationListItemProps) {
  const property = conversation.property;
  const displayName = conversation.other_user?.full_name || conversation.other_user?.email || "Chat room";
  const contextLabel = property?.title || (conversation.conversation_type === "property" ? "Property chat" : "Direct chat");
  const preview = conversation.last_message || "No messages yet";
  const time = formatConversationTime(conversation.last_message_at || conversation.updated_at);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open chat with ${displayName}`}
      data-testid="conversation-card"
      className={cn(
        "group flex w-full min-w-0 items-center text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        compact
          ? "gap-2.5 p-3 hover:bg-muted/40"
          : "gap-3 rounded-xl border bg-card p-3 hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm sm:gap-4 sm:p-4",
        className,
      )}
    >
      {property?.images?.[0] ? (
        <img
          src={property.images[0]}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            "shrink-0 rounded-lg object-cover",
            compact ? "h-9 w-10" : "h-14 w-16 sm:h-16 sm:w-20",
          )}
        />
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
            compact ? "h-9 w-10" : "h-14 w-16 sm:h-16 sm:w-20",
          )}
        >
          <MessageSquare className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className={cn("truncate group-hover:text-primary", compact ? "text-sm font-medium" : "font-semibold")}>
              {displayName}
            </p>
            <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              {conversation.conversation_type === "property" && <Building2 className="h-3 w-3 shrink-0" />}
              <span className="truncate">{contextLabel}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1 pl-1">
            <span className="whitespace-nowrap text-[11px] text-muted-foreground">{time}</span>
            {conversation.unread_count > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
              </span>
            )}
          </div>
        </div>

        <p className={cn("truncate text-muted-foreground", compact ? "mt-1 text-xs" : "mt-2 text-sm")}>
          {preview}
        </p>
      </div>
    </button>
  );
}
