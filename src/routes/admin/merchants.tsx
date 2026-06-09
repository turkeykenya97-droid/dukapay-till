import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminSessionServer } from "@/lib/admin-auth.server";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { format } from "date-fns";
import { Search, Download } from "lucide-react";

export const Route = createFileRoute("/admin/merchants")({
  beforeLoad: async () => {
    const session = await getAdminSessionServer();
    if (!session) throw new Error("Not authenticated");
    return { session };
  },
  component: MerchantsPage,
});

// Server function to fetch merchants
const getMerchantsServer = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("shops")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
});

function MerchantsPage() {
  const ctx = Route.useRouteContext();
  const getMerchants = useServerFn(getMerchantsServer);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "trial" | "active" | "expired">("all");

  const { data: merchants, isLoading } = useQuery({
    queryKey: ["admin-merchants"],
    queryFn: () => getMerchants(),
    refetchInterval: 30000,
  });

  // Filter merchants
  const filteredMerchants = (merchants || []).filter((m) => {
    const matchesSearch =
      m.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone?.includes(searchTerm);

    const matchesStatus = statusFilter === "all" || m.subscription_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Count by status
  const counts = {
    all: merchants?.length || 0,
    trial: merchants?.filter((m) => m.subscription_status === "trial").length || 0,
    active: merchants?.filter((m) => m.subscription_status === "active").length || 0,
    expired: merchants?.filter((m) => m.subscription_status === "expired").length || 0,
  };

  return (
    <AdminLayout
      adminEmail={ctx.session?.email}
      adminName={ctx.session?.email?.split("@")[0]}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Merchants</h1>
            <p className="text-slate-600 mt-2">Manage all merchant accounts</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", count: counts.all, filter: "all" },
            { label: "Trial", count: counts.trial, filter: "trial" },
            { label: "Active", count: counts.active, filter: "active" },
            { label: "Expired", count: counts.expired, filter: "expired" },
          ].map((stat) => (
            <button
              key={stat.filter}
              onClick={() => setStatusFilter(stat.filter as typeof statusFilter)}
              className={`p-4 rounded-lg border-2 transition-colors ${
                statusFilter === stat.filter
                  ? "border-green-600 bg-green-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="text-sm text-slate-600">{stat.label}</div>
              <div className="text-2xl font-bold text-slate-900">{stat.count}</div>
            </button>
          ))}
        </div>

        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by shop name, owner name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Merchants Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Merchants ({filteredMerchants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shop Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Till Number</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMerchants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                          No merchants found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMerchants.map((merchant) => (
                        <TableRow key={merchant.id}>
                          <TableCell className="font-medium">{merchant.shop_name}</TableCell>
                          <TableCell>{merchant.owner_name}</TableCell>
                          <TableCell className="text-sm">{merchant.phone}</TableCell>
                          <TableCell>
                            <Badge
                              variant={merchant.plan === "pro" ? "default" : "secondary"}
                            >
                              {merchant.plan?.toUpperCase() || "BASIC"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                merchant.subscription_status === "active"
                                  ? "default"
                                  : merchant.subscription_status === "trial"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {merchant.subscription_status?.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{merchant.till_number || "—"}</TableCell>
                          <TableCell className="text-sm">
                            {merchant.created_at
                              ? format(new Date(merchant.created_at), "MMM d, yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
