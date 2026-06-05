import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getDashboard } from "@/lib/sales.functions";
import { initiateRenewal } from "@/lib/subscription.functions";
import { Button } from "@/components/ui/button";
import { fmtKsh } from "@/lib/format";
import { ShoppingCart, AlertTriangle, TrendingUp, Receipt, Calculator, Plus, History, CreditCard } from "lucide-react";

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboard(),
  staleTime: 30 * 1000,
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — DukaPOS" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const renew = useServerFn(initiateRenewal);

  const renewMutation = useMutation({
    mutationFn: () => renew({ data: undefined }),
    onSuccess: () => {
      toast.success("M-Pesa prompt sent. Approve on your phone.");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const expired = data.shop.subscription_status === "expired";

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6 pb-4">
      <header className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Welcome</p>
          <h1 className="text-2xl font-bold text-foreground">{data.shop.shop_name}</h1>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            expired
              ? "bg-destructive/10 text-destructive"
              : data.shop.subscription_status === "trial"
              ? "bg-warning/15 text-warning-foreground"
              : "bg-success/15 text-success"
          }`}
        >
          {expired ? "Expired" : `${data.shop.days_remaining}d left`}
        </span>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center text-muted-foreground text-xs mb-1">
            <Receipt className="h-3.5 w-3.5 mr-1" />
            Today's sales
          </div>
          <div className="text-2xl font-bold">{data.today.sales_count}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center text-muted-foreground text-xs mb-1">
            <TrendingUp className="h-3.5 w-3.5 mr-1" />
            Revenue today
          </div>
          <div className="text-2xl font-bold">{fmtKsh(data.today.revenue)}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center text-muted-foreground text-xs mb-1">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Low stock items
          </div>
          <div className="text-2xl font-bold">{data.low_stock.length}</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center text-muted-foreground text-xs mb-1">
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            Plan
          </div>
          <div className="text-2xl font-bold capitalize">{data.shop.display_status}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <button
          onClick={() => navigate({ to: "/sell" })}
          disabled={expired}
          className="flex flex-col items-center gap-2 p-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Start a new sale"
        >
          <ShoppingCart className="h-5 w-5 text-primary" />
          <span className="text-xs font-medium text-center">New Sale</span>
        </button>

        <button
          onClick={() => navigate({ to: "/sell" })}
          disabled={expired}
          className="flex flex-col items-center gap-2 p-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Use the calculator to calculate amounts"
        >
          <Calculator className="h-5 w-5 text-blue-500" />
          <span className="text-xs font-medium text-center">Calculator</span>
        </button>

        <button
          onClick={() => navigate({ to: "/products" })}
          className="flex flex-col items-center gap-2 p-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
          title="Add a new product"
        >
          <Plus className="h-5 w-5 text-green-500" />
          <span className="text-xs font-medium text-center">Add Product</span>
        </button>

        <button
          onClick={() => navigate({ to: "/history" })}
          className="flex flex-col items-center gap-2 p-3 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
          title="View sales history"
        >
          <History className="h-5 w-5 text-orange-500" />
          <span className="text-xs font-medium text-center">History</span>
        </button>
      </div>

      <Button
        size="lg"
        className="w-full h-16 text-lg font-semibold mb-6 shadow-md"
        onClick={() => navigate({ to: "/sell" })}
        disabled={expired}
      >
        <ShoppingCart className="h-5 w-5 mr-2" />
        New Sale
      </Button>

      {data.low_stock.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center text-sm font-semibold text-foreground mb-2">
            <AlertTriangle className="h-4 w-4 mr-1 text-destructive" />
            Low stock ({data.low_stock.length})
          </div>
          <div className="space-y-2">
            {data.low_stock.map((p) => (
              <Link
                key={p.id}
                to="/products"
                className="block bg-card border border-border border-l-4 border-l-destructive rounded-xl p-3"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-destructive font-semibold">
                    {p.stock} left
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {expired && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center px-4 pb-20">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
            <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold mb-2">Subscription expired</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Renew for Ksh 499 to keep selling and tracking inventory.
            </p>
            <Button
              size="lg"
              className="w-full"
              onClick={() => renewMutation.mutate()}
              disabled={renewMutation.isPending}
            >
              {renewMutation.isPending ? "Sending M-Pesa…" : "Renew for Ksh 499"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
