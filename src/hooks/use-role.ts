import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { isShopOwner, getUserRoleInShop, type UserRole } from "@/lib/multi-user.functions";

/**
 * Hook to check if current user is owner of a shop
 * Used for gating owner-only features
 */
export function useIsShopOwner(shopId: string | undefined) {
  const { data: isOwner = false, isLoading } = useQuery({
    queryKey: ["isShopOwner", shopId],
    queryFn: () =>
      shopId
        ? isShopOwner({ shop_id: shopId })
        : Promise.resolve(false),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { isOwner, isLoading };
}

/**
 * Hook to get current user's role in a shop
 * Returns 'owner', 'staff', or null
 */
export function useUserRole(shopId: string | undefined) {
  const { data: role, isLoading } = useQuery({
    queryKey: ["userRole", shopId],
    queryFn: () =>
      shopId
        ? getUserRoleInShop({ shop_id: shopId })
        : Promise.resolve(null),
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { role: (role as UserRole) || null, isLoading };
}

/**
 * Utility to check if user has required role
 * Useful for conditional rendering
 */
export function useHasRole(shopId: string | undefined, requiredRole: UserRole) {
  const { role, isLoading } = useUserRole(shopId);

  const hasRole = useCallback(() => {
    if (requiredRole === "staff") {
      // Staff access includes staff + owner
      return role === "staff" || role === "owner";
    }
    if (requiredRole === "owner") {
      // Owner access is owner only
      return role === "owner";
    }
    return false;
  }, [role, requiredRole]);

  return { hasRole: hasRole(), isLoading };
}

/**
 * Higher-order component pattern for role-based access
 * Wraps a component and only renders if user has required role
 */
export function withRoleGate<P extends { shopId?: string }>(
  Component: React.ComponentType<P>,
  requiredRole: UserRole = "owner",
  fallback?: React.ReactNode
) {
  return function GatedComponent(props: P) {
    const { hasRole, isLoading } = useHasRole(props.shopId, requiredRole);

    if (isLoading) return null;
    if (!hasRole) return fallback || null;

    return React.createElement(Component, props);
  };
}
