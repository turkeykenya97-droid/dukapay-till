import { createFileRoute } from "@tanstack/react-router";
import { requireRoleFn } from "@/lib/role-guard.server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, CheckSquare, TrendingUp, Clock } from "lucide-react";

export const Route = createFileRoute("/dashboard/supervisor")({
  beforeLoad: async () => {
    await requireRoleFn(["supervisor"]);
  },
  component: SupervisorDashboard,
});

function SupervisorDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Supervisor Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor cashiers and approve transactions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <Eye className="h-8 w-8 text-orange-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Active Cashiers</h3>
            <p className="text-2xl font-bold text-orange-600">0</p>
          </Card>

          <Card className="p-6">
            <CheckSquare className="h-8 w-8 text-green-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Pending Approvals</h3>
            <p className="text-2xl font-bold text-green-600">0</p>
          </Card>

          <Card className="p-6">
            <TrendingUp className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Today's Sales</h3>
            <p className="text-2xl font-bold text-blue-600">KSh 0</p>
          </Card>

          <Card className="p-6">
            <Clock className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Voided Transactions</h3>
            <p className="text-2xl font-bold text-purple-600">0</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Approvals</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <CheckSquare className="h-4 w-4 mr-2" />
                Approve Discounts
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <CheckSquare className="h-4 w-4 mr-2" />
                Approve Refunds
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Eye className="h-4 w-4 mr-2" />
                Monitor Cashiers
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Supervisor Duties</h2>
            <div className="space-y-3 text-sm">
              <p className="text-gray-700">
                ✓ Monitor all cashier activities
              </p>
              <p className="text-gray-700">
                ✓ Approve discounts and refunds
              </p>
              <p className="text-gray-700">
                ✓ Review daily sales and discrepancies
              </p>
              <p className="text-gray-700">
                ✓ Handle customer escalations
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
