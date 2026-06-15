# Trusit Platform - Complete Audit Document

**Platform**: Trusit (formerly DukaPay Till)  
**Build Date**: 2026-06-15  
**Technology Stack**: React + TanStack Router/Query, TypeScript, Tailwind CSS, Cloudflare Workers, Supabase  
**Version**: Production-ready  

---

## Table of Contents
1. [Core Features](#core-features)
2. [Subscription Tiers](#subscription-tiers)
3. [Payment Flows](#payment-flows)
4. [POS/Sales Flow](#possales-flow)
5. [Inventory Management](#inventory-management)
6. [Staff & Multi-User (RBAC)](#staff--multi-user-rbac)
7. [Analytics & Dashboard](#analytics--dashboard)
8. [Onboarding Flow](#onboarding-flow)
9. [All Routes & Pages](#all-routes--pages)
10. [Brand Assets](#brand-assets)

---

## Core Features

### 1. **Point of Sale (POS) System**
**Users**: Shop Owner, Staff  
**Description**: Full checkout system for recording sales transactions in real-time. Users can:
- Add products from inventory to a cart with quantity adjustments
- Record ad-hoc items (manual line items not from inventory)
- Search products by name
- Scan product barcodes to quickly add items
- Apply cash payments
- Choose between M-Pesa STK push or cash payment method
- View cart total, tax, and payment due
- Finalize transaction with PIN verification
- Get instant receipt after payment confirmation

**Implementation**: [src/routes/_authenticated/sell.tsx](src/routes/_authenticated/sell.tsx)  
**Key Functions**: `createSale()`, `verifyPin()`, `getSaleStatus()`, `cancelSale()`  

---

### 2. **Product Management**
**Users**: Shop Owner, Staff (view-only)  
**Description**: Complete inventory system with:
- Create new products with name, price, stock quantity
- Set reorder level (minimum stock threshold) - default 5 units
- Edit existing products (price, stock, name, reorder level)
- Delete products
- List all products with search/sort by name
- Track current stock levels
- Prevent duplicate product names (case-insensitive)
- Stock validation during checkout (prevent overselling)

**Implementation**: [src/lib/products.functions.ts](src/lib/products.functions.ts)  
**Constraints**:
- Product name: 1-100 characters
- Price: KES 0.01 - KES 1,000,000
- Stock: 0 - 1,000,000 units
- Reorder level: 1 - 10,000 units

---

### 3. **Barcode System**
**Users**: Shop Owner  
**Description**: Product barcode management enabling quick checkout:
- Scan product barcodes using device camera (QR code scanner on sell page)
- Support for two barcode types:
  - **Internal barcodes**: System-generated unique identifiers per product
  - **UPC codes**: External product identifiers (EAN, UPC, etc.)
- Lookup products by scanned barcode
- Update/add UPC codes to products
- Regenerate internal barcodes if needed
- Barcode scanner component with camera access

**Implementation**: [src/lib/barcode.functions.ts](src/lib/barcode.functions.ts)  
**Components**: [src/components/BarcodeScanner.tsx](src/components/BarcodeScanner.tsx), [src/components/Barcode.tsx](src/components/Barcode.tsx)  

---

### 4. **Sales History & Receipts**
**Users**: Shop Owner, Staff (view-only)  
**Description**: Complete transaction history with:
- Filter sales by time period: Today, Last 7 days, Last 30 days, All-time
- View sales with: Customer phone, amount, payment method, timestamp, status
- Expandable sale details showing line items
- Digital receipt generation per sale
- Pagination (20 items per page)
- Receipt templates with merchant info, items, totals, M-Pesa reference
- Download/print receipt capability
- View receipts publicly via unique URL: `/receipt/{sale_id}`

**Implementation**: [src/routes/_authenticated/history.tsx](src/routes/_authenticated/history.tsx), [src/lib/sales.functions.ts](src/lib/sales.functions.ts)  
**Components**: [src/components/Receipt.tsx](src/components/Receipt.tsx)  

---

### 5. **M-Pesa Payment Integration (STK Push)**
**Users**: Shop Owner, End Customers  
**Description**: M-Pesa mobile money payments via SmartPay:
- Initiate STK push (payment prompt) to customer phone
- Instant payment confirmation via webhook callback
- Payment status tracking: Pending → Completed/Failed
- Automatic sale recording on successful payment
- Checkout reference ID for tracking
- M-Pesa receipt number in sale record
- Support for amounts KES 1 - KES 300,000

**Integration**: SmartPay Pesa API  
**Implementation**: [src/lib/smartpay.server.ts](src/lib/smartpay.server.ts), [src/routes/api/public/webhooks/smartpay.ts](src/routes/api/public/webhooks/smartpay.ts)  

---

### 6. **QR Payment Links**
**Users**: End Customers (public-facing)  
**Description**: Shareable QR code payment links merchants can send to customers:
- Public payment page: `/pay/{shop_id}`
- Customer enters amount and phone number
- Generates M-Pesa STK push
- No merchant authentication required
- Shop must be in active/trial subscription
- Responsive mobile-first design
- Error handling for expired/inactive shops

**Implementation**: [src/routes/pay/$shopId.tsx](src/routes/pay/$shopId.tsx), [src/lib/public-payment.functions.ts](src/lib/public-payment.functions.ts)  

---

### 7. **Analytics Dashboard**
**Users**: Shop Owner (Pro plan feature)  
**Description**: Sales metrics and insights (Pro plan only):
- Total transactions count
- Total revenue (sum of all sales)
- Average transaction value
- Sales trend visualization
- Pro feature locked for Basic plan with upgrade prompt

**Implementation**: [src/routes/_authenticated/analytics.tsx](src/routes/_authenticated/analytics.tsx)  
**Access Control**: Requires `analytics` feature flag (Pro/Trial only)  

---

### 8. **Subscription Management**
**Users**: Shop Owner  
**Description**: Plan upgrades and billing:
- View current plan (Trial, Basic, Pro)
- View subscription status and days remaining
- Initiate plan upgrade (Basic to Pro)
- Trigger M-Pesa payment for subscription renewal
- Subscription pricing: Basic KES 299/month, Pro KES 499/month
- Trial period: 14 days
- Subscription expiry date tracking
- Status: Trial → Active → Expired
- Renewal extends subscription by 30 days from payment date

**Implementation**: [src/routes/_authenticated/subscription.tsx](src/routes/_authenticated/subscription.tsx), [src/lib/subscription.functions.ts](src/lib/subscription.functions.ts)  

---

### 9. **Staff Management & Multi-User Access (RBAC)**
**Users**: Shop Owner (invite/manage), Staff (receive invites)  
**Description**: Role-based staff access control:

**Owner Capabilities**:
- Invite staff members via email
- Generate 7-day expiring invite links
- View active staff members
- Remove staff members
- View pending/accepted invitations
- Revoke pending invitations

**Staff Capabilities**:
- Accept invite link and sign up
- Access POS (Quick Sale, Barcode Scan, Manual items)
- View sales history
- View products
- View analytics (if Pro plan)
- View profile info
- Cannot modify inventory or staff settings

**Implementation**: [src/lib/multi-user.functions.ts](src/lib/multi-user.functions.ts), [src/routes/_authenticated/settings/staff.tsx](src/routes/_authenticated/settings/staff.tsx)  
**Database**: `users`, `shop_members` (owner/staff roles), `shop_invitations` (7-day expiry)  
**Staff Limits**: Trial/Pro: 5 staff members; Basic: 1 staff member  

---

### 10. **Quick Sale Calculator**
**Users**: Shop Owner, Staff  
**Description**: Built-in calculator tab for manual calculations:
- Arithmetic operations (add, subtract, multiply, divide)
- Useful for mental math verification
- Accessible from sell page via tab

**Implementation**: Embedded in [src/routes/_authenticated/sell.tsx](src/routes/_authenticated/sell.tsx)  

---

### 11. **PIN Security**
**Users**: Shop Owner, Staff  
**Description**: 4-digit PIN for transaction verification:
- PIN set during account creation
- Required to complete sale checkout
- PIN validity window: 24 hours (refreshes daily)
- After PIN expires, user must re-enter to continue selling
- Prevents unauthorized use on shared devices
- Max attempts: 5 before 15-minute lockout

**Implementation**: [src/lib/auth.functions.ts](src/lib/auth.functions.ts) - `verifyPin()` function  

---

### 12. **Till Configuration**
**Users**: Shop Owner (onboarding)  
**Description**: Payment channel registration during setup:
- Choose payment destination: Till, Paybill, or Bank account
- Enter till number (4-12 digits) or paybill/bank details
- SmartPay verifies and registers merchant channel
- Generates merchant API key for payment routing
- Required before accepting customer payments

**Implementation**: [src/lib/auth.functions.ts](src/lib/auth.functions.ts) - `onboardTill()` function  

---

### 13. **Profile & Account Settings**
**Users**: Shop Owner, Staff  
**Description**: User account management:
- View profile information (name, email, phone)
- View shop details
- View current subscription status
- View days remaining on subscription
- Access staff invitation page (owners only)
- Logout functionality

**Implementation**: [src/routes/_authenticated/profile.tsx](src/routes/_authenticated/profile.tsx)  

---

### 14. **Progressive Web App (PWA)**
**Users**: All users  
**Description**: Native app-like experience on mobile:
- Installable on home screen (iOS/Android)
- Offline caching of static assets
- Service Worker for background sync
- App manifest with shortcuts (New Sale, View History)
- Standalone display mode (full screen, no browser UI)
- App install prompt in navigation bar
- Offline fallback page when no network
- Network-first strategy for API calls

**Implementation**: [public/manifest.json](public/manifest.json), [public/sw.js](public/sw.js), [src/components/pwa-install-prompt.tsx](src/components/pwa-install-prompt.tsx)  

---

### 15. **Reporting & Audit (Admin Only)**
**Users**: Platform admin  
**Description**: System monitoring and merchant management:
- Admin login at `/admin/login`
- Admin dashboard (placeholders for future implementation)
- Audit logs of all admin actions
- System health monitoring
- SmartPay API status monitoring

**Note**: Admin routes are mostly scaffolding with placeholder pages. Full implementation pending.

---

## Subscription Tiers

### Trial (14-day free)
**Duration**: 14 days from account creation  
**Pricing**: Free  
**Features Included**:
- ✅ STK Push payments (M-Pesa)
- ✅ QR payment links  
- ✅ Cash payment recording
- ✅ Product inventory management
- ✅ Sales history & receipts
- ✅ Barcode scanning
- ✅ Analytics dashboard
- ✅ Quick calculator
- ✅ Staff management (up to 5 staff)
- ✅ Customer list (basic)
- ✅ Unlimited transactions
- ✅ PIN security

**Restrictions**:
- Expires after 14 days
- Requires payment to continue

---

### Basic (KES 299/month)
**Pricing**: KES 299 per month  
**Billing Cycle**: 30 days from payment date  
**Features Included**:
- ✅ STK Push payments (M-Pesa)
- ✅ QR payment links
- ✅ Cash payment recording
- ✅ Product inventory management
- ✅ Sales history & receipts
- ✅ Barcode scanning
- ✅ Quick calculator
- ✅ PIN security
- ✅ Unlimited transactions

**Features Locked**:
- ❌ Analytics dashboard (Pro only)
- ❌ Customer insights (Pro only)
- ❌ Staff management limited to 1 member (vs 5 in Pro)

---

### Pro (KES 499/month)
**Pricing**: KES 499 per month  
**Billing Cycle**: 30 days from payment date  
**Features Included**:
- ✅ STK Push payments (M-Pesa)
- ✅ QR payment links
- ✅ Cash payment recording
- ✅ Product inventory management
- ✅ Sales history & receipts
- ✅ Barcode scanning
- ✅ Analytics dashboard (transactions, revenue, trends)
- ✅ Customer insights
- ✅ Staff management (up to 5 members)
- ✅ Quick calculator
- ✅ PIN security
- ✅ Unlimited transactions

**Advantages Over Basic**:
- Advanced analytics and reporting
- Up to 5 staff members (vs 1)
- Customer list with detailed insights

---

### Expired Subscription
**Status**: Automatic on expiry date  
**Features**: All features locked  
- ❌ Cannot initiate M-Pesa payments
- ❌ Cannot record sales
- ❌ Read-only access to historical data
- ❌ Prompt to renew subscription

---

## Payment Flows

### Flow 1: M-Pesa STK Push (Merchant-Initiated)
**User**: Shop Owner / Staff  
**Scenario**: Merchant records sale and chooses M-Pesa payment  

**Step-by-Step**:
1. Merchant adds products/items to cart on Sell page
2. Enters customer phone number (Kenyan format: 07XX XXX XXX or +254...)
3. Chooses between "M-Pesa" or "Cash" payment method
4. For M-Pesa: Approves sale → PIN verification dialog appears
5. Enters 4-digit PIN
6. SmartPay API initiates STK push to customer phone
7. Customer receives M-Pesa prompt on their phone
8. Customer enters M-Pesa PIN and confirms
9. M-Pesa sends callback webhook to Trusit
10. Sale recorded with status: "completed" or "failed"
11. Digital receipt generated and shown to merchant
12. Transaction history updated

**API Integration**:
- **Payment Gateway**: SmartPay Pesa API
- **Endpoint**: `POST https://api.smartpaypesa.com/v1/post-checkout`
- **Authentication**: Bearer token (merchant API key)
- **Callback URL**: `{APP_URL}/api/public/webhooks/smartpay`
- **Reference Format**: `SALE-{sale_id}` or `QR-{shop_id}-{timestamp}`

**Implementation Files**:
- [src/lib/smartpay.server.ts](src/lib/smartpay.server.ts) - `sendStkPush()`
- [src/lib/sales.functions.ts](src/lib/sales.functions.ts) - `createSale()`
- [src/routes/api/public/webhooks/smartpay.ts](src/routes/api/public/webhooks/smartpay.ts) - Payment webhook handler

---

### Flow 2: M-Pesa STK Push (Public QR Payment Link)
**User**: End Customer  
**Scenario**: Customer scans QR code or clicks link to pay merchant  

**Step-by-Step**:
1. Customer receives QR code or link: `https://trusit.app/pay/{shop_id}`
2. Opens link in browser (mobile-optimized)
3. Page loads merchant name and shop info
4. Customer enters payment amount (KES 1 - 300,000)
5. Customer enters phone number (07XX XXX XXX format)
6. Clicks "Send Payment"
7. SmartPay initiates STK push to customer phone
8. M-Pesa prompt appears on customer device
9. Customer enters M-Pesa PIN and confirms
10. SmartPay sends callback webhook
11. Page shows success message with receipt
12. Sale recorded in merchant's history
13. Merchant notified of incoming payment

**Key Differences from Merchant-Initiated**:
- No merchant login required
- Customer enters payment details
- Public-facing form with no authentication
- Validates shop subscription is active before accepting payment

**Implementation Files**:
- [src/routes/pay/$shopId.tsx](src/routes/pay/$shopId.tsx) - Public payment page
- [src/lib/public-payment.functions.ts](src/lib/public-payment.functions.ts) - `initiatePublicPayment()`

---

### Flow 3: Cash Payment Recording
**User**: Shop Owner / Staff  
**Scenario**: Customer pays in cash; merchant records transaction  

**Step-by-Step**:
1. Merchant adds items to cart
2. Customer provides cash
3. Merchant chooses "Cash" payment option
4. Enters amount received in cash
5. System calculates change
6. PIN verification (if new sale)
7. Sale recorded with `cash_paid` amount
8. Receipt printed (for cash transactions)
9. No M-Pesa confirmation needed
10. Transaction recorded immediately

**Implementation**:
- Cash option available in [src/routes/_authenticated/sell.tsx](src/routes/_authenticated/sell.tsx)
- Cash amount stored in `sales` table field `cash_paid`
- Change calculation: `total - cash_paid`

---

### Flow 4: Subscription Payment (Plan Upgrade)
**User**: Shop Owner  
**Scenario**: Merchant upgrades from Trial/Basic to higher tier  

**Step-by-Step**:
1. Owner navigates to `/subscription` page
2. Views current plan and expiry date
3. Clicks "Upgrade to Pro" button
4. SmartPay payment prompt initiated
5. Amount: KES 499 (Pro) or KES 299 (Basic renewal)
6. STK push sent to owner's phone (same as shop registration)
7. Owner confirms M-Pesa payment
8. Webhook callback received
9. `subscription_status` changed to "active"
10. `subscription_expiry` extended 30 days
11. `plan` field updated (basic/pro)
12. Dashboard updated with new plan info

**Special Notes**:
- Subscription payments always use platform bootstrap key (not individual merchant keys)
- Payment reference format: `SUB-{payment_id}`
- 30-day renewal period always calculated from payment date

**Implementation**:
- [src/lib/subscription.functions.ts](src/lib/subscription.functions.ts) - `initiateRenewal()`
- [src/routes/_authenticated/subscription.tsx](src/routes/_authenticated/subscription.tsx) - UI

---

### Payment Limits & Constraints
- **Per Transaction**: KES 1 - KES 300,000 (M-Pesa max)
- **Per Day**: Unlimited (no daily cap)
- **Transaction Recording**: Immediate after M-Pesa confirmation
- **Retry Logic**: Failed payments can be reattempted
- **Timeout**: 30 second wait for M-Pesa prompt response

---

## POS/Sales Flow

### Full Checkout Journey

**Phase 1: Product Selection**

1. **Merchant opens Sell page** (`/_authenticated/sell`)
   - Defaults to "Inventory" tab
   - Products list loaded from database (preloaded on page load)
   - Full product catalog shown with: Name, Price, Stock level

2. **Merchant finds product**
   - Search bar: Filter products by name (real-time)
   - Tab navigation: Switch between Inventory, Barcode Camera, Quick Item, Calculator
   - Stock indicators show if product has low stock

3. **Add to Cart**
   - Click product or use quantity buttons (+/-)
   - Specify quantity (1-10,000 max)
   - System checks stock availability
   - Item added to cart with: Product name, Unit price, Quantity, Line total

---

**Phase 2: Cart Management**

1. **Cart Display** (right sidebar or bottom on mobile)
   - Shows: Item name, Unit price × Quantity, Line total
   - Running cart total
   - Delete item from cart (X button)
   - Adjust quantity with +/- buttons
   - Cart persists until checkout or cleared

2. **Alternative Input Methods**
   - **Barcode Tab**: Scan product barcode → Auto-lookup → Add to cart
   - **Quick Item Tab**: Manual item (not from inventory) → Enter name + price → Add to cart
   - **Calculator Tab**: Basic arithmetic for verification

---

**Phase 3: Customer & Payment Details**

1. **Customer Phone Entry**
   - Field: Phone number (Kenyan format required: 07XX XXX XXX or +254...)
   - Dialog appears when ready to checkout
   - Validates format before proceeding

2. **Payment Method Selection**
   - Option 1: **M-Pesa** → Triggers STK push
   - Option 2: **Cash** → Asks for cash amount received

3. **For M-Pesa**:
   - System shows sale summary
   - Merchant reviews before confirming

---

**Phase 4: Security & Verification**

1. **PIN Verification**
   - 4-digit PIN entry dialog
   - PIN validated against database hash (bcrypt)
   - PIN has 24-hour validity window
   - Lockout after 5 failed attempts (15-minute cooldown)

2. **Subscription Check**
   - Verify shop subscription not expired
   - Verify till/payment channel configured
   - Verify merchant API key active

---

**Phase 5: Payment Processing**

1. **For M-Pesa**:
   - SmartPay STK push initiated
   - Checkout request ID generated
   - Sale recorded as "pending"
   - Merchant shown loading state
   - System waits for webhook callback (up to 30 seconds)
   - On success: Status → "completed"
   - On failure: Status → "failed", error shown

2. **For Cash**:
   - Sale recorded immediately as "completed"
   - Change calculated and shown

---

**Phase 6: Receipt & Confirmation**

1. **Receipt Generated**
   - Merchant name, shop name
   - Customer phone number
   - Line items with quantities and amounts
   - Subtotal, total
   - Payment method
   - M-Pesa receipt number (if applicable)
   - Timestamp
   - Receipt ID for tracking

2. **Receipt Display**
   - Shown on screen in printable format
   - Component: [src/components/Receipt.tsx](src/components/Receipt.tsx)
   - Can be downloaded/printed
   - Accessible via public URL: `/receipt/{sale_id}`

3. **Confirmation**
   - Toast notification: "Sale completed!" or error message
   - Cart cleared
   - Merchant ready for next sale

---

### Stock Management During Checkout

- **Pre-checkout**: Stock levels loaded and shown
- **During checkout**: Stock verified for each product
- **Stock Validation**: Prevent checkout if requested qty > available stock
- **Post-payment**: Stock decremented automatically after successful payment
- **Reorder Alerts**: Planned feature (not yet implemented)

---

### Sale Record Schema

Each sale in database contains:
```
- sale_id: UUID (unique identifier)
- shop_id: UUID (merchant account)
- customer_phone: String (10 digits, Kenyan format)
- total_amount: Numeric (KES)
- cash_paid: Numeric (only for cash transactions)
- payment_method: String (m_pesa | cash)
- payment_status: String (pending | completed | failed)
- checkout_request_id: String (SmartPay reference)
- mpesa_receipt: String (M-Pesa confirmation number, if applicable)
- items: JSON (array of line items with product info)
- created_at: Timestamp
- receipt_template: String (HTML for printing)
```

---

### Key Implementation Files
- Main POS page: [src/routes/_authenticated/sell.tsx](src/routes/_authenticated/sell.tsx)
- Sales functions: [src/lib/sales.functions.ts](src/lib/sales.functions.ts)
- Barcode scanner: [src/components/BarcodeScanner.tsx](src/components/BarcodeScanner.tsx)
- Receipt generation: [src/lib/receipt.functions.ts](src/lib/receipt.functions.ts)

---

## Inventory Management

### Product Attributes
Each product record contains:
```
- id: UUID (unique product identifier)
- shop_id: UUID (merchant owner)
- name: String (1-100 chars, case-insensitive unique per shop)
- price: Numeric (KES 0.01 - 1,000,000)
- stock: Integer (0 - 1,000,000 units)
- reorder_level: Integer (1 - 10,000 units, default 5)
- barcode: String (internal system-generated)
- upc: String (optional external barcode/UPC code)
- created_at: Timestamp
- updated_at: Timestamp
```

---

### Product Management Operations

**Create Product**
- Merchant clicks "Add Product" on Products page
- Enters: Name, Price, Stock quantity, Reorder level (optional)
- System checks for duplicate name (case-insensitive)
- Auto-generates internal barcode
- Product saved to database

**Edit Product**
- Click product to open edit form
- Update any field: Name, Price, Stock, Reorder level
- Changes applied immediately
- Barcode regenerated on demand (if needed)

**Delete Product**
- Confirm deletion
- Product removed from catalog
- Cannot be recovered
- Does not affect past sales records

**Search/List**
- View all products sorted by name
- Real-time search by product name
- Display stock level for each
- Color-code low-stock items (if reorder_level exceeded)

---

### Stock Tracking

**Stock Levels Shown**:
- Current stock in inventory list
- Stock available during checkout
- Warning if stock < reorder_level

**Stock Updates**:
- Decremented after successful M-Pesa payment
- Decremented after cash payment recorded
- Prevents overselling in checkout
- No stock adjustment for failed/cancelled sales

**Reorder Points**:
- Default: 5 units minimum
- Customizable per product
- Used for low-stock alerts (future feature)

---

### Barcode Management

**Internal Barcodes**:
- Auto-generated per product
- Format: Unique alphanumeric string
- Cannot be manually edited
- Can be regenerated if needed
- Used for quick scanning checkout

**UPC/External Barcodes**:
- Merchant can add external barcode (EAN, UPC, product code)
- Optional field
- Useful for branded products
- Barcode scanner looks up by UPC first, then internal barcode

**Barcode Scanning Workflow**:
1. Merchant opens Barcode Camera tab on Sell page
2. Grants camera permission
3. Points camera at barcode
4. System reads barcode
5. Looks up in database by internal or UPC
6. Returns product info
7. Auto-adds to cart

---

### Product Images (Planned)
**Not Yet Implemented**
- Product images field exists in schema
- UI not yet built for upload/display
- Planned for future release

---

### Inventory Integration with Multi-User
- **Owner**: Full CRUD on products
- **Staff**: View products, cannot create/edit/delete
- **RLS Policies**: Row-level security via Supabase ensures staff can only see their shop's products

---

## Staff & Multi-User (RBAC)

### User Roles

#### Owner Role
**Capabilities**:
- ✅ All POS features (Quick Sale, M-Pesa, Cash, Barcode scanning)
- ✅ Full inventory management (Create, Edit, Delete products)
- ✅ View sales history and receipts
- ✅ View analytics (if Pro plan)
- ✅ Manage subscription and billing
- ✅ Invite staff members
- ✅ View all active staff
- ✅ Remove staff members
- ✅ Manage staff invitations
- ✅ Access profile and account settings
- ✅ View transaction history
- ✅ Claim existing shop (new owner flow)

**Restrictions**:
- Only owner can modify subscription
- Only owner can manage staff

---

#### Staff Role
**Capabilities**:
- ✅ POS: Quick Sale (cart checkout)
- ✅ POS: Barcode scanning
- ✅ POS: Manual line items (Quick Item tab)
- ✅ View product catalog (read-only)
- ✅ View sales history
- ✅ View receipts
- ✅ View analytics (if Pro plan)
- ✅ Profile viewing
- ✅ Accept shop invitations

**Restrictions**:
- ❌ Cannot create/edit/delete products
- ❌ Cannot manage inventory
- ❌ Cannot invite other staff
- ❌ Cannot access subscription settings
- ❌ Cannot remove staff members
- ❌ Cannot modify shop settings

---

### Staff Invitation Flow

**Step 1: Owner Initiates Invite**
- Owner navigates to `/settings/staff`
- Clicks "Invite Staff Member"
- Enters staff email address
- Optional: Sets role (currently only "staff" supported)

**Step 2: System Generates Invite Link**
- Unique 7-day expiring token generated
- Invite email sent to staff member (future feature - currently manual link sharing)
- Invite link format: `https://trusit.app/accept-invite?token={token}`
- Invite recorded in `shop_invitations` table

**Step 3: Staff Accepts Invite**
- Staff receives invite link
- Clicks link → `/accept-invite` page
- Reviews shop name and invitation details
- Clicks "Accept Invitation"
- System redirects to Supabase Auth signup if not logged in
- Staff must sign up with matching email address
- Upon signup completion, `shop_members` record created with role="staff"

**Step 4: Staff Gains Access**
- Staff now appears in shop member list (for owner)
- Staff can access all POS features
- Staff login shows their assigned shop in dropdown
- Staff can access `/dashboard`, `/sell`, `/history`, etc.

---

### Staff Limits by Plan

| Limit | Trial | Basic | Pro |
|-------|-------|-------|-----|
| **Max Staff Members** | 5 | 1 | 5 |
| **Can Sell** | Yes | Yes | Yes |
| **Can View Inventory** | Yes | Yes | Yes |
| **Can View Analytics** | Yes | No | Yes |

---

### Multi-User Data Access (RLS)

Supabase Row-Level Security (RLS) ensures data isolation:
- Staff can only see products in their assigned shop
- Staff can only view sales from their shop
- Staff cannot view other shops' data
- Staff invitations are shop-scoped
- Audit logs track who created/modified what

---

### Multi-Shop Support (Future)

Staff can potentially access multiple shops:
- Staff member can accept invites from multiple shops
- `/settings/staff` shows list of shops they're part of
- Dropdown selector to switch between shops
- Implementation: Query `user_shops` view

---

### Implementation Files
- [src/lib/multi-user.functions.ts](src/lib/multi-user.functions.ts) - Staff management functions
- [src/routes/_authenticated/settings/staff.tsx](src/routes/_authenticated/settings/staff.tsx) - Staff management UI
- [src/routes/accept-invite.tsx](src/routes/accept-invite.tsx) - Invite acceptance flow
- [src/hooks/use-role.ts](src/hooks/use-role.ts) - Role-based permission hook

---

## Analytics & Dashboard

### Merchant Dashboard (`/_authenticated/dashboard`)

**Top-Level Metrics** (KPI Cards):
1. **Total Transactions**: Count of completed sales (today, or all-time based on filter)
2. **Total Revenue**: Sum of all sale amounts
3. **Average Transaction Value**: Revenue ÷ Transaction count
4. **Days Remaining**: Days until subscription expiry

**Subscription Status Display**:
- Current plan badge (Trial / Basic / Pro / Expired)
- Color-coded: Yellow for Trial, Green for Active, Red for Expired
- Upgrade button (if Trial or Basic)

**Transaction History Table**:
- Recent 10-20 sales listed
- Columns: Customer phone, Amount, Payment method, Timestamp, Status
- Expandable rows to show line items
- Direct link to receipt

**Navigation Quick Links**:
- Button to "New Sale" (→ `/sell`)
- Button to "View History" (→ `/history`)
- Button to "Manage Products" (→ `/products`)
- Button to "View Analytics" (Pro plan) (→ `/analytics`)

---

### Analytics Page (`/_authenticated/analytics`)
**Access**: Pro plan only (locked for Basic with upgrade prompt)  
**Components**:

1. **Revenue Summary**
   - Total revenue (all-time)
   - Revenue by period (this week, this month)
   - Growth comparison

2. **Transaction Trends**
   - Line chart: Transactions over time (daily/weekly)
   - X-axis: Dates, Y-axis: Transaction count

3. **Average Transaction Value**
   - Static metric showing avg value
   - Comparison to previous period

4. **Top-Performing Products** (if data available)
   - Table: Product name, quantity sold, revenue
   - Sortable by quantity or revenue

---

### Sales History (`/_authenticated/history`)
**Access**: All users (Owner, Staff)  
**Features**:

1. **Time-Based Filters**
   - Tabs: Today, 7 days, 30 days, All-time
   - Quick filtering without additional API calls

2. **Sales Table**
   - Columns: Customer phone, Amount, Payment method, Date/time, Status
   - Pagination: 20 items per page
   - Next/Previous page buttons

3. **Expandable Sale Details**
   - Click row to expand
   - Shows: Line items (product name, qty, unit price, total)
   - Payment reference (M-Pesa receipt number)
   - Cash paid amount (if applicable)

4. **Receipt Access**
   - "View Receipt" link → Opens `/receipt/{sale_id}` in new tab
   - Printer-friendly receipt layout

---

### Profile Page (`/_authenticated/profile`)
**Access**: Owner, Staff  
**Information Displayed**:
- Profile name (owner_name or staff email)
- Email address
- Phone number (from shop if owner)
- Shop name
- Subscription status
- Days remaining on subscription
- Plan type (Trial/Basic/Pro)

**Features**:
- Edit profile details (if future enhancement added)
- Download transaction history (if future feature)
- Logout button

---

### Metrics Tracked
- Total sales count
- Total revenue (sum of all payment amounts)
- Average transaction value
- Transaction success rate (completed vs failed)
- Revenue by payment method (M-Pesa vs Cash)
- Sales per day/week/month
- Subscription status and expiry countdown

---

### Performance & Caching
- Dashboard metrics cached for 30 seconds
- History loads on-demand with pagination
- Analytics data pre-loaded on Pro plan
- Real-time updates on new sales (via query invalidation)

---

## Onboarding Flow

### New Account Signup

**Stage 1: Account Creation** (`/register`)

1. **Form Fields**:
   - Owner full name (2-100 chars)
   - Shop name (2-100 chars)
   - Phone number (10-digit Kenyan: 07XX XXX XXX)
   - Password (min 6 chars)
   - Confirm password (must match)
   - 4-digit Sales PIN (exactly 4 digits)

2. **Validation**:
   - Real-time validation on blur
   - All fields required
   - Phone number format enforced (Kenya)
   - Password confirmation checked
   - PIN must be exactly 4 digits

3. **On Submit**:
   - Form validated
   - Server checks phone uniqueness
   - Hashes password (bcrypt, rounds=4)
   - Hashes PIN (bcrypt, rounds=4)
   - Creates shop record in database with:
     - trial_start: Current timestamp
     - subscription_expiry: 14 days from now
     - subscription_status: "trial"
     - plan: "basic"
   - Creates user record (if not existing)
   - Creates shop_member record with role="owner"
   - Generates JWT session token
   - Sets session cookie (30-day expiry)

4. **Redirect**:
   - On success: Redirect to `/onboarding` (till setup)
   - On error: Show error toast with user-friendly message

---

**Stage 2: Till Setup** (`/_authenticated/onboarding`)

1. **Payment Channel Selection**:
   - Three options:
     - **Till**: Standard M-Pesa till number (4-12 digits)
     - **Paybill**: Paybill account (4-12 digits)
     - **Bank**: Bank account (manual entry of bank code)

2. **Channel Number Entry**:
   - Form field: "Till Number" / "Paybill" / "Bank Code"
   - Validation: 4-12 digits for till/paybill
   - Optional: Bank account number

3. **On Submit**:
   - SmartPay API call to register merchant channel
   - SmartPay verifies the till/paybill is valid
   - On success: SmartPay returns:
     - Channel ID (unique SmartPay reference)
     - Per-merchant API key (for payment routing)
   - Creates `shops` record update:
     - payment_channel_id: SmartPay channel ID
     - payment_api_key: Merchant API key
     - till_number: User-entered till number

4. **Redirect on Success**:
   - → `/dashboard` (welcome, can start selling)
   - Toast: "Till verified! Welcome to Trusit."

5. **Error Handling**:
   - Invalid till number: "Could not verify till. Please check the number and try again."
   - SmartPay API error: User-friendly message

---

### Existing Account Linking

For users who already have a Trusit till number but are creating a new account:

1. **Initial Signup**: Same as above
2. **After Onboarding**: Optional "Claim Existing Shop" modal
3. **Enter Shop ID**: User enters existing shop UUID
4. **Link Account**: System creates shop_member record linking user to existing shop
5. **Activate Access**: Staff member now has access to existing shop

---

### Post-Onboarding Setup

Once onboarded and on dashboard:

1. **Add Products**:
   - Navigate to `/products`
   - Click "Add Product"
   - Enter name, price, stock
   - Add multiple products for inventory

2. **Invite Staff** (Optional):
   - Navigate to `/settings/staff`
   - Click "Invite Staff"
   - Enter staff email
   - Copy invite link and send

3. **First Sale**:
   - Navigate to `/sell`
   - Add product(s) to cart
   - Enter customer phone
   - Choose M-Pesa or Cash
   - Verify PIN
   - Complete sale

---

### Key Implementation Files
- Signup page: [src/routes/register.tsx](src/routes/register.tsx)
- Onboarding page: [src/routes/_authenticated/onboarding.tsx](src/routes/_authenticated/onboarding.tsx)
- Auth functions: [src/lib/auth.functions.ts](src/lib/auth.functions.ts)
- SmartPay integration: [src/lib/smartpay.server.ts](src/lib/smartpay.server.ts)

---

## All Routes & Pages

### Public Routes (No Authentication Required)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | [index.tsx](src/routes/index.tsx) | Home/redirect (redirects to dashboard or login) |
| `/login` | [login.tsx](src/routes/login.tsx) | Merchant login (phone + password) |
| `/register` | [register.tsx](src/routes/register.tsx) | New account signup |
| `/pay/{shopId}` | [pay/$shopId.tsx](src/routes/pay/$shopId.tsx) | Public QR payment link (customer payment) |
| `/receipt/{saleId}` | [receipt.$sale_id.tsx](src/routes/receipt.$sale_id.tsx) | Public receipt viewing |
| `/accept-invite?token={token}` | [accept-invite.tsx](src/routes/accept-invite.tsx) | Staff invitation acceptance |

---

### Authenticated Routes (Requires Login)

#### Main Merchant Routes

| Route | Component | Purpose | Access |
|-------|-----------|---------|--------|
| `/_authenticated/dashboard` | [_authenticated/dashboard.tsx](src/routes/_authenticated/dashboard.tsx) | Main dashboard overview | Owner, Staff |
| `/_authenticated/sell` | [_authenticated/sell.tsx](src/routes/_authenticated/sell.tsx) | POS checkout system | Owner, Staff |
| `/_authenticated/history` | [_authenticated/history.tsx](src/routes/_authenticated/history.tsx) | Sales transaction history | Owner, Staff |
| `/_authenticated/products` | [_authenticated/products.tsx](src/routes/_authenticated/products.tsx) | Product catalog management | Owner, Staff |
| `/_authenticated/analytics` | [_authenticated/analytics.tsx](src/routes/_authenticated/analytics.tsx) | Sales analytics (Pro only) | Owner (Pro/Trial only) |
| `/_authenticated/subscription` | [_authenticated/subscription.tsx](src/routes/_authenticated/subscription.tsx) | Plan management & upgrade | Owner only |
| `/_authenticated/profile` | [_authenticated/profile.tsx](src/routes/_authenticated/profile.tsx) | User profile & settings | Owner, Staff |
| `/_authenticated/onboarding` | [_authenticated/onboarding.tsx](src/routes/_authenticated/onboarding.tsx) | Till setup (first-time) | Owner (new accounts) |

#### Staff Management Route

| Route | Component | Purpose | Access |
|-------|-----------|---------|--------|
| `/_authenticated/settings/staff` | [_authenticated/settings/staff.tsx](src/routes/_authenticated/settings/staff.tsx) | Invite & manage staff | Owner only |

---

### Admin Routes (Placeholder/Future Implementation)

| Route | Component | Purpose | Status |
|-------|-----------|---------|--------|
| `/admin` | [admin.tsx](src/routes/admin.tsx) | Admin route guard | Scaffold |
| `/admin/login` | [admin/login.tsx](src/routes/admin/login.tsx) | Admin authentication | Planned |
| `/admin/dashboard` | [admin/dashboard.tsx](src/routes/admin/dashboard.tsx) | Admin overview | Placeholder |
| `/admin/merchants` | [admin/merchants.tsx](src/routes/admin/merchants.tsx) | Merchant management | Placeholder |
| `/admin/transactions` | [admin/transactions.tsx](src/routes/admin/transactions.tsx) | Platform transactions | Placeholder |
| `/admin/analytics` | [admin/analytics.tsx](src/routes/admin/analytics.tsx) | Platform analytics | Placeholder |
| `/admin/revenue` | [admin/revenue.tsx](src/routes/admin/revenue.tsx) | Revenue tracking | Placeholder |
| `/admin/support` | [admin/support.tsx](src/routes/admin/support.tsx) | Merchant support tools | Placeholder |
| `/admin/logs` | [admin/logs.tsx](src/routes/admin/logs.tsx) | Audit logs | Placeholder |
| `/admin/notifications` | [admin/notifications.tsx](src/routes/admin/notifications.tsx) | Alert settings | Placeholder |
| `/admin/smartpay` | [admin/smartpay.tsx](src/routes/admin/smartpay.tsx) | SmartPay monitoring | Placeholder |
| `/admin/barcodes` | [admin/barcodes.tsx](src/routes/admin/barcodes.tsx) | Barcode management | Placeholder |
| `/admin/system` | [admin/system.tsx](src/routes/admin/system.tsx) | System health | Placeholder |
| `/admin/receipt-settings` | [admin/receipt-settings.tsx](src/routes/admin/receipt-settings.tsx) | Receipt configuration | Placeholder |

---

### API Routes (Server Functions)

**Server Functions** (via TanStack React Start):
- `loginShop` - Merchant login
- `registerShop` - New account creation
- `onboardTill` - Till configuration
- `getCurrentShop` - Fetch current session shop
- `getSubscription` - Get subscription status
- `initiateRenewal` - Upgrade/renew plan
- `listProducts` - Fetch products
- `createProduct` - Add product
- `updateProduct` - Edit product
- `deleteProduct` - Remove product
- `createSale` - Record transaction
- `getSalesHistory` - Fetch sales list
- `getSaleStatus` - Check payment status
- `cancelSale` - Cancel pending sale
- `scanBarcode` - Lookup barcode
- `verifyPin` - Verify 4-digit PIN
- `getDashboard` - Get dashboard metrics
- `getPublicShopInfo` - Public shop info lookup
- `initiatePublicPayment` - Public QR payment

**Webhook Routes**:
- `POST /api/public/webhooks/smartpay` - SmartPay payment callback

---

### Route Structure (TanStack Router)

```
__root.tsx (Layout)
├── index.tsx (/)
├── login.tsx (/login)
├── register.tsx (/register)
├── accept-invite.tsx (/accept-invite)
├── receipt.$sale_id.tsx (/receipt/:saleId)
├── pay/$shopId.tsx (/pay/:shopId)
├── admin.tsx (/admin)
│   ├── dashboard.tsx (/admin/dashboard)
│   ├── merchants.tsx (/admin/merchants)
│   ├── transactions.tsx (/admin/transactions)
│   ├── analytics.tsx (/admin/analytics)
│   ├── revenue.tsx (/admin/revenue)
│   ├── support.tsx (/admin/support)
│   ├── logs.tsx (/admin/logs)
│   ├── notifications.tsx (/admin/notifications)
│   ├── smartpay.tsx (/admin/smartpay)
│   ├── barcodes.tsx (/admin/barcodes)
│   ├── system.tsx (/admin/system)
│   └── receipt-settings.tsx (/admin/receipt-settings)
└── _authenticated.tsx (Protected routes)
    ├── dashboard.tsx (/_authenticated/dashboard)
    ├── sell.tsx (/_authenticated/sell)
    ├── history.tsx (/_authenticated/history)
    ├── products.tsx (/_authenticated/products)
    ├── analytics.tsx (/_authenticated/analytics)
    ├── subscription.tsx (/_authenticated/subscription)
    ├── profile.tsx (/_authenticated/profile)
    ├── onboarding.tsx (/_authenticated/onboarding)
    └── settings/staff.tsx (/_authenticated/settings/staff)
```

---

## Brand Assets

### Color Palette (OKLch Format)

**Primary Colors**:
| Name | OKLch | Hex Approx | Usage |
|------|-------|-----------|-------|
| Primary | `oklch(0.65 0.14 165)` | `#16a34a` | M-Pesa green, buttons, links |
| Primary-Foreground | `oklch(1 0 0)` | `#ffffff` | Text on primary background |

**Secondary Colors**:
| Name | OKLch | Hex Approx | Usage |
|------|-------|-----------|-------|
| Secondary | `oklch(0.22 0.04 265)` | `#1e293b` | Dark navy, background accents |
| Secondary-Foreground | `oklch(0.98 0 0)` | `#f8fafc` | Light text on dark background |

**Neutral Colors**:
| Name | OKLch | Usage |
|------|-------|-------|
| Background | `oklch(0.97 0.005 250)` | Page background (light) |
| Foreground | `oklch(0.27 0.03 250)` | Primary text color |
| Card | `oklch(1 0 0)` | Card/container background |
| Card-Foreground | `oklch(0.27 0.03 250)` | Text on cards |
| Muted | `oklch(0.95 0.005 250)` | Disabled/muted backgrounds |
| Muted-Foreground | `oklch(0.55 0.02 250)` | Muted text |
| Border | `oklch(0.92 0.008 250)` | Border lines |
| Input | `oklch(0.92 0.008 250)` | Form input backgrounds |

**Semantic Colors**:
| Name | OKLch | Usage |
|------|-------|-------|
| Success | `oklch(0.65 0.16 145)` | Success messages, check marks |
| Destructive | `oklch(0.6 0.22 27)` | Errors, delete buttons |
| Warning | `oklch(0.75 0.14 70)` | Warnings, trial expiry |
| Accent | `oklch(0.94 0.02 165)` | Hover states, accents |

**Dark Mode Overrides**:
- Background: `oklch(0.18 0.02 265)` (Dark blue-gray)
- Foreground: `oklch(0.97 0.005 250)` (Off-white)
- Card: `oklch(0.22 0.03 265)` (Slightly lighter dark)
- All other colors adjusted for contrast

---

### Gradients

**Primary Gradient**:
```css
linear-gradient(135deg, oklch(0.65 0.14 165), oklch(0.72 0.13 175))
```
Usage: Large hero sections, backgrounds

**Surface Gradient**:
```css
linear-gradient(180deg, oklch(1 0 0), oklch(0.98 0.005 250))
```
Usage: Card backgrounds, subtle depth

---

### Shadows

**Card Shadow**:
```css
0 1px 2px oklch(0.27 0.03 250 / 0.04), 0 4px 16px -8px oklch(0.27 0.03 250 / 0.08)
```

**Elegant Shadow** (buttons, modals):
```css
0 10px 30px -10px oklch(0.65 0.14 165 / 0.25)
```

---

### Typography

**Font Family**:
```css
ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif
```

**Sizes** (Tailwind defaults):
- Heading 1: 1.875rem (30px)
- Heading 2: 1.5rem (24px)
- Heading 3: 1.25rem (20px)
- Body: 1rem (16px)
- Small: 0.875rem (14px)
- XSmall: 0.75rem (12px)

---

### Border Radius

**Default Radius**: 0.75rem (12px)

**Variations**:
- `radius-sm`: 0.5rem (8px)
- `radius-md`: 0.625rem (10px)
- `radius-lg`: 0.75rem (12px)
- `radius-xl`: 1rem (16px)
- `radius-2xl`: 1.5rem (24px)

---

### Icons

**Icon Library**: Lucide React  
**Icon Sizes**: 16px (h-4 w-4), 20px (h-5 w-5), 24px (h-6 w-6), 28px (h-7 w-7), 32px (h-8 w-8)

**Common Icons Used**:
- Store (logo/home)
- ShoppingCart (POS)
- Receipt (sales/receipts)
- Package (products)
- History (transaction history)
- BarChart3 (analytics)
- Wallet (payment)
- Lock (security/pro features)
- AlertCircle (errors)
- CheckCircle2 (success)
- ScanLine (barcode)
- Plus/Minus (quantity)
- Settings (configuration)
- LogOut (exit)
- Menu (navigation)

---

### Logo Files

**Location**: [public/icons/](public/icons/)

| File | Size | Purpose | Format |
|------|------|---------|--------|
| icon-192.svg | 192×192 | App icon (regular) | SVG |
| icon-512.svg | 512×512 | App icon (large) | SVG |
| icon-192-maskable.svg | 192×192 | App icon (adaptive/maskable) | SVG |
| icon-512-maskable.svg | 512×512 | App icon (adaptive/maskable) | SVG |

**Logo Style**:
- Green till/POS device silhouette
- M-Pesa brand integration
- Adaptive design for various app launchers
- Maskable variant for icon shape adaptation

---

### App Manifest

**File**: [public/manifest.json](public/manifest.json)

```json
{
  "name": "Trusit",
  "short_name": "Trusit",
  "description": "M-Pesa payments for Kenyan merchants",
  "start_url": "/dashboard",
  "display": "standalone",
  "theme_color": "#16a34a",
  "background_color": "#ffffff",
  "orientation": "portrait-primary"
}
```

---

### Branded Elements

**App Name**: Trusit  
**Tagline**: "M-Pesa payments for Kenyan merchants"  
**Theme Color**: M-Pesa green (#16a34a)  
**Background**: White (#ffffff)  

**Welcome Messages**:
- "Trusit: Sign in to your duka" (login page)
- "Create account: 14-day free trial, no card needed" (signup page)
- "Set up your till: Where should customer payments be sent?" (onboarding)
- "Welcome back to {shop_name}" (dashboard)

---

## Deployment & Environment

### Hosting
- **Platform**: Cloudflare Workers
- **Database**: Supabase (Postgres)
- **CDN**: Cloudflare
- **Storage**: Cloudflare KV (caching)

### Environment Variables (Wrangler)

```jsonc
{
  "vars": {
    "APP_URL": "https://dukapay-till.jiannamercy.workers.dev",
    "SMARTPAY_CALLBACK_URL": "https://jiannamercy/api/public/webhooks/smartpay",
    "SUBSCRIPTION_AMOUNT": "499",
    "TRIAL_DAYS": "14",
    "JWT_SECRET": "[64-char random hex string]",
    "ADMIN_JWT_SECRET": "[64-char random hex string]"
  }
}
```

### Secrets (Cloudflare Dashboard)

These are encrypted and NOT stored in wrangler.jsonc:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMARTPAY_BOOTSTRAP_API_KEY`

---

## Technical Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript |
| **Routing** | TanStack Router v1 |
| **State Management** | TanStack React Query |
| **Styling** | Tailwind CSS, OKLch colors |
| **UI Components** | Radix UI (headless) |
| **Forms** | Native HTML + Zod validation |
| **Backend** | Cloudflare Workers (TypeScript) |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | JWT (server-generated) + httpOnly cookies |
| **Payments** | SmartPay Pesa API (M-Pesa) |
| **Icons** | Lucide React |
| **Notifications** | Sonner (toast notifications) |
| **Build** | Vite |
| **Package Manager** | Bun |

---

## Known Limitations & Planned Features

### Limitations
1. **Admin Dashboard**: Mostly placeholder pages (not production-ready)
2. **Product Images**: Schema exists but UI not implemented
3. **Automated Reorder Alerts**: Not yet implemented
4. **Email Notifications**: Not yet implemented
5. **Advanced Reporting**: Basic dashboard only, no exports
6. **Inventory Transfer**: Not supported (staff cannot adjust stock)
7. **Discount/Coupon System**: Not implemented
8. **Customer Profiles**: Only phone number tracked, no loyalty features

### Planned Features (Not Yet Implemented)
1. ✅ Email sending for staff invites
2. ✅ SMS notifications for payment confirmations
3. ✅ Inventory reorder alerts when stock drops
4. ✅ Product images and thumbnails
5. ✅ Advanced analytics with custom date ranges
6. ✅ Bulk product import (CSV)
7. ✅ Loyalty program / customer tier system
8. ✅ Receipt branding customization
9. ✅ Cash drawer tracking
10. ✅ Mobile app (iOS/Android native)

---

## Document Summary

This audit covers all implemented features in the Trusit platform as of June 2026. The platform is production-ready for core POS functionality (checkout, inventory, staff management, M-Pesa payments, and subscription management). Admin features are scaffolded but not fully implemented.

**Total Pages**: 19 main (7 admin placeholder)  
**Total Features**: 15 core + 1 PWA  
**Payment Methods**: M-Pesa STK Push, Cash  
**User Roles**: Owner, Staff  
**Subscription Tiers**: Trial (14 days free), Basic (KES 299/mo), Pro (KES 499/mo)  
**Color Scheme**: M-Pesa Green (#16a34a) + Navy + White  

---

**End of Document**
