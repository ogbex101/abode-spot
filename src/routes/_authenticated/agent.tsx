import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Pencil,
  Inbox,
  Plus,
  Trash2,
  Eye,
  Building2,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteProperty, useProperties } from "@/hooks/useProperties";
import { useConversations, type Conversation } from "@/hooks/useMessages";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/agent")({
  component: AgentHome,
});

function AgentHome() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const removeProperty = useDeleteProperty();
  const myProperties = useProperties({ agentId: user?.id, status: "all" });
  const conversations = useConversations();
  const [activeTab, setActiveTab] = useState("messages");

  if (role !== "agent" && role !== "admin") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">List your property on AbodeSpot</h1>
        <p className="mt-4 text-muted-foreground">Want to sell or rent out a property? Create an Agent account.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => void navigate({ to: "/register" })}>Sign up as an Agent</Button>
          <Button size="lg" variant="outline" onClick={() => void navigate({ to: "/properties" })}>Browse listings</Button>
        </div>
      </div>
    );
  }

  const properties = myProperties.data ?? [];
  const approved = properties.filter((property) => property.status === "approved").length;
  const pending = properties.filter((property) => property.status === "pending").length;
  const conversationItems = conversations.data ?? [];
  const unreadMessages = conversationItems.reduce((count, conversation) => count + conversation.unread_count, 0);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this property?")) return;
    try {
      await removeProperty.mutateAsync(id);
      toast.success("Property deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete this property. Please try again."));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Agent Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and reply from shared chat rooms.</p>
        </div>
        <Button onClick={() => void navigate({ to: "/agent/add-property" as never })} className="gap-2">
          <Plus className="h-4 w-4" /> List a Property
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total listings", value: properties.length, icon: <Building2 className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
          { label: "Live listings", value: approved, icon: <Eye className="h-4 w-4" />, color: "bg-success/10 text-success" },
          { label: "Pending", value: pending, icon: <Plus className="h-4 w-4" />, color: "bg-warning/10 text-warning-foreground" },
          { label: "Unread messages", value: unreadMessages, icon: <Inbox className="h-4 w-4" />, color: "bg-destructive/10 text-destructive" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-4">
            <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${stat.color}`}>{stat.icon}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:w-[460px]">
          <TabsTrigger value="messages" className="min-h-10 gap-2 px-3 text-xs leading-tight sm:text-sm">
            <Inbox className="h-4 w-4" /> Messages
            {unreadMessages > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-5 rounded-full px-1 text-xs">{unreadMessages}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="listings" className="min-h-10 gap-2 whitespace-normal px-3 text-center text-xs leading-tight sm:text-sm">
            <Building2 className="h-4 w-4" /> My Listings ({properties.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Chat Rooms</CardTitle>
              <CardDescription>Reply to buyers and other agents in the shared messages screen.</CardDescription>
            </CardHeader>
            <CardContent>
              {conversations.isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : conversationItems.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-4 h-12 w-12 opacity-30" />
                  <p className="font-medium">No chat rooms yet</p>
                  <p className="mt-1 text-sm">When buyers or agents message you, rooms will appear here.</p>
                  <Button className="mt-4 gap-2" onClick={() => void navigate({ to: "/messages" })}>
                    <MessageSquare className="h-4 w-4" /> Open Messages
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversationItems.map((conversation) => (
                    <AgentConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      onOpen={() => void navigate({ to: "/messages", search: { conversation: conversation.id } })}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>My Properties</CardTitle>
              <CardDescription>Manage your property listings</CardDescription>
            </CardHeader>
            <CardContent>
              {myProperties.isLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : properties.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  <Building2 className="mx-auto mb-4 h-12 w-12 opacity-30" />
                  <p className="font-medium">No listings yet.</p>
                  <Button className="mt-4" onClick={() => void navigate({ to: "/agent/add-property" as never })}>
                    Add Your First Property
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3">Property</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="hidden px-4 py-3 md:table-cell">Type</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {properties.map((property) => {
                        const location = [property.address, property.state].filter(Boolean).join(", ") || property.city || "Location not set";
                        return (
                          <tr key={property.id} className="border-t hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {property.images[0] ? (
                                  <img src={property.images[0]} alt="" className="h-10 w-14 rounded-lg object-cover" />
                                ) : (
                                  <div className="h-10 w-14 rounded-lg bg-muted" />
                                )}
                                <div className="min-w-0">
                                  <Link to="/property/$id" params={{ id: property.id }} className="font-medium hover:underline">{property.title}</Link>
                                  <div className="truncate text-xs text-muted-foreground">{location}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">{formatPrice(property.price, property.listing_type)}</td>
                            <td className="hidden px-4 py-3 capitalize md:table-cell">{property.property_type}</td>
                            <td className="px-4 py-3">
                              <Badge className={property.status === "approved" ? "bg-success/15 text-success" : "bg-warning/15"}>{property.status}</Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1">
                                <Link to="/agent/edit/$id" params={{ id: property.id }}>
                                  <Button size="sm" variant="outline" aria-label="Edit property"><Pencil className="h-3 w-3" /></Button>
                                </Link>
                                <Button size="sm" variant="ghost" className="text-destructive" aria-label="Delete property" onClick={() => void handleDelete(property.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AgentConversationCard({ conversation, onOpen }: { conversation: Conversation; onOpen: () => void }) {
  const property = conversation.property;
  const otherUser = conversation.other_user;

  return (
    <div className="rounded-lg border bg-card p-4 transition-all hover:bg-muted/30">
      <div className="flex flex-wrap gap-4">
        {property?.images?.[0] && (
          <img src={property.images[0]} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover" />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{otherUser?.full_name || otherUser?.email || "Chat room"}</p>
              {property?.title && (
                <Link to="/property/$id" params={{ id: property.id }} className="text-xs text-primary hover:underline">
                  {property.title}
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              {conversation.unread_count > 0 && <Badge>{conversation.unread_count} unread</Badge>}
              <Badge variant="outline">{conversation.conversation_type === "property" ? "Property" : "Direct"}</Badge>
            </div>
          </div>
          <p className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
            {conversation.last_message || "No messages yet"}
          </p>
        </div>
        <div className="flex flex-col justify-center gap-2">
          <Button size="sm" onClick={onOpen} className="gap-2">
            <MessageSquare className="h-3.5 w-3.5" /> Open Chat
          </Button>
        </div>
      </div>
    </div>
  );
}
