import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSession } from "./session.server";

export type UserRole = 
  | "cashier"
  | "stock_clerk"
  | "supervisor"
  | "branch_manager"
  | "accountant"
  | "admin";

export type Permission =
  | "view_pos"
  | "scan_barcodes"
  | "process_payment"
  | "view_receipt"
  | "view_inventory"
  | "update_stock"
  | "receive_stock"
  | "transfer_stock"
  | "approve_discount"
  | "approve_refund"
  | "view_cashier_sales"
  | "void_transaction"
  | "view_branch_sales"
  | "manage_products"
  | "manage_staff"
  | "view_branch_analytics"
  | "view_sales_reports"
  | "view_expenses"
  | "view_profit_reports"
  | "view_tax_reports"
  | "manage_users"
  | "manage_roles"
  | "view_system_settings"
  | "view_all_branches";

export interface UserRoleContext {
  userId: string;
  role: UserRole | null;
  permissions: Permission[];
  branchId: string | null;
  shopId: string;
}

/**
 * Get user's role and permissions (server function)
 */
export const getUserRoleContextFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireSession();

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select(
        `
        id, shop_id, role_id, branch_id,
        roles(name)
      `
      )
      .eq("id", session.user_id)
      .single();

    if (error || !user) {
      throw new Error("User not found");
    }

    let permissions: Permission[] = [];
    if (user.role_id) {
      const { data: perms } = await supabaseAdmin
        .from("role_permissions")
        .select("permission")
        .eq("role_id", user.role_id);

      permissions = (perms?.map((p: any) => p.permission) || []) as Permission[];
    }

    return {
      userId: user.id,
      role: (user.roles?.name as UserRole) || null,
      permissions,
      branchId: user.branch_id,
      shopId: user.shop_id,
    };
  });

/**
 * Require specific role (server function)
 */
export const requireRoleFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const arr = d as string[];
    return arr;
  })
  .handler(async ({ data: allowedRoles }) => {
    const session = await requireSession();

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select(
        `
        id, shop_id, role_id, branch_id,
        roles(name)
      `
      )
      .eq("id", session.user_id)
      .single();

    if (error || !user) {
      throw new Error("User not found");
    }

    const userRole = (user.roles?.name as UserRole) || null;

    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new Error(
        `Access denied. Requires one of: ${allowedRoles.join(", ")}`
      );
    }

    let permissions: Permission[] = [];
    if (user.role_id) {
      const { data: perms } = await supabaseAdmin
        .from("role_permissions")
        .select("permission")
        .eq("role_id", user.role_id);

      permissions = (perms?.map((p: any) => p.permission) || []) as Permission[];
    }

    return {
      userId: user.id,
      role: userRole,
      permissions,
      branchId: user.branch_id,
      shopId: user.shop_id,
    };
  });

/**
 * Check if user has permission (returns boolean, doesn't throw)
 */
export async function hasPermission(
  permission: Permission
): Promise<boolean> {
  try {
    const context = await getUserRoleContext();
    return context.permissions.includes(permission);
  } catch {
    return false;
  }
}

/**
 * Get dashboard route based on role
 */
export function getDashboardRoute(role: UserRole | null): string {
  switch (role) {
    case "cashier":
      return "/dashboard/cashier";
    case "stock_clerk":
      return "/dashboard/inventory";
    case "supervisor":
      return "/dashboard/supervisor";
    case "branch_manager":
      return "/dashboard/branch-manager";
    case "accountant":
      return "/dashboard/accountant";
    case "admin":
      return "/dashboard/admin";
    default:
      return "/";
  }
}

/**
 * Get sidebar menu based on role
 */
export function getRoleMenuItems(role: UserRole | null) {
  const baseItems = [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Profile", href: "/profile", icon: "User" },
  ];

  const roleItems: Record<UserRole, any[]> = {
    cashier: [
      { label: "POS", href: "/dashboard/cashier", icon: "ShoppingCart" },
      {
        label: "Receipts",
        href: "/dashboard/cashier/receipts",
        icon: "Receipt",
      },
    ],
    stock_clerk: [
      {
        label: "Inventory",
        href: "/dashboard/inventory",
        icon: "Package",
      },
      {
        label: "Stock Transfer",
        href: "/dashboard/inventory/transfers",
        icon: "ArrowRightLeft",
      },
    ],
    supervisor: [
      {
        label: "Monitoring",
        href: "/dashboard/supervisor",
        icon: "Eye",
      },
      {
        label: "Approvals",
        href: "/dashboard/supervisor/approvals",
        icon: "CheckSquare",
      },
      {
        label: "Reports",
        href: "/dashboard/supervisor/reports",
        icon: "BarChart3",
      },
    ],
    branch_manager: [
      {
        label: "Operations",
        href: "/dashboard/branch-manager",
        icon: "Building2",
      },
      {
        label: "Staff",
        href: "/dashboard/branch-manager/staff",
        icon: "Users",
      },
      {
        label: "Analytics",
        href: "/dashboard/branch-manager/analytics",
        icon: "LineChart",
      },
      {
        label: "Inventory",
        href: "/dashboard/branch-manager/inventory",
        icon: "Package",
      },
    ],
    accountant: [
      {
        label: "Reports",
        href: "/dashboard/accountant",
        icon: "FileText",
      },
      {
        label: "Expenses",
        href: "/dashboard/accountant/expenses",
        icon: "DollarSign",
      },
      {
        label: "Tax",
        href: "/dashboard/accountant/tax",
        icon: "Calculator",
      },
    ],
    admin: [
      {
        label: "System",
        href: "/dashboard/admin",
        icon: "Settings",
      },
      {
        label: "Merchants",
        href: "/dashboard/admin/merchants",
        icon: "Store",
      },
      {
        label: "Staff",
        href: "/dashboard/admin/staff",
        icon: "Users",
      },
      {
        label: "Analytics",
        href: "/dashboard/admin/analytics",
        icon: "BarChart3",
      },
    ],
  };

  return [...baseItems, ...(roleItems[role as UserRole] || [])];
}
