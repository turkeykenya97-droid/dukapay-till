# CRITICAL BUG FIX: Shop Owner Blocked on /subscription

## ROOT CAUSE ANALYSIS

### ✅ Step 1: registerShop() IS creating shop_members correctly

**File**: [src/lib/auth.functions.ts](src/lib/auth.functions.ts#L113-L135)

The `registerShop()` function correctly creates:
1. A `shops` record with the shop data
2. A `users` record with auto-generated UUID
3. A `shop_members` record with the user_id and `role='owner'`

```typescript
// Line 125-135: Create shop_member entry with owner role
const { error: memberError } = await supabaseAdmin
  .from("shop_members")
  .insert({
    shop_id: shop.id,
    user_id: userId,
    role: "owner",
    status: "active",
    accepted_at: now,
  });
```

✅ **This part works correctly.** New accounts ARE getting shop_members rows.

---

### ❌ Step 2: getUserShops() RPC function relies on auth.uid() which is NULL

**File**: [supabase/migrations/20260614_add_multi_user_helpers.sql](supabase/migrations/20260614_add_multi_user_helpers.sql#L233-L254)

```sql
CREATE OR REPLACE FUNCTION public.get_user_shops()
RETURNS TABLE (...)
AS $$
  SELECT ... FROM public.shop_members sm
  JOIN public.shops s ON s.id = sm.shop_id
  WHERE sm.user_id = auth.uid()    -- ❌ THIS IS NULL IN JWT SESSIONS!
    AND sm.status = 'active'
$$;
```

---

### ❌ Step 3: JWT sessions don't populate auth.uid()

**File**: [src/lib/jwt.server.ts](src/lib/jwt.server.ts#L10-L13)

When `registerShop()` creates a session:
```typescript
const token = await signShopJwt({ shop_id: shop.id, phone: shop.phone });
```

The JWT contains only `{shop_id, phone}` — NO `user_id`.

Since this is a custom JWT (not Supabase Auth), `auth.uid()` in Postgres returns **NULL**.

---

### ❌ Step 4: The chain reaction failure

**File**: [src/routes/_authenticated/subscription.tsx](src/routes/_authenticated/subscription.tsx#L50-L66)

1. Component calls `useQuery({ queryFn: () => getUserShops() })`
2. `getUserShops()` calls `supabaseAdmin.rpc("get_user_shops")` (no parameters!)
3. RPC function queries `WHERE sm.user_id = auth.uid()` (returns NULL)
4. Query returns `[]` (empty array)
5. `const currentShop = shops[0]` is undefined
6. `useIsShopOwner(undefined)` doesn't run (hook has `enabled: !!shopId`)
7. `isOwner` remains false
8. User sees: **"Only shop owners can manage subscription plans. Please contact your shop owner."**

---

## THE FIX

### Fix 1: Add user_id to JWT payload

**File**: [src/lib/jwt.server.ts](src/lib/jwt.server.ts#L10-L13)

**Before**:
```typescript
export interface ShopJwtPayload {
  shop_id: string;
  phone: string;
}
```

**After**:
```typescript
export interface ShopJwtPayload {
  shop_id: string;
  user_id: string;
  phone: string;
}
```

---

### Fix 2: Pass user_id when signing JWT in registerShop()

**File**: [src/lib/auth.functions.ts](src/lib/auth.functions.ts#L130-L135)

**Before**:
```typescript
const token = await signShopJwt({ shop_id: shop.id, phone: shop.phone });
```

**After**:
```typescript
const token = await signShopJwt({ 
  shop_id: shop.id, 
  user_id: userId,
  phone: shop.phone 
});
```

---

### Fix 3: Pass user_id when signing JWT in loginShop()

**File**: [src/lib/auth.functions.ts](src/lib/auth.functions.ts#L145-L184)

Added step to fetch the shop owner's user_id before signing JWT:

```typescript
// Get the owner's user_id from shop_members
const { data: shopMember, error: memberError } = await supabaseAdmin
  .from("shop_members")
  .select("user_id")
  .eq("shop_id", shop.id)
  .eq("role", "owner")
  .eq("status", "active")
  .single();

if (memberError || !shopMember) {
  console.error("[loginShop] shop member lookup failed", memberError);
  throw new Error("Login failed. Please try again.");
}

const token = await signShopJwt({ 
  shop_id: shop.id, 
  user_id: shopMember.user_id,
  phone: shop.phone 
});
```

---

### Fix 4: Update RPC function to accept user_id parameter

**File**: [supabase/migrations/20260616_fix_get_user_shops_rpc.sql](supabase/migrations/20260616_fix_get_user_shops_rpc.sql)

**Before**:
```sql
CREATE OR REPLACE FUNCTION public.get_user_shops()
RETURNS TABLE (...)
AS $$
  WHERE sm.user_id = auth.uid()
$$;
```

**After**:
```sql
CREATE OR REPLACE FUNCTION public.get_user_shops(p_user_id UUID)
RETURNS TABLE (...)
AS $$
  WHERE sm.user_id = p_user_id
$$;
```

---

### Fix 5: Update getUserShops() to pass user_id parameter

**File**: [src/lib/multi-user.functions.ts](src/lib/multi-user.functions.ts#L155-L165)

**Before**:
```typescript
const { data, error } = await supabaseAdmin
  .rpc("get_user_shops");  // No parameters!
```

**After**:
```typescript
const { data, error } = await supabaseAdmin
  .rpc("get_user_shops", { p_user_id: session.user_id });
```

---

### Fix 6: Backfill migration for existing shops

**File**: [supabase/migrations/20260616_backfill_shop_members.sql](supabase/migrations/20260616_backfill_shop_members.sql)

This migration:
1. Creates missing `users` records for any shops that have none
2. Creates missing `shop_members` entries with `role='owner'` for any shops missing them
3. Safe to run repeatedly (uses INSERT ... ON CONFLICT)

---

## WHAT GETS DEPLOYED

The following changes are now in place:

1. ✅ JWT payload includes `user_id` in addition to `shop_id` and `phone`
2. ✅ `registerShop()` passes `user_id` when creating JWT
3. ✅ `loginShop()` fetches and passes `user_id` when creating JWT
4. ✅ `get_user_shops()` RPC now accepts `p_user_id` parameter
5. ✅ `getUserShops()` server function passes session's `user_id` to RPC
6. ✅ Backfill migration creates missing shop_members entries for existing shops

---

## VERIFICATION STEPS

After deploying these changes:

1. **New account signup**: Should immediately be able to access `/subscription`
2. **Existing account login**: Should be able to access `/subscription` if backfill migration ran
3. **Subscription cards**: Should show with fresh data from the earlier cache fix

Run these commands to deploy:

```bash
# Apply Supabase migrations
npx supabase db push

# Deploy Worker with code changes
npm run deploy
```

---

## Why This Happened

The codebase uses **JWT sessions** (custom tokens in cookies) instead of Supabase Auth. This is necessary for supporting phone-based authentication in a Cloudflare Workers environment.

However, the `get_user_shops()` RPC function was written with the assumption that Supabase Auth would be used, so it relied on `auth.uid()` which is only populated by Supabase Auth tokens, not custom JWTs.

The fix bridges this gap by including the `user_id` in the custom JWT so the RPC function can receive it as an explicit parameter.
