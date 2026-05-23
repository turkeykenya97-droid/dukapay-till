import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
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
} from "recharts";
import { getAnalytics } from "@/lib/sales.functions";
import { fmtKsh } from "@/lib/format";
import { BarChart3, TrendingUp, Package, AlertTriangle, Trophy } from "lucide-react";

const analyticsQuery = queryOptions({
  queryKey: ["analytics"],
  queryFn: () => getAnalytics(),
  staleTime: 60 * 1000,
});

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — DukaPOS" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(analyticsQuery),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data } = useSuspenseQuery(analyticsQuery);

  const hasAnyData =
    data.summary.sales_count_month > 0 || data.best_selling.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-4">Analytics</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Sales this month"
          value={String(data.summary.sales_count_month)}
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Revenue this month"
          value={fmtKsh(data.summary.revenue_month)}
        />
        <SummaryCard
          icon={<Trophy className="h-4 w-4" />}
          label="Most sold"
          value={
            data.summary.most_sold
              ? `${data.summary.most_sold.name} (${data.summary.most_sold.quantity})`
              : "—"
          }
        />
        <SummaryCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Low in stock"
          value={String(data.summary.low_stock_count)}
        />
      </div>

      {!hasAnyData ? (
        <div className="text-center py-16 bg-card border border-border rounded-2xl">
          <div className="h-12 w-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center mb-3">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h2 className="font-semibold">Not enough data yet</h2>
          <p className="text-sm text-muted-foreground">
            Keep selling to unlock insights.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Best selling */}
          <Section title="Best selling (this week)">
            {data.best_selling.length === 0 ? (
              <EmptyText>No sales data yet. Start selling to see analytics.</EmptyText>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.best_selling} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v} sold`, "Quantity"]}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }}
                  />
                  <Bar dataKey="quantity" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Daily revenue */}
          <Section title="Daily revenue (last 7 days)">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.daily_revenue}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v) => `${v}`} />
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

          {/* Restock */}
          <Section title="These products need restocking soon">
            {data.restock.length === 0 ? (
              <EmptyText>All products are above their reorder level. 🎉</EmptyText>
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
                        Stock: {p.stock} · Reorder at {p.reorder_level} · Sold {p.sold_this_week} this week
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

          {/* Slow moving */}
          <Section title="Slow-moving products (last 30 days)">
            {data.slow_moving.length === 0 ? (
              <EmptyText>No products yet.</EmptyText>
            ) : (
              <ul className="space-y-2">
                {data.slow_moving.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between bg-muted/40 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.quantity_sold} sold · {p.stock} in stock
                        </div>
                      </div>
                    </div>
                    {p.quantity_sold === 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                        No sales 30d
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center text-muted-foreground text-xs mb-1 gap-1">
        {icon}
        {label}
      </div>
      <div className="text-lg lg:text-xl font-bold truncate">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-4">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>;
}
