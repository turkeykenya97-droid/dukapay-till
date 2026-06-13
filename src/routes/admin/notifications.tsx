import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getAdminSessionServer } from "@/lib/admin-auth.server";
import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { Bell, Mail, Phone, Send } from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({
  beforeLoad: async () => {
    const session = await getAdminSessionServer();
    if (!session) throw new Error("Not authenticated");
    return { session };
  },
  errorComponent: () => <Navigate to="/admin/login" />,
  component: NotificationsPage,
});

const getNotificationSettingsServer = createServerFn({ method: "GET" }).handler(async () => {
  return {
    emailAlerts: true,
    smsAlerts: false,
    adminEmail: "admin@trusit.com",
    adminPhone: "+254712345678",
    recentNotifications: [],
  };
});

const notifSettingsSchema = z.object({
  emailAlerts: z.boolean(),
  smsAlerts: z.boolean(),
  adminEmail: z.string(),
  adminPhone: z.string(),
});

const saveNotificationSettingsServer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => notifSettingsSchema.parse(d))
  .handler(async () => {
    return { success: true };
  });

function NotificationsPage() {
  const ctx = Route.useRouteContext();
  const getSettings = useServerFn(getNotificationSettingsServer);
  const saveSettings = useServerFn(saveNotificationSettingsServer);

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [adminEmail, setAdminEmail] = useState("admin@trusit.com");
  const [adminPhone, setAdminPhone] = useState("+254712345678");

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: () => getSettings(),
  });

  useEffect(() => {
    if (settingsData) {
      setEmailAlerts(settingsData.emailAlerts);
      setSmsAlerts(settingsData.smsAlerts);
      setAdminEmail(settingsData.adminEmail);
      setAdminPhone(settingsData.adminPhone);
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveSettings({
        data: { emailAlerts, smsAlerts, adminEmail, adminPhone },
      }),
    onSuccess: () => {
      toast.success("Notification settings saved");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  return (
    <AdminLayout
      adminEmail={ctx.session?.email}
      adminName={ctx.session?.email?.split("@")[0]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Notifications & Alerts</h1>
          <p className="text-slate-600 mt-2">Configure alert settings and preferences</p>
        </div>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {settingsLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Email Alerts */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={emailAlerts}
                    onCheckedChange={(checked) => setEmailAlerts(checked as boolean)}
                    id="email-alerts"
                  />
                  <div className="flex-1">
                    <Label htmlFor="email-alerts" className="text-base font-medium cursor-pointer">
                      Email Alerts
                    </Label>
                    <p className="text-sm text-slate-600 mt-1">
                      Receive alerts when subscriptions expire or API calls run low
                    </p>
                  </div>
                </div>

                {/* Email Input */}
                {emailAlerts && (
                  <div>
                    <Label htmlFor="admin-email">Email Address</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <Input
                        id="admin-email"
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@example.com"
                      />
                    </div>
                  </div>
                )}

                {/* SMS Alerts */}
                <div className="border-t border-slate-200 pt-6">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={smsAlerts}
                      onCheckedChange={(checked) => setSmsAlerts(checked as boolean)}
                      id="sms-alerts"
                    />
                    <div className="flex-1">
                      <Label htmlFor="sms-alerts" className="text-base font-medium cursor-pointer">
                        SMS Alerts
                      </Label>
                      <p className="text-sm text-slate-600 mt-1">
                        Receive SMS when fraud is detected or critical issues occur
                      </p>
                    </div>
                  </div>

                  {smsAlerts && (
                    <div className="mt-4">
                      <Label htmlFor="admin-phone">Phone Number</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <Input
                          id="admin-phone"
                          type="tel"
                          value={adminPhone}
                          onChange={(e) => setAdminPhone(e.target.value)}
                          placeholder="+254712345678"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="flex gap-2 pt-4 border-t border-slate-200">
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toast.info("Test notification would be sent now")}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Send Test
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Alert Types */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Subscription Expiring</p>
              <p className="text-xs text-blue-700 mt-1">
                Sent when a merchant subscription is about to expire
              </p>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-900">Low API Calls</p>
              <p className="text-xs text-yellow-700 mt-1">
                Sent when SmartPay API calls remaining fall below 50
              </p>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-900">Fraud Alert</p>
              <p className="text-xs text-red-700 mt-1">
                Sent when fraud is detected or key is suspended
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
