import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession, getShopOrThrow, computeSubscriptionStatus } from "./session.server";
import { sendStkPush } from "./payhero.server";

const SUBSCRIPTION_AMOUNT = Number(process.env.SUBSCRIPTION_AMOUNT ?? 499);

export const initiateRenewal = createServerFn({ method: "POST" }).handler(async () => {
  const s = await requireSession();
  const shop = await getShopOrThrow(s.shop_id);

  const platformChannel = Number(process.env.PAYHERO_PLATFORM_CHANNEL_ID);
  if (!platformChannel || Number.isNaN(platformChannel)) {
    throw new Error("Platform channel not configured");
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
    await sendStkPush({
      amount: SUBSCRIPTION_AMOUNT,
      phone_number: shop.phone,
      channel_id: platformChannel,
      external_reference: reference,
    });
    await supabaseAdmin
      .from("subscription_payments")
      .update({ payhero_reference: reference })
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
