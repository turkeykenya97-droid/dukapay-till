import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useFeatureAccess } from "@/hooks/use-access";
import { ProFeatureOverlay } from "@/components/pro-feature-overlay";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
} from "recharts";
import { getAnalytics } from "@/lib/sales.functions";
import { fmtKsh } from "@/lib/format";
import { BarChart3, TrendingUp, Package, AlertTriangle, Trophy, Users, CreditCard, Smartphone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const analyticsQuery = queryOptions({
  queryKey: ["analytics"],
  queryFn: () => getAnalytics(),
  staleTime: 60 * 1000,
  retry: false,
});

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Trusit" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { allowed: canViewAnalytics } = useFeatureAccess("analytics");

  if (!canViewAnalytics) {
    return (
      <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-6 pb-4">
        <h1 className="text-2xl font-bold mb-6">Analytics</h1>
        <ProFeatureOverlay
          feature="analytics"
          title="Analytics Dashboard"
          description="Get detailed insights into your sales patterns, top products, and customer trends."
        >
          <div className="h-96 bg-muted rounded-lg" />
        </ProFeatureOverlay>
      </div>
    );
  }

  return <AnalyticsContent />;
}

function AnalyticsContent() {
  const { data } = useSuspenseQuery(analyticsQuery);

  const hasAnyData = data.summary.sales_count_month > 0;

  const paymentColors = {
    cash: "#3b82f6",
    mpesa: "#10b981",
    card: "#f59e0b",
  };

  const paymentData = [
    { name: "Cash", value: data.payment_split.cash },
    { name: "M-Pesa", value: data.payment_split.mpesa },
    { name: "Card", value: data.payment_split.card },
  ].filter((x) => x.value > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 pb-4 space-y-6">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>

      {/* Key Metrics - Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="This Month Sales"
          value={String(data.summary.sales_count_month)}
          subtext={`KES ${fmtKsh(data.summary.revenue_month)}`}
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Average Order Value"
          value={fmtKsh(data.summary.aov)}
        />
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Unique Customers"
          value={String(data.summary.unique_customers)}
          subtext={`${data.summary.new_customers} new`}
        />
        <MetricCard
          icon={<Package className="h-4 w-4" />}
          label="Stock Value"
          value={fmtKsh(data.inventory.stock_value)}
          subtext={`${data.inventory.out_of_stock} out of stock`}
        />
      </div>

      {/* Key Metrics - Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={<CreditCard className="h-4 w-4" />}
          label="Total Discounts"
          value={fmtKsh(data.total_discounts)}
        />
        <MetricCard
          icon={<Trophy className="h-4 w-4" />}
          label="Top Customer Spend"
          value={
            data.customer_analytics.top_customers[0]
              ? fmtKsh(data.customer_analytics.top_customers[0].spent)
              : "—"
          }
        />
        <MetricCard
          icon={<Smartphone className="h-4 w-4" />}
          label="Avg Basket Size"
          value={`${data.customer_analytics.avg_basket_size.toFixed(1)} items`}
        />
        <MetricCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Low Stock Items"
          value={String(data.inventory.low_stock)}
        />
      </div>

      {!hasAnyData ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <div className="h-12 w-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center mb-3">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h2 className="font-semibold">Not enough data yet</h2>
          <p className="text-sm text-muted-foreground">Keep selling to unlock insights.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Module 1: Sales & Revenue */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-6">Sales & Revenue</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Revenue Trend */}
              <Section title="Daily Revenue (7 days)">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={data.daily_revenue}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: number) => [fmtKsh(v), "Revenue"]}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Section>

              {/* Payment Method Split */}
              <Section title="Payment Methods">
                {paymentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={paymentData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name}: KES ${(value / 1000).toFixed(0)}k`}
                      >
                        <Cell fill={paymentColors.cash} />
                        <Cell fill={paymentColors.mpesa} />
                        <Cell fill={paymentColors.card} />
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtKsh(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground py-12 text-center">No payment data</p>
                )}
              </Section>
            </div>

            {/* Sales by Day of Week */}
            <div className="mt-6">
              <Section title="Sales by Day of Week">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.sales_by_day_of_week}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="day" />
                    <YAxis tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(v: number) => [fmtKsh(v), "Revenue"]}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    />
                    <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>

            {/* Sales by Hour */}
            <div className="mt-6">
              <Section title="Sales by Hour">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.sales_by_hour}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="hour" angle={-45} textAnchor="end" height={80} />
                    <YAxis yAxisId="left" tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}`} />
                    <Tooltip
                      formatter={(v: number, name) => [
                        name === "revenue" ? fmtKsh(v) : v,
                        name === "revenue" ? "Revenue" : "Count",
                      ]}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    />
                    <Bar yAxisId="left" dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="count" fill="var(--secondary)" opacity={0.6} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>
          </div>

          {/* Module 2: Customer Analytics */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-6">Customer Analytics</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Customers */}
              <Section title="Top Customers">
                {data.customer_analytics.top_customers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No customer data</p>
                ) : (
                  <ul className="space-y-2">
                    {data.customer_analytics.top_customers.map((cust, i) => (
                      <li key={i} className="flex items-center justify-between bg-muted/40 rounded-lg p-3">
                        <div>
                          <div className="font-medium text-sm">{cust.phone}</div>
                          <div className="text-xs text-muted-foreground">{cust.purchases} purchases</div>
                        </div>
                        <span className="font-semibold text-sm">{fmtKsh(cust.spent)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {/* Customer Metrics */}
              <Section title="Customer Health">
                <div className="space-y-4">
                  <div className="p-4 bg-muted/40 rounded-lg">
                    <p className="text-xs text-muted-foreground">Avg Customer Lifetime Value</p>
                    <p className="text-2xl font-bold mt-1">{fmtKsh(data.customer_analytics.avg_clv)}</p>
                  </div>
                  <div className="p-4 bg-muted/40 rounded-lg">
                    <p className="text-xs text-muted-foreground">Avg Basket Size</p>
                    <p className="text-2xl font-bold mt-1">
                      {data.customer_analytics.avg_basket_size.toFixed(1)} items
                    </p>
                  </div>
                  <div className="p-4 bg-muted/40 rounded-lg">
                    <p className="text-xs text-muted-foreground">At-Risk (No purchase 30d)</p>
                    <p className="text-2xl font-bold mt-1">{data.summary.churn_count}</p>
                  </div>
                </div>
              </Section>
            </div>
          </div>

          {/* Module 3: Inventory */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-6">Inventory Insights</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Restock Soon */}
              <Section title="These products need restocking soon">
                {data.restock.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">All products above reorder level 🎉</p>
                ) : (
                  <ul className="space-y-2">
                    {data.restock.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between bg-muted/40 rounded-lg p-3"
                      >
                        <div>
                          <div className="font-medium text-sm">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Stock: {p.stock} · Reorder at {p.reorder_level}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.stock === 0
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/15 text-warning-foreground"
                          }`}
                        >
                          {p.stock === 0 ? "Out" : "Low"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {/* Days to Stockout */}
              <Section title="Predictive Reorder">
                {data.inventory.days_to_stockout.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">All products safe</p>
                ) : (
                  <ul className="space-y-2">
                    {data.inventory.days_to_stockout.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between bg-muted/40 rounded-lg p-3"
                      >
                        <div>
                          <div className="font-medium text-sm">{p.name}</div>
                          <div className="text-xs text-muted-foreground">Current stock: {p.stock}</div>
                        </div>
                        <span className="font-semibold text-sm">
                          {p.daysUntilOut < 1 ? "Today" : `${p.daysUntilOut}d`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </div>

          {/* Module 4: Best Selling & Slow Moving */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Selling */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold mb-3">Best Selling (this week)</h2>
              {data.best_selling.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No sales data</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.best_selling} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v} sold`, "Qty"]}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                    />
                    <Bar dataKey="quantity" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Slow Moving */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold mb-3">Slow-moving products (30 days)</h2>
              {data.slow_moving.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No products</p>
              ) : (
                <ul className="space-y-2">
                  {data.slow_moving.slice(0, 8).map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between bg-muted/40 rounded-lg p-3"
                    >
                      <div>
                        <div className="font-medium text-sm">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.quantity_sold} sold · {p.stock} in stock
                        </div>
                      </div>
                      {p.quantity_sold === 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                          No sales
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center text-muted-foreground text-xs mb-1 gap-1">
        {icon}
        {label}
      </div>
      <div className="text-lg lg:text-xl font-bold truncate">{value}</div>
      {subtext && <div className="text-xs text-muted-foreground mt-1">{subtext}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted/20 rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">{title}</h3>
      {children}
    </div>
  );
}
