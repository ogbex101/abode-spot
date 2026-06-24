import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
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
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteProperty, useProperties } from "@/hooks/useProperties";
import { useConversations } from "@/hooks/useMessages";
import { ConversationListItem } from "@/components/messages/ConversationListItem";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";

export const Route = createFileRoute("/_authenticated/agent")({
  component: AgentHome,
});

function AgentHome() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (state) => state.location.pathname });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role !== "agent" && role !== "admin" && role !== "pending_agent") {
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

  if (path !== "/agent" && path !== "/agent/") return <Outlet />;

  return <AgentDashboard />;
}

function AgentDashboard() {
  const { user, role, profile } = useAuth();
  const navigate = useNavigate();
  const removeProperty = useDeleteProperty();
  const myProperties = useProperties({ agentId: user?.id, status: "all" });
  const conversations = useConversations();
  const [activeTab, setActiveTab] = useState("messages");
  const isPendingAgent = role === "pending_agent";
  const properties = myProperties.data ?? [];
  const liveListings = properties.filter((property) => property.status !== "sold").length;
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

  const handleListProperty = () => {
    if (isPendingAgent) {
      toast.info("Your agent account is awaiting approval. You can list properties after an admin approves you.");
      return;
    }
    void navigate({ to: "/agent/add-property" });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      {isPendingAgent && (
        <div className="mb-8 rounded-2xl border border-warning/40 bg-warning/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold">Your agent account is awaiting admin approval</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You can view your Agent Portal while we review {profile?.company_name || "your profile"}. Listing properties and agent chat features unlock once an admin approves your application.
              </p>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Property posting is locked</div>
                <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Chat creation and replies are locked</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Agent Dashboard</h1>
          <p className="text-muted-foreground">Manage your listings and reply from shared chat rooms.</p>
        </div>
        <Button onClick={handleListProperty} className="gap-2" variant={isPendingAgent ? "outline" : "default"}>
          {isPendingAgent ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />} List a Property
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total listings", value: properties.length, icon: <Building2 className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
          { label: "Live listings", value: liveListings, icon: <Eye className="h-4 w-4" />, color: "bg-success/10 text-success" },
          { label: "Chat rooms", value: conversationItems.length, icon: <MessageSquare className="h-4 w-4" />, color: "bg-accent/15 text-accent-foreground" },
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
              {isPendingAgent ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Lock className="mx-auto mb-4 h-10 w-10 opacity-40" />
                  <p className="font-medium">Chat rooms unlock after approval</p>
                  <p className="mx-auto mt-1 max-w-md text-sm">You cannot start, send, or reply to chats until an admin approves your agent account.</p>
                </div>
              ) : conversations.isLoading ? (
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
                    <ConversationListItem
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
                  <Button className="mt-4 gap-2" variant={isPendingAgent ? "outline" : "default"} onClick={handleListProperty}>
                    {isPendingAgent && <Lock className="h-4 w-4" />}
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
