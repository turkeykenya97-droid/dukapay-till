import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { format } from "date-fns";
import { Search, Shield } from "lucide-react";

export const Route = createFileRoute("/admin/logs")({
  component: AuditLogsPage,
});

// Server function to fetch audit logs
const getAuditLogsServer = createServerFn({ method: "GET" }).handler(async () => {
  const { data: logs, error: logsError } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (logsError) throw logsError;

  // Get admin names
  const { data: admins, error: adminsError } = await supabaseAdmin
    .from("admin_users")
    .select("id, full_name, email");

  if (adminsError) throw adminsError;

  return {
    logs: logs || [],
    admins: admins || [],
  };
});

function AuditLogsPage() {
  const ctx = Route.useRouteContext();
  const getAuditLogs = useServerFn(getAuditLogsServer);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: auditData, isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => getAuditLogs(),
    refetchInterval: 30000,
  });

  // Filter logs
  const filteredLogs = (auditData?.logs || []).filter((log) => {
    const matchesSearch =
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === "all" || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getAdminName = (adminId: string) => {
    const admin = auditData?.admins?.find((a) => a.id === adminId);
    return admin?.full_name || admin?.email || "Unknown";
  };

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      EXTEND_TRIAL: "bg-blue-100 text-blue-800",
      SUSPEND_ACCOUNT: "bg-red-100 text-red-800",
      REACTIVATE_ACCOUNT: "bg-green-100 text-green-800",
      CHANGE_PLAN: "bg-purple-100 text-purple-800",
      RESET_TRANSACTION_COUNT: "bg-yellow-100 text-yellow-800",
    };
    return actionColors[action] || "bg-slate-100 text-slate-800";
  };

  // Get unique actions for filter
  const uniqueActions = Array.from(new Set((auditData?.logs || []).map((l) => l.action)));

  return (
    <AdminLayout
      adminEmail={ctx.session?.email}
      adminName={ctx.session?.email?.split("@")[0]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Audit Logs</h1>
            <p className="text-slate-600 mt-2">Complete record of all admin actions</p>
          </div>
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Append-only (immutable)
          </div>
        </div>

        {/* Search & Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by action or target ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={actionFilter === "all" ? "default" : "outline"}
                onClick={() => setActionFilter("all")}
              >
                All Actions
              </Button>
              {uniqueActions.map((action) => (
                <Button
                  key={action}
                  size="sm"
                  variant={actionFilter === action ? "default" : "outline"}
                  onClick={() => setActionFilter(action)}
                >
                  {action}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log ({filteredLogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Target ID</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium">
                            {getAdminName(log.admin_id ?? "")}
                          </TableCell>
                          <TableCell>
                            <Badge className={getActionBadge(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {log.target_type
                              ? log.target_type.charAt(0).toUpperCase() + log.target_type.slice(1)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {log.target_id}
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.details && typeof log.details === "object" && (
                              <details className="cursor-pointer">
                                <summary className="text-blue-600 hover:underline">
                                  View
                                </summary>
                                <pre className="mt-2 p-2 bg-slate-50 rounded text-xs overflow-auto max-w-xs">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                            {log.created_at
                              ? format(new Date(log.created_at), "MMM d, HH:mm:ss")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About Audit Logs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>
              • All admin actions are automatically logged and cannot be deleted or modified
            </p>
            <p>
              • Logs include who performed the action, what was changed, and when it happened
            </p>
            <p>• Logs are retained for compliance and security purposes</p>
            <p>
              • Use these logs to audit admin activity and investigate any suspicious actions
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
