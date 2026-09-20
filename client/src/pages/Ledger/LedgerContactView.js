import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../api/axios";
import { toast } from "react-toastify";
import "./Ledger.css";

const fmt   = (n) => (Number(n) || 0).toLocaleString("en-IN");
const fmtg  = (n) => (Number(n) || 0).toFixed(2);

export default function LedgerContactView() {
  const { contactId, id } = useParams();
  const activeContactId = contactId || id;

  const [contact,      setContact]     = useState(null);
  const [balances,     setBalances]    = useState({ moneyOwedToOwner:0, moneyOwnerOwes:0, goldOwedToOwner:0, goldOwnerOwes:0 });
  const [transactions, setTransactions] = useState([]);
  const [obligations,  setObligations]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState("overview");


  const renderGoldValue = (weightGrams, valuation) => {
    if (!weightGrams) return "0g";
    const str = `${weightGrams}g`;
    if (valuation > 0) {
      return (
        <span>
          {str} <span className="text-muted small fw-normal ms-1">(₹{Math.round(valuation).toLocaleString("en-IN")})</span>
        </span>
      );
    }
    return str;
  };

  // Settlement modal
  const [settling,     setSettling]    = useState(null); // obligation being settled
  const [settleForm,   setSettleForm]  = useState({ settleAsset:"money", moneyAmount:"", goldWeight:"", goldValuation:"", goldRate:"", paymentMethod:"Cash", notes:"" });
  const [savingSettle, setSavingSettle] = useState(false);

  const fetchData = useCallback(async () => {
    if (!activeContactId || activeContactId === "undefined") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [resContact, resLedger] = await Promise.all([
        api.get(`/contacts/${activeContactId}`),
        api.get(`/ledger/balances/${activeContactId}`),
      ]);
      if (resContact.data.success) setContact(resContact.data.contact);
      if (resLedger.data.success) {
        setBalances(resLedger.data.balances || { moneyOwedToOwner:0, moneyOwnerOwes:0, goldOwedToOwner:0, goldOwnerOwes:0 });
        setTransactions(resLedger.data.transactions || []);
        setObligations(resLedger.data.obligations   || []);
      }
    } catch (err) {
      toast.error("Failed to load contact ledger");
    } finally { setLoading(false); }
  }, [activeContactId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSettle = async () => {
    if (!settling) return;
    if (settleForm.settleAsset === "money" && !settleForm.moneyAmount) { toast.error("Enter amount"); return; }
    if (settleForm.settleAsset === "gold"  && !settleForm.goldWeight)  { toast.error("Enter gold weight"); return; }
    setSavingSettle(true);
    try {
      const res = await api.post(`/ledger/obligations/${settling._id}/settle`, {
        settleAsset:    settleForm.settleAsset,
        moneyAmount:    parseFloat(settleForm.moneyAmount)    || 0,
        goldWeight:     parseFloat(settleForm.goldWeight)     || 0,
        goldValuation:  parseFloat(settleForm.goldValuation)  || 0,
        goldRate:       parseFloat(settleForm.goldRate)       || 0,
        paymentMethod:  settleForm.paymentMethod,
        notes:          settleForm.notes,
      });
      if (res.data.success) {
        toast.success("Settlement recorded!");
        setSettling(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Settlement failed");
    } finally { setSavingSettle(false); }
  };

  const nameOf  = (p) => p ? p.name : "You (Owner)";
  const amtOf   = (txn) => txn.assetType === "money"
    ? `₹${fmt(txn.money?.amount)}`
    : txn.assetType === "gold"
    ? `${fmtg(txn.gold?.weight)}g gold`
    : txn.goods?.description || "goods";

  if (loading) return <div className="ldg-page"><div className="ldg-loading">Loading ledger…</div></div>;
  if (!contact) return <div className="ldg-page"><div className="ldg-loading">Contact not found.</div></div>;

  const outstandingObs = obligations.filter(ob => ob.status === "outstanding" || ob.status === "partially_settled");

  return (
    <div className="ldg-page">
      {/* Header */}
      <div className="ldg-header">
        <div className="ldg-header-left">
          <Link to="/ledger" className="ldg-back">← Ledger</Link>
          <div>
            <h1 className="ldg-title">{contact.name}</h1>
            <p className="ldg-sub">{contact.categories?.join(", ")} · {contact.phone || "No phone"}</p>
          </div>
        </div>
        <Link to="/ledger/transactions" className="ldg-btn gold">+ Record Transaction</Link>
      </div>

      {/* Balance Summary */}
      <div className="contact-balance-row">
        {balances.moneyOwedToOwner > 0 && (
          <div className="cb-card receivable">
            <div className="cb-label">They Owe You</div>
            <div className="cb-amount green">₹{fmt(balances.moneyOwedToOwner)}</div>
          </div>
        )}
        {balances.moneyOwnerOwes > 0 && (
          <div className="cb-card payable">
            <div className="cb-label">You Owe Them</div>
            <div className="cb-amount red">₹{fmt(balances.moneyOwnerOwes)}</div>
          </div>
        )}
        {balances.goldOwedToOwner > 0 && (
          <div className="cb-card receivable">
            <div className="cb-label">Gold They Owe</div>
            <div className="cb-amount green">{renderGoldValue(fmtg(balances.goldOwedToOwner), balances.goldOwedToOwnerValuation)}</div>
          </div>
        )}
        {balances.goldOwnerOwes > 0 && (
          <div className="cb-card payable">
            <div className="cb-label">Gold You Owe</div>
            <div className="cb-amount amber">{renderGoldValue(fmtg(balances.goldOwnerOwes), balances.goldOwnerOwesValuation)}</div>
          </div>
        )}
        {!balances.moneyOwedToOwner && !balances.moneyOwnerOwes && !balances.goldOwedToOwner && !balances.goldOwnerOwes && (
          <div className="cb-card clear">
            <div className="cb-label">Outstanding Balance</div>
            <div className="cb-amount green">All Clear ✓</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="ldg-tabs">
        {["overview","obligations","transactions"].map(t => (
          <button key={t} className={"ldg-tab " + (activeTab === t ? "active" : "")}
            onClick={() => setActiveTab(t)}>
            {t === "overview" ? "Overview" : t === "obligations" ? `Obligations (${outstandingObs.length})` : `Transactions (${transactions.length})`}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === "overview" && (
        <div className="ldg-section-card">
          {/* Recent activity timeline */}
          <div className="ldg-section-header"><h3 className="ldg-section-title">Recent Activity</h3></div>
          {transactions.length === 0 && <div className="ldg-empty-msg">No transactions with this contact yet.</div>}
          {transactions.slice(0, 10).map(txn => (
            <div key={txn._id} className="activity-item">
              <div className="act-dot" />
              <div className="act-body">
                <div className="act-row">
                  <span className={"act-type " + txn.transactionType}>{txn.transactionType}</span>
                  <span className={"act-amount " + txn.assetType}>{amtOf(txn)}</span>
                  <span className="act-date">{new Date(txn.transactionDate).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}</span>
                </div>
                <div className="act-desc">
                  {nameOf(txn.providerId)} → {nameOf(txn.receiverId)}
                  {txn.onBehalfOfId ? ` (on behalf of ${nameOf(txn.onBehalfOfId)})` : ""}
                </div>
                {(txn.description || txn.notes) && <div className="act-notes">{txn.description || txn.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Obligations tab ── */}
      {activeTab === "obligations" && (
        <div className="ldg-section-card">
          {obligations.length === 0 && <div className="ldg-empty-msg">No obligations with this contact.</div>}
          {obligations.map(ob => {
            const isSettled = ob.status === "settled";
            const debtorName   = nameOf(ob.debtorId);
            const creditorName = nameOf(ob.creditorId);
            const outstanding  = ob.assetType === "money"
              ? `₹${fmt(ob.money?.outstandingAmount)}`
              : `${fmtg(ob.gold?.outstandingWeight)}g`;
            const original = ob.assetType === "money"
              ? `₹${fmt(ob.money?.originalAmount)}`
              : `${fmtg(ob.gold?.originalWeight)}g`;

            return (
              <div key={ob._id} className={"ob-card " + ob.status}>
                <div className="ob-header">
                  <div className="ob-id">{ob.obligationId || "Obligation"}</div>
                  <span className={"ob-status-badge " + ob.status}>{ob.status.replace("_"," ")}</span>
                </div>
                <div className="ob-main">
                  <span className="ob-debtor">{debtorName}</span>
                  <span className="ob-arrow">owes</span>
                  <span className="ob-creditor">{creditorName}</span>
                </div>
                <div className="ob-amounts">
                  <div>
                    <span className="ob-amt-label">Original:</span>
                    <span className="ob-amt-val">{original}</span>
                  </div>
                  <div>
                    <span className="ob-amt-label">Outstanding:</span>
                    <span className={"ob-amt-val " + (isSettled ? "green" : "red")}>{outstanding}</span>
                  </div>
                </div>
                {!isSettled && ob.status !== "void" && (
                  <button className="ob-settle-btn" onClick={() => { setSettling(ob); setSettleForm(sf => ({ ...sf, settleAsset: ob.assetType })); }}>
                    Record Settlement
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Transactions tab ── */}
      {activeTab === "transactions" && (
        <div className="ldg-section-card">
          {transactions.length === 0 && <div className="ldg-empty-msg">No transactions yet.</div>}
          <table className="ldg-table">
            <thead>
              <tr><th>Date</th><th>Type</th><th>Provider</th><th>Receiver</th><th>Asset</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {transactions.map(txn => (
                <tr key={txn._id} className="ldg-tr">
                  <td>{new Date(txn.transactionDate).toLocaleDateString("en-IN")}</td>
                  <td><span className={"thi-type " + txn.transactionType}>{txn.transactionType}</span></td>
                  <td>{nameOf(txn.providerId)}</td>
                  <td>{nameOf(txn.receiverId)}</td>
                  <td className="ldg-amt">{amtOf(txn)}</td>
                  <td className="ldg-notes">{txn.notes || txn.description || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Settlement Modal ── */}
      {settling && (
        <div className="settle-overlay" onClick={() => setSettling(null)}>
          <div className="settle-modal" onClick={e => e.stopPropagation()}>
            <div className="settle-modal-header">
              <h3>Record Settlement</h3>
              <button className="settle-close" onClick={() => setSettling(null)}>✕</button>
            </div>
            <div className="settle-modal-body">
              <div className="settle-info">
                <strong>{nameOf(settling.debtorId)}</strong> owes <strong>{nameOf(settling.creditorId)}</strong>
                <span className="settle-outstanding">
                  Outstanding: {settling.assetType === "money"
                    ? `₹${fmt(settling.money?.outstandingAmount)}`
                    : `${fmtg(settling.gold?.outstandingWeight)}g gold`}
                </span>
              </div>

              <div className="txn-field">
                <label>Settle with</label>
                <div className="asset-type-row sm">
                  {["money","gold"].map(t => (
                    <button key={t}
                      className={"asset-type-btn sm " + (settleForm.settleAsset === t ? "active" : "")}
                      onClick={() => setSettleForm(sf => ({ ...sf, settleAsset: t }))}>
                      {t === "money" ? "💰 Money" : "🥇 Gold"}
                    </button>
                  ))}
                </div>
              </div>

              {settleForm.settleAsset === "money" && (
                <div className="txn-row">
                  <div className="txn-field">
                    <label>Amount (₹)</label>
                    <input type="number" value={settleForm.moneyAmount}
                      onChange={e => setSettleForm(sf => ({ ...sf, moneyAmount: e.target.value }))} />
                  </div>
                  <div className="txn-field">
                    <label>Payment Method</label>
                    <select value={settleForm.paymentMethod}
                      onChange={e => setSettleForm(sf => ({ ...sf, paymentMethod: e.target.value }))}>
                      {["Cash","UPI","Bank Transfer","Cheque","Other"].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {settleForm.settleAsset === "gold" && (
                <div className="txn-row">
                  <div className="txn-field">
                    <label>Gold Weight (g)</label>
                    <input type="number" value={settleForm.goldWeight}
                      onChange={e => setSettleForm(sf => ({ ...sf, goldWeight: e.target.value }))} />
                  </div>
                  <div className="txn-field">
                    <label>Rate/gram (₹) — for cross-asset</label>
                    <input type="number" placeholder="optional" value={settleForm.goldRate}
                      onChange={e => setSettleForm(sf => ({ ...sf, goldRate: e.target.value }))} />
                  </div>
                </div>
              )}

              <div className="txn-field">
                <label>Notes</label>
                <input value={settleForm.notes}
                  onChange={e => setSettleForm(sf => ({ ...sf, notes: e.target.value }))}
                  placeholder="e.g. Cash paid on 30 Aug..." />
              </div>

              <div className="settle-footer">
                <button className="ldg-btn outline" onClick={() => setSettling(null)}>Cancel</button>
                <button className="ldg-btn gold" disabled={savingSettle} onClick={handleSettle}>
                  {savingSettle ? "Recording…" : "Confirm Settlement"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
