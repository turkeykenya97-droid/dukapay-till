import { useMemo } from "react";
import QRCode from "qrcode.react";
import { Button } from "@/components/ui/button";
import { BarcodeMedium } from "@/components/Barcode";
import { Download, Printer, X } from "lucide-react";
import { fmtKsh } from "@/lib/format";

interface ReceiptItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  barcode?: string;
  barcode_type?: string;
}

interface ReceiptProps {
  sale_id: string;
  shop_name: string;
  phone?: string;
  address?: string;
  total: number;
  cash_paid: number;
  mpesa_amount: number;
  items: ReceiptItem[];
  customer_phone: string;
  sold_at: string;
  payment_status: string;
  template?: {
    header_text?: string;
    footer_text?: string;
    logo_url?: string;
    show_qr_code?: boolean;
  };
  onClose?: () => void;
}

export function Receipt({
  sale_id,
  shop_name,
  phone,
  address,
  total,
  cash_paid,
  mpesa_amount,
  items,
  customer_phone,
  sold_at,
  payment_status,
  template,
  onClose,
}: ReceiptProps) {
  const receiptUrl = useMemo(() => {
    return `${window.location.origin}/receipt/${sale_id}`;
  }, [sale_id]);

  const handlePrintPDF = () => {
    const printWindow = window.open("", "", "width=400,height=600");
    if (printWindow) {
      printWindow.document.write(generateReceiptHTML());
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadPDF = async () => {
    const html2pdf = (await import("html2pdf.js")).default;
    const element = document.getElementById("receipt-content");
    if (element) {
      html2pdf().set({ margin: 5, filename: `receipt-${sale_id}.pdf` }).from(element).save();
    }
  };

  const handleDirectPrint = async () => {
    // For thermal printer ESC/POS support (requires backend)
    const response = await fetch("/api/print-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sale_id,
        shop_name,
        items,
        total,
        cash_paid,
        mpesa_amount,
      }),
    });
    if (response.ok) {
      alert("Sent to printer");
    }
  };

  const generateReceiptHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt ${sale_id}</title>
        <style>
          body { font-family: monospace; max-width: 400px; margin: 0; padding: 10px; }
          .receipt { border: 1px solid #ccc; padding: 15px; }
          .header { text-align: center; margin-bottom: 15px; }
          .header h2 { margin: 0; font-size: 18px; }
          .header p { margin: 3px 0; font-size: 12px; color: #666; }
          .items { border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; padding: 10px 0; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; }
          .item-name { flex: 1; }
          .item-qty { width: 40px; text-align: center; }
          .item-total { width: 60px; text-align: right; }
          .total-section { padding: 10px 0; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
          .footer { text-align: center; font-size: 11px; color: #666; margin-top: 15px; }
          .qr { text-align: center; margin: 15px 0; }
          .qr img { max-width: 150px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <h2>${shop_name}</h2>
            ${address ? `<p>${address}</p>` : ""}
            ${phone ? `<p>${phone}</p>` : ""}
            <p>${new Date(sold_at).toLocaleString()}</p>
            <p>Receipt: ${sale_id}</p>
          </div>

          <div class="items">
            ${items
              .map(
                (item) => `
              <div class="item">
                <div class="item-name">${item.product_name}</div>
                <div class="item-qty">${item.quantity}x</div>
                <div class="item-total">${fmtKsh(item.line_total)}</div>
              </div>
              <div style="font-size: 11px; color: #999; margin-bottom: 5px;">
                @ ${fmtKsh(item.unit_price)}
              </div>
            `
              )
              .join("")}
          </div>

          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${fmtKsh(total)}</span>
            </div>
            ${cash_paid > 0 ? `<div class="total-row"><span>Cash:</span><span>${fmtKsh(cash_paid)}</span></div>` : ""}
            ${mpesa_amount > 0 ? `<div class="total-row"><span>M-Pesa:</span><span>${fmtKsh(mpesa_amount)}</span></div>` : ""}
            <div class="total-row" style="font-size: 16px; border-top: 1px solid #000; padding-top: 5px;">
              <span>TOTAL:</span>
              <span>${fmtKsh(total)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Customer: ${customer_phone}</p>
            <p>Status: ${payment_status}</p>
            ${template?.header_text ? `<p>${template.header_text}</p>` : ""}
          </div>

          <div class="qr">
            <p style="font-size: 11px;">Verify at:</p>
            <p style="font-size: 10px; word-break: break-all;">${receiptUrl}</p>
          </div>

          <div class="footer">
            ${template?.footer_text || "Powered by Trusit POS"}
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="font-bold">Receipt</h2>
          {onClose && (
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Receipt Content */}
        <div
          id="receipt-content"
          className="p-4 bg-gray-50 font-mono text-sm"
          style={{ fontFamily: "monospace", backgroundColor: "#fafafa" }}
        >
          {/* Header */}
          <div className="text-center mb-4 pb-4 border-b border-gray-300">
            <h3 className="font-bold text-base">{shop_name}</h3>
            {address && <p className="text-xs text-gray-600">{address}</p>}
            {phone && <p className="text-xs text-gray-600">{phone}</p>}
            <p className="text-xs text-gray-600">
              {new Date(sold_at).toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">Receipt: {sale_id}</p>
          </div>

          {/* Items */}
          <div className="mb-4 pb-4 border-b border-gray-300">
            {items.map((item, idx) => (
              <div key={idx} className="mb-4 pb-3 border-b border-gray-300 last:border-b-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex-1">{item.product_name}</span>
                  <span className="w-10 text-center">{item.quantity}x</span>
                  <span className="w-16 text-right font-bold">
                    {fmtKsh(item.line_total)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 text-right mb-2">
                  @ {fmtKsh(item.unit_price)}
                </div>
                {item.barcode && (
                  <div className="mt-2">
                    <BarcodeMedium value={item.barcode} text={item.barcode} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mb-4 pb-4 border-b border-gray-300 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Subtotal:</span>
              <span>{fmtKsh(total)}</span>
            </div>
            {cash_paid > 0 && (
              <div className="flex justify-between text-xs">
                <span>Cash:</span>
                <span>{fmtKsh(cash_paid)}</span>
              </div>
            )}
            {mpesa_amount > 0 && (
              <div className="flex justify-between text-xs">
                <span>M-Pesa:</span>
                <span>{fmtKsh(mpesa_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-300">
              <span>TOTAL:</span>
              <span>{fmtKsh(total)}</span>
            </div>
          </div>

          {/* Customer & Status */}
          <div className="mb-4 pb-4 border-b border-gray-300 text-xs text-gray-600 space-y-1">
            <p>Customer: {customer_phone}</p>
            <p>Status: {payment_status}</p>
          </div>

          {/* QR Code */}
          {template?.show_qr_code !== false && (
            <div className="text-center mb-4 pb-4 border-b border-gray-300">
              <p className="text-xs text-gray-600 mb-2">Verify Receipt:</p>
              <div className="flex justify-center">
                <QRCode value={receiptUrl} size={120} level="H" />
              </div>
              <p className="text-xs text-gray-500 mt-2 break-all">{receiptUrl}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-600 space-y-1">
            {template?.header_text && <p>{template.header_text}</p>}
            <p>{template?.footer_text || "Powered by Trusit POS"}</p>
            <p>Thank you for your business!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <Button
            onClick={handlePrintPDF}
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
          >
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
