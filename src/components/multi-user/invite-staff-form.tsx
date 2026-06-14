import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Copy } from "lucide-react";
import { createShopInvitation } from "@/lib/multi-user.functions";

interface InviteStaffFormProps {
  shopId: string;
  onSuccess?: () => void;
}

export function InviteStaffForm({ shopId, onSuccess }: InviteStaffFormProps) {
  const [email, setEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState<{
    token: string;
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: (email: string) =>
      createShopInvitation({
        shop_id: shopId,
        email,
        role: "staff",
      }),
    onSuccess: (data) => {
      setGeneratedLink(data);
      setEmail("");
      onSuccess?.();
    },
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await inviteMutation.mutateAsync(email);
  };

  const copyToClipboard = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Staff Member</CardTitle>
        <CardDescription>
          Send an invite link to a staff member to join your shop
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {generatedLink ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Invitation created! Share the link below with your staff member.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-sm">Invite Link (expires in 7 days)</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedLink.url}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setGeneratedLink(null)}
              >
                Invite Another
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            {inviteMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {inviteMutation.error instanceof Error
                    ? inviteMutation.error.message
                    : "Failed to create invitation"}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Staff Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="staff@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={inviteMutation.isPending}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={inviteMutation.isPending || !email.trim()}
              className="w-full"
            >
              {inviteMutation.isPending ? "Creating..." : "Generate Invite Link"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
