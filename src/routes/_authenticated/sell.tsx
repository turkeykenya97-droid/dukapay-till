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
  Zap,
  Calculator as CalculatorIcon,
  X,
} from "lucide-react";
import { fmtKsh } from "@/lib/format";

const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: () => listProducts(),
  staleTime: 2 * 60 * 1000,
});

export const Route = createFileRoute("/_authenticated/sell")({
  head: () => ({ meta: [{ title: "New sale — DukaPOS" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: SellPage,
});

const M_PESA_MAX = 150_000;

type CartItem = {
  key: string;
  product_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
  stock?: number;
};

type Tab = "inventory" | "quick" | "calc";

function SellPage() {
  const navigate = useNavigate();
  const { data: products } = useSuspenseQuery(productsQuery);
  const qc = useQueryClient();
  const verify = useServerFn(verifyPin);
  const create = useServerFn(createSale);
  const getStatus = useServerFn(getSaleStatus);
  const cancel = useServerFn(cancelSale);
  const shopFn = useServerFn(getCurrentShop);

  const [tab, setTab] = useState<Tab>("inventory");
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
          qc.invalidateQueries({ queryKey: ["history"] });
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

  const addInventoryItem = (p: (typeof products)[number]) => {
    setCart((c) => {
      const existing = c.find((i) => i.product_id === p.id);
      if (existing) {
        if (existing.stock !== undefined && existing.quantity >= existing.stock) {
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
          key: `inv-${p.id}`,
          product_id: p.id,
          name: p.name,
          unit_price: Number(p.price),
          stock: p.stock,
          quantity: 1,
        },
      ];
    });
  };

  const addManualItem = (name: string, price: number) => {
    if (price <= 0) return;
    if (total + price > M_PESA_MAX) {
      toast.error(`Max ${fmtKsh(M_PESA_MAX)} per sale`);
      return;
    }
    setCart((c) => [
      ...c,
      {
        key: `man-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product_id: null,
        name,
        unit_price: price,
        quantity: 1,
      },
    ]);
  };

  const setQty = (key: string, q: number) => {
    setCart((c) =>
      q <= 0
        ? c.filter((i) => i.key !== key)
        : c.map((i) =>
            i.key === key
              ? { ...i, quantity: i.stock !== undefined ? Math.min(q, i.stock) : q }
              : i
          )
    );
  };

  const removeItem = (key: string) => setCart((c) => c.filter((i) => i.key !== key));

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
    if (total > M_PESA_MAX) return toast.error(`Max ${fmtKsh(M_PESA_MAX)}`);
    if (cashNum >= total)
      return toast.error("Cash covers full amount — no M-Pesa needed");
    setSubmitting(true);
    try {
      const res = await create({
        data: {
          customer_phone: phone,
          cash_paid: cashNum,
          items: cart.map((i) =>
            i.product_id
              ? { product_id: i.product_id, quantity: i.quantity }
              : { name: i.name, unit_price: i.unit_price, quantity: i.quantity }
          ),
        },
      });
      setPendingSaleId(res.sale_id);
      toast.success(`M-Pesa request for ${fmtKsh(res.mpesa_amount)} sent`);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "PIN_REQUIRED") setPinOpen(true);
      else toast.error(msg);
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
        const msg = (e as Error).message;
        if (!msg.includes("Completed")) toast.error(msg);
      }
      qc.invalidateQueries({ queryKey: ["history"] });
    }
    resetSale();
  };

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

  const tabs: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: "inventory", label: "Inventory", icon: Package },
    { id: "quick", label: "Quick", icon: Zap },
    { id: "calc", label: "Calc", icon: CalculatorIcon },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6 pb-72 lg:pb-6">
      <h1 className="text-2xl font-bold mb-4">New sale</h1>

      <div className="flex gap-2 mb-4 bg-muted p-1 rounded-xl w-fit">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {cart.length > 0 && t.id === tab && (
                <span className="ml-1 text-[10px] bg-white/20 px-1.5 rounded-full">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="lg:grid lg:grid-cols-5 lg:gap-6">
        <div className="lg:col-span-3">
          {tab === "inventory" && (
            <InventoryPane
              products={filteredProducts}
              search={search}
              setSearch={setSearch}
              onAdd={addInventoryItem}
            />
          )}
          {tab === "quick" && <QuickPane onAdd={addManualItem} />}
          {tab === "calc" && (
            <CalculatorPane
              cart={cart}
              total={total}
              onAdd={(amount) => addManualItem("Calculator Entry", amount)}
              onClearAll={() => setCart((c) => c.filter((i) => i.name !== "Calculator Entry"))}
              onRemove={removeItem}
            />
          )}
        </div>

        {cart.length > 0 && (
          <CartPanel
            cart={cart}
            total={total}
            phone={phone}
            setPhone={setPhone}
            setQty={setQty}
            removeItem={removeItem}
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

function InventoryPane({
  products,
  search,
  setSearch,
  onAdd,
}: {
  products: { id: string; name: string; price: number; stock: number }[];
  search: string;
  setSearch: (s: string) => void;
  onAdd: (p: { id: string; name: string; price: number; stock: number }) => void;
}) {
  return (
    <>
      <div className="relative mb-3">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {products.length === 0 ? (
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
          {products.map((p) => {
            const out = p.stock < 1;
            return (
              <button
                key={p.id}
                disabled={out}
                onClick={() => onAdd(p)}
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
    </>
  );
}

function QuickPane({ onAdd }: { onAdd: (name: string, price: number) => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const submit = () => {
    const n = name.trim() || "Quick Sale";
    const p = Number(price);
    if (!p || p <= 0) return toast.error("Enter a valid price");
    onAdd(n, p);
    setName("");
    setPrice("");
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <h2 className="font-semibold">Quick sale</h2>
      <p className="text-sm text-muted-foreground">
        Add a one-off item without saving to inventory.
      </p>
      <div className="space-y-2">
        <Label htmlFor="qs-name">Item name (optional)</Label>
        <Input
          id="qs-name"
          placeholder="e.g. Soda"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="qs-price">Price (Ksh)</Label>
        <Input
          id="qs-price"
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <Button className="w-full" onClick={submit}>
        <Plus className="h-4 w-4" /> Add to cart
      </Button>
    </div>
  );
}

function CalculatorPane({
  cart,
  total,
  onAdd,
  onClearAll,
  onRemove,
}: {
  cart: CartItem[];
  total: number;
  onAdd: (amount: number) => void;
  onClearAll: () => void;
  onRemove: (key: string) => void;
}) {
  const [display, setDisplay] = useState("");
  const calcEntries = cart.filter((i) => i.name === "Calculator Entry");

  const press = (k: string) => {
    if (k === "C") {
      setDisplay("");
      onClearAll();
      return;
    }
    if (k === "⌫") {
      setDisplay((d) => d.slice(0, -1));
      return;
    }
    if (k === "+") {
      const v = Number(display);
      if (!v || v <= 0) return;
      onAdd(Math.round(v * 100) / 100);
      setDisplay("");
      return;
    }
    if (k === "=") {
      const v = Number(display);
      if (v > 0) {
        onAdd(Math.round(v * 100) / 100);
        setDisplay("");
      }
      return;
    }
    if (k === ".") {
      if (display.includes(".")) return;
      setDisplay((d) => (d === "" ? "0." : d + "."));
      return;
    }
    // digit
    setDisplay((d) => {
      const next = (d + k).replace(/^0(?=\d)/, "");
      if (Number(next) > M_PESA_MAX) return d;
      return next;
    });
  };

  const keys: { label: string; cls: string }[] = [
    { label: "1", cls: "bg-background" },
    { label: "2", cls: "bg-background" },
    { label: "3", cls: "bg-background" },
    { label: "+", cls: "bg-primary text-primary-foreground" },
    { label: "4", cls: "bg-background" },
    { label: "5", cls: "bg-background" },
    { label: "6", cls: "bg-background" },
    { label: "⌫", cls: "bg-muted" },
    { label: "7", cls: "bg-background" },
    { label: "8", cls: "bg-background" },
    { label: "9", cls: "bg-background" },
    { label: "C", cls: "bg-destructive text-destructive-foreground" },
    { label: ".", cls: "bg-background" },
    { label: "0", cls: "bg-background" },
    { label: "=", cls: "bg-primary text-primary-foreground col-span-2" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="text-center">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
        <div className="text-4xl font-bold tabular-nums">{fmtKsh(total)}</div>
      </div>

      <div className="bg-muted/50 rounded-xl p-3 min-h-[60px]">
        <div className="text-right text-2xl font-mono tabular-nums break-all">
          {display || "0"}
        </div>
      </div>

      {calcEntries.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
          {calcEntries.map((e) => (
            <div
              key={e.key}
              className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-1.5"
            >
              <span>+ {fmtKsh(e.unit_price)}</span>
              <button
                onClick={() => onRemove(e.key)}
                className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2" style={{ willChange: "transform" }}>
        {keys.map((k) => (
          <button
            key={k.label}
            onClick={() => press(k.label)}
            className={`${k.cls} border border-border rounded-xl text-xl font-semibold h-[60px] flex items-center justify-center active:scale-95 transition-transform`}
          >
            {k.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CartPanel(props: {
  cart: CartItem[];
  total: number;
  phone: string;
  setPhone: (s: string) => void;
  setQty: (key: string, q: number) => void;
  removeItem: (key: string) => void;
  cashOpen: boolean;
  setCashOpen: (b: boolean) => void;
  cashPaid: string;
  setCashPaid: (s: string) => void;
  cashNum: number;
  mpesaAmount: number;
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="lg:hidden fixed bottom-16 inset-x-0 z-20 bg-card border-t border-border shadow-xl">
        <div className="max-w-md mx-auto px-4 py-3">
          <CartInner {...props} scrollable />
        </div>
      </div>
      <div className="hidden lg:block lg:col-span-2">
        <div className="sticky top-4 bg-card border border-border rounded-2xl p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Cart
          </h2>
          <CartInner {...props} />
        </div>
      </div>
    </>
  );
}

function CartInner({
  cart,
  total,
  phone,
  setPhone,
  setQty,
  removeItem,
  cashOpen,
  setCashOpen,
  cashPaid,
  setCashPaid,
  cashNum,
  mpesaAmount,
  submitting,
  onSubmit,
  scrollable,
}: {
  cart: CartItem[];
  total: number;
  phone: string;
  setPhone: (s: string) => void;
  setQty: (key: string, q: number) => void;
  removeItem: (key: string) => void;
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
  return (
    <div className={`space-y-2 ${scrollable ? "max-h-80 overflow-y-auto" : ""}`}>
      {cart.map((i) => (
        <div key={i.key} className="flex items-center gap-2">
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
              onClick={() => setQty(i.key, i.quantity - 1)}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-6 text-center text-sm font-medium">{i.quantity}</span>
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7"
              onClick={() => setQty(i.key, i.quantity + 1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => removeItem(i.key)}
            >
              <X className="h-3 w-3" />
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

      <Button
        className="w-full"
        size="lg"
        onClick={onSubmit}
        disabled={submitting || total <= 0}
      >
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
          <div key={i.key} className="flex justify-between text-sm py-1">
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
