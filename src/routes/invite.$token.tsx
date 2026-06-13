import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  validateInvitationToken,
  acceptStaffInvitation,
} from "@/lib/staff-invitation.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/invite/$token")({
  component: InvitationPage,
});

function InvitationPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState<"validate" | "setup" | "success">("validate");
  const [invitationData, setInvitationData] = useState<any>(null);
  const [formData, setFormData] = useState({
    password: "",
    password_confirm: "",
    profile_photo_url: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Validate invitation on load
  useEffect(() => {
    const validate = async () => {
      try {
        const data = await validateInvitationToken({ token });
        setInvitationData(data);
        setStep("setup");
      } catch (err: any) {
        setError(err.message || "Failed to validate invitation");
        setStep("validate");
      } finally {
        setLoading(false);
      }
    };

    validate();
  }, [token]);

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      return await acceptStaffInvitation({
        token,
        password: formData.password,
        password_confirm: formData.password_confirm,
        profile_photo_url: formData.profile_photo_url || undefined,
      });
    },
    onSuccess: () => {
      setStep("success");
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create account");
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Validating invitation...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && step === "validate") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Invitation
            </h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate({ to: "/" })} className="w-full">
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Account Created!
            </h1>
            <p className="text-gray-600 mb-2">Welcome to your team</p>
            <p className="text-sm text-gray-500 mb-6">
              Role: <span className="font-semibold capitalize">{invitationData?.role?.name}</span>
            </p>
            <Button
              onClick={() => navigate({ to: "/login" })}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {invitationData?.full_name}!
          </h1>
          <p className="text-gray-600">Set up your account to get started</p>
        </div>

        {/* Locked fields display */}
        <div className="mb-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700">{invitationData?.email}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Assigned by administrator</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>
            <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700 capitalize font-semibold">
                {invitationData?.role?.name}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
          </div>

          {invitationData?.branch && (
            <div>
              <label className="text-sm font-medium text-gray-700">Branch</label>
              <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-700">{invitationData?.branch?.name}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Assigned by administrator</p>
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Editable fields */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            acceptMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-sm font-medium text-gray-700">
              Create Password
            </label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              minLength={8}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="Re-enter password"
              value={formData.password_confirm}
              onChange={(e) =>
                setFormData({ ...formData, password_confirm: e.target.value })
              }
              required
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Profile Photo URL (optional)
            </label>
            <Input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={formData.profile_photo_url}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  profile_photo_url: e.target.value,
                })
              }
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            disabled={
              acceptMutation.isPending ||
              !formData.password ||
              !formData.password_confirm
            }
            className="w-full"
          >
            {acceptMutation.isPending ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          By creating an account, you agree to the Terms of Service and Privacy
          Policy
        </p>
      </Card>
    </div>
  );
}
