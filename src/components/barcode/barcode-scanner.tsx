import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Barcode, QrCode } from "lucide-react";
import { scanBarcode, type BarcodeProduct } from "@/lib/barcode.functions";

interface BarcodeScannerProps {
  shopId: string;
  onProductScanned?: (product: BarcodeProduct) => void;
  autoFocus?: boolean;
}

export function BarcodeScanner({
  shopId,
  onProductScanned,
  autoFocus = true,
}: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState("");
  const [scannedProduct, setScannedProduct] = useState<BarcodeProduct | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scanMutation = useMutation({
    mutationFn: (scannedBarcode: string) =>
      scanBarcode({ shop_id: shopId, barcode: scannedBarcode }),
    onSuccess: (product) => {
      setScannedProduct(product);
      onProductScanned?.(product);
      setBarcode("");
      // Re-focus for next scan
      setTimeout(() => inputRef.current?.focus(), 100);
    },
    onError: (error) => {
      // Barcode not found - clear after 2 seconds
      setTimeout(() => {
        setBarcode("");
        setScannedProduct(null);
      }, 2000);
    },
  });

  const handleScan = () => {
    if (barcode.trim()) {
      scanMutation.mutate(barcode);
    }
  };

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Barcode className="h-5 w-5" />
          Barcode Scanner
        </CardTitle>
        <CardDescription>
          Scan internal barcode or supermarket UPC
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scan Input */}
        <div className="space-y-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Scan barcode here..."
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            disabled={scanMutation.isPending}
            className="font-mono text-lg"
          />
          <Button
            onClick={handleScan}
            disabled={scanMutation.isPending || !barcode.trim()}
            className="w-full"
          >
            {scanMutation.isPending ? "Scanning..." : "Scan"}
          </Button>
        </div>

        {/* Error State */}
        {scanMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {scanMutation.error instanceof Error
                ? scanMutation.error.message
                : "Barcode not found"}
            </AlertDescription>
          </Alert>
        )}

        {/* Success State */}
        {scannedProduct && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
            <h3 className="font-semibold text-green-900">{scannedProduct.name}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
              <div>
                <p className="text-xs text-green-600">Price</p>
                <p className="font-semibold">KES {scannedProduct.price.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-green-600">Stock</p>
                <p className="font-semibold">{scannedProduct.stock} units</p>
              </div>
            </div>
            <p className="text-xs text-green-700">
              {scannedProduct.barcode_type === "internal" && "✓ Internal barcode"}
              {scannedProduct.barcode_type === "upc" && "✓ Product UPC"}
            </p>
          </div>
        )}

        {/* Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <p className="font-semibold mb-1">📱 How to scan:</p>
          <ul className="space-y-1 text-xs">
            <li>• <strong>Internal Barcode:</strong> Auto-generated for every product</li>
            <li>• <strong>UPC/EAN:</strong> Supermarket barcode (optional)</li>
            <li>• Use any barcode scanner or phone camera with QR reader</li>
            <li>• Data auto-fills above - just press Enter or click Scan</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
