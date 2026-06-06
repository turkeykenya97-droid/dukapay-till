import { createFileRoute, Navigate } from "@tanstack/react-router";
import { getAdminSessionServer } from "@/lib/admin-auth.server";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const session = await getAdminSessionServer();
    
    // If not authenticated and not going to login, redirect to admin login
    if (!session && location.pathname !== "/admin/login") {
      throw new Error("Admin not authenticated");
    }
    
    return { adminSession: session };
  },
  errorComponent: () => {
    // Redirect to login on authentication error
    return <Navigate to="/admin/login" />;
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <Navigate to="/admin/dashboard" />;
}
