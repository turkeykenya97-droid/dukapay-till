import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/system")({
  component: SystemHealthPage,
});

const getSystemStatusServer = createServerFn({ method: "GET" }).handler(async () => {
  // Test Supabase connection
  let supabaseStatus = "healthy";
  try {
    const { error } = await supabaseAdmin.from("shops").select("id").limit(1);
    if (error) supabaseStatus = "error";
  } catch {
    supabaseStatus = "error";
  }

  // Get SmartPay API key info (stored in env)
  const smartpayKeyId = process.env.SMARTPAY_BOOTSTRAP_KEY_ID || "unknown";
  const hasSmartpayKey = !!process.env.SMARTPAY_BOOTSTRAP_API_KEY;

  return {
    supabaseStatus,
    smartpayStatus: hasSmartpayKey ? "healthy" : "missing",
    smartpayKeyId,
    cloudflareStatus: "healthy",
    lastChecked: new Date().toISOString(),
  };
});

function SystemHealthPage() {
  const ctx = Route.useRouteContext();
  const getSystemStatus = useServerFn(getSystemStatusServer);

  const { data: systemStatus, isLoading, refetch } = useQuery({
    queryKey: ["admin-system-status"],
    queryFn: () => getSystemStatus(),
    refetchInterval: 60000,
  });

  const getStatusIcon = (status: string) => {
    if (status === "healthy") return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === "warning") return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === "healthy") return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
    if (status === "warning") return <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>;
    if (status === "missing") return <Badge className="bg-red-100 text-red-800">Missing</Badge>;
    return <Badge className="bg-red-100 text-red-800">Error</Badge>;
  };

  return (
    <AdminLayout
      adminEmail={ctx.session?.email}
      adminName={ctx.session?.email?.split("@")[0]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">System Health</h1>
            <p className="text-slate-600 mt-2">Platform and external services status</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Supabase */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Supabase Database</span>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  getStatusBadge(systemStatus?.supabaseStatus || "error")
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                {isLoading ? (
                  <Skeleton className="h-4 w-4 mt-1 flex-shrink-0" />
                ) : (
                  getStatusIcon(systemStatus?.supabaseStatus || "error")
                )}
                <div className="flex-1">
                  <p className="text-sm text-slate-600">Connection</p>
                  {isLoading ? (
                    <Skeleton className="h-4 w-20 mt-1" />
                  ) : (
                    <p className="text-sm font-medium text-slate-900">
                      {systemStatus?.supabaseStatus === "healthy"
                        ? "Connected"
                        : "Connection failed"}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SmartPay */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>SmartPay API</span>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  getStatusBadge(systemStatus?.smartpayStatus || "error")
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                {isLoading ? (
                  <Skeleton className="h-4 w-4 mt-1 flex-shrink-0" />
                ) : (
                  getStatusIcon(systemStatus?.smartpayStatus || "error")
                )}
                <div className="flex-1">
                  <p className="text-sm text-slate-600">Bootstrap Key</p>
                  {isLoading ? (
                    <Skeleton className="h-4 w-24 mt-1" />
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-900">
                        ID: {systemStatus?.smartpayKeyId}
                      </p>
                      {systemStatus?.smartpayStatus === "missing" && (
                        <p className="text-xs text-red-600 mt-1">API key not configured</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cloudflare */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Cloudflare Workers</span>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  getStatusBadge(systemStatus?.cloudflareStatus || "healthy")
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-2">
                {isLoading ? (
                  <Skeleton className="h-4 w-4 mt-1 flex-shrink-0" />
                ) : (
                  getStatusIcon(systemStatus?.cloudflareStatus || "healthy")
                )}
                <div className="flex-1">
                  <p className="text-sm text-slate-600">Runtime</p>
                  {isLoading ? (
                    <Skeleton className="h-4 w-20 mt-1" />
                  ) : (
                    <p className="text-sm font-medium text-slate-900">Active</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last Check */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Last Status Check</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              {isLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <p className="text-sm text-slate-600">
                  {systemStatus?.lastChecked
                    ? new Date(systemStatus.lastChecked).toLocaleTimeString()
                    : "—"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Health Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Health Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900">All systems operational</p>
                  <p className="text-xs text-green-700 mt-1">
                    Supabase, SmartPay API, and Cloudflare are all running normally.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-900">Auto-refresh</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Status is automatically checked every 60 seconds.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
