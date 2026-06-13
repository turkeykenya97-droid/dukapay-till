import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { startOfWeek, subWeeks, format } from "date-fns";
import { TrendingUp, Users, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  component: AnalyticsPage,
});

const getAnalyticsDataServer = createServerFn({ method: "GET" }).handler(async () => {
  // Get all shops
  const { data: shops, error: shopsError } = await supabaseAdmin
    .from("shops")
    .select("created_at, plan, transaction_count");

  if (shopsError) throw shopsError;

  // Get all sales as transactions
  const { data: transactions, error: txError } = await supabaseAdmin
    .from("sales")
    .select("total_amount, created_at");

  if (txError) throw txError;

  // Weekly signups
  const weeklySignups: Record<string, number> = {};
  for (let i = 7; i >= 0; i--) {
    const week = startOfWeek(subWeeks(new Date(), i));
    const weekStr = format(week, "MMM dd");
    const count = (shops || []).filter((s) => {
      const created = new Date(s.created_at);
      return created >= week && created < new Date(week.getTime() + 7 * 24 * 60 * 60 * 1000);
    }).length;
    weeklySignups[weekStr] = count;
  }

  // Plan distribution
  const basicCount = (shops || []).filter((s) => s.plan === "basic").length;
  const proCount = (shops || []).filter((s) => s.plan === "pro").length;

  // Top merchants by transaction volume (with id for keys)
  const topMerchants = (shops || [])
    .map((s, i) => ({ ...s, id: `top-${i}` }))
    .sort((a, b) => (b.transaction_count || 0) - (a.transaction_count || 0))
    .slice(0, 10);

  // Average transaction value
  const avgTxValue =
    (transactions || []).length > 0
      ? (transactions || []).reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0) / (transactions || []).length
      : 0;

  return {
    weeklySignups,
    planDistribution: { basic: basicCount, pro: proCount },
    topMerchants,
    avgTransactionValue: avgTxValue,
    totalShops: shops?.length || 0,
    totalTransactions: transactions?.length || 0,
  };
});

function AnalyticsPage() {
  const ctx = Route.useRouteContext();
  const getAnalyticsData = useServerFn(getAnalyticsDataServer);

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => getAnalyticsData(),
    refetchInterval: 60000,
  });

  return (
    <AdminLayout
      adminEmail={ctx.session?.email}
      adminName={ctx.session?.email?.split("@")[0]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-600 mt-2">Platform growth and usage analytics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                  {analyticsData?.totalShops || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  {analyticsData?.totalTransactions || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                Avg Tx Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  KES {(analyticsData?.avgTransactionValue || 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Basic</span>
                    <span className="text-sm font-bold">
                      {analyticsData?.planDistribution.basic || 0}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded h-2">
                    <div
                      className="bg-blue-600 h-2 rounded"
                      style={{
                        width:
                          analyticsData &&
                          analyticsData.planDistribution.basic +
                            analyticsData.planDistribution.pro >
                            0
                            ? `${(
                                (analyticsData.planDistribution.basic /
                                  (analyticsData.planDistribution.basic +
                                    analyticsData.planDistribution.pro)) *
                                100
                              ).toFixed(0)}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Pro</span>
                    <span className="text-sm font-bold">
                      {analyticsData?.planDistribution.pro || 0}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded h-2">
                    <div
                      className="bg-purple-600 h-2 rounded"
                      style={{
                        width:
                          analyticsData &&
                          analyticsData.planDistribution.basic +
                            analyticsData.planDistribution.pro >
                            0
                            ? `${(
                                (analyticsData.planDistribution.pro /
                                  (analyticsData.planDistribution.basic +
                                    analyticsData.planDistribution.pro)) *
                                100
                              ).toFixed(0)}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Merchants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Top 10 Merchants by Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(analyticsData?.topMerchants || []).map((m, idx) => (
                  <div key={m.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div>
                      <span className="text-sm font-medium text-slate-600">#{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-slate-200 rounded h-2 mx-4">
                        <div
                          className="bg-green-600 h-2 rounded"
                          style={{
                            width: `${
                              ((m.transaction_count || 0) /
                                ((analyticsData?.topMerchants[0]?.transaction_count || 1))) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-900 ml-4">
                      {m.transaction_count || 0}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
