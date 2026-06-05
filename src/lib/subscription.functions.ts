import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession, getShopOrThrow, computeSubscriptionStatus } from "./session.server";
import { sendStkPush } from "./smartpay.server";

const PLAN_PRICING = {
  basic: 299,
  pro: 499,
};

const renewalSchema = z.object({
  plan: z.enum(["basic", "pro"]),
});

export const initiateRenewal = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => renewalSchema.parse(d))
  .handler(async ({ data }) => {
  const s = await requireSession();
  const shop = await getShopOrThrow(s.shop_id);

  // Platform subscription is charged via the bootstrap merchant key.
  const platformKey = process.env.SMARTPAY_BOOTSTRAP_API_KEY;
  if (!platformKey) {
    throw new Error("Platform payment key not configured");
  }

  const amount = PLAN_PRICING[data.plan];
  const description = `${data.plan === "pro" ? "Pro" : "Basic"} Plan subscription`;

  const { data: payment, error } = await supabaseAdmin
    .from("subscription_payments")
    .insert({
      shop_id: s.shop_id,
      amount,
      payment_status: "pending",
      ...(data.plan && { plan: data.plan }),
    } as any)
    .select("id")
    .single();
  if (error || !payment) {
    console.error("[initiateRenewal:insert]", error);
    throw new Error("Failed to start payment. Please try again.");
  }

  const reference = `SUB-${payment.id}`;
  try {
    const stk = await sendStkPush({
      amount,
      phone_number: shop.phone,
      external_reference: reference,
      description,
    });
    // Store CheckoutRequestID in payment_reference for webhook reconciliation.
    await supabaseAdmin
      .from("subscription_payments")
      .update({ payment_reference: `${reference}|${stk.checkout_request_id}` })
      .eq("id", payment.id);
  } catch (e) {
    await supabaseAdmin
      .from("subscription_payments")
      .update({ payment_status: "failed" })
      .eq("id", payment.id);
    throw e;
  }

  return { payment_id: payment.id, amount, plan: data.plan };
});

export const getSubscription = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  const shop = await getShopOrThrow(s.shop_id);
  const status = computeSubscriptionStatus(shop.subscription_expiry, shop.trial_start);
  return {
    status,
    expiry: shop.subscription_expiry,
    trial_start: shop.trial_start,
    plans: PLAN_PRICING,
  };
});
