import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { AlertCircle } from "lucide-react";

interface BarcodeProps {
  value: string;
  format?: "ean13" | "code128" | "code39";
  width?: number;
  height?: number;
  displayValue?: boolean;
  text?: string;
  className?: string;
}

export function Barcode({
  value,
  format = "ean13",
  width = 2,
  height = 60,
  displayValue = true,
  text,
  className = "",
}: BarcodeProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!value || !barcodeRef.current) return;

    try {
      JsBarcode(barcodeRef.current, value, {
        format: format.toUpperCase() as any,
        width,
        height,
        displayValue,
        text: text || undefined,
        margin: 5,
      });
    } catch (err) {
      console.error("Barcode generation error:", err);
    }
  }, [value, format, width, height, displayValue, text]);

  if (!value) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded ${className}`}>
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <span className="text-sm text-yellow-600">No barcode</span>
      </div>
    );
  }

  return (
    <svg
      ref={barcodeRef}
      className={className}
      style={{ width: "100%", height: "auto" }}
    />
  );
}

/**
 * Compact barcode for product cards (small thumbnail)
 */
export function BarcodeThumb({ value, className = "" }: { value?: string; className?: string }) {
  return (
    <div className={`bg-white p-2 rounded border border-gray-200 ${className}`}>
      {value ? (
        <Barcode value={value} format="ean13" width={1} height={30} displayValue={false} />
      ) : (
        <div className="h-8 flex items-center justify-center text-xs text-gray-400">
          No barcode
        </div>
      )}
    </div>
  );
}

/**
 * Medium barcode for receipt display
 */
export function BarcodeMedium({ value, text }: { value?: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {value ? (
        <Barcode value={value} format="ean13" width={1.5} height={50} displayValue={false} />
      ) : (
        <div className="text-xs text-gray-400">No barcode</div>
      )}
      {text && <span className="text-xs font-mono text-gray-600">{text}</span>}
    </div>
  );
}

/**
 * Large barcode for detailed view
 */
export function BarcodeLarge({ value, text }: { value?: string; text?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded">
      {value ? (
        <Barcode value={value} format="ean13" width={2} height={80} displayValue={true} />
      ) : (
        <div className="text-sm text-gray-400">No barcode generated</div>
      )}
      {text && (
        <div className="text-xs font-mono text-gray-600 text-center">
          {text}
        </div>
      )}
    </div>
  );
}
