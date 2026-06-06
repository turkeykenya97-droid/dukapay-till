// Server-only helpers for auth functions
// This file contains functions that import from session.server and should not be bundled on the client
import { getShopOrThrow, computeSubscriptionStatus } from "./session.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Check and reset transaction count if month has changed
 * Used before allowing STK push
 */
export async function resetTransactionCountIfNeeded(shopId: string): Promise<void> {
  const shop = await getShopOrThrow(shopId);
  const today = new Date().toISOString().split('T')[0];
  const lastReset = shop.transaction_reset_date;

  if (lastReset !== today) {
    await supabaseAdmin
      .from("shops")
      .update({
        transaction_count: 0,
        transaction_reset_date: today,
      })
      .eq("id", shopId);
  }
}

/**
 * Check if shop can send STK push based on plan and transaction limit
 * Returns { canSend: boolean, remaining?: number, message?: string }
 */
export async function checkTransactionLimit(shopId: string): Promise<{
  canSend: boolean;
  remaining?: number;
  message?: string;
}> {
  await resetTransactionCountIfNeeded(shopId);
  const shop = await getShopOrThrow(shopId);

  // Trial and Pro users have unlimited transactions
  const status = computeSubscriptionStatus(shop.subscription_expiry, shop.trial_start);
  if (shop.plan === "pro" || status === "trial") {
    return { canSend: true };
  }

  // Basic plan (after trial): 150 transactions per month
  const BASIC_LIMIT = 150;
  const remaining = BASIC_LIMIT - shop.transaction_count;

  if (remaining <= 0) {
    return {
      canSend: false,
      remaining: 0,
      message: `Transaction limit reached. You've used all 150 transactions this month. Upgrade to Pro for unlimited transactions.`,
    };
  }

  return { canSend: true, remaining };
}

/**
 * Increment transaction count after successful STK push
 */
export async function incrementTransactionCount(shopId: string): Promise<void> {
  const shop = await getShopOrThrow(shopId);
  await supabaseAdmin
    .from("shops")
    .update({
      transaction_count: shop.transaction_count + 1,
    })
    .eq("id", shopId);
}
