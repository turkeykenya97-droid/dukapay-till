import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getDashboard } from "@/lib/sales.functions";
import { initiateRenewal } from "@/lib/subscription.functions";
import { Button } from "@/components/ui/button";
import { fmtKsh } from "@/lib/format";
import { ShoppingCart, AlertTriangle, TrendingUp, Receipt, BarChart3, Plus, History, Package } from "lucide-react";

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
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Welcome back</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{data.shop.shop_name}</h1>
        </div>
        <span
          className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
            expired
              ? "bg-destructive/10 text-destructive border-destructive/20"
              : data.shop.subscription_status === "trial"
              ? "bg-warning/15 text-warning-foreground border-warning/30"
              : "bg-success/15 text-success border-success/20"
          }`}
        >
          {expired ? "Expired" : `${data.shop.days_remaining}d left`}
        </span>
      </header>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Receipt, label: "Sales today", value: data.today.sales_count, tone: "primary" as const },
          { icon: TrendingUp, label: "Revenue today", value: fmtKsh(data.today.revenue), tone: "success" as const },
          { icon: AlertTriangle, label: "Low stock", value: data.low_stock.length, tone: "warning" as const },
          { icon: ShoppingCart, label: "Plan", value: data.shop.display_status, tone: "secondary" as const, capitalize: true },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          const toneBg =
            kpi.tone === "primary" ? "bg-primary/10 text-primary"
            : kpi.tone === "success" ? "bg-success/10 text-success"
            : kpi.tone === "warning" ? "bg-warning/15 text-warning-foreground"
            : "bg-muted text-foreground";
          return (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elegant)] transition-shadow"
            >
              <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg mb-2 ${toneBg}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-[11px] text-muted-foreground mb-0.5">{kpi.label}</div>
              <div className={`text-2xl font-bold ${kpi.capitalize ? "capitalize" : ""}`}>{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: "/sell" as const, icon: ShoppingCart, label: "New Sale", tone: "primary", disabled: expired },
            { to: "/products" as const, icon: Plus, label: "Add Product", tone: "success", disabled: false },
            { to: "/history" as const, icon: History, label: "History", tone: "secondary", disabled: false },
            { to: "/analytics" as const, icon: BarChart3, label: "Analytics", tone: "warning", disabled: false },
          ].map((a) => {
            const Icon = a.icon;
            const toneBg =
              a.tone === "primary" ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
              : a.tone === "success" ? "bg-success/10 text-success group-hover:bg-success group-hover:text-success-foreground"
              : a.tone === "warning" ? "bg-warning/15 text-warning-foreground group-hover:bg-warning"
              : "bg-muted text-foreground group-hover:bg-secondary group-hover:text-secondary-foreground";
            return (
              <button
                key={a.to}
                onClick={() => navigate({ to: a.to })}
                disabled={a.disabled}
                className="group flex flex-col items-center justify-center gap-2 p-4 bg-card border border-border rounded-2xl shadow-[var(--shadow-card)] hover:border-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                <span className={`inline-flex items-center justify-center h-10 w-10 rounded-xl transition-colors ${toneBg}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-medium text-center">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>


      {data.low_stock.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center text-sm font-semibold text-foreground">
              <AlertTriangle className="h-4 w-4 mr-1.5 text-destructive" />
              Low stock ({data.low_stock.length})
            </div>
            <Link to="/products" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {data.low_stock.map((p) => (
              <Link
                key={p.id}
                to="/products"
                className="flex items-center gap-3 bg-card border border-border border-l-4 border-l-destructive rounded-xl p-3 shadow-[var(--shadow-card)] hover:border-l-destructive hover:bg-muted/40 transition-colors"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <Package className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-destructive font-semibold">{p.stock} left</div>
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
