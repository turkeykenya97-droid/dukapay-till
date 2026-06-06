// Admin JWT helpers using jose (Workers-compatible, pure JS)
import { SignJWT, jwtVerify } from "jose";

function getAdminSecret(): Uint8Array {
  const s = process.env.ADMIN_JWT_SECRET;
  if (!s) throw new Error("Missing ADMIN_JWT_SECRET");
  return new TextEncoder().encode(s);
}

export interface AdminJwtPayload {
  admin_id: string;
  email: string;
}

export async function signAdminJwt(payload: AdminJwtPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getAdminSecret());
}

export async function verifyAdminJwt(token: string): Promise<AdminJwtPayload> {
  const { payload } = await jwtVerify(token, getAdminSecret());
  if (typeof payload.admin_id !== "string" || typeof payload.email !== "string") {
    throw new Error("Invalid token payload");
  }
  return { admin_id: payload.admin_id, email: payload.email };
}

export const ADMIN_SESSION_COOKIE = "dukapos_admin_session";
