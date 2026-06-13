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
import { getAdminSessionServer } from "@/lib/admin-auth.server";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { format } from "date-fns";
import { Search } from "lucide-react";

export const Route = createFileRoute("/admin/transactions")({
  beforeLoad: async () => {
    const session = await getAdminSessionServer();
    if (!session) throw new Error("Not authenticated");
    return { session };
  },
  component: TransactionsPage,
});

// Server function to fetch transactions
const getTransactionsServer = createServerFn({ method: "GET" }).handler(async () => {
  // Get transactions
  const { data: transactions, error: txError } = await supabaseAdmin
    .from("sales")
    .select("*")
    .order("created_at", { ascending: false });

  if (txError) throw txError;

  // Get shops for merchant details
  const { data: shops, error: shopsError } = await supabaseAdmin
    .from("shops")
    .select("id, shop_name, phone");

  if (shopsError) throw shopsError;

  // Calculate metrics
  const completed = transactions?.filter((t) => t.payment_status === "completed") || [];
  const failed = transactions?.filter((t) => t.payment_status === "failed") || [];
  const pending = transactions?.filter((t) => t.payment_status === "pending") || [];

  const totalVolume = completed.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const successRate =
    transactions && transactions.length > 0
      ? ((completed.length / transactions.length) * 100).toFixed(1)
      : "0";

  return {
    transactions: transactions || [],
    shops: shops || [],
    metrics: {
      total: transactions?.length || 0,
      completed: completed.length,
      failed: failed.length,
      pending: pending.length,
      totalVolume,
      successRate: parseFloat(successRate as string),
    },
  };
});

function TransactionsPage() {
  const ctx = Route.useRouteContext();
  const getTransactions = useServerFn(getTransactionsServer);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed" | "failed">(
    "all"
  );

  const { data: txData, isLoading } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: () => getTransactions(),
    refetchInterval: 30000,
  });

  // Filter transactions
  const filteredTransactions = (txData?.transactions || []).filter((t) => {
    const merchant = txData?.shops?.find((s) => s.id === t.shop_id);
    const matchesSearch =
      merchant?.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      merchant?.phone?.includes(searchTerm) ||
      t.customer_phone?.includes(searchTerm) ||
      t.payment_checkout_request_id?.includes(searchTerm);

    const matchesStatus = statusFilter === "all" || t.payment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getMerchantName = (shopId: string) => {
    return txData?.shops?.find((s) => s.id === shopId)?.shop_name || "Unknown";
  };

  return (
    <AdminLayout
      adminEmail={ctx.session?.email}
      adminName={ctx.session?.email?.split("@")[0]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-600 mt-2">All M-Pesa payments processed through Trusit</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  {txData?.metrics.total || 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  KES {(txData?.metrics.totalVolume || 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  {(txData?.metrics.successRate || 0).toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  {txData?.metrics.failed || 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by merchant, phone, or checkout ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
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
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Transactions ({filteredTransactions.length})</CardTitle>
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
                      <TableHead>Merchant</TableHead>
                      <TableHead>Customer Phone</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Checkout ID</TableHead>
                      <TableHead>M-Pesa Receipt</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            {getMerchantName(transaction.shop_id)}
                          </TableCell>
                          <TableCell className="text-sm">{transaction.customer_phone}</TableCell>
                          <TableCell className="font-medium">
                            KES {transaction.total_amount?.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                transaction.payment_status === "completed"
                                  ? "default"
                                  : transaction.payment_status === "pending"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {transaction.payment_status?.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono truncate max-w-xs">
                            {transaction.payment_checkout_request_id || "—"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {transaction.payment_reference ? (
                              <Badge variant="outline">{transaction.payment_reference}</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {transaction.created_at
                              ? format(new Date(transaction.created_at), "MMM d, HH:mm")
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
