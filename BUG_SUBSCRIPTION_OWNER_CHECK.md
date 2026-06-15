# Subscription Page Blocking Bug - Root Cause Analysis

**Issue**: Newly registered account (with owner_name, till configured) blocked on `/subscription` with "Only shop owners can manage subscription plans" error — even though this account IS the owner.

---

## Root Cause: JWT Session ↔ RPC Function Mismatch

### The Problem

The `registerShop` function creates three records:
1. ✅ `shops` record with owner_name, phone, etc.
2. ✅ `users` record with a **randomly generated UUID** (not tied to Supabase Auth)
3. ✅ `shop_members` record with that random UUID + role='owner'

However, the JWT session cookie contains **only**:
```typescript
{
  shop_id: string;
  phone: string;
  // NO user_id!
}
```

When the subscription page calls `useIsShopOwner(shop_id)`, it triggers this flow:

```
Frontend: useIsShopOwner(shop_id)
    ↓
Server: isShopOwner() function calls RPC
    ↓
Postgres RPC: is_shop_owner(p_shop_id)
    ↓
RPC Query:
  SELECT EXISTS (
    SELECT 1 FROM shop_members
    WHERE shop_id = p_shop_id
      AND user_id = auth.uid()        ← PROBLEM HERE!
      AND role = 'owner'
      AND status = 'active'
  )
    ↓
Problem: auth.uid() returns NULL
  because the JWT session has NO connection to Supabase Auth
    ↓
Result: Query finds NO matching row
    ↓
Response: FALSE (not owner)
    ↓
UI: Shows error "Only shop owners can manage..."
```

---

## Evidence: Current Code

### registerShop creates shop_members with random UUID
**File**: `src/lib/auth.functions.ts` lines 93-117

```typescript
// Create a user record for the shop owner
const userId = generateUUID();  // ← RANDOM UUID

const { error: userError } = await supabaseAdmin
  .from("users")
  .insert({
    id: userId,  // ← Stored as random UUID
    email: `${data.phone}@shop.local`,
  });

// Create shop_member entry with owner role
const { error: memberError } = await supabaseAdmin
  .from("shop_members")
  .insert({
    shop_id: shop.id,
    user_id: userId,      // ← Uses the random UUID
    role: "owner",
    status: "active",
    accepted_at: now,
  });
```

### JWT session contains NO user_id
**File**: `src/lib/jwt.server.ts` lines 11-13

```typescript
export interface ShopJwtPayload {
  shop_id: string;
  phone: string;
  // user_id is NOT included
}
```

### RPC function expects auth.uid() to work
**File**: `supabase/migrations/20260614_add_multi_user_access.sql` lines 172-181

```sql
CREATE OR REPLACE FUNCTION public.is_shop_owner(p_shop_id UUID)
RETURNS BOOLEAN
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shop_members
    WHERE shop_id = p_shop_id
      AND user_id = auth.uid()    ← This is NULL in JWT-based sessions
      AND role = 'owner'
      AND status = 'active'
  );
$$;
```

---

## Solution: Two-Part Fix

### Part 1: Include user_id in JWT Session (Optional but Cleaner)

Add user_id to the JWT payload:

```typescript
// In src/lib/jwt.server.ts
export interface ShopJwtPayload {
  shop_id: string;
  phone: string;
  user_id: string;  // ← ADD THIS
}
```

Then update registerShop to pass user_id:

```typescript
// In src/lib/auth.functions.ts
const token = await signShopJwt({ 
  shop_id: shop.id, 
  phone: shop.phone,
  user_id: userId  // ← ADD THIS
});
```

### Part 2: Fix isShopOwner Server Function

**File**: `src/lib/multi-user.functions.ts` - Update the isShopOwner function

**Current** (lines 202-215):
```typescript
export const isShopOwner = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => isShopOwnerSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    const { data: result, error } = await supabaseAdmin
      .rpc("is_shop_owner", {
        p_shop_id: data.shop_id,
      });

    if (error || !result) throw new Error("Failed to check owner status");
    return result as boolean;
  });
```

**Fixed**:
```typescript
export const isShopOwner = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => isShopOwnerSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Check if current session's shop_id matches the requested shop_id
    // If they match, the user is the owner of that shop
    if (session.shop_id === data.shop_id) {
      return true;
    }

    // Fallback: check shop_members table via session data
    // (if multi-shop support is needed in future)
    const { data: member, error } = await supabaseAdmin
      .from("shop_members")
      .select("role, status")
      .eq("shop_id", data.shop_id)
      .eq("user_id", (session as any).user_id)  // If Part 1 is implemented
      .eq("role", "owner")
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("[isShopOwner] query failed", error);
      throw new Error("Failed to check owner status");
    }

    return !!member;
  });
```

---

## Quick Fix (No Changes Required)

If the above doesn't work, the absolute simplest fix is:

**In** `src/lib/multi-user.functions.ts`, replace isShopOwner with:

```typescript
export const isShopOwner = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => isShopOwnerSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    // The session's shop_id IS the owner's shop
    // If someone is accessing /subscription for their own shop_id, they're the owner
    return session.shop_id === data.shop_id;
  });
```

This works because:
- Only the owner can create a session with a given shop_id (via JWT)
- Only authorized users have access to that shop_id in their JWT
- Therefore, if session.shop_id === requested shop_id, the user is the owner

---

## Why This Bug Exists

1. The system uses JWT-based sessions (shop_id + phone), not Supabase Auth
2. The multi-user system was added later and uses RPC functions that expect Supabase Auth
3. The RPC functions call `auth.uid()` which is NULL in JWT sessions
4. No one tested with newly registered accounts (possibly all test accounts were created before the multi-user system was added)

---

## Affected Routes (Verify These Also Work)

- `/subscription` ← **Currently broken**
- `/settings/staff` ← Uses useIsShopOwner, may also fail
- Any other route calling `useIsShopOwner()`

---

## Files to Check

After implementing the fix, verify:
1. [src/lib/auth.functions.ts](src/lib/auth.functions.ts) - registerShop function (line 57-128)
2. [src/lib/jwt.server.ts](src/lib/jwt.server.ts) - ShopJwtPayload interface (line 11-13)
3. [src/lib/multi-user.functions.ts](src/lib/multi-user.functions.ts) - isShopOwner function (line 202-215)
4. [supabase/migrations/20260614_add_multi_user_access.sql](supabase/migrations/20260614_add_multi_user_access.sql) - is_shop_owner RPC (line 172-181)

