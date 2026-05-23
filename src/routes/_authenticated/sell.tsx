import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  queryOptions,
  useSuspenseQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { listProducts } from "@/lib/products.functions";
import { createSale, getSaleStatus } from "@/lib/sales.functions";
import { verifyPin, getCurrentShop } from "@/lib/auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Minus, Plus, ShoppingCart, CheckCircle2, XCircle } from "lucide-react";
import { fmtKsh } from "@/lib/format";

const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: () => listProducts(),
});

export const Route = createFileRoute("/_authenticated/sell")({
  head: () => ({ meta: [{ title: "New sale — DukaPOS" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: SellPage,
});

interface CartItem {
  product_id: string;
  name: string;
  unit_price: number;
  stock: number;
  quantity: number;
}

function SellPage() {
  const navigate = useNavigate();
  const { data: products } = useSuspenseQuery(productsQuery);
  const qc = useQueryClient();
  const verify = useServerFn(verifyPin);
  const create = useServerFn(createSale);
  const getStatus = useServerFn(getSaleStatus);
  const shopFn = useServerFn(getCurrentShop);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [phone, setPhone] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<"completed" | "failed" | null>(null);

  // PIN gate on mount
  useEffect(() => {
    shopFn({ data: undefined }).then((shop) => {
      if (!shop?.pin_session_valid) setPinOpen(true);
    });
  }, [shopFn]);

  // Poll sale status while pending
  useQuery({
    queryKey: ["sale-status", pendingSaleId],
    queryFn: () => getStatus({ data: { id: pendingSaleId! } }),
    enabled: !!pendingSaleId && finalStatus === null,
    refetchInterval: 3000,
    select: (s) => {
      if (s.payment_status === "completed" || s.payment_status === "failed") {
        setFinalStatus(s.payment_status);
        if (s.payment_status === "completed") {
          qc.invalidateQueries({ queryKey: ["products"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }
      }
      return s;
    },
  });

  const total = useMemo(
    () => cart.reduce((s, i) => s + i.unit_price * i.quantity, 0),
    [cart]
  );

  const addItem = (p: (typeof products)[number]) => {
    setCart((c) => {
      const existing = c.find((i) => i.product_id === p.id);
      if (existing) {
        if (existing.quantity >= p.stock) {
          toast.error("No more stock");
          return c;
        }
        return c.map((i) =>
          i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      if (p.stock < 1) {
        toast.error("Out of stock");
        return c;
      }
      return [
        ...c,
        {
          product_id: p.id,
          name: p.name,
          unit_price: Number(p.price),
          stock: p.stock,
          quantity: 1,
        },
      ];
    });
  };

  const setQty = (id: string, q: number) => {
    setCart((c) =>
      q <= 0
        ? c.filter((i) => i.product_id !== id)
        : c.map((i) =>
            i.product_id === id ? { ...i, quantity: Math.min(q, i.stock) } : i
          )
    );
  };

  const submitPin = async () => {
    try {
      await verify({ data: { pin } });
      setPinOpen(false);
      setPin("");
      toast.success("PIN verified");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const submitSale = async () => {
    if (cart.length === 0) return toast.error("Add at least one item");
    if (!/^(\+?254|0)\d{9}$/.test(phone.replace(/\s+/g, "")))
      return toast.error("Enter a valid Kenyan phone");
    setSubmitting(true);
    try {
      const res = await create({
        data: {
          customer_phone: phone,
          items: cart.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
          })),
        },
      });
      setPendingSaleId(res.sale_id);
      toast.success("M-Pesa request sent to customer");
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "PIN_REQUIRED") {
        setPinOpen(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Result screens
  if (finalStatus === "completed") {
    return (
      <ResultScreen
        ok
        total={total}
        onDone={() => navigate({ to: "/dashboard" })}
        items={cart}
        phone={phone}
      />
    );
  }
  if (finalStatus === "failed") {
    return (
      <ResultScreen
        ok={false}
        total={total}
        onDone={() => {
          setFinalStatus(null);
          setPendingSaleId(null);
        }}
        onCancel={() => navigate({ to: "/dashboard" })}
        items={cart}
        phone={phone}
      />
    );
  }

  if (pendingSaleId) {
    return (
      <div className="max-w-md mx-auto px-4 pt-10 text-center">
        <div className="animate-pulse h-16 w-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
          <ShoppingCart className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Waiting for payment…</h2>
        <p className="text-sm text-muted-foreground">
          Customer is approving M-Pesa on their phone.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-72">
      <h1 className="text-2xl font-bold mb-4">New sale</h1>
      <div className="space-y-2">
        {products.map((p) => {
          const out = p.stock < 1;
          return (
            <button
              key={p.id}
              disabled={out}
              onClick={() => addItem(p)}
              className={`w-full text-left bg-card border border-border rounded-xl p-3 flex items-center gap-3 transition ${
                out ? "opacity-50" : "hover:border-primary"
              }`}
            >
              <div className="flex-1">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-muted-foreground">
                  {fmtKsh(p.price)} · {out ? "Out of stock" : `${p.stock} in stock`}
                </div>
              </div>
              <Plus className="h-5 w-5 text-primary" />
            </button>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-16 inset-x-0 z-20 bg-card border-t border-border shadow-xl">
          <div className="max-w-md mx-auto px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
            {cart.map((i) => (
              <div key={i.product_id} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="text-sm font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {fmtKsh(i.unit_price * i.quantity)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setQty(i.product_id, i.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">
                    {i.quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    onClick={() => setQty(i.product_id, i.quantity + 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">{fmtKsh(total)}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Customer M-Pesa phone</Label>
              <Input
                id="phone"
                inputMode="tel"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={submitSale}
              disabled={submitting}
            >
              {submitting ? "Sending…" : `Send M-Pesa request · ${fmtKsh(total)}`}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={pinOpen} onOpenChange={setPinOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Enter your sales PIN</DialogTitle>
          </DialogHeader>
          <Input
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            autoFocus
            placeholder="••••"
            className="text-center text-2xl tracking-widest"
          />
          <Button onClick={submitPin} disabled={pin.length !== 4}>
            Verify
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResultScreen({
  ok,
  total,
  items,
  phone,
  onDone,
  onCancel,
}: {
  ok: boolean;
  total: number;
  items: CartItem[];
  phone: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="max-w-md mx-auto px-4 pt-10 text-center">
      <div
        className={`h-16 w-16 rounded-full mx-auto flex items-center justify-center mb-4 ${
          ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        }`}
      >
        {ok ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
      </div>
      <h2 className="text-xl font-bold mb-1">
        {ok ? "Payment received!" : "Payment failed"}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        {ok ? `from ${phone}` : "Customer did not complete the payment"}
      </p>
      <div className="bg-card border border-border rounded-2xl p-4 text-left mb-4">
        {items.map((i) => (
          <div key={i.product_id} className="flex justify-between text-sm py-1">
            <span>
              {i.name} × {i.quantity}
            </span>
            <span>{fmtKsh(i.unit_price * i.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold pt-2 mt-1 border-t border-border">
          <span>Total</span>
          <span>{fmtKsh(total)}</span>
        </div>
      </div>
      <div className="space-y-2">
        <Button className="w-full" onClick={onDone}>
          {ok ? "Done" : "Try again"}
        </Button>
        {onCancel && (
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
