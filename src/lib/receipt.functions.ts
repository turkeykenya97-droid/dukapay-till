import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession } from "./session.server";
import { z } from "zod";

// Get or create default receipt template for shop
export const getReceiptTemplate = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireSession();
    const { data: template, error } = await supabaseAdmin
      .from("receipt_templates")
      .select("*")
      .eq("shop_id", session.shop_id)
      .eq("name", "Default")
      .single();

    if (error || !template) {
      // Create default template if doesn't exist
      const { data: newTemplate } = await supabaseAdmin
        .from("receipt_templates")
        .insert({
          shop_id: session.shop_id,
          name: "Default",
          header_text: "Thank you for shopping with us!",
          footer_text: "Powered by Trusit POS",
          show_qr_code: true,
          show_payment_method: true,
        })
        .select()
        .single();

      return newTemplate;
    }

    return template;
  });

// Update receipt template
const updateTemplateSchema = z.object({
  header_text: z.string().optional(),
  footer_text: z.string().optional(),
  logo_url: z.string().url().optional(),
  show_qr_code: z.boolean().optional(),
  show_payment_method: z.boolean().optional(),
});

export const updateReceiptTemplate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateTemplateSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    const { error } = await supabaseAdmin
      .from("receipt_templates")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("shop_id", session.shop_id)
      .eq("name", "Default");

    if (error) throw error;

    return { success: true };
  });

// Get shop branches
export const getShopBranches = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireSession();

    const { data: branches, error } = await supabaseAdmin
      .from("shop_branches")
      .select("*")
      .eq("shop_id", session.shop_id)
      .order("is_default", { ascending: false });

    if (error) throw error;

    // If no branches, create default
    if (!branches || branches.length === 0) {
      const { data: shop } = await supabaseAdmin
        .from("shops")
        .select("shop_name, phone")
        .eq("id", session.shop_id)
        .single();

      const { data: newBranch } = await supabaseAdmin
        .from("shop_branches")
        .insert({
          shop_id: session.shop_id,
          name: shop?.shop_name || "Main Branch",
          phone: shop?.phone,
          is_default: true,
        })
        .select()
        .single();

      return [newBranch];
    }

    return branches;
  });

// Store receipt data after successful sale
const storeReceiptSchema = z.object({
  sale_id: z.string(),
  receipt_qr_code: z.string(),
});

export const storeReceiptData = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => storeReceiptSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    const { error } = await supabaseAdmin
      .from("sales")
      .update({
        receipt_qr_code: data.receipt_qr_code,
        receipt_generated_at: new Date().toISOString(),
      })
      .eq("id", data.sale_id)
      .eq("shop_id", session.shop_id);

    if (error) throw error;

    return { success: true };
  });

// Generate barcode for product
const generateBarcodeSchema = z.object({
  product_id: z.string(),
  barcode_type: z.enum(["ean13", "code128"]).default("ean13"),
});

export const generateBarcode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => generateBarcodeSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Generate random barcode for now (in production, use proper EAN-13 algorithm)
    const barcode = Array.from({ length: 13 }, () =>
      Math.floor(Math.random() * 10)
    ).join("");

    const { error } = await supabaseAdmin
      .from("products")
      .update({
        barcode,
        barcode_type: data.barcode_type,
      })
      .eq("id", data.product_id)
      .eq("shop_id", session.shop_id);

    if (error) throw error;

    return { barcode, barcode_type: data.barcode_type };
  });

// Get product by barcode
export const getProductByBarcode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ barcode: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("id, name, price, stock, barcode, barcode_type")
      .eq("shop_id", session.shop_id)
      .eq("barcode", data.barcode)
      .single();

    if (error) throw error;

    return product;
  });

// Generate EAN-13 barcode (using product ID + checksum)
function generateEAN13(productId: string): string {
  // Use product ID hash to generate consistent EAN-13
  let hash = 0;
  for (let i = 0; i < productId.length; i++) {
    hash = (hash << 5) - hash + productId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  const absHash = Math.abs(hash).toString();
  // Pad to 12 digits, then add checksum
  const base = absHash.padStart(12, "0").slice(-12);
  
  // EAN-13 checksum calculation
  let checksum = 0;
  for (let i = 0; i < 12; i++) {
    checksum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  checksum = (10 - (checksum % 10)) % 10;
  
  return base + checksum;
}

// Generate barcode for product
export const generateProductBarcode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      product_id: z.string(),
      barcode_type: z.enum(["ean13", "code128"]).default("ean13"),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Check if product exists and belongs to shop
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("id", data.product_id)
      .eq("shop_id", session.shop_id)
      .single();

    if (productError || !product) throw new Error("Product not found");

    // Generate barcode
    const barcode = generateEAN13(data.product_id);

    // Update product with barcode
    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({
        barcode,
        barcode_type: data.barcode_type,
      })
      .eq("id", data.product_id)
      .eq("shop_id", session.shop_id);

    if (updateError) throw updateError;

    return { barcode, barcode_type: data.barcode_type };
  });

// Set custom barcode for product
const setCustomBarcodeSchema = z.object({
  product_id: z.string(),
  barcode: z.string().regex(/^\d{8,14}$/, "Barcode must be 8-14 digits"),
  barcode_type: z.enum(["ean13", "code128"]).default("ean13"),
});

export const setCustomBarcode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => setCustomBarcodeSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Check if barcode already exists for another product
    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("shop_id", session.shop_id)
      .eq("barcode", data.barcode)
      .neq("id", data.product_id)
      .single();

    if (existing) {
      throw new Error("Barcode already used for another product");
    }

    // Update product
    const { error } = await supabaseAdmin
      .from("products")
      .update({
        barcode: data.barcode,
        barcode_type: data.barcode_type,
      })
      .eq("id", data.product_id)
      .eq("shop_id", session.shop_id);

    if (error) throw error;

    return { barcode: data.barcode, barcode_type: data.barcode_type };
  });

// Get all products with barcodes
export const getProductsWithBarcodes = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireSession();

    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("id, name, price, barcode, barcode_type, stock")
      .eq("shop_id", session.shop_id)
      .order("name");

    if (error) throw error;

    return products || [];
  });
