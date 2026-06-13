import { createFileRoute } from "@tanstack/react-router";
import { requireRoleFn } from "@/lib/role-guard.server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Calculator, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/dashboard/accountant")({
  beforeLoad: async () => {
    await requireRoleFn(["accountant"]);
  },
  component: AccountantDashboard,
});

function AccountantDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Accountant Dashboard
          </h1>
          <p className="text-gray-600">
            Financial reports and expense tracking
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <TrendingUp className="h-8 w-8 text-green-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Total Revenue</h3>
            <p className="text-2xl font-bold text-green-600">KSh 0.00</p>
          </Card>

          <Card className="p-6">
            <DollarSign className="h-8 w-8 text-red-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Total Expenses</h3>
            <p className="text-2xl font-bold text-red-600">KSh 0.00</p>
          </Card>

          <Card className="p-6">
            <Calculator className="h-8 w-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Net Profit</h3>
            <p className="text-2xl font-bold text-blue-600">KSh 0.00</p>
          </Card>

          <Card className="p-6">
            <FileText className="h-8 w-8 text-purple-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">Tax Liability</h3>
            <p className="text-2xl font-bold text-purple-600">KSh 0.00</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reports</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Sales Reports
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="h-4 w-4 mr-2" />
                Expense Reports
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calculator className="h-4 w-4 mr-2" />
                Tax Reports
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Financial Overview</h2>
            <div className="space-y-3 text-sm">
              <p className="text-gray-700">
                ✓ Monitor revenue streams
              </p>
              <p className="text-gray-700">
                ✓ Track expenses
              </p>
              <p className="text-gray-700">
                ✓ Generate compliance reports
              </p>
              <p className="text-gray-700">
                ✓ Calculate tax obligations
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
