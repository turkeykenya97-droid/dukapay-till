import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface PlanBadgeProps {
  plan: "basic" | "pro";
  transactionRemaining?: number | null;
  className?: string;
}

export function PlanBadge({
  plan,
  transactionRemaining,
  className = "",
}: PlanBadgeProps) {
  const isBasic = plan === "basic";
  const isPro = plan === "pro";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge
        variant={isPro ? "default" : "secondary"}
        className={
          isPro
            ? "bg-yellow-500/20 text-yellow-700 border-yellow-200"
            : "bg-slate-100 text-slate-700"
        }
      >
        {isPro && <Zap className="h-3 w-3 mr-1" />}
        <span className="capitalize font-medium">{plan} Plan</span>
      </Badge>

      {isBasic && transactionRemaining !== null && (
        <span className="text-xs text-muted-foreground">
          {transactionRemaining}/150 transactions
        </span>
      )}

      {isPro && (
        <span className="text-xs text-muted-foreground">Unlimited transactions</span>
      )}
    </div>
  );
}
