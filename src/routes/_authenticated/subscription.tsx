import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getProfile, getPlans } from "@/lib/auth.functions";
import { initiateRenewal } from "@/lib/subscription.functions";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/ui/plan-badge";
import { fmtDate } from "@/lib/format";
import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [{ title: "Subscription Plans — DukaPOS" }] }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(profileQuery),
      context.queryClient.ensureQueryData(plansQuery),
    ]),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { data: profile } = useSuspenseQuery(profileQuery);
  const { data: plansData } = useSuspenseQuery(plansQuery);
  const qc = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "pro" | null>(null);
  const [showBasicWarning, setShowBasicWarning] = useState(false);

  const renew = useServerFn(initiateRenewal);

  const renewalMutation = useMutation({
    mutationFn: (plan: "basic" | "pro") => renew({ data: { plan } }),
    onSuccess: () => {
      toast.success("M-Pesa prompt sent. Approve on your phone.");
      setSelectedPlan(null);
      setShowBasicWarning(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handlePlanSelect = (plan: "basic" | "pro") => {
    // Show warning if downgrading from trial (Pro features) to Basic
    if (isTrialActive && plan === "basic") {
      setSelectedPlan(plan);
      setShowBasicWarning(true);
    } else {
      setSelectedPlan(plan);
      renewalMutation.mutate(plan);
    }
  };

  const isTrialActive = profile.subscription_status === "trial";
  const isBasic = profile.plan === "basic";
  const isPro = profile.plan === "pro";

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6 pb-4">
      <h1 className="text-3xl font-bold mb-2">Subscription Plans</h1>
      <p className="text-muted-foreground mb-8">
        {isTrialActive
          ? "You're currently on a free trial with full access to all features. Upgrade to a paid plan anytime below - no commitment needed."
          : `You're currently on the ${isBasic ? "Basic" : "Pro"} plan. Manage your subscription below.`}
      </p>

      {/* Current Status */}
      <div className={`rounded-lg p-4 mb-8 border-2 ${
        isTrialActive 
          ? "bg-blue-50 border-blue-200" 
          : "bg-green-50 border-green-200"
      }`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
            isTrialActive ? "text-blue-600" : "text-green-600"
          }`} />
          <div>
            <p className={`font-semibold ${isTrialActive ? "text-blue-900" : "text-green-900"}`}>
              {isTrialActive ? "Free Trial Active" : "Subscription Active"}
            </p>
            <p className={`text-sm ${isTrialActive ? "text-blue-800" : "text-green-800"}`}>
              {isTrialActive
                ? `You have ${profile.days_remaining} days remaining. You can upgrade to a paid plan anytime below - your subscription will start immediately.`
                : `${isBasic ? "Basic Plan" : "Pro Plan"} - ${profile.days_remaining} days remaining - renews ${fmtDate(profile.subscription_expiry)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Plans Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {plansData.plans.map((plan) => {
          const isCurrent = !isTrialActive && profile.plan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative border-2 rounded-xl p-6 transition-all ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <div className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    Current Plan
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-1">{plan.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                <div>
                  <span className="text-4xl font-bold">KES {plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6 space-y-3">
                <p className="text-sm font-semibold text-muted-foreground uppercase">Includes:</p>
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Limitations */}
              {plan.limitations.length > 0 && (
                <div className="mb-6 space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground uppercase">Not Included:</p>
                  <ul className="space-y-2">
                    {plan.limitations.map((limitation, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA Button */}
              <div className="pt-6 border-t border-border">
                {isCurrent ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Your current plan
                  </div>
                ) : (
                  <Button
                    onClick={() => handlePlanSelect(plan.id as "basic" | "pro")}
                    disabled={renewalMutation.isPending}
                    variant={plan.id === "pro" ? "default" : "outline"}
                    className="w-full"
                  >
                    {renewalMutation.isPending && selectedPlan === plan.id
                      ? "Processing…"
                      : isTrialActive
                      ? `Start ${plan.name} Plan Now`
                      : `Switch to ${plan.name}`}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr className="border-b border-border">
              <th className="text-left px-6 py-4 font-semibold">Feature</th>
              <th className="text-center px-6 py-4 font-semibold">Basic</th>
              <th className="text-center px-6 py-4 font-semibold">Pro</th>
            </tr>
          </thead>
          <tbody>
            {[
              { feature: "M-Pesa STK Push", basic: true, pro: true },
              { feature: "Transactions per month", basic: "150", pro: "Unlimited" },
              { feature: "Calculator", basic: true, pro: true },
              { feature: "Sales History", basic: true, pro: true },
              { feature: "Analytics & Reports", basic: false, pro: true },
              { feature: "Stock Management", basic: false, pro: true },
              { feature: "Digital Receipts", basic: false, pro: true },
              { feature: "Printed Receipts", basic: false, pro: true },
              { feature: "Priority Support", basic: false, pro: true },
              { feature: "Price", basic: "KES 299/month", pro: "KES 499/month" },
            ].map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? "" : "bg-muted/30"}>
                <td className="px-6 py-4 text-sm font-medium">{row.feature}</td>
                <td className="px-6 py-4 text-center text-sm">
                  {typeof row.basic === "boolean" ? (
                    row.basic ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400 mx-auto" />
                    )
                  ) : (
                    <span className="font-medium">{row.basic}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center text-sm">
                  {typeof row.pro === "boolean" ? (
                    row.pro ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-400 mx-auto" />
                    )
                  ) : (
                    <span className="font-medium">{row.pro}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Can I change plans anytime?</h3>
            <p className="text-sm text-muted-foreground">
              Yes, you can upgrade or downgrade your plan anytime. Changes take effect on your next renewal date.
            </p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2">What happens when my trial ends?</h3>
            <p className="text-sm text-muted-foreground">
              If you don't subscribe before your 14-day trial ends, your account will be locked and you won't be able to process sales. Subscribe anytime during the trial to activate your chosen plan immediately.
            </p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Can I cancel my subscription?</h3>
            <p className="text-sm text-muted-foreground">
              Yes, you can cancel anytime through your account settings. Your access will continue until the end of your billing period.
            </p>
          </div>
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Is there a setup fee?</h3>
            <p className="text-sm text-muted-foreground">
              No, there are no setup fees or hidden charges. You only pay the monthly subscription price.
            </p>
          </div>
        </div>
      </div>

      {/* Basic Plan Downgrade Warning Dialog */}
      <AlertDialog open={showBasicWarning} onOpenChange={setShowBasicWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade to Basic Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Subscribing to Basic will activate immediately and some Pro trial features will be restricted:
              <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
                <li>Analytics & Reports</li>
                <li>Stock Management</li>
                <li>Digital & Printed Receipts</li>
                <li>Priority Support</li>
              </ul>
              <p className="mt-3 font-medium">Subscribe to Pro to keep all features.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel onClick={() => setShowBasicWarning(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedPlan === "basic") {
                  renewalMutation.mutate("basic");
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Continue to Basic
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

