import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getShopMembers, removeShopMember } from "@/lib/multi-user.functions";

interface ShopMembersListProps {
  shopId: string;
}

export function ShopMembersList({ shopId }: ShopMembersListProps) {
  const queryClient = useQueryClient();

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ["shopMembers", shopId],
    queryFn: () => getShopMembers({ shop_id: shopId }),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      removeShopMember({ member_id: memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["shopMembers", shopId],
      });
    },
  });

  const handleRemove = async (memberId: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      await removeMutation.mutateAsync(memberId);
    }
  };

  const getRoleColor = (role: string) => {
    return role === "owner" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load members"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Members</CardTitle>
        <CardDescription>
          Manage staff members and their access to your shop
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No members yet. Invite staff to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(member.role)}>
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(member.status)}>
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(member.accepted_at || member.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {member.role !== "owner" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemove(member.id)}
                        disabled={removeMutation.isPending}
                      >
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
