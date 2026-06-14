# 📋 DukaPay Till - Subscription & Feature Gating Audit Report
**Date:** June 14, 2026  
**Status:** Current Implementation Review

---

## 1. CURRENT SUBSCRIPTION SCHEMA

### Shops Table Columns
```
- trial_start: TIMESTAMPTZ          (when shop created)
- subscription_expiry: TIMESTAMPTZ  (trial end or renewal date)
- subscription_status: TEXT         ('trial' | 'active' | 'expired')
- plan: TEXT                        ('basic' | 'pro')
- transaction_count: INTEGER        (STK pushes sent this month)
- transaction_reset_date: DATE      (when count resets)
```

### Subscription Payments Table
```
- id: UUID
- shop_id: UUID (FK → shops)
- amount: NUMERIC
- payment_reference: TEXT
- payment_status: TEXT ('pending' | 'completed' | 'failed')
- plan: TEXT ('basic' | 'pro')
- created_at: TIMESTAMPTZ
- paid_at: TIMESTAMPTZ
```

---

## 2. CURRENT FEATURE GATING

### ✅ FULLY IMPLEMENTED GATING
| Feature | Trial | Basic | Pro | Expired |
|---------|-------|-------|-----|---------|
| **Dashboard** | ✅ | ✅ | ✅ | ❌ |
| **Products** | ✅ | ✅ | ✅ | ❌ |
| **Sell** | ✅ | ✅ | ✅ | ❌ |
| **History** | ✅ | ✅ | ✅ | ❌ |
| **Analytics** | ✅ | ✅ | ✅ | ❌ |
| **Profile** | ✅ | ✅ | ✅ | ❌ |
| **Subscription** | ✅ (RO) | ✅ (RO) | ✅ (RO) | ❌ |
| **Settings/Staff** | ✅ | ✅ | ✅ | ❌ |

### ⚠️ PARTIAL GATING (Transaction Limit)
```
- Trial: Unlimited STK pushes
- Basic: 150 STK pushes/month (tracked, checked in sales.functions.ts)
- Pro: Unlimited STK pushes
- Expired: No access (system locked)
```

### 🎯 FEATURE-LEVEL ACCESS (TO BE IMPLEMENTED)
| Feature | Trial | Basic | Pro | Notes |
|---------|-------|-------|-----|-------|
| **STK Push** | ✅ | ✅ | ✅ | Currently capped at 150/mo for Basic |
| **Calculator** | ✅ | ✅ | ✅ | Not yet implemented |
| **Quick Sale** | ✅ | ✅ | ✅ | Not yet implemented |
| **QR-to-Pay** | ✅ | ✅ | ✅ | Profile page feature, always available |
| **Revenue Analytics** | ✅ | ❌ | ✅ | To implement |
| **Customer Profiles** | ✅ | ❌ | ✅ | To implement |
| **Multi-User/Staff** | ✅ | Limited(1) | Limited(5) | Existing limits TBD |

---

## 3. ROUTES & NAVIGATION

### Base Navigation (All Roles)
- `/dashboard` - Home
- `/products` - Inventory
- `/sell` - POS
- `/history` - Sales history
- `/analytics` - Analytics dashboard
- `/profile` - User profile

### Owner-Only Navigation
- `/subscription` - Subscription/billing (gated, staff sees "Access Denied")
- `/settings/staff` - Staff management (gated)

### Public Routes
- `/login`
- `/register`
- `/accept-invite` - Staff invitation acceptance

---

## 4. SUBSCRIPTION FUNCTIONS CURRENTLY USED

### In `auth.functions.ts`
```typescript
getProfile()           // Returns: plan, subscription_status, days_remaining
getPlanInfo()          // Returns: plan, status, transaction_remaining
getPlans()             // Returns available plans array
```

### In `session.server.ts`
```typescript
computeSubscriptionStatus(expiry, trial_start)
  // Returns: 'trial' | 'active' | 'expired'
  
getShopOrThrow(shop_id)
  // Returns full shop object with subscription fields
```

### In `subscription.functions.ts`
```typescript
initiateRenewal(plan)  // Starts M-Pesa payment for plan
```

### In `sales.functions.ts`
```typescript
// Currently checks transaction_count vs 150 limit for Basic plan
```

---

## 5. MULTI-USER/STAFF SYSTEM

### Current Staff Invite Schema
```sql
shop_members:
  - id: UUID
  - shop_id: UUID (FK)
  - user_id: UUID (FK → users)
  - role: ENUM ('owner' | 'staff')
  - status: ENUM ('active' | 'pending')
  - joined_at: TIMESTAMPTZ
  
shop_invitations:
  - id: UUID
  - shop_id: UUID (FK)
  - email: TEXT
  - token: TEXT (7-day expiry)
  - status: ENUM ('pending' | 'accepted')
  - expires_at: TIMESTAMPTZ
```

### Current Staff Limits
❌ **NOT IMPLEMENTED YET** - No plan-based caps
- Need to add: Trial=5, Basic=1, Pro=5

---

## 6. ACCESS STATUS (PROFILE DATA)

### Currently Returns
```typescript
{
  plan: 'trial' | 'basic' | 'pro',
  subscription_status: 'trial' | 'active' | 'expired',
  subscription_expiry: ISO string,
  days_remaining: number,
  transaction_count: number,
  transaction_reset_date: date,
}
```

### Missing (To Implement)
```typescript
{
  // ... above
  accessLevel: 'trial' | 'basic' | 'pro' | 'expired',  // Unified
  isLocked: boolean,
  staffLimit: number,
  staffUsed: number,
  features: {
    analytics: boolean,
    customers: boolean,
    // etc.
  }
}
```

---

## 7. CURRENT GATING LOGIC

### Subscription Page (`_authenticated/subscription.tsx`)
```typescript
isTrialActive = profile.subscription_status === 'trial'
isBasic = profile.plan === 'basic'
isPro = profile.plan === 'pro'

// Currently:
// - Shows plan selection buttons always
// - No "plan-switch while active" blocking
// - No "Upgrade to Pro" overlays for locked features
```

### Staff Management (`_authenticated/settings/staff.tsx`)
```typescript
// Owner-only (via useIsShopOwner hook)
// No plan-based invite limits yet
```

### Analytics (`_authenticated/analytics.tsx`)
```typescript
// Currently accessible to all users
// Should block for Basic tier
```

---

## 8. AREAS THAT NEED UPDATES

### ❌ To Remove
- 150 transaction cap logic (migrate to plan-feature model)
- Anywhere `transaction_remaining` is used

### ✅ To Add
1. **`getAccessStatus()` hook** - Centralized access checker
2. **Server-side RLS** - Enforce plan gating in Supabase
3. **UI overlays** - Show "Upgrade to Pro" for locked features
4. **Plan badge** - Display current plan + days remaining everywhere
5. **Subscription CTA logic** - Hide subscribe buttons when plan active
6. **Staff limits** - Check count before inviting (Trial=5, Basic=1, Pro=5)
7. **Expired state** - Full lock except renewal screen

### 📍 Files to Create/Modify
```
src/lib/access.functions.ts         (NEW - getAccessStatus)
src/hooks/use-access.ts             (NEW - useAccessStatus hook)
src/components/ui/plan-badge.tsx    (EXISTS but needs update)
src/components/pro-feature-overlay.tsx  (NEW)
src/routes/_authenticated/analytics.tsx (MODIFY - add gating)
src/routes/_authenticated/subscription.tsx (MODIFY - CTA logic)
src/routes/_authenticated/settings/staff.tsx (MODIFY - invite limits)
supabase/migrations/202606XX_add_subscription_gating.sql (NEW)
```

---

## 9. PLAN SPECIFICATIONS (FINAL)

### Trial (14 days from signup)
- All features unlocked
- Staff limit: 5
- No transaction cap
- Status: `subscription_status='trial'`

### Basic (paid, 30 days from payment)
- Features: STK Push, Calculator, Quick Sale
- Locked: Revenue Analytics, Customer Profiles
- Staff limit: 1
- Status: `subscription_status='active'`, `plan='basic'`

### Pro (paid, 30 days from payment)
- All features unlocked
- Staff limit: 5
- Status: `subscription_status='active'`, `plan='pro'`

### Expired (after paid plan ends)
- System fully locked except subscription/renewal screen
- Status: `subscription_status='expired'`

---

## 10. IMPLEMENTATION ORDER

1. ✅ **Schema audit** (THIS DOCUMENT)
2. ⏳ Create `getAccessStatus()` utility → returns unified access level + feature map
3. ⏳ Add server-side RLS policies for gating
4. ⏳ Create UI components (overlays, badges)
5. ⏳ Integrate `getAccessStatus()` into routes
6. ⏳ Update subscription page CTA rules
7. ⏳ Implement staff invite limits
8. ⏳ Test trial → paid transition
9. ⏳ Test expired state locking

---

**Next Step:** Confirm plan/feature split above ✅, then proceed to `getAccessStatus()` implementation.
