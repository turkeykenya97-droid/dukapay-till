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
import { createSale, getSaleStatus, cancelSale } from "@/lib/sales.functions";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Search,
  Package,
  ChevronDown,
  Wallet,
} from "lucide-react";
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
  const cancel = useServerFn(cancelSale);
  const shopFn = useServerFn(getCurrentShop);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [cashOpen, setCashOpen] = useState(false);
  const [cashPaid, setCashPaid] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<"completed" | "failed" | null>(null);

  useEffect(() => {
    shopFn({ data: undefined }).then((shop) => {
      if (!shop?.pin_session_valid) setPinOpen(true);
    });
  }, [shopFn]);

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
          qc.invalidateQueries({ queryKey: ["analytics"] });
        }
      }
      return s;
    },
  });

  const total = useMemo(
    () => cart.reduce((s, i) => s + i.unit_price * i.quantity, 0),
    [cart]
  );

  const cashNum = Math.max(0, Math.min(Number(cashPaid) || 0, total));
  const mpesaAmount = Math.max(0, total - cashNum);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

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
    if (cashNum >= total)
      return toast.error("Cash covers full amount — no M-Pesa needed");
    setSubmitting(true);
    try {
      const res = await create({
        data: {
          customer_phone: phone,
          cash_paid: cashNum,
          items: cart.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
          })),
        },
      });
      setPendingSaleId(res.sale_id);
      toast.success(`M-Pesa request for ${fmtKsh(res.mpesa_amount)} sent`);
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

  const resetSale = () => {
    setCart([]);
    setPhone("");
    setCashPaid("");
    setCashOpen(false);
    setFinalStatus(null);
    setPendingSaleId(null);
  };

  const handleCancel = async () => {
    if (pendingSaleId) {
      try {
        await cancel({ data: { id: pendingSaleId } });
      } catch (e) {
        // Already settled is fine; just toast on real errors
        const msg = (e as Error).message;
        if (!msg.includes("Completed")) toast.error(msg);
      }
      qc.invalidateQueries({ queryKey: ["history"] });
    }
    resetSale();
  };

  // Result screens
  if (finalStatus === "completed") {
    return (
      <ResultScreen
        ok
        total={total}
        cashPaid={cashNum}
        mpesaAmount={mpesaAmount}
        onDone={() => {
          resetSale();
          navigate({ to: "/dashboard" });
        }}
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
        cashPaid={cashNum}
        mpesaAmount={mpesaAmount}
        onDone={() => {
          setFinalStatus(null);
          setPendingSaleId(null);
        }}
        onCancel={handleCancel}
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
        <p className="text-sm text-muted-foreground mb-2">
          Customer is approving M-Pesa on their phone.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Amount: <strong>{fmtKsh(mpesaAmount)}</strong>
        </p>
        <Button variant="outline" onClick={handleCancel}>
          Cancel sale
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6 pb-72 lg:pb-6">
      <h1 className="text-2xl font-bold mb-4">New sale</h1>

      <div className="lg:grid lg:grid-cols-5 lg:gap-6">
        {/* Product list */}
        <div className="lg:col-span-3">
          <div className="relative mb-3">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-2xl">
              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? `No products found matching "${search}"`
                  : "No products yet. Add some on the Products page."}
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0">
              {filteredProducts.map((p) => {
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
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {fmtKsh(p.price)} · {out ? "Out of stock" : `${p.stock} in stock`}
                      </div>
                    </div>
                    <Plus className="h-5 w-5 text-primary shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <CartPanel
            cart={cart}
            total={total}
            phone={phone}
            setPhone={setPhone}
            setQty={setQty}
            cashOpen={cashOpen}
            setCashOpen={setCashOpen}
            cashPaid={cashPaid}
            setCashPaid={setCashPaid}
            cashNum={cashNum}
            mpesaAmount={mpesaAmount}
            submitting={submitting}
            onSubmit={submitSale}
          />
        )}
      </div>

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

function CartPanel(props: {
  cart: CartItem[];
  total: number;
  phone: string;
  setPhone: (s: string) => void;
  setQty: (id: string, q: number) => void;
  cashOpen: boolean;
  setCashOpen: (b: boolean) => void;
  cashPaid: string;
  setCashPaid: (s: string) => void;
  cashNum: number;
  mpesaAmount: number;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const {
    cart, total, phone, setPhone, setQty,
    cashOpen, setCashOpen, cashPaid, setCashPaid,
    cashNum, mpesaAmount, submitting, onSubmit,
  } = props;

  return (
    <>
      {/* Mobile: fixed bottom panel; Desktop: side panel */}
      <div className="lg:hidden fixed bottom-16 inset-x-0 z-20 bg-card border-t border-border shadow-xl">
        <div className="max-w-md mx-auto px-4 py-3">
          <CartInner
            cart={cart} total={total} phone={phone} setPhone={setPhone} setQty={setQty}
            cashOpen={cashOpen} setCashOpen={setCashOpen} cashPaid={cashPaid} setCashPaid={setCashPaid}
            cashNum={cashNum} mpesaAmount={mpesaAmount} submitting={submitting} onSubmit={onSubmit}
            scrollable
          />
        </div>
      </div>
      <div className="hidden lg:block lg:col-span-2">
        <div className="sticky top-4 bg-card border border-border rounded-2xl p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Cart
          </h2>
          <CartInner
            cart={cart} total={total} phone={phone} setPhone={setPhone} setQty={setQty}
            cashOpen={cashOpen} setCashOpen={setCashOpen} cashPaid={cashPaid} setCashPaid={setCashPaid}
            cashNum={cashNum} mpesaAmount={mpesaAmount} submitting={submitting} onSubmit={onSubmit}
          />
        </div>
      </div>
    </>
  );
}

function CartInner(props: {
  cart: CartItem[];
  total: number;
  phone: string;
  setPhone: (s: string) => void;
  setQty: (id: string, q: number) => void;
  cashOpen: boolean;
  setCashOpen: (b: boolean) => void;
  cashPaid: string;
  setCashPaid: (s: string) => void;
  cashNum: number;
  mpesaAmount: number;
  submitting: boolean;
  onSubmit: () => void;
  scrollable?: boolean;
}) {
  const {
    cart, total, phone, setPhone, setQty,
    cashOpen, setCashOpen, cashPaid, setCashPaid,
    cashNum, mpesaAmount, submitting, onSubmit, scrollable,
  } = props;

  return (
    <div className={`space-y-2 ${scrollable ? "max-h-80 overflow-y-auto" : ""}`}>
      {cart.map((i) => (
        <div key={i.product_id} className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{i.name}</div>
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
            <span className="w-6 text-center text-sm font-medium">{i.quantity}</span>
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

      <Collapsible open={cashOpen} onOpenChange={setCashOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between text-sm text-primary hover:underline py-1"
          >
            <span className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4" />
              {cashOpen ? "Cash payment" : "+ Cash payment (optional)"}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${cashOpen ? "rotate-180" : ""}`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <Label htmlFor="cash">Cash amount (Ksh)</Label>
          <Input
            id="cash"
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            placeholder="0"
            value={cashPaid}
            onChange={(e) => setCashPaid(e.target.value)}
          />
          {cashNum > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Cash: {fmtKsh(cashNum)}</span>
              <span>M-Pesa: {fmtKsh(mpesaAmount)}</span>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Button className="w-full" size="lg" onClick={onSubmit} disabled={submitting}>
        {submitting
          ? "Sending…"
          : `Send M-Pesa request · ${fmtKsh(mpesaAmount > 0 ? mpesaAmount : total)}`}
      </Button>
    </div>
  );
}

function ResultScreen({
  ok,
  total,
  cashPaid,
  mpesaAmount,
  items,
  phone,
  onDone,
  onCancel,
}: {
  ok: boolean;
  total: number;
  cashPaid: number;
  mpesaAmount: number;
  items: CartItem[];
  phone: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="max-w-md mx-auto px-4 pt-10 text-center relative">
      {ok && <SuccessConfetti />}
      <div
        className={`h-16 w-16 rounded-full mx-auto flex items-center justify-center mb-4 animate-scale-in ${
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
            <span>{i.name} × {i.quantity}</span>
            <span>{fmtKsh(i.unit_price * i.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold pt-2 mt-1 border-t border-border">
          <span>Total</span>
          <span>{fmtKsh(total)}</span>
        </div>
        {cashPaid > 0 && (
          <>
            <div className="flex justify-between text-sm text-muted-foreground pt-1">
              <span>Cash paid</span>
              <span>{fmtKsh(cashPaid)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>M-Pesa</span>
              <span>{fmtKsh(mpesaAmount)}</span>
            </div>
          </>
        )}
      </div>
      <div className="space-y-2">
        <Button className="w-full" onClick={onDone}>
          {ok ? "Done" : "Try again"}
        </Button>
        {onCancel && (
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Cancel sale
          </Button>
        )}
      </div>
    </div>
  );
}

function SuccessConfetti() {
  // Lightweight CSS confetti — disappears after ~2s
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  const colors = ["#00a884", "#22c55e", "#f59e0b", "#3b82f6", "#ef4444"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => (
        <span
          key={i}
          className="absolute top-0 block h-2 w-2 rounded-sm animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${Math.random() * 0.3}s`,
            animationDuration: `${1.2 + Math.random() * 0.8}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}
