import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminLogin as adminLoginFn } from "@/lib/admin-auth.functions.server";

const adminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const adminLoginServer = createServerFn("POST", async (payload: {
  email: string;
  password: string;
}) => {
  const parsed = adminLoginSchema.parse(payload);
  await adminLoginFn(parsed.email, parsed.password);
  return { success: true };
});

export const adminLogoutServer = createServerFn("POST", async () => {
  const { adminLogout } = await import("@/lib/admin-auth.functions.server");
  await adminLogout();
  return { success: true };
});

export const getAdminSessionServer = createServerFn("GET", async () => {
  const { getAdminSessionPayload } = await import("@/lib/admin-auth.functions.server");
  return await getAdminSessionPayload();
});
