import { Button } from "@/components/ui/button";
import { AlertCircle, Zap } from "lucide-react";

interface UpgradePromptProps {
  feature: string;
  description: string;
  onUpgradeClick?: () => void;
}

export function UpgradePrompt({
  feature,
  description,
  onUpgradeClick,
}: UpgradePromptProps) {
  return (
    <div className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="bg-yellow-100 rounded-full p-3">
          <Zap className="h-6 w-6 text-yellow-600" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {feature} is a Pro feature
      </h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="bg-white rounded-lg p-3 mb-4 text-left text-sm">
        <p className="font-semibold text-foreground mb-2">Pro Plan includes:</p>
        <ul className="space-y-1 text-muted-foreground">
          <li>✓ Full analytics and reporting</li>
          <li>✓ Advanced stock management</li>
          <li>✓ Receipt printing & digital receipts</li>
          <li>✓ Unlimited transactions</li>
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="text-left">
          <p className="text-xs text-muted-foreground mb-1">Basic Plan</p>
          <p className="text-2xl font-bold text-foreground">KES 299</p>
          <p className="text-xs text-muted-foreground">/month</p>
        </div>
        <div className="text-left">
          <p className="text-xs text-muted-foreground mb-1">Pro Plan</p>
          <p className="text-2xl font-bold text-yellow-600">KES 499</p>
          <p className="text-xs text-muted-foreground">/month</p>
        </div>
      </div>
      <Button
        onClick={onUpgradeClick}
        className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700 text-white"
      >
        <Zap className="h-4 w-4 mr-2" />
        Upgrade to Pro
      </Button>
    </div>
  );
}
