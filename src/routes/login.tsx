import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { loginShop } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Trusit" },
      { name: "description", content: "Log in to your Trusit account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const login = useServerFn(loginShop);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      console.log("[login] Attempting to login with phone:", phone);
      return login({ data: { phone, password } });
    },
    onSuccess: (data) => {
      console.log("[login] Success:", data);
      toast.success("Welcome back!");
      if (data.is_admin) {
        navigate({ to: "/admin/dashboard" });
      } else {
        navigate({ to: data.needs_onboarding ? "/onboarding" : "/dashboard" });
      }
    },
    onError: (e: Error) => {
      console.error("[login error]", e);
      let message = e.message || "Login failed. Please try again.";
      // Parse validation errors
      try {
        if (message.includes("Phone must be 10 digits")) {
          message = "Phone must be 10 digits starting with 0 (e.g., 0712345678)";
        } else if (message.includes("Invalid phone")) {
          message = "Invalid phone number or password";
        }
      } catch {}
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[login] Form submitted");
    if (!phone || !password) {
      toast.error("Please enter phone and password");
      return;
    }
    if (!/^0\d{9}$/.test(phone)) {
      toast.error("Phone must be 10 digits starting with 0 (e.g., 0712345678)");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Trusit</h1>
          <p className="text-sm text-muted-foreground">Sign in to your duka</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                inputMode="tel"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(val);
                }}
                maxLength={10}
                required
              />
              <p className="text-xs text-muted-foreground">Enter 10-digit phone starting with 0</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-center text-muted-foreground">
            New to Trusit?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
