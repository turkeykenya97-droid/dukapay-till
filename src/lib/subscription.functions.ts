import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession, getShopOrThrow, computeSubscriptionStatus } from "./session.server";
import { sendStkPush } from "./smartpay.server";

const SUBSCRIPTION_AMOUNT = Number(process.env.SUBSCRIPTION_AMOUNT ?? 499);

export const initiateRenewal = createServerFn({ method: "POST" }).handler(async () => {
  const s = await requireSession();
  const shop = await getShopOrThrow(s.shop_id);

  // Platform subscription is charged via the bootstrap merchant key.
  const platformKey = process.env.SMARTPAY_BOOTSTRAP_API_KEY;
  if (!platformKey) {
    throw new Error("Platform payment key not configured");
  }

  const { data: payment, error } = await supabaseAdmin
    .from("subscription_payments")
    .insert({
      shop_id: s.shop_id,
      amount: SUBSCRIPTION_AMOUNT,
      payment_status: "pending",
    })
    .select("id")
    .single();
  if (error || !payment) {
    console.error("[initiateRenewal:insert]", error);
    throw new Error("Failed to start payment. Please try again.");
  }

  const reference = `SUB-${payment.id}`;
  try {
    const stk = await sendStkPush({
      amount: SUBSCRIPTION_AMOUNT,
      phone_number: shop.phone,
      merchant_api_key: platformKey,
      external_reference: reference,
      description: "Subscription renewal",
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

  return { payment_id: payment.id, amount: SUBSCRIPTION_AMOUNT };
});

export const getSubscription = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  const shop = await getShopOrThrow(s.shop_id);
  const status = computeSubscriptionStatus(shop.subscription_expiry);
  return {
    status,
    expiry: shop.subscription_expiry,
    trial_start: shop.trial_start,
    amount: SUBSCRIPTION_AMOUNT,
  };
});
