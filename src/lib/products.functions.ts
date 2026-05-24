import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession } from "./session.server";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  price: z.number().positive().max(1_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  reorder_level: z.number().int().min(1).max(10_000).default(5),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  price: z.number().positive().max(1_000_000).optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  reorder_level: z.number().int().min(1).max(10_000).optional(),
});

const idSchema = z.object({ id: z.string().uuid() });

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const s = await requireSession();
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("shop_id", s.shop_id)
    .order("name", { ascending: true });
  if (error) {
    console.error("[listProducts]", error);
    throw new Error("Failed to load products.");
  }
  return data ?? [];
});

export const createProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    // Duplicate name (case-insensitive)
    const { data: dupe } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("shop_id", s.shop_id)
      .ilike("name", data.name)
      .maybeSingle();
    if (dupe) throw new Error("A product with this name already exists");

    const { data: row, error } = await supabaseAdmin
      .from("products")
      .insert({ ...data, shop_id: s.shop_id })
      .select("*")
      .single();
    if (error) {
      console.error("[createProduct]", error);
      throw new Error("Failed to create product.");
    }
    return row;
  });

export const updateProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    const { id, ...rest } = data;
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .update(rest)
      .eq("id", id)
      .eq("shop_id", s.shop_id)
      .select("*")
      .maybeSingle();
    if (error) {
      console.error("[updateProduct]", error);
      throw new Error("Failed to update product.");
    }
    if (!row) throw new Error("Product not found");
    return row;
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const s = await requireSession();
    const { error } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", data.id)
      .eq("shop_id", s.shop_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
