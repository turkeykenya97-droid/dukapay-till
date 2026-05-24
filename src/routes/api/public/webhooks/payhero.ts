import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYHERO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[payhero] PAYHERO_WEBHOOK_SECRET not configured — rejecting webhook");
    return false;
  }
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  // Accept either raw hex or "sha256=<hex>"
  const provided = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Very simple in-memory rate limiter (per Worker instance).
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(ip: string, limit = 100, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || b.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  if (b.count > limit) return false;
  return true;
}

function pickReference(payload: Record<string, unknown>): string | null {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const candidates = [
    payload.external_reference,
    payload.ExternalReference,
    data.external_reference,
    data.ExternalReference,
    payload.reference,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return null;
}

function pickStatus(payload: Record<string, unknown>): string {
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const candidates = [payload.status, data.Status, data.status, payload.ResultDesc];
  for (const c of candidates) {
    if (typeof c === "string") return c.toUpperCase();
  }
  return "";
}

export const Route = createFileRoute("/api/public/webhooks/payhero")({
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

        // TODO: verify PayHero signature once spec confirmed
        const signature = request.headers.get("x-payhero-signature");
        console.log("[payhero] webhook received", { ip, signature });

        let payload: Record<string, unknown> = {};
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("ok", { status: 200 });
        }

        const reference = pickReference(payload);
        const status = pickStatus(payload);
        const success = ["SUCCESS", "COMPLETED", "PAID", "0"].some((k) =>
          status.includes(k)
        );

        if (!reference) {
          console.warn("[payhero] no reference in payload");
          return new Response("ok", { status: 200 });
        }

        try {
          if (reference.startsWith("SUB-")) {
            const id = reference.slice(4);
            const { data: payment } = await supabaseAdmin
              .from("subscription_payments")
              .select("id, shop_id, payment_status")
              .eq("id", id)
              .maybeSingle();
            if (payment && payment.payment_status === "pending") {
              if (success) {
                await supabaseAdmin
                  .from("subscription_payments")
                  .update({ payment_status: "completed", paid_at: new Date().toISOString() })
                  .eq("id", id);
                // Extend subscription by 30 days from now (or from current expiry if active)
                const { data: shop } = await supabaseAdmin
                  .from("shops")
                  .select("subscription_expiry")
                  .eq("id", payment.shop_id)
                  .single();
                const base = shop?.subscription_expiry
                  ? Math.max(Date.now(), new Date(shop.subscription_expiry).getTime())
                  : Date.now();
                const newExpiry = new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString();
                await supabaseAdmin
                  .from("shops")
                  .update({
                    subscription_expiry: newExpiry,
                    subscription_status: "active",
                  })
                  .eq("id", payment.shop_id);
              } else {
                await supabaseAdmin
                  .from("subscription_payments")
                  .update({ payment_status: "failed" })
                  .eq("id", id);
              }
            }
          } else if (reference.startsWith("SALE-")) {
            const id = reference.slice(5);
            const { data: sale } = await supabaseAdmin
              .from("sales")
              .select("id, payment_status")
              .eq("id", id)
              .maybeSingle();
            if (sale && sale.payment_status === "pending") {
              if (success) {
                await supabaseAdmin
                  .from("sales")
                  .update({ payment_status: "completed" })
                  .eq("id", id);
                // Decrement stock per item
                const { data: items } = await supabaseAdmin
                  .from("sale_items")
                  .select("product_id, quantity")
                  .eq("sale_id", id);
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
                  .eq("id", id);
              }
            }
          }
        } catch (e) {
          console.error("[payhero] webhook processing error", e);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
