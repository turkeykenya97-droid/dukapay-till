import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { loginShop } from "@/lib/auth.functions";
import { parseServerError, validators } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, AlertCircle } from "lucide-react";

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
  const clickCount = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout>();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => {
      return login({ data: { phone, password } });
    },
    onSuccess: (data) => {
      toast.success("Welcome back!");
      if (data.is_admin) {
        navigate({ to: "/admin/dashboard" });
      } else {
        navigate({ to: data.needs_onboarding ? "/onboarding" : "/dashboard" });
      }
    },
    onError: (e: Error) => {
      const message = parseServerError(e);
      toast.error(message);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const phoneError = validators.phone.validate(phone);
    if (phoneError) newErrors.phone = phoneError.message;

    const passwordError = validators.password.validate(password);
    if (passwordError) newErrors.password = passwordError.message;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    mutation.mutate();
  };

  const handlePhoneBlur = () => {
    const error = validators.phone.validate(phone);
    if (error) {
      setErrors((e) => ({ ...e, phone: error.message }));
    } else {
      setErrors((e) => ({ ...e, phone: "" }));
    }
  };

  const handlePasswordBlur = () => {
    const error = validators.password.validate(password);
    if (error) {
      setErrors((e) => ({ ...e, password: error.message }));
    } else {
      setErrors((e) => ({ ...e, password: "" }));
    }
  };

  const handleLogoClick = () => {
    clickCount.current += 1;
    
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        clickCount.current = 0;
      }, 2000);
    }
    
    if (clickCount.current >= 3) {
      clearTimeout(clickTimer.current);
      clickCount.current = 0;
      navigate({ to: "/admin/login" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div 
            onClick={handleLogoClick}
            className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md"
          >
            <Store className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Trusit</h1>
          <p className="text-sm text-muted-foreground">Sign in to your duka</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className={errors.phone ? "text-red-600" : ""}>
                Phone number
                {errors.phone && <span className="text-red-600">*</span>}
              </Label>
              <Input
                id="phone"
                inputMode="tel"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(val);
                  if (errors.phone) setErrors((e) => ({ ...e, phone: "" }));
                }}
                onBlur={handlePhoneBlur}
                maxLength={10}
                className={errors.phone ? "border-red-600 focus-visible:ring-red-600" : ""}
                required
              />
              {errors.phone && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.phone}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className={errors.password ? "text-red-600" : ""}>
                Password
                {errors.password && <span className="text-red-600">*</span>}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((e) => ({ ...e, password: "" }));
                }}
                onBlur={handlePasswordBlur}
                className={errors.password ? "border-red-600 focus-visible:ring-red-600" : ""}
                required
              />
              {errors.password && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  {errors.password}
                </div>
              )}
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
