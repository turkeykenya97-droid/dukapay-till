import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCurrentShop, logout } from "@/lib/auth.functions";
import { LayoutDashboard, Package, History, LogOut, ShoppingCart, BarChart3, User, CreditCard } from "lucide-react";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";

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
    { to: "/sell", label: "Sell", icon: ShoppingCart },
    { to: "/history", label: "History", icon: History },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/subscription", label: "Subscription", icon: CreditCard },
    { to: "/profile", label: "Profile", icon: User },
  ] as const;

  if (!showNav) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop side nav */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-card sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-border">
          <div className="text-lg font-bold text-primary">DukaPOS</div>
          <div className="text-xs text-muted-foreground truncate">{shop.shop_name}</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((it) => {
            const active = location.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => logoutMutation.mutate()}
          className="m-3 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-20 lg:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-30 lg:hidden">
        <div className="max-w-2xl mx-auto flex items-center justify-around">
          {items.map((it) => {
            const active = location.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex-1 flex flex-col items-center py-2.5 text-[10px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                {it.label}
              </Link>
            );
          })}
          <button
            onClick={() => logoutMutation.mutate()}
            className="flex-1 flex flex-col items-center py-2.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5 mb-0.5" />
            Out
          </button>
        </div>
      </nav>
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}
