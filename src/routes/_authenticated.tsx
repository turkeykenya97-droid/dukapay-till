import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCurrentShop, logout } from "@/lib/auth.functions";
import { LayoutDashboard, Package, History, LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const shop = await getCurrentShop();
    if (!shop) throw redirect({ to: "/login" });
    if (shop.needs_onboarding && location.pathname !== "/onboarding") {
      throw redirect({ to: "/onboarding" });
    }
    return { shop };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { shop } = Route.useRouteContext();
  const location = useLocation();
  const navigate = useNavigate();
  const logoutFn = useServerFn(logout);
  const showNav = !shop.needs_onboarding;

  const logoutMutation = useMutation({
    mutationFn: () => logoutFn({ data: undefined }),
    onSuccess: () => {
      toast.success("Logged out");
      navigate({ to: "/login" });
    },
  });

  const items = [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/products", label: "Products", icon: Package },
    { to: "/history", label: "History", icon: History },
  ] as const;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Outlet />
      {showNav && (
        <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-30">
          <div className="max-w-md mx-auto flex items-center justify-around">
            {items.map((it) => {
              const active = location.pathname.startsWith(it.to);
              const Icon = it.icon;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={`flex-1 flex flex-col items-center py-3 text-xs transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  {it.label}
                </Link>
              );
            })}
            <button
              onClick={() => logoutMutation.mutate()}
              className="flex-1 flex flex-col items-center py-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-5 w-5 mb-1" />
              Sign out
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
