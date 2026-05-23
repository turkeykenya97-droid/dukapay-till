import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentShop } from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const shop = await getCurrentShop();
    if (!shop) throw redirect({ to: "/login" });
    if (shop.needs_onboarding) throw redirect({ to: "/onboarding" });
    throw redirect({ to: "/dashboard" });
  },
});
