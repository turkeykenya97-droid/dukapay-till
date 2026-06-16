import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { signShopJwt, SESSION_COOKIE } from "./jwt.server";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^0\d{9}$/, "Phone must be 10 digits starting with 0");

// Simple UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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

async function setSessionCookie(token: string) {
  const { setCookie } = await import("@tanstack/react-start/server");
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? 14);

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

    const [password_hash, pin_hash] = await Promise.all([
      bcrypt.hash(data.password, 4),
      bcrypt.hash(data.pin, 4),
    ]);
    
    const now = new Date();
    const trial_start = now.toISOString();
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
        trial_start,
        subscription_expiry,
        subscription_status: "trial",
        plan: "basic",
        transaction_count: 0,
        transaction_reset_date: new Date().toISOString().split('T')[0],
      })
      .select("id, phone")
      .single();
    if (error || !shop) {
      console.error("[registerShop]", error);
      throw new Error("Failed to create shop. Please try again.");
    }

    // Create a user record for the shop owner
    const userId = generateUUID();
    
    const { error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        id: userId,
        email: `${data.phone}@shop.local`,
      });
    
    if (userError) {
      console.error("[registerShop] user creation failed", userError);
      throw new Error("Failed to set up shop owner. Please try again.");
    }

    // Create shop_member entry with owner role
    const { error: memberError } = await supabaseAdmin
      .from("shop_members")
      .insert({
        shop_id: shop.id,
        user_id: userId,
        role: "owner",
        status: "active",
        accepted_at: now,
      });
    
    if (memberError) {
      console.error("[registerShop] shop member creation failed", memberError);
      throw new Error("Failed to set up shop owner. Please try again.");
    }

    const token = await signShopJwt({ 
      shop_id: shop.id, 
      user_id: userId,
      phone: shop.phone 
    });
    await setSessionCookie(token);
    return { shop_id: shop.id };
  });

export const loginShop = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => loginSchema.parse(d))
  .handler(async ({ data }) => {
    // Check if it's a merchant
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

    // Get the owner's user_id from shop_members
    const { data: shopMember, error: memberError } = await supabaseAdmin
      .from("shop_members")
      .select("user_id")
      .eq("shop_id", shop.id)
      .eq("role", "owner")
      .eq("status", "active")
      .single();
    
    if (memberError || !shopMember) {
      console.error("[loginShop] shop member lookup failed", memberError);
      throw new Error("Login failed. Please try again.");
    }

    const token = await signShopJwt({ 
      shop_id: shop.id, 
      user_id: shopMember.user_id,
      phone: shop.phone 
    });
    await setSessionCookie(token);
    
    const { hasPaymentChannel } = await import("./session.server");
    return {
      shop_id: shop.id,
      is_admin: false,
      needs_onboarding: !hasPaymentChannel(shop),
    };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { deleteCookie } = await import("@tanstack/react-start/server");
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { ok: true };
});

export const getCurrentShop = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionPayload, getShopOrThrow, hasPaymentChannel } = await import("./session.server");
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
    const { requireSession } = await import("./session.server");
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
    const { requireSession, getShopOrThrow } = await import("./session.server");
    const { registerPaymentChannel } = await import("./smartpay.server");
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

/**
 * Server function to get plan and transaction info for dashboard
 */
export const getPlanInfo = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionPayload, getShopOrThrow, computeSubscriptionStatus } = await import("./session.server");
  const { resetTransactionCountIfNeeded } = await import("./auth-helpers.server");
  const session = await getSessionPayload();
  if (!session) return null;
  try {
    const shop = await getShopOrThrow(session.shop_id);
    await resetTransactionCountIfNeeded(session.shop_id);

    const refreshedShop = await getShopOrThrow(session.shop_id);
    const status = computeSubscriptionStatus(refreshedShop.subscription_expiry, refreshedShop.trial_start);
    const remaining = refreshedShop.plan === "pro" || status === "trial" ? null : 150 - refreshedShop.transaction_count;

    return {
      plan: refreshedShop.plan,
      transactionCount: refreshedShop.transaction_count,
      remaining,
      status,
    };
  } catch {
    return null;
  }
});

/**
 * Get complete user profile with all details
 */
export const getProfile = createServerFn({ method: "GET" }).handler(async () => {
  const { requireSession, getShopOrThrow, computeSubscriptionStatus } = await import("./session.server");
  const session = await requireSession();
  const shop = await getShopOrThrow(session.shop_id);

  const status = computeSubscriptionStatus(shop.subscription_expiry, shop.trial_start);
  const days_remaining = Math.max(
    0,
    Math.ceil(
      (new Date(shop.subscription_expiry).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000)
    )
  );

  return {
    id: shop.id,
    owner_name: shop.owner_name,
    shop_name: shop.shop_name,
    phone: shop.phone,
    plan: shop.plan,
    subscription_status: status,
    subscription_expiry: shop.subscription_expiry,
    days_remaining,
    till_number: shop.till_number,
    till_type: shop.till_type,
    payment_channel_id: shop.payment_channel_id,
    created_at: shop.created_at,
    transaction_count: shop.transaction_count,
    transaction_reset_date: shop.transaction_reset_date,
  };
});

const updatePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6).max(128),
  confirm_password: z.string().min(6).max(128),
});

/**
 * Change user password
 */
export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updatePasswordSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireSession } = await import("./session.server");
    const session = await requireSession();
    const shopId = session.shop_id;

    if (data.new_password !== data.confirm_password) {
      throw new Error("New passwords don't match");
    }

    const { data: shop, error } = await supabaseAdmin
      .from("shops")
      .select("password_hash")
      .eq("id", shopId)
      .single();

    if (error || !shop) {
      throw new Error("Unable to verify current password");
    }

    const ok = await bcrypt.compare(data.current_password, shop.password_hash);
    if (!ok) {
      throw new Error("Current password is incorrect");
    }

    const new_password_hash = await bcrypt.hash(data.new_password, 4);
    const { error: updateErr } = await supabaseAdmin
      .from("shops")
      .update({ password_hash: new_password_hash })
      .eq("id", shopId);

    if (updateErr) {
      console.error("[changePassword]", updateErr);
      throw new Error("Failed to update password");
    }

    return { ok: true };
  });

/**
 * Get available subscription plans and pricing
 */
export const getPlans = createServerFn({ method: "GET" }).handler(async () => {
  return {
    plans: [
      {
        id: "basic",
        name: "Basic",
        price: 299,
        description: "Perfect for small shops",
        features: [
          "M-Pesa STK Push",
          "Calculator",
          "150 transactions/month",
          "Basic support",
        ],
        limitations: [
          "No analytics",
          "No stock management",
          "No receipts",
        ],
      },
      {
        id: "pro",
        name: "Pro",
        price: 499,
        description: "For growing businesses",
        features: [
          "Unlimited transactions",
          "Full analytics & reporting",
          "Advanced stock management",
          "Digital & printed receipts",
          "Priority support",
        ],
        limitations: [],
      },
    ],
    subscription_amount: Number(process.env.SUBSCRIPTION_AMOUNT ?? 499),
  };
});

/**
 * Update till settings for a shop
 */
const updateTillSchema = z.object({
  till_type: z.enum(["paybill", "till", "bank"]),
  till_number: z.string().trim().regex(/^\d{4,}$/, "Till number must be at least 4 digits"),
});

export const updateTillSettings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateTillSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireSession } = await import("./session.server");
    const s = await requireSession();
    const { till_type, till_number } = data;

    const { error } = await supabaseAdmin
      .from("shops")
      .update({
        till_type,
        till_number: till_number.trim(),
      })
      .eq("id", s.shop_id);

    if (error) {
      console.error("[updateTillSettings]", error);
      throw new Error("Failed to update till settings");
    }

    return { ok: true };
  });
