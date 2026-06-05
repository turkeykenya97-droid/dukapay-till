// SmartPayPesa API helpers. Server-only (do not import from client code).
// Docs: https://api.smartpaypesa.com/v1

const SMARTPAY_BASE_URL = "https://api.smartpaypesa.com/v1";

function bootstrapKey(): string {
  const k = process.env.SMARTPAY_BOOTSTRAP_API_KEY;
  if (!k) throw new Error("Missing SMARTPAY_BOOTSTRAP_API_KEY");
  return k;
}

function authHeader(apiKey: string): string {
  return `Bearer ${apiKey}`;
}

function getCallbackUrl(): string {
  const explicit = process.env.SMARTPAY_CALLBACK_URL;
  if (explicit) return explicit;
  const projectId = "c5eacb4c-0b92-46cd-a0cb-6edf8245cd2b";
  return `https://project--${projectId}.lovable.app/api/public/webhooks/smartpay`;
}

export function formatKenyanPhone(input: string): string {
  let p = input.replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (!p.startsWith("254")) p = "254" + p;
  return p;
}

export interface RegisterChannelArgs {
  channel_type: "till" | "paybill" | "bank";
  short_code: string;
  account_number?: string;
  description: string; // used as merchant key name
  notify_phone?: string;
  notify_email?: string;
}

export interface RegisterChannelResult {
  channelId: string; // SmartPay key id
  apiKey: string; // per-merchant API key
}

async function smartpayFetch(
  path: string,
  init: RequestInit & { apiKey: string }
): Promise<Record<string, unknown>> {
  const { apiKey, headers, ...rest } = init;
  const res = await fetch(`${SMARTPAY_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(apiKey),
      ...(headers ?? {}),
    },
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    /* keep empty */
  }
  if (!res.ok) {
    const msg =
      (json.error as string) ||
      (json.message as string) ||
      (json.error_code as string) ||
      `SmartPay error ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

function buildDestinationBody(args: RegisterChannelArgs): Record<string, unknown> {
  const body: Record<string, unknown> = { callbackurl: getCallbackUrl() };
  switch (args.channel_type) {
    case "till":
      body.method = "till";
      body.till_number = args.short_code;
      break;
    case "paybill":
      body.method = "paybill";
      body.paybill_number = args.short_code;
      body.account_number = args.account_number ?? "";
      break;
    case "bank":
      // Map: short_code = bank_code, account_number = bank_account
      body.method = "bankpaybill";
      body.bank_code = args.short_code;
      body.bank_account = args.account_number ?? "";
      break;
  }
  return body;
}

export async function registerPaymentChannel(
  args: RegisterChannelArgs
): Promise<RegisterChannelResult> {
  // 1) Create per-merchant key (bootstrap key)
  const createRes = await smartpayFetch("/keys", {
    method: "POST",
    apiKey: bootstrapKey(),
    body: JSON.stringify({ name: args.description }),
  });

  const account =
    (createRes.account as Record<string, unknown> | undefined) ?? createRes;
  const channelId = String(account.id ?? "");
  const apiKey = String(account.api_key ?? "");
  if (!channelId || !apiKey) {
    throw new Error("SmartPay did not return a valid merchant key");
  }

  // 2) Set payment destination (uses bootstrap key — manages keys)
  await smartpayFetch(`/keys/${channelId}/destination`, {
    method: "PUT",
    apiKey: bootstrapKey(),
    body: JSON.stringify(buildDestinationBody(args)),
  });

  // 3) Optional notifications
  if (args.notify_email || args.notify_phone) {
    try {
      await smartpayFetch(`/keys/${channelId}/notifications`, {
        method: "PUT",
        apiKey: bootstrapKey(),
        body: JSON.stringify({
          notify_email: args.notify_email ?? "",
          notify_phone: args.notify_phone
            ? formatKenyanPhone(args.notify_phone)
            : "",
        }),
      });
    } catch (e) {
      // Non-fatal — destination is set, payments will still work.
      console.warn("[smartpay:notifications]", e);
    }
  }

  return { channelId, apiKey };
}

export interface StkPushArgs {
  amount: number;
  phone_number: string;
  external_reference: string;
  description?: string;
}

export interface StkPushResult {
  reference: string;
  checkout_request_id: string;
  merchant_request_id?: string;
  raw: Record<string, unknown>;
}

export async function sendStkPush(args: StkPushArgs): Promise<StkPushResult> {
  const formatted = formatKenyanPhone(args.phone_number);
  const json = await smartpayFetch("/stk/push", {
    method: "POST",
    apiKey: bootstrapKey(),
    body: JSON.stringify({
      phone: formatted,
      amount: Math.round(args.amount),
      account_reference: args.external_reference,
      description: args.description ?? "SmartPay Payment",
    }),
  });

  const checkoutRequestId =
    (json.checkout_request_id as string) ||
    (json.CheckoutRequestID as string) ||
    "";
  const merchantRequestId =
    (json.merchant_request_id as string) ||
    (json.MerchantRequestID as string) ||
    undefined;

  if (!checkoutRequestId) {
    throw new Error("SmartPay did not return a checkout request id");
  }

  return {
    reference: args.external_reference,
    checkout_request_id: checkoutRequestId,
    merchant_request_id: merchantRequestId,
    raw: json,
  };
}

export interface TransactionStatusArgs {
  checkout_request_id: string;
  merchant_api_key: string;
}

export async function getTransactionStatus(args: TransactionStatusArgs) {
  return smartpayFetch("/transactionstatus", {
    method: "POST",
    apiKey: args.merchant_api_key,
    body: JSON.stringify({ CheckoutRequestID: args.checkout_request_id }),
  });
}
