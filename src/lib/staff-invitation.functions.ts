import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession } from "./session.server";
import { z } from "zod";
import crypto from "crypto";

// Generate secure invitation token
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Create staff invitation
const createInvitationSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role_id: z.string().uuid("Invalid role"),
  branch_id: z.string().uuid("Invalid branch").optional(),
  expiry_days: z.number().default(7), // Expires in 7 days
});

export const createStaffInvitation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createInvitationSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Verify branch belongs to shop if specified
    if (data.branch_id) {
      const { data: branch, error: branchError } = await supabaseAdmin
        .from("shop_branches")
        .select("id")
        .eq("id", data.branch_id)
        .eq("shop_id", session.shop_id)
        .single();

      if (branchError || !branch) {
        throw new Error("Invalid branch assignment");
      }
    }

    // Verify role exists
    const { data: role, error: roleError } = await supabaseAdmin
      .from("roles")
      .select("id, name")
      .eq("id", data.role_id)
      .single();

    if (roleError || !role) {
      throw new Error("Invalid role");
    }

    // Check if invitation already exists for this email
    const { data: existing } = await supabaseAdmin
      .from("staff_invitations")
      .select("id")
      .eq("shop_id", session.shop_id)
      .eq("email", data.email)
      .eq("status", "pending")
      .single();

    if (existing) {
      throw new Error("Pending invitation already exists for this email");
    }

    // Generate invitation token
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiry_days);

    // Create invitation
    const { data: invitation, error } = await supabaseAdmin
      .from("staff_invitations")
      .insert({
        shop_id: session.shop_id,
        branch_id: data.branch_id || null,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        role_id: data.role_id,
        invitation_token: token,
        expires_at: expiresAt.toISOString(),
        created_by: session.user_id,
        status: "pending",
      })
      .select("id, email, full_name, role_id, invitation_token, expires_at")
      .single();

    if (error) throw error;

    // TODO: Send invitation email with link
    // Link format: /invite/{token}

    return {
      success: true,
      invitation: invitation,
      invitationLink: `/invite/${token}`,
    };
  });

// Validate invitation token and get details
export const validateInvitationToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { data: invitation, error } = await supabaseAdmin
      .from("staff_invitations")
      .select(
        `
        id, full_name, email, phone, role_id, branch_id, 
        shop_id, status, expires_at, 
        roles(id, name)
      `
      )
      .eq("invitation_token", data.token)
      .single();

    if (error || !invitation) {
      throw new Error("Invitation not found");
    }

    // Check if expired
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      throw new Error("Invitation has expired");
    }

    // Check if already used
    if (invitation.status === "accepted") {
      throw new Error("Invitation has already been used");
    }

    if (invitation.status === "cancelled") {
      throw new Error("Invitation has been cancelled");
    }

    return {
      id: invitation.id,
      full_name: invitation.full_name,
      email: invitation.email,
      phone: invitation.phone,
      role: invitation.roles,
      branch_id: invitation.branch_id,
      shop_id: invitation.shop_id,
    };
  });

// Accept invitation and create staff account
const acceptInvitationSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  password_confirm: z.string(),
  profile_photo_url: z.string().url().optional(),
}).refine(
  (data) => data.password === data.password_confirm,
  {
    message: "Passwords do not match",
    path: ["password_confirm"],
  }
);

export const acceptStaffInvitation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => acceptInvitationSchema.parse(d))
  .handler(async ({ data }) => {
    // Get invitation details
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("staff_invitations")
      .select(
        `
        id, full_name, email, phone, role_id, branch_id, 
        shop_id, status, expires_at
      `
      )
      .eq("invitation_token", data.token)
      .single();

    if (invError || !invitation) {
      throw new Error("Invitation not found");
    }

    // Verify invitation is still valid
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      throw new Error("Invitation has expired");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been used");
    }

    // Check if user already exists with this email
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", invitation.email)
      .single();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password (in production, use bcrypt)
    const hashedPassword = Buffer.from(data.password).toString("base64");

    // Create user account
    const { data: newUser, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        email: invitation.email,
        full_name: invitation.full_name,
        password_hash: hashedPassword,
        phone: invitation.phone || null,
        shop_id: invitation.shop_id,
        role_id: invitation.role_id,
        branch_id: invitation.branch_id,
        profile_photo_url: data.profile_photo_url || null,
        invitation_id: invitation.id,
      })
      .select("id, email, full_name, role_id, branch_id")
      .single();

    if (userError) throw userError;

    // Mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from("staff_invitations")
      .update({
        status: "accepted",
        used_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) throw updateError;

    return {
      success: true,
      user: newUser,
      message: "Account created successfully",
    };
  });

// Get user role and permissions
export const getUserRoleAndPermissions = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireSession();

    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select(
        `
        id, email, full_name, role_id, branch_id,
        roles(id, name, description),
        shop_branches(id, name)
      `
      )
      .eq("id", session.user_id)
      .single();

    if (userError || !user) {
      throw new Error("User not found");
    }

    // Get permissions for this role
    let permissions: string[] = [];
    if (user.role_id) {
      const { data: rolePerms } = await supabaseAdmin
        .from("role_permissions")
        .select("permission")
        .eq("role_id", user.role_id);

      permissions = rolePerms?.map((p) => p.permission) || [];
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.roles,
        branch: user.shop_branches,
      },
      permissions,
    };
  });

// Get all staff invitations for a shop (admin only)
export const getStaffInvitations = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireSession();

    const { data: invitations, error } = await supabaseAdmin
      .from("staff_invitations")
      .select(
        `
        id, full_name, email, phone, status, expires_at, created_at,
        roles(name),
        shop_branches(name),
        created_by(full_name)
      `
      )
      .eq("shop_id", session.shop_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return invitations || [];
  });

// Get all staff users for a shop
export const getShopStaff = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireSession();

    const { data: staff, error } = await supabaseAdmin
      .from("users")
      .select(
        `
        id, email, full_name, phone, created_at,
        roles(name),
        shop_branches(name)
      `
      )
      .eq("shop_id", session.shop_id)
      .not("role_id", "is", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return staff || [];
  });

// Cancel invitation
export const cancelStaffInvitation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ invitation_id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    const { error } = await supabaseAdmin
      .from("staff_invitations")
      .update({ status: "cancelled" })
      .eq("id", data.invitation_id)
      .eq("shop_id", session.shop_id);

    if (error) throw error;

    return { success: true };
  });

// Get roles for dropdown
export const getAllRoles = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: roles, error } = await supabaseAdmin
      .from("roles")
      .select("id, name, description")
      .order("name");

    if (error) throw error;

    return roles || [];
  });
