// JWT helpers using jose (Workers-compatible, pure JS).
import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Missing JWT_SECRET");
  return new TextEncoder().encode(s);
}

export interface ShopJwtPayload {
  shop_id: string;
  user_id: string;
  phone: string;
}

export async function signShopJwt(payload: ShopJwtPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyShopJwt(token: string): Promise<ShopJwtPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  if (typeof payload.shop_id !== "string" || typeof payload.phone !== "string") {
    throw new Error("Invalid token payload");
  }
  return { shop_id: payload.shop_id, phone: payload.phone };
}

export const SESSION_COOKIE = "dukapos_session";
