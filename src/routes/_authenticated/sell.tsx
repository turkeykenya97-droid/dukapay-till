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
  AlertTriangle,
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
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<"completed" | "failed" | null>(null);
  const [paymentTimeout, setPaymentTimeout] = useState(false);

  useEffect(() => {
    shopFn({ data: undefined }).then((shop) => {
      if (!shop?.pin_session_valid) setPinOpen(true);
    });
  }, [shopFn]);

  // Set 2-minute timeout for payment confirmation
  useEffect(() => {
    if (!pendingSaleId || finalStatus !== null || paymentTimeout) return;
    const timer = setTimeout(() => {
      setPaymentTimeout(true);
    }, 120_000); // 2 minutes
    return () => clearTimeout(timer);
  }, [pendingSaleId, finalStatus, paymentTimeout]);

  const { data: saleStatus } = useQuery({
    queryKey: ["sale-status", pendingSaleId],
    queryFn: async () => {
      try {
        const result = await getStatus({ data: { id: pendingSaleId! } });
        return result;
      } catch (err) {
        console.error("[sell:polling]", err);
        // Return pending state on error so polling continues
        return {
          id: pendingSaleId,
          total_amount: 0,
          cash_paid: 0,
          mpesa_amount: 0,
          customer_phone: "",
          payment_status: "pending",
          sold_at: new Date().toISOString(),
        };
      }
    },
    enabled: !!pendingSaleId && finalStatus === null && !paymentTimeout,
    refetchInterval: 3000,
  });

  // Handle sale status changes when polling updates
  useEffect(() => {
    if (!saleStatus || finalStatus !== null) return;
    try {
      if (saleStatus.payment_status === "completed" || saleStatus.payment_status === "failed") {
        setFinalStatus(saleStatus.payment_status);
        if (saleStatus.payment_status === "completed") {
          qc.invalidateQueries({ queryKey: ["products"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          qc.invalidateQueries({ queryKey: ["analytics"] });
          qc.invalidateQueries({ queryKey: ["history"] });
        }
      }
    } catch (err) {
      console.error("[sell:status-handler]", err);
    }
  }, [saleStatus, finalStatus, qc]);

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

  const addInventoryItem = (p: { id: string; name: string; price: number; stock: number }) => {
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
    setPaymentTimeout(false);
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

  if (paymentTimeout && !finalStatus) {
    return (
      <PendingTimeoutScreen
        mpesaAmount={mpesaAmount}
        phone={phone}
        onDone={() => {
          resetSale();
          navigate({ to: "/dashboard" });
        }}
        onCancel={handleCancel}
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
              onReadyToSubmit={() => setPhoneOpen(true)}
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
            setPhoneOpen={setPhoneOpen}
          />
        )}
      </div>

      <Dialog open={phoneOpen} onOpenChange={setPhoneOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter Customer Phone Number</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Enter the customer's M-Pesa phone number to send the payment request.
          </p>
          <Input
            inputMode="tel"
            placeholder="07XX XXX XXX or +254..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
            className="text-lg"
          />
          <Button
            onClick={() => {
              if (!/^(\+?254|0)\d{9}$/.test(phone.replace(/\s+/g, ""))) {
                toast.error("Enter a valid Kenyan phone number");
                return;
              }
              setPhoneOpen(false);
              submitSale();
            }}
            className="w-full"
            disabled={!phone}
          >
            Send M-Pesa Request
          </Button>
        </DialogContent>
      </Dialog>

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
  products: Array<{ id: string; name: string; price: number; stock: number } & Record<string, unknown>>;
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
  onReadyToSubmit,
}: {
  cart: CartItem[];
  total: number;
  onAdd: (amount: number) => void;
  onClearAll: () => void;
  onRemove: (key: string) => void;
  onReadyToSubmit?: () => void;
}) {
  const [display, setDisplay] = useState("0");
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);
  const calcEntries = cart.filter((i) => i.name === "Calculator Entry");

  const calculate = (a: number, op: string, b: number): number => {
    switch (op) {
      case "+":
        return a + b;
      case "−":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b === 0 ? a : a / b;
      default:
        return b;
    }
  };

  const press = (k: string) => {
    // Clear all
    if (k === "C") {
      setDisplay("0");
      setAccumulator(null);
      setOperator(null);
      setNewNumber(true);
      onClearAll();
      return;
    }

    // Backspace
    if (k === "⌫") {
      if (display === "0" || display === "") {
        return;
      }
      const newDisplay = display.slice(0, -1) || "0";
      setDisplay(newDisplay);
      setNewNumber(false);
      return;
    }

    // Decimal point
    if (k === ".") {
      if (display.includes(".")) return;
      const newDisplay = newNumber ? "0." : display + ".";
      setDisplay(newDisplay);
      setNewNumber(false);
      return;
    }

    // Operators: +, −, ×, ÷
    if (["+", "−", "×", "÷"].includes(k)) {
      const currentValue = parseFloat(display);

      if (accumulator !== null && operator && !newNumber) {
        // Chain calculation: 5 + 3 + = should calculate 5+3 first
        const result = calculate(accumulator, operator, currentValue);
        setDisplay(String(Math.round(result * 100) / 100));
        setAccumulator(result);
      } else {
        setAccumulator(currentValue);
      }

      setOperator(k);
      setNewNumber(true);
      return;
    }

    // Equals button
    if (k === "=") {
      const currentValue = parseFloat(display);

      if (accumulator !== null && operator) {
        const result = calculate(accumulator, operator, currentValue);
        const finalResult = Math.round(result * 100) / 100;

        // Check if result is valid
        if (finalResult > 0 && finalResult <= M_PESA_MAX) {
          setDisplay(String(finalResult));
          onAdd(finalResult);
          setAccumulator(null);
          setOperator(null);
          setNewNumber(true);
          onReadyToSubmit?.();
        } else {
          setDisplay("Error");
          setTimeout(() => setDisplay("0"), 1500);
        }
      }
      return;
    }

    // Number buttons (0-9)
    if (/^\d$/.test(k)) {
      let newDisplay = newNumber ? k : display + k;

      // Remove leading zero if not decimal
      newDisplay = newDisplay.replace(/^0(?=\d)/, "");

      // Check max value
      if (parseFloat(newDisplay) > M_PESA_MAX) {
        return;
      }

      setDisplay(newDisplay);
      setNewNumber(false);
    }
  };

  // Format display for readability
  const displayValue = (() => {
    const num = parseFloat(display);
    if (isNaN(num)) return display;
    if (display === "" || display === "0") return "0";
    // Show at most 2 decimal places
    return display.includes(".") ? display : String(num);
  })();

  const keys: { label: string; cls: string; icon?: string }[] = [
    { label: "7", cls: "bg-background hover:bg-muted" },
    { label: "8", cls: "bg-background hover:bg-muted" },
    { label: "9", cls: "bg-background hover:bg-muted" },
    { label: "÷", cls: "bg-blue-500 text-white hover:bg-blue-600" },
    { label: "4", cls: "bg-background hover:bg-muted" },
    { label: "5", cls: "bg-background hover:bg-muted" },
    { label: "6", cls: "bg-background hover:bg-muted" },
    { label: "×", cls: "bg-blue-500 text-white hover:bg-blue-600" },
    { label: "1", cls: "bg-background hover:bg-muted" },
    { label: "2", cls: "bg-background hover:bg-muted" },
    { label: "3", cls: "bg-background hover:bg-muted" },
    { label: "−", cls: "bg-blue-500 text-white hover:bg-blue-600" },
    { label: "0", cls: "bg-background hover:bg-muted col-span-2" },
    { label: ".", cls: "bg-background hover:bg-muted" },
    { label: "+", cls: "bg-blue-500 text-white hover:bg-blue-600" },
    { label: "⌫", cls: "bg-orange-100 text-orange-700 hover:bg-orange-200" },
    { label: "C", cls: "bg-destructive/20 text-destructive hover:bg-destructive/30" },
    { label: "=", cls: "bg-green-500 text-white hover:bg-green-600 col-span-2 font-bold text-lg" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4 h-fit">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Scientific Calculator</div>
      </div>

      {/* Display screen */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 min-h-[100px] flex flex-col justify-end">
        <div className="text-right text-6xl font-mono font-bold text-white tabular-nums break-all leading-tight">
          {displayValue}
        </div>
        {operator && (
          <div className="text-right text-sm text-blue-300 mt-2">
            {accumulator} {operator}
          </div>
        )}
      </div>

      {/* Total summary */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="text-xs text-green-700 uppercase tracking-wide font-semibold">Cart Total</div>
        <div className="text-3xl font-bold text-green-700 tabular-nums">{fmtKsh(total)}</div>
      </div>

      {/* Entries list */}
      {calcEntries.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
          <div className="text-xs font-semibold text-muted-foreground uppercase">Added amounts:</div>
          {calcEntries.map((e) => (
            <div
              key={e.key}
              className="flex items-center justify-between text-sm bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-border"
            >
              <span className="font-medium">{fmtKsh(e.unit_price)}</span>
              <button
                onClick={() => onRemove(e.key)}
                className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                title="Remove this amount"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Calculator grid - 4 columns */}
      <div className="grid grid-cols-4 gap-2">
        {/* Row 1: 7 8 9 ÷ */}
        {keys.slice(0, 4).map((k) => (
          <button
            key={k.label}
            onClick={() => press(k.label)}
            className={`${k.cls} border-2 border-border rounded-lg font-bold h-14 flex items-center justify-center active:scale-95 transition-all duration-75 text-lg`}
          >
            {k.label}
          </button>
        ))}

        {/* Row 2: 4 5 6 × */}
        {keys.slice(4, 8).map((k) => (
          <button
            key={k.label}
            onClick={() => press(k.label)}
            className={`${k.cls} border-2 border-border rounded-lg font-bold h-14 flex items-center justify-center active:scale-95 transition-all duration-75 text-lg`}
          >
            {k.label}
          </button>
        ))}

        {/* Row 3: 1 2 3 − */}
        {keys.slice(8, 12).map((k) => (
          <button
            key={k.label}
            onClick={() => press(k.label)}
            className={`${k.cls} border-2 border-border rounded-lg font-bold h-14 flex items-center justify-center active:scale-95 transition-all duration-75 text-lg`}
          >
            {k.label}
          </button>
        ))}

        {/* Row 4: 0 (2 cols) . + */}
        <button
          onClick={() => press("0")}
          className="col-span-2 bg-background hover:bg-muted border-2 border-border rounded-lg font-bold h-14 flex items-center justify-center active:scale-95 transition-all duration-75 text-lg"
        >
          0
        </button>
        <button
          onClick={() => press(".")}
          className="bg-background hover:bg-muted border-2 border-border rounded-lg font-bold h-14 flex items-center justify-center active:scale-95 transition-all duration-75 text-lg"
        >
          .
        </button>
        <button
          onClick={() => press("+")}
          className="bg-blue-500 text-white hover:bg-blue-600 border-2 border-border rounded-lg font-bold h-14 flex items-center justify-center active:scale-95 transition-all duration-75 text-lg"
        >
          +
        </button>

        {/* Row 5: Backspace C Equals (2 cols) */}
        <button
          onClick={() => press("⌫")}
          className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-2 border-border rounded-lg font-bold h-14 flex items-center justify-center active:scale-95 transition-all duration-75"
        >
          ⌫
        </button>
        <button
          onClick={() => press("C")}
          className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-2 border-border rounded-lg font-bold h-14 flex items-center justify-center active:scale-95 transition-all duration-75"
        >
          C
        </button>
        <button
          onClick={() => press("=")}
          className="col-span-2 bg-green-500 text-white hover:bg-green-600 border-2 border-border rounded-lg font-bold h-14 flex items-center justify-center active:scale-95 transition-all duration-75 text-lg"
          title="Calculate and add to cart. Then click 'Send M-Pesa request'"
        >
          =
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          <strong>How to use:</strong> Type numbers, use operators (+ − × ÷), press <span className="font-mono bg-white px-1 rounded">=</span> to calculate and add to cart.
        </p>
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
  setPhoneOpen?: (b: boolean) => void;
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
  setPhoneOpen,
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
  setPhoneOpen?: (b: boolean) => void;
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
        onClick={() => setPhoneOpen?.(true)}
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

function PendingTimeoutScreen({
  mpesaAmount,
  phone,
  onDone,
  onCancel,
}: {
  mpesaAmount: number;
  phone: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="max-w-md mx-auto px-4 pt-10 text-center">
      <div className="h-16 w-16 rounded-full mx-auto flex items-center justify-center mb-4 bg-warning/10 text-warning-foreground animate-pulse">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold mb-1">Payment pending</h2>
      <p className="text-sm text-muted-foreground mb-6">
        We haven't received confirmation yet. Check M-Pesa on <strong>{phone}</strong> for the payment prompt or confirmation.
      </p>
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6 text-left">
        <p className="text-sm text-warning-foreground mb-2">
          <strong>What to do:</strong>
        </p>
        <ul className="text-xs text-warning-foreground/80 space-y-1">
          <li>✓ If prompted on phone, enter your M-Pesa PIN to confirm</li>
          <li>✓ Once confirmed, check back here</li>
          <li>✓ Payment status will update automatically</li>
        </ul>
      </div>
      <div className="bg-card border border-border rounded-lg p-3 mb-6 text-left">
        <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-2">Amount</div>
        <div className="text-2xl font-bold">{fmtKsh(mpesaAmount)}</div>
      </div>
      <div className="space-y-2">
        <Button className="w-full" onClick={onDone}>
          Done — Check back later
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
