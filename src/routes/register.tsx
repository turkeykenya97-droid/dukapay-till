import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { registerShop } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your DukaPOS account" },
      { name: "description", content: "Start your 30-day free trial of DukaPOS." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const register = useServerFn(registerShop);
  const [form, setForm] = useState({
    owner_name: "",
    shop_name: "",
    phone: "",
    password: "",
    confirm: "",
    pin: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      register({
        data: {
          owner_name: form.owner_name,
          shop_name: form.shop_name,
          phone: form.phone,
          password: form.password,
          pin: form.pin,
        },
      }),
    onSuccess: () => {
      console.log("[register] Success");
      toast.success("Account created! Let's set up your till.");
      navigate({ to: "/onboarding" });
    },
    onError: (e: Error) => {
      console.error("[register error]", e);
      let message = e.message || "Failed to create account. Please try again.";
      // Parse validation errors
      try {
        if (message.includes("Phone must be 10 digits")) {
          message = "Phone must be 10 digits starting with 0 (e.g., 0712345678)";
        } else if (message.includes("already exists")) {
          message = "This phone number is already registered. Please log in instead.";
        }
      } catch {}
      toast.error(message);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (!/^0\d{9}$/.test(form.phone)) {
      toast.error("Phone must be 10 digits starting with 0");
      return;
    }
    if (!/^\d{4}$/.test(form.pin)) {
      toast.error("PIN must be exactly 4 digits");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    mutation.mutate();
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Create account</h1>
          <p className="text-sm text-muted-foreground">30-day free trial, no card needed</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
          {mutation.isError && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <p className="font-medium">{(mutation.error as Error).message}</p>
              {/already exists/i.test((mutation.error as Error).message) && (
                <p className="mt-1 text-destructive/80">
                  This phone is already registered.{" "}
                  <Link to="/login" className="underline font-medium">
                    Sign in instead
                  </Link>
                  .
                </p>
              )}
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="owner_name">Your full name</Label>
              <Input id="owner_name" value={form.owner_name} onChange={set("owner_name")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop_name">Shop name</Label>
              <Input id="shop_name" value={form.shop_name} onChange={set("shop_name")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (M-Pesa number)</Label>
              <Input
                id="phone"
                inputMode="tel"
                placeholder="07XX XXX XXX"
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm((f) => ({ ...f, phone: val }));
                }}
                maxLength={10}
                required
              />
              <p className="text-xs text-muted-foreground">Enter 10-digit phone starting with 0</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password (min 6 chars)</Label>
              <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">4-digit Sales PIN</Label>
              <Input
                id="pin"
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={form.pin}
                onChange={set("pin")}
                required
              />
              <p className="text-xs text-muted-foreground">
                You'll enter this once a day to record sales.
              </p>
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create account"}
            </Button>
          </form>

          <p className="mt-4 text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
