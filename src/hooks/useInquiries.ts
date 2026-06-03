import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { MOCK_INQUIRIES, MOCK_PROPERTIES } from "@/lib/mock-data";
import type { Inquiry, InquiryStatus } from "@/lib/types";

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
        
        // Get all inquiries for this agent (both root and replies)
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
            )
          `)
          .eq("agent_id", user.id)
          .order("created_at", { ascending: false });

        if (inquiriesError) {
          console.error("❌ Inquiries error:", inquiriesError);
          throw new Error(inquiriesError.message);
        }
        
        if (!inquiries || inquiries.length === 0) {
          console.log("No inquiries found for agent");
          return [];
        }
        
        console.log(`Found ${inquiries.length} inquiries for agent`);
        
        // Get unique user IDs from inquiries (both sender and potential repliers)
        const userIds = [...new Set(inquiries.map(i => i.user_id).filter(Boolean))];
        
        if (userIds.length === 0) {
          return inquiries as Inquiry[];
        }
        
        // Fetch user details separately
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, full_name, email, phone")
          .in("id", userIds);
          
        if (usersError) {
          console.warn("Could not fetch users:", usersError);
          return inquiries as Inquiry[];
        }
        
        // Combine the data
        const userMap = new Map(users?.map(u => [u.id, u]) || []);
        const enrichedInquiries = inquiries.map(inquiry => ({
          ...inquiry,
          user: userMap.get(inquiry.user_id)
        }));
        
        console.log("Enriched inquiries:", enrichedInquiries.length);
        return enrichedInquiries as Inquiry[];
      }

      // ── USER: their own sent inquiries AND replies to their inquiries ──────────
      if (opts.scope === "user" && user) {
        // Get root inquiries (user's original messages)
        const { data: userInquiries, error: userError } = await supabase
          .from("inquiries")
          .select(`
            *,
            property:properties(id, title, city, state, images, price, listing_type)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (userError) throw new Error(userError.message);
        
        // Get replies to user's inquiries (where user is not the sender but agent replied)
        const { data: repliesToUser, error: repliesError } = await supabase
          .from("inquiries")
          .select(`
            *,
            property:properties(id, title, city, state, images, price, listing_type)
          `)
          .eq("agent_id", user.id)
          .eq("is_reply", true)
          .order("created_at", { ascending: false });
          
        if (repliesError) console.warn("Could not fetch replies:", repliesError);
        
        // Combine and deduplicate
        const allInquiries = [...(userInquiries || []), ...(repliesToUser || [])];
        const uniqueMap = new Map();
        allInquiries.forEach(inq => uniqueMap.set(inq.id, inq));
        
        return Array.from(uniqueMap.values()) as Inquiry[];
      }

      // ── ADMIN: all inquiries (including reply threads) ─────────────────────────
      const { data: inquiries, error: inquiriesError } = await supabase
        .from("inquiries")
        .select(`
          *,
          property:properties(id, title, city, state, images, agent_id)
        `)
        .order("created_at", { ascending: false });

      if (inquiriesError) throw new Error(inquiriesError.message);
      
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
      
      const { error } = await supabase
        .from("inquiries")
        .insert({ 
          property_id: propertyId, 
          user_id: user.id,
          agent_id: property.agent_id,
          message,
          status: "unread",
          is_reply: false,
          parent_inquiry_id: null
        });
        
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
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
      const { error } = await supabase.from("inquiries").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
  });
}

// NEW: Reply to an existing inquiry
export function useReplyToInquiry() {
  const { user } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      parentInquiryId, 
      message, 
      agentId, 
      userId, 
      propertyId 
    }: { 
      parentInquiryId: string; 
      message: string; 
      agentId: string;
      userId: string;
      propertyId: string;
    }) => {
      if (!user) throw new Error("Not logged in");
      if (!isSupabaseConfigured || !supabase) throw new Error("Supabase not configured");
      
      // Determine who is sending the reply
      const isAgent = user.id === agentId;
      
      // The sender is the current user, receiver is the other party
      const senderId = user.id;
      const receiverId = isAgent ? userId : agentId;
      
      // Insert the reply as a new inquiry record
      const { data, error } = await supabase
        .from("inquiries")
        .insert({
          property_id: propertyId,
          user_id: senderId,
          agent_id: agentId,
          parent_inquiry_id: parentInquiryId,
          is_reply: true,
          message: message.trim(),
          status: "unread"
        })
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      // Update the parent inquiry status to 'replied' if it's a reply
      await supabase
        .from("inquiries")
        .update({ status: "replied" })
        .eq("id", parentInquiryId);
      
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}

// NEW: Get replies for a specific inquiry
export function useInquiryReplies(inquiryId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["inquiry-replies", inquiryId],
    queryFn: async () => {
      if (!inquiryId) return [];
      if (!isSupabaseConfigured || !supabase) return [];
      
      const { data, error } = await supabase
        .from("inquiries")
        .select(`
          *,
          user:users!inquiries_user_id_fkey(id, full_name, email),
          agent:users!inquiries_agent_id_fkey(id, full_name, email)
        `)
        .eq("parent_inquiry_id", inquiryId)
        .order("created_at", { ascending: true });
        
      if (error) throw new Error(error.message);
      return data || [];
    },
    enabled: !!inquiryId && !!user,
  });
}

// NEW: Get full conversation thread (parent + all replies)
export function useInquiryThread(inquiryId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["inquiry-thread", inquiryId],
    queryFn: async () => {
      if (!inquiryId) return null;
      if (!isSupabaseConfigured || !supabase) return null;
      
      // Get the parent inquiry
      const { data: parent, error: parentError } = await supabase
        .from("inquiries")
        .select(`
          *,
          property:properties(id, title, city, state, images),
          user:users!inquiries_user_id_fkey(id, full_name, email),
          agent:users!inquiries_agent_id_fkey(id, full_name, email)
        `)
        .eq("id", inquiryId)
        .single();
        
      if (parentError) throw new Error(parentError.message);
      
      // Get all replies
      const { data: replies, error: repliesError } = await supabase
        .from("inquiries")
        .select(`
          *,
          user:users!inquiries_user_id_fkey(id, full_name, email),
          agent:users!inquiries_agent_id_fkey(id, full_name, email)
        `)
        .eq("parent_inquiry_id", inquiryId)
        .order("created_at", { ascending: true });
        
      if (repliesError) throw new Error(repliesError.message);
      
      return {
        ...parent,
        replies: replies || []
      };
    },
    enabled: !!inquiryId && !!user,
  });
}

// NEW: Mark all replies in a thread as read
export function useMarkThreadAsRead() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ parentInquiryId, userId }: { parentInquiryId: string; userId: string }) => {
      if (!isSupabaseConfigured || !supabase) return;
      
      const { error } = await supabase
        .from("inquiries")
        .update({ status: "read" })
        .eq("parent_inquiry_id", parentInquiryId)
        .eq("agent_id", userId);
        
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
    },
  });
}
