import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminLoginServer } from "@/lib/admin-auth.server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — Trusit" },
      { name: "description", content: "Admin portal login for Trusit." },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useServerFn(adminLoginServer);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      console.log("[admin-login] Attempting to login with email:", email);
      return login({ data: { email, password } });
    },
    onSuccess: () => {
      console.log("[admin-login] Success");
      toast.success("Welcome back!");
      navigate({ to: "/admin/dashboard" });
    },
    onError: (e: Error) => {
      console.error("[admin-login error]", e);
      const message = e.message || "Login failed. Please try again.";
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[admin-login] Form submitted");
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-green-600 text-white flex items-center justify-center shadow-md">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Trusit</h1>
          <p className="text-sm text-muted-foreground">Admin Portal</p>
        </div>
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@trusit.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={mutation.isPending}
              />
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
                disabled={mutation.isPending}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-xs text-center text-muted-foreground">
          Admin access only. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
