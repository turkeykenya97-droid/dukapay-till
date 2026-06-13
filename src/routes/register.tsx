import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { registerShop } from "@/lib/auth.functions";
import { parseServerError, validators } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create your Trusit account" },
      { name: "description", content: "Start your 14-day free trial of Trusit." },
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
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      toast.success("Account created! Let's set up your till.");
      navigate({ to: "/onboarding" });
    },
    onError: (e: Error) => {
      const message = parseServerError(e);
      toast.error(message);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameError = validators.name.validate(form.owner_name, "Your name");
    if (nameError) newErrors.owner_name = nameError.message;

    const shopError = validators.name.validate(form.shop_name, "Shop name");
    if (shopError) newErrors.shop_name = shopError.message;

    const phoneError = validators.phone.validate(form.phone);
    if (phoneError) newErrors.phone = phoneError.message;

    const passwordError = validators.password.validate(form.password);
    if (passwordError) newErrors.password = passwordError.message;

    const confirmError = validators.passwordConfirm.validate(form.password, form.confirm);
    if (confirmError) newErrors.confirm = confirmError.message;

    const pinError = validators.pin.validate(form.pin);
    if (pinError) newErrors.pin = pinError.message;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldBlur = (field: string) => {
    let error: ReturnType<typeof validators.phone.validate> | null = null;

    switch (field) {
      case "owner_name":
        error = validators.name.validate(form.owner_name, "Your name");
        break;
      case "shop_name":
        error = validators.name.validate(form.shop_name, "Shop name");
        break;
      case "phone":
        error = validators.phone.validate(form.phone);
        break;
      case "password":
        error = validators.password.validate(form.password);
        break;
      case "confirm":
        error = validators.passwordConfirm.validate(form.password, form.confirm);
        break;
      case "pin":
        error = validators.pin.validate(form.pin);
        break;
    }

    if (error) {
      setErrors((e) => ({ ...e, [field]: error!.message }));
    } else {
      setErrors((e) => ({ ...e, [field]: "" }));
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value =
      k === "phone"
        ? e.target.value.replace(/\D/g, "").slice(0, 10)
        : k === "pin"
          ? e.target.value.replace(/\D/g, "").slice(0, 4)
          : e.target.value;

    setForm((f) => ({ ...f, [k]: value }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    mutation.mutate();
  };

  const createFieldInput = (
    field: keyof typeof form,
    label: string,
    type = "text",
    placeholder = "",
    helperText = ""
  ) => {
    const hasError = !!errors[field];
    return (
      <div key={field} className="space-y-2">
        <Label htmlFor={field} className={hasError ? "text-red-600" : ""}>
          {label}
          {hasError && <span className="text-red-600">*</span>}
        </Label>
        <Input
          id={field}
          type={type}
          inputMode={type === "tel" || field === "pin" ? "numeric" : undefined}
          placeholder={placeholder}
          value={form[field]}
          onChange={set(field)}
          onBlur={() => handleFieldBlur(field)}
          maxLength={field === "phone" ? 10 : field === "pin" ? 4 : undefined}
          autoComplete={
            field === "password" || field === "confirm" ? "new-password" : "off"
          }
          className={hasError ? "border-red-600 focus-visible:ring-red-600" : ""}
          required
        />
        {hasError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {errors[field]}
          </div>
        )}
        {helperText && !hasError && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Store className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Create account</h1>
          <p className="text-sm text-muted-foreground">14-day free trial, no card needed</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
          <form onSubmit={submit} className="space-y-4">
            {createFieldInput("owner_name", "Your full name", "text", "John Kemboi")}
            {createFieldInput("shop_name", "Shop name", "text", "Kemboi's Mini Mart")}
            {createFieldInput(
              "phone",
              "Phone (M-Pesa number)",
              "tel",
              "07XX XXX XXX",
              "Enter 10-digit phone starting with 0"
            )}
            {createFieldInput(
              "password",
              "Password",
              "password",
              "",
              "Minimum 6 characters"
            )}
            {createFieldInput(
              "confirm",
              "Confirm password",
              "password"
            )}
            {createFieldInput(
              "pin",
              "4-digit Sales PIN",
              "tel",
              "0000",
              "You'll enter this once a day to record sales"
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating account…" : "Create account"}
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
