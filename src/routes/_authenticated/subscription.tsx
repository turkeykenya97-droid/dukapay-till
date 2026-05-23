import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  queryOptions,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { getSubscription, initiateRenewal } from "@/lib/subscription.functions";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtKsh } from "@/lib/format";

const subQuery = queryOptions({
  queryKey: ["subscription"],
  queryFn: () => getSubscription(),
});

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [{ title: "Subscription — DukaPOS" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(subQuery),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { data } = useSuspenseQuery(subQuery);
  const renew = useServerFn(initiateRenewal);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => renew({ data: undefined }),
    onSuccess: () => {
      toast.success("M-Pesa prompt sent. Approve on your phone.");
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-4">Subscription</h1>
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="text-sm text-muted-foreground">Status</div>
        <div className="text-2xl font-bold capitalize mb-2">{data.status}</div>
        <div className="text-sm text-muted-foreground">
          {data.status === "expired" ? "Expired on" : "Renews on"}{" "}
          <span className="text-foreground font-medium">{fmtDate(data.expiry)}</span>
        </div>
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Monthly plan</div>
            <div className="text-lg font-bold">{fmtKsh(data.amount)}</div>
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Sending…" : "Renew now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
