import { createFileRoute } from "@tanstack/react-router";
import { requireRoleFn } from "@/lib/role-guard.server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, TrendingDown, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/inventory")({
  beforeLoad: async () => {
    await requireRoleFn(["stock_clerk", "branch_manager"]);
  },
  component: InventoryDashboard,
});

function InventoryDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Inventory Management
          </h1>
          <p className="text-gray-600">
            Manage stock levels and track inventory movements
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <Package className="h-8 w-8 text-green-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Total Products</h3>
            <p className="text-2xl font-bold text-green-600">0</p>
          </Card>

          <Card className="p-6">
            <TrendingDown className="h-8 w-8 text-yellow-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Low Stock Items</h3>
            <p className="text-2xl font-bold text-yellow-600">0</p>
          </Card>

          <Card className="p-6">
            <AlertTriangle className="h-8 w-8 text-red-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Out of Stock</h3>
            <p className="text-2xl font-bold text-red-600">0</p>
          </Card>

          <Card className="p-6">
            <ArrowRightLeft className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Transfers Today</h3>
            <p className="text-2xl font-bold text-purple-600">0</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                Receive Stock
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer Stock
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Check Low Stock
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Tips</h2>
            <div className="space-y-3 text-sm">
              <p className="text-gray-700">
                ✓ Check low stock items daily
              </p>
              <p className="text-gray-700">
                ✓ Update quantities after receiving stock
              </p>
              <p className="text-gray-700">
                ✓ Use transfers to balance between branches
              </p>
              <p className="text-gray-700">
                ✓ Maintain accurate records
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
