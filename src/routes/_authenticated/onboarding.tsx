import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { onboardTill } from "@/lib/auth.functions";
import { parseServerError, validators } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Smartphone, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const onboard = useServerFn(onboardTill);
  const [channelType, setChannelType] = useState<"till" | "paybill" | "bank">("till");
  const [shortCode, setShortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () =>
      onboard({
        data: {
          channel_type: channelType,
          short_code: shortCode,
          account_number: accountNumber || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Till verified! Welcome to Trusit.");
      navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => {
      const message = parseServerError(e);
      toast.error(message);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const shortCodeError = validators.tillNumber.validate(shortCode);
    if (shortCodeError) newErrors.shortCode = shortCodeError.message;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    mutation.mutate();
  };

  const handleShortCodeBlur = () => {
    const error = validators.tillNumber.validate(shortCode);
    if (error) {
      setErrors((e) => ({ ...e, shortCode: error.message }));
    } else {
      setErrors((e) => ({ ...e, shortCode: "" }));
    }
  };

  const hasShortCodeError = !!errors.shortCode;

  const getLabel = () => {
    switch (channelType) {
      case "paybill":
        return "Paybill number";
      case "bank":
        return "Bank short code";
      default:
        return "Till number";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Smartphone className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Set up your till</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Where should customer payments be sent?
          </p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Payment type</Label>
              <Select
                value={channelType}
                onValueChange={(v) => setChannelType(v as typeof channelType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="till">M-Pesa Till (Buy Goods)</SelectItem>
                  <SelectItem value="paybill">M-Pesa Paybill</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="short" className={hasShortCodeError ? "text-red-600" : ""}>
                {getLabel()}
                {hasShortCodeError && <span className="text-red-600">*</span>}
              </Label>
              <Input
                id="short"
                inputMode="numeric"
                value={shortCode}
                onChange={(e) => {
                  setShortCode(e.target.value.replace(/\D/g, ""));
                  if (errors.shortCode) setErrors((e) => ({ ...e, shortCode: "" }));
                }}
                onBlur={handleShortCodeBlur}
                placeholder="123456"
                className={hasShortCodeError ? "border-red-600 focus-visible:ring-red-600" : ""}
                required
              />
              {hasShortCodeError && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.shortCode}
                </div>
              )}
            </div>

            {(channelType === "paybill" || channelType === "bank") && (
              <div className="space-y-2">
                <Label htmlFor="acct">Account number (optional)</Label>
                <Input
                  id="acct"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Leave blank if not needed"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Verifying…" : "Verify & Continue"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
