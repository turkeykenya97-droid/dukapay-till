import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ADMIN_SESSION_COOKIE, verifyAdminJwt, signAdminJwt, type AdminJwtPayload } from "./admin-jwt.server";
import bcrypt from "bcryptjs";

const adminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const adminLoginPhoneSchema = z.object({
  phone: z.string().regex(/^0\d{9}$/, "Phone must be 10 digits starting with 0"),
  password: z.string().min(1, "Password is required"),
});

function setAdminSessionCookie(token: string) {
  const { setCookie } = require("@tanstack/react-start/server");
  setCookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export const adminLoginServer = createServerFn({ method: "POST" }).handler(async (payload: {
  email: string;
  password: string;
}) => {
  const parsed = adminLoginSchema.parse(payload);
  
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, email, password_hash, full_name")
    .eq("email", parsed.email)
    .maybeSingle();

  if (error) {
    console.error("[adminLogin:select]", error);
    throw new Error("Authentication failed");
  }

  if (!data) {
    throw new Error("Invalid email or password");
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(parsed.password, data.password_hash);
  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  // Update last_login
  await supabaseAdmin
    .from("admin_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", data.id);

  // Create JWT and set cookie
  const jwtPayload: AdminJwtPayload = {
    admin_id: data.id,
    email: data.email,
  };

  const token = await signAdminJwt(jwtPayload);
  setAdminSessionCookie(token);

  return { success: true };
});

export const adminLoginByPhoneServer = createServerFn({ method: "POST" }).handler(async (payload: {
  phone: string;
  password: string;
}) => {
  const parsed = adminLoginPhoneSchema.parse(payload);
  
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, email, password_hash, full_name")
    .eq("phone", parsed.phone)
    .maybeSingle();

  if (error) {
    console.error("[adminLoginByPhone:select]", error);
    throw new Error("Authentication failed");
  }

  if (!data) {
    throw new Error("Invalid phone or password");
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(parsed.password, data.password_hash);
  if (!passwordMatch) {
    throw new Error("Invalid phone or password");
  }

  // Update last_login
  await supabaseAdmin
    .from("admin_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", data.id);

  // Create JWT and set cookie
  const jwtPayload: AdminJwtPayload = {
    admin_id: data.id,
    email: data.email,
  };

  const token = await signAdminJwt(jwtPayload);
  setAdminSessionCookie(token);

  return { success: true };
});

export const adminLogoutServer = createServerFn({ method: "POST" }).handler(async () => {
  const { deleteCookie } = require("@tanstack/react-start/server");
  deleteCookie(ADMIN_SESSION_COOKIE);
  return { success: true };
});

export const getAdminSessionServer = createServerFn({ method: "GET" }).handler(async () => {
  const { getCookie } = require("@tanstack/react-start/server");
  const token = getCookie(ADMIN_SESSION_COOKIE);
  if (!token) return null;
  try {
    return await verifyAdminJwt(token);
  } catch {
    return null;
  }
});
