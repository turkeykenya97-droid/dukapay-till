// PayHero API v2 server helpers. Server-only (do not import from client code).

const PAYHERO_BASE_URL = "https://backend.payhero.co.ke/api/v2";

function basicAuth(): string {
  const u = process.env.PAYHERO_API_USERNAME;
  const p = process.env.PAYHERO_API_PASSWORD;
  if (!u || !p) throw new Error("Missing PayHero API credentials");
  // btoa is available in Workers runtime
  return "Basic " + btoa(`${u}:${p}`);
}

function getCallbackUrl(): string {
  const explicit = process.env.PAYHERO_CALLBACK_URL;
  if (explicit) return explicit;
  // Stable Lovable Cloud URLs (project ref is the same across renames)
  const projectId = "c5eacb4c-0b92-46cd-a0cb-6edf8245cd2b";
  return `https://project--${projectId}.lovable.app/api/public/webhooks/payhero`;
}

export function formatKenyanPhone(input: string): string {
  let p = input.replace(/\s+/g, "").replace(/^\+/, "");
  if (p.startsWith("0")) p = "254" + p.slice(1);
  if (!p.startsWith("254")) p = "254" + p;
  return p;
}

export interface RegisterChannelArgs {
  channel_type: "till" | "paybill" | "bank";
  short_code: string; // sent as STRING
  account_number?: string;
  description: string;
}

export async function registerPaymentChannel(args: RegisterChannelArgs) {
  const accountId = Number(process.env.PAYHERO_ACCOUNT_ID);
  if (!accountId || Number.isNaN(accountId)) {
    throw new Error("Invalid PAYHERO_ACCOUNT_ID");
  }

  const body = {
    channel_type: args.channel_type,
    account_id: accountId, // NUMBER
    short_code: args.short_code, // STRING
    account_number: args.account_number ?? "",
    description: args.description,
  };

  const res = await fetch(`${PAYHERO_BASE_URL}/payment_channels`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: basicAuth() },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* keep empty */
  }

  if (!res.ok) {
    const msg =
      (json.error_message as string) ||
      (json.message as string) ||
      `PayHero error ${res.status}`;
    throw new Error(msg);
  }

  const data = (json.data ?? {}) as Record<string, unknown>;
  const channelId = Number(
    json.id ?? json.channel_id ?? data.channel_id ?? data.id
  );
  if (Number.isNaN(channelId)) {
    throw new Error("PayHero did not return a valid channel id");
  }

  return { channelId, raw: json };
}

export interface StkPushArgs {
  amount: number;
  phone_number: string;
  channel_id: number;
  external_reference: string;
}

export async function sendStkPush(args: StkPushArgs) {
  const formatted = formatKenyanPhone(args.phone_number);

  const body = {
    amount: args.amount,
    phone_number: formatted,
    channel_id: args.channel_id,
    provider: "m-pesa",
    external_reference: args.external_reference,
    callback_url: getCallbackUrl(),
  };

  const res = await fetch(`${PAYHERO_BASE_URL}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: basicAuth() },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* keep empty */
  }

  if (!res.ok) {
    const msg =
      (json.error_message as string) ||
      (json.message as string) ||
      `STK Push failed (${res.status})`;
    throw new Error(msg);
  }

  const data = (json.data ?? {}) as Record<string, unknown>;
  const checkoutRequestId =
    (json.CheckoutRequestID as string) ??
    (json.checkout_request_id as string) ??
    (data.CheckoutRequestID as string) ??
    (data.checkout_request_id as string);

  if (!checkoutRequestId) {
    throw new Error("PayHero did not return a checkout request id");
  }

  return {
    reference: args.external_reference,
    checkout_request_id: checkoutRequestId,
    raw: json,
  };
}
