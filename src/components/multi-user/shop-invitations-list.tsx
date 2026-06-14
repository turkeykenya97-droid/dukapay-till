import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Copy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getShopInvitations, revokeShopInvitation } from "@/lib/multi-user.functions";

interface ShopInvitationsListProps {
  shopId: string;
}

export function ShopInvitationsList({ shopId }: ShopInvitationsListProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = React.useState<string | null>(null);

  const { data: invitations = [], isLoading, error } = useQuery({
    queryKey: ["shopInvitations", shopId],
    queryFn: () => getShopInvitations({ shop_id: shopId }),
  });

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      revokeShopInvitation({ invitation_id: invitationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shopInvitations", shopId],
      });
    },
  });

  const handleRevoke = async (invitationId: string) => {
    if (confirm("Are you sure you want to revoke this invitation?")) {
      await revokeMutation.mutateAsync(invitationId);
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      case "revoked":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load invitations"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>
          Manage pending staff invitations to your shop
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading invitations...
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No pending invitations
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const expired = isExpired(invitation.expires_at);
                return (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">
                      {invitation.email}
                    </TableCell>
                    <TableCell>
                      <Badge>staff</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invitation.status)}>
                        {invitation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invitation.expires_at).toLocaleDateString()}
                      {expired && <span className="text-red-600 ml-2">(Expired)</span>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {invitation.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToken(invitation.id)}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            {copied === invitation.id ? "Copied" : "Copy"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRevoke(invitation.id)}
                            disabled={revokeMutation.isPending}
                          >
                            Revoke
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
