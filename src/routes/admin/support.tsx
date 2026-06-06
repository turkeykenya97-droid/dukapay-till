import { createFileRoute } from "@tanstack/react-router";
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
import { differenceInDays } from "date-fns";
import { Phone, MessageSquare, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/support")({
  beforeLoad: async () => {
    const session = await getAdminSessionServer();
    if (!session) throw new Error("Not authenticated");
    return { session };
  },
  component: SupportPage,
});

// Server function to identify merchants needing support
const getMerchantsNeedingSupportServer = createServerFn({ method: "GET" }).handler(async () => {
  // Get all shops
  const { data: shops, error: shopsError } = await supabaseAdmin
    .from("shops")
    .select("*");

  if (shopsError) throw shopsError;

  // Get all transactions (sales)
  const { data: transactions, error: txError } = await supabaseAdmin
    .from("sales")
    .select("shop_id, payment_status");

  if (txError) throw txError;

  const now = new Date();
  const issues: Array<{
    shopId: string;
    shopName: string;
    ownerName: string;
    phone: string;
    issueType: string;
    daysSinceIssue: number;
  }> = [];

  shops?.forEach((shop) => {
    // Issue 1: Expired for more than 3 days
    if (shop.subscription_status === "expired") {
      const expiry = new Date(shop.subscription_expiry);
      const daysSinceExpiry = differenceInDays(now, expiry);
      if (daysSinceExpiry > 3) {
        issues.push({
          shopId: shop.id,
          shopName: shop.shop_name,
          ownerName: shop.owner_name,
          phone: shop.phone,
          issueType: "Expired subscription (>3 days)",
          daysSinceIssue: daysSinceExpiry,
        });
        return;
      }
    }

    // Issue 2: High failed transaction rate (>30%)
    const shopTransactions = transactions?.filter((t) => t.shop_id === shop.id) || [];
    if (shopTransactions.length > 0) {
      const failedCount = shopTransactions.filter((t) => t.payment_status === "failed").length;
      const failureRate = (failedCount / shopTransactions.length) * 100;
      if (failureRate > 30) {
        issues.push({
          shopId: shop.id,
          shopName: shop.shop_name,
          ownerName: shop.owner_name,
          phone: shop.phone,
          issueType: `High failure rate (${failureRate.toFixed(0)}%)`,
          daysSinceIssue: 0,
        });
        return;
      }
    }

    // Issue 3: Never completed a transaction
    if (shop.transaction_count === 0) {
      const daysSinceJoin = differenceInDays(now, new Date(shop.created_at));
      if (daysSinceJoin > 7) {
        // Only flag if joined more than 7 days ago
        issues.push({
          shopId: shop.id,
          shopName: shop.shop_name,
          ownerName: shop.owner_name,
          phone: shop.phone,
          issueType: "No transactions yet",
          daysSinceIssue: daysSinceJoin,
        });
      }
    }
  });

  return {
    issues: issues.sort((a, b) => b.daysSinceIssue - a.daysSinceIssue),
    totalIssues: issues.length,
  };
});

function SupportPage() {
  const ctx = Route.useRouteContext();
  const getMerchantsNeedingSupport = useServerFn(getMerchantsNeedingSupportServer);

  const { data: supportData, isLoading } = useQuery({
    queryKey: ["admin-support"],
    queryFn: () => getMerchantsNeedingSupport(),
    refetchInterval: 60000,
  });

  const openWhatsApp = (phone: string, ownerName: string) => {
    const message = encodeURIComponent(
      `Hi ${ownerName}, this is DukaPOS support. We noticed you might need assistance with your account. Can we help you get set up?`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const openPhone = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const getIssueColor = (issueType: string) => {
    if (issueType.includes("Expired")) return "destructive";
    if (issueType.includes("failure")) return "secondary";
    return "outline";
  };

  return (
    <AdminLayout
      adminEmail={ctx.session?.email}
      adminName={ctx.session?.email?.split("@")[0]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Support</h1>
          <p className="text-slate-600 mt-2">
            Merchants who need assistance and attention
          </p>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Merchants Needing Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">
                {supportData?.totalIssues || 0}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Support List */}
        <Card>
          <CardHeader>
            <CardTitle>Merchants Needing Support</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : supportData?.issues && supportData.issues.length > 0 ? (
              <div className="space-y-4">
                {supportData.issues.map((issue) => (
                  <div
                    key={`${issue.shopId}-${issue.issueType}`}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{issue.shopName}</h3>
                          <Badge variant={getIssueColor(issue.issueType)}>
                            {issue.issueType}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">Owner: {issue.ownerName}</p>
                        <p className="text-sm text-slate-500">Phone: {issue.phone}</p>
                        {issue.daysSinceIssue > 0 && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                            <Clock className="h-3 w-3" />
                            Issue started {issue.daysSinceIssue} days ago
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => openPhone(issue.phone)}
                      >
                        <Phone className="h-3 w-3" />
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => openWhatsApp(issue.phone, issue.ownerName)}
                      >
                        <MessageSquare className="h-3 w-3" />
                        WhatsApp
                      </Button>
                      <Button size="sm" variant="ghost">
                        Extend Trial
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No merchants need support at this time
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
