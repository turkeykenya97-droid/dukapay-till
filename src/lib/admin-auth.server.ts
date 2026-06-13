import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { setCookie, deleteCookie, getCookie } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminJwt,
  signAdminJwt,
  type AdminJwtPayload,
} from "./admin-jwt.server";

const adminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const adminLoginPhoneSchema = z.object({
  phone: z.string().regex(/^0\d{9}$/, "Phone must be 10 digits starting with 0"),
  password: z.string().min(1, "Password is required"),
});

// Session cache to prevent excessive database calls
let sessionCache: {
  token: string | null;
  result: any;
  timestamp: number;
} = {
  token: null,
  result: null,
  timestamp: 0,
};

const SESSION_CACHE_TTL = 1000; // 1 second in milliseconds

function setAdminSessionCookie(token: string) {
  setCookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export const adminLoginServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => adminLoginSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, password_hash, full_name")
      .eq("email", data.email)
      .maybeSingle();

    if (error) {
      console.error("[adminLogin:select]", error);
      throw new Error("Authentication failed");
    }
    if (!row) throw new Error("Invalid email or password");

    const ok = await bcrypt.compare(data.password, row.password_hash);
    if (!ok) throw new Error("Invalid email or password");

    await supabaseAdmin
      .from("admin_users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", row.id);

    const jwtPayload: AdminJwtPayload = { admin_id: row.id, email: row.email };
    const token = await signAdminJwt(jwtPayload);
    setAdminSessionCookie(token);
    return { success: true };
  });

export const adminLoginByPhoneServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => adminLoginPhoneSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, password_hash, full_name")
      .eq("phone", data.phone)
      .maybeSingle();

    if (error) {
      console.error("[adminLoginByPhone:select]", error);
      throw new Error("Authentication failed");
    }
    if (!row) throw new Error("Invalid phone or password");

    const ok = await bcrypt.compare(data.password, row.password_hash);
    if (!ok) throw new Error("Invalid phone or password");

    await supabaseAdmin
      .from("admin_users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", row.id);

    const jwtPayload: AdminJwtPayload = { admin_id: row.id, email: row.email };
    const token = await signAdminJwt(jwtPayload);
    setAdminSessionCookie(token);
    return { success: true };
  });

export const adminLogoutServer = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(ADMIN_SESSION_COOKIE, { path: "/" });
  return { success: true };
});

export const getAdminSessionServer = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(ADMIN_SESSION_COOKIE);
  const now = Date.now();
  
  // Return cached result if:
  // 1. Same token as last call
  // 2. Cache is still fresh (within TTL)
  if (
    token === sessionCache.token &&
    now - sessionCache.timestamp < SESSION_CACHE_TTL
  ) {
    return sessionCache.result;
  }
  
  // Token changed or cache expired - refresh
  if (!token) {
    sessionCache = { token: null, result: null, timestamp: now };
    return null;
  }
  
  try {
    const result = await verifyAdminJwt(token);
    sessionCache = { token, result, timestamp: now };
    return result;
  } catch {
    sessionCache = { token, result: null, timestamp: now };
    return null;
  }
});
