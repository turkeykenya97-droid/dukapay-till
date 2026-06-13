import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createStaffInvitation,
  getStaffInvitations,
  getShopStaff,
  getAllRoles,
  cancelStaffInvitation,
  getShopBranches,
} from "@/lib/staff-invitation.functions";
import { getShopBranches as getBranches } from "@/lib/receipt.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/staff-management")({
  component: StaffManagementPage,
});

function StaffManagementPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role_id: "",
    branch_id: "",
  });
  const [error, setError] = useState("");

  // Fetch data
  const { data: invitations, refetch: refetchInvitations } = useQuery({
    queryKey: ["staff-invitations"],
    queryFn: () => getStaffInvitations(),
  });

  const { data: staff } = useQuery({
    queryKey: ["shop-staff"],
    queryFn: () => getShopStaff(),
  });

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: () => getAllRoles(),
  });

  const { data: branches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => getBranches(),
  });

  // Create invitation mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => createStaffInvitation(data),
    onSuccess: (result) => {
      toast.success(`Invitation sent to ${formData.email}`);
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        role_id: "",
        branch_id: "",
      });
      setError("");
      setDialogOpen(false);
      refetchInvitations();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create invitation");
    },
  });

  // Cancel invitation mutation
  const cancelMutation = useMutation({
    mutationFn: (invitation_id: string) =>
      cancelStaffInvitation({ invitation_id }),
    onSuccess: () => {
      toast.success("Invitation cancelled");
      refetchInvitations();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to cancel invitation");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role_id) {
      setError("Please select a role");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invitation link copied");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Staff Management
        </h1>
        <p className="text-gray-600">
          Invite employees and manage roles and permissions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-indigo-600 mb-2">
              {staff?.length || 0}
            </div>
            <p className="text-gray-600">Active Staff Members</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-600 mb-2">
              {invitations?.filter((i: any) => i.status === "pending").length ||
                0}
            </div>
            <p className="text-gray-600">Pending Invitations</p>
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {invitations?.filter((i: any) => i.status === "accepted").length ||
                0}
            </div>
            <p className="text-gray-600">Accepted Invitations</p>
          </div>
        </Card>
      </div>

      {/* Invite Staff Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="mb-6" size="lg">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Staff Member
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <Input
                placeholder="John Doe"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                required
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Email Address *
              </label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Phone (optional)
              </label>
              <Input
                type="tel"
                placeholder="+254 712 345 678"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Role *
              </label>
              <Select value={formData.role_id} onValueChange={(value) => setFormData({ ...formData, role_id: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles?.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      <span className="capitalize">{role.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Branch Assignment (optional)
              </label>
              <Select value={formData.branch_id} onValueChange={(value) => setFormData({ ...formData, branch_id: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? "Sending Invitation..." : "Send Invitation"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pending Invitations */}
      {invitations?.some((i: any) => i.status === "pending") && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Pending Invitations
          </h2>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations
                  ?.filter((i: any) => i.status === "pending")
                  .map((inv: any) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        {inv.full_name}
                      </TableCell>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {inv.roles?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(inv.id)}
                          title="Copy invitation link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelMutation.mutate(inv.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Active Staff */}
      {staff && staff.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Active Staff Members
          </h2>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member: any) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.full_name}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {member.roles?.name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {member.shop_branches?.name || "Not assigned"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(member.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {!staff || (staff.length === 0 && (!invitations || invitations.length === 0)) && (
        <Card className="p-8 text-center">
          <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Staff Yet
          </h3>
          <p className="text-gray-600 mb-6">
            Start by inviting your first team member
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Staff Member
          </Button>
        </Card>
      )}
    </div>
  );
}
