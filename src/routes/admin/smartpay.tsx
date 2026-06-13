import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/smartpay")({
  component: SmartPayPage,
});

const getSmartPayStatusServer = createServerFn({ method: "GET" }).handler(async () => {
  const bootstrapKeyId = process.env.SMARTPAY_BOOTSTRAP_KEY_ID || "unknown";
  
  // Get all merchant keys from shops table
  const { data: shops, error } = await supabaseAdmin
    .from("shops")
    .select("id, shop_name, payment_channel_id, payment_api_key")
    .not("payment_api_key", "is", null);

  if (error) throw error;

  return {
    bootstrapKeyId,
    bootstrapStatus: "active",
    callsRemaining: 850, // This would be fetched from SmartPay API in production
    subscription: {
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      daysUntilExpiry: 180,
    },
    fraudSuspended: false,
    merchantKeys: shops || [],
  };
});

function SmartPayPage() {
  const ctx = Route.useRouteContext();
  const getSmartPayStatus = useServerFn(getSmartPayStatusServer);

  const { data: smartPayData, isLoading, refetch } = useQuery({
    queryKey: ["admin-smartpay"],
    queryFn: () => getSmartPayStatus(),
    refetchInterval: 120000,
  });

  const callsPercentage =
    smartPayData && smartPayData.callsRemaining
      ? (smartPayData.callsRemaining / 1000) * 100
      : 0;

  return (
    <AdminLayout
      adminEmail={ctx.session?.email}
      adminName={ctx.session?.email?.split("@")[0]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">SmartPay Monitor</h1>
            <p className="text-slate-600 mt-2">Bootstrap API key and merchant keys status</p>
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

        {/* Alerts */}
        {smartPayData && smartPayData.callsRemaining < 100 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 ml-2">
              API calls remaining is below 100. Consider renewing subscription soon.
            </AlertDescription>
          </Alert>
        )}

        {smartPayData && smartPayData.fraudSuspended && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 ml-2">
              Bootstrap key is fraud suspended. Contact SmartPay support immediately.
            </AlertDescription>
          </Alert>
        )}

        {/* Bootstrap Key Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Bootstrap Key Status</span>
              {isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600">Key ID</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <p className="text-lg font-mono font-bold text-slate-900">
                    {smartPayData?.bootstrapKeyId}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-slate-600">API Calls Remaining</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <>
                    <p className="text-lg font-bold text-slate-900">
                      {smartPayData?.callsRemaining} / 1000
                    </p>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-colors ${
                          callsPercentage < 10
                            ? "bg-red-600"
                            : callsPercentage < 50
                              ? "bg-yellow-600"
                              : "bg-green-600"
                        }`}
                        style={{ width: `${callsPercentage}%` }}
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <p className="text-sm text-slate-600">Subscription Expiry</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-28 mt-1" />
                ) : (
                  <>
                    <p className="text-lg font-bold text-slate-900">
                      {smartPayData?.subscription.daysUntilExpiry} days
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {smartPayData?.subscription.expiryDate
                        ? new Date(smartPayData.subscription.expiryDate).toLocaleDateString()
                        : "—"}
                    </p>
                  </>
                )}
              </div>

              <div>
                <p className="text-sm text-slate-600">Status</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20 mt-1" />
                ) : (
                  <p className="text-lg font-bold text-slate-900">
                    {smartPayData?.fraudSuspended ? (
                      <span className="text-red-600">Fraud Suspended</span>
                    ) : (
                      <span className="text-green-600">Active</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open("https://dashboard.smartpay.co.ke", "_blank")}
              >
                SmartPay Dashboard <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Merchant Keys */}
        <Card>
          <CardHeader>
            <CardTitle>Merchant Sub-Keys ({(smartPayData?.merchantKeys || []).length})</CardTitle>
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
                      <TableHead>Key ID</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Destination</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(smartPayData?.merchantKeys || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                          No merchant keys found
                        </TableCell>
                      </TableRow>
                    ) : (
                      (smartPayData?.merchantKeys || []).map((key) => (
                        <TableRow key={key.id}>
                          <TableCell className="font-mono text-sm">
                            {key.payment_channel_id}
                          </TableCell>
                          <TableCell>{key.shop_name}</TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          </TableCell>
                          <TableCell>{key.payment_channel_id}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
