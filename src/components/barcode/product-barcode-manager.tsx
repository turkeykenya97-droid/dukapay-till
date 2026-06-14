import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Copy, RefreshCw, QrCode, Barcode } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getProductBarcodes, updateProductUpc, regenerateProductBarcode } from "@/lib/barcode.functions";

interface ProductBarcodeManagerProps {
  productId: string;
}

export function ProductBarcodeManager({ productId }: ProductBarcodeManagerProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<"internal" | "upc" | null>(null);
  const [upcInput, setUpcInput] = useState("");
  const [showUpcDialog, setShowUpcDialog] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["productBarcodes", productId],
    queryFn: () => getProductBarcodes({ product_id: productId }),
  });

  const updateUpcMutation = useMutation({
    mutationFn: (upc: string) => updateProductUpc({ product_id: productId, upc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productBarcodes", productId] });
      setUpcInput("");
      setShowUpcDialog(false);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateProductBarcode({ product_id: productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productBarcodes", productId] });
    },
  });

  const copyToClipboard = (text: string, type: "internal" | "upc") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading barcodes...</div>;
  }

  if (!product) {
    return <div className="text-red-600">Product not found</div>;
  }

  return (
    <div className="space-y-4">
      {/* Internal Barcode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Barcode className="h-4 w-4" />
            Internal Barcode (Auto-generated)
          </CardTitle>
          <CardDescription>
            Unique barcode for your POS system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Current Barcode</Label>
            <div className="flex gap-2">
              <Input
                value={product.barcode}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(product.barcode, "internal")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Generated: {new Date(product.barcode_generated_at).toLocaleDateString()}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            {regenerateMutation.isPending ? "Regenerating..." : "Regenerate Barcode"}
          </Button>

          {regenerateMutation.isSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Barcode regenerated. Update your printed labels!
              </AlertDescription>
            </Alert>
          )}

          {regenerateMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {regenerateMutation.error instanceof Error
                  ? regenerateMutation.error.message
                  : "Failed to regenerate barcode"}
              </AlertDescription>
            </Alert>
          )}

          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-xs">
              💡 Print this barcode and attach to shelves/products for scanning at checkout
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* External UPC/EAN */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            External UPC/EAN (Optional)
          </CardTitle>
          <CardDescription>
            Supermarket barcode (if product has one)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {product.upc ? (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Current UPC</Label>
                <div className="flex gap-2">
                  <Input
                    value={product.upc}
                    readOnly
                    className="font-mono text-sm bg-muted"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(product.upc!, "upc")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Dialog open={showUpcDialog} onOpenChange={setShowUpcDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="w-full">
                    Update UPC
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Product UPC</DialogTitle>
                    <DialogDescription>
                      Enter the supermarket barcode (EAN-13, UPC-A, etc.)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Enter UPC..."
                      value={upcInput}
                      onChange={(e) => setUpcInput(e.target.value)}
                    />
                    <Button
                      onClick={() =>
                        updateUpcMutation.mutate(upcInput)
                      }
                      disabled={
                        updateUpcMutation.isPending || !upcInput.trim()
                      }
                      className="w-full"
                    >
                      Update UPC
                    </Button>
                    {updateUpcMutation.isError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {updateUpcMutation.error instanceof Error
                            ? updateUpcMutation.error.message
                            : "Failed to update UPC"}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 text-xs">
                  ✓ Staff can scan both internal barcode and this UPC
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                No UPC added yet. Add one if your product has a supermarket barcode.
              </p>

              <Dialog open={showUpcDialog} onOpenChange={setShowUpcDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full">
                    Add UPC
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Product UPC</DialogTitle>
                    <DialogDescription>
                      Enter the supermarket barcode (EAN-13, UPC-A, etc.)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Enter UPC..."
                      value={upcInput}
                      onChange={(e) => setUpcInput(e.target.value)}
                    />
                    <Button
                      onClick={() =>
                        updateUpcMutation.mutate(upcInput)
                      }
                      disabled={
                        updateUpcMutation.isPending || !upcInput.trim()
                      }
                      className="w-full"
                    >
                      Add UPC
                    </Button>
                    {updateUpcMutation.isError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {updateUpcMutation.error instanceof Error
                            ? updateUpcMutation.error.message
                            : "Failed to add UPC"}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}

          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-700 text-xs">
              💡 Find UPC on product packet or box - usually a barcode sticker
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
