import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { MOCK_INQUIRIES, MOCK_PROPERTIES } from "@/lib/mock-data";
import type { Inquiry, InquiryStatus } from "@/lib/types";
import { toAppError } from "@/lib/errors";

export function useInquiries(opts: { scope: "user" | "admin" | "agent" } = { scope: "user" }) {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ["inquiries", opts.scope, user?.id ?? "anon"],
    queryFn: async () => {
      // ── MOCK MODE ─────────────────────────────────────────────────────────────
      if (!isSupabaseConfigured || !supabase) {
        if (opts.scope === "admin") return MOCK_INQUIRIES;
        if (opts.scope === "agent") {
          return MOCK_INQUIRIES;
        }
        return MOCK_INQUIRIES.filter((i) => i.user_id === "user-demo");
      }

      // ── AGENT: inquiries sent TO this agent (including replies) ────────────────
      if (opts.scope === "agent" && user) {
        console.log("🔍 Agent ID:", user.id);
        
        // Get all inquiries where agent_id matches (both original and replies)
        const { data: inquiries, error: inquiriesError } = await supabase
          .from("inquiries")
          .select(`
            *,
            property:properties (
              id, 
              title, 
              city, 
              state, 
              images, 
              price, 
              listing_type, 
              address, 
              agent_id
            ),
            user:users!inquiries_user_id_fkey(id, full_name, email, phone),
            agent:users!inquiries_agent_id_fkey(id, full_name, email, phone),
            parent_inquiry:inquiries!parent_inquiry_id(
              id,
              message,
              created_at,
              user:users!inquiries_user_id_fkey(id, full_name, email)
            )
          `)
          .eq("agent_id", user.id)
          .order("created_at", { ascending: false });

        if (inquiriesError) {
          console.error("❌ Inquiries error:", inquiriesError);
          throw toAppError(inquiriesError, "Could not load inquiries. Please try again.");
        }
        
        if (!inquiries || inquiries.length === 0) {
          console.log("No inquiries found for agent");
          return [];
        }
        
        console.log(`Found ${inquiries.length} inquiries for agent`);
        
        // Get unique user IDs from inquiries (for sender info)
        const userIds = [...new Set(inquiries.map(i => i.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          // Fetch user details separately
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, full_name, email, phone")
            .in("id", userIds);
            
          if (!usersError && users) {
            const userMap = new Map(users.map(u => [u.id, u]));
            const enrichedInquiries = inquiries.map(inquiry => ({
              ...inquiry,
              user: userMap.get(inquiry.user_id)
            }));
            return enrichedInquiries as Inquiry[];
          }
        }
        
        return inquiries as Inquiry[];
      }

      // ── USER: their own sent inquiries AND replies to them ────────────────────
      if (opts.scope === "user" && user) {
        // Get all inquiries where user is sender OR user is receiving replies
        const { data, error } = await supabase
          .from("inquiries")
          .select(`
            *,
            property:properties(id, title, city, state, images, price, listing_type),
            user:users!inquiries_user_id_fkey(id, full_name, email, phone),
            agent:users!inquiries_agent_id_fkey(id, full_name, email, phone),
            parent_inquiry:inquiries!parent_inquiry_id(
              id,
              message,
              created_at,
              user:users!inquiries_user_id_fkey(id, full_name, email),
              agent:users!inquiries_agent_id_fkey(id, full_name, email)
            ),
            replies:inquiries!parent_inquiry_id(
              id,
              message,
              created_at,
              status,
              user:users!inquiries_user_id_fkey(id, full_name, email, role),
              agent:users!inquiries_agent_id_fkey(id, full_name, email, role)
            )
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("❌ User inquiries error:", error);
          throw toAppError(error, "Could not load inquiries. Please try again.");
        }
        
        // Count replies for each inquiry
        const inquiriesWithReplyCount = (data || []).map(inquiry => {
          const replyCount = (inquiry.replies || []).length;
          const hasAgentReply = (inquiry.replies || []).some(
            (reply: any) => reply.agent_id === inquiry.agent_id
          );
          return {
            ...inquiry,
            reply_count: replyCount,
            has_agent_reply: hasAgentReply,
            status: hasAgentReply ? "replied" : inquiry.status
          };
        });
        
        return inquiriesWithReplyCount as Inquiry[];
      }

      // ── ADMIN: all inquiries ───────────────────────────────────────────────────
      const { data: inquiries, error: inquiriesError } = await supabase
        .from("inquiries")
        .select(`
          *,
          property:properties(id, title, city, state, images, agent_id),
          user:users!inquiries_user_id_fkey(id, full_name, email, phone),
          agent:users!inquiries_agent_id_fkey(id, full_name, email, phone),
          parent_inquiry:inquiries!parent_inquiry_id(
            id,
            message,
            created_at,
            user:users!inquiries_user_id_fkey(id, full_name, email)
          ),
          replies:inquiries!parent_inquiry_id(
            id,
            message,
            created_at,
            status,
            user:users!inquiries_user_id_fkey(id, full_name, email, role),
            agent:users!inquiries_agent_id_fkey(id, full_name, email, role)
          )
        `)
        .order("created_at", { ascending: false });

      if (inquiriesError) throw toAppError(inquiriesError, "Could not load inquiries. Please try again.");
      
      if (!inquiries || inquiries.length === 0) return [];
      
      // Get unique user IDs and agent IDs
      const userIds = [...new Set(inquiries.map(i => i.user_id).filter(Boolean))];
      const agentIds = [...new Set(inquiries.map(i => i.agent_id).filter(Boolean))];
      const allPersonIds = [...new Set([...userIds, ...agentIds])];
      
      if (allPersonIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, email, phone")
          .in("id", allPersonIds);
          
        if (!usersError && users) {
          const userMap = new Map(users.map(u => [u.id, u]));
          const enrichedInquiries = inquiries.map(inquiry => ({
            ...inquiry,
            user: userMap.get(inquiry.user_id),
            agent: userMap.get(inquiry.agent_id)
          }));
          return enrichedInquiries as Inquiry[];
        }
      }
      
      return inquiries as Inquiry[];
    },
    enabled: !!user || opts.scope === "admin",
  });
}

export function useCreateInquiry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ propertyId, message }: { propertyId: string; message: string }) => {
      if (!user) throw new Error("You must be signed in to send an inquiry");
      if (!isSupabaseConfigured || !supabase) {
        await new Promise((r) => setTimeout(r, 500));
        return;
      }
      
      // Get the property's agent_id
      const { data: property, error: propError } = await supabase
        .from("properties")
        .select("agent_id, title")
        .eq("id", propertyId)
        .single();
      
      if (propError) throw new Error("Property not found");
      if (!property.agent_id) throw new Error("This property doesn't have an assigned agent");
      
      // Create parent inquiry (not a reply)
      const { data, error } = await supabase
        .from("inquiries")
        .insert({ 
          property_id: propertyId, 
          user_id: user.id,
          agent_id: property.agent_id,
          message: message.trim(),
          status: "unread",
          is_reply: false,
          parent_inquiry_id: null
        })
        .select();
        
      if (error) throw toAppError(error, "Could not send your inquiry. Please try again.");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}

export function useSendReply() {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      parentInquiryId, 
      propertyId, 
      agentId, 
      message 
    }: { 
      parentInquiryId: string; 
      propertyId: string; 
      agentId: string; 
      message: string;
    }) => {
      if (!user) throw new Error("You must be signed in to send a reply");
      if (!isSupabaseConfigured || !supabase) throw toAppError("Supabase not configured");
      
      // Get the original inquiry to verify it exists
      const { data: parentInquiry, error: parentError } = await supabase
        .from("inquiries")
        .select("agent_id, user_id, property_id")
        .eq("id", parentInquiryId)
        .single();
      
      if (parentError) throw new Error("Original inquiry not found");
      
      // Determine receiver (if user is replying, send to agent; if agent is replying, send to user)
      const isAgentReplying = user.id === agentId;
      const receiverId = isAgentReplying ? parentInquiry.user_id : parentInquiry.agent_id;
      
      // Insert reply as a new inquiry linked to parent
      const { error: insertError } = await supabase
        .from("inquiries")
        .insert({
          property_id: propertyId,
          user_id: isAgentReplying ? parentInquiry.user_id : user.id,
          agent_id: agentId,
          message: message.trim(),
          status: "unread",
          parent_inquiry_id: parentInquiryId,
          is_reply: true
        });
      
      if (insertError) throw toAppError(insertError, "Could not send your reply. Please try again.");
      
      // Update parent inquiry status to indicate there's a reply
      await supabase
        .from("inquiries")
        .update({ status: "read" })
        .eq("id", parentInquiryId);
        
      // If agent is replying, also update the original inquiry status to "replied"
      if (isAgentReplying) {
        await supabase
          .from("inquiries")
          .update({ status: "replied" })
          .eq("id", parentInquiryId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
    },
    onError: (error: Error) => {
      console.error("Send reply error:", error);
    },
  });
}

export function useUpdateInquiryStatus() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: InquiryStatus }) => {
      if (!isSupabaseConfigured || !supabase) {
        await new Promise((r) => setTimeout(r, 300));
        return;
      }
      const { error } = await supabase
        .from("inquiries")
        .update({ status })
        .eq("id", id);
      if (error) throw toAppError(error, "Could not update this inquiry. Please try again.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}

export function useGetConversation(inquiryId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["conversation", inquiryId],
    queryFn: async () => {
      if (!inquiryId) return [];
      if (!isSupabaseConfigured || !supabase) return [];
      
      // Fetch the original inquiry and all its replies
      const { data, error } = await supabase
        .from("inquiries")
        .select(`
          *,
          user:users!inquiries_user_id_fkey(id, full_name, email, role),
          agent:users!inquiries_agent_id_fkey(id, full_name, email, role),
          property:properties(id, title, images)
        `)
        .or(`id.eq.${inquiryId},parent_inquiry_id.eq.${inquiryId}`)
        .order("created_at", { ascending: true });
      
      if (error) throw toAppError(error, "Could not load this conversation. Please try again.");
      
      // Mark unread messages as read if current user is the receiver
      const unreadMessages = data?.filter(
        msg => msg.receiver_id === user?.id && msg.status === "unread"
      );
      
      if (unreadMessages && unreadMessages.length > 0) {
        for (const msg of unreadMessages) {
          await supabase
            .from("inquiries")
            .update({ status: "read" })
            .eq("id", msg.id);
        }
      }
      
      return data || [];
    },
    enabled: !!inquiryId,
  });
}

export function useDeleteInquiry() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (inquiryId: string) => {
      if (!isSupabaseConfigured || !supabase) {
        await new Promise((r) => setTimeout(r, 300));
        return;
      }
      
      // Delete all replies first (cascade should handle this, but just to be safe)
      const { error: repliesError } = await supabase
        .from("inquiries")
        .delete()
        .eq("parent_inquiry_id", inquiryId);
      
      if (repliesError) throw toAppError(repliesError, "Could not delete this inquiry. Please try again.");
      
      // Delete the main inquiry
      const { error } = await supabase
        .from("inquiries")
        .delete()
        .eq("id", inquiryId);
      
      if (error) throw toAppError(error, "Could not delete this inquiry. Please try again.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}

export function useUnreadCount() {
  const { user, role } = useAuth();
  
  return useQuery({
    queryKey: ["unreadCount", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      if (!isSupabaseConfigured || !supabase) return 0;
      
      let query = supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "unread");
      
      if (role === "agent") {
        query = query.eq("agent_id", user.id);
      } else if (role === "user") {
        query = query.eq("user_id", user.id);
      }
      
      const { count, error } = await query;
      if (error) throw toAppError(error, "Could not load unread count. Please try again.");
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
