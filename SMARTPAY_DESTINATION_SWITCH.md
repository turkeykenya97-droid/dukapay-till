# SmartPay Bootstrap Key Destination Switching

## Overview
The `sendStkPush` function in `src/lib/smartpay.server.ts` has been updated to support temporary destination switching for merchant payments. This allows using the bootstrap key (which is active) instead of merchant sub-keys (which are inactive on SmartPay).

## How It Works

### Merchant Payments (Sales)
1. **Before sending STK push**: `PUT /v1/keys/{SMARTPAY_BOOTSTRAP_KEY_ID}/destination` switches the bootstrap key's destination to the merchant's till number
2. **Send STK push**: Uses the bootstrap key to initiate payment, money routes to merchant's till
3. **After push initiated**: Switches the bootstrap key's destination back to wallet using `try/finally`

### Subscription Payments
- **Unchanged flow**: Subscription payments continue using `merchant_api_key` parameter with the bootstrap key
- No destination switching occurs for subscription payments
- `initiateRenewal()` in `src/lib/subscription.functions.ts` remains completely unchanged

### Race Condition Prevention
- A queue/lock mechanism ensures only one destination switch happens at a time
- Multiple concurrent merchant payments are serialized through the lock
- Prevents SmartPay destination conflicts when multiple merchants send payments simultaneously

## Required Environment Variables

Add these to your Cloudflare Workers environment (wrangler.jsonc or dashboard):

```json
{
  "vars": {
    "SMARTPAY_BOOTSTRAP_API_KEY": "your-bootstrap-api-key",
    "SMARTPAY_BOOTSTRAP_KEY_ID": "your-bootstrap-key-numeric-id",
    "SMARTPAY_CALLBACK_URL": "your-callback-url"
  }
}
```

**`SMARTPAY_BOOTSTRAP_KEY_ID`** - Get this from SmartPay dashboard:
1. Go to API section
2. Find your main bootstrap/master API key
3. Copy the numeric ID shown in the dashboard (e.g., `123456`)
4. Add it to environment variables

## Files Modified

### `src/lib/smartpay.server.ts`
- Added `bootstrapKeyId()` helper function
- Added `acquireDestinationLock()` queue/lock mechanism
- Updated `StkPushArgs` interface to include optional `merchant_till_number` and made `merchant_api_key` optional
- Implemented destination switching logic in `sendStkPush()`
- Maintains backward compatibility with subscription flow

### `src/lib/sales.functions.ts`
- Changed to pass `merchant_till_number: shop.payment_channel_id` instead of `merchant_api_key`
- Triggers the destination switching logic in `sendStkPush()`

### `src/lib/subscription.functions.ts`
- **No changes** - continues to work as-is with the bootstrap key
- Subscription payments don't trigger destination switching

## Error Handling

- **Destination switch to merchant till fails**: Error is thrown, STK push is NOT sent
- **STK push fails**: Destination is still switched back to wallet in `finally` block
- **Destination switch back to wallet fails**: Error is logged but not thrown (push already completed)

## Testing Checklist

- [ ] Merchant payment STK push succeeds and money routes to merchant till
- [ ] Multiple concurrent merchant payments don't cause destination conflicts
- [ ] Subscription payment still works without destination switching
- [ ] Failed destination switch prevents STK push
- [ ] Destination always returns to wallet after merchant payment attempt
- [ ] Bootstrap key ID environment variable is set and correct
