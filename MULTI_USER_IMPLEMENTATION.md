# Multi-User Access Control - Complete Implementation Guide

## ✅ What's Been Implemented

Your DukaPay Till now has **full multi-user role-based access control**. Here's what works:

### 1. **Database Layer** (3 migrations)
- ✅ `users` table - Links to Supabase Auth
- ✅ `shop_members` - User-shop relationships with roles (owner/staff)
- ✅ `shop_invitations` - 7-day expiry invite tokens
- ✅ RLS policies on all shop-scoped tables (products, sales, subscriptions)

### 2. **Backend Functions** (multi-user.functions.ts)
- ✅ `claimShopAsOwner()` - Link existing shop to auth user
- ✅ `createShopInvitation()` - Generate 7-day invite links
- ✅ `acceptShopInvitation()` - Accept invite & join shop
- ✅ `getUserShops()` - List user's shops
- ✅ `getUserRoleInShop()` - Get user role
- ✅ `isShopOwner()` - Check owner status
- ✅ `getShopMembers()` - View active staff (owner only)
- ✅ `getShopInvitations()` - Manage pending invites (owner only)
- ✅ `revokeShopInvitation()` - Revoke pending invites
- ✅ `removeShopMember()` - Remove staff members

### 3. **Frontend Components**
- ✅ **claim-shop-modal.tsx** - Owner links existing shop on first login
- ✅ **invite-staff-form.tsx** - Owner generates invite links
- ✅ **shop-members-list.tsx** - View & manage active staff
- ✅ **shop-invitations-list.tsx** - Track & revoke pending invites
- ✅ **use-role.ts** - Hook for permission checks

### 4. **Routes & Navigation**
- ✅ `/_authenticated/settings/staff` - Staff management dashboard (owner only)
- ✅ `/accept-invite` - Invite acceptance flow
- ✅ Navigation hides owner-only items from staff

### 5. **Access Control**
- ✅ Subscription page gated to owners only
- ✅ Staff can access: POS, Products, History, Analytics, Profile
- ✅ Owner can access: All above + Subscription + Staff Management

---

## 📋 User Flows

### **Flow 1: New Owner with Existing Shop**

1. Owner signs up via Supabase Auth (email/password)
2. App shows "Claim Existing Shop" modal with shop ID
3. Owner clicks "Claim as Owner"
4. System creates `users` + `shop_members` (role=owner)
5. Owner gets access to all features

```typescript
// How to trigger this in your onboarding:
await claimShopAsOwner({ shop_id });
```

### **Flow 2: Invite Staff Member**

1. Owner opens `/settings/staff`
2. Enters staff email in "Invite Staff Member" form
3. System generates secure token + invite URL
4. Owner shares link: `yourdomain.com/accept-invite?token=...`
5. Staff member clicks link, signs up, joins shop

```typescript
// Generate invite:
const { token, url, expires_at } = await createShopInvitation({
  shop_id,
  email: "staff@example.com",
  role: "staff"
});
// Share url with staff
```

### **Flow 3: Staff Acceptance**

1. Staff gets invite link
2. Clicks link → `/accept-invite?token=xyz`
3. Signs up with Supabase Auth (email must match)
4. System creates `shop_members` (role=staff)
5. Staff can now use POS, see products, history, analytics

```typescript
// Staff accepts:
await acceptShopInvitation({ token });
```

---

## 🔐 Permission Model

### **Owner Can:**
- ✅ View all shop data (products, sales, inventory)
- ✅ Manage POS (sell items, checkout)
- ✅ View analytics & reports
- ✅ Manage subscription & billing
- ✅ Invite staff members
- ✅ View & remove staff members
- ✅ Revoke pending invites

### **Staff Can:**
- ✅ View products
- ✅ Process sales (POS)
- ✅ View sales history
- ✅ View basic analytics
- ❌ Cannot manage subscriptions
- ❌ Cannot invite other staff
- ❌ Cannot see billing settings
- ❌ Cannot manage staff

---

## 🛠️ How to Use in Your Code

### **1. Check if User is Owner**
```typescript
import { useIsShopOwner } from "@/hooks/use-role";

function MyComponent({ shopId }: { shopId: string }) {
  const { isOwner, isLoading } = useIsShopOwner(shopId);
  
  if (!isOwner) return <div>Staff members cannot access this</div>;
  return <div>Owner-only content</div>;
}
```

### **2. Get User's Role**
```typescript
import { useUserRole } from "@/hooks/use-role";

function MyComponent({ shopId }: { shopId: string }) {
  const { role, isLoading } = useUserRole(shopId); // 'owner' | 'staff' | null
  
  return <div>Your role: {role}</div>;
}
```

### **3. List User's Shops**
```typescript
import { getUserShops } from "@/lib/multi-user.functions";
import { useQuery } from "@tanstack/react-query";

function ShopList() {
  const { data: shops } = useQuery({
    queryKey: ["userShops"],
    queryFn: () => getUserShops(),
  });
  
  return shops.map(shop => (
    <div key={shop.shop_id}>
      {shop.shop_name} - {shop.role}
    </div>
  ));
}
```

### **4. Get Shop Members (Owner Only)**
```typescript
import { getShopMembers } from "@/lib/multi-user.functions";

async function loadMembers(shopId: string) {
  const members = await getShopMembers({ shop_id: shopId });
  // Returns: [{ id, email, role, status, accepted_at, ... }]
}
```

### **5. Create Invite Link**
```typescript
const { token, url, expires_at } = await createShopInvitation({
  shop_id: "shop-uuid",
  email: "staff@example.com",
  role: "staff",
});

// Share url with staff: yourdomain.com/accept-invite?token=...
// Expires in 7 days
```

---

## 📊 Database Schema

### `users`
```sql
id (UUID, PK) → auth.users(id)
email (TEXT)
created_at, updated_at (TIMESTAMPTZ)
```

### `shop_members`
```sql
id (UUID, PK)
shop_id (UUID, FK) → shops
user_id (UUID, FK) → users
role ('owner' | 'staff')
status ('pending' | 'active' | 'inactive')
invited_by (UUID, FK) → users
invited_at, accepted_at (TIMESTAMPTZ)
created_at, updated_at
UNIQUE(shop_id, user_id)
```

### `shop_invitations`
```sql
id (UUID, PK)
shop_id (UUID, FK) → shops
invitation_token (TEXT, UNIQUE)
email (TEXT)
role ('staff')
created_by (UUID, FK) → users
expires_at (TIMESTAMPTZ) -- 7 days from now
accepted_at (TIMESTAMPTZ)
accepted_by (UUID, FK) → users
status ('pending' | 'accepted' | 'expired' | 'revoked')
created_at
UNIQUE(shop_id, email)
```

---

## 🔒 Row-Level Security (RLS)

All shop-scoped tables now enforce access via `shop_members`:

- **products** - Members can read/write if in active shop_members
- **sales** - Members can read/write if in active shop_members  
- **sale_items** - Members can read/write if related sale is in their shop
- **subscription_payments** - Owners only
- **shops** - Members can read, owners can update

---

## 🚀 Next Steps

### **Optional: Multi-Shop Support**
Currently uses first shop. To support multiple shops per user:
1. Add shop selector in navigation
2. Store selected shop in context/state
3. Use it for all permission checks

### **Optional: More Granular Roles**
To add roles like "supervisor", "accountant":
1. Modify `role` enum in `shop_members`
2. Add permission matrix in helper functions
3. Gate features based on permissions

### **Optional: Audit Logging**
Track who invited whom, when members joined:
1. `shop_members` already has `invited_by`, `invited_at`, `accepted_at`
2. Create audit table for member changes
3. Log removals & permission changes

---

## 🐛 Troubleshooting

### **"User not authenticated"**
- Ensure user has Supabase Auth account
- Check JWT cookie is set correctly
- Verify session is still valid

### **"Invitation not found or expired"**
- Invite expires after 7 days
- Check email matches auth user's email
- Verify token hasn't been revoked

### **"Only shop owners can..."**
- User's role must be 'owner' in shop_members
- Check `status` is 'active'
- Verify shop_members record exists

### **RLS policy violations**
- User not in shop_members for that shop_id
- Check user_id in auth.users matches claim
- Verify shop_id matches the table's shop_id FK

---

## 📝 Files Created/Modified

**New Files:**
- `supabase/migrations/20260614_add_multi_user_access.sql`
- `supabase/migrations/20260614_add_multi_user_helpers.sql`
- `supabase/migrations/20260614_add_shop_rls_policies.sql`
- `src/lib/multi-user.functions.ts`
- `src/hooks/use-role.ts`
- `src/components/multi-user/claim-shop-modal.tsx`
- `src/components/multi-user/invite-staff-form.tsx`
- `src/components/multi-user/shop-members-list.tsx`
- `src/components/multi-user/shop-invitations-list.tsx`
- `src/routes/_authenticated/settings/staff.tsx`
- `src/routes/accept-invite.tsx`

**Modified Files:**
- `src/routes/_authenticated.tsx` - Updated navigation for role-based visibility
- `src/routes/_authenticated/subscription.tsx` - Added owner-only gate

---

## ✨ Summary

Your system now has:
- ✅ Multi-user architecture with role-based access
- ✅ Secure invite flow with token expiry
- ✅ RLS enforcement on all shop data
- ✅ UI components for management
- ✅ Permission checking hooks
- ✅ Backward compatible with existing shops

**Staff can:** Use POS, manage products, view sales history, check analytics
**Owners can:** Do everything staff can + manage staff + manage subscription

Ready to go live! 🚀
