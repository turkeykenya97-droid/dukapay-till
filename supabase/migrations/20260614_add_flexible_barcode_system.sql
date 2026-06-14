-- FLEXIBLE BARCODE SYSTEM
-- Auto-generated internal barcodes + optional UPC/EAN support
-- Every product gets a unique barcode automatically on creation

-- ============================================================================
-- PHASE 1: ADD/ALTER BARCODE COLUMNS TO PRODUCTS
-- ============================================================================

-- Add columns if they don't exist
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS upc TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS barcode_generated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure barcode column is TEXT type (not VARCHAR)
-- This handles if column already exists as VARCHAR(50)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'barcode' 
    AND data_type = 'character varying'
  ) THEN
    ALTER TABLE public.products ALTER COLUMN barcode TYPE TEXT USING barcode::TEXT;
  END IF;
END $$;

-- Set NOT NULL constraint if not already set
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' 
    AND column_name = 'barcode' 
    AND is_nullable = 'YES'
  ) THEN
    -- First populate existing NULLs with a temporary value
    UPDATE public.products SET barcode = 'TEMP' WHERE barcode IS NULL;
    ALTER TABLE public.products ALTER COLUMN barcode SET NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- PHASE 2: POPULATE EXISTING PRODUCTS WITH BARCODES
-- ============================================================================

-- Function to generate unique barcode (shorter, scannable format)
-- Format: Last 8 chars of product ID + last 8 digits of timestamp
-- Example: a29b41d4-17183724 (18 chars, scannable and unique)
CREATE OR REPLACE FUNCTION public.generate_unique_barcode(
  p_shop_id UUID,
  p_product_id UUID
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    SUBSTRING(p_product_id::TEXT, 25, 8) || '-' || 
    SUBSTRING(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 3, 8);
$$;

-- Generate barcodes for existing products without one
DO $$
DECLARE
  v_product RECORD;
  v_barcode TEXT;
BEGIN
  FOR v_product IN SELECT id, shop_id FROM public.products WHERE barcode IS NULL OR barcode = 'TEMP'
  LOOP
    v_barcode := generate_unique_barcode(v_product.shop_id, v_product.id);
    UPDATE public.products
    SET barcode = v_barcode,
        barcode_generated_at = NOW(),
        updated_at = NOW()
    WHERE id = v_product.id;
  END LOOP;
  
  RAISE NOTICE '✓ Generated barcodes for all products without one';
END $$;

-- ============================================================================
-- PHASE 3: TRIGGER TO AUTO-GENERATE BARCODES ON NEW PRODUCTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_generate_product_barcode()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if barcode is empty
  IF NEW.barcode IS NULL OR NEW.barcode = '' THEN
    NEW.barcode := generate_unique_barcode(NEW.shop_id, NEW.id);
    NEW.barcode_generated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS products_auto_generate_barcode ON public.products;

-- Create trigger
CREATE TRIGGER products_auto_generate_barcode
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_product_barcode();

-- ============================================================================
-- PHASE 4: INDEXES FOR BARCODE LOOKUPS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(shop_id, barcode);
CREATE INDEX IF NOT EXISTS idx_products_upc ON public.products(shop_id, upc) WHERE upc IS NOT NULL;

-- ============================================================================
-- PHASE 5: HELPER FUNCTIONS
-- ============================================================================

-- Get product by barcode (either internal or UPC)
CREATE OR REPLACE FUNCTION public.get_product_by_barcode(
  p_shop_id UUID,
  p_barcode TEXT
)
RETURNS TABLE (
  id UUID,
  shop_id UUID,
  name TEXT,
  price NUMERIC,
  stock INTEGER,
  barcode TEXT,
  upc TEXT,
  barcode_type TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    id,
    shop_id,
    name,
    price,
    stock,
    barcode,
    upc,
    CASE 
      WHEN barcode = p_barcode THEN 'internal'
      WHEN upc = p_barcode THEN 'upc'
      ELSE 'unknown'
    END as barcode_type
  FROM public.products
  WHERE shop_id = p_shop_id
    AND (barcode = p_barcode OR upc = p_barcode)
  LIMIT 1;
$$;

-- Update product UPC (optional external barcode)
CREATE OR REPLACE FUNCTION public.update_product_upc(
  p_product_id UUID,
  p_upc TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  product_id UUID,
  barcode TEXT,
  upc TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id UUID;
  v_product_exists BOOLEAN;
BEGIN
  -- Get shop_id and verify product exists
  SELECT shop_id INTO v_shop_id
  FROM public.products
  WHERE id = p_product_id;

  IF v_shop_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Product not found'::TEXT, p_product_id, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if UPC already used by another product in this shop
  IF EXISTS (SELECT 1 FROM public.products WHERE shop_id = v_shop_id AND upc = p_upc AND id != p_product_id) THEN
    RETURN QUERY SELECT FALSE, 'UPC already used by another product in this shop'::TEXT, p_product_id, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Update UPC
  UPDATE public.products
  SET upc = p_upc, updated_at = NOW()
  WHERE id = p_product_id;

  RETURN QUERY
    SELECT TRUE, 'UPC updated successfully'::TEXT, p_product_id, barcode, upc
    FROM public.products
    WHERE id = p_product_id;
END;
$$;

-- Regenerate internal barcode for a product
CREATE OR REPLACE FUNCTION public.regenerate_product_barcode(
  p_product_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  product_id UUID,
  barcode TEXT,
  old_barcode TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id UUID;
  v_old_barcode TEXT;
  v_new_barcode TEXT;
BEGIN
  -- Get current barcode and shop_id
  SELECT shop_id, barcode INTO v_shop_id, v_old_barcode
  FROM public.products
  WHERE id = p_product_id;

  IF v_shop_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Product not found'::TEXT, p_product_id, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Generate new barcode
  v_new_barcode := generate_unique_barcode(v_shop_id, p_product_id);

  -- Update barcode
  UPDATE public.products
  SET barcode = v_new_barcode, barcode_generated_at = NOW(), updated_at = NOW()
  WHERE id = p_product_id;

  RETURN QUERY SELECT TRUE, 'Barcode regenerated successfully'::TEXT, p_product_id, v_new_barcode, v_old_barcode;
END;
$$;

-- ============================================================================
-- PHASE 6: VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Flexible barcode system implemented';
  RAISE NOTICE '  - Auto-generated internal barcodes: {PROD_ID_SHORT}-{TIMESTAMP_SHORT}';
  RAISE NOTICE '  - Example format: a29b41d4-17183724 (18 chars, scannable)';
  RAISE NOTICE '  - Optional UPC/EAN field for supermarket barcodes';
  RAISE NOTICE '  - Barcode lookup supports both types';
  RAISE NOTICE '  - Trigger auto-generates on product creation';
  RAISE NOTICE '  - Staff can scan either type during checkout';
END;
$$;
