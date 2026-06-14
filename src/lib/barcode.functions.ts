// Barcode management functions
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession } from "./session.server";
import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================

export interface BarcodeProduct {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  stock: number;
  barcode: string;
  upc: string | null;
  barcode_type: "internal" | "upc" | "unknown";
}

// ============================================================================
// SCAN BARCODE (lookup product)
// ============================================================================

const scanBarcodeSchema = z.object({
  shop_id: z.string().uuid("Invalid shop ID"),
  barcode: z.string().min(1, "Barcode required"),
});

export const scanBarcode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => scanBarcodeSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Call the barcode lookup function
    const { data: products, error } = await supabaseAdmin
      .rpc("get_product_by_barcode", {
        p_shop_id: data.shop_id,
        p_barcode: data.barcode,
      });

    if (error) {
      console.error("[scanBarcode]", error);
      throw new Error("Product not found");
    }

    if (!products || products.length === 0) {
      throw new Error("Product not found");
    }

    return products[0] as BarcodeProduct;
  });

// ============================================================================
// UPDATE PRODUCT UPC (Add external barcode)
// ============================================================================

const updateUpcSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
  upc: z.string().min(1, "UPC required").max(50),
});

export const updateProductUpc = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateUpcSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    const { data: result, error } = await supabaseAdmin
      .rpc("update_product_upc", {
        p_product_id: data.product_id,
        p_upc: data.upc,
      });

    if (error) {
      console.error("[updateProductUpc]", error);
      throw new Error(error.message || "Failed to update UPC");
    }

    if (!result?.[0]?.success) {
      throw new Error(result?.[0]?.message || "Failed to update UPC");
    }

    return {
      product_id: result[0].product_id,
      barcode: result[0].barcode,
      upc: result[0].upc,
    };
  });

// ============================================================================
// REGENERATE BARCODE (Get new internal barcode)
// ============================================================================

const regenerateBarcodeSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
});

export const regenerateProductBarcode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => regenerateBarcodeSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    const { data: result, error } = await supabaseAdmin
      .rpc("regenerate_product_barcode", {
        p_product_id: data.product_id,
      });

    if (error) {
      console.error("[regenerateProductBarcode]", error);
      throw new Error(error.message || "Failed to regenerate barcode");
    }

    if (!result?.[0]?.success) {
      throw new Error(result?.[0]?.message || "Failed to regenerate barcode");
    }

    return {
      product_id: result[0].product_id,
      barcode: result[0].barcode,
      old_barcode: result[0].old_barcode,
    };
  });

// ============================================================================
// GET PRODUCT WITH BARCODES (for product details page)
// ============================================================================

const getProductSchema = z.object({
  product_id: z.string().uuid("Invalid product ID"),
});

export const getProductBarcodes = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => getProductSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .select("id, name, barcode, upc, barcode_generated_at")
      .eq("id", data.product_id)
      .single();

    if (error) {
      console.error("[getProductBarcodes]", error);
      throw new Error("Product not found");
    }

    return product as {
      id: string;
      name: string;
      barcode: string;
      upc: string | null;
      barcode_generated_at: string;
    };
  });
