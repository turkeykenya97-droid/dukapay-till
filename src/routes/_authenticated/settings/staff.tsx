import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { InviteStaffForm } from "@/components/multi-user/invite-staff-form";
import { ShopMembersList } from "@/components/multi-user/shop-members-list";
import { ShopInvitationsList } from "@/components/multi-user/shop-invitations-list";
import { useIsShopOwner } from "@/hooks/use-role";
import { getUserShops } from "@/lib/multi-user.functions";

function StaffManagement() {
  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["userShops"],
    queryFn: () => getUserShops(),
  });

  // Use first shop (could expand to multi-shop selector)
  const currentShop = shops[0];
  const { isOwner } = useIsShopOwner(currentShop?.shop_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!currentShop) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No shop found. Please claim or join a shop first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            Only shop owners can manage staff members.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{currentShop.shop_name}</h1>
          <p className="text-muted-foreground">Manage your shop staff and access</p>
        </div>

        <div className="space-y-6">
          <InviteStaffForm shopId={currentShop.shop_id} />
          <ShopMembersList shopId={currentShop.shop_id} />
          <ShopInvitationsList shopId={currentShop.shop_id} />
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/settings/staff")({
  component: StaffManagement,
});
