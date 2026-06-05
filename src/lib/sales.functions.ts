import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession, getShopOrThrow, computeSubscriptionStatus } from "./session.server";
import { sendStkPush } from "./smartpay.server";
import { checkTransactionLimit, incrementTransactionCount, resetTransactionCountIfNeeded } from "./auth.functions";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?254|0)\d{9}$/, "Enter a valid Kenyan phone number");

const itemSchema = z.union([
  z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive().max(10000),
  }),
  z.object({
    name: z.string().trim().min(1).max(120),
    unit_price: z.number().positive().max(1_000_000),
    quantity: z.number().int().positive().max(10000),
  }),
]);

const createSaleSchema = z.object({
  customer_phone: phoneSchema,
  cash_paid: z.number().min(0).max(1_000_000).optional().default(0),
  items: z.array(itemSchema).min(1).max(50),
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

    const status = computeSubscriptionStatus(shop.subscription_expiry);
    if (status === "expired") {
      throw new Error("Your subscription has expired. Please renew to continue.");
    }
    if (
      !shop.pin_valid_until ||
      new Date(shop.pin_valid_until).getTime() < Date.now()
    ) {
      throw new Error("PIN_REQUIRED");
    }
    if (!shop.payment_channel_id || !shop.payment_api_key) {
      throw new Error("Payment till not set up. Please complete onboarding.");
    }

    const productIds = data.items
      .map((i) => ("product_id" in i ? i.product_id : null))
      .filter((v): v is string => !!v);

    const products = productIds.length
      ? await supabaseAdmin
          .from("products")
          .select("id, name, price, stock")
          .eq("shop_id", s.shop_id)
          .in("id", productIds)
          .then((r) => {
            if (r.error) { console.error("[sales:products]", r.error); throw new Error("Failed to load products."); }
            if (!r.data || r.data.length !== productIds.length) {
              throw new Error("One or more products not found");
            }
            return r.data;
          })
      : [];

    let total = 0;
    const lineItems = data.items.map((i) => {
      if ("product_id" in i) {
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
      }
      const line_total = Number(i.unit_price) * i.quantity;
      total += line_total;
      return {
        product_id: null as string | null,
        product_name: i.name,
        quantity: i.quantity,
        unit_price: Number(i.unit_price),
        line_total,
      };
    });

    const cashPaid = Math.min(Math.round(data.cash_paid ?? 0), Math.round(total));
    const mpesaAmount = Math.round(total) - cashPaid;
    if (mpesaAmount <= 0) {
      throw new Error("Cash paid covers the full amount — no M-Pesa needed. Reduce cash amount.");
    }

    const { data: sale, error: saleErr } = await supabaseAdmin
      .from("sales")
      .insert({
        shop_id: s.shop_id,
        total_amount: total,
        cash_paid: cashPaid,
        mpesa_amount: mpesaAmount,
        customer_phone: data.customer_phone,
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (saleErr || !sale) { console.error("[createSale:insert]", saleErr); throw new Error("Failed to create sale."); }

    const { error: itemsErr } = await supabaseAdmin
      .from("sale_items")
      .insert(lineItems.map((li) => ({ ...li, sale_id: sale.id })));
    if (itemsErr) {
      console.error("[createSale:items]", itemsErr);
      await supabaseAdmin.from("sales").delete().eq("id", sale.id);
      throw new Error("Failed to create sale items.");
    }

    const reference = `SALE-${sale.id}`;
    try {
      // Check transaction limit before sending STK push
      const limitCheck = await checkTransactionLimit(s.shop_id);
      if (!limitCheck.canSend) {
        await supabaseAdmin.from("sales").delete().eq("id", sale.id);
        throw new Error(limitCheck.message || "Transaction limit reached");
      }

      const stk = await sendStkPush({
        amount: mpesaAmount,
        phone_number: data.customer_phone,
        merchant_api_key: shop.payment_api_key,
        external_reference: reference,
        description: `Sale ${sale.id}`,
      });
      
      // Increment transaction count after successful STK push
      await incrementTransactionCount(s.shop_id);
      
      await supabaseAdmin
        .from("sales")
        .update({
          payment_reference: reference,
          payment_checkout_request_id: stk.checkout_request_id,
        })
        .eq("id", sale.id);
    } catch (e) {
      await supabaseAdmin
        .from("sales")
        .update({ payment_status: "failed" })
        .eq("id", sale.id);
      throw e;
    }

    return { sale_id: sale.id, total, cash_paid: cashPaid, mpesa_amount: mpesaAmount, status: "pending" as const };
  });

export const cancelSale = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saleIdSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    const { data: sale, error: getErr } = await supabaseAdmin
      .from("sales")
      .select("id, payment_status")
      .eq("id", data.id)
      .eq("shop_id", s.shop_id)
      .maybeSingle();
    if (getErr) { console.error("[cancelSale]", getErr); throw new Error("Sale lookup failed."); }
    if (!sale) throw new Error("Sale not found");
    if (sale.payment_status === "completed") {
      throw new Error("Completed sales cannot be cancelled");
    }
    const { error } = await supabaseAdmin
      .from("sales")
      .update({ payment_status: "cancelled" })
      .eq("id", data.id)
      .eq("shop_id", s.shop_id);
    if (error) { console.error("[cancelSale:update]", error); throw new Error("Failed to cancel sale."); }
    return { ok: true };
  });

export const getSaleStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saleIdSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    const { data: sale, error } = await supabaseAdmin
      .from("sales")
      .select("id, total_amount, cash_paid, mpesa_amount, customer_phone, payment_status, sold_at")
      .eq("id", data.id)
      .eq("shop_id", s.shop_id)
      .maybeSingle();
    if (error) { console.error("[getSaleStatus]", error); throw new Error("Failed to load sale."); }
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
        "id, total_amount, cash_paid, mpesa_amount, customer_phone, payment_status, sold_at, sale_items(id, product_name, quantity, unit_price, line_total)",
        { count: "exact" }
      )
      .eq("shop_id", s.shop_id)
      .order("sold_at", { ascending: false })
      .range(from, to);
    if (data.from) q = q.gte("sold_at", data.from);
    if (data.to) q = q.lte("sold_at", data.to);

    const { data: rows, error, count } = await q;
    if (error) { console.error("[getSalesHistory]", error); throw new Error("Failed to load history."); }
    return { rows: rows ?? [], total: count ?? 0, page: data.page, page_size: data.page_size };
  });

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  const shop = await getShopOrThrow(s.shop_id);

  // Reset transaction count if needed
  await resetTransactionCountIfNeeded(s.shop_id);
  
  // Get fresh shop data
  const freshShop = await getShopOrThrow(s.shop_id);

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

  if (todaySalesRes.error) { console.error("[todaySalesRes]", todaySalesRes.error); throw new Error("Failed to load data."); }
  if (lowStockRes.error) { console.error("[lowStockRes]", lowStockRes.error); throw new Error("Failed to load data."); }

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

  const transactionRemaining = freshShop.plan === "pro" ? null : 150 - freshShop.transaction_count;

  return {
    shop: {
      id: shop.id,
      shop_name: shop.shop_name,
      owner_name: shop.owner_name,
      subscription_status: status,
      days_remaining,
      subscription_expiry: shop.subscription_expiry,
      plan: freshShop.plan,
      transactionCount: freshShop.transaction_count,
      transactionRemaining,
    },
    today: { sales_count, revenue },
    low_stock,
  };
});

export const getAnalytics = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  const shop = await getShopOrThrow(s.shop_id);

  // Feature gate: Analytics only for Pro plan
  if (shop.plan === "basic") {
    throw new Error("UPGRADE_REQUIRED");
  }

  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startWeek = new Date(now);
  startWeek.setDate(now.getDate() - 7);
  startWeek.setHours(0, 0, 0, 0);
  const start30 = new Date(now.getTime() - 30 * 86400000);
  const start7Days = new Date(now);
  start7Days.setDate(now.getDate() - 6);
  start7Days.setHours(0, 0, 0, 0);

  const [monthSalesRes, weekItemsRes, monthItemsRes, productsRes, dailyRes] =
    await Promise.all([
      supabaseAdmin
        .from("sales")
        .select("id, total_amount, sold_at")
        .eq("shop_id", s.shop_id)
        .eq("payment_status", "completed")
        .gte("sold_at", startMonth.toISOString()),
      supabaseAdmin
        .from("sales")
        .select("id, sale_items(product_id, product_name, quantity)")
        .eq("shop_id", s.shop_id)
        .eq("payment_status", "completed")
        .gte("sold_at", startWeek.toISOString()),
      supabaseAdmin
        .from("sales")
        .select("id, sale_items(product_id, product_name, quantity)")
        .eq("shop_id", s.shop_id)
        .eq("payment_status", "completed")
        .gte("sold_at", start30.toISOString()),
      supabaseAdmin
        .from("products")
        .select("id, name, stock, reorder_level")
        .eq("shop_id", s.shop_id),
      supabaseAdmin
        .from("sales")
        .select("total_amount, sold_at")
        .eq("shop_id", s.shop_id)
        .eq("payment_status", "completed")
        .gte("sold_at", start7Days.toISOString()),
    ]);

  if (monthSalesRes.error) { console.error("[monthSalesRes]", monthSalesRes.error); throw new Error("Failed to load data."); }
  if (weekItemsRes.error) { console.error("[weekItemsRes]", weekItemsRes.error); throw new Error("Failed to load data."); }
  if (monthItemsRes.error) { console.error("[monthItemsRes]", monthItemsRes.error); throw new Error("Failed to load data."); }
  if (productsRes.error) { console.error("[productsRes]", productsRes.error); throw new Error("Failed to load data."); }
  if (dailyRes.error) { console.error("[dailyRes]", dailyRes.error); throw new Error("Failed to load data."); }

  const monthSales = monthSalesRes.data ?? [];
  const monthRevenue = monthSales.reduce(
    (sum, r) => sum + Number(r.total_amount),
    0
  );

  type Item = { product_id: string | null; product_name: string; quantity: number };
  const flatten = (rows: { sale_items: Item[] | null }[] | null): Item[] =>
    (rows ?? []).flatMap((r) => r.sale_items ?? []);

  const weekItems = flatten(weekItemsRes.data as any);
  const monthItems = flatten(monthItemsRes.data as any);

  const tallyByProduct = (items: Item[]) => {
    const map = new Map<string, { name: string; quantity: number; id: string | null }>();
    for (const it of items) {
      const key = it.product_id ?? it.product_name;
      const existing = map.get(key);
      if (existing) existing.quantity += it.quantity;
      else map.set(key, { id: it.product_id, name: it.product_name, quantity: it.quantity });
    }
    return Array.from(map.values());
  };

  const weekTally = tallyByProduct(weekItems).sort((a, b) => b.quantity - a.quantity);
  const monthTally = tallyByProduct(monthItems);

  const best_selling = weekTally.slice(0, 10);

  const products = productsRes.data ?? [];
  const monthSoldByProductId = new Map<string, number>();
  for (const t of monthTally) {
    if (t.id) monthSoldByProductId.set(t.id, t.quantity);
  }
  const slow_moving = products
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      quantity_sold: monthSoldByProductId.get(p.id) ?? 0,
    }))
    .sort((a, b) => a.quantity_sold - b.quantity_sold)
    .slice(0, 10);

  const weekSoldByProductId = new Map<string, number>();
  for (const t of weekTally) {
    if (t.id) weekSoldByProductId.set(t.id, t.quantity);
  }
  const restock = products
    .filter((p) => p.stock <= p.reorder_level)
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock,
      reorder_level: p.reorder_level,
      sold_this_week: weekSoldByProductId.get(p.id) ?? 0,
    }))
    .sort((a, b) => a.stock - b.stock);

  // Daily revenue last 7 days
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const buckets: { key: string; label: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    buckets.push({
      key: d.toISOString().slice(0, 10),
      label: dayLabels[d.getDay()],
      revenue: 0,
    });
  }
  const bucketMap = new Map(buckets.map((b) => [b.key, b]));
  for (const row of dailyRes.data ?? []) {
    const key = new Date(row.sold_at).toISOString().slice(0, 10);
    const b = bucketMap.get(key);
    if (b) b.revenue += Number(row.total_amount);
  }

  const most_sold = best_selling[0] ?? null;
  const low_stock_count = products.filter((p) => p.stock <= p.reorder_level).length;

  return {
    summary: {
      sales_count_month: monthSales.length,
      revenue_month: monthRevenue,
      most_sold,
      low_stock_count,
    },
    best_selling,
    slow_moving,
    restock,
    daily_revenue: buckets,
  };
});
