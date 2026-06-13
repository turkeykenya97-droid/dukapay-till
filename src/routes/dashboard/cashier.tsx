import { createFileRoute } from "@tanstack/react-router";
import { requireRoleFn } from "@/lib/role-guard.server";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShoppingCart, Receipt, Barcode, Settings } from "lucide-react";

export const Route = createFileRoute("/dashboard/cashier")({
  beforeLoad: async () => {
    await requireRoleFn(["cashier"]);
  },
  component: CashierDashboard,
});

function CashierDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to POS
          </h1>
          <p className="text-gray-600">
            Start selling or manage your transactions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link to="/sell" className="block">
              <ShoppingCart className="h-8 w-8 text-blue-600 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-1">Checkout</h3>
              <p className="text-sm text-gray-600">Process new sales</p>
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <Link to="/receipts" className="block">
              <Receipt className="h-8 w-8 text-green-600 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-1">Receipts</h3>
              <p className="text-sm text-gray-600">View past receipts</p>
            </Link>
          </Card>

          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <a href="#" className="block" title="Coming Soon">
              <Barcode className="h-8 w-8 text-purple-600 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-1">Scanner</h3>
              <p className="text-sm text-gray-600">Scan barcodes</p>
            </a>
          </Card>

          <Card className="p-6 hover:shadow-lg transition cursor-pointer">
            <a href="#" className="block" title="Coming Soon">
              <Settings className="h-8 w-8 text-gray-600 mb-4" />
              <h3 className="font-semibold text-gray-900 mb-1">Settings</h3>
              <p className="text-sm text-gray-600">Manage preferences</p>
            </a>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Start</h2>
            <div className="space-y-3">
              <p className="text-gray-700">
                👉 To start selling, click the <strong>Checkout</strong> button above.
              </p>
              <p className="text-gray-700">
                🔍 Use the <strong>Scanner</strong> to quickly add products.
              </p>
              <p className="text-gray-700">
                📝 All your transactions are saved in <strong>Receipts</strong>.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Today's Stats</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-600">0</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">KSh 0.00</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-8">
          <Button asChild size="lg">
            <Link to="/sell">Start Selling Now</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
