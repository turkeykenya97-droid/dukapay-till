import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Simple per-instance rate limiter (Worker memory).
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, limit = 100, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || b.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

type CallbackItem = { Name?: string; Value?: unknown };

interface StkCallback {
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: number;
  ResultDesc?: string;
  CallbackMetadata?: { Item?: CallbackItem[] };
}

function readMetadata(items: CallbackItem[] | undefined) {
  const out: Record<string, unknown> = {};
  for (const i of items ?? []) {
    if (i?.Name) out[i.Name] = i.Value;
  }
  return out;
}

export const Route = createFileRoute("/api/public/webhooks/smartpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for") ||
          "unknown";
        if (!rateLimit(ip)) {
          return new Response("Too Many Requests", { status: 429 });
        }

        const rawBody = await request.text();
        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return new Response("ok", { status: 200 });
        }

        const body = (payload.Body as Record<string, unknown> | undefined) ?? {};
        const stk = (body.stkCallback as StkCallback | undefined) ?? {};
        const checkoutRequestId = stk.CheckoutRequestID;
        const resultCode = stk.ResultCode;
        const success = resultCode === 0;

        if (!checkoutRequestId) {
          console.warn("[smartpay] no CheckoutRequestID in payload");
          return new Response("ok", { status: 200 });
        }

        try {
          // Try sale match first
          const { data: sale } = await supabaseAdmin
            .from("sales")
            .select("id, payment_status, payment_reference")
            .eq("payment_checkout_request_id", checkoutRequestId)
            .maybeSingle();

          if (sale) {
            if (sale.payment_status === "pending") {
              if (success) {
                await supabaseAdmin
                  .from("sales")
                  .update({ payment_status: "completed" })
                  .eq("id", sale.id);
                const { data: items } = await supabaseAdmin
                  .from("sale_items")
                  .select("product_id, quantity")
                  .eq("sale_id", sale.id);
                if (items) {
                  for (const it of items) {
                    if (!it.product_id) continue;
                    await supabaseAdmin.rpc("decrement_stock", {
                      p_product_id: it.product_id,
                      p_quantity: it.quantity,
                    });
                  }
                }
              } else {
                await supabaseAdmin
                  .from("sales")
                  .update({ payment_status: "failed" })
                  .eq("id", sale.id);
              }
            }
            return new Response("ok", { status: 200 });
          }

          // Subscription match
          const { data: payment } = await supabaseAdmin
            .from("subscription_payments")
            .select("id, shop_id, payment_status")
            .eq("payment_reference", `SUB-CRID-${checkoutRequestId}`)
            .maybeSingle();

          // Fallback: lookup by stored reference column where we recorded CheckoutRequestID
          let subPayment = payment;
          if (!subPayment) {
            const { data: alt } = await supabaseAdmin
              .from("subscription_payments")
              .select("id, shop_id, payment_status, payment_reference")
              .ilike("payment_reference", `%${checkoutRequestId}%`)
              .maybeSingle();
            subPayment = alt ?? null;
          }

          if (subPayment && subPayment.payment_status === "pending") {
            if (success) {
              await supabaseAdmin
                .from("subscription_payments")
                .update({
                  payment_status: "completed",
                  paid_at: new Date().toISOString(),
                })
                .eq("id", subPayment.id);

              const { data: shop } = await supabaseAdmin
                .from("shops")
                .select("subscription_expiry")
                .eq("id", subPayment.shop_id)
                .single();
              const base = shop?.subscription_expiry
                ? Math.max(Date.now(), new Date(shop.subscription_expiry).getTime())
                : Date.now();
              const newExpiry = new Date(
                base + 30 * 24 * 60 * 60 * 1000
              ).toISOString();
              await supabaseAdmin
                .from("shops")
                .update({
                  subscription_expiry: newExpiry,
                  subscription_status: "active",
                })
                .eq("id", subPayment.shop_id);
            } else {
              await supabaseAdmin
                .from("subscription_payments")
                .update({ payment_status: "failed" })
                .eq("id", subPayment.id);
            }
          }

          // Log metadata for traceability
          const md = readMetadata(stk.CallbackMetadata?.Item);
          console.log("[smartpay] callback", {
            checkoutRequestId,
            resultCode,
            ...md,
          });
        } catch (e) {
          console.error("[smartpay] webhook processing error", e);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
