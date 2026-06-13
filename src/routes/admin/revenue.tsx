import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { getAdminSessionServer } from "@/lib/admin-auth.server";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { subMonths } from "date-fns";
import { DollarSign, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/admin/revenue")({
  beforeLoad: async () => {
    const session = await getAdminSessionServer();
    if (!session) throw new Error("Not authenticated");
    return { session };
  },
  component: RevenuePage,
});

// Server function to fetch revenue data
const getRevenueDataServer = createServerFn({ method: "GET" }).handler(async () => {
  // Get all subscription payments
  const { data: payments, error: paymentsError } = await supabaseAdmin
    .from("subscription_payments")
    .select("id, amount, payment_status, plan, created_at, shop_id");

  if (paymentsError) throw paymentsError;

  // Get shops for merchant details
  const { data: shops, error: shopsError } = await supabaseAdmin
    .from("shops")
    .select("id, shop_name, phone, plan, subscription_status");

  if (shopsError) throw shopsError;

  // Calculate metrics
  const completedPayments = payments?.filter((p) => p.payment_status === "completed") || [];
  const failedPayments = payments?.filter((p) => p.payment_status === "failed") || [];

  // Total revenue
  const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // MRR (current month)
  const now = new Date();
  const currentMonth = now.toISOString().substring(0, 7);
  const monthlyPayments = completedPayments.filter(
    (p) => p.created_at?.substring(0, 7) === currentMonth
  );
  const mrr = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Plan breakdown
  const basicRevenue = completedPayments
    .filter((p) => p.plan === "basic")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const proRevenue = completedPayments
    .filter((p) => p.plan === "pro")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Churn rate (expired subscriptions)
  const totalActive = shops?.filter((s) => s.subscription_status === "active").length || 0;
  const totalExpired = shops?.filter((s) => s.subscription_status === "expired").length || 0;
  const churnRate = (totalActive + totalExpired) > 0 
    ? ((totalExpired / (totalActive + totalExpired)) * 100).toFixed(1) 
    : "0";

  // Monthly revenue for last 6 months
  const monthlyRevenue: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const month = subMonths(now, i);
    const monthStr = month.toISOString().substring(0, 7);
    const monthPayments = completedPayments.filter((p) => p.created_at?.substring(0, 7) === monthStr);
    monthlyRevenue[monthStr] = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }

  return {
    totalRevenue,
    mrr,
    basicRevenue,
    proRevenue,
    churnRate: parseFloat(churnRate as string),
    activeSubscriptions: totalActive,
    expiredSubscriptions: totalExpired,
    totalPayments: completedPayments.length,
    failedPayments: failedPayments.length,
    monthlyRevenue,
    recentPayments: payments?.slice(0, 20) || [],
    shops: shops || [],
  };
});

function RevenuePage() {
  const ctx = Route.useRouteContext();
  const getRevenueData = useServerFn(getRevenueDataServer);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed" | "failed">(
    "all"
  );

  const { data: revenueData, isLoading } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: () => getRevenueData(),
    refetchInterval: 60000,
  });

  const getShopName = (shopId: string) => {
    return revenueData?.shops?.find((s) => s.id === shopId)?.shop_name || "Unknown";
  };

  const getShopPhone = (shopId: string) => {
    return revenueData?.shops?.find((s) => s.id === shopId)?.phone || "—";
  };

  const filteredPayments = (revenueData?.recentPayments || []).filter((p) => {
    if (statusFilter === "all") return true;
    return p.payment_status === statusFilter;
  });

  return (
    <AdminLayout
      adminEmail={ctx.session?.email}
      adminName={ctx.session?.email?.split("@")[0]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Revenue & Subscriptions</h1>
          <p className="text-slate-600 mt-2">Track subscription payments and revenue metrics</p>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  KES {(revenueData?.totalRevenue || 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Monthly Recurring
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  KES {(revenueData?.mrr || 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Active Subs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  {revenueData?.activeSubscriptions || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">Churn Rate</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  {(revenueData?.churnRate || 0).toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Plan Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Basic (KES 299)</span>
                  <span className="text-sm font-bold">
                    {isLoading ? "..." : `KES ${(revenueData?.basicRevenue || 0).toLocaleString()}`}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded h-2">
                  <div
                    className="bg-blue-600 h-2 rounded"
                    style={{
                      width:
                        revenueData && revenueData.basicRevenue + revenueData.proRevenue > 0
                          ? `${(
                              (revenueData.basicRevenue /
                                (revenueData.basicRevenue + revenueData.proRevenue)) *
                              100
                            ).toFixed(0)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Pro (KES 499)</span>
                  <span className="text-sm font-bold">
                    {isLoading ? "..." : `KES ${(revenueData?.proRevenue || 0).toLocaleString()}`}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded h-2">
                  <div
                    className="bg-purple-600 h-2 rounded"
                    style={{
                      width:
                        revenueData && revenueData.basicRevenue + revenueData.proRevenue > 0
                          ? `${(
                              (revenueData.proRevenue /
                                (revenueData.basicRevenue + revenueData.proRevenue)) *
                              100
                            ).toFixed(0)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <span className="text-sm text-slate-600">Completed</span>
                <span className="font-semibold text-green-700">
                  {isLoading ? "..." : revenueData?.totalPayments}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                <span className="text-sm text-slate-600">Failed</span>
                <span className="font-semibold text-red-700">
                  {isLoading ? "..." : revenueData?.failedPayments}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Subscription Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2">
              {(["all", "pending", "completed", "failed"] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
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
                      <TableHead>Merchant</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          No payments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {getShopName(payment.shop_id)}
                          </TableCell>
                          <TableCell>{getShopPhone(payment.shop_id)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {payment.plan?.toUpperCase() || "BASIC"}
                            </Badge>
                          </TableCell>
                          <TableCell>KES {payment.amount}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                payment.payment_status === "completed"
                                  ? "default"
                                  : payment.payment_status === "pending"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {payment.payment_status?.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.created_at
                              ? new Date(payment.created_at).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                                })
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
      </div>
    </AdminLayout>
  );
}
