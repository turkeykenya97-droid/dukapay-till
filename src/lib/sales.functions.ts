import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession, getShopOrThrow, computeSubscriptionStatus } from "./session.server";
import { sendStkPush } from "./payhero.server";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?254|0)\d{9}$/, "Enter a valid Kenyan phone number");

const createSaleSchema = z.object({
  customer_phone: phoneSchema,
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().positive().max(10000),
      })
    )
    .min(1)
    .max(50),
});

const saleIdSchema = z.object({ id: z.string().uuid() });

const historySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(50).default(20),
});

export const createSale = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSaleSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    const shop = await getShopOrThrow(s.shop_id);

    // Subscription check
    const status = computeSubscriptionStatus(shop.subscription_expiry);
    if (status === "expired") {
      throw new Error("Your subscription has expired. Please renew to continue.");
    }
    // PIN session check
    if (
      !shop.pin_valid_until ||
      new Date(shop.pin_valid_until).getTime() < Date.now()
    ) {
      throw new Error("PIN_REQUIRED");
    }
    // Till registered
    if (!shop.payhero_channel_id) {
      throw new Error("Payment till not set up. Please complete onboarding.");
    }

    // Validate products + stock
    const productIds = data.items.map((i) => i.product_id);
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("id, name, price, stock")
      .eq("shop_id", s.shop_id)
      .in("id", productIds);
    if (prodErr) throw new Error(prodErr.message);
    if (!products || products.length !== productIds.length) {
      throw new Error("One or more products not found");
    }

    let total = 0;
    const lineItems = data.items.map((i) => {
      const p = products.find((x) => x.id === i.product_id)!;
      if (p.stock < i.quantity) {
        throw new Error(`Insufficient stock for ${p.name}`);
      }
      const line_total = Number(p.price) * i.quantity;
      total += line_total;
      return {
        product_id: p.id,
        product_name: p.name,
        quantity: i.quantity,
        unit_price: Number(p.price),
        line_total,
      };
    });

    // Create sale (pending)
    const { data: sale, error: saleErr } = await supabaseAdmin
      .from("sales")
      .insert({
        shop_id: s.shop_id,
        total_amount: total,
        customer_phone: data.customer_phone,
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (saleErr || !sale) throw new Error(saleErr?.message ?? "Failed to create sale");

    // Create sale items
    const { error: itemsErr } = await supabaseAdmin
      .from("sale_items")
      .insert(lineItems.map((li) => ({ ...li, sale_id: sale.id })));
    if (itemsErr) {
      await supabaseAdmin.from("sales").delete().eq("id", sale.id);
      throw new Error(itemsErr.message);
    }

    // STK Push to shop owner's channel
    const reference = `SALE-${sale.id}`;
    try {
      const stk = await sendStkPush({
        amount: Math.round(total),
        phone_number: data.customer_phone,
        channel_id: shop.payhero_channel_id,
        external_reference: reference,
      });
      await supabaseAdmin
        .from("sales")
        .update({
          payhero_reference: reference,
          payhero_checkout_request_id: stk.checkout_request_id,
        })
        .eq("id", sale.id);
    } catch (e) {
      await supabaseAdmin
        .from("sales")
        .update({ payment_status: "failed" })
        .eq("id", sale.id);
      throw e;
    }

    return { sale_id: sale.id, total, status: "pending" as const };
  });

export const getSaleStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saleIdSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    const { data: sale, error } = await supabaseAdmin
      .from("sales")
      .select("id, total_amount, customer_phone, payment_status, sold_at")
      .eq("id", data.id)
      .eq("shop_id", s.shop_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!sale) throw new Error("Sale not found");
    return sale;
  });

export const getSalesHistory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => historySchema.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    const from = (data.page - 1) * data.page_size;
    const to = from + data.page_size - 1;

    let q = supabaseAdmin
      .from("sales")
      .select(
        "id, total_amount, customer_phone, payment_status, sold_at, sale_items(id, product_name, quantity, unit_price, line_total)",
        { count: "exact" }
      )
      .eq("shop_id", s.shop_id)
      .order("sold_at", { ascending: false })
      .range(from, to);
    if (data.from) q = q.gte("sold_at", data.from);
    if (data.to) q = q.lte("sold_at", data.to);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, page_size: data.page_size };
  });

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  const shop = await getShopOrThrow(s.shop_id);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todaySalesRes, lowStockRes] = await Promise.all([
    supabaseAdmin
      .from("sales")
      .select("id, total_amount")
      .eq("shop_id", s.shop_id)
      .eq("payment_status", "completed")
      .gte("sold_at", startOfDay.toISOString()),
    supabaseAdmin
      .from("products")
      .select("id, name, stock, reorder_level")
      .eq("shop_id", s.shop_id),
  ]);

  if (todaySalesRes.error) throw new Error(todaySalesRes.error.message);
  if (lowStockRes.error) throw new Error(lowStockRes.error.message);

  const sales = todaySalesRes.data ?? [];
  const sales_count = sales.length;
  const revenue = sales.reduce((sum, r) => sum + Number(r.total_amount), 0);
  const low_stock = (lowStockRes.data ?? []).filter(
    (p) => p.stock <= p.reorder_level
  );

  const status = computeSubscriptionStatus(shop.subscription_expiry);
  const days_remaining = Math.max(
    0,
    Math.ceil(
      (new Date(shop.subscription_expiry).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000)
    )
  );

  return {
    shop: {
      id: shop.id,
      shop_name: shop.shop_name,
      owner_name: shop.owner_name,
      subscription_status: status,
      days_remaining,
      subscription_expiry: shop.subscription_expiry,
    },
    today: { sales_count, revenue },
    low_stock,
  };
});
