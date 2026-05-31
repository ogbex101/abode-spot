import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  Search, MoreHorizontal, Shield, User as UserIcon, Briefcase,
  CheckCircle2, XCircle, Mail, Calendar, Filter
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppUser, AppRole } from "@/lib/types";
import { MOCK_AGENT } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/_admin/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");
  const queryClient = useQueryClient();

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      if (!isSupabaseConfigured || !supabase) return [MOCK_AGENT] as AppUser[];

      // Join user_roles — this is the authoritative role source (same as useAuth)
      const { data, error } = await supabase
        .from("users")
        .select("*, user_roles(role)")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      // Resolve effective role: admin > agent > user
      return (data ?? []).map((u: AppUser & { user_roles?: { role: AppRole }[] }) => {
        const roles = (u.user_roles ?? []).map((r) => r.role);
        const resolvedRole: AppRole = roles.includes("admin")
          ? "admin"
          : roles.includes("agent")
          ? "agent"
          : "user";
        return { ...u, role: resolvedRole } as AppUser;
      });
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AppRole }) => {
      if (!supabase) throw new Error("Not connected");

      // Update display column in users table
      const { error: userErr } = await supabase.from("users").update({ role }).eq("id", id);
      if (userErr) throw new Error(userErr.message);

      // Always ensure base 'user' role exists
      await supabase
        .from("user_roles")
        .upsert({ user_id: id, role: "user" }, { onConflict: "user_id,role" });

      // Add the new role
      const { error: roleErr } = await supabase
        .from("user_roles")
        .upsert({ user_id: id, role }, { onConflict: "user_id,role" });
      if (roleErr) throw new Error(roleErr.message);

      // Remove higher roles when downgrading
      if (role === "user") {
        await supabase.from("user_roles").delete().eq("user_id", id).in("role", ["agent", "admin"]);
      }
      if (role === "agent") {
        await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_users"] }); toast.success("Role updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleVerified = useMutation({
    mutationFn: async ({ id, is_verified }: { id: string; is_verified: boolean }) => {
      if (!supabase) throw new Error("Not connected");
      const { error } = await supabase.from("users").update({ is_verified }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin_users"] }); toast.success("Verification updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = allUsers.filter((u) => {
    const matchSearch =
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchVerified =
      verifiedFilter === "all" ||
      (verifiedFilter === "verified" && u.is_verified) ||
      (verifiedFilter === "unverified" && !u.is_verified);
    return matchSearch && matchRole && matchVerified;
  });

  const admins = allUsers.filter((u) => u.role === "admin").length;
  const agents = allUsers.filter((u) => u.role === "agent").length;
  const regularUsers = allUsers.filter((u) => u.role === "user").length;
  const verified = allUsers.filter((u) => u.is_verified).length;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: allUsers.length, icon: <UserIcon className="h-4 w-4" />, color: "bg-primary/10 text-primary" },
          { label: "Agents", value: agents, icon: <Briefcase className="h-4 w-4" />, color: "bg-blue-100 text-blue-600" },
          { label: "Admins", value: admins, icon: <Shield className="h-4 w-4" />, color: "bg-accent/15 text-accent-foreground" },
          { label: "Verified", value: verified, icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-success/15 text-success" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-2xl border bg-card p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | "all")}>
          <SelectTrigger className="w-36">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={verifiedFilter} onValueChange={(v) => setVerifiedFilter(v as "all" | "verified" | "unverified")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Verification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="verified">Verified only</SelectItem>
            <SelectItem value="unverified">Unverified only</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center text-sm text-muted-foreground">
          {filtered.length} of {allUsers.length} users
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground tracking-wide">
            <tr>
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5 hidden md:table-cell">Role</th>
              <th className="px-5 py-3.5 hidden md:table-cell">Verification</th>
              <th className="px-5 py-3.5 hidden lg:table-cell">Joined</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                  <div className="flex justify-center items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    Loading users…
                  </div>
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                  <UserIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No users found
                </td>
              </tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {(u.full_name ?? u.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{u.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />{u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  {u.is_verified ? (
                    <span className="flex items-center gap-1.5 text-success text-xs font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                      <XCircle className="h-3.5 w-3.5" /> Pending
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 hidden lg:table-cell">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />{formatDate(u.created_at)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl">
                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                          {u.full_name ?? u.email}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs">Change role</DropdownMenuLabel>
                        {(["admin", "agent", "user"] as AppRole[]).filter((r) => r !== u.role).map((r) => (
                          <DropdownMenuItem
                            key={r}
                            className="gap-2 cursor-pointer capitalize"
                            onClick={() => updateRole.mutate({ id: u.id, role: r })}
                          >
                            <RoleIcon role={r} /> Make {r}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => toggleVerified.mutate({ id: u.id, is_verified: !u.is_verified })}
                        >
                          {u.is_verified
                            ? <><XCircle className="h-4 w-4 text-destructive" /> Revoke verification</>
                            : <><CheckCircle2 className="h-4 w-4 text-success" /> Verify user</>
                          }
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: AppRole }) {
  const map = {
    admin: "bg-accent/20 text-accent-foreground border-accent/30",
    agent: "bg-blue-100 text-blue-700 border-blue-200",
    user: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${map[role]}`}>
      <RoleIcon role={role} /> {role}
    </span>
  );
}

function RoleIcon({ role }: { role: AppRole }) {
  if (role === "admin") return <Shield className="h-3 w-3" />;
  if (role === "agent") return <Briefcase className="h-3 w-3" />;
  return <UserIcon className="h-3 w-3" />;
}
