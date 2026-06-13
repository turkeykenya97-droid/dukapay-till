import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "@/components/Receipt";

async function getReceiptData({ sale_id }: { sale_id: string }) {
  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales")
    .select(
      `
      id,
      total_amount,
      cash_paid,
      mpesa_amount,
      phone_number,
      payment_status,
      created_at,
      shop_id,
      sale_items (
        id,
        product_id,
        quantity,
        unit_price,
        line_total,
        products (
          name
        )
      ),
      shops (
        shop_name,
        phone
      )
    `
    )
    .eq("id", sale_id)
    .single();

  if (saleError) throw saleError;

  return sale;
}

export const Route = createFileRoute("/receipt/$sale_id")({
  loader: async ({ params }) => {
    return getReceiptData({ sale_id: params.sale_id });
  },
  component: ReceiptPage,
  errorComponent: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Receipt Not Found</h1>
        <p className="text-gray-600">
          The receipt you're looking for doesn't exist or has been deleted.
        </p>
      </div>
    </div>
  ),
});

function ReceiptPage() {
  const data = Route.useLoaderData();

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading receipt...</h1>
        </div>
      </div>
    );
  }

  const items = data.sale_items?.map((item: any) => ({
    product_name: item.products?.name || "Unknown Product",
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.line_total,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{data.shops?.shop_name}</h1>
          <p className="text-gray-600">Receipt</p>
        </div>

        <div className="space-y-6 mb-8">
          {/* Sale Info */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b">
            <div>
              <p className="text-sm text-gray-600">Receipt ID</p>
              <p className="font-mono font-bold">{data.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date & Time</p>
              <p>{new Date(data.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Customer Phone</p>
              <p className="font-mono">{data.phone_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment Status</p>
              <p className="font-semibold capitalize">{data.payment_status}</p>
            </div>
          </div>

          {/* Items */}
          <div className="pb-4 border-b">
            <h2 className="font-bold mb-4">Items</h2>
            <div className="space-y-3">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="text-gray-600">
                      {item.quantity} x Ksh {item.unit_price}
                    </p>
                  </div>
                  <p className="font-bold">Ksh {item.line_total}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>Ksh {data.total_amount}</span>
            </div>
            {data.cash_paid > 0 && (
              <div className="flex justify-between text-sm">
                <span>Cash Paid:</span>
                <span>Ksh {data.cash_paid}</span>
              </div>
            )}
            {data.mpesa_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span>M-Pesa Paid:</span>
                <span>Ksh {data.mpesa_amount}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-4 border-t">
              <span>TOTAL:</span>
              <span className="text-green-600">Ksh {data.total_amount}</span>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600">
          <p className="mb-2">Thank you for your business!</p>
          <p>Powered by Trusit POS</p>
        </div>
      </div>
    </div>
  );
}
