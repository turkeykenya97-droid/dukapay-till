import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureAccess } from "@/hooks/use-access";
import { useNavigate } from "@tanstack/react-router";

interface ProFeatureOverlayProps {
  feature: keyof import("@/lib/access.functions").AccessStatus["features"];
  children: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * Wraps a feature with a Pro-only overlay if user is on Basic plan
 * Shows an informational card suggesting upgrade to Pro
 * Allows viewing the overlay by showing blurred content + upgrade card
 */
export function ProFeatureOverlay({
  feature,
  children,
  title = "Pro Feature",
  description,
}: ProFeatureOverlayProps) {
  const navigate = useNavigate();
  const { allowed, level, upgrade } = useFeatureAccess(feature);

  // If feature is allowed, show it as-is
  if (allowed) {
    return <>{children}</>;
  }

  // Show overlay for locked features
  return (
    <div className="relative w-full">
      {/* Blurred background content */}
      <div className="blur-sm pointer-events-none opacity-50">{children}</div>

      {/* Overlay card */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white rounded-lg border-2 border-blue-200 shadow-lg p-6 max-w-sm text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto mb-3">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>

          <h3 className="font-semibold text-lg mb-2">{title}</h3>

          <p className="text-sm text-muted-foreground mb-4">
            {description ||
              upgrade.message ||
              `This is a Pro feature. Upgrade to unlock all premium features.`}
          </p>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate({ to: "/subscription" })}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Upgrade to Pro
            </Button>
            <p className="text-xs text-muted-foreground">
              Current plan: <strong>{level === "trial" ? "Trial" : level}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple badge to show feature tier requirement
 * Usage: <FeatureBadge feature="analytics" /> → "Pro Feature"
 */
export function FeatureBadge({
  feature,
}: {
  feature: keyof import("@/lib/access.functions").AccessStatus["features"];
}) {
  const { allowed, level } = useFeatureAccess(feature);

  if (allowed) {
    if (level === "trial") return <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">Trial</span>;
    if (level === "pro") return <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">Pro</span>;
    return null;
  }

  return (
    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 flex items-center gap-1">
      <Lock className="h-3 w-3" />
      Pro Only
    </span>
  );
}
