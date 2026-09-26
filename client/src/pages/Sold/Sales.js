import React, { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { notify } from "../../components/Toast/toast";
import "./Sales.css";
import {
  FaSearch, FaChevronLeft, FaChevronRight, FaTimes,
  FaMoneyBillWave, FaCheckCircle, FaExclamationCircle,
  FaHourglassHalf, FaExpandAlt, FaCompressAlt, FaBoxOpen,
  FaReceipt, FaPlus,
} from "react-icons/fa";
import { FiUser, FiCalendar, FiX } from "react-icons/fi";
import LogoLoader from "../../components/Loader/LogoLoader";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

function statusBadge(status) {
  if (status === "paid")    return <span className="sales-badge sales-badge--paid"><FaCheckCircle /> Paid</span>;
  if (status === "partial") return <span className="sales-badge sales-badge--partial"><FaExclamationCircle /> Partial</span>;
  return                           <span className="sales-badge sales-badge--pending"><FaHourglassHalf /> Pending</span>;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const today = () => new Date().toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────
// Add Payment Modal
// ─────────────────────────────────────────────────────────────
function AddPaymentModal({ saleRecord, onClose, onSaved }) {
  const outstanding = Math.max(
    (saleRecord.finalPrice || 0) - (saleRecord.payments || []).reduce((s, p) => s + (p.amount || 0), 0),
    0
  );
  const customerName = saleRecord.customerId?.name || "Customer";

  const [amount, setAmount]   = useState(String(outstanding));
  const [mode, setMode]       = useState("cash");
  const [paidBy, setPaidBy]   = useState(customerName);
  const [date, setDate]       = useState(today());
  const [notes, setNotes]     = useState("");
  const [saving, setSaving]   = useState(false);

  const handleSave = async () => {
    const n = Number(amount);
    if (!n || n <= 0) { notify.error("Enter a valid payment amount."); return; }
    setSaving(true);
    try {
      const res = await api.post(`/sold/${saleRecord._id}/payment`, {
        amount: n, mode, paidBy: paidBy.trim() || customerName,
        date, notes: notes.trim(),
      });
      if (res.data.success) {
        notify.success("Payment recorded!");
        onSaved(res.data.data);
      }
    } catch (err) {
      notify.error(err.response?.data?.message || "Failed to record payment");
    } finally { setSaving(false); }
  };

  return (
    <div className="sales-payment-modal-overlay" onClick={onClose}>
      <div className="sales-payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sales-payment-modal-header">
          <span>Add Payment</span>
          <button onClick={onClose}><FiX /></button>
        </div>
        <div className="sales-payment-modal-body">
          <div className="sales-pm-row">
            <span className="sales-pm-label">Outstanding</span>
            <span className="sales-pm-val text-danger">₹{fmt(outstanding)}</span>
          </div>
          <div className="sales-pm-row">
            <span className="sales-pm-label">Billing ID</span>
            <span className="sales-pm-val">{saleRecord.billingID}</span>
          </div>

          <div className="sales-pm-field">
            <label>Amount (₹) *</label>
            <input type="number" className="sell-input" value={amount}
              onChange={(e) => setAmount(e.target.value)} min="0" max={outstanding} autoFocus />
          </div>

          <div className="sales-pm-field">
            <label>Payment Date</label>
            <input type="date" className="sell-input" value={date}
              onChange={(e) => setDate(e.target.value)} max={today()} />
          </div>

          <div className="sales-pm-field">
            <label>Paid By</label>
            <input type="text" className="sell-input" value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              placeholder={`Default: ${customerName}`} />
            <span className="sales-pm-hint">Change if someone else paid (e.g. son, spouse)</span>
          </div>

          <div className="sales-pm-field">
            <label>Payment Mode</label>
            <div className="sell-mode-group">
              {["cash","upi","card","bank_transfer"].map((m) => (
                <button key={m} className={`sell-mode-pill ${mode === m ? "active" : ""}`}
                  onClick={() => setMode(m)}>
                  {m === "bank_transfer" ? "Bank" : m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="sales-pm-field">
            <label>Notes (optional)</label>
            <input type="text" className="sell-input" value={notes}
              onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." />
          </div>
        </div>
        <div className="sales-payment-modal-footer">
          <button className="sell-btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="sell-btn-gold" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : <><FaPlus className="me-1" /> Record Payment</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Sales Page
// ─────────────────────────────────────────────────────────────
export default function Sales() {
  const queryClient = useQueryClient();

  // Filters
  const [searchTerm, setSearchTerm]     = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");

  // Selection
  const [selectedItem, setSelectedItem]     = useState(null);
  const [isExpandedView, setIsExpandedView] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Add payment modal
  const [addPaymentFor, setAddPaymentFor] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["sales", currentPage, rowsPerPage, debouncedSearch, statusFilter, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage,
        limit: rowsPerPage
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter && statusFilter !== "all") params.append("paymentStatus", statusFilter);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const res = await api.get("/sold?" + params.toString());
      return res.data;
    },
  });

  // ── Server-Side Data ───────────────────────────────────────
  const paginated = data?.data || [];
  const totals = data?.totals || {
    totalItems: 0,
    paidCount: 0,
    totalRevenue: 0,
    partialCount: 0,
    totalPartialPaid: 0,
    pendingCount: 0,
    totalOutstanding: 0
  };
  const totalPages = data?.pagination?.pages || 1;
  const statPaid = { length: totals.paidCount };
  const statPartial = { length: totals.partialCount };
  const statPending = { length: totals.pendingCount };
  const totalRevenue = totals.totalRevenue;
  const totalPartialPaid = totals.totalPartialPaid;
  const totalOutstanding = totals.totalOutstanding;

  const handleRowClick = useCallback((item) => {
    setSelectedItem(item);
    setIsExpandedView(false);
  }, []);

  const handlePaymentSaved = (updated) => {
    queryClient.invalidateQueries({ queryKey: ["sales"] });
    setSelectedItem(updated);
    setAddPaymentFor(null);
  };

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="sales-workspace">
      {isLoading && <LogoLoader fullScreen text="Loading Sales..." />}

      {/* Add Payment Modal */}
      {addPaymentFor && (
        <AddPaymentModal
          saleRecord={addPaymentFor}
          onClose={() => setAddPaymentFor(null)}
          onSaved={handlePaymentSaved}
        />
      )}

      {/* ── Header ── */}
      <div className="sales-header">
        <div className="sales-header-title">
          <FaReceipt className="sales-header-icon" />
          <div>
            <h2 className="sales-heading">Sales</h2>
            <span className="sales-heading-sub">{totals.totalItems} total transactions</span>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="sales-stat-cards">
        <div className="sales-stat-card">
          <div className="sales-stat-icon sales-stat-icon--total"><FaBoxOpen /></div>
          <div className="sales-stat-info">
            <span className="sales-stat-label">Total Sales</span>
            <span className="sales-stat-value">{totals.totalItems}</span>
            <span className="sales-stat-sub">All transactions</span>
          </div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-icon sales-stat-icon--paid"><FaCheckCircle /></div>
          <div className="sales-stat-info">
            <span className="sales-stat-label">Fully Paid</span>
            <span className="sales-stat-value">{statPaid.length}</span>
            <span className="sales-stat-sub">₹{fmt(totalRevenue)}</span>
          </div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-icon sales-stat-icon--partial"><FaExclamationCircle /></div>
          <div className="sales-stat-info">
            <span className="sales-stat-label">Partial</span>
            <span className="sales-stat-value">{statPartial.length}</span>
            <span className="sales-stat-sub">₹{fmt(totalPartialPaid)} received</span>
          </div>
        </div>
        <div className="sales-stat-card">
          <div className="sales-stat-icon sales-stat-icon--pending"><FaHourglassHalf /></div>
          <div className="sales-stat-info">
            <span className="sales-stat-label">Outstanding</span>
            <span className="sales-stat-value">₹{fmt(totalOutstanding)}</span>
            <span className="sales-stat-sub">{statPartial.length + statPending.length} unpaid</span>
          </div>
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className={`sales-content-grid ${selectedItem ? (isExpandedView ? "has-expanded-view" : "has-preview") : "no-preview"}`}>

        {/* ── LEFT: Table ── */}
        <div className="sales-main">

          {/* Filters */}
          <div className="sales-filters">
            <div className="sales-search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Search customer, product, billing ID, date..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="sales-filter-dropdowns">
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
              </select>
              <input type="date" className="sales-date-filter" value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                title="From date" placeholder="From" />
              <input type="date" className="sales-date-filter" value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                title="To date" placeholder="To" />
              {(dateFrom || dateTo || statusFilter !== "all" || searchTerm) && (
                <button className="sales-clear-filters" onClick={() => {
                  setSearchTerm(""); setStatusFilter("all"); setDateFrom(""); setDateTo(""); setCurrentPage(1);
                }}>✕ Clear</button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="sales-table-container">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>SALE</th>
                  <th>CUSTOMER</th>
                  <th>SALE DATE</th>
                  <th>FINAL</th>
                  <th>PAID</th>
                  <th>OUTSTANDING</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="sales-empty-row">
                      {searchTerm || statusFilter !== "all" || dateFrom || dateTo
                        ? "No sales matching your filters."
                        : "No sales recorded yet. Start selling from Inventory!"}
                    </td>
                  </tr>
                ) : paginated.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                  const totalPaid = (item.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
                  const outstanding = Math.max((item.finalPrice || 0) - totalPaid, 0);
                  const inv = item.inventoryId;
                  return (
                    <tr key={item._id} onClick={() => handleRowClick(item)}
                      className={selectedItem?._id === item._id ? "selected-row" : ""}>
                      <td className="row-number">{globalIdx}</td>
                      <td>
                        <div className="sales-product-cell">
                          <div className="sales-product-img">
                            {inv?.productImage
                              ? <img src={inv.productImage} alt="" />
                              : <div className="sales-img-placeholder"><FaBoxOpen /></div>
                            }
                          </div>
                          <div className="sales-product-info">
                            <span className="sales-prod-id">{item.billingID}</span>
                            <span className="sales-prod-name">{inv?.productName || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="sales-customer-cell">
                          <FiUser className="sales-customer-icon" />
                          <span>{item.customerId?.name || "Walk-in"}</span>
                        </div>
                      </td>
                      <td className="sales-date-cell">{fmtDate(item.soldAt || item.createdAt)}</td>
                      <td className="sales-final-cell">₹{fmt(item.finalPrice)}</td>
                      <td className="sales-paid-cell">₹{fmt(totalPaid)}</td>
                      <td className={outstanding > 0 ? "sales-outstanding-cell" : "text-muted"}>
                        {outstanding > 0 ? `₹${fmt(outstanding)}` : "—"}
                      </td>
                      <td>{statusBadge(item.paymentStatus)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {paginated.length > 0 && (
                <tfoot className="sales-table-tfoot">
                  <tr>
                    <td colSpan={4} className="total-title-cell"><span className="total-text">TOTAL —</span></td>
                    <td className="total-val-cell total-cost-val">₹{fmt(totalRevenue)}</td>
                    <td className="total-val-cell">₹{fmt(totalPartialPaid)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          <div className="sales-pagination">
            <div className="rows-per-page">
              <span>Rows per page:</span>
              <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="page-nav">
              <button className="page-nav-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}><FaChevronLeft /></button>
              <span className="page-num active">{currentPage}</span>
              <span className="very-small text-muted">of {totalPages}</span>
              <button className="page-nav-btn" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}><FaChevronRight /></button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Detail Panel ── */}
        {selectedItem && (() => {
          const item = selectedItem;
          const inv  = item.inventoryId;
          const cust = item.customerId;
          const totalPaid   = (item.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
          const outstanding = Math.max((item.finalPrice || 0) - totalPaid, 0);
          const canAddPayment = item.paymentStatus !== "paid" && outstanding > 0;

          return (
            <aside className={`sales-side-preview ${isExpandedView ? "sales-side-preview--expanded" : ""}`}>

              <div className="side-preview-header">
                <div>
                  <h3 className="side-prod-id">{item.billingID}</h3>
                  <h4 className="side-prod-name">{inv?.productName || "Sale Record"}</h4>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    {statusBadge(item.paymentStatus)}
                  </div>
                </div>
                <div className="side-preview-header__actions">
                  <button className={`icon-action-btn ${isExpandedView ? "active-gold" : ""}`}
                    onClick={() => setIsExpandedView(!isExpandedView)}>
                    {isExpandedView ? <FaCompressAlt /> : <FaExpandAlt />}
                  </button>
                  <button className="icon-action-btn" onClick={() => { setSelectedItem(null); setIsExpandedView(false); }}>
                    <FaTimes />
                  </button>
                </div>
              </div>

              <div className="sales-drawer-body">

                {/* Add Payment Button */}
                {canAddPayment && (
                  <button className="sales-add-payment-btn" onClick={() => setAddPaymentFor(item)}>
                    <FaPlus /> Add Payment · ₹{fmt(outstanding)} outstanding
                  </button>
                )}

                {/* Product image */}
                {inv?.productImage && (
                  <div className="sales-preview-image">
                    <img src={inv.productImage} alt={inv.productName} />
                  </div>
                )}

                {/* Customer Info */}
                <div className="sales-detail-section">
                  <div className="sales-detail-section-title"><FiUser /> Customer</div>
                  <div className="sales-detail-grid">
                    <div className="sales-detail-item">
                      <span className="sales-detail-label">Name</span>
                      <span className="sales-detail-val">{cust?.name || "Walk-in"}</span>
                    </div>
                    {cust?.phone && (
                      <div className="sales-detail-item">
                        <span className="sales-detail-label">Phone</span>
                        <span className="sales-detail-val">{cust.phone}</span>
                      </div>
                    )}
                    {cust?.email && (
                      <div className="sales-detail-item">
                        <span className="sales-detail-label">Email</span>
                        <span className="sales-detail-val">{cust.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sale Info */}
                <div className="sales-detail-section">
                  <div className="sales-detail-section-title"><FiCalendar /> Sale Details</div>
                  <div className="sales-detail-grid">
                    <div className="sales-detail-item">
                      <span className="sales-detail-label">Sale Date</span>
                      <span className="sales-detail-val">{fmtDate(item.soldAt || item.createdAt)}</span>
                    </div>
                    <div className="sales-detail-item">
                      <span className="sales-detail-label">Selling Price</span>
                      <span className="sales-detail-val">₹{fmt(item.sellingPrice)}</span>
                    </div>
                    {item.discount > 0 && (
                      <div className="sales-detail-item">
                        <span className="sales-detail-label">Discount</span>
                        <span className="sales-detail-val text-danger">−₹{fmt(item.discount)}</span>
                      </div>
                    )}
                    <div className="sales-detail-item">
                      <span className="sales-detail-label">Final Price</span>
                      <span className="sales-detail-val fw-bold">₹{fmt(item.finalPrice)}</span>
                    </div>
                    <div className="sales-detail-item">
                      <span className="sales-detail-label">Cost Price</span>
                      <span className="sales-detail-val text-muted">₹{fmt(item.inventoryPrice)}</span>
                    </div>
                    <div className="sales-detail-item">
                      <span className="sales-detail-label">Profit</span>
                      <span className={`sales-detail-val ${(item.profit || 0) >= 0 ? "text-success" : "text-danger"}`}>
                        {(item.profit || 0) >= 0 ? "+" : ""}₹{fmt(item.profit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="sales-detail-section">
                  <div className="sales-detail-section-title"><FaMoneyBillWave /> Payments</div>
                  <div className="sales-payment-summary">
                    <div className="sales-payment-bar-wrap">
                      <div className="sales-payment-bar-fill"
                        style={{ width: `${item.finalPrice > 0 ? Math.min((totalPaid / item.finalPrice) * 100, 100) : 0}%` }} />
                    </div>
                    <div className="sales-payment-amounts">
                      <span className="text-success">₹{fmt(totalPaid)} paid</span>
                      {outstanding > 0 && <span className="text-danger">₹{fmt(outstanding)} due</span>}
                    </div>
                  </div>

                  {(item.payments || []).length === 0 ? (
                    <div className="sales-no-payment">No payments recorded yet.</div>
                  ) : (
                    <div className="sales-payment-list">
                      {[...(item.payments || [])].reverse().map((p, i) => (
                        <div key={i} className="sales-payment-row">
                          <div>
                            <span className="sales-payment-mode">{p.mode?.toUpperCase() || "—"}</span>
                            {p.paidBy && p.paidBy !== (cust?.name || "Walk-in Customer") && (
                              <span className="sales-payment-paidby"> · via {p.paidBy}</span>
                            )}
                            <span className="sales-payment-date text-muted"> · {fmtDate(p.date)}</span>
                          </div>
                          <span className="sales-payment-amt">₹{fmt(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product details (expanded only) */}
                {isExpandedView && inv && (
                  <div className="sales-detail-section">
                    <div className="sales-detail-section-title"><FaBoxOpen /> Product Info</div>
                    <div className="sales-detail-grid">
                      <div className="sales-detail-item">
                        <span className="sales-detail-label">Product ID</span>
                        <span className="sales-detail-val">{inv.productID}</span>
                      </div>
                      <div className="sales-detail-item">
                        <span className="sales-detail-label">Category</span>
                        <span className="sales-detail-val">{inv.category || "—"}</span>
                      </div>
                      <div className="sales-detail-item">
                        <span className="sales-detail-label">Net Weight</span>
                        <span className="sales-detail-val">{inv.netWeight || 0}g</span>
                      </div>
                      <div className="sales-detail-item">
                        <span className="sales-detail-label">Purity</span>
                        <span className="sales-detail-val">{inv.purity}%</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </aside>
          );
        })()}
      </div>

      {/* ── Mobile Cards ── */}
      <div className="sales-mobile-list d-md-none">
        {paginated.length === 0 ? (
          <div className="sales-empty-mobile">No sales found.</div>
        ) : paginated.map((item) => {
          const totalPaid = (item.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
          const outstanding = Math.max((item.finalPrice || 0) - totalPaid, 0);
          const inv = item.inventoryId;
          return (
            <div key={item._id} className="sales-mobile-card"
              onClick={() => { setSelectedItem(item); setIsExpandedView(false); }}>
              <div className="sales-mobile-card-header">
                <div className="d-flex align-items-center gap-2">
                  {inv?.productImage
                    ? <img src={inv.productImage} alt="" className="sales-mobile-thumb" />
                    : <div className="sales-mobile-thumb sales-mobile-thumb--placeholder"><FaBoxOpen /></div>
                  }
                  <div>
                    <div className="sales-mobile-billing">{item.billingID}</div>
                    <div className="sales-mobile-product">{inv?.productName || "Sale"}</div>
                  </div>
                </div>
                {statusBadge(item.paymentStatus)}
              </div>
              <div className="sales-mobile-row">
                <span className="text-muted very-small">{item.customerId?.name || "Walk-in"}</span>
                <span className="very-small text-muted">{fmtDate(item.soldAt || item.createdAt)}</span>
              </div>
              <div className="sales-mobile-amounts">
                <div>
                  <div className="very-small text-muted">Final Price</div>
                  <div className="fw-bold">₹{fmt(item.finalPrice)}</div>
                </div>
                <div>
                  <div className="very-small text-muted">Paid</div>
                  <div className="fw-bold text-success">₹{fmt(totalPaid)}</div>
                </div>
                {outstanding > 0 && (
                  <div>
                    <div className="very-small text-muted">Due</div>
                    <div className="fw-bold text-danger">₹{fmt(outstanding)}</div>
                  </div>
                )}
              </div>
              {item.paymentStatus !== "paid" && outstanding > 0 && (
                <button className="sales-add-payment-btn-mobile"
                  onClick={(e) => { e.stopPropagation(); setAddPaymentFor(item); }}>
                  <FaPlus /> Add Payment
                </button>
              )}
            </div>
          );
        })}
        {totalPages > 1 && (
          <div className="sales-mobile-pagination">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>‹ Prev</button>
            <span>{currentPage} / {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next ›</button>
          </div>
        )}
      </div>
    </div>
  );
}
