import { createFileRoute } from "@tanstack/react-router";
import { requireRoleFn } from "@/lib/role-guard.server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, BarChart3, Package } from "lucide-react";

export const Route = createFileRoute("/dashboard/branch-manager")({
  beforeLoad: async () => {
    await requireRoleFn(["branch_manager"]);
  },
  component: BranchManagerDashboard,
});

function BranchManagerDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Branch Manager Dashboard
          </h1>
          <p className="text-gray-600">
            Manage branch operations and analytics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <Building2 className="h-8 w-8 text-indigo-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Branch Name</h3>
            <p className="text-lg font-bold text-indigo-600">Main Branch</p>
          </Card>

          <Card className="p-6">
            <Users className="h-8 w-8 text-green-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Active Staff</h3>
            <p className="text-2xl font-bold text-green-600">0</p>
          </Card>

          <Card className="p-6">
            <BarChart3 className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Daily Revenue</h3>
            <p className="text-2xl font-bold text-blue-600">KSh 0</p>
          </Card>

          <Card className="p-6">
            <Package className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Inventory Value</h3>
            <p className="text-2xl font-bold text-purple-600">KSh 0</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Branch Controls</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Manage Staff
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                Manage Inventory
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Manager Responsibilities</h2>
            <div className="space-y-3 text-sm">
              <p className="text-gray-700">
                ✓ Oversee daily operations
              </p>
              <p className="text-gray-700">
                ✓ Manage staff and scheduling
              </p>
              <p className="text-gray-700">
                ✓ Track inventory levels
              </p>
              <p className="text-gray-700">
                ✓ Monitor sales performance
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
