import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAdminSessionServer } from "@/lib/admin-auth.server";

export const Route = createFileRoute("/admin/dashboard")({
  beforeLoad: async () => {
    const session = await getAdminSessionServer();
    if (!session) throw new Error("Not authenticated");
    return { session };
  },
  component: AdminDashboard,
});

// Server function to fetch dashboard metrics
const getDashboardMetricsServer = createServerFn({ method: "GET" }).handler(async () => {
  // Get merchant counts by status
  const { data: shops, error: shopsError } = await supabaseAdmin
    .from("shops")
    .select("id, subscription_status, plan, created_at, subscription_expiry");

  if (shopsError) throw shopsError;

  // Calculate merchant statuses
  const now = new Date();
  const merchantStats = {
    total: shops?.length || 0,
    active: shops?.filter((s) => s.subscription_status === "active").length || 0,
    trial: shops?.filter((s) => s.subscription_status === "trial").length || 0,
    expired: shops?.filter((s) => s.subscription_status === "expired").length || 0,
  };

  // Get subscription payment metrics
  const { data: payments, error: paymentsError } = await supabaseAdmin
    .from("subscription_payments")
    .select("amount, payment_status, plan, created_at");

  if (paymentsError) throw paymentsError;

  // Calculate revenue metrics
  const completedPayments = payments?.filter((p) => p.payment_status === "completed") || [];
  const totalRevenue = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Calculate MRR (payments from current month)
  const currentMonth = now.toISOString().substring(0, 7);
  const monthlyPayments = completedPayments.filter(
    (p) => p.created_at?.substring(0, 7) === currentMonth
  );
  const mrr = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Calculate churn (trial or active that expired and didn't renew)
  const churnedCount = shops?.filter((s) => {
    const expiry = new Date(s.subscription_expiry);
    return s.subscription_status === "expired" && expiry < now;
  }).length || 0;

  const churnRate =
    merchantStats.total > 0 ? ((churnedCount / merchantStats.total) * 100).toFixed(1) : "0";

  // Get plan breakdown
  const basicCount = shops?.filter((s) => s.plan === "basic").length || 0;
  const proCount = shops?.filter((s) => s.plan === "pro").length || 0;

  // Get recent transactions count
  const { data: transactions, error: transError } = await supabaseAdmin
    .from("sales")
    .select("id, status", { count: "exact", head: false })
    .eq("status", "completed");

  const successfulTransactions = transactions?.length || 0;

  return {
    merchants: merchantStats,
    revenue: {
      total: totalRevenue,
      mrr: mrr,
      basicCount,
      proCount,
    },
    churnRate: parseFloat(churnRate as string),
    successfulTransactions,
    lastUpdated: new Date().toISOString(),
  };
});

function AdminDashboard() {
  const ctx = Route.useRouteContext();
  const getMetrics = useServerFn(getDashboardMetricsServer);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["admin-dashboard-metrics"],
    queryFn: () => getMetrics(),
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <AdminLayout
      adminEmail={ctx.session?.email}
      adminName={ctx.session?.email?.split("@")[0]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-2">Welcome to the DukaPOS admin portal</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Merchants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Merchants
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  {metrics?.merchants.total || 0}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">All registered merchants</p>
            </CardContent>
          </Card>

          {/* Active Merchants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  {metrics?.merchants.active || 0}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">
                {metrics && metrics.merchants.total > 0
                  ? `${(
                      (metrics.merchants.active / metrics.merchants.total) *
                      100
                    ).toFixed(0)}% of total`
                  : "No merchants"}
              </p>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  KES {(metrics?.revenue.total || 0).toLocaleString()}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">All completed payments</p>
            </CardContent>
          </Card>

          {/* MRR */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                MRR
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  KES {(metrics?.revenue.mrr || 0).toLocaleString()}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Trial Merchants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Trial</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="flex items-end gap-2">
                  <div className="text-2xl font-bold text-slate-900">
                    {metrics?.merchants.trial || 0}
                  </div>
                  <p className="text-xs text-slate-500 mb-1">merchants</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expired Merchants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Expired</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="flex items-end gap-2">
                  <div className="text-2xl font-bold text-slate-900">
                    {metrics?.merchants.expired || 0}
                  </div>
                  <p className="text-xs text-slate-500 mb-1">merchants</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Churn Rate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Churn Rate</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="flex items-end gap-2">
                  <div className="text-2xl font-bold text-slate-900">
                    {(metrics?.churnRate || 0).toFixed(1)}%
                  </div>
                  <p className="text-xs text-slate-500 mb-1">monthly</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Plan Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-600">Basic (KES 299)</span>
                  <span className="text-sm font-medium text-slate-900">
                    {isLoading ? "..." : metrics?.revenue.basicCount || 0}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width:
                        metrics && metrics.merchants.total > 0
                          ? `${(
                              (metrics.revenue.basicCount / metrics.merchants.total) *
                              100
                            ).toFixed(0)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-600">Pro (KES 499)</span>
                  <span className="text-sm font-medium text-slate-900">
                    {isLoading ? "..." : metrics?.revenue.proCount || 0}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width:
                        metrics && metrics.merchants.total > 0
                          ? `${(
                              (metrics.revenue.proCount / metrics.merchants.total) *
                              100
                            ).toFixed(0)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                <span className="text-sm text-slate-600">Successful Transactions</span>
                <span className="text-lg font-semibold text-slate-900">
                  {isLoading ? "..." : metrics?.successfulTransactions || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-slate-50 rounded">
                <span className="text-sm text-slate-600">Avg Transaction Value</span>
                <span className="text-lg font-semibold text-slate-900">
                  {isLoading
                    ? "..."
                    : metrics && metrics.successfulTransactions > 0
                      ? `KES ${(metrics.revenue.total / metrics.successfulTransactions).toFixed(0)}`
                      : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
