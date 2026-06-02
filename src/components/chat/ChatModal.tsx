import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, CheckCheck, Check } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { formatDistanceToNow } from "date-fns";

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  otherUserName: string;
  currentUserId: string;
}

export function ChatModal({ open, onOpenChange, conversationId, otherUserName, currentUserId }: ChatModalProps) {
  const [newMessage, setNewMessage] = useState("");
  const { messages, isLoading, sendMessage, isSending, markAsRead } = useMessages(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (open && conversationId) {
      markAsRead();
    }
  }, [open, conversationId]);

  const handleSend = () => {
    if (!newMessage.trim() || !conversationId) return;
    
    // Find receiver ID (the other person)
    const lastMessage = messages[messages.length - 1];
    const receiverId = lastMessage?.sender_id === currentUserId 
      ? lastMessage?.receiver_id 
      : lastMessage?.sender_id;
    
    if (receiverId) {
      sendMessage({ conversationId, message: newMessage, receiverId });
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle>Chat with {otherUserName}</DialogTitle>
        </DialogHeader>

        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] ${isOwn ? "order-2" : "order-1"}`}>
                    <div className="flex items-end gap-1">
                      {!isOwn && (
                        <Avatar className="h-6 w-6 mb-1">
                          <AvatarFallback className="text-xs">
                            {otherUserName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`rounded-2xl px-3 py-2 ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm break-words">{msg.message}</p>
                      </div>
                      {isOwn && (
                        <div className="text-xs text-muted-foreground ml-1">
                          {msg.is_read ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className={`text-xs text-muted-foreground mt-1 ${isOwn ? "text-right" : "text-left"}`}>
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSending}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!newMessage.trim() || isSending} size="icon">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
