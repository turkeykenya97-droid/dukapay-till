import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  queryOptions,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/products.functions";
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
import { Plus, Pencil, Trash2, Package } from "lucide-react";
import { fmtKsh } from "@/lib/format";

const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: () => listProducts(),
});

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products — DukaPOS" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: ProductsPage,
});

interface ProductRow {
  id: string;
  name: string;
  price: number;
  stock: number;
  reorder_level: number;
}

function ProductsPage() {
  const { data } = useSuspenseQuery(productsQuery);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = data.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <Button
          size="icon"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      <Input
        placeholder="Search products…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {filtered.length === 0 ? (
        <EmptyState
          onAdd={() => {
            setEditing(null);
            setOpen(true);
          }}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const low = p.stock <= p.reorder_level;
            return (
              <div
                key={p.id}
                className={`bg-card border border-border rounded-xl p-3 flex items-center gap-3 ${
                  low ? "border-l-4 border-l-destructive" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {fmtKsh(p.price)} · {p.stock} in stock
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditing(p as ProductRow);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ProductDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="h-12 w-12 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center mb-3">
        <Package className="h-6 w-6" />
      </div>
      <h2 className="font-semibold">No products yet</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Add your first product to start selling.
      </p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4 mr-1" /> Add product
      </Button>
    </div>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  editing: ProductRow | null;
}) {
  const qc = useQueryClient();
  const create = useServerFn(createProduct);
  const update = useServerFn(updateProduct);
  const del = useServerFn(deleteProduct);

  const [form, setForm] = useState({
    name: editing?.name ?? "",
    price: editing?.price?.toString() ?? "",
    stock: editing?.stock?.toString() ?? "",
    reorder_level: editing?.reorder_level?.toString() ?? "5",
  });

  // reset on open
  if (open && editing && form.name !== editing.name && form.price === "") {
    // initial only
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      reorder_level: Number(form.reorder_level),
    };
    try {
      if (editing) {
        await update({ data: { id: editing.id, ...payload } });
        toast.success("Product updated");
      } else {
        await create({ data: payload });
        toast.success("Product added");
      }
      qc.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onDelete = async () => {
    if (!editing) return;
    if (!confirm(`Delete ${editing.name}?`)) return;
    try {
      await del({ data: { id: editing.id } });
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(b) => {
        onOpenChange(b);
        if (b) {
          setForm({
            name: editing?.name ?? "",
            price: editing?.price?.toString() ?? "",
            stock: editing?.stock?.toString() ?? "",
            reorder_level: editing?.reorder_level?.toString() ?? "5",
          });
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Price (Ksh)</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="1"
                step="1"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Stock</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Reorder alert at</Label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              value={form.reorder_level}
              onChange={(e) =>
                setForm((f) => ({ ...f, reorder_level: e.target.value }))
              }
              required
            />
          </div>
          <DialogFooter className="gap-2">
            {editing && (
              <Button type="button" variant="destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
            <Button type="submit">{editing ? "Save changes" : "Add product"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
