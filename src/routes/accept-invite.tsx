import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { acceptShopInvitation } from "@/lib/multi-user.functions";

function AcceptInvite() {
  const navigate = useNavigate();
  const { token } = Route.useSearch();
  const [showMessage, setShowMessage] = useState(true);

  const acceptMutation = useMutation({
    mutationFn: () => acceptShopInvitation({ token }),
    onSuccess: (data) => {
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate({ to: "/_authenticated/dashboard" });
      }, 3000);
    },
  });

  useEffect(() => {
    // Auto-accept if token is valid
    if (token && showMessage) {
      acceptMutation.mutate();
      setShowMessage(false);
    }
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Joining shop as a staff member
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {acceptMutation.isPending && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Processing invitation...</AlertDescription>
            </Alert>
          )}

          {acceptMutation.isSuccess && (
            <>
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Successfully joined! Redirecting to dashboard...
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                You can now access the shop's POS system and inventory.
              </p>
            </>
          )}

          {acceptMutation.isError && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {acceptMutation.error instanceof Error
                    ? acceptMutation.error.message
                    : "Failed to accept invitation"}
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/" })}
                >
                  Go Home
                </Button>
                <Button
                  onClick={() => acceptMutation.reset()}
                >
                  Try Again
                </Button>
              </div>
            </>
          )}

          {!acceptMutation.isPending && !acceptMutation.isSuccess && !acceptMutation.isError && (
            <p className="text-sm text-muted-foreground">
              Loading invitation details...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface InviteSearchParams {
  token: string;
}

export const Route = createFileRoute("/accept-invite")({
  component: AcceptInvite,
  validateSearch: (search: Record<string, any>): InviteSearchParams => {
    return {
      token: search.token || "",
    };
  },
});
