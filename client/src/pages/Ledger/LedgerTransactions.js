import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { toast } from "react-toastify";
import "./Ledger.css";

const OWNER_LABEL = "Business Owner (You)";
const OWNER_VALUE = "__OWNER__";

const TRANSACTION_TYPES = [
  { value: "advance",    label: "Advance",    desc: "Give money/gold in advance (creates receivable)" },
  { value: "repayment",  label: "Repayment",  desc: "Receiving back what was owed" },
  { value: "purchase",   label: "Purchase",   desc: "Buying goods/gold" },
  { value: "sale",       label: "Sale",       desc: "Selling goods/gold" },
  { value: "transfer",   label: "Transfer",   desc: "General asset transfer" },
  { value: "expense",    label: "Expense",    desc: "Cost / outgoing (no receivable from receiver)" },
  { value: "wage",       label: "Wage",       desc: "Worker payment (no receivable from worker)" },
  { value: "settlement", label: "Settlement", desc: "Settling an existing obligation" },
  { value: "other",      label: "Other",      desc: "Miscellaneous" },
];

const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Cheque", "Gold Settlement", "Other"];
const GOLD_PURITIES   = ["24K (99.9%)", "22K (91.6%)", "18K (75%)", "14K (58.5%)", "Custom"];

const EMPTY_FORM = {
  step: 1,
  assetType: "money",
  transactionType: "advance",
  providerId:   OWNER_VALUE,
  receiverId:   "",
  onBehalfOfId: OWNER_VALUE,
  useOnBehalf: false,
  // Money
  moneyAmount: "",
  currency: "INR",
  paymentMethod: "Cash",
  // Gold
  goldWeight: "",
  goldPurity: "22K (91.6%)",
  goldRate:   "",
  goldValuation: "",
  // Goods
  goodsDesc: "",
  goodsQty: "1",
  goodsUnit: "piece",
  goodsValuation: "",
  // Meta
  transactionDate: new Date().toISOString().slice(0,10),
  description: "",
  notes: "",
};

function ContactSelect({ label, contacts, value, onChange, allowOwner = true, placeholder }) {
  return (
    <div className="txn-field">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {placeholder && <option value="">{placeholder}</option>}
        {allowOwner && <option value={OWNER_VALUE}>{OWNER_LABEL}</option>}
        {contacts.map(c => (
          <option key={c._id} value={c._id}>
            {c.name}{c.businessName ? ` (${c.businessName})` : ""} — {c.categories?.[0] || ""}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function LedgerTransactions() {
  const [contacts,     setContacts]     = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [loadingTxns,  setLoadingTxns]  = useState(true);

  const fetchContacts = useCallback(async () => {
    try {
      const res = await api.get("/contacts?limit=500");
      if (res.data.success) setContacts(res.data.contacts || []);
    } catch {}
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoadingTxns(true);
    try {
      const res = await api.get("/ledger/transactions?limit=20");
      if (res.data.success) setTransactions(res.data.transactions || []);
    } catch {} finally { setLoadingTxns(false); }
  }, []);

  useEffect(() => { fetchContacts(); fetchTransactions(); }, [fetchContacts, fetchTransactions]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Auto-compute gold valuation
  useEffect(() => {
    if (form.assetType === "gold" && form.goldWeight && form.goldRate) {
      set("goldValuation", (parseFloat(form.goldWeight) * parseFloat(form.goldRate)).toFixed(2));
    }
  }, [form.goldWeight, form.goldRate, form.assetType]);

  const handleSubmit = async () => {
    if (!form.receiverId) { toast.error("Please select who received the asset"); return; }
    if (form.assetType === "money" && !form.moneyAmount) { toast.error("Enter amount"); return; }
    if (form.assetType === "gold"  && !form.goldWeight)  { toast.error("Enter gold weight"); return; }

    setSaving(true);
    try {
      const payload = {
        transactionType: form.transactionType,
        providerId:   form.providerId   === OWNER_VALUE ? null : form.providerId   || null,
        receiverId:   form.receiverId   === OWNER_VALUE ? null : form.receiverId   || null,
        onBehalfOfId: form.useOnBehalf
          ? (form.onBehalfOfId === OWNER_VALUE ? null : form.onBehalfOfId || null)
          : null, // null = owner
        assetType: form.assetType,
        money:  form.assetType === "money" ? { amount: parseFloat(form.moneyAmount), currency: "INR" } : { amount: 0 },
        gold:   form.assetType === "gold"  ? { weight: parseFloat(form.goldWeight), purity: form.goldPurity, ratePerGram: parseFloat(form.goldRate || 0), valuation: parseFloat(form.goldValuation || 0) } : { weight: 0 },
        goods:  form.assetType === "goods" ? { description: form.goodsDesc, quantity: parseInt(form.goodsQty), unit: form.goodsUnit, valuation: parseFloat(form.goodsValuation || 0) } : {},
        paymentMethod: form.paymentMethod,
        transactionDate: form.transactionDate,
        description: form.description,
        notes: form.notes,
      };

      const res = await api.post("/ledger/transactions", payload);
      if (res.data.success) {
        toast.success("Transaction recorded successfully!");
        setForm(EMPTY_FORM);
        fetchTransactions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save transaction");
    } finally { setSaving(false); }
  };

  const nameOf = (participant) => {
    if (!participant) return "You (Owner)";
    return participant.name || "Unknown";
  };

  const describeTransaction = (txn) => {
    const provider = nameOf(txn.providerId);
    const receiver = nameOf(txn.receiverId);
    const behalf   = txn.onBehalfOfId ? `on behalf of ${txn.onBehalfOfId.name}` : "";
    const asset    = txn.assetType === "money"
      ? `₹${(txn.money?.amount || 0).toLocaleString("en-IN")}`
      : txn.assetType === "gold"
      ? `${txn.gold?.weight || 0}g gold`
      : txn.goods?.description || "goods";
    return `${provider} → ${receiver} · ${asset} ${behalf}`;
  };

  return (
    <div className="ldg-page">
      {/* Header */}
      <div className="ldg-header">
        <div className="ldg-header-left">
          <div className="ldg-icon">📝</div>
          <div>
            <h1 className="ldg-title">Record Transaction</h1>
            <p className="ldg-sub">Who gave what to whom and on whose behalf?</p>
          </div>
        </div>
        <Link to="/ledger" className="ldg-btn outline">← Dashboard</Link>
      </div>

      <div className="txn-layout">
        {/* ── LEFT: Form ── */}
        <div className="txn-form-card">

          {/* STEP 1: Asset Type */}
          <div className="txn-step">
            <div className="txn-step-label">1 · What was moved?</div>
            <div className="asset-type-row">
              {["money","gold","goods"].map(t => (
                <button key={t} className={"asset-type-btn " + (form.assetType === t ? "active" : "")}
                  onClick={() => set("assetType", t)}>
                  {t === "money" ? "💰 Money" : t === "gold" ? "🥇 Gold" : "📦 Goods"}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2: Who gave / Who received / On behalf of */}
          <div className="txn-step">
            <div className="txn-step-label">2 · Who gave it and who received it?</div>
            <ContactSelect label="Who gave it? (Provider)" contacts={contacts}
              value={form.providerId} onChange={v => set("providerId", v)} allowOwner />
            <ContactSelect label="Who received it? (Receiver)" contacts={contacts}
              value={form.receiverId} onChange={v => set("receiverId", v)} allowOwner
              placeholder="— Select receiver —" />

            <div className="txn-behalf-toggle">
              <label className="txn-toggle-label">
                <input type="checkbox" checked={form.useOnBehalf}
                  onChange={e => set("useOnBehalf", e.target.checked)} />
                <span>This was on behalf of someone else</span>
              </label>
            </div>

            {form.useOnBehalf && (
              <ContactSelect label="On Behalf Of" contacts={contacts}
                value={form.onBehalfOfId} onChange={v => set("onBehalfOfId", v)} allowOwner />
            )}

            {/* Obligation preview */}
            {form.receiverId && (
              <div className="txn-obligation-preview">
                <div className="ob-preview-label">📊 Resulting obligations:</div>
                {form.useOnBehalf && form.providerId !== (form.useOnBehalf ? form.onBehalfOfId : form.providerId) && (
                  <div className="ob-preview-item">
                    <span className="ob-debtor">{form.onBehalfOfId === OWNER_VALUE ? "You (Owner)" : contacts.find(c => c._id === form.onBehalfOfId)?.name || "OnBehalfOf"}</span>
                    {" owes "}
                    <span className="ob-creditor">{form.providerId === OWNER_VALUE ? "You (Owner)" : contacts.find(c => c._id === form.providerId)?.name || "Provider"}</span>
                  </div>
                )}
                {form.receiverId !== OWNER_VALUE && !["expense","wage"].includes(form.transactionType) && (
                  <div className="ob-preview-item">
                    <span className="ob-debtor">{contacts.find(c => c._id === form.receiverId)?.name || "Receiver"}</span>
                    {" owes "}
                    <span className="ob-creditor">{form.useOnBehalf ? (form.onBehalfOfId === OWNER_VALUE ? "You (Owner)" : contacts.find(c => c._id === form.onBehalfOfId)?.name || "") : (form.providerId === OWNER_VALUE ? "You (Owner)" : contacts.find(c => c._id === form.providerId)?.name || "")}</span>
                  </div>
                )}
                {["expense","wage"].includes(form.transactionType) && (
                  <div className="ob-preview-item muted">No receivable (expense/wage — not a loan)</div>
                )}
              </div>
            )}
          </div>

          {/* STEP 3: Asset Details */}
          <div className="txn-step">
            <div className="txn-step-label">3 · Amount / Details</div>

            {form.assetType === "money" && (
              <div className="txn-row">
                <div className="txn-field">
                  <label>Amount (₹)</label>
                  <input type="number" placeholder="10000" value={form.moneyAmount}
                    onChange={e => set("moneyAmount", e.target.value)} />
                </div>
                <div className="txn-field">
                  <label>Payment Method</label>
                  <select value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)}>
                    {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            )}

            {form.assetType === "gold" && (
              <>
                <div className="txn-row">
                  <div className="txn-field">
                    <label>Weight (grams)</label>
                    <input type="number" step="0.01" placeholder="20.00" value={form.goldWeight}
                      onChange={e => set("goldWeight", e.target.value)} />
                  </div>
                  <div className="txn-field">
                    <label>Purity</label>
                    <select value={form.goldPurity} onChange={e => set("goldPurity", e.target.value)}>
                      {GOLD_PURITIES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="txn-row">
                  <div className="txn-field">
                    <label>Rate per gram (₹)</label>
                    <input type="number" placeholder="6200" value={form.goldRate}
                      onChange={e => set("goldRate", e.target.value)} />
                  </div>
                  <div className="txn-field">
                    <label>Total Valuation (₹)</label>
                    <input type="number" placeholder="auto" value={form.goldValuation}
                      onChange={e => set("goldValuation", e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {form.assetType === "goods" && (
              <>
                <div className="txn-field">
                  <label>Description</label>
                  <input placeholder="e.g. Gold necklace, jewellery set..." value={form.goodsDesc}
                    onChange={e => set("goodsDesc", e.target.value)} />
                </div>
                <div className="txn-row">
                  <div className="txn-field">
                    <label>Quantity</label>
                    <input type="number" value={form.goodsQty} onChange={e => set("goodsQty", e.target.value)} />
                  </div>
                  <div className="txn-field">
                    <label>Unit</label>
                    <select value={form.goodsUnit} onChange={e => set("goodsUnit", e.target.value)}>
                      {["piece","set","kg","gram","lot"].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="txn-field">
                    <label>Valuation (₹)</label>
                    <input type="number" value={form.goodsValuation} onChange={e => set("goodsValuation", e.target.value)} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* STEP 4: Type + Date + Notes */}
          <div className="txn-step">
            <div className="txn-step-label">4 · Transaction Type & Notes</div>
            <div className="txn-row">
              <div className="txn-field">
                <label>Transaction Type</label>
                <select value={form.transactionType} onChange={e => set("transactionType", e.target.value)}>
                  {TRANSACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <span className="txn-type-hint">
                  {TRANSACTION_TYPES.find(t => t.value === form.transactionType)?.desc}
                </span>
              </div>
              <div className="txn-field">
                <label>Date</label>
                <input type="date" value={form.transactionDate}
                  onChange={e => set("transactionDate", e.target.value)} />
              </div>
            </div>
            <div className="txn-field">
              <label>Description (optional)</label>
              <input placeholder="Brief description of this transaction..." value={form.description}
                onChange={e => set("description", e.target.value)} />
            </div>
            <div className="txn-field">
              <label>Notes (optional)</label>
              <textarea rows={2} placeholder="Any additional notes..." value={form.notes}
                onChange={e => set("notes", e.target.value)} />
            </div>
          </div>

          {/* Submit */}
          <div className="txn-footer">
            <button className="txn-reset" onClick={() => setForm(EMPTY_FORM)}>Reset</button>
            <button className="txn-save" disabled={saving} onClick={handleSubmit}>
              {saving ? "Saving…" : "💾 Record Transaction"}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Recent transactions ── */}
        <div className="txn-history-card">
          <div className="txn-hist-header">
            <h3 className="txn-hist-title">Recent Transactions</h3>
            <Link to="/ledger" className="txn-hist-link">Dashboard →</Link>
          </div>

          {loadingTxns && <div className="ldg-loading">Loading…</div>}
          {!loadingTxns && transactions.length === 0 && (
            <div className="txn-hist-empty">No transactions yet. Record your first one!</div>
          )}
          {!loadingTxns && transactions.map(txn => (
            <div key={txn._id} className="txn-hist-item">
              <div className="thi-header">
                <span className={"thi-type " + txn.transactionType}>{txn.transactionType}</span>
                <span className={"thi-asset " + txn.assetType}>
                  {txn.assetType === "money"
                    ? `₹${(txn.money?.amount || 0).toLocaleString("en-IN")}`
                    : txn.assetType === "gold"
                    ? `${txn.gold?.weight || 0}g gold`
                    : "goods"}
                </span>
                <span className="thi-date">{new Date(txn.transactionDate).toLocaleDateString("en-IN")}</span>
              </div>
              <div className="thi-desc">{describeTransaction(txn)}</div>
              {txn.notes && <div className="thi-notes">{txn.notes}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
