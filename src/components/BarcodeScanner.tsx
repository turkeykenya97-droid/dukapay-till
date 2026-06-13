import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Camera, X, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  onManualEntry?: (barcode: string) => void;
  isLoading?: boolean;
}

export function BarcodeScanner({
  onBarcodeDetected,
  onManualEntry,
  isLoading = false,
}: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"pending" | "granted" | "denied">(
    "pending"
  );
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startCamera = async () => {
    if (!readerRef.current) return;

    try {
      setError(null);

      // Check camera permission
      try {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        setCameraPermission("denied");
        setError("Camera permission denied. Use manual entry instead.");
        return;
      }

      setCameraPermission("granted");

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // Filter for barcode formats (not just QR codes)
          // Accept strings that look like barcodes (all digits or specific patterns)
          if (/^\d{8,14}$/.test(decodedText)) {
            onBarcodeDetected(decodedText);
            setManualBarcode(decodedText);
          } else if (decodedText.match(/^[A-Z0-9\-]+$/)) {
            // Also accept alphanumeric codes
            onBarcodeDetected(decodedText);
            setManualBarcode(decodedText);
          }
        },
        () => {}
      );

      setScanning(true);
    } catch (err) {
      setError((err as Error).message || "Failed to start camera");
      setScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
    }
    setScanning(false);
  };

  const handleManualSubmit = () => {
    if (!manualBarcode.trim()) return;
    if (!/^\d{8,14}$/.test(manualBarcode)) {
      setError("Barcode must be 8-14 digits");
      return;
    }
    setError(null);
    onManualEntry?.(manualBarcode);
    setManualBarcode("");
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Camera View */}
      {scanning && (
        <div className="space-y-3">
          <div
            id="qr-reader"
            ref={readerRef}
            className="w-full rounded-lg overflow-hidden bg-black border border-gray-300"
          />
          <div className="text-center text-sm text-gray-600">
            <p>Point camera at product barcode</p>
          </div>
          <Button onClick={stopCamera} variant="outline" className="w-full gap-2">
            <X className="h-4 w-4" />
            Stop Camera
          </Button>
        </div>
      )}

      {/* Start Camera Button */}
      {!scanning && cameraPermission !== "denied" && (
        <Button
          onClick={startCamera}
          disabled={isLoading}
          className="w-full gap-2"
          variant="default"
        >
          <Camera className="h-4 w-4" />
          Scan Barcode
        </Button>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Manual Entry */}
      <div className="border-t pt-4 space-y-2">
        <label className="text-sm font-medium">Or enter manually</label>
        <div className="flex gap-2">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Enter barcode (8-14 digits)"
            value={manualBarcode}
            onChange={(e) => {
              setManualBarcode(e.target.value.replace(/\D/g, ""));
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleManualSubmit();
              }
            }}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleManualSubmit}
            disabled={!manualBarcode || isLoading}
            variant="outline"
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Add
          </Button>
        </div>
        <p className="text-xs text-gray-500">Digits only, 8-14 characters</p>
      </div>

      {/* Recently Scanned */}
      {manualBarcode && (
        <div className="bg-white p-2 rounded border border-green-200 text-sm">
          <p className="text-gray-600">Last barcode: <code className="font-mono text-green-600">{manualBarcode}</code></p>
        </div>
      )}
    </div>
  );
}
