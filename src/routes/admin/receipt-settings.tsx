import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getReceiptTemplate, updateReceiptTemplate } from "@/lib/receipt.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/admin/receipt-settings")({
  head: () => ({ meta: [{ title: "Receipt Settings — Trusit Admin" }] }),
  component: ReceiptSettingsPage,
});

function ReceiptSettingsPage() {
  const qc = useQueryClient();
  const getTemplate = useServerFn(getReceiptTemplate);
  const updateTemplate = useServerFn(updateReceiptTemplate);

  const { data: template, isLoading } = useQuery({
    queryKey: ["receipt-template"],
    queryFn: () => getTemplate({ data: undefined }),
  });

  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [showQR, setShowQR] = useState(true);
  const [showPaymentMethod, setShowPaymentMethod] = useState(true);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () =>
      updateTemplate({
        data: {
          header_text: headerText,
          footer_text: footerText,
          logo_url: logoUrl,
          show_qr_code: showQR,
          show_payment_method: showPaymentMethod,
        },
      }),
    onSuccess: () => {
      toast.success("Receipt settings saved!");
      qc.invalidateQueries({ queryKey: ["receipt-template"] });
    },
    onError: (err) => {
      toast.error((err as Error).message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Receipt Settings</h1>
        <p className="text-gray-600 mt-2">
          Customize how receipts appear for your customers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receipt Template</CardTitle>
          <CardDescription>
            These settings will appear on all printed and digital receipts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header Text */}
          <div className="space-y-2">
            <Label htmlFor="header">Header Text</Label>
            <Textarea
              id="header"
              placeholder="e.g., Thank you for shopping with us!"
              value={headerText || template?.header_text || ""}
              onChange={(e) => setHeaderText(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-gray-500">
              Appears at the top of the receipt
            </p>
          </div>

          {/* Footer Text */}
          <div className="space-y-2">
            <Label htmlFor="footer">Footer Text</Label>
            <Textarea
              id="footer"
              placeholder="e.g., Powered by Trusit POS"
              value={footerText || template?.footer_text || ""}
              onChange={(e) => setFooterText(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-gray-500">
              Appears at the bottom of the receipt
            </p>
          </div>

          {/* Logo URL */}
          <div className="space-y-2">
            <Label htmlFor="logo">Logo URL (optional)</Label>
            <Input
              id="logo"
              type="url"
              placeholder="https://your-domain.com/logo.png"
              value={logoUrl || template?.logo_url || ""}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              URL to your shop logo (max 150px width)
            </p>
          </div>

          {/* Options */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="qr">Show QR Code</Label>
                <p className="text-xs text-gray-500">
                  Customers can scan to verify the receipt online
                </p>
              </div>
              <Switch
                id="qr"
                checked={showQR !== false}
                onCheckedChange={setShowQR}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="payment">Show Payment Method</Label>
                <p className="text-xs text-gray-500">
                  Display cash vs M-Pesa breakdown
                </p>
              </div>
              <Switch
                id="payment"
                checked={showPaymentMethod !== false}
                onCheckedChange={setShowPaymentMethod}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="pt-6 border-t space-y-4">
            <h3 className="font-semibold">Preview</h3>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs border border-gray-200 max-h-64 overflow-y-auto">
              <div className="text-center space-y-1">
                <div>{"="}</div>
                <div>TRUSIT POS</div>
                <div>{headerText || template?.header_text || "[Header Text]"}</div>
                <div>{"="}</div>
              </div>
              <div className="mt-4 space-y-1 text-left">
                <div>Item Name            Qty    Ksh 100</div>
                <div>{"─".repeat(40)}</div>
                <div>TOTAL:              Ksh 100</div>
              </div>
              {showQR && (
                <div className="text-center mt-4">
                  <div>[QR Code]</div>
                </div>
              )}
              <div className="text-center mt-4 space-y-1 text-xs">
                <div>{footerText || template?.footer_text || "[Footer Text]"}</div>
                <div>Thank you!</div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t">
            <Button
              onClick={() => save()}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
