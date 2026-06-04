import { createServerFn } from "@tanstack/react-start";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signShopJwt, SESSION_COOKIE } from "./jwt.server";
import { getSessionPayload, getShopOrThrow, requireSession } from "./session.server";
import { registerPaymentChannel } from "./smartpay.server";
import { hasPaymentChannel } from "./session.server";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^0\d{9}$/, "Phone must be 10 digits starting with 0");

const registerSchema = z.object({
  owner_name: z.string().trim().min(2).max(100),
  shop_name: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  password: z.string().min(6).max(128),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
});

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1).max(128),
});

const pinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
});

const onboardSchema = z.object({
  channel_type: z.enum(["till", "paybill", "bank"]),
  short_code: z.string().trim().regex(/^\d{4,12}$/, "Till must be 4-12 digits"),
  account_number: z.string().trim().max(50).optional(),
});

function setSessionCookie(token: string) {
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? 7);

export const registerShop = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => registerSchema.parse(d))
  .handler(async ({ data }) => {
    // Check phone uniqueness
    const { data: existing } = await supabaseAdmin
      .from("shops")
      .select("id")
      .eq("phone", data.phone)
      .maybeSingle();
    if (existing) throw new Error("A shop with this phone already exists");

    const password_hash = await bcrypt.hash(data.password, 12);
    const pin_hash = await bcrypt.hash(data.pin, 12);
    const subscription_expiry = new Date(
      Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .insert({
        owner_name: data.owner_name,
        shop_name: data.shop_name,
        phone: data.phone,
        password_hash,
        pin_hash,
        subscription_expiry,
        subscription_status: "trial",
      })
      .select("id, phone")
      .single();
    if (error || !shop) {
      console.error("[registerShop]", error);
      throw new Error("Failed to create shop. Please try again.");
    }

    const token = await signShopJwt({ shop_id: shop.id, phone: shop.phone });
    setSessionCookie(token);
    return { shop_id: shop.id };
  });

export const loginShop = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => loginSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select("id, phone, password_hash, payment_channel_id, payment_api_key")
      .eq("phone", data.phone)
      .maybeSingle();
    if (error) {
      console.error("[loginShop]", error);
      throw new Error("Login failed. Please try again.");
    }
    if (!shop) throw new Error("Invalid phone or password");

    const ok = await bcrypt.compare(data.password, shop.password_hash);
    if (!ok) throw new Error("Invalid phone or password");

    const token = await signShopJwt({ shop_id: shop.id, phone: shop.phone });
    setSessionCookie(token);
    return {
      shop_id: shop.id,
      needs_onboarding: !hasPaymentChannel(shop),
    };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { ok: true };
});

export const getCurrentShop = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSessionPayload();
  if (!session) return null;
  try {
    const shop = await getShopOrThrow(session.shop_id);
    return {
      ...shop,
      pin_session_valid:
        !!shop.pin_valid_until && new Date(shop.pin_valid_until).getTime() > Date.now(),
      needs_onboarding: !hasPaymentChannel(shop),
    };
  } catch {
    return null;
  }
});

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MS = 15 * 60 * 1000;

export const verifyPin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => pinSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const shopId = session.shop_id;
    const now = Date.now();

    const { data: tracker } = await supabaseAdmin
      .from("pin_attempts")
      .select("attempt_count, locked_until")
      .eq("shop_id", shopId)
      .maybeSingle();

    if (tracker?.locked_until && new Date(tracker.locked_until).getTime() > now) {
      const mins = Math.ceil(
        (new Date(tracker.locked_until).getTime() - now) / 60000
      );
      throw new Error(`Too many attempts. Try again in ${mins} minute(s).`);
    }

    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select("pin_hash")
      .eq("id", shopId)
      .single();
    if (error || !shop) {
      console.error("[verifyPin] shop lookup", error);
      throw new Error("Unable to verify PIN. Please try again.");
    }

    const ok = await bcrypt.compare(data.pin, shop.pin_hash);
    if (!ok) {
      const nextCount = (tracker?.attempt_count ?? 0) + 1;
      const locked_until =
        nextCount >= MAX_PIN_ATTEMPTS
          ? new Date(now + PIN_LOCK_MS).toISOString()
          : null;
      await supabaseAdmin
        .from("pin_attempts")
        .upsert({
          shop_id: shopId,
          attempt_count: nextCount,
          locked_until,
          updated_at: new Date().toISOString(),
        });
      throw new Error("Incorrect PIN");
    }

    await supabaseAdmin.from("pin_attempts").delete().eq("shop_id", shopId);
    const pin_valid_until = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin
      .from("shops")
      .update({ pin_valid_until })
      .eq("id", shopId);
    return { pin_valid_until };
  });


export const onboardTill = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => onboardSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const shop = await getShopOrThrow(session.shop_id);

    const { channelId, apiKey } = await registerPaymentChannel({
      channel_type: data.channel_type,
      short_code: data.short_code,
      account_number: data.account_number,
      description: `${shop.shop_name} (${shop.phone})`,
      notify_phone: shop.phone,
    });

    const { error } = await supabaseAdmin
      .from("shops")
      .update({
        payment_channel_id: channelId,
        payment_api_key: apiKey,
        till_number: data.short_code,
        till_type: data.channel_type,
      })
      .eq("id", session.shop_id);
    if (error) {
      console.error("[onboardTill]", error);
      throw new Error("Failed to save till information.");
    }

    return { channel_id: channelId };
  });
