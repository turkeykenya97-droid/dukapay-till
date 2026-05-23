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
  payhero_channel_id: number | null;
  till_number: string | null;
  till_type: "paybill" | "till" | "bank" | null;
  trial_start: string;
  subscription_expiry: string;
  subscription_status: "trial" | "active" | "expired";
}

export async function getShopOrThrow(shopId: string): Promise<ShopRecord> {
  const { data, error } = await supabaseAdmin
    .from("shops")
    .select(
      "id, owner_name, shop_name, phone, pin_valid_until, payhero_channel_id, till_number, till_type, trial_start, subscription_expiry, subscription_status"
    )
    .eq("id", shopId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Shop not found");
  return data as ShopRecord;
}

export function computeSubscriptionStatus(
  expiry: string
): "trial" | "active" | "expired" {
  const exp = new Date(expiry).getTime();
  if (Number.isNaN(exp)) return "expired";
  return exp > Date.now() ? "active" : "expired";
}
