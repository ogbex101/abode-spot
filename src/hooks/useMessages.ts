import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";

export type Conversation = {
  id: string;
  property_id: string;
  user_id: string;
  agent_id: string;
  last_message: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  property?: {
    id: string;
    title: string;
    images: string[];
  };
  other_user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];
      if (!isSupabaseConfigured || !supabase) return [];

      // Get conversations where user is either buyer or agent
      const { data: conversations, error } = await supabase
        .from("conversations")
        .select(`
          *,
          property:properties(id, title, images),
          user:users!conversations_user_id_fkey(id, full_name, email),
          agent:users!conversations_agent_id_fkey(id, full_name, email)
        `)
        .or(`user_id.eq.${user.id},agent_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw new Error(error.message);

      // Format conversations with the other user's info
      return conversations.map((conv: any) => ({
        ...conv,
        other_user: conv.user_id === user.id ? conv.agent : conv.user
      })) as Conversation[];
    },
    enabled: !!user,
  });
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId || !supabase) return;

    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Update messages cache
          queryClient.setQueryData(
            ["messages", conversationId],
            (oldData: Message[] | undefined) => {
              return oldData ? [...oldData, payload.new as Message] : [payload.new as Message];
            }
          );
          // Mark as read if received by current user
          if ((payload.new as Message).receiver_id === user?.id) {
            markMessagesAsRead.mutate(conversationId);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, user?.id]);

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      if (!isSupabaseConfigured || !supabase) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      return data as Message[];
    },
    enabled: !!conversationId,
  });

  const sendMessage = useMutation({
    mutationFn: async ({ conversationId, message, receiverId }: { conversationId: string; message: string; receiverId: string }) => {
      if (!user) throw new Error("Not logged in");
      if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        receiver_id: receiverId,
        message: message.trim(),
        is_read: false,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const markMessagesAsRead = useMutation({
    mutationFn: async (convId: string) => {
      if (!user) return;
      if (!supabase) return;
      
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("conversation_id", convId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    markAsRead: () => conversationId && markMessagesAsRead.mutate(conversationId),
  };
}

export function useCreateConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ propertyId, agentId, initialMessage }: { propertyId: string; agentId: string; initialMessage: string }) => {
      if (!user) throw new Error("Not logged in");
      if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");

      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("property_id", propertyId)
        .eq("user_id", user.id)
        .eq("agent_id", agentId)
        .maybeSingle();

      if (existing) {
        // Send message to existing conversation
        const { error: msgError } = await supabase.from("messages").insert({
          conversation_id: existing.id,
          sender_id: user.id,
          receiver_id: agentId,
          message: initialMessage.trim(),
          is_read: false,
        });
        if (msgError) throw new Error(msgError.message);
        return existing.id;
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          property_id: propertyId,
          user_id: user.id,
          agent_id: agentId,
          last_message: initialMessage,
        })
        .select()
        .single();

      if (convError) throw new Error(convError.message);

      // Send initial message
      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        receiver_id: agentId,
        message: initialMessage.trim(),
        is_read: false,
      });

      if (msgError) throw new Error(msgError.message);

      return conversation.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
