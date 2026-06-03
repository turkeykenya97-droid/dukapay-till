// SmartPayPesa API helpers. Server-only (do not import from client code).

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
}

export interface RegisterChannelResult {
  channelId: string; // SmartPay key id
  apiKey: string; // per-merchant API key
}

// Map our channel types to SmartPay destination methods.
function mapDestinationMethod(channelType: RegisterChannelArgs["channel_type"]): string {
  switch (channelType) {
    case "till":
      return "till";
    case "paybill":
      return "paybill";
    case "bank":
      return "bankpaybill";
  }
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
      (json.error_message as string) ||
      `SmartPay error ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function registerPaymentChannel(
  args: RegisterChannelArgs
): Promise<RegisterChannelResult> {
  // 1) Create per-merchant key
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

  // 2) Set destination
  const method = mapDestinationMethod(args.channel_type);
  const destinationBody: Record<string, unknown> = {
    method,
    callbackurl: getCallbackUrl(),
  };
  if (method === "till") {
    destinationBody.till_number = args.short_code;
  } else if (method === "paybill" || method === "bankpaybill") {
    destinationBody.paybill_number = args.short_code;
    if (args.account_number) destinationBody.account_number = args.account_number;
  }

  try {
    await smartpayFetch(`/keys/${channelId}/destination`, {
      method: "PUT",
      apiKey: bootstrapKey(),
      body: JSON.stringify(destinationBody),
    });
  } catch (e) {
    console.error("[smartpay:set_destination]", e);
    throw e;
  }

  return { channelId, apiKey };
}

export interface StkPushArgs {
  amount: number;
  phone_number: string;
  merchant_api_key: string; // per-merchant key
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
    apiKey: args.merchant_api_key,
    body: JSON.stringify({
      phone: formatted,
      amount: args.amount,
      account_reference: args.external_reference,
      description: args.description ?? "Payment",
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
