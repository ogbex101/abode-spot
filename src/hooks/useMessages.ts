import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type ConversationType = "property" | "direct";

export type ConversationParticipant = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
  role?: string | null;
  company_name?: string | null;
};

export type Conversation = {
  id: string;
  property_id: string | null;
  user_id: string;
  agent_id: string;
  conversation_type: ConversationType;
  participant_a_id: string;
  participant_b_id: string;
  created_by: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
  property?: {
    id: string;
    title: string;
    images: string[];
    agent_id?: string | null;
  } | null;
  participant_a?: ConversationParticipant | null;
  participant_b?: ConversationParticipant | null;
  other_user?: ConversationParticipant | null;
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

type CreateConversationInput = {
  otherUserId: string;
  propertyId?: string | null;
  initialMessage?: string;
  conversationType?: ConversationType;
  sendInitialMessage?: boolean;
};

export function orderedParticipants(userId: string, otherUserId: string): [string, string] {
  if (userId === otherUserId) {
    throw new Error("You cannot start a chat with yourself");
  }
  return userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
}

function withOtherUser(conversation: any, currentUserId: string): Conversation {
  return {
    ...conversation,
    unread_count: conversation.unread_count ?? 0,
    other_user:
      conversation.participant_a_id === currentUserId
        ? conversation.participant_b
        : conversation.participant_a,
  } as Conversation;
}

async function fetchConversation(conversationId: string, currentUserId: string) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("conversations")
    .select(`
      *,
      property:properties(id, title, images, agent_id),
      participant_a:users!conversations_participant_a_id_fkey(id, full_name, email, avatar_url, role, company_name),
      participant_b:users!conversations_participant_b_id_fkey(id, full_name, email, avatar_url, role, company_name)
    `)
    .eq("id", conversationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? withOtherUser(data, currentUserId) : null;
}

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: async () => {
      if (!user || !isSupabaseConfigured || !supabase) return [];

      const { data, error } = await supabase
        .from("conversations")
        .select(`
          *,
          property:properties(id, title, images, agent_id),
          participant_a:users!conversations_participant_a_id_fkey(id, full_name, email, avatar_url, role, company_name),
          participant_b:users!conversations_participant_b_id_fkey(id, full_name, email, avatar_url, role, company_name)
        `)
        .or(`participant_a_id.eq.${user.id},participant_b_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw new Error(error.message);
      const unreadCounts = new Map<string, number>();
      const { data: unreadRows, error: unreadError } = await supabase
        .from("messages")
        .select("conversation_id")
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (unreadError) throw new Error(unreadError.message);

      (unreadRows ?? []).forEach((row) => {
        unreadCounts.set(row.conversation_id, (unreadCounts.get(row.conversation_id) ?? 0) + 1);
      });

      return (data ?? []).map((conversation) => withOtherUser(
        {
          ...conversation,
          unread_count: unreadCounts.get(conversation.id) ?? 0,
        },
        user.id,
      ));
    },
    enabled: !!user,
  });
}

export function useConversation(conversationId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["conversation", conversationId, user?.id],
    queryFn: async () => {
      if (!conversationId || !user || !isSupabaseConfigured || !supabase) return null;
      return fetchConversation(conversationId, user.id);
    },
    enabled: !!conversationId && !!user,
  });
}

export function useAgentDirectory() {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ["agent-directory", user?.id],
    queryFn: async () => {
      if (!user || !isSupabaseConfigured || !supabase) return [];
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, role, company_name")
        .eq("role", "agent")
        .neq("id", user.id)
        .order("full_name", { ascending: true });

      if (error) throw new Error(error.message);
      return (data ?? []) as ConversationParticipant[];
    },
    enabled: !!user && role === "agent",
  });
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    mutate: markMessagesAsRead,
  } = useMutation({
    mutationFn: async (convId: string) => {
      if (!user || !supabase) return;

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

  const markAsRead = useCallback(() => {
    if (conversationId) markMessagesAsRead(conversationId);
  }, [conversationId, markMessagesAsRead]);

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
          queryClient.setQueryData(
            ["messages", conversationId],
            (oldData: Message[] | undefined) => {
              const next = payload.new as Message;
              if (oldData?.some((message) => message.id === next.id)) return oldData;
              return oldData ? [...oldData, next] : [next];
            }
          );
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          if ((payload.new as Message).receiver_id === user?.id) {
            markAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, markAsRead, queryClient, user?.id]);

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId || !isSupabaseConfigured || !supabase) return [];

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
    mutationFn: async ({
      conversationId: convId,
      receiverId,
      message,
    }: {
      conversationId: string;
      receiverId: string;
      message: string;
    }) => {
      if (!user) throw new Error("Not logged in");
      if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");
      if (user.id === receiverId) throw new Error("You cannot send a message to yourself");

      const body = message.trim();
      if (!body) throw new Error("Message is required");

      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        receiver_id: receiverId,
        message: body,
        is_read: false,
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    sendMessage: sendMessage.mutate,
    sendMessageAsync: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
    markAsRead,
  };
}

export function useCreateConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      otherUserId,
      propertyId = null,
      initialMessage = "",
      conversationType,
      sendInitialMessage = true,
    }: CreateConversationInput) => {
      if (!user) throw new Error("Not logged in");
      if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");
      if (user.id === otherUserId) throw new Error("You cannot start a chat with yourself");

      const trimmedMessage = initialMessage.trim();
      const type: ConversationType = conversationType ?? (propertyId ? "property" : "direct");
      const [participantAId, participantBId] = orderedParticipants(user.id, otherUserId);

      let existingQuery = supabase
        .from("conversations")
        .select("id")
        .eq("conversation_type", type)
        .eq("participant_a_id", participantAId)
        .eq("participant_b_id", participantBId);

      existingQuery = type === "property"
        ? existingQuery.eq("property_id", propertyId)
        : existingQuery.is("property_id", null);

      const { data: existing, error: existingError } = await existingQuery.maybeSingle();
      if (existingError) throw new Error(existingError.message);

      const conversationId = existing?.id ?? await createConversationRow({
        currentUserId: user.id,
        otherUserId,
        participantAId,
        participantBId,
        propertyId,
        type,
        initialMessage: trimmedMessage,
      });

      if (sendInitialMessage && trimmedMessage) {
        const { error: messageError } = await supabase.from("messages").insert({
          conversation_id: conversationId,
          sender_id: user.id,
          receiver_id: otherUserId,
          message: trimmedMessage,
          is_read: false,
        });
        if (messageError) throw new Error(messageError.message);
      }

      return conversationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

async function createConversationRow({
  currentUserId,
  otherUserId,
  participantAId,
  participantBId,
  propertyId,
  type,
  initialMessage,
}: {
  currentUserId: string;
  otherUserId: string;
  participantAId: string;
  participantBId: string;
  propertyId: string | null;
  type: ConversationType;
  initialMessage: string;
}) {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      property_id: type === "property" ? propertyId : null,
      conversation_type: type,
      participant_a_id: participantAId,
      participant_b_id: participantBId,
      created_by: currentUserId,
      user_id: type === "property" ? currentUserId : participantAId,
      agent_id: type === "property" ? otherUserId : participantBId,
      last_message: initialMessage,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return conversation.id as string;
}
