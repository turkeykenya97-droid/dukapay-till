import { createFileRoute } from "@tanstack/react-router";
import { getUserRoleContextFn, getDashboardRoute } from "@/lib/role-guard.server";
import { redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const roleContext = await getUserRoleContextFn();
    const dashboardRoute = getDashboardRoute(roleContext.role);

    if (dashboardRoute !== "/") {
      throw redirect({
        to: dashboardRoute,
      });
    }
  },
  component: () => (
    <div className="p-6">
      <h1>Dashboard</h1>
      <p>Redirecting based on your role...</p>
    </div>
  ),
});
