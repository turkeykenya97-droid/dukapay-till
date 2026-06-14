import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { claimShopAsOwner } from "@/lib/multi-user.functions";

interface ClaimShopModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
  onSuccess?: () => void;
}

export function ClaimShopModal({ open, onOpenChange, shopId, onSuccess }: ClaimShopModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const claimMutation = useMutation({
    mutationFn: () => claimShopAsOwner({ shop_id: shopId }),
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
      router.invalidate();
    },
  });

  const handleClaim = async () => {
    await claimMutation.mutateAsync();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Existing Shop</DialogTitle>
          <DialogDescription>
            Link your existing shop account to your user profile to enable multi-user access
          </DialogDescription>
        </DialogHeader>

        {claimMutation.isPending && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Processing...</AlertDescription>
          </Alert>
        )}

        {claimMutation.isSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Successfully linked! You're now the owner.
            </AlertDescription>
          </Alert>
        )}

        {claimMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {claimMutation.error instanceof Error
                ? claimMutation.error.message
                : "Failed to claim shop"}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label className="text-sm">Shop ID</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={shopId}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(shopId);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            By claiming this shop, you'll become the owner and can invite staff members to collaborate. Only do this if you own this shop.
          </p>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={claimMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClaim}
              disabled={claimMutation.isPending || claimMutation.isSuccess}
            >
              Claim as Owner
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
