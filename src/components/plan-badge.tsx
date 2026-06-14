import { useAccessStatus } from "@/hooks/use-access";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock } from "lucide-react";

interface PlanBadgeProps {
  compact?: boolean;
}

/**
 * Displays current plan and days remaining in header/navigation
 */
export function PlanBadge({ compact = false }: PlanBadgeProps) {
  const { data: access, isLoading } = useAccessStatus();

  if (isLoading || !access) {
    return <div className="h-8 w-24 bg-muted rounded animate-pulse" />;
  }

  const isPlan = access.level === "basic" || access.level === "pro";
  const isTrial = access.level === "trial";
  const isExpired = access.level === "expired";

  const planLabel =
    access.level === "trial"
      ? "Trial"
      : access.level === "basic"
        ? "Basic"
        : access.level === "pro"
          ? "Pro"
          : "Expired";

  const planColor = isTrial
    ? "bg-blue-100 text-blue-800"
    : isPlan && access.plan === "basic"
      ? "bg-orange-100 text-orange-800"
      : isPlan && access.plan === "pro"
        ? "bg-purple-100 text-purple-800"
        : "bg-red-100 text-red-800";

  if (compact) {
    return (
      <Badge className={planColor}>
        {planLabel}
        {!isExpired && access.daysRemaining <= 3 && (
          <Clock className="h-3 w-3 ml-1" />
        )}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className={planColor}>{planLabel}</Badge>
      <span className="text-xs text-muted-foreground">
        {isExpired ? (
          <span className="text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Renewal required
          </span>
        ) : (
          <span>
            {access.daysRemaining} days{" "}
            {access.daysRemaining <= 3 ? "⚠️" : "remaining"}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * Full plan info card for settings/profile pages
 */
export function PlanInfoCard() {
  const { data: access, isLoading } = useAccessStatus();

  if (isLoading || !access) {
    return <div className="h-32 bg-muted rounded animate-pulse" />;
  }

  const isTrial = access.level === "trial";
  const isPaid = access.level === "basic" || access.level === "pro";
  const isExpired = access.isLocked;

  const bgColor = isTrial
    ? "bg-blue-50 border-blue-200"
    : isPaid
      ? "bg-green-50 border-green-200"
      : "bg-red-50 border-red-200";

  const textColor = isTrial
    ? "text-blue-900"
    : isPaid
      ? "text-green-900"
      : "text-red-900";

  return (
    <div className={`border rounded-lg p-4 ${bgColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className={`font-semibold ${textColor}`}>
            Current Plan:{" "}
            {access.level === "trial"
              ? "Free Trial"
              : access.level === "basic"
                ? "Basic"
                : access.level === "pro"
                  ? "Professional"
                  : "Expired"}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {isTrial && "Enjoy full access for 14 days - no credit card needed"}
            {access.level === "basic" && "Perfect for solo shops and small teams"}
            {access.level === "pro" && "All features unlocked"}
            {isExpired && "Your subscription has expired"}
          </p>
        </div>
        <Badge
          className={
            isTrial
              ? "bg-blue-100 text-blue-800"
              : isPaid && access.plan === "basic"
                ? "bg-orange-100 text-orange-800"
                : isPaid && access.plan === "pro"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-red-100 text-red-800"
          }
        >
          {access.level === "trial"
            ? "Trial"
            : access.level === "basic"
              ? "Basic"
              : access.level === "pro"
                ? "Pro"
                : "Expired"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-600">Expiry Date</p>
          <p className="font-semibold">
            {new Date(access.expiryDate).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Days Remaining</p>
          <p className={`font-semibold ${access.daysRemaining <= 3 ? "text-red-600" : ""}`}>
            {access.daysRemaining} days
          </p>
        </div>
        <div>
          <p className="text-gray-600">Staff Limit</p>
          <p className="font-semibold">
            {access.staffUsed}/{access.staffLimit}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Access Status</p>
          <p className={`font-semibold ${isExpired ? "text-red-600" : "text-green-600"}`}>
            {isExpired ? "Locked" : "Active"}
          </p>
        </div>
      </div>
    </div>
  );
}
