import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getSalesHistory } from "@/lib/sales.functions";
import { Button } from "@/components/ui/button";
import { fmtKsh, fmtDate } from "@/lib/format";
import { Receipt, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Sales history — Trusit" }] }),
  component: HistoryPage,
});

type Filter = "today" | "7d" | "30d" | "all";

function HistoryPage() {
  const get = useServerFn(getSalesHistory);
  const [filter, setFilter] = useState<Filter>("today");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const range = (() => {
    const now = new Date();
    if (filter === "today") {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return { from: d.toISOString() };
    }
    if (filter === "7d")
      return { from: new Date(now.getTime() - 7 * 86400000).toISOString() };
    if (filter === "30d")
      return { from: new Date(now.getTime() - 30 * 86400000).toISOString() };
    return {};
  })();

  const query = useQuery({
    queryKey: ["history", filter, page],
    queryFn: () => get({ data: { ...range, page, page_size: 20 } }),
    staleTime: 60 * 1000,
  });

  const tabs: { id: Filter; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "7d", label: "7 days" },
    { id: "30d", label: "30 days" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6 pb-24 lg:pb-6">
      <h1 className="text-2xl font-bold mb-4">Sales history</h1>
      <div className="flex gap-1 mb-4 bg-muted p-1 rounded-xl flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setFilter(t.id);
              setPage(1);
            }}
            className={`flex-1 min-w-max text-xs sm:text-sm py-1.5 px-2 sm:px-3 rounded-lg transition ${
              filter === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <p className="text-center text-muted-foreground py-8">Loading…</p>
      ) : !query.data || query.data.rows.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-12 w-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center mb-3">
            <Receipt className="h-6 w-6" />
          </div>
          <h2 className="font-semibold">No sales yet</h2>
          <p className="text-sm text-muted-foreground">
            Completed sales will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {query.data.rows.map((s) => {
              const isOpen = expanded === s.id;
              const items = (s.sale_items ?? []) as Array<{
                id: string;
                product_name: string;
                quantity: number;
                line_total: number;
              }>;
              return (
                <div
                  key={s.id}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  <button
                    className="w-full p-3 flex items-center justify-between text-left"
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                  >
                    <div>
                      <div className="font-medium">{fmtKsh(s.total_amount)}</div>
                      <div className="text-xs text-muted-foreground">
                        {fmtDate(s.sold_at)} · {items.length} item
                        {items.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s.payment_status} />
                      {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 border-t border-border pt-2 text-sm">
                      {items.map((it) => (
                        <div key={it.id} className="flex justify-between py-0.5">
                          <span>
                            {it.product_name} × {it.quantity}
                          </span>
                          <span>{fmtKsh(it.line_total)}</span>
                        </div>
                      ))}
                      <div className="text-xs text-muted-foreground mt-2">
                        Customer: {s.customer_phone}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {query.data.total > query.data.page_size && (
            <div className="flex items-center justify-between mt-4">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(query.data.total / query.data.page_size)}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page * query.data.page_size >= query.data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-success/15 text-success",
    pending: "bg-warning/15 text-warning-foreground",
    failed: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${map[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}
