"use client";

import { useAccessStatus, useSubscriptionDaysRemaining } from "@/hooks/use-access";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle2, Lock, Zap } from "lucide-react";

interface PlanBadgeProps {
  variant?: "compact" | "detailed";
  showDays?: boolean;
  className?: string;
}

/**
 * Displays current subscription plan with status and days remaining
 * Variants:
 * - compact: Shows plan name only (Trial/Basic/Pro/Expired)
 * - detailed: Shows plan + days remaining + expiry date with icon
 */
export function PlanBadge({
  variant = "compact",
  showDays = true,
  className = "",
}: PlanBadgeProps) {
  const access = useAccessStatus();
  const { days, expiryDate, isExpiring, isExpired, isLoading } =
    useSubscriptionDaysRemaining();

  if (isLoading || !access.data) {
    return <Badge variant="outline">Loading...</Badge>;
  }

  const { level, plan } = access.data;
  const isTrialLevel = level === "trial";
  const isExpiredLevel = level === "expired";

  if (isExpiredLevel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Expired
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            Your subscription has expired. Renew to continue using DukaPay Till.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Determine plan display name and colors
  let planLabel = "Basic";
  let badgeColor = "bg-slate-100 text-slate-700";
  let icon = null;

  if (isTrialLevel) {
    planLabel = "Trial";
    badgeColor = "bg-blue-500/20 text-blue-700 border-blue-200";
    icon = <Zap className="h-3 w-3" />;
  } else if (plan === "pro") {
    planLabel = "Pro";
    badgeColor = "bg-purple-500/20 text-purple-700 border-purple-200";
    icon = <Zap className="h-3 w-3" />;
  } else if (plan === "basic") {
    planLabel = "Basic";
    badgeColor = "bg-blue-500/20 text-blue-700 border-blue-200";
  }

  if (variant === "compact") {
    return (
      <Badge className={`${badgeColor} ${className}`}>
        {icon}
        <span className="font-medium">{planLabel}</span>
      </Badge>
    );
  }

  // Detailed variant with days remaining
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={badgeColor}>
        {icon}
        <span className="font-medium">{planLabel}</span>
      </Badge>
      {showDays && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={`text-sm font-medium flex items-center gap-1 ${
                  isExpiring ? "text-orange-600" : "text-muted-foreground"
                }`}
              >
                {isExpiring ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {days}d left
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Expires: {new Date(expiryDate).toLocaleDateString()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
