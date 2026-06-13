import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { initiatePublicPayment, getPublicShopInfo } from "@/lib/public-payment.functions";
import { parseServerError, validators } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { fmtKsh } from "@/lib/format";

function ErrorComponent({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Error</h1>
        <p className="text-slate-600 mb-6">
          {error instanceof Error ? error.message : "Failed to load payment page"}
        </p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/pay/$shopId")({
  component: PublicPaymentPage,
  errorComponent: ({ error }) => <ErrorComponent error={error} />,
});

interface Shop {
  id: string;
  shop_name: string;
  owner_name: string;
  till_number: string;
  subscription_expiry: string | null;
  trial_start: string | null;
  plan: string;
}

function PublicPaymentPage() {
  const { shopId } = Route.useParams();
  const initiate = useServerFn(initiatePublicPayment);
  const loadShopInfo = useServerFn(getPublicShopInfo);

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [paymentState, setPaymentState] = useState<"form" | "success" | "error">("form");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Load shop details
  useEffect(() => {
    async function loadShop() {
      try {
        const shopData = await loadShopInfo({ data: { shop_id: shopId } });
        setShop(shopData);
      } catch (err) {
        const message = parseServerError(err instanceof Error ? err : new Error(String(err)));
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadShop();
  }, [shopId, loadShopInfo]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const amountError = validators.amount.validate(amount, 300000);
    if (amountError) newErrors.amount = amountError.message;

    const phoneError = validators.phone.validate(phone);
    if (phoneError) newErrors.phone = phoneError.message;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAmountBlur = () => {
    const error = validators.amount.validate(amount, 300000);
    if (error) {
      setErrors((e) => ({ ...e, amount: error.message }));
    } else {
      setErrors((e) => ({ ...e, amount: "" }));
    }
  };

  const handlePhoneBlur = () => {
    const error = validators.phone.validate(phone);
    if (error) {
      setErrors((e) => ({ ...e, phone: error.message }));
    } else {
      setErrors((e) => ({ ...e, phone: "" }));
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || !validateForm()) return;

    setSubmitting(true);
    setPaymentError(null);

    try {
      await initiate({
        data: {
          shop_id: shop.id,
          amount: parseInt(amount, 10),
          phone,
        },
      });
      setPaymentState("success");
    } catch (err) {
      const message = parseServerError(err instanceof Error ? err : new Error(String(err)));
      setPaymentError(message);
      setPaymentState("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Shop Not Found</h1>
          <p className="text-slate-600 mb-6">{error || "This shop is no longer available"}</p>
          <a href="/" className="inline-block text-green-600 hover:text-green-700 font-medium">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  if (paymentState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Request Sent!</h1>
          <p className="text-slate-600 mb-6">
            Check your phone to confirm the payment of <strong>{fmtKsh(parseInt(amount, 10))}</strong> on M-Pesa.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <strong>Next Steps:</strong>
            <ul className="mt-2 space-y-1 text-left">
              <li>✓ You should receive an M-Pesa prompt on your phone</li>
              <li>✓ Enter your M-Pesa PIN to confirm</li>
              <li>✓ Payment will be confirmed instantly</li>
            </ul>
          </div>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  if (paymentState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Failed</h1>
          <p className="text-slate-600 mb-6">{paymentError}</p>
          <Button onClick={() => setPaymentState("form")} className="bg-green-600 hover:bg-green-700">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 rounded-full bg-green-600 text-white flex items-center justify-center mx-auto mb-4">
            T
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Pay {shop.shop_name}</h1>
          <p className="text-slate-600 text-sm">Till: {shop.till_number}</p>
        </div>

        {/* Payment Form */}
        <form onSubmit={handlePayment} className="bg-white rounded-lg shadow-lg p-8 space-y-6 mb-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className={`text-slate-700 font-medium ${errors.amount ? "text-red-600" : ""}`}>
              Amount (KES)
              {errors.amount && <span className="text-red-600">*</span>}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">KES</span>
              <Input
                id="amount"
                type="number"
                inputMode="numeric"
                min="1"
                max="300000"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((e) => ({ ...e, amount: "" }));
                }}
                onBlur={handleAmountBlur}
                className={`pl-12 h-12 text-lg ${errors.amount ? "border-red-600 focus-visible:ring-red-600" : ""}`}
                required
              />
            </div>
            {errors.amount ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.amount}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Minimum KES 1, Maximum KES 300,000</p>
            )}
          </div>

          {/* Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="phone" className={`text-slate-700 font-medium ${errors.phone ? "text-red-600" : ""}`}>
              Phone Number
              {errors.phone && <span className="text-red-600">*</span>}
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="07XX XXX XXX"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(val);
                if (errors.phone) setErrors((e) => ({ ...e, phone: "" }));
              }}
              onBlur={handlePhoneBlur}
              className={`h-12 text-lg ${errors.phone ? "border-red-600 focus-visible:ring-red-600" : ""}`}
              required
            />
            {errors.phone ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {errors.phone}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Kenyan number format required</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || !amount || !phone}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-medium text-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending payment...
              </>
            ) : (
              "Pay Now"
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-slate-600">
          <p>Powered by <strong>Trusit</strong></p>
        </div>
      </div>
    </div>
  );
}
