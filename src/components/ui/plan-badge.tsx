import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";

interface PlanBadgeProps {
  plan: "basic" | "pro" | "trial";
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
  const isTrial = plan === "trial";

  const badgeLabel = isTrial ? "Trial" : plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge
        variant={isPro || isTrial ? "default" : "secondary"}
        className={
          isPro
            ? "bg-yellow-500/20 text-yellow-700 border-yellow-200"
            : isTrial
            ? "bg-blue-500/20 text-blue-700 border-blue-200"
            : "bg-slate-100 text-slate-700"
        }
      >
        {(isPro || isTrial) && <Zap className="h-3 w-3 mr-1" />}
        <span className="font-medium">{badgeLabel} Plan</span>
      </Badge>

      {isBasic && transactionRemaining !== null && (
        <span className="text-xs text-muted-foreground">
          {transactionRemaining}/150 transactions
        </span>
      )}

      {(isPro || isTrial) && (
        <span className="text-xs text-muted-foreground">Unlimited transactions</span>
      )}
    </div>
  );
}
