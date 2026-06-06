// Server-only admin authentication helpers
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ADMIN_SESSION_COOKIE, verifyAdminJwt, signAdminJwt, type AdminJwtPayload } from "./admin-jwt.server";
import bcrypt from "bcryptjs";

export async function getAdminSessionPayload(): Promise<AdminJwtPayload | null> {
  const token = getCookie(ADMIN_SESSION_COOKIE);
  if (!token) return null;
  try {
    return await verifyAdminJwt(token);
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<AdminJwtPayload> {
  const session = await getAdminSessionPayload();
  if (!session) throw new Error("Admin not authenticated");
  return session;
}

export interface AdminRecord {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  created_at: string;
  last_login: string | null;
}

export async function getAdminOrThrow(adminId: string): Promise<AdminRecord> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, email, password_hash, full_name, created_at, last_login")
    .eq("id", adminId)
    .maybeSingle();

  if (error) {
    console.error("[getAdminOrThrow]", error);
    throw new Error("Unable to load admin user.");
  }
  if (!data) throw new Error("Admin user not found");
  return data as unknown as AdminRecord;
}

function setAdminSessionCookie(token: string) {
  setCookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function adminLogin(email: string, password: string): Promise<AdminJwtPayload> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, email, password_hash, full_name")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("[adminLogin:select]", error);
    throw new Error("Authentication failed");
  }

  if (!data) {
    throw new Error("Invalid email or password");
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, data.password_hash);
  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  // Update last_login
  await supabaseAdmin
    .from("admin_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", data.id);

  // Create JWT and set cookie
  const payload: AdminJwtPayload = {
    admin_id: data.id,
    email: data.email,
  };

  const token = await signAdminJwt(payload);
  setAdminSessionCookie(token);

  return payload;
}

export async function adminLoginByPhone(phone: string, password: string): Promise<AdminJwtPayload> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, email, password_hash, full_name")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("[adminLoginByPhone:select]", error);
    throw new Error("Authentication failed");
  }

  if (!data) {
    throw new Error("Invalid phone or password");
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, data.password_hash);
  if (!passwordMatch) {
    throw new Error("Invalid phone or password");
  }

  // Update last_login
  await supabaseAdmin
    .from("admin_users")
    .update({ last_login: new Date().toISOString() })
    .eq("id", data.id);

  // Create JWT and set cookie
  const payload: AdminJwtPayload = {
    admin_id: data.id,
    email: data.email,
  };

  const token = await signAdminJwt(payload);
  setAdminSessionCookie(token);

  return payload;
}

export async function adminLogout(): Promise<void> {
  deleteCookie(ADMIN_SESSION_COOKIE);
}

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details || {},
  });

  if (error) {
    console.error("[logAdminAction]", error);
    // Don't throw - logging failure shouldn't break the action
  }
}
