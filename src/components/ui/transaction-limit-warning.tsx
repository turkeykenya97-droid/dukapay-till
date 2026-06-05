import { AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionLimitWarningProps {
  transactionRemaining: number;
  totalLimit: number;
  onUpgradeClick?: () => void;
}

export function TransactionLimitWarning({
  transactionRemaining,
  totalLimit,
  onUpgradeClick,
}: TransactionLimitWarningProps) {
  const usedPercent = ((totalLimit - transactionRemaining) / totalLimit) * 100;
  const isLow = transactionRemaining <= 20;
  const isExhausted = transactionRemaining <= 0;

  if (!isLow) return null;

  return (
    <div
      className={`border rounded-lg p-4 mb-4 ${
        isExhausted
          ? "border-destructive bg-destructive/10"
          : "border-yellow-200 bg-yellow-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`rounded-full p-2 ${
            isExhausted ? "bg-destructive/20" : "bg-yellow-100"
          }`}
        >
          <AlertTriangle
            className={`h-5 w-5 ${
              isExhausted ? "text-destructive" : "text-yellow-600"
            }`}
          />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-1">
            {isExhausted ? "Transaction limit reached" : "Running low on transactions"}
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            {isExhausted
              ? `You've used all ${totalLimit} transactions this month. Upgrade to Pro for unlimited transactions.`
              : `You have ${transactionRemaining} of ${totalLimit} transactions remaining this month.`}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
            <div
              className={`h-2 rounded-full transition-all ${
                isExhausted ? "bg-destructive" : "bg-yellow-500"
              }`}
              style={{ width: `${usedPercent}%` }}
            />
          </div>
          <Button
            size="sm"
            onClick={onUpgradeClick}
            className={
              isExhausted
                ? "bg-destructive hover:bg-destructive/90 text-white"
                : "bg-yellow-600 hover:bg-yellow-700 text-white"
            }
          >
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
}
