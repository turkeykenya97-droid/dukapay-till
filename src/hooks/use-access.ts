import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAccessStatus, type AccessStatus } from "@/lib/access.functions";

/**
 * Hook to get current user's access status and subscription tier
 * Returns: { level, plan, features, staffLimit, isLocked, daysRemaining, etc. }
 */
export function useAccessStatus() {
  const accessFn = useServerFn(getAccessStatus);

  return useQuery<AccessStatus>({
    queryKey: ["accessStatus"],
    queryFn: () => accessFn(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to check if a specific feature is available
 * Usage: const { allowed } = useFeatureAccess("analytics");
 */
export function useFeatureAccess(feature: keyof AccessStatus["features"]) {
  const { data: access, isLoading } = useAccessStatus();

  return {
    allowed: access?.features[feature] ?? false,
    level: access?.level,
    isLocked: access?.isLocked ?? false,
    isLoading,
    upgrade: {
      level: feature === "analytics" || feature === "customers" ? "pro" : null,
      message:
        feature === "analytics"
          ? "Analytics is a Pro feature. Upgrade to Pro to unlock."
          : feature === "customers"
            ? "Customer profiles are a Pro feature. Upgrade to Pro to unlock."
            : null,
    },
  };
}

/**
 * Hook to check staff invite limits
 * Usage: const { canInvite, remaining, message } = useStaffLimit();
 */
export function useStaffLimit() {
  const { data: access, isLoading } = useAccessStatus();

  const canInvite = !access?.isLocked && access && access.staffUsed < access.staffLimit;
  const remaining = access ? access.staffLimit - access.staffUsed : 0;
  const planName = access?.level === "trial" ? "Trial" : access?.plan === "basic" ? "Basic" : "Pro";

  let message = "";
  if (access?.isLocked) {
    message = "Your subscription has expired. Renew to invite staff.";
  } else if (!canInvite) {
    message = `You've reached your staff limit for the ${planName} plan. ${
      access?.level === "basic" ? "Upgrade to Pro to invite up to 5 team members." : ""
    }`;
  }

  return {
    canInvite,
    remaining,
    used: access?.staffUsed ?? 0,
    limit: access?.staffLimit ?? 0,
    message,
    planName,
    isLoading,
  };
}

/**
 * Hook to check if subscription is active (trial or paid)
 */
export function useIsSubscriptionActive() {
  const { data: access, isLoading } = useAccessStatus();

  return {
    isActive: !access?.isLocked,
    isPaid: access?.level === "basic" || access?.level === "pro",
    isTrial: access?.level === "trial",
    isExpired: access?.isLocked,
    isLoading,
  };
}

/**
 * Hook to check days remaining on subscription
 */
export function useSubscriptionDaysRemaining() {
  const { data: access, isLoading } = useAccessStatus();

  return {
    days: access?.daysRemaining ?? 0,
    expiryDate: access?.expiryDate,
    isExpiring: access && access.daysRemaining <= 3,
    isExpired: access?.isLocked,
    isLoading,
  };
}
