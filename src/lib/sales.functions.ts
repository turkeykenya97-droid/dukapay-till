import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession, getShopOrThrow, computeSubscriptionStatus } from "./session.server";
import { sendStkPush } from "./smartpay.server";
import { checkTransactionLimit, incrementTransactionCount, resetTransactionCountIfNeeded } from "./auth-helpers.server";

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
        payment_method: "mpesa",
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
        external_reference: reference,
        description: `Sale ${sale.id}`,
        merchant_api_key: shop.payment_api_key,
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
    try {
      const s = await requireSession();
      const { data: sale, error } = await supabaseAdmin
        .from("sales")
        .select("id, total_amount, cash_paid, mpesa_amount, customer_phone, payment_status, sold_at")
        .eq("id", data.id)
        .eq("shop_id", s.shop_id)
        .maybeSingle();
      if (error) {
        console.error("[getSaleStatus]", error);
        throw new Error("Failed to load sale.");
      }
      if (!sale) {
        console.warn("[getSaleStatus] Sale not found yet, returning pending state");
        return {
          id: data.id,
          total_amount: 0,
          cash_paid: 0,
          mpesa_amount: 0,
          customer_phone: "",
          payment_status: "pending",
          sold_at: new Date().toISOString(),
        };
      }
      return sale;
    } catch (err) {
      console.error("[getSaleStatus] Caught error:", err);
      throw err;
    }
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

  const status = computeSubscriptionStatus(shop.subscription_expiry, shop.trial_start);
  const days_remaining = Math.max(
    0,
    Math.ceil(
      (new Date(shop.subscription_expiry).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000)
    )
  );

  // During trial, show trial status; after trial, show plan (basic/pro)
  const displayStatus = status === "trial" ? "trial" : shop.plan;
  const transactionRemaining = shop.plan === "pro" || status === "trial" ? null : 150 - freshShop.transaction_count;

  return {
    shop: {
      id: shop.id,
      shop_name: shop.shop_name,
      owner_name: shop.owner_name,
      subscription_status: status,
      display_status: displayStatus,
      days_remaining,
      subscription_expiry: shop.subscription_expiry,
      plan: shop.plan,
      transactionCount: freshShop.transaction_count,
      transactionRemaining,
    },
    today: { sales_count, revenue },
    low_stock,
  };
});

export const getAnalytics = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ startDate: z.string().optional(), endDate: z.string().optional() }).parse(d || {}))
  .handler(async ({ data: dateRange }) => {
    const s = await requireSession();
    const shop = await getShopOrThrow(s.shop_id);

    // Feature gate: Analytics available for Pro plan or Trial users
    const status = computeSubscriptionStatus(shop.subscription_expiry, shop.trial_start);
    if (shop.plan === "basic" && status !== "trial") {
      throw new Error("UPGRADE_REQUIRED");
    }

    const now = new Date();
    
    // Date ranges
    const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : now;
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startWeek = new Date(now);
    startWeek.setDate(now.getDate() - 7);
    startWeek.setHours(0, 0, 0, 0);
    const start30 = new Date(now.getTime() - 30 * 86400000);
    const start7Days = new Date(now);
    start7Days.setDate(now.getDate() - 6);
    start7Days.setHours(0, 0, 0, 0);
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);

    const [monthSalesRes, weekItemsRes, monthItemsRes, productsRes, dailyRes, allSalesRes, customRangeSalesRes, hourlyRes] =
      await Promise.all([
        supabaseAdmin
          .from("sales")
          .select("id, total_amount, sold_at, cash_paid, mpesa_amount, payment_checkout_request_id, discount_amount")
          .eq("shop_id", s.shop_id)
          .eq("payment_status", "completed")
          .gte("sold_at", startMonth.toISOString()),
        supabaseAdmin
          .from("sales")
          .select("id, sale_items(product_id, product_name, quantity, unit_price)")
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
          .select("id, name, stock, reorder_level, price, cost_price")
          .eq("shop_id", s.shop_id),
        supabaseAdmin
          .from("sales")
          .select("total_amount, sold_at, cash_paid, mpesa_amount")
          .eq("shop_id", s.shop_id)
          .eq("payment_status", "completed")
          .gte("sold_at", start7Days.toISOString()),
        supabaseAdmin
          .from("sales")
          .select("id, total_amount, customer_phone, sold_at, cash_paid, mpesa_amount, discount_amount, sale_items(quantity, unit_price)")
          .eq("shop_id", s.shop_id)
          .eq("payment_status", "completed")
          .gte("sold_at", startDate.toISOString())
          .lte("sold_at", endDate.toISOString()),
        supabaseAdmin
          .from("sales")
          .select("total_amount, sold_at, cash_paid, mpesa_amount")
          .eq("shop_id", s.shop_id)
          .eq("payment_status", "completed")
          .gte("sold_at", startDate.toISOString())
          .lte("sold_at", endDate.toISOString()),
        supabaseAdmin
          .from("sales")
          .select("total_amount, sold_at")
          .eq("shop_id", s.shop_id)
          .eq("payment_status", "completed")
          .gte("sold_at", startToday.toISOString()),
      ]);

    if (monthSalesRes.error) { console.error("[monthSalesRes]", monthSalesRes.error); throw new Error("Failed to load data."); }
    if (weekItemsRes.error) { console.error("[weekItemsRes]", weekItemsRes.error); throw new Error("Failed to load data."); }
    if (monthItemsRes.error) { console.error("[monthItemsRes]", monthItemsRes.error); throw new Error("Failed to load data."); }
    if (productsRes.error) { console.error("[productsRes]", productsRes.error); throw new Error("Failed to load data."); }
    if (dailyRes.error) { console.error("[dailyRes]", dailyRes.error); throw new Error("Failed to load data."); }
    if (customRangeSalesRes.error) { console.error("[customRangeSalesRes]", customRangeSalesRes.error); throw new Error("Failed to load data."); }
    if (allSalesRes.error) { console.error("[allSalesRes]", allSalesRes.error); throw new Error("Failed to load data."); }
    if (hourlyRes.error) { console.error("[hourlyRes]", hourlyRes.error); throw new Error("Failed to load data."); }

    // Module 1: Sales & Revenue
    const monthSales = monthSalesRes.data ?? [];
    const customRangeSales = customRangeSalesRes.data ?? [];
    const monthRevenue = monthSales.reduce((sum, r) => sum + Number(r.total_amount), 0);
    const customRangeRevenue = customRangeSales.reduce((sum, r) => sum + Number(r.total_amount), 0);
    const todaySales = hourlyRes.data ?? [];
    const todayRevenue = todaySales.reduce((sum, r) => sum + Number(r.total_amount), 0);
    const weekRevenue = (dailyRes.data ?? []).reduce((sum, r) => sum + Number(r.total_amount), 0);

    // Average Order Value
    const aov = customRangeSales.length > 0 ? customRangeRevenue / customRangeSales.length : 0;

    // Payment method split
    const paymentSplit = {
      cash: customRangeSales.reduce((sum, r) => sum + Number(r.cash_paid || 0), 0),
      mpesa: customRangeSales.reduce((sum, r) => sum + Number(r.mpesa_amount || 0), 0),
      card: 0, // Will be tracked if card payments added
    };

    // Discount tracking
    const totalDiscounts = customRangeSales.reduce((sum, r) => sum + Number(r.discount_amount || 0), 0);

    // Sales by day of week
    const dayOfWeekMap = new Map<number, number>();
    for (let i = 0; i < 7; i++) dayOfWeekMap.set(i, 0);
    for (const sale of customRangeSales) {
      const day = new Date(sale.sold_at).getDay();
      dayOfWeekMap.set(day, (dayOfWeekMap.get(day) ?? 0) + Number(sale.total_amount));
    }
    const salesByDayOfWeek = Array.from(dayOfWeekMap.entries()).map(([day, revenue]) => ({
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day],
      revenue,
    }));

    // Sales by hour
    const hourMap = new Map<number, number>();
    for (let i = 0; i < 24; i++) hourMap.set(i, 0);
    for (const sale of customRangeSales) {
      const hour = new Date(sale.sold_at).getHours();
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + Number(sale.total_amount));
    }
    const salesByHour = Array.from(hourMap.entries()).map(([hour, revenue]) => ({
      hour: `${hour.toString().padStart(2, "0")}:00`,
      revenue,
      count: customRangeSales.filter((s) => new Date(s.sold_at).getHours() === hour).length,
    }));

    // Best selling products
    type Item = { product_id: string | null; product_name: string; quantity: number; unit_price: number };
    const flatten = (rows: { sale_items: Item[] | null }[] | null): Item[] =>
      (rows ?? []).flatMap((r) => r.sale_items ?? []);

    const weekItems = flatten(weekItemsRes.data as any);
    const monthItems = flatten(monthItemsRes.data as any);

    const tallyByProduct = (items: Item[]) => {
      const map = new Map<string, { name: string; quantity: number; revenue: number; id: string | null }>();
      for (const it of items) {
        const key = it.product_id ?? it.product_name;
        const existing = map.get(key);
        const revenue = it.quantity * it.unit_price;
        if (existing) {
          existing.quantity += it.quantity;
          existing.revenue += revenue;
        } else {
          map.set(key, { id: it.product_id, name: it.product_name, quantity: it.quantity, revenue });
        }
      }
      return Array.from(map.values());
    };

    const weekTally = tallyByProduct(weekItems).sort((a, b) => b.quantity - a.quantity);
    const monthTally = tallyByProduct(monthItems);
    const best_selling = weekTally.slice(0, 10);

    // Module 2: Customer Analytics
    const uniqueCustomers = new Set(customRangeSales.map((s) => s.customer_phone)).size;
    const customerPurchases = new Map<string, { count: number; total: number }>();
    for (const sale of customRangeSales) {
      const existing = customerPurchases.get(sale.customer_phone) || { count: 0, total: 0 };
      customerPurchases.set(sale.customer_phone, {
        count: existing.count + 1,
        total: existing.total + Number(sale.total_amount),
      });
    }
    
    // New vs returning
    const firstPurchaseDates = new Map<string, Date>();
    for (const sale of allSalesRes.data ?? []) {
      if (!firstPurchaseDates.has(sale.customer_phone)) {
        firstPurchaseDates.set(sale.customer_phone, new Date(sale.sold_at));
      }
    }
    const newCustomers = Array.from(customerPurchases.entries()).filter(([phone]) => {
      const firstDate = firstPurchaseDates.get(phone);
      return firstDate && firstDate >= startDate && firstDate <= endDate;
    }).length;
    const returningCustomers = uniqueCustomers - newCustomers;

    // Customer lifetime value
    const customerLifetimeValues = Array.from(customerPurchases.values()).map((c) => c.total);
    const avgCLV = customerLifetimeValues.length > 0 ? customerLifetimeValues.reduce((a, b) => a + b) / customerLifetimeValues.length : 0;
    const topCustomers = Array.from(customerPurchases.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([phone, data]) => ({ phone, spent: data.total, purchases: data.count }));

    // Average basket size
    const totalItems = customRangeSales.reduce((sum, s) => {
      const items = (s.sale_items as any)?.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0) ?? 0;
      return sum + items;
    }, 0);
    const avgBasketSize = customRangeSales.length > 0 ? totalItems / customRangeSales.length : 0;

    // Churn detection (customers inactive for 30+ days)
    const churned = Array.from(firstPurchaseDates.entries())
      .filter(([phone, firstDate]) => {
        const lastPurchase = customerPurchases.get(phone);
        if (!lastPurchase) return false;
        const daysSinceLastPurchase = (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastPurchase > 30;
      }).length;

    // Module 3: Inventory
    const products = productsRes.data ?? [];
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.reorder_level).length;
    const stockValue = products.reduce((sum, p) => sum + (p.stock * (Number(p.cost_price) || Number(p.price))), 0);

    // Days to stockout
    const monthSoldByProductId = new Map<string, number>();
    for (const t of monthTally) {
      if (t.id) monthSoldByProductId.set(t.id, t.quantity);
    }
    const daysToStockout = products.map((p) => {
      const monthlySold = monthSoldByProductId.get(p.id) ?? 0;
      const dailyRate = monthlySold / 30;
      const daysUntilOut = dailyRate > 0 ? Math.ceil(p.stock / dailyRate) : 999;
      return {
        id: p.id,
        name: p.name,
        stock: p.stock,
        daysUntilOut,
        needsReorder: daysUntilOut < 7,
      };
    });

    const weekSoldByProductId = new Map<string, number>();
    for (const t of weekTally) {
      if (t.id) weekSoldByProductId.set(t.id, t.quantity);
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
        revenue_week: weekRevenue,
        revenue_today: todayRevenue,
        revenue_custom_range: customRangeRevenue,
        most_sold,
        low_stock_count,
        aov,
        unique_customers: uniqueCustomers,
        new_customers: newCustomers,
        returning_customers: returningCustomers,
        churn_count: churned,
      },
      payment_split: paymentSplit,
      total_discounts: totalDiscounts,
      sales_by_day_of_week: salesByDayOfWeek,
      sales_by_hour: salesByHour,
      best_selling,
      slow_moving,
      restock,
      daily_revenue: buckets,
      inventory: {
        total_products: products.length,
        out_of_stock: outOfStock,
        low_stock: lowStock,
        stock_value: stockValue,
        days_to_stockout: daysToStockout.filter((d) => d.needsReorder),
      },
      customer_analytics: {
        top_customers: topCustomers,
        avg_clv: avgCLV,
        avg_basket_size: avgBasketSize,
        churn_risk: daysToStockout.filter((d) => d.stock === 0),
      },
    };
  });
