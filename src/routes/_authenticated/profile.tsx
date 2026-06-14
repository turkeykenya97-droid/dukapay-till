import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  queryOptions,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useFeatureAccess } from "@/hooks/use-access";
import { ProFeatureOverlay } from "@/components/pro-feature-overlay";
import { getProfile, changePassword, getPlans, updateTillSettings } from "@/lib/auth.functions";
import { initiateRenewal } from "@/lib/subscription.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlanBadge } from "@/components/ui/plan-badge";
import { fmtDate, fmtKsh } from "@/lib/format";
import { User, Lock, CreditCard, Zap, Package, Calendar, QrCode, Download, Printer } from "lucide-react";
import QRCode from "qrcode";

const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: () => getProfile(),
  staleTime: 30 * 1000,
});

const plansQuery = queryOptions({
  queryKey: ["plans"],
  queryFn: () => getPlans(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Trusit" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(profileQuery),
      context.queryClient.ensureQueryData(plansQuery),
    ]),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: plansData } = useSuspenseQuery(plansQuery);
  const { allowed: canUseQR } = useFeatureAccess("qr_to_pay");
  const qc = useQueryClient();

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [editTillOpen, setEditTillOpen] = useState(false);
  const [tillType, setTillType] = useState(profile?.till_type || "till");
  const [tillNumber, setTillNumber] = useState(profile?.till_number || "");
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro" | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Generate QR code on mount
  useEffect(() => {
    async function generateQR() {
      try {
        const appUrl = process.env.APP_URL || "https://dukapay-till.jiannamercy.workers.dev";
        const paymentUrl = `${appUrl}/pay/${profile?.id}`;
        const qr = await QRCode.toDataURL(paymentUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: "#16a34a",
            light: "#ffffff",
          },
        });
        setQrDataUrl(qr);
      } catch (err) {
        console.error("QR code generation failed:", err);
      }
    }
    generateQR();
  }, [profile?.id]);

  const changePwd = useServerFn(changePassword);
  const renew = useServerFn(initiateRenewal);
  const updateTill = useServerFn(updateTillSettings);

  const passwordMutation = useMutation({
    mutationFn: () =>
      changePwd({
        data: { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword },
      }),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renewalMutation = useMutation({
    mutationFn: (plan: "basic" | "pro") =>
      renew({ data: { plan } }),
    onSuccess: () => {
      toast.success("M-Pesa prompt sent. Approve on your phone.");
      setSelectedPlan(null);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tillMutation = useMutation({
    mutationFn: () =>
      updateTill({
        data: { till_type: tillType as "paybill" | "till" | "bank", till_number: tillNumber },
      }),
    onSuccess: () => {
      toast.success("Till settings updated successfully");
      setEditTillOpen(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    passwordMutation.mutate();
  };

  const handleSaveTill = () => {
    if (!tillNumber.trim()) {
      toast.error("Please enter a till number");
      return;
    }
    if (!/^\d+$/.test(tillNumber.trim())) {
      toast.error("Till number must contain only digits");
      return;
    }
    if (tillNumber.trim().length < 4) {
      toast.error("Till number must be at least 4 digits");
      return;
    }
    tillMutation.mutate();
  };

  const isTrialActive = profile.subscription_status === "trial";
  const currentPlanObj = plansData.plans.find((p) => p.id === profile.plan);

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-6 pb-4">
      <h1 className="text-2xl font-bold mb-6">Account Profile</h1>

      {/* Account Status */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Account Details</h2>
            </div>
          </div>
          <PlanBadge plan={isTrialActive ? "trial" : (profile.plan as "basic" | "pro")} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Shop Name</p>
            <p className="text-sm font-medium">{profile.shop_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Owner Name</p>
            <p className="text-sm font-medium">{profile.owner_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Phone</p>
            <p className="text-sm font-medium">{profile.phone}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Member Since</p>
            <p className="text-sm font-medium">{fmtDate(profile.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Subscription</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <p className="text-sm font-medium capitalize">
              {profile.subscription_status === "trial" ? "Trial Period" : profile.subscription_status}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {isTrialActive ? "Trial Ends" : "Renews"}
            </p>
            <p className="text-sm font-medium">{fmtDate(profile.subscription_expiry)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Days Remaining</p>
            <p className="text-sm font-medium">{profile.days_remaining} days</p>
          </div>
        </div>

        {isTrialActive && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-900">
              You're on a free trial with full access to all features. You can start a paid subscription anytime below, or wait until your trial ends.
            </p>
          </div>
        )}

        <Button 
          onClick={() => renewalMutation.mutate(profile.plan as "basic" | "pro")} 
          disabled={renewalMutation.isPending} 
          variant="outline"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          {renewalMutation.isPending 
            ? "Sending…" 
            : isTrialActive 
            ? "Start Subscription" 
            : "Renew Subscription"}
        </Button>
      </div>

      {/* Till Information */}
      {profile.till_number && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Payment Till</h2>
            </div>
            <Button onClick={() => {
              setTillType(profile.till_type || "till");
              setTillNumber(profile.till_number || "");
              setEditTillOpen(true);
            }} variant="outline" size="sm">
              Edit
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Till Type</p>
              <p className="text-sm font-medium">
                {profile.till_type === "paybill" ? "PayBill" : (profile.till_type ?? "").charAt(0).toUpperCase() + (profile.till_type ?? "").slice(1)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Till Number</p>
              <p className="text-sm font-medium">{profile.till_number}</p>
            </div>
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {profile.plan === "basic" && profile.subscription_status !== "trial" && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Usage</h2>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <p className="text-sm font-medium">Transactions this month</p>
              <p className="text-sm font-medium">
                {profile.transaction_count}/150
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{
                  width: `${(profile.transaction_count / 150) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {150 - profile.transaction_count} transactions remaining
            </p>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Available Plans</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plansData.plans.map((plan) => (
            <div
              key={plan.id}
              className={`border rounded-lg p-4 ${
                profile.plan === plan.id && profile.subscription_status !== "trial"
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.description}</p>
                </div>
                {profile.plan === plan.id && profile.subscription_status !== "trial" && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                    Current
                  </span>
                )}
              </div>

              <p className="text-2xl font-bold mb-3">
                KES {plan.price}
                <span className="text-xs text-muted-foreground font-normal">/month</span>
              </p>

              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Includes:</p>
                <ul className="space-y-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="text-xs text-foreground">
                      ✓ {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {plan.limitations.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Not included:</p>
                  <ul className="space-y-1">
                    {plan.limitations.map((limitation, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        ✗ {limitation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {profile.plan !== plan.id && (
                <Button
                  className="w-full"
                  variant={plan.id === "pro" ? "default" : "outline"}
                  onClick={() => {
                    setSelectedPlan(plan.id as "basic" | "pro");
                    renewalMutation.mutate(plan.id as "basic" | "pro");
                  }}
                  disabled={renewalMutation.isPending}
                >
                  {renewalMutation.isPending && selectedPlan === plan.id 
                    ? "Processing…" 
                    : isTrialActive
                    ? `Start ${plan.name} Plan Now`
                    : `Upgrade to ${plan.name}`}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment QR Code */}
      {(() => {
        if (canUseQR) {
          return (
            <div className="bg-card border border-border rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Payment QR Code</h2>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                Share this QR code with your customers. They can scan it to pay directly without using your till.
              </p>

              {qrDataUrl && (
                <div className="flex flex-col items-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                  <img src={qrDataUrl} alt="Payment QR Code" className="h-48 w-48" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-900 mb-1">{profile.shop_name}</p>
                    <p className="text-xs text-slate-600">Till: {profile.till_number}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!qrDataUrl) return;
                    const link = document.createElement("a");
                    link.href = qrDataUrl;
                    link.download = `trusit-qr-${profile.shop_name.replace(/\s+/g, "-")}.png`;
                    link.click();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
                <Button
                  onClick={() => setShowPrintPreview(true)}
                  variant="outline"
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Card
                </Button>
              </div>
            </div>
          );
        } else {
          return (
            <ProFeatureOverlay
              feature="qr_to_pay"
              title="Payment QR Code"
              description="Let customers scan a QR code to pay you directly, without needing your till. Perfect for contactless payments."
            >
              <div className="bg-card border border-border rounded-2xl p-6 mb-6 h-96" />
            </ProFeatureOverlay>
          );
        }
      })()}

      {/* Security */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Security</h2>
        </div>

        <Button onClick={() => setChangePasswordOpen(true)} variant="outline" className="w-full">
          Change Password
        </Button>
      </div>

      {/* Print Payment Card Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Print Payment Card</DialogTitle>
          </DialogHeader>
          <div ref={printRef} className="bg-white p-8">
            <div
              className="w-full max-w-xs mx-auto bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 text-center border-4 border-green-600"
              style={{ aspectRatio: "1/1.4" }}
            >
              {/* Trusit Branding */}
              <div className="mb-6">
                <div className="h-10 w-10 rounded-full bg-green-600 text-white flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                  T
                </div>
                <p className="text-xs font-bold text-green-700">TRUSIT</p>
              </div>

              {/* QR Code */}
              {qrDataUrl && (
                <div className="mb-6 flex justify-center">
                  <img src={qrDataUrl} alt="Payment QR" style={{ width: "240px", height: "240px" }} />
                </div>
              )}

              {/* Shop Info */}
              <p className="text-2xl font-bold text-slate-900 mb-2">{profile.shop_name}</p>
              <p className="text-lg font-semibold text-slate-700 mb-4">
                Till: {profile.till_number}
              </p>

              {/* Instruction */}
              <p className="text-sm font-bold text-green-700 mb-6">Scan to pay via M-Pesa</p>

              {/* Powered by Trusit */}
              <p className="text-xs text-slate-600 mt-auto">Powered by Trusit</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                const printWindow = window.open("", "", "width=600,height=800");
                if (printWindow && printRef.current) {
                  printWindow.document.write(printRef.current.innerHTML);
                  printWindow.document.close();
                  printWindow.print();
                }
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Card
            </Button>
            <Button onClick={() => setShowPrintPreview(false)} variant="outline" className="flex-1">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Current Password</Label>
              <Input
                id="current"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New Password</Label>
              <Input
                id="new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={passwordMutation.isPending}
              className="w-full"
            >
              {passwordMutation.isPending ? "Updating…" : "Update Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Till Settings Dialog */}
      <Dialog open={editTillOpen} onOpenChange={setEditTillOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Payment Till</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="till-type">Till Type</Label>
              <select
                id="till-type"
                value={tillType}
                onChange={(e) => setTillType(e.target.value as "till" | "paybill" | "bank")}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="till">Till</option>
                <option value="paybill">PayBill</option>
                <option value="bank">Bank</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="till-number">Till Number</Label>
              <Input
                id="till-number"
                type="text"
                inputMode="numeric"
                value={tillNumber}
                onChange={(e) => setTillNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter till number (4-10 digits)"
              />
              <p className="text-xs text-muted-foreground">Must be 4-10 digits</p>
            </div>
            <Button
              onClick={handleSaveTill}
              disabled={tillMutation.isPending}
              className="w-full"
            >
              {tillMutation.isPending ? "Saving…" : "Save Till Settings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

