import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendStkPush } from "./smartpay.server";
import { computeSubscriptionStatus } from "./session.server";

const publicPaymentSchema = z.object({
  shop_id: z.string().uuid(),
  amount: z.number().int().min(1).max(300000),
  phone: z.string().min(10),
});

export const initiatePublicPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => publicPaymentSchema.parse(d))
  .handler(async ({ data }) => {
    // 1) Validate amount range
    if (data.amount < 1 || data.amount > 300000) {
      throw new Error("Amount must be between KES 1 and KES 300,000");
    }

    // 2) Validate Kenyan phone number format (07XX XXX XXX or 254...)
    const phonePattern = /^(\+?254|0)?7\d{8}$/;
    if (!phonePattern.test(data.phone.replace(/\s+/g, ""))) {
      throw new Error("Invalid Kenyan phone number format");
    }

    // 3) Look up shop from Supabase
    const { data: shop, error: shopError } = await supabaseAdmin
      .from("shops")
      .select("id, shop_name, owner_name, payment_api_key, till_number, subscription_status, subscription_expiry, trial_start, plan")
      .eq("id", data.shop_id)
      .maybeSingle();

    if (shopError) {
      console.error("[initiatePublicPayment:shop lookup]", shopError);
      throw new Error("Failed to load shop details");
    }

    if (!shop) {
      throw new Error("Shop not found");
    }

    // 4) Check shop subscription is not expired
    const status = computeSubscriptionStatus(shop.subscription_expiry, shop.trial_start);
    if (status === "expired") {
      throw new Error("Shop subscription inactive");
    }

    // 5) Send STK push
    let stkResult;
    try {
      stkResult = await sendStkPush({
        amount: data.amount,
        phone_number: data.phone,
        external_reference: `QR-${data.shop_id}-${Date.now()}`,
        description: `Payment to ${shop.shop_name}`,
        merchant_api_key: shop.payment_api_key,
      });
    } catch (err) {
      console.error("[initiatePublicPayment:stk push]", err);
      throw new Error("Failed to send M-Pesa request. Please try again.");
    }

    // 6) Save transaction to sales table
    const { error: saleError } = await supabaseAdmin.from("sales").insert({
      shop_id: data.shop_id,
      total_amount: data.amount,
      mpesa_amount: data.amount,
      cash_paid: 0,
      customer_phone: data.phone,
      payment_status: "pending",
      payment_method: "mpesa",
      payment_checkout_request_id: stkResult.checkout_request_id,
      payment_reference: stkResult.reference,
      source: "qr_code",
      sold_at: new Date().toISOString(),
    });

    if (saleError) {
      console.error("[initiatePublicPayment:save sale]", saleError);
      throw new Error("Payment initiated but failed to record. Contact support.");
    }

    return {
      success: true,
      checkout_request_id: stkResult.checkout_request_id,
    };
  });
