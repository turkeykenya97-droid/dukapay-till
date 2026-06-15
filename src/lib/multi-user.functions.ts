// Multi-user access functions for claiming shops and managing staff
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession } from "./session.server";
import { z } from "zod";

// ============================================================================
// TYPES
// ============================================================================
export type UserRole = "owner" | "staff";
export type MemberStatus = "pending" | "active" | "inactive";

export interface ShopMember {
  id: string;
  shop_id: string;
  user_id: string;
  role: UserRole;
  status: MemberStatus;
  email: string;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface UserShop {
  shop_id: string;
  shop_name: string;
  owner_name: string;
  role: UserRole;
  status: MemberStatus;
  created_at: string;
}

export interface ShopInvitation {
  id: string;
  shop_id: string;
  email: string;
  role: UserRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

// ============================================================================
// CLAIM EXISTING SHOP (Owner links existing shop to Supabase Auth)
// ============================================================================
const claimShopSchema = z.object({
  shop_id: z.string().uuid("Invalid shop ID"),
});

export const claimShopAsOwner = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => claimShopSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Call the claim_shop_as_owner function
    const { data: result, error } = await supabaseAdmin
      .rpc("claim_shop_as_owner", {
        p_shop_id: data.shop_id,
      });

    if (error) {
      console.error("[claimShopAsOwner]", error);
      throw new Error(error.message || "Failed to claim shop");
    }

    if (!result?.[0]?.success) {
      throw new Error(result?.[0]?.message || "Failed to claim shop");
    }

    return {
      shop_id: result[0].shop_id,
      user_id: result[0].user_id,
      role: result[0].role,
    };
  });

// ============================================================================
// CREATE SHOP INVITATION (Owner invites staff member)
// ============================================================================
const createInvitationSchema = z.object({
  shop_id: z.string().uuid("Invalid shop ID"),
  email: z.string().email("Invalid email"),
  role: z.enum(["staff"]).default("staff"),
});

export const createShopInvitation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createInvitationSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Call the create_shop_invitation function
    const { data: result, error } = await supabaseAdmin
      .rpc("create_shop_invitation", {
        p_shop_id: data.shop_id,
        p_email: data.email,
        p_role: data.role,
      });

    if (error) {
      console.error("[createShopInvitation]", error);
      throw new Error(error.message || "Failed to create invitation");
    }

    if (!result?.[0]?.success) {
      throw new Error(result?.[0]?.message || "Failed to create invitation");
    }

    return {
      token: result[0].invitation_token,
      url: result[0].invite_url,
      expires_at: result[0].expires_at,
    };
  });

// ============================================================================
// ACCEPT SHOP INVITATION (New staff member joins shop)
// ============================================================================
const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invalid token"),
});

export const acceptShopInvitation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => acceptInvitationSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Call the accept_shop_invitation function
    const { data: result, error } = await supabaseAdmin
      .rpc("accept_shop_invitation", {
        p_invitation_token: data.token,
      });

    if (error) {
      console.error("[acceptShopInvitation]", error);
      throw new Error(error.message || "Failed to accept invitation");
    }

    if (!result?.[0]?.success) {
      throw new Error(result?.[0]?.message || "Failed to accept invitation");
    }

    return {
      shop_id: result[0].shop_id,
      user_id: result[0].user_id,
      role: result[0].role,
    };
  });

// ============================================================================
// GET USER'S SHOPS
// ============================================================================
export const getUserShops = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await requireSession();

    const { data, error } = await supabaseAdmin
      .rpc("get_user_shops");

    if (error) {
      console.error("[getUserShops]", error);
      throw new Error("Failed to load shops");
    }

    return (data || []) as UserShop[];
  }
);

// ============================================================================
// GET USER'S ROLE IN SHOP
// ============================================================================
const getUserRoleSchema = z.object({
  shop_id: z.string().uuid("Invalid shop ID"),
});

export const getUserRoleInShop = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => getUserRoleSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // If session shop_id matches requested shop_id, user is owner of that shop
    if (session.shop_id === data.shop_id) {
      return "owner" as UserRole;
    }

    // Fallback: check shop_members table for multi-shop scenarios (future feature)
    const { data: member, error } = await supabaseAdmin
      .from("shop_members")
      .select("role, status")
      .eq("shop_id", data.shop_id)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("[getUserRoleInShop] query failed", error);
      throw new Error("Failed to get user role");
    }

    // Return role if member exists and is active, otherwise null
    return member?.role ? (member.role as UserRole) : null;
  });

// ============================================================================
// CHECK IF USER IS SHOP OWNER
// ============================================================================
const isShopOwnerSchema = z.object({
  shop_id: z.string().uuid("Invalid shop ID"),
});

export const isShopOwner = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => isShopOwnerSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // A user is owner of a shop if their session's shop_id matches the requested shop_id
    // Sessions are created only for authenticated shop owners during signup/login
    // If the shop_id in the JWT matches the requested shop_id, the user is the owner
    if (session.shop_id === data.shop_id) {
      return true;
    }

    // Fallback: check shop_members table for multi-shop scenarios (future feature)
    // This would be used if staff could manage multiple shops
    const { data: member, error } = await supabaseAdmin
      .from("shop_members")
      .select("role, status")
      .eq("shop_id", data.shop_id)
      .eq("role", "owner")
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("[isShopOwner] query failed", error);
      throw new Error("Failed to check owner status");
    }

    return !!member;
  });

// ============================================================================
// GET SHOP MEMBERS (Owner only)
// ============================================================================
const getShopMembersSchema = z.object({
  shop_id: z.string().uuid("Invalid shop ID"),
});

export const getShopMembers = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => getShopMembersSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Verify user is owner - check if session's shop_id matches requested shop_id
    if (session.shop_id !== data.shop_id) {
      throw new Error("Only shop owners can view members");
    }

    const { data: members, error } = await supabaseAdmin
      .from("shop_members")
      .select(
        `
        id,
        shop_id,
        user_id,
        role,
        status,
        invited_at,
        accepted_at,
        created_at,
        users(email)
      `
      )
      .eq("shop_id", data.shop_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getShopMembers]", error);
      throw new Error("Failed to load members");
    }

    return (members || []).map((m: any) => ({
      id: m.id,
      shop_id: m.shop_id,
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      email: m.users?.email || "Unknown",
      invited_at: m.invited_at,
      accepted_at: m.accepted_at,
      created_at: m.created_at,
    })) as ShopMember[];
  });

// ============================================================================
// GET SHOP INVITATIONS (Owner only)
// ============================================================================
const getShopInvitationsSchema = z.object({
  shop_id: z.string().uuid("Invalid shop ID"),
});

export const getShopInvitations = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => getShopInvitationsSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Verify user is owner - check if session's shop_id matches requested shop_id
    if (session.shop_id !== data.shop_id) {
      throw new Error("Only shop owners can view invitations");
    }

    const { data: invitations, error } = await supabaseAdmin
      .from("shop_invitations")
      .select("*")
      .eq("shop_id", data.shop_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getShopInvitations]", error);
      throw new Error("Failed to load invitations");
    }

    return (invitations || []) as ShopInvitation[];
  });

// ============================================================================
// REVOKE INVITATION (Owner only)
// ============================================================================
const revokeInvitationSchema = z.object({
  invitation_id: z.string().uuid("Invalid invitation ID"),
});

export const revokeShopInvitation = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => revokeInvitationSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Get invitation to check owner
    const { data: invitation, error: fetchError } = await supabaseAdmin
      .from("shop_invitations")
      .select("shop_id")
      .eq("id", data.invitation_id)
      .single();

    if (fetchError || !invitation) {
      throw new Error("Invitation not found");
    }

    // Verify user is owner - check if session's shop_id matches invitation's shop_id
    if (session.shop_id !== invitation.shop_id) {
      throw new Error("Only shop owners can revoke invitations");
    }

    const { error } = await supabaseAdmin
      .from("shop_invitations")
      .update({ status: "revoked" })
      .eq("id", data.invitation_id);

    if (error) {
      console.error("[revokeShopInvitation]", error);
      throw new Error("Failed to revoke invitation");
    }

    return { ok: true };
  });

// ============================================================================
// REMOVE MEMBER (Owner only)
// ============================================================================
const removeMemberSchema = z.object({
  member_id: z.string().uuid("Invalid member ID"),
});

export const removeShopMember = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => removeMemberSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();

    // Get member to check owner
    const { data: member, error: fetchError } = await supabaseAdmin
      .from("shop_members")
      .select("shop_id, role")
      .eq("id", data.member_id)
      .single();

    if (fetchError || !member) {
      throw new Error("Member not found");
    }

    // Can't remove the owner
    if (member.role === "owner") {
      throw new Error("Cannot remove shop owner");
    }

    // Verify user is owner - check if session's shop_id matches member's shop_id
    if (session.shop_id !== member.shop_id) {
      throw new Error("Only shop owners can remove members");
    }

    const { error } = await supabaseAdmin
      .from("shop_members")
      .update({ status: "inactive" })
      .eq("id", data.member_id);

    if (error) {
      console.error("[removeShopMember]", error);
      throw new Error("Failed to remove member");
    }

    return { ok: true };
  });
