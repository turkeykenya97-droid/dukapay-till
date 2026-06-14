import { createFileRoute, Outlet, redirect, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCurrentShop, logout } from "@/lib/auth.functions";
import { LayoutDashboard, Package, History, LogOut, ShoppingCart, BarChart3, User, CreditCard, MoreVertical, Users } from "lucide-react";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { useIsShopOwner } from "@/hooks/use-role";
import { PlanBadge } from "@/components/plan-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { isOwner } = useIsShopOwner(shop.id);

  const logoutMutation = useMutation({
    mutationFn: () => logoutFn({ data: undefined }),
    onSuccess: () => {
      toast.success("Logged out");
      navigate({ to: "/login" });
    },
  });

  // Base items visible to all members
  const baseItems = [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/products", label: "Products", icon: Package },
    { to: "/sell", label: "Sell", icon: ShoppingCart },
    { to: "/history", label: "History", icon: History },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
  ] as const;

  // Owner-only items
  const ownerItems = [
    { to: "/subscription", label: "Subscription", icon: CreditCard },
  ] as const;

  // Settings items (always visible)
  const settingsItems = [
    { to: "/profile", label: "Profile", icon: User },
    ...(isOwner ? [{ to: "/settings/staff", label: "Staff", icon: Users }] : []),
  ] as const;

  const items = [...baseItems, ...ownerItems, ...settingsItems] as const;
  const primaryItems = items.slice(0, 4);
  const secondaryItems = items.slice(4);

  if (!showNav) {
    return (
      <div className="min-h-screen bg-background">
        <Outlet />
      </div>
    );
  }

  const initials = shop.shop_name
    .split(/\s+/)
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Desktop side nav */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card sticky top-0 h-screen">
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm" style={{ background: "var(--gradient-primary)" }}>
              {initials || "DP"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-foreground leading-tight">Trusit</div>
              <div className="text-xs text-muted-foreground truncate">{shop.shop_name}</div>
            </div>
          </div>
          <div className="ml-0 mt-2">
            <PlanBadge variant="detailed" showDays={true} />
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {items.map((it) => {
            const active = location.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-primary" />}
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => logoutMutation.mutate()}
          className="m-3 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-24 lg:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur border-t border-border z-30 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-around px-1">
          {primaryItems.map((it) => {
            const active = location.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className="flex-1 flex flex-col items-center py-2.5 text-[10px] transition-colors"
              >
                <span className={`inline-flex items-center justify-center h-9 w-12 rounded-xl mb-0.5 transition-colors ${
                  active ? "bg-primary/15 text-primary" : "text-muted-foreground"
                }`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className={active ? "text-primary font-semibold" : "text-muted-foreground"}>
                  {it.label}
                </span>
              </Link>
            );
          })}

          {/* More menu for secondary items */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex-1 flex flex-col items-center py-2.5 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center justify-center h-9 w-12 rounded-xl mb-0.5">
                  <MoreVertical className="h-5 w-5" />
                </span>
                More
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mb-16">
              {secondaryItems.map((it) => {
                const Icon = it.icon;
                const active = location.pathname.startsWith(it.to);
                return (
                  <DropdownMenuItem key={it.to} asChild className={active ? "bg-primary/10 text-primary" : ""}>
                    <Link to={it.to}>
                      <Icon className="h-4 w-4 mr-2" />
                      {it.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}
