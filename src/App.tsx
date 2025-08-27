import React, { useMemo, useState } from "react";

/* =========================
   Helpers
   ========================= */
const currency = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(Number(n || 0));
const todayISO = () => new Date().toISOString().slice(0, 10);
const sameMonth = (iso: string) => {
  const d = new Date(iso);
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
};
const daysBetween = (a: string, b: string) =>
  Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));

/* =========================
   Categories (hierarchical)
   ========================= */
// main category -> subcategories
export const CATEGORY_GROUPS: Record<string, readonly string[]> = {
  // single-level categories
  Essay: [],
  Misc: [],
  "Shipping.Courier": [],

  // Medical with subs
  Medical: [
    "AMH",
    "Genetic test",
    "Hormones from stash",
    "lab work",
    "Meds.Hormones",
    "Psych",
    "Scans",
  ],

  // Travel with subs
  Travel: [
    "Accommodation",
    "Flight",
    "Baggage",
    "Companion flight",
    "rebooking",
    "Ground Transport",
    "Meals",
    "Shuttle to&from airport",
    "Stipend.Meals.Taxi.Petrol",
    "Support Person",
    "Travel Insurance",
    "Visa",
  ],
};
export const MAIN_CATEGORIES = Object.keys(CATEGORY_GROUPS) as (keyof typeof CATEGORY_GROUPS)[];

/** Suggest a main/subcategory from free-text notes */
const suggestCategory = (desc = ""): { main: string; sub?: string } => {
  const d = desc.toLowerCase();
  const match = (re: RegExp) => re.test(d);

  // Travel
  if (match(/(accommodation|hotel|airbnb|lodging)/)) return { main: "Travel", sub: "Accommodation" };
  if (match(/(flight|airfare|ticket)/))              return { main: "Travel", sub: "Flight" };
  if (match(/(baggage|luggage)/))                   return { main: "Travel", sub: "Baggage" };
  if (match(/companion/))                           return { main: "Travel", sub: "Companion flight" };
  if (match(/(rebook|change fee|rebooking)/))       return { main: "Travel", sub: "rebooking" };
  if (match(/(ground transport|car hire|rental car|transport)/)) return { main: "Travel", sub: "Ground Transport" };
  if (match(/(meal|food|dinner|lunch|breakfast)/))  return { main: "Travel", sub: "Meals" };
  if (match(/(shuttle).*airport|airport shuttle/))  return { main: "Travel", sub: "Shuttle to&from airport" };
  if (match(/(taxi|uber|lyft|petrol|gas)/))         return { main: "Travel", sub: "Stipend.Meals.Taxi.Petrol" };
  if (match(/(support person|chaperone)/))          return { main: "Travel", sub: "Support Person" };
  if (match(/(travel).*insurance|insurance/))       return { main: "Travel", sub: "Travel Insurance" };
  if (match(/visa/))                                return { main: "Travel", sub: "Visa" };

  // Medical
  if (match(/\bamh\b/i))                             return { main: "Medical", sub: "AMH" };
  if (match(/(genetic|karyotype|carrier)/))          return { main: "Medical", sub: "Genetic test" };
  if (match(/(hormone).*(stash)|from stash/))        return { main: "Medical", sub: "Hormones from stash" };
  if (match(/(hormone|progesterone|estradiol|meds?)/)) return { main: "Medical", sub: "Meds.Hormones" };
  if (match(/(lab|blood|panel|cbc)/))                return { main: "Medical", sub: "lab work" };
  if (match(/(scan|ultrasound|mri|sonogram)/))       return { main: "Medical", sub: "Scans" };
  if (match(/(psych|counsel|therapy)/))              return { main: "Medical", sub: "Psych" };

  // Others
  if (match(/shipping|courier|fedex|dhl|ups/))       return { main: "Shipping.Courier" };
  if (match(/essay/))                                return { main: "Essay" };
  if (match(/medical|clinic|doctor|nurse/))          return { main: "Medical" };
  if (match(/travel|trip|itinerary/))                return { main: "Travel" };

  return { main: "Misc" };
};

/* =========================
   Types
   ========================= */
export type Account = { id: string; name: string; balance: number };
export type Expense = { id: string; date: string; amount: number; category: string; subCategory?: string; accountId: string; note?: string };
export type Payment = {
  id: string;
  dueDate: string;
  amount: number;
  accountId: string;
  status: "upcoming" | "completed" | "missed";
  paidOn?: string;
};
export type Case = {
  id: string;
  code: string;
  client: string;
  donor: string;
  accounts: Account[];
  expenses: Expense[];
  payments: Payment[];
};

/* =========================
   Tone presets for reminders
   ========================= */
const tonePresets = {
  polite: ({ client, amount, dueDate }: { client: string; amount: number; dueDate: string }) =>
    `Hello ${client}, just a friendly reminder that a payment of ${currency(amount)} is due on ${dueDate}. Please let us know if you need anything.`,
  urgent: ({ client, amount, dueDate }: { client: string; amount: number; dueDate: string }) =>
    `URGENT: ${client}, ${currency(amount)} was due on ${dueDate}. Please complete payment today to avoid disruptions.`,
  playful: ({ client, amount, dueDate }: { client: string; amount: number; dueDate: string }) =>
    `Hi ${client}! Your ${currency(amount)} is doing a little "due-date dance" for ${dueDate}. Mind helping it find its way to us? 💃🕺`,
};

/* =========================
   Demo / Initial State
   ========================= */
const blankCase = (): Case => ({
  id: `case-${Date.now()}`,
  code: "",
  client: "",
  donor: "",
  accounts: [],
  expenses: [],
  payments: [],
});
const initialCases: Case[] = [blankCase()];

/* =========================
   Tiny UI primitives
   ========================= */
const Card: React.FC<{ title?: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, children, style }) => (
  <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16, ...style }}>
    {title && <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>}
    {children}
  </div>
);
const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "center", gap: 8, marginBottom: 8 }}>
    <div style={{ color: "#6b7280", fontSize: 13 }}>{label}</div>
    <div>{children}</div>
  </div>
);

/* =========================
   Forms
   ========================= */
function NewCaseForm({ onCreate }: { onCreate: (payload: Partial<Case> & { accounts?: Account[] }) => void }) {
  const [client, setClient] = useState("");
  const [donor, setDonor] = useState("");
  const [code, setCode] = useState("");
  const [accountName, setAccountName] = useState("Client Escrow");
  const [balance, setBalance] = useState(0);

  return (
    <Card>
      <Row label="Client"><input value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g., The Parkers" /></Row>
      <Row label="Donor"><input value={donor} onChange={(e) => setDonor(e.target.value)} placeholder="e.g., Donor X15" /></Row>
      <Row label="Donation ID"><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., DN-000000123" /></Row>
      <Row label="Init. Account"><input value={accountName} onChange={(e) => setAccountName(e.target.value)} /></Row>
      <Row label="Start Balance"><input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))} /></Row>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() =>
            onCreate({
              client,
              donor,
              code,
              accounts: [{ id: `acc-${Date.now()}`, name: accountName, balance: Number(balance) || 0 }],
            })
          }
          style={btnPrimary}
        >
          Create
        </button>
      </div>
    </Card>
  );
}

function AddAccountForm({ onAdd }: { onAdd: (name: string, balance: number) => void }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState(0);
  return (
    <div>
      <Row label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Trust Account" /></Row>
      <Row label="Start Balance"><input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))} /></Row>
      <button style={btnPrimary} onClick={() => onAdd(name, balance)}>Add Account</button>
    </div>
  );
}

function ExpenseForm({ accounts, onAdd }: { accounts: Account[]; onAdd: (payload: Omit<Expense, "id">) => void }) {
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());
  const [mainCategory, setMainCategory] = useState<string>("");
  const [subCategory, setSubCategory] = useState<string>("");
  const [accountId] = useState<string>(accounts[0]?.id || ""); // single account per case

  const suggestion = suggestCategory(note);
  const subs = CATEGORY_GROUPS[mainCategory as keyof typeof CATEGORY_GROUPS] || [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
      <div>
        <div style={label}>Amount</div>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </div>
      <div>
        <div style={label}>Note</div>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g., Clinic ultrasound / Uber" />
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Auto-suggest: {suggestion.main}{suggestion.sub ? ` › ${suggestion.sub}` : ""}
        </div>
      </div>
      <div>
        <div style={label}>Date</div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div>
        <div style={label}>Category</div>
        <select value={mainCategory} onChange={(e) => { setMainCategory(e.target.value); setSubCategory(""); }}>
          <option value="">— Select —</option>
          {MAIN_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <div style={label}>Subcategory</div>
        <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} disabled={subs.length === 0}>
          <option value="">{subs.length ? "— Select —" : "(none)"}</option>
          {subs.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div style={{ gridColumn: "1 / -1", textAlign: "right", marginTop: 8 }}>
        <button
          style={btnPrimary}
          onClick={() => onAdd({
            amount: Number(amount) || 0,
            note,
            date,
            category: (mainCategory || suggestion.main),
            subCategory: (subCategory || suggestion.sub),
            accountId,
          })}
        >
          Add Expense
        </button>
      </div>
    </div>
  );
}

function PaymentForm({ onAdd }: { onAdd: (payload: { amount: number; dueDate: string }) => void }) {
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>(todayISO());
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
      <div>
        <div style={label}>Amount</div>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </div>
      <div>
        <div style={label}>Due date</div>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div>
        <button style={btnPrimary} onClick={() => onAdd({ amount: Number(amount) || 0, dueDate })}>Add Invoice</button>
      </div>
    </div>
  );
}

function ReceivePaymentForm({ onAdd }: { onAdd: (payload: { amount: number; paidOn: string }) => void }) {
  const [amount, setAmount] = useState<number>(0);
  const [paidOn, setPaidOn] = useState<string>(todayISO());
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
      <div>
        <div style={label}>Amount received</div>
        <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
      </div>
      <div>
        <div style={label}>Received on</div>
        <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
      </div>
      <div>
        <button style={btnPrimary} onClick={() => onAdd({ amount: Number(amount) || 0, paidOn })}>Record Payment</button>
      </div>
    </div>
  );
}

function ReminderCenter({ payments, makeText }: { payments: Payment[]; makeText: (args: { tone: keyof typeof tonePresets; payment: Payment }) => string }) {
  const [tone, setTone] = useState<keyof typeof tonePresets>("polite");
  const [selected, setSelected] = useState<Payment | null>(null);
  const eligible = payments.filter((p) => p.status !== "completed").slice(0, 6);
  const text = selected ? makeText({ tone, payment: selected }) : "Select a payment to preview reminder text.";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {eligible.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            style={{ textAlign: "left", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: selected?.id === p.id ? "#eef2ff" : "#fff" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 600 }}>📅 {p.dueDate}</div>
              <span style={{ fontSize: 12, background: new Date(p.dueDate) < new Date() ? "#fee2e2" : "#f3f4f6", padding: "2px 8px", borderRadius: 999 }}>
                {new Date(p.dueDate) < new Date() ? "Overdue" : "Due"}
              </span>
            </div>
            <div style={{ fontSize: 18, marginTop: 4 }}>{currency(p.amount)}</div>
          </button>
        ))}
      </div>
      <div>
        <div style={label}>Tone</div>
        <select value={tone} onChange={(e) => setTone(e.target.value as any)} style={{ width: "100%", marginBottom: 8 }}>
          <option value="polite">Polite</option>
          <option value="urgent">Urgent</option>
          <option value="playful">Playful</option>
        </select>
        <div style={label}>Preview</div>
        <textarea value={text} readOnly style={{ width: "100%", minHeight: 140 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <button style={btn} onClick={() => navigator.clipboard?.writeText(text)}>Copy</button>
          <button style={btnPrimary}>Send (simulated)</button>
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Note: “Send” is simulated in this prototype.</div>
      </div>
    </div>
  );
}

/* =========================
   Main App
   ========================= */
export default function App() {
  const [cases, setCases] = useState<Case[]>(initialCases);
  const [activeId, setActiveId] = useState<string>(initialCases[0].id);
  const [tab, setTab] = useState<"overview" | "expenses" | "payments">("overview");
  const [showNewCase, setShowNewCase] = useState(false);

  const activeCase = useMemo(() => cases.find((c) => c.id === activeId)!, [cases, activeId]);
  const setActiveCase = (updater: (c: Case) => Case) => {
    setCases((prev) => prev.map((c) => (c.id === activeCase.id ? updater(c) : c)));
  };

  // derived balances
  const accountBalances = useMemo(() => {
    const map: Record<string, number> = {};
    activeCase.accounts.forEach((a) => (map[a.id] = a.balance));
    activeCase.expenses.forEach((e) => (map[e.accountId] = (map[e.accountId] || 0) - Number(e.amount)));
    activeCase.payments.filter((p) => p.status === "completed").forEach((p) => (map[p.accountId] = (map[p.accountId] || 0) + Number(p.amount)));
    return map;
  }, [activeCase]);

  const totals = useMemo(() => {
    const receivedIn = activeCase.payments.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0);
    const expectedIn = activeCase.payments.filter((p) => p.status !== "completed").reduce((s, p) => s + Number(p.amount), 0);
    const paidOut = activeCase.expenses.reduce((s, e) => s + Number(e.amount), 0);
    return { receivedIn, expectedIn, paidOut };
  }, [activeCase.payments, activeCase.expenses]);

  const kpis = useMemo(() => {
    const dueSoon = activeCase.payments.filter((p) => p.status !== "completed" && daysBetween(todayISO(), p.dueDate) <= 7 && daysBetween(todayISO(), p.dueDate) >= 0).length;
    const overdue = activeCase.payments.filter((p) => p.status !== "completed" && new Date(p.dueDate) < new Date(todayISO())).length;
    const monthSpend = activeCase.expenses.filter((e) => sameMonth(e.date)).reduce((s, e) => s + Number(e.amount), 0);
    return { dueSoon, overdue, monthSpend };
  }, [activeCase]);

  /* ===== actions ===== */
  const addExpense = (payload: Omit<Expense, "id">) =>
    setActiveCase((c) => ({ ...c, expenses: [{ id: `e-${Math.random().toString(36).slice(2)}`, ...payload }, ...c.expenses] }));

  const deleteExpense = (expenseId: string) =>
    setActiveCase((c) => ({ ...c, expenses: c.expenses.filter((e) => e.id !== expenseId) }));

  const addAccount = (name: string, balance: number) => {
    if (activeCase.accounts.length >= 1) return; // enforce 1 account per case
    setActiveCase((c) => ({ ...c, accounts: [...c.accounts, { id: `${c.id}-acc-${c.accounts.length + 1}`, name, balance: Number(balance) || 0 }] }));
  };

  const deleteCase = (id: string) => {
    setCases((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const empty = blankCase();
        setActiveId(empty.id);
        return [empty];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const updatePayment = (id: string, patch: Partial<Payment>) =>
    setActiveCase((c) => ({ ...c, payments: c.payments.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const addPayment = (payload: { amount: number; dueDate: string }) =>
    setActiveCase((c) => {
      const acct = c.accounts[0]?.id;
      const p: Payment = { id: `p-${Math.random().toString(36).slice(2)}`, status: "upcoming", accountId: acct || "", ...payload };
      return { ...c, payments: [p, ...(c.payments || [])] };
    });

  const addReceivedPayment = (payload: { amount: number; paidOn?: string }) =>
    setActiveCase((c) => {
      const acct = c.accounts[0]?.id;
      const p: Payment = {
        id: `p-${Math.random().toString(36).slice(2)}`,
        status: "completed",
        accountId: acct || "",
        amount: Number(payload.amount) || 0,
        dueDate: payload.paidOn || todayISO(),
        paidOn: payload.paidOn || todayISO(),
      };
      return { ...c, payments: [p, ...(c.payments || [])] };
    });

  const reminderPreview = ({ tone, payment }: { tone: keyof typeof tonePresets; payment: Payment }) =>
    tonePresets[tone]({ client: activeCase.client || "Client", amount: payment.amount, dueDate: payment.dueDate });

  const upcoming = activeCase.payments.filter((p) => p.status === "upcoming").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const completed = activeCase.payments.filter((p) => p.status === "completed").sort((a, b) => (b.paidOn || "").localeCompare(a.paidOn || ""));
  const missed = activeCase.payments.filter((p) => p.status === "missed").sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  /* ===== UI ===== */
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto", fontFamily: "system-ui,Segoe UI,Roboto,sans-serif", background: "#f9fafb", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Egg Donor & Client Finance Manager</div>
          <div style={{ color: "#6b7280", fontSize: 13 }}>Track expected invoices, client payments, and expenses ✨</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn} onClick={() => setShowNewCase((v) => !v)}>{showNewCase ? "Close" : "New Case"}</button>
          <button
            style={btnDanger}
            onClick={() => {
              if (confirm(`Delete case "${activeCase.client || activeCase.code || "(untitled)"}"? This cannot be undone.`)) {
                deleteCase(activeCase.id);
              }
            }}
          >
            Delete Case
          </button>
        </div>
      </div>

      {showNewCase && (
        <div style={{ marginBottom: 16 }}>
          <NewCaseForm
            onCreate={(payload) => {
              const id = `case-${Date.now()}`;
              setCases((prev) => [{ id, payments: [], expenses: [], accounts: payload.accounts || [], client: payload.client || "", donor: payload.donor || "", code: payload.code || "" }, ...prev]);
              setActiveId(id);
              setShowNewCase(false);
            }}
          />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
        {/* Sidebar: Cases */}
        <Card title="Cases">
          <div style={{ display: "grid", gap: 8, maxHeight: 520, overflow: "auto", paddingRight: 6 }}>
            {cases.map((cs) => (
              <button
                key={cs.id}
                onClick={() => setActiveId(cs.id)}
                style={{ textAlign: "left", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: activeId === cs.id ? "#eef2ff" : "#fff" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{cs.client || "(Untitled)"}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{cs.donor || ""}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, background: "#f3f4f6", padding: "2px 8px", borderRadius: 8 }}>#{cs.code || "—"}</div>
                </div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {cs.accounts.slice(0, 1).map((a) => (
                    <span key={a.id} style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 999, fontSize: 12 }}>
                      {a.name}: {currency(a.balance)}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Main */}
        <div style={{ display: "grid", gap: 12 }}>
          {/* Totals */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <Card title="✅ Came In">
              <div style={{ fontSize: 26, fontWeight: 800 }}>{currency(totals.receivedIn)}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>client payments received</div>
            </Card>
            <Card title="🔔 Supposed to Come In">
              <div style={{ fontSize: 26, fontWeight: 800 }}>{currency(totals.expectedIn)}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>upcoming & overdue invoices</div>
            </Card>
            <Card title="💵 Paid Out">
              <div style={{ fontSize: 26, fontWeight: 800 }}>{currency(totals.paidOut)}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>expenses posted</div>
            </Card>
          </div>

          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <Card title="📅 Due in 7 days"><div style={{ fontSize: 22, fontWeight: 700 }}>{kpis.dueSoon}</div></Card>
            <Card title="⚠️ Overdue"><div style={{ fontSize: 22, fontWeight: 700 }}>{kpis.overdue}</div></Card>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            {(["overview", "expenses", "payments"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{ ...tabBtn, ...(tab === t ? tabBtnActive : {}) }}>
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* OVERVIEW */}
          {tab === "overview" && (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card title="🏦 Account (max 1)">
                  <div style={{ display: "grid", gap: 8 }}>
                    {activeCase.accounts.map((a) => (
                      <div key={a.id} style={{ display: "flex", justifyContent: "space-between", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{a.name}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{a.id}</div>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>{currency(accountBalances[a.id] ?? a.balance)}</div>
                      </div>
                    ))}
                    {activeCase.accounts.length < 1 && <AddAccountForm onAdd={(n, b) => addAccount(n, Number(b))} />}
                  </div>
                </Card>

                <Card title="ℹ️ Case Details">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 14 }}>
                    <div><div style={label}>Client</div><div style={{ fontWeight: 600 }}>{activeCase.client || "—"}</div></div>
                    <div><div style={label}>Donor</div><div style={{ fontWeight: 600 }}>{activeCase.donor || "—"}</div></div>
                    <div><div style={label}>Donation ID</div><div style={{ fontWeight: 600 }}>#{activeCase.code || "—"}</div></div>
                    <div><div style={label}>Flow</div><div style={{ fontWeight: 600 }}>Invoices from client · expenses out</div></div>
                  </div>
                </Card>
              </div>

              <Card title="🕒 Activity Timeline">
                <div style={{ display: "grid", gap: 8 }}>
                  {[...activeCase.expenses].slice(0, 3).map((e) => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                      <div>
                        <span style={pill}>Expense</span> <strong>{e.note || (e.category + (e.subCategory ? ` › ${e.subCategory}` : ""))}</strong> <span style={{ fontSize: 12, color: "#6b7280" }}>{e.date}</span>
                      </div>
                      <div style={{ color: "#b91c1c" }}>-{currency(e.amount)}</div>
                    </div>
                  ))}
                  {[...activeCase.payments].slice(0, 3).map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                      <div>
                        <span style={pillFilled(p.status === "completed" ? "#059669" : p.status === "missed" ? "#dc2626" : "#4b5563")}>{p.status === "completed" ? "Received" : p.status === "missed" ? "Overdue" : "Expected"}</span>{" "}
                        <strong>Client Payment</strong>{" "}
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{p.status === "completed" ? `Paid ${p.paidOn || p.dueDate}` : `Due ${p.dueDate}`}</span>
                      </div>
                      <div>{currency(p.amount)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* EXPENSES */}
          {tab === "expenses" && (
            <div style={{ display: "grid", gap: 12 }}>
              <Card title="➕ Add Expense">
                <ExpenseForm accounts={activeCase.accounts} onAdd={(payload) => addExpense({ ...payload, date: payload.date || todayISO() })} />
              </Card>

              <Card title="Recent Expenses">
                <div style={{ display: "grid", gap: 8 }}>
                  {activeCase.expenses.length === 0 && <div style={{ color: "#6b7280", fontSize: 14 }}>No expenses yet.</div>}
                  {activeCase.expenses.map((e) => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #e5e7eb", borderRadius: 12, padding: 10 }}>
                      <div>
                        <span style={pill}>{e.category}{e.subCategory ? ` › ${e.subCategory}` : ""}</span> <strong>{e.note || "—"}</strong> <span style={{ fontSize: 12, color: "#6b7280" }}>{e.date}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ color: "#b91c1c", minWidth: 90, textAlign: "right" }}>-{currency(e.amount)}</div>
                        <button style={btnTinyDanger} onClick={() => { if (confirm("Delete this expense? This cannot be undone.")) deleteExpense(e.id); }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* PAYMENTS */}
          {tab === "payments" && (
            <div style={{ display: "grid", gap: 12 }}>
              <Card title="➕ Add Expected Invoice">
                <PaymentForm onAdd={(payload) => addPayment({ amount: Number(payload.amount) || 0, dueDate: payload.dueDate })} />
              </Card>

              <Card title="✅ Record Client Payment">
                <ReceivePaymentForm onAdd={(payload) => addReceivedPayment({ amount: Number(payload.amount) || 0, paidOn: payload.paidOn })} />
              </Card>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[{ id: "upcoming", title: "Upcoming", list: upcoming }, { id: "completed", title: "Completed", list: completed }, { id: "missed", title: "Missed", list: missed }].map((col) => (
                  <Card key={col.id} title={col.title}>
                    <div style={{ minHeight: 120 }}>
                      {col.list.map((p) => (
                        <div key={p.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 10, marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <div style={{ fontWeight: 600 }}>📅 {p.dueDate}</div>
                            <span style={pill}>{p.accountId || "—"}</span>
                          </div>
                          <div style={{ fontSize: 20, marginTop: 2 }}>{currency(p.amount)}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                            {(["upcoming", "completed", "missed"] as const).map((s) => (
                              <button key={s} style={btnTiny} onClick={() => updatePayment(p.id, { status: s, paidOn: s === "completed" ? todayISO() : p.paidOn })}>
                                Move to {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {col.list.length === 0 && <div style={{ color: "#6b7280", fontSize: 14 }}>No items.</div>}
                    </div>
                  </Card>
                ))}
              </div>

              <Card title="🔔 Automated Reminders">
                <ReminderCenter payments={[...missed, ...upcoming]} makeText={reminderPreview} />
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   Styles
   ========================= */
const label: React.CSSProperties = { color: "#6b7280", fontSize: 12, marginBottom: 4 };
const btn: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", background: "#111827", color: "#fff", cursor: "pointer" };
const btnPrimary: React.CSSProperties = { ...btn, background: "#2563eb" };
const btnDanger: React.CSSProperties = { ...btn, background: "#dc2626" };
const btnTiny: React.CSSProperties = { ...btn, padding: "4px 8px", fontSize: 12 };
const btnTinyDanger: React.CSSProperties = { ...btnTiny, background: "#dc2626" };
const pill: React.CSSProperties = { background: "#f3f4f6", padding: "2px 8px", borderRadius: 999, fontSize: 12 };
const pillFilled = (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", padding: "2px 8px", borderRadius: 999, fontSize: 12 });
const tabBtn: React.CSSProperties = { ...btn, background: "#f3f4f6", color: "#111827" };
const tabBtnActive: React.CSSProperties = { background: "#111827", color: "#fff" };
