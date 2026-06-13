import { createFileRoute } from "@tanstack/react-router";
import { requireRoleFn } from "@/lib/role-guard.server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Store, Users, BarChart3 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/admin")({
  beforeLoad: async () => {
    await requireRoleFn(["admin"]);
  },
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Platform Admin
          </h1>
          <p className="text-gray-600">
            Manage all merchants and system configuration
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <Store className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Total Merchants</h3>
            <p className="text-2xl font-bold text-purple-600">0</p>
          </Card>

          <Card className="p-6">
            <Users className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Platform Users</h3>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </Card>

          <Card className="p-6">
            <BarChart3 className="h-8 w-8 text-green-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Total Revenue</h3>
            <p className="text-2xl font-bold text-green-600">KSh 0</p>
          </Card>

          <Card className="p-6">
            <Settings className="h-8 w-8 text-gray-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">System Status</h3>
            <p className="text-lg font-bold text-green-600">Healthy</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Controls</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/admin/merchants">
                  <Store className="h-4 w-4 mr-2" />
                  Manage Merchants
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/admin/dashboard">
                  <Users className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                System Settings
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Platform Overview</h2>
            <div className="space-y-3 text-sm">
              <p className="text-gray-700">
                ✓ Monitor all merchants
              </p>
              <p className="text-gray-700">
                ✓ Manage platform users
              </p>
              <p className="text-gray-700">
                ✓ Configure system settings
              </p>
              <p className="text-gray-700">
                ✓ View platform analytics
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
