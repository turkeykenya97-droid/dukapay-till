// Server-only helpers for reading the session cookie and looking up the shop.
import { getCookie } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SESSION_COOKIE, verifyShopJwt, type ShopJwtPayload } from "./jwt.server";

export async function getSessionPayload(): Promise<ShopJwtPayload | null> {
  const token = getCookie(SESSION_COOKIE);
  if (!token) return null;
  try {
    return await verifyShopJwt(token);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<ShopJwtPayload> {
  const s = await getSessionPayload();
  if (!s) throw new Error("Unauthorized");
  return s;
}

export interface ShopRecord {
  id: string;
  owner_name: string;
  shop_name: string;
  phone: string;
  pin_valid_until: string | null;
  payment_channel_id: string | null;
  payment_api_key: string | null;
  till_number: string | null;
  till_type: "paybill" | "till" | "bank" | null;
  trial_start: string;
  subscription_expiry: string;
  subscription_status: "trial" | "active" | "expired";
  plan: string;
  transaction_count: number;
  transaction_reset_date: string;
}

export function hasPaymentChannel(shop: {
  payment_channel_id: string | null;
  payment_api_key: string | null;
}): boolean {
  return !!shop.payment_channel_id && !!shop.payment_api_key;
}

export async function getShopOrThrow(shopId: string): Promise<ShopRecord> {
  const { data, error } = await supabaseAdmin
    .from("shops")
    .select(
      "id, owner_name, shop_name, phone, pin_valid_until, payment_channel_id, payment_api_key, till_number, till_type, trial_start, subscription_expiry, subscription_status, plan, transaction_count, transaction_reset_date"
    )
    .eq("id", shopId)
    .maybeSingle();
  if (error) {
    console.error("[getShopOrThrow]", error);
    throw new Error("Unable to load shop.");
  }
  if (!data) throw new Error("Shop not found");
  return data as ShopRecord;
}

export function computeSubscriptionStatus(
  expiry: string,
  trialStart?: string
): "trial" | "active" | "expired" {
  const exp = new Date(expiry).getTime();
  if (Number.isNaN(exp)) return "expired";
  
  const now = Date.now();
  
  // If trial_start is provided and we're still within TRIAL_DAYS of it, it's trial
  if (trialStart) {
    const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? 30);
    const trialStart_ms = new Date(trialStart).getTime();
    const trialEnd_ms = trialStart_ms + TRIAL_DAYS * 24 * 60 * 60 * 1000;
    
    if (now < trialEnd_ms) {
      return "trial";
    }
  }
  
  // After trial period or if no trial_start, check expiry
  return exp > now ? "active" : "expired";
}
