import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminLogoutServer } from "@/lib/admin-auth.server";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Users,
  TrendingUp,
  Zap,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  CreditCard,
  AlertCircle,
  Bell,
  FileText,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  adminEmail?: string;
  adminName?: string;
}

export function AdminLayout({ children, adminEmail, adminName }: AdminLayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logout = useServerFn(adminLogoutServer);

  const logoutMutation = useMutation({
    mutationFn: () => logout({}),
    onSuccess: () => {
      toast.success("Logged out successfully");
      // Redirect will be handled by router
      window.location.href = "/admin/login";
    },
    onError: (e) => {
      console.error("Logout error:", e);
      toast.error("Failed to logout");
    },
  });

  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: Home },
    { label: "Merchants", href: "/admin/merchants", icon: Users },
    { label: "Revenue", href: "/admin/revenue", icon: TrendingUp },
    { label: "Transactions", href: "/admin/transactions", icon: CreditCard },
    { label: "Support", href: "/admin/support", icon: AlertCircle },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "System Health", href: "/admin/system", icon: Zap },
    { label: "SmartPay", href: "/admin/smartpay", icon: ClipboardList },
    { label: "Notifications", href: "/admin/notifications", icon: Bell },
    { label: "Audit Logs", href: "/admin/logs", icon: FileText },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                D
              </div>
              <span className="font-bold text-slate-900">DukaPOS Admin</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-slate-100 rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    active
                      ? "bg-green-50 text-green-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-slate-200 space-y-3">
            {(adminEmail || adminName) && (
              <div className="text-sm">
                <p className="text-slate-600 text-xs">Logged in as</p>
                <p className="text-slate-900 font-medium truncate">{adminName || adminEmail}</p>
              </div>
            )}
            <Button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {logoutMutation.isPending ? "Logging out…" : "Logout"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-100 rounded-lg relative">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold flex items-center justify-center text-sm">
              {adminName ? adminName.charAt(0).toUpperCase() : adminEmail?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
