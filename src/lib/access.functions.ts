import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "./session.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============================================================================
// TYPES
// ============================================================================

export type AccessLevel = "trial" | "basic" | "pro" | "expired";

export interface AccessStatus {
  // Plan & Timing
  level: AccessLevel;
  plan: "trial" | "basic" | "pro" | null;
  status: "trial" | "active" | "expired";
  daysRemaining: number;
  expiryDate: string;

  // Lock State
  isLocked: boolean;
  lockReason?: "subscription_expired" | "plan_downgrade";

  // Feature Flags (per-feature availability)
  features: {
    stk_push: boolean;
    calculator: boolean;
    quick_sale: boolean;
    qr_to_pay: boolean;
    analytics: boolean;
    customers: boolean;
    staff_management: boolean;
  };

  // Staff Limits
  staffLimit: number;
  staffUsed: number;

  // Transaction Limits (legacy, deprecated after new gating)
  transactionLimit: number | null;
  transactionUsed: number;
}

// ============================================================================
// ACCESS LEVEL MAPPING
// ============================================================================

const PLAN_CONFIG: Record<AccessLevel, {
  features: AccessStatus["features"];
  staffLimit: number;
  transactionLimit: number | null;
}> = {
  trial: {
    features: {
      stk_push: true,
      calculator: true,
      quick_sale: true,
      qr_to_pay: true,
      analytics: true,
      customers: true,
      staff_management: true,
    },
    staffLimit: 5,
    transactionLimit: null, // unlimited
  },
  basic: {
    features: {
      stk_push: true,
      calculator: true,
      quick_sale: true,
      qr_to_pay: true,
      analytics: false, // locked
      customers: false, // locked
      staff_management: true,
    },
    staffLimit: 1,
    transactionLimit: null, // no longer used, but kept for compatibility
  },
  pro: {
    features: {
      stk_push: true,
      calculator: true,
      quick_sale: true,
      qr_to_pay: true,
      analytics: true,
      customers: true,
      staff_management: true,
    },
    staffLimit: 5,
    transactionLimit: null, // unlimited
  },
  expired: {
    features: {
      stk_push: false,
      calculator: false,
      quick_sale: false,
      qr_to_pay: false,
      analytics: false,
      customers: false,
      staff_management: false,
    },
    staffLimit: 0,
    transactionLimit: 0,
  },
};

// ============================================================================
// HELPER: Compute Access Level
// ============================================================================

function computeAccessLevel(
  subscriptionStatus: string,
  plan: string | null,
  trialStart: string,
  subscriptionExpiry: string
): AccessLevel {
  // Expired overrides everything
  if (subscriptionStatus === "expired") {
    return "expired";
  }

  // Trial
  if (subscriptionStatus === "trial") {
    return "trial";
  }

  // Active paid plan
  if (subscriptionStatus === "active") {
    if (plan === "pro") return "pro";
    if (plan === "basic") return "basic";
  }

  // Fallback (shouldn't reach here in normal flow)
  return "expired";
}

// ============================================================================
// HELPER: Calculate days remaining
// ============================================================================

function calculateDaysRemaining(expiryDateStr: string): number {
  const now = new Date().getTime();
  const expiry = new Date(expiryDateStr).getTime();
  const diffMs = expiry - now;
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return Math.max(0, diffDays);
}

// ============================================================================
// HELPER: Count staff members by role
// ============================================================================

async function countStaffMembers(shopId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("shop_members")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .eq("role", "staff")
    .in("status", ["active", "pending"]);

  if (error) {
    console.error("[countStaffMembers]", error);
    return 0;
  }

  return data?.length || 0;
}

// ============================================================================
// SERVER FUNCTION: Get Access Status
// ============================================================================

export const getAccessStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const { requireSession, getShopOrThrow } = await import(
      "./session.server"
    );

    const session = await requireSession();
    const shop = await getShopOrThrow(session.shop_id);

    // Compute access level
    const level = computeAccessLevel(
      shop.subscription_status,
      shop.plan,
      shop.trial_start,
      shop.subscription_expiry
    );

    // Get plan config
    const config = PLAN_CONFIG[level];

    // Calculate days remaining
    const daysRemaining = calculateDaysRemaining(shop.subscription_expiry);

    // Count current staff
    const staffUsed = await countStaffMembers(shop.id);

    return {
      level,
      plan: level === "trial" ? "trial" : level === "expired" ? null : (level as "basic" | "pro"),
      status: shop.subscription_status,
      daysRemaining,
      expiryDate: shop.subscription_expiry,
      isLocked: level === "expired",
      lockReason:
        level === "expired"
          ? ("subscription_expired" as const)
          : undefined,
      features: config.features,
      staffLimit: config.staffLimit,
      staffUsed,
      transactionLimit: config.transactionLimit,
      transactionUsed: shop.transaction_count,
    } as AccessStatus;
  }
);

// ============================================================================
// UTILITY: Compute access (for use in other server functions)
// ============================================================================

export function computeAccessFromShop(shop: {
  subscription_status: string;
  plan: string | null;
  trial_start: string;
  subscription_expiry: string;
}): Omit<AccessStatus, "staffUsed"> & { staffUsed: 0 } {
  const level = computeAccessLevel(
    shop.subscription_status,
    shop.plan,
    shop.trial_start,
    shop.subscription_expiry
  );

  const config = PLAN_CONFIG[level];
  const daysRemaining = calculateDaysRemaining(shop.subscription_expiry);

  return {
    level,
    plan: level === "trial" ? "trial" : level === "expired" ? null : (level as "basic" | "pro"),
    status: shop.subscription_status,
    daysRemaining,
    expiryDate: shop.subscription_expiry,
    isLocked: level === "expired",
    lockReason:
      level === "expired"
        ? ("subscription_expired" as const)
        : undefined,
    features: config.features,
    staffLimit: config.staffLimit,
    staffUsed: 0, // Placeholder - callers should fetch if needed
    transactionLimit: config.transactionLimit,
    transactionUsed: 0, // Placeholder
  } as AccessStatus;
}
