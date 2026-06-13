import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  getProductsWithBarcodes,
  generateProductBarcode,
  setCustomBarcode,
} from "@/lib/receipt.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Barcode as BarcodeComponent } from "@/components/Barcode";
import {
  Copy,
  Zap,
  Plus,
  Edit2,
  Loader2,
  Download,
} from "lucide-react";
import { fmtKsh } from "@/lib/format";

export const Route = createFileRoute("/admin/barcodes")({
  head: () => ({ meta: [{ title: "Barcode Management — Trusit Admin" }] }),
  loader: async ({ context }) => {
    const getProducts = await context.queryClient.ensureQueryData({
      queryKey: ["products-with-barcodes"],
      queryFn: async () => {
        const fn = context.queryClient.getQueryData(["products-with-barcodes"]);
        if (!fn) {
          const gp = (await import("@/lib/receipt.functions")).getProductsWithBarcodes;
          return gp({ data: undefined });
        }
        return fn;
      },
    });
    return getProducts;
  },
  component: BarcodeManagementPage,
});

function BarcodeManagementPage() {
  const qc = useQueryClient();
  const getProducts = useServerFn(getProductsWithBarcodes);
  const generateBarcode = useServerFn(generateProductBarcode);
  const setBarcode = useServerFn(setCustomBarcode);

  const { data: products } = useSuspenseQuery({
    queryKey: ["products-with-barcodes"],
    queryFn: () => getProducts({ data: undefined }),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [customBarcode, setCustomBarcode] = useState("");

  const { mutate: generate, isPending: generating } = useMutation({
    mutationFn: (productId: string) =>
      generateBarcode({ data: { product_id: productId } }),
    onSuccess: (data) => {
      toast.success(`Barcode generated: ${data.barcode}`);
      qc.invalidateQueries({ queryKey: ["products-with-barcodes"] });
    },
    onError: (err) => {
      toast.error((err as Error).message);
    },
  });

  const { mutate: setCustom, isPending: setting } = useMutation({
    mutationFn: (data: { product_id: string; barcode: string }) =>
      setBarcode({
        data: {
          product_id: data.product_id,
          barcode: data.barcode,
        },
      }),
    onSuccess: (data) => {
      toast.success(`Barcode set: ${data.barcode}`);
      setEditOpen(false);
      setCustomBarcode("");
      qc.invalidateQueries({ queryKey: ["products-with-barcodes"] });
    },
    onError: (err) => {
      toast.error((err as Error).message);
    },
  });

  const handleSetCustom = () => {
    if (!editProductId) return;
    setCustom({ product_id: editProductId, barcode: customBarcode });
  };

  const productsWithoutBarcodes = products?.filter((p: any) => !p.barcode) || [];
  const productsWithBarcodes = products?.filter((p: any) => p.barcode) || [];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Barcode Management</h1>
        <p className="text-gray-600 mt-2">
          Generate and manage product barcodes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Products</p>
          <p className="text-2xl font-bold">{products?.length || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">With Barcodes</p>
          <p className="text-2xl font-bold text-green-600">
            {productsWithBarcodes.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Missing Barcodes</p>
          <p className="text-2xl font-bold text-orange-600">
            {productsWithoutBarcodes.length}
          </p>
        </div>
      </div>

      {/* Missing Barcodes Section */}
      {productsWithoutBarcodes.length > 0 && (
        <div className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Generate Missing Barcodes</h2>
              <p className="text-sm text-gray-600 mt-1">
                {productsWithoutBarcodes.length} products need barcodes
              </p>
            </div>
            <Button
              onClick={() => {
                productsWithoutBarcodes.forEach((p: any) => generate(p.id));
              }}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Generate All
            </Button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {productsWithoutBarcodes.map((product: any) => (
              <div
                key={product.id}
                className="flex items-center justify-between bg-white p-3 rounded border border-orange-200"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-xs text-gray-500">{fmtKsh(product.price)}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generate(product.id)}
                  disabled={generating}
                  className="gap-1"
                >
                  {generating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Zap className="h-3 w-3" />
                  )}
                  Generate
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products with Barcodes */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold">Products with Barcodes</h2>
        </div>

        {productsWithBarcodes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No barcodes generated yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="w-32">Barcode</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsWithBarcodes.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{fmtKsh(product.price)}</TableCell>
                    <TableCell>{product.stock}</TableCell>
                    <TableCell>
                      {product.barcode ? (
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {product.barcode}
                        </code>
                      ) : (
                        <Badge variant="outline">None</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {product.barcode_type || "ean13"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(product.barcode);
                          toast.success("Copied!");
                        }}
                        title="Copy barcode"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditProductId(product.id);
                          setCustomBarcode("");
                          setEditOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit Custom Barcode Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Barcode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom-barcode">Barcode (8-14 digits)</Label>
              <Input
                id="custom-barcode"
                type="text"
                inputMode="numeric"
                placeholder="Enter barcode"
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Digits only. Leave empty to keep current.
              </p>
            </div>
            <BarcodeComponent
              value={customBarcode || "0000000000000"}
              format="ean13"
              height={50}
              displayValue={true}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSetCustom}
              disabled={!customBarcode || customBarcode.length < 8 || setting}
            >
              {setting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Barcode"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
