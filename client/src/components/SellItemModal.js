import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { notify } from "./Toast/toast";
import {
  FiUser, FiCalendar, FiCheckCircle, FiPlus, FiX,
  FiPhone, FiMail, FiMapPin, FiGift
} from "react-icons/fi";
import { FaRupeeSign, FaTag, FaWeightHanging, FaBoxOpen } from "react-icons/fa";
import "./SellItemModal.css";

/* ── Debounce ─────────────────────────────────────────────── */
function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

const today = () => new Date().toISOString().slice(0, 10);

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function SellItemModal({ isOpen, onClose, inventoryItem }) {
  const queryClient = useQueryClient();

  /* ── Customer search ──────────────────────────────────── */
  const [customerQuery, setCustomerQuery]       = useState("");
  const [customerResults, setCustomerResults]   = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDropdown, setShowDropdown]         = useState(false);
  const [loadingSearch, setLoadingSearch]       = useState(false);
  const [mode, setMode] = useState("search"); // "search" | "new" | "walkin"
  const dropdownRef = useRef(null);

  /* ── New customer form ────────────────────────────────── */
  const [newCust, setNewCust] = useState({
    name: "", phone: "", alternatePhone: "", email: "",
    address: "", city: "", pincode: "",
    dateOfBirth: "", anniversary: "", referralSource: "",
  });

  /* ── Sale details ─────────────────────────────────────── */
  const [saleDate, setSaleDate]       = useState(today());
  const [sellingPrice, setSellingPrice] = useState("");
  const [discount, setDiscount]         = useState("0");

  /* ── Payment ──────────────────────────────────────────── */
  const [paymentType, setPaymentType]   = useState("full");   // full | partial | none
  const [paymentMode, setPaymentMode]   = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate]   = useState(today());
  const [paidBy, setPaidBy]             = useState("");
  const [saving, setSaving]             = useState(false);

  const debouncedQ = useDebounce(customerQuery, 300);

  /* ── Reset on open ──────────────────────────────────────── */
  useEffect(() => {
    if (isOpen && inventoryItem) {
      const cp = inventoryItem.totalCostPrice || inventoryItem.baseCostPrice || "";
      setSellingPrice(String(cp));
      setDiscount("0");
      setPaymentType("full");
      setPaymentMode("cash");
      setPaymentDate(today());
      setPaidBy("");
      setSaleDate(today());
      setCustomerQuery("");
      setSelectedCustomer(null);
      setCustomerResults([]);
      setShowDropdown(false);
      setMode("search");
      setNewCust({ name:"", phone:"", alternatePhone:"", email:"", address:"", city:"", pincode:"", dateOfBirth:"", anniversary:"", referralSource:"" });
    }
  }, [isOpen, inventoryItem]);

  /* ── Amounts ──────────────────────────────────────────── */
  const parsedSelling  = Number(sellingPrice)  || 0;
  const parsedDiscount = Number(discount)      || 0;
  const finalPrice     = Math.max(parsedSelling - parsedDiscount, 0);

  useEffect(() => {
    if (paymentType === "full")  setPaymentAmount(String(finalPrice));
    if (paymentType === "none")  setPaymentAmount("0");
  }, [paymentType, finalPrice]);

  /* ── Customer search fetch ────────────────────────────── */
  useEffect(() => {
    if (!debouncedQ.trim() || selectedCustomer || mode !== "search") {
      if (!debouncedQ.trim()) { setCustomerResults([]); setShowDropdown(false); }
      return;
    }
    (async () => {
      setLoadingSearch(true);
      try {
        const res = await api.get(`/contacts?search=${encodeURIComponent(debouncedQ)}&category=Customer`);
        const data = res.data.contacts || res.data.data || [];
        setCustomerResults(data.slice(0, 8));
        setShowDropdown(true);
      } catch { setCustomerResults([]); }
      finally { setLoadingSearch(false); }
    })();
  }, [debouncedQ, selectedCustomer, mode]);

  /* Outside click */
  useEffect(() => {
    const h = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selectCustomer = useCallback((c) => {
    setSelectedCustomer(c);
    setCustomerQuery(c.name);
    setPaidBy(c.name || "");
    setShowDropdown(false);
    setMode("search");
  }, []);

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerQuery("");
    setPaidBy("");
    setMode("search");
    setCustomerResults([]);
  };

  /* ── Save new customer then use ───────────────────────── */
  const saveNewCustomer = async () => {
    if (!newCust.name.trim()) { notify.error("Customer name is required."); return; }
    try {
      const res = await api.post("/contacts", {
        name: newCust.name.trim(),
        phone: newCust.phone.trim() || undefined,
        alternatePhone: newCust.alternatePhone.trim() || undefined,
        email: newCust.email.trim() || undefined,
        address: newCust.address.trim() || undefined,
        city: newCust.city.trim() || undefined,
        pincode: newCust.pincode.trim() || undefined,
        categories: ["Customer"],
        customerDetails: {
          dateOfBirth: newCust.dateOfBirth || undefined,
          anniversary: newCust.anniversary || undefined,
          referralSource: newCust.referralSource.trim() || undefined,
        },
      });
      const c = res.data.contact || res.data.data;
      if (c) {
        selectCustomer(c);
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        notify.success(`Customer "${c.name}" created & selected!`);
      }
    } catch (err) {
      notify.error(err.response?.data?.message || "Failed to create customer");
    }
  };

  /* ── Submit sale ────────────────────────────────────────── */
  const handleSell = async () => {
    if (!sellingPrice || parsedSelling <= 0) { notify.error("Selling price must be > 0"); return; }
    if (!selectedCustomer && mode !== "walkin") { notify.error("Please select or create a customer."); return; }
    const parsedPayment = Number(paymentAmount) || 0;
    setSaving(true);
    try {
      const payload = {
        inventoryId: inventoryItem._id,
        sellingPrice: parsedSelling,
        discount: parsedDiscount,
        soldAt: saleDate,
        ...(mode === "walkin"
          ? { customerName: "Walk-in Customer" }
          : selectedCustomer?._id
          ? { customerId: selectedCustomer._id }
          : { customerName: selectedCustomer?.name }),
        payments: parsedPayment > 0
          ? [{
              amount: parsedPayment,
              mode: paymentMode,
              date: paymentDate,
              paidBy: (paidBy && paidBy.trim()) || (mode === "walkin" ? "Walk-in Customer" : selectedCustomer?.name) || "Customer",
            }]
          : [],
      };
      const res = await api.post("/sold", payload);
      if (res.data.success) {
        notify.success("Sale recorded! 🎉");
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        onClose();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || "Failed to record sale");
    } finally { setSaving(false); }
  };

  if (!isOpen || !inventoryItem) return null;

  const costDisplay = (inventoryItem.totalCostPrice || inventoryItem.baseCostPrice || 0).toLocaleString("en-IN");
  const isWalkin    = mode === "walkin";
  const isNewCust   = mode === "new";
  const isConfirmed = !!selectedCustomer;

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="sell-modal-overlay" onClick={onClose}>
      <div className="sell-modal-card sell-modal-card--wide" onClick={(e) => e.stopPropagation()}>

        {/* ═══ HEADER ═══ */}
        <div className="sell-modal-header">
          <div>
            <h5 className="sell-modal-title">Sell Item</h5>
            <span className="sell-modal-subtitle">{inventoryItem.productID} · {inventoryItem.category}</span>
          </div>
          <button className="sell-modal-close" onClick={onClose}><FiX /></button>
        </div>

        {/* ═══ TWO-COLUMN BODY ═══ */}
        <div className="sell-modal-body sell-modal-body--split">

          {/* ─── LEFT COLUMN ─── */}
          <div className="sell-col-left">

            {/* ── CUSTOMER SECTION ── */}
            <div className="sell-section">
              <div className="sell-section-heading">
                <FiUser className="sell-section-icon" />
                Customer <span className="text-danger">*</span>
              </div>

              {/* Selected / Walkin badge */}
              {(isConfirmed || isWalkin) && (
                <div className="sell-selected-customer-row">
                  <div className="sell-selected-avatar">
                    {isWalkin ? "🚶" : (selectedCustomer?.name?.[0] || "C")}
                  </div>
                  <div className="sell-selected-info">
                    <span className="sell-selected-name">{isWalkin ? "Walk-in Customer" : selectedCustomer?.name}</span>
                    {selectedCustomer?.phone && <span className="sell-selected-meta">{selectedCustomer.phone}</span>}
                    {isWalkin && <span className="sell-selected-meta text-warning">Full payment only</span>}
                  </div>
                  <button className="sell-clear-btn" onClick={clearCustomer}><FiX /></button>
                </div>
              )}

              {/* Search input (shown when not yet confirmed) */}
              {!isConfirmed && !isWalkin && !isNewCust && (
                <div className="sell-customer-wrap" ref={dropdownRef}>
                  <div className="sell-customer-input-row">
                    <FiUser className="sell-input-icon" />
                    <input
                      type="text"
                      className="sell-input"
                      placeholder="Search by name or phone..."
                      value={customerQuery}
                      onChange={(e) => { setCustomerQuery(e.target.value); setSelectedCustomer(null); }}
                      autoFocus
                    />
                    {loadingSearch && <span className="sell-spinner" />}
                  </div>

                  {/* Dropdown */}
                  {showDropdown && (
                    <div className="sell-customer-dropdown">
                      {customerResults.length > 0
                        ? customerResults.map((c) => (
                          <button key={c._id} className="sell-dropdown-item" onClick={() => selectCustomer(c)}>
                            <div className="sell-dropdown-avatar">{c.name?.[0] || "?"}</div>
                            <div>
                              <span className="sell-dropdown-name">{c.name}</span>
                              {c.phone && <span className="sell-dropdown-phone"> · {c.phone}</span>}
                            </div>
                          </button>
                        ))
                        : <div className="sell-dropdown-empty">No matching customers found</div>
                      }
                    </div>
                  )}

                  {/* Quick action row */}
                  <div className="sell-customer-quickbtns">
                    <button className="sell-quickbtn" onClick={() => setMode("new")}>
                      <FiPlus /> New Customer
                    </button>
                    <button className="sell-quickbtn sell-quickbtn--ghost" onClick={() => { setMode("walkin"); setSelectedCustomer({ walkin: true, name: "Walk-in Customer" }); }}>
                      <FiUser /> Walk-in
                    </button>
                  </div>
                </div>
              )}

              {/* New Customer form */}
              {isNewCust && (
                <div className="sell-new-customer-form">
                  <div className="sell-ncf-title"><FiPlus /> Create New Customer</div>

                  <div className="sell-ncf-grid">
                    <div className="sell-ncf-field sell-ncf-field--full">
                      <label className="sell-sublabel">Full Name *</label>
                      <div className="sell-input-wrap">
                        <FiUser className="sell-input-icon" />
                        <input className="sell-input sell-input--icon" type="text" placeholder="Full name"
                          value={newCust.name} onChange={(e) => setNewCust(f => ({ ...f, name: e.target.value }))} autoFocus />
                      </div>
                    </div>

                    <div className="sell-ncf-field">
                      <label className="sell-sublabel"><FiPhone className="me-1" />Phone</label>
                      <input className="sell-input" type="tel" placeholder="Primary phone"
                        value={newCust.phone} onChange={(e) => setNewCust(f => ({ ...f, phone: e.target.value }))} />
                    </div>

                    <div className="sell-ncf-field">
                      <label className="sell-sublabel"><FiPhone className="me-1" />Alternate Phone</label>
                      <input className="sell-input" type="tel" placeholder="Alternate"
                        value={newCust.alternatePhone} onChange={(e) => setNewCust(f => ({ ...f, alternatePhone: e.target.value }))} />
                    </div>

                    <div className="sell-ncf-field sell-ncf-field--full">
                      <label className="sell-sublabel"><FiMail className="me-1" />Email (optional)</label>
                      <input className="sell-input" type="email" placeholder="Email address"
                        value={newCust.email} onChange={(e) => setNewCust(f => ({ ...f, email: e.target.value }))} />
                    </div>

                    <div className="sell-ncf-field sell-ncf-field--full">
                      <label className="sell-sublabel"><FiMapPin className="me-1" />Address</label>
                      <input className="sell-input" type="text" placeholder="Street address"
                        value={newCust.address} onChange={(e) => setNewCust(f => ({ ...f, address: e.target.value }))} />
                    </div>

                    <div className="sell-ncf-field">
                      <label className="sell-sublabel">City</label>
                      <input className="sell-input" type="text" placeholder="City"
                        value={newCust.city} onChange={(e) => setNewCust(f => ({ ...f, city: e.target.value }))} />
                    </div>

                    <div className="sell-ncf-field">
                      <label className="sell-sublabel">Pincode</label>
                      <input className="sell-input" type="text" placeholder="PIN"
                        value={newCust.pincode} onChange={(e) => setNewCust(f => ({ ...f, pincode: e.target.value }))} />
                    </div>

                    <div className="sell-ncf-field">
                      <label className="sell-sublabel"><FiGift className="me-1" />Date of Birth</label>
                      <input className="sell-input" type="date"
                        value={newCust.dateOfBirth} onChange={(e) => setNewCust(f => ({ ...f, dateOfBirth: e.target.value }))} />
                    </div>

                    <div className="sell-ncf-field">
                      <label className="sell-sublabel"><FiGift className="me-1" />Anniversary</label>
                      <input className="sell-input" type="date"
                        value={newCust.anniversary} onChange={(e) => setNewCust(f => ({ ...f, anniversary: e.target.value }))} />
                    </div>

                    <div className="sell-ncf-field sell-ncf-field--full">
                      <label className="sell-sublabel">How did they find us?</label>
                      <input className="sell-input" type="text" placeholder="Referral source (optional)"
                        value={newCust.referralSource} onChange={(e) => setNewCust(f => ({ ...f, referralSource: e.target.value }))} />
                    </div>
                  </div>

                  <div className="sell-ncf-actions">
                    <button className="sell-btn-gold flex-fill" onClick={saveNewCustomer}>
                      <FiCheckCircle /> Save & Use Customer
                    </button>
                    <button className="sell-btn-outline" onClick={() => setMode("search")}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── SALE DATE ── */}
            <div className="sell-section">
              <div className="sell-section-heading">
                <FiCalendar className="sell-section-icon" /> Sale Date
              </div>
              <input type="date" className="sell-input" value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)} max={today()} />
            </div>

            {/* ── PRICING ── */}
            <div className="sell-section">
              <div className="sell-section-heading">
                <FaRupeeSign className="sell-section-icon" /> Pricing
              </div>
              <div className="sell-price-grid">
                <div>
                  <label className="sell-sublabel">Selling Price (₹) *</label>
                  <input type="number" className="sell-input sell-input--bold" min="0"
                    placeholder={`Cost: ₹${costDisplay}`}
                    value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
                </div>
                <div>
                  <label className="sell-sublabel">Discount (₹)</label>
                  <input type="number" className="sell-input" min="0"
                    value={discount} onChange={(e) => setDiscount(e.target.value)} />
                </div>
              </div>
              <div className="sell-final-price-row">
                <span>Final Price</span>
                <span className="sell-final-price-val">₹{finalPrice.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* ── PAYMENT ── */}
            <div className="sell-section">
              <div className="sell-section-heading">
                <FaRupeeSign className="sell-section-icon" /> Payment
              </div>

              {/* Payment type pills */}
              <div className="sell-payment-type-group">
                {[
                  { key: "full",    label: "Full Payment" },
                  { key: "partial", label: "Partial",      disabled: isWalkin },
                  { key: "none",    label: "No Payment",   disabled: isWalkin },
                ].map(({ key, label, disabled }) => (
                  <button
                    key={key}
                    className={`sell-payment-pill ${paymentType === key ? "active" : ""} ${disabled ? "disabled" : ""}`}
                    onClick={() => !disabled && setPaymentType(key)}
                    disabled={disabled}
                  >{label}</button>
                ))}
              </div>

              {paymentType !== "none" && (
                <>
                  <div className="sell-price-grid" style={{ marginTop: 10 }}>
                    <div>
                      <label className="sell-sublabel">Amount Received (₹)</label>
                      <input type="number" className="sell-input" min="0" max={finalPrice}
                        value={paymentAmount} readOnly={paymentType === "full"}
                        onChange={(e) => setPaymentAmount(e.target.value)} />
                    </div>
                    <div>
                      <label className="sell-sublabel">Payment Date</label>
                      <input type="date" className="sell-input" value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)} max={today()} />
                    </div>
                  </div>

                  <div>
                    <label className="sell-sublabel" style={{ marginTop: 8, display: "block" }}>Payment Mode</label>
                    <div className="sell-mode-group">
                      {["cash", "upi", "card", "bank_transfer"].map((m) => (
                        <button key={m} className={`sell-mode-pill ${paymentMode === m ? "active" : ""}`}
                          onClick={() => setPaymentMode(m)}>
                          {m === "bank_transfer" ? "Bank" : m.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <label className="sell-sublabel">Paid By</label>
                    <input
                      type="text"
                      className="sell-input"
                      placeholder={isWalkin ? "Walk-in Customer" : (selectedCustomer?.name || "Customer name")}
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                    />
                    <span className="sales-pm-hint">Default is customer name. Edit if paid by someone else (e.g. son, spouse)</span>
                  </div>
                </>
              )}

              {isWalkin && (
                <div className="sell-walkin-notice">
                  ⚡ Walk-in customer — only <strong>full payment</strong> accepted
                </div>
              )}
            </div>

          </div>{/* end left col */}

          {/* ─── RIGHT COLUMN ─── */}
          <div className="sell-col-right">

            {/* Product image */}
            <div className="sell-product-image-wrap">
              {inventoryItem.productImage
                ? <img src={inventoryItem.productImage} alt={inventoryItem.productName} className="sell-product-image" />
                : <div className="sell-product-image sell-product-image--placeholder">
                    <FaBoxOpen />
                  </div>
              }
            </div>

            {/* Product details */}
            <div className="sell-product-details-card">
              <div className="sell-product-id">{inventoryItem.productID}</div>
              <div className="sell-product-name">{inventoryItem.productName}</div>
              <div className="sell-product-category">{inventoryItem.category}</div>

              <div className="sell-product-specs">
                <div className="sell-spec-row">
                  <span className="sell-spec-label"><FaWeightHanging className="me-1" />Net Weight</span>
                  <span className="sell-spec-val">{inventoryItem.netWeight || 0}g</span>
                </div>
                <div className="sell-spec-row">
                  <span className="sell-spec-label"><FaWeightHanging className="me-1" />Gross Weight</span>
                  <span className="sell-spec-val">{inventoryItem.grossWeight || 0}g</span>
                </div>
                <div className="sell-spec-row">
                  <span className="sell-spec-label"><FaTag className="me-1" />Purity</span>
                  <span className="sell-spec-val">{inventoryItem.purity}%</span>
                </div>
                <div className="sell-spec-row">
                  <span className="sell-spec-label"><FaTag className="me-1" />Metal</span>
                  <span className="sell-spec-val">{inventoryItem.metalType || "Gold"}</span>
                </div>
              </div>

              {/* Cost price — visible only to owner */}
              <div className="sell-cost-price-owner">
                <span className="sell-cost-price-label">Your Cost Price</span>
                <span className="sell-cost-price-val">₹{costDisplay}</span>
              </div>

              {/* Live profit indicator */}
              {parsedSelling > 0 && (
                <div className={`sell-profit-indicator ${(parsedSelling - parsedDiscount - (inventoryItem.totalCostPrice || inventoryItem.baseCostPrice || 0)) >= 0 ? "profit" : "loss"}`}>
                  {(() => {
                    const profit = finalPrice - (inventoryItem.totalCostPrice || inventoryItem.baseCostPrice || 0);
                    return <>
                      {profit >= 0 ? "↑ Profit" : "↓ Loss"}: ₹{Math.abs(profit).toLocaleString("en-IN")}
                    </>;
                  })()}
                </div>
              )}
            </div>

          </div>{/* end right col */}

        </div>{/* end body split */}

        {/* ═══ FOOTER ═══ */}
        <div className="sell-modal-footer">
          <button className="sell-btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button
            className="sell-btn-gold"
            onClick={handleSell}
            disabled={saving || (!selectedCustomer && !isWalkin) || isNewCust}
          >
            {saving ? "Saving..." : <><FiCheckCircle className="me-2" />Confirm Sale</>}
          </button>
        </div>

      </div>
    </div>
  );
}
