import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { toast } from "react-toastify";
import "./Ledger.css";

const OWNER_VALUE = "__OWNER__";
const OWNER_LABEL = "Business Owner (You)";

export default function LedgerGroupCreate() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [saving,   setSaving]   = useState(false);

  const [form, setForm] = useState({
    title:           "Worker Payments",
    description:     "",
    transactionType: "wage",
    providerId:      OWNER_VALUE,
    onBehalfOfId:    OWNER_VALUE,
    assetType:       "money",
    paymentMethod:   "Cash",
    groupDate:       new Date().toISOString().slice(0, 10),
    sameAmount:      true,
    defaultAmount:   "",
    defaultGoldWeight: "",
    recipients: [],
  });

  const fetchContacts = useCallback(async () => {
    try {
      const res = await api.get("/contacts?limit=500");
      if (res.data.success) setContacts(res.data.contacts || []);
    } catch {}
  }, []);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Toggle recipient selection
  const toggleRecipient = (contactId) => {
    setForm(f => {
      const exists = f.recipients.find(r => r.receiverId === contactId);
      if (exists) {
        return { ...f, recipients: f.recipients.filter(r => r.receiverId !== contactId) };
      }
      return {
        ...f,
        recipients: [
          ...f.recipients,
          {
            receiverId:  contactId,
            amount:      f.defaultAmount || "",
            goldWeight:  f.defaultGoldWeight || "",
            notes:       "",
          },
        ],
      };
    });
  };

  const updateRecipient = (contactId, key, val) => {
    setForm(f => ({
      ...f,
      recipients: f.recipients.map(r =>
        r.receiverId === contactId ? { ...r, [key]: val } : r
      ),
    }));
  };

  // When defaultAmount changes and sameAmount is on, update all recipients
  const handleDefaultAmount = (val) => {
    set("defaultAmount", val);
    if (form.sameAmount) {
      setForm(f => ({
        ...f,
        defaultAmount: val,
        recipients: f.recipients.map(r => ({ ...r, amount: val })),
      }));
    }
  };

  const totalMoney = form.recipients.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const totalGold  = form.recipients.reduce((s, r) => s + (parseFloat(r.goldWeight) || 0), 0);

  const providerName    = form.providerId   === OWNER_VALUE ? OWNER_LABEL : contacts.find(c => c._id === form.providerId)?.name    || "?";
  const onBehalfOfName  = form.onBehalfOfId === OWNER_VALUE ? OWNER_LABEL : contacts.find(c => c._id === form.onBehalfOfId)?.name  || "?";

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error("Please enter a group title"); return; }
    if (form.recipients.length === 0) { toast.error("Select at least one recipient"); return; }
    const invalidRecipient = form.recipients.find(r =>
      form.assetType === "money" ? !r.amount : !r.goldWeight
    );
    if (invalidRecipient) {
      toast.error("Fill in the amount for all selected recipients");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title:          form.title,
        description:    form.description,
        transactionType: form.transactionType,
        providerId:    form.providerId   === OWNER_VALUE ? null : form.providerId,
        onBehalfOfId:  form.onBehalfOfId === OWNER_VALUE ? null : form.onBehalfOfId,
        assetType:     form.assetType,
        paymentMethod: form.paymentMethod,
        groupDate:     form.groupDate,
        recipients:    form.recipients.map(r => ({
          receiverId: r.receiverId === OWNER_VALUE ? null : r.receiverId,
          amount:     parseFloat(r.amount)     || 0,
          goldWeight: parseFloat(r.goldWeight) || 0,
          notes:      r.notes || "",
        })),
      };

      const res = await api.post("/ledger/groups", payload);
      if (res.data.success) {
        toast.success(`Group created! ${res.data.transactionCount} transactions recorded.`);
        navigate("/ledger");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group");
    } finally { setSaving(false); }
  };

  const selectedIds = new Set(form.recipients.map(r => r.receiverId));

  return (
    <div className="ldg-page">
      <div className="ldg-header">
        <div className="ldg-header-left">
          <div className="ldg-icon">👥</div>
          <div>
            <h1 className="ldg-title">Pay on Behalf — Group Transaction</h1>
            <p className="ldg-sub">One provider → many recipients → one resulting obligation</p>
          </div>
        </div>
        <Link to="/ledger" className="ldg-btn outline">← Dashboard</Link>
      </div>

      <div className="grp-layout">
        {/* ── LEFT: Config ── */}
        <div className="grp-config-card">

          <div className="grp-section">
            <div className="grp-section-title">Group Details</div>
            <div className="txn-field">
              <label>Group Title</label>
              <input value={form.title} onChange={e => set("title", e.target.value)}
                placeholder="e.g. Worker Payments — August 2026" />
            </div>
            <div className="txn-row">
              <div className="txn-field">
                <label>Transaction Type</label>
                <select value={form.transactionType} onChange={e => set("transactionType", e.target.value)}>
                  <option value="wage">Wage (no receivable)</option>
                  <option value="advance">Advance (creates receivable)</option>
                  <option value="expense">Expense (no receivable)</option>
                  <option value="transfer">Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="txn-field">
                <label>Date</label>
                <input type="date" value={form.groupDate} onChange={e => set("groupDate", e.target.value)} />
              </div>
            </div>
            <div className="txn-field">
              <label>Description</label>
              <input value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Optional description..." />
            </div>
          </div>

          <div className="grp-section">
            <div className="grp-section-title">Who Pays? Who Owes?</div>
            <div className="txn-field">
              <label>Provider (Who physically pays)</label>
              <select value={form.providerId} onChange={e => set("providerId", e.target.value)}>
                <option value={OWNER_VALUE}>{OWNER_LABEL}</option>
                {contacts.map(c => (
                  <option key={c._id} value={c._id}>{c.name}{c.businessName ? ` (${c.businessName})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="txn-field">
              <label>On Behalf Of (Who is economically responsible)</label>
              <select value={form.onBehalfOfId} onChange={e => set("onBehalfOfId", e.target.value)}>
                <option value={OWNER_VALUE}>{OWNER_LABEL}</option>
                {contacts.map(c => (
                  <option key={c._id} value={c._id}>{c.name}{c.businessName ? ` (${c.businessName})` : ""}</option>
                ))}
              </select>
            </div>

            {/* Obligation preview */}
            {form.providerId !== form.onBehalfOfId && (
              <div className="grp-obligation-preview">
                <div className="gop-label">📊 This will create ONE obligation:</div>
                <div className="gop-arrow">
                  <span className="gop-debtor">{onBehalfOfName}</span>
                  <span className="gop-owes">owes</span>
                  <span className="gop-creditor">{providerName}</span>
                  <span className="gop-amount">
                    {form.assetType === "money"
                      ? `₹${totalMoney.toLocaleString("en-IN")}`
                      : `${totalGold.toFixed(2)}g gold`}
                  </span>
                </div>
                {["wage","expense"].includes(form.transactionType) && (
                  <div className="gop-note">Recipients will NOT have obligations back to you.</div>
                )}
              </div>
            )}
          </div>

          <div className="grp-section">
            <div className="grp-section-title">Asset</div>
            <div className="txn-row">
              <div className="txn-field">
                <label>Asset Type</label>
                <div className="asset-type-row sm">
                  {["money","gold"].map(t => (
                    <button key={t} className={"asset-type-btn sm " + (form.assetType === t ? "active" : "")}
                      onClick={() => set("assetType", t)}>
                      {t === "money" ? "💰 Money" : "🥇 Gold"}
                    </button>
                  ))}
                </div>
              </div>
              {form.assetType === "money" && (
                <div className="txn-field">
                  <label>Payment Method</label>
                  <select value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)}>
                    {["Cash","UPI","Bank Transfer","Cheque","Other"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="txn-row">
              <div className="txn-field">
                <label>
                  {form.assetType === "money" ? "Default Amount per Recipient (₹)" : "Default Gold per Recipient (g)"}
                </label>
                <input type="number"
                  placeholder={form.assetType === "money" ? "10000" : "5.00"}
                  value={form.defaultAmount}
                  onChange={e => handleDefaultAmount(e.target.value)} />
              </div>
              <div className="txn-field">
                <label className="txn-toggle-label">
                  <input type="checkbox" checked={form.sameAmount}
                    onChange={e => set("sameAmount", e.target.checked)} />
                  <span>Same amount for all</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Recipient selector ── */}
        <div className="grp-recipients-card">
          <div className="grp-section-title">Select Recipients ({form.recipients.length} selected)</div>
          <div className="grp-search-hint">Click a contact to toggle selection</div>

          <div className="grp-contact-list">
            {contacts.length === 0 && <div className="ldg-loading">Loading contacts…</div>}
            {contacts.map(c => {
              const isSelected = selectedIds.has(c._id);
              const rec = form.recipients.find(r => r.receiverId === c._id);
              return (
                <div key={c._id} className={"grp-contact-row " + (isSelected ? "selected" : "")}
                  onClick={() => toggleRecipient(c._id)}>
                  <div className="gcr-left">
                    <input type="checkbox" readOnly checked={isSelected} className="gcr-check" />
                    <div>
                      <div className="gcr-name">{c.name}</div>
                      <div className="gcr-meta">{c.categories?.[0]} {c.phone ? `· ${c.phone}` : ""}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="gcr-amount-input" onClick={e => e.stopPropagation()}>
                      <input
                        type="number"
                        placeholder={form.assetType === "money" ? "₹ amount" : "grams"}
                        value={form.assetType === "money" ? rec.amount : rec.goldWeight}
                        onChange={e => updateRecipient(c._id, form.assetType === "money" ? "amount" : "goldWeight", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary footer */}
          {form.recipients.length > 0 && (
            <div className="grp-summary-footer">
              <div className="gsf-row">
                <span>{form.recipients.length} Recipients</span>
                <span className="gsf-total">
                  {form.assetType === "money"
                    ? `Total: ₹${totalMoney.toLocaleString("en-IN")}`
                    : `Total: ${totalGold.toFixed(2)}g`}
                </span>
              </div>
              <button className="txn-save w-full" disabled={saving} onClick={handleSubmit}>
                {saving ? "Creating…" : `✓ Create Group (${form.recipients.length} transactions)`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
