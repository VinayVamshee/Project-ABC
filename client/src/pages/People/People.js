import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";
import { toast } from "react-toastify";
import "./People.css";
import {
  FaSearch,
  FaPlus,
  FaTimes,
  FaFilter,
  FaSort,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaEdit,
  FaTrash,
  FaExpandAlt,
  FaCompressAlt,
  FaBars,
  FaArrowUp,
  FaArrowDown,
  FaCopy,
  FaExternalLinkAlt,
} from "react-icons/fa";

const TABS = [
  { label: "All", value: null, key: "All" },
  { label: "Customer", value: "Customer", key: "Customer" },
  { label: "Worker", value: "Worker", key: "Worker" },
  { label: "Wholeseller", value: "Wholeseller", key: "Wholeseller" },
];

const AVATAR_COLORS = [
  { bg: "#FEE2E2", color: "#991B1B" },
  { bg: "#E0E7FF", color: "#3730A3" },
  { bg: "#D1FAE5", color: "#065F46" },
  { bg: "#FEF3C7", color: "#92400E" },
  { bg: "#FCE7F3", color: "#9D174D" },
  { bg: "#EDE9FE", color: "#5B21B6" },
  { bg: "#DBEAFE", color: "#1E40AF" },
  { bg: "#ECFDF5", color: "#047857" },
];

function getAvatarColor(name) {
  return AVATAR_COLORS[(name || "A").charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name) {
  const parts = (name || "?").trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

const ROWS_PER_PAGE = 10;

const INITIAL_FORM = {
  personType: "Customer",
  name: "",
  businessName: "",
  contactPerson: "",
  phone: "",
  alternatePhone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  customerDetails: { dateOfBirth: "", anniversary: "", referralSource: "" },
  workerDetails: {
    workerType: "Goldsmith",
    specialization: "",
    paymentType: "Per Gram",
    defaultRate: "",
  },
  supplierDetails: {
    supplierType: "Jewellery Supplier",
    supplierCode: "",
    preferredPaymentMethod: "Cash",
    paymentTerms: "Immediate",
  },
  gstNumber: "",
  panNumber: "",
  notes: "",
};

export default function People() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [tabCounts, setTabCounts] = useState({});
  const [activeTab, setActiveTab] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const location = useLocation();
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [mobileSelectedContact, setMobileSelectedContact] = useState(null);
  const [mobileTransactions, setMobileTransactions] = useState([]);
  const [mobileBalance, setMobileBalance] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [showAllPersonTxns, setShowAllPersonTxns] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);

  // Customer Sales state
  const [customerSales, setCustomerSales] = useState([]);
  const [loadingCustomerSales, setLoadingCustomerSales] = useState(false);

  // Drawer / Form state (Create and Edit)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.ceil(total / ROWS_PER_PAGE);

  // ── Fetch contacts from Backend API ──────────────────────
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: ROWS_PER_PAGE });
      if (activeTab) params.append("category", activeTab);
      if (search) params.append("search", search);
      const res = await api.get("/contacts?" + params.toString());
      if (res.data.success) {
        let items = res.data.contacts || [];
        if (!sortAsc) {
          items = [...items].reverse();
        }
        setContacts(items);
        setTotal(res.data.total || 0);
      }
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search, sortAsc]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // ── Fetch real tab counts from Backend API ───────────────
  const fetchCounts = useCallback(async () => {
    try {
      const res = await api.get("/contacts?limit=2000");
      if (res.data.success) {
        const all = res.data.contacts || [];
        const c = { All: res.data.total || all.length };
        [
          "Customer",
          "Worker",
          "Wholeseller",
        ].forEach((cat) => {
          c[cat] = all.filter((x) => x.categories?.includes(cat)).length;
        });
        setTabCounts(c);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  
  const renderGoldValue = (weightGrams, valuation) => {
    if (!weightGrams) return "0.000g";
    const str = `${weightGrams}g`;
    if (valuation > 0) {
      return (
        <span>
          {str} <span className="text-muted" style={{fontSize: '0.85em', fontWeight: 500}}>(₹{Math.round(valuation).toLocaleString("en-IN")})</span>
        </span>
      );
    }
    return str;
  };

  // ── Fetch real ledger balances & transactions for contact ──
  const fetchContactLedgerData = useCallback(async (contactId) => {
    if (!contactId) return;
    setLoadingLedger(true);
    try {
      // 1. Fetch real balances
      const balRes = await api.get(`/ledger/balances/${contactId}`);
      if (balRes.data && balRes.data.balances) {
        setMobileBalance(balRes.data.balances);
      } else if (balRes.data) {
        setMobileBalance(balRes.data);
      }
    } catch {
      setMobileBalance(null);
    }

    try {
      // 2. Fetch real transactions (up to 100)
      const txnRes = await api.get(`/ledger/transactions?contactId=${contactId}&limit=20`);
      if (txnRes.data && txnRes.data.success) {
        setMobileTransactions(txnRes.data.transactions || []);
      } else {
        setMobileTransactions([]);
      }
    } catch {
      setMobileTransactions([]);
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  const fetchCustomerSales = useCallback(async (contactId) => {
    if (!contactId) return;
    setLoadingCustomerSales(true);
    try {
      const res = await api.get(`/sold?customerId=${contactId}&limit=100`);
      if (res.data && res.data.success) {
        setCustomerSales(res.data.data || []);
      } else {
        setCustomerSales([]);
      }
    } catch {
      setCustomerSales([]);
    } finally {
      setLoadingCustomerSales(false);
    }
  }, []);

  const fetchContactData = useCallback((c) => {
    if (!c) return;
    if (primaryCat(c) === "Customer") {
      fetchCustomerSales(c._id);
    } else {
      fetchContactLedgerData(c._id);
    }
  }, [fetchCustomerSales, fetchContactLedgerData]);

  // ── Open contact from URL query param if present (?contactId=...) ──
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cid = params.get("contactId") || params.get("id");
    if (cid) {
      api.get(`/contacts/${cid}`).then((res) => {
        if (res.data.success && res.data.contact) {
          setSelected(res.data.contact);
          setMobileSelectedContact(res.data.contact);
          setMobileDetailOpen(true);
          fetchContactData(res.data.contact);
        }
      }).catch(console.error);
    }
  }, [location.search, fetchContactData]);


  const handleCloseContactView = () => {
    const params = new URLSearchParams(location.search);
    if (params.get("from")) {
      navigate(-1);
    } else {
      setSelected(null);
      setMobileSelectedContact(null);
      setMobileDetailOpen(false);
      setIsExpanded(false);
      // Remove query param if present
      if (params.get("contactId") || params.get("id")) {
        navigate("/people", { replace: true });
      }
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab.value);
    setPage(1);
    setSelected(null);
    setIsExpanded(false);
  };

  const handleRowClick = (c) => {
    if (selected?._id === c._id) {
      setSelected(null);
      setIsExpanded(false);
    } else {
      setSelected(c);
      setIsExpanded(false);
      fetchContactData(c);
    }
    setDrawerOpen(false);
  };

  const handleMobileCardClick = (c) => {
    setMobileSelectedContact(c);
    setSelected(c);
    setMobileDetailOpen(true);
    fetchContactData(c);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setDrawerOpen(true);
    setSelected(null);
    setIsExpanded(false);
  };

  const handleOpenEdit = (c) => {
    setEditingId(c._id);
    setForm({
      personType: (c.categories && c.categories[0]) || "Customer",
      name: c.name || "",
      businessName: c.businessName || "",
      contactPerson: c.contactPerson || "",
      phone: c.phone || "",
      alternatePhone: c.alternatePhone || "",
      email: c.email || "",
      address: c.address || "",
      city: c.city || "",
      state: c.state || "",
      pincode: c.pincode || "",
      customerDetails: c.customerDetails || { dateOfBirth: "", anniversary: "", referralSource: "" },
      workerDetails: c.workerDetails || { workerType: "Goldsmith", specialization: "", paymentType: "Per Gram", defaultRate: "" },
      supplierDetails: c.supplierDetails || { supplierType: "Jewellery Supplier", supplierCode: "", preferredPaymentMethod: "Cash", paymentTerms: "Immediate" },
      gstNumber: c.gstNumber || "",
      panNumber: c.panNumber || "",
      notes: c.notes || "",
    });
    setDrawerOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await api.delete(`/contacts/${contactId}`);
      if (res.data.success) {
        toast.success("Contact deleted successfully");
        if (selected?._id === contactId) {
          setSelected(null);
          setIsExpanded(false);
        }
        if (mobileSelectedContact?._id === contactId) {
          setMobileDetailOpen(false);
          setMobileSelectedContact(null);
        }
        fetchContacts();
        fetchCounts();
      }
    } catch {
      toast.error("Failed to delete contact");
    }
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      let res;
      if (editingId) {
        res = await api.patch(`/contacts/${editingId}`, {
          ...form,
          categories: [form.personType],
        });
      } else {
        res = await api.post("/contacts", {
          ...form,
          categories: [form.personType],
        });
      }

      if (res.data.success) {
        toast.success(editingId ? "Contact updated!" : "Contact saved!");
        setDrawerOpen(false);
        setEditingId(null);
        setForm(INITIAL_FORM);
        fetchContacts();
        fetchCounts();
        if (editingId && selected?._id === editingId) {
          setSelected(res.data.contact || null);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const primaryCat = (c) => (c.categories && c.categories[0]) || "Customer";

  const roleLabel = (c) => {
    const cat = primaryCat(c);
    if (cat === "Worker")
      return (
        c.workerDetails?.workerType || c.workerDetails?.specialization || "Karigar"
      );
    if (cat === "Wholeseller" || cat === "Supplier")
      return (
        c.supplierDetails?.supplierType || c.businessName || "Wholesale Merchant"
      );
    return c.businessName || "—";
  };

  const pageNumbers = () => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (page >= totalPages - 3)
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const hasPanel = Boolean(selected);
  const hasExpanded = Boolean(selected && isExpanded);

  // Calculate actual total volume/value from real transactions
  const computeTotalValue = (txns) => {
    if (!txns || txns.length === 0) return 0;
    return txns.reduce((acc, t) => {
      if (t.assetType === "money") {
        return acc + (t.money?.amount || 0);
      }
      if (t.assetType === "gold") {
        const val = t.gold?.valuation || (t.gold?.weight || 0) * (t.gold?.ratePerGram || 7000);
        return acc + val;
      }
      return acc;
    }, 0);
  };

  // Calculate Customer Sales stats
  let custTotalItems = 0;
  let custTotalSpent = 0;
  let custTotalPaid = 0;
  customerSales.forEach(s => {
    custTotalItems += 1;
    custTotalSpent += s.finalPrice || 0;
    const p = (s.payments || []).reduce((sum, pay) => sum + (pay.amount || 0), 0);
    custTotalPaid += p;
  });
  const custTotalRemaining = Math.max(0, custTotalSpent - custTotalPaid);

  return (
    <div className="ppl-workspace">
      {/* ============================================================
         DESKTOP SECTION (>= 768px)
         ============================================================ */}
      <div className="ppl-header">
        <div className="ppl-header-left">
          <div className="ppl-icon-wrap">
            <FaUser />
          </div>
          <div>
            <h1 className="ppl-title">People</h1>
            <p className="ppl-subtitle">
              Manage all your customers, workers, suppliers and business contacts
            </p>
          </div>
        </div>
        <button className="ppl-add-btn" onClick={handleOpenCreate}>
          <FaPlus /> Add Person <FaChevronDown className="btn-caret" />
        </button>
      </div>

      {/* TABS (DESKTOP) */}
      <div className="ppl-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            className={
              "ppl-tab" +
              (activeTab === tab.value ? " active" : "")
            }
            onClick={() => handleTabClick(tab)}
          >
            <span className="tab-label">{tab.label}</span>
            <span className="tab-count">{tabCounts[tab.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* SEARCH + CONTROLS (DESKTOP) */}
      <div className="ppl-controls">
        <div className="ppl-search-box">
          <FaSearch className="s-icon" />
          <input
            type="text"
            placeholder="Search by name, phone, business name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              className="s-clear"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
            >
              <FaTimes />
            </button>
          )}
        </div>
        <div className="ppl-ctrl-btns">
          <button className="ppl-ctrl-btn">
            <FaFilter /> Filter
          </button>
          <button
            className="ppl-ctrl-btn icon-only"
            onClick={() => setSortAsc(!sortAsc)}
            title="Toggle sort order"
          >
            <FaSort />
          </button>
        </div>
      </div>

      {/* CONTENT GRID (DESKTOP) */}
      <div
        className={
          "ppl-content-grid" +
          (hasPanel ? " has-panel" : "") +
          (hasExpanded ? " has-expanded" : "")
        }
      >
        {/* LEFT: MAIN TABLE */}
        <div className="ppl-main-table">
          <div className="ppl-table-scroll">
            <table className="ppl-table">
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>PHONE</th>
                  <th>TYPE</th>
                  <th>BUSINESS / ROLE</th>
                  <th>STATUS</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="6" className="ppl-empty-cell">
                      Loading...
                    </td>
                  </tr>
                )}
                {!loading && contacts.length === 0 && (
                  <tr>
                    <td colSpan="6" className="ppl-empty-cell">
                      <div className="ppl-empty-state">
                        <div className="empty-emoji">👥</div>
                        <h3>No people found</h3>
                        <p>
                          {search
                            ? `No contacts match "${search}".`
                            : activeTab
                            ? `No ${activeTab}s added yet.`
                            : "No contacts yet. Add your first person!"}
                        </p>
                        {!search && (
                          <button
                            className="ppl-add-btn sm"
                            onClick={handleOpenCreate}
                          >
                            <FaPlus /> Add Person
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                {!loading &&
                  contacts.map((c) => {
                    const av = getAvatarColor(c.name);
                    const cat = primaryCat(c);
                    const catSlug = (cat || "other").toLowerCase();
                    return (
                      <tr
                        key={c._id}
                        className={
                          "ppl-row" + (selected?._id === c._id ? " selected-row" : "")
                        }
                        onClick={() => handleRowClick(c)}
                      >
                        <td>
                          <div className="name-cell">
                            <div
                              className="ppl-avatar"
                              style={{ background: av.bg, color: av.color }}
                            >
                              {getInitials(c.name)}
                            </div>
                            <div>
                              <div className="cell-name">{c.name}</div>
                              {c.businessName && (
                                <div className="cell-sub">{c.businessName}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="cell-muted">{c.phone || "—"}</td>
                        <td>
                          <span className={`type-badge badge-${catSlug}`}>
                            {cat}
                          </span>
                        </td>
                        <td className="cell-muted">{roleLabel(c)}</td>
                        <td>
                          <span
                            className={
                              "status-pill " +
                              (c.status === "Active" ? "active" : "inactive")
                            }
                          >
                            <span className="s-dot" />
                            {c.status || "Active"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="row-menu-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(c);
                            }}
                            title="Edit Contact"
                          >
                            <FaEdit />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="ppl-pagination">
              <button
                className="pg-btn nav"
                disabled={page === 1}
                onClick={() => setPage(1)}
              >
                <FaChevronLeft />
                <FaChevronLeft />
              </button>
              <button
                className="pg-btn nav"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <FaChevronLeft />
              </button>
              {pageNumbers().map((n, i) =>
                n === "..." ? (
                  <span key={"e" + i} className="pg-dot">
                    ...
                  </span>
                ) : (
                  <button
                    key={n}
                    className={"pg-btn" + (page === n ? " active" : "")}
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </button>
                )
              )}
              <button
                className="pg-btn nav"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <FaChevronRight />
              </button>
              <button
                className="pg-btn nav"
                disabled={page === totalPages}
                onClick={() => setPage(totalPages)}
              >
                <FaChevronRight />
                <FaChevronRight />
              </button>
              <span className="pg-info">
                Showing {(page - 1) * ROWS_PER_PAGE + 1}–
                {Math.min(page * ROWS_PER_PAGE, total)} of {total}
              </span>
            </div>
          )}
        </div>

        {/* RIGHT: SIDE PANEL (DESKTOP) */}
        {selected && (
          <div className={"ppl-side-panel" + (isExpanded ? " expanded" : "")}>
            {(() => {
              const av = getAvatarColor(selected.name);
              const cat = primaryCat(selected);
              return (
                <>
                  {/* Panel Header */}
                  <div className="sp-header">
                    <div className="sp-top-row">
                      <div className="sp-avatar-wrap">
                        <div
                          className="sp-avatar"
                          style={{ background: av.bg, color: av.color }}
                        >
                          {getInitials(selected.name)}
                        </div>
                      </div>
                      <div className="sp-title-block">
                        <span
                          className={`type-badge sm badge-${(
                            cat || "other"
                          ).toLowerCase()}`}
                        >
                          {cat}
                        </span>
                        <h3 className="sp-name">{selected.name}</h3>
                        {selected.businessName && (
                          <p className="sp-biz">{selected.businessName}</p>
                        )}
                      </div>
                      <span
                        className={
                          "sp-status " +
                          (selected.status === "Active" ? "active" : "inactive")
                        }
                      >
                        ● {selected.status || "Active"}
                      </span>
                      <button
                        className="sp-close"
                        onClick={handleCloseContactView}
                      >
                        <FaTimes />
                      </button>
                    </div>

                    {/* Action Buttons */}
                    <div className="sp-actions">
                      <button
                        className="sp-btn outline"
                        onClick={() => handleOpenEdit(selected)}
                      >
                        <FaEdit /> Edit
                      </button>
                      <button
                        className="sp-btn outline text-danger"
                        onClick={() => handleDeleteContact(selected._id)}
                      >
                        <FaTrash /> Delete
                      </button>
                      {!isExpanded ? (
                        <button
                          className="sp-btn gold"
                          onClick={() => setIsExpanded(true)}
                        >
                          <FaExpandAlt /> Full Profile
                        </button>
                      ) : (
                        <button
                          className="sp-btn outline"
                          onClick={() => setIsExpanded(false)}
                        >
                          <FaCompressAlt /> Collapse
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="sp-section">
                    <div className="sp-section-title">Contact Information</div>
                    {selected.phone && (
                      <div className="sp-info-row">
                        <FaPhone className="sp-info-icon" />
                        <span>
                          {selected.phone}
                          {selected.alternatePhone
                            ? ` / ${selected.alternatePhone}`
                            : ""}
                        </span>
                      </div>
                    )}
                    {selected.email && (
                      <div className="sp-info-row">
                        <FaEnvelope className="sp-info-icon" />
                        <span>{selected.email}</span>
                      </div>
                    )}
                    {(selected.address || selected.city) && (
                      <div className="sp-info-row">
                        <FaMapMarkerAlt className="sp-info-icon" />
                        <span>
                          {[
                            selected.address,
                            selected.city,
                            selected.state,
                            selected.pincode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {primaryCat(selected) === "Customer" ? (
                    <div className="sp-section">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="sp-section-title mb-0">Purchase Summary</div>
                        <span className="text-muted very-small">
                          {customerSales.length} items
                        </span>
                      </div>
                      <div className="sp-stats-grid mb-3">
                        <div className="sp-stat">
                          <label>Total Spent</label>
                          <span className="fw-bold">₹ {custTotalSpent.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="sp-stat">
                          <label>Outstanding Balance</label>
                          <span className={custTotalRemaining > 0 ? "text-danger fw-bold" : "text-success fw-bold"}>
                            ₹ {custTotalRemaining.toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mb-2 mt-3">
                        <div className="sp-section-title mb-0">Recent Purchases</div>
                      </div>
                      {loadingCustomerSales ? (
                        <div className="py-2 text-center text-muted small">Loading purchases...</div>
                      ) : customerSales.length === 0 ? (
                        <div className="py-2 text-center text-muted small">No purchases recorded yet.</div>
                      ) : (
                        <div className="d-flex flex-column gap-2">
                          {customerSales.slice(0, 10).map((s) => {
                            const paid = (s.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                            const rem = Math.max(0, (s.finalPrice || 0) - paid);
                            const isPaid = rem <= 0;
                            return (
                              <div key={s._id} className="mobile-txn-row p-2 border rounded" onClick={() => navigate("/sales")} style={{cursor: 'pointer'}}>
                                <div className="mobile-txn-details">
                                  <span className="mobile-txn-title text-truncate fw-bold" style={{ maxWidth: "180px", fontSize: '13px' }}>
                                    {s.inventoryId?.productName || "Product"}
                                  </span>
                                  <span className="mobile-txn-sub mt-1">
                                    {new Date(s.soldAt || s.createdAt).toLocaleDateString("en-IN", {
                                      day: "numeric", month: "short", year: "numeric"
                                    })}
                                  </span>
                                </div>
                                <div className="d-flex flex-column align-items-end">
                                  <span className="fw-bold text-dark" style={{fontSize: '13px'}}>
                                    ₹ {(s.finalPrice || 0).toLocaleString("en-IN")}
                                  </span>
                                  {isPaid ? (
                                    <span className="badge bg-success mt-1" style={{fontSize: '10px'}}>Paid</span>
                                  ) : (
                                    <span className="text-danger fw-semibold mt-1" style={{fontSize: '11px'}}>Due: ₹ {rem.toLocaleString("en-IN")}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {customerSales.length > 10 && !isExpanded && (
                            <button className="btn btn-outline btn-sm w-100 py-1 very-small mt-1" onClick={() => setIsExpanded(true)}>
                              View All Purchases
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Live Outstanding Summary on Side Panel */}
                      <div className="sp-section">
                        <div className="sp-section-title">Ledger Balance Summary</div>
                        <div className="sp-stats-grid">
                          <div className="sp-stat">
                            <label>Money Receivable</label>
                            <span className="text-success">
                              ₹ {(mobileBalance?.moneyOwedToOwner || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="sp-stat">
                            <label>Money Payable</label>
                            <span className="text-danger">
                              ₹ {(mobileBalance?.moneyOwnerOwes || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="sp-stat">
                            <label>Gold Receivable</label>
                            <span className="text-success">
                              {renderGoldValue((mobileBalance?.goldOwedToOwner || 0).toFixed(3), mobileBalance?.goldOwedToOwnerValuation || 0)}
                            </span>
                          </div>
                          <div className="sp-stat">
                            <label>Gold Payable</label>
                            <span className="text-danger">
                              {renderGoldValue((mobileBalance?.goldOwnerOwes || 0).toFixed(3), mobileBalance?.goldOwnerOwesValuation || 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Transaction History (Last 10 by default with Show All toggle) */}
                      <div className="sp-section">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="sp-section-title mb-0">Transaction History</div>
                          <span className="text-muted very-small">
                            {mobileTransactions.length} recorded
                          </span>
                        </div>

                        {loadingLedger ? (
                          <div className="py-2 text-center text-muted small">Loading transactions...</div>
                        ) : mobileTransactions.length === 0 ? (
                          <div className="py-2 text-center text-muted small">No transactions recorded yet.</div>
                        ) : (
                          <div className="d-flex flex-column gap-2">
                            {(showAllPersonTxns ? mobileTransactions : mobileTransactions.slice(0, 20)).map((t) => {
                              const isIncoming =
                                t.providerId?._id === selected._id ||
                                t.providerId === selected._id;
                              const isMoney = t.assetType === "money";
                              const formattedDate = new Date(t.transactionDate || t.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              });

                              return (
                                <div key={t._id || t.txnId} className="mobile-txn-row">
                                  <div className={`mobile-txn-icon-wrap ${isIncoming ? "in" : "out"}`}>
                                    {isIncoming ? <FaArrowUp /> : <FaArrowDown />}
                                  </div>
                                  <div className="mobile-txn-details">
                                    <span className="mobile-txn-title text-truncate" style={{ maxWidth: "210px" }}>
                                      {t.description || (isIncoming ? "Payment Received" : "Payment Sent")}
                                    </span>
                                    <span className="mobile-txn-sub">
                                      {formattedDate} • {t.paymentMethod || t.transactionType || "Ledger"}
                                    </span>
                                  </div>
                                  <span className={`mobile-txn-amount ${isIncoming ? "in" : "out"}`}>
                                    {isMoney
                                      ? `₹ ${(t.money?.amount || 0).toLocaleString("en-IN")}`
                                      : `${(t.gold?.weight || 0).toFixed(3)} g`}
                                  </span>
                                </div>
                              );
                            })}

                            {mobileTransactions.length > 10 && (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm w-100 py-1 very-small mt-1"
                                onClick={() => setShowAllPersonTxns(!showAllPersonTxns)}
                              >
                                {showAllPersonTxns
                                  ? "Show Last 10 Transactions"
                                  : `Show All ${mobileTransactions.length} Transactions`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Stats grid */}
                  {!isExpanded && (
                    <div className="sp-stats-grid">
                      {selected.gstNumber && (
                        <div className="sp-stat">
                          <label>GST</label>
                          <span>{selected.gstNumber}</span>
                        </div>
                      )}
                      {selected.panNumber && (
                        <div className="sp-stat">
                          <label>PAN</label>
                          <span>{selected.panNumber}</span>
                        </div>
                      )}
                      {selected.workerDetails?.workerType && (
                        <div className="sp-stat">
                          <label>Worker Type</label>
                          <span>{selected.workerDetails.workerType}</span>
                        </div>
                      )}
                      {selected.supplierDetails?.supplierType && (
                        <div className="sp-stat">
                          <label>Supplier Type</label>
                          <span>{selected.supplierDetails.supplierType}</span>
                        </div>
                      )}
                      {selected.notes && (
                        <div className="sp-stat full-span">
                          <label>Notes</label>
                          <span>{selected.notes}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* EXPANDED FULL PROFILE */}
                  {isExpanded && (
                    <div className="sp-expanded-body">
                      {primaryCat(selected) === "Customer" ? (
                        <div className="sp-expanded-card h-100 d-flex flex-column">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="sp-card-title mb-0">Complete Purchase History</h5>
                            <span className="badge bg-light text-dark">{customerSales.length} total items</span>
                          </div>
                          
                          {loadingCustomerSales ? (
                            <div className="py-4 text-center text-muted">Loading complete history...</div>
                          ) : customerSales.length === 0 ? (
                            <div className="py-4 text-center text-muted">No purchases found.</div>
                          ) : (
                            <div className="table-responsive flex-grow-1" style={{maxHeight: 'calc(100vh - 250px)', overflowY: 'auto'}}>
                              <table className="table table-hover align-middle mb-0" style={{fontSize: '13px'}}>
                                <thead className="table-light sticky-top">
                                  <tr>
                                    <th>Date</th>
                                    <th>Item</th>
                                    <th className="text-end">Price (₹)</th>
                                    <th className="text-end">Paid (₹)</th>
                                    <th className="text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {customerSales.map((s) => {
                                    const paid = (s.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                                    const rem = Math.max(0, (s.finalPrice || 0) - paid);
                                    const isPaid = rem <= 0;
                                    return (
                                      <tr key={s._id} onClick={() => navigate("/sales")} style={{cursor: 'pointer'}}>
                                        <td className="text-nowrap">{new Date(s.soldAt || s.createdAt).toLocaleDateString("en-IN", {
                                          day: "2-digit", month: "short", year: "numeric"
                                        })}</td>
                                        <td className="fw-bold">{s.inventoryId?.productName || "Product"}</td>
                                        <td className="text-end fw-semibold">{(s.finalPrice || 0).toLocaleString("en-IN")}</td>
                                        <td className="text-end text-success">{paid.toLocaleString("en-IN")}</td>
                                        <td className="text-center">
                                          {isPaid ? (
                                            <span className="badge bg-success">Paid</span>
                                          ) : (
                                            <span className="badge bg-danger">Due: {rem.toLocaleString("en-IN")}</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="sp-expanded-card">
                            <h5 className="sp-card-title">Personal Details</h5>
                            <div className="sp-expanded-grid">
                              {selected.businessName && (
                                <div className="sp-exp-row">
                                  <label>Business</label>
                                  <span>{selected.businessName}</span>
                                </div>
                              )}
                              {selected.gstNumber && (
                                <div className="sp-exp-row">
                                  <label>GST Number</label>
                                  <span className="mono">{selected.gstNumber}</span>
                                </div>
                              )}
                              {selected.panNumber && (
                                <div className="sp-exp-row">
                                  <label>PAN Number</label>
                                  <span className="mono">{selected.panNumber}</span>
                                </div>
                              )}
                              <div className="sp-exp-row">
                                <label>Status</label>
                                <span
                                  className={
                                    "sp-status " +
                                    (selected.status === "Active"
                                      ? "active"
                                      : "inactive")
                                  }
                                >
                                  ● {selected.status || "Active"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          {selected.notes && (
                            <div className="sp-expanded-card">
                              <h5 className="sp-card-title">Notes</h5>
                              <p className="sp-notes-text">{selected.notes}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* ============================================================
         📱 IPHONE 15 PRO MAX MOBILE REDESIGNED PEOPLE EXPERIENCE
         (100% Real API Data)
         ============================================================ */}
      <div className="mobile-people-view">
        {/* MOBILE HEADER */}
        <div className="mobile-ppl-header">
          <div className="d-flex align-items-center gap-3">
            <button
              className="mobile-icon-btn"
              onClick={() => toast.info("Workspace Menu")}
              aria-label="Menu"
            >
              <FaBars />
            </button>
            <div>
              <h1 className="mobile-ppl-title">People</h1>
              <p className="mobile-ppl-sub">Manage your business contacts</p>
            </div>
          </div>
          <button
            className="mobile-btn-add-circle"
            onClick={handleOpenCreate}
            title="Add Person"
          >
            <FaPlus />
          </button>
        </div>

        {/* MOBILE CATEGORY PILL STRIP */}
        <div className="mobile-ppl-tabs-strip">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.label}
                className={`mobile-ppl-tab ${isActive ? "active" : ""}`}
                onClick={() => handleTabClick(tab)}
              >
                <span className="mobile-tab-lbl">{tab.label}</span>
                <span className="mobile-tab-cnt">{tabCounts[tab.key] ?? 0}</span>
              </button>
            );
          })}
        </div>

        {/* 📌 MOBILE STICKY SEARCH & FILTER CONTROLS */}
        <div className="mobile-ppl-sticky-controls">
          <div className="mobile-ppl-search-bar">
            <FaSearch />
            <input
              type="text"
              placeholder="Search by name, phone, business name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="btn btn-link btn-sm p-0 text-muted"
                onClick={() => setSearch("")}
              >
                <FaTimes />
              </button>
            )}
          </div>
          <button
            className="mobile-icon-btn flex-shrink-0"
            onClick={() => setSortAsc(!sortAsc)}
            title="Toggle Sort"
          >
            <FaSort />
          </button>
        </div>

        {/* SECTION HEADER */}
        <div className="mobile-ppl-section-bar">
          <span className="mobile-section-heading">
            {activeTab
              ? `${activeTab.toUpperCase()}S (${tabCounts[activeTab] ?? contacts.length})`
              : `ALL CONTACTS (${contacts.length})`}
          </span>
          <span className="small text-muted fw-semibold">
            {contacts.length} {contacts.length === 1 ? "person" : "people"}
          </span>
        </div>

        {/* MOBILE CONTACT CARDS LIST (SCREEN 1) */}
        <div className="mobile-ppl-cards-list">
          {contacts.length === 0 ? (
            <div className="text-center py-5 text-muted small bg-card rounded-3 border">
              No contacts found.
            </div>
          ) : (
            contacts.map((c) => {
              const av = getAvatarColor(c.name);
              const cat = primaryCat(c);
              const catSlug = (cat || "other").toLowerCase();
              return (
                <div
                  key={c._id}
                  className="mobile-ppl-card"
                  onClick={() => handleMobileCardClick(c)}
                >
                  <div
                    className="mobile-ppl-avatar"
                    style={{ background: av.bg, color: av.color }}
                  >
                    {getInitials(c.name)}
                  </div>
                  <div className="mobile-ppl-card-info">
                    <h3 className="mobile-card-title">{c.name}</h3>
                    {c.businessName && (
                      <p className="mobile-card-biz">{c.businessName}</p>
                    )}
                    <span className="mobile-card-phone">{c.phone || "—"}</span>
                    <div>
                      <span className={`type-badge sm badge-${catSlug}`}>
                        {cat}
                      </span>
                    </div>
                  </div>
                  <div className="mobile-ppl-card-right">
                    <button
                      className="mobile-card-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(c);
                      }}
                      title="Edit Contact"
                    >
                      <FaEdit />
                    </button>
                    <span
                      className={`mobile-card-status ${
                        c.status === "Active" ? "active" : "inactive"
                      }`}
                    >
                      ● {c.status || "Active"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ============================================================
         📱 MOBILE CONTACT DETAIL SLIDE-IN (SCREEN 2)
         (100% Live Backend Data)
         ============================================================ */}
      {mobileDetailOpen && mobileSelectedContact && (
        <div className="mobile-ppl-detail-overlay">
          {/* Header */}
          <div className="mobile-detail-top-nav">
            <button
              className="mobile-detail-back-btn"
              onClick={handleCloseContactView}
            >
              <FaChevronLeft />
            </button>
            <div className="d-flex gap-2">
              <button
                className="mobile-icon-btn"
                onClick={() => handleOpenEdit(mobileSelectedContact)}
                title="Edit Contact"
              >
                <FaEdit />
              </button>
              <button
                className="mobile-icon-btn text-danger"
                onClick={() => handleDeleteContact(mobileSelectedContact._id)}
                title="Delete Contact"
              >
                <FaTrash />
              </button>
            </div>
          </div>

          {/* Profile Hero */}
          {(() => {
            const c = mobileSelectedContact;
            const av = getAvatarColor(c.name);
            const cat = primaryCat(c);
            const catSlug = (cat || "other").toLowerCase();
            return (
              <div className="mobile-ppl-detail-hero">
                <div
                  className="mobile-detail-large-avatar"
                  style={{ background: av.bg, color: av.color }}
                >
                  {getInitials(c.name)}
                </div>
                <div className="mobile-detail-hero-content">
                  <div className="d-flex align-items-center gap-2">
                    <span className={`type-badge sm badge-${catSlug}`}>
                      {cat}
                    </span>
                    <span
                      className={`mobile-card-status ${
                        c.status === "Active" ? "active" : "inactive"
                      }`}
                    >
                      ● {c.status || "Active"}
                    </span>
                  </div>
                  <h2 className="mobile-detail-name">{c.name}</h2>
                  {c.businessName && (
                    <p className="mobile-detail-biz">{c.businessName}</p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Quick Action Buttons Row: Call | Full Profile */}
          <div className="mobile-detail-action-row">
            {mobileSelectedContact.phone ? (
              <a
                href={`tel:${mobileSelectedContact.phone}`}
                className="mobile-detail-btn outline flex-fill"
              >
                <FaPhone /> Call
              </a>
            ) : (
              <button
                className="mobile-detail-btn outline flex-fill disabled"
                disabled
              >
                <FaPhone /> No Phone
              </button>
            )}
            <button
              className="mobile-detail-btn gold flex-fill"
              onClick={() => {
                setSelected(mobileSelectedContact);
                setIsExpanded(true);
                setMobileDetailOpen(false);
              }}
            >
              Full Profile <FaChevronRight size={11} />
            </button>
          </div>

          {/* 1. Contact Information Card */}
          <div className="mobile-detail-card">
            <h4 className="mobile-detail-card-title">Contact Information</h4>
            {mobileSelectedContact.phone && (
              <div className="mobile-info-item">
                <FaPhone className="mobile-info-icon" />
                <span className="flex-fill">{mobileSelectedContact.phone}</span>
                <button
                  className="mobile-copy-btn"
                  onClick={() => {
                    navigator.clipboard?.writeText(mobileSelectedContact.phone);
                    toast.info("Phone copied!");
                  }}
                  title="Copy Phone"
                >
                  <FaCopy />
                </button>
              </div>
            )}
            {mobileSelectedContact.email && (
              <div className="mobile-info-item">
                <FaEnvelope className="mobile-info-icon" />
                <span className="flex-fill">{mobileSelectedContact.email}</span>
              </div>
            )}
            {(mobileSelectedContact.address || mobileSelectedContact.city) && (
              <div className="mobile-info-item">
                <FaMapMarkerAlt className="mobile-info-icon" />
                <span className="flex-fill">
                  {[
                    mobileSelectedContact.address,
                    mobileSelectedContact.city,
                    mobileSelectedContact.state,
                    mobileSelectedContact.pincode,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            )}
            {!mobileSelectedContact.phone && !mobileSelectedContact.email && !mobileSelectedContact.address && (
              <p className="small text-muted mb-0">No contact details registered.</p>
            )}
          </div>

          {/* 2. Notes Card */}
          {mobileSelectedContact.notes && (
            <div className="mobile-detail-card">
              <h4 className="mobile-detail-card-title">Notes</h4>
              <p className="mobile-notes-text">
                {mobileSelectedContact.notes}
              </p>
            </div>
          )}

          {/* DYNAMIC CONTENT BASED ON CATEGORY */}
          {primaryCat(mobileSelectedContact) === "Customer" ? (
            <>
              {/* Purchase Summary Card */}
              <div className="mobile-detail-card">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h4 className="mobile-detail-card-title mb-0">Purchase Summary</h4>
                </div>
                <div className="mobile-summary-grid">
                  <div className="mobile-summary-box">
                    <span className="mobile-summary-lbl">Total Items</span>
                    <span className="mobile-summary-val">{custTotalItems}</span>
                  </div>
                  <div className="mobile-summary-box">
                    <span className="mobile-summary-lbl">Total Spent</span>
                    <span className="mobile-summary-val">₹ {custTotalSpent.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="mobile-summary-box">
                    <span className="mobile-summary-lbl">Outstanding</span>
                    <span className={`mobile-summary-val small ${custTotalRemaining > 0 ? "text-danger" : "text-success"}`}>
                      ₹ {custTotalRemaining.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Purchases Card */}
              <div className="mobile-detail-card">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h4 className="mobile-detail-card-title mb-0">Recent Purchases</h4>
                  <span className="text-muted very-small">{customerSales.length} items</span>
                </div>
                {loadingCustomerSales ? (
                  <div className="py-3 text-center text-muted small">Loading purchases...</div>
                ) : customerSales.length === 0 ? (
                  <div className="py-3 text-center text-muted small">No purchases recorded yet.</div>
                ) : (
                  <div className="mobile-txns-list">
                    {customerSales.slice(0, 10).map((s) => {
                      const paid = (s.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
                      const rem = Math.max(0, (s.finalPrice || 0) - paid);
                      const isPaid = rem <= 0;
                      return (
                        <div key={s._id} className="mobile-txn-row p-2 border rounded" onClick={() => navigate("/sales")}>
                          <div className="mobile-txn-details">
                            <span className="mobile-txn-title fw-bold" style={{ fontSize: '13px' }}>
                              {s.inventoryId?.productName || "Product"}
                            </span>
                            <span className="mobile-txn-sub mt-1">
                              {new Date(s.soldAt || s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                          <div className="d-flex flex-column align-items-end">
                            <span className="fw-bold text-dark" style={{ fontSize: '13px' }}>
                              ₹ {(s.finalPrice || 0).toLocaleString("en-IN")}
                            </span>
                            {isPaid ? (
                              <span className="badge bg-success mt-1" style={{ fontSize: '10px' }}>Paid</span>
                            ) : (
                              <span className="text-danger fw-semibold mt-1" style={{ fontSize: '11px' }}>Due: ₹ {rem.toLocaleString("en-IN")}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sticky Bottom Footer */}
              <div className="mobile-detail-fixed-footer">
                <button className="btn btn-gold w-100 py-2 fw-bold" onClick={() => navigate("/sales")}>
                  🛒 Go to Sales
                </button>
              </div>
            </>
          ) : (
            <>
              {/* 3. Business Summary Card (Real Computed Totals) */}
              <div className="mobile-detail-card">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h4 className="mobile-detail-card-title mb-0">Business Summary</h4>
                  <button
                    className="btn btn-link p-0 very-small text-gold text-decoration-none fw-bold"
                    onClick={() => {
                      setSelected(mobileSelectedContact);
                      setIsExpanded(true);
                      setMobileDetailOpen(false);
                    }}
                  >
                    <FaExternalLinkAlt /> View Full Profile
                  </button>
                </div>
                <div className="mobile-summary-grid">
                  <div className="mobile-summary-box">
                    <span className="mobile-summary-lbl">Total Deals</span>
                    <span className="mobile-summary-val">
                      {mobileTransactions.length}
                    </span>
                  </div>
                  <div className="mobile-summary-box">
                    <span className="mobile-summary-lbl">Total Value</span>
                    <span className="mobile-summary-val">
                      ₹ {Math.round(computeTotalValue(mobileTransactions) || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="mobile-summary-box">
                    <span className="mobile-summary-lbl">Last Transaction</span>
                    <span className="mobile-summary-val small">
                      {mobileTransactions.length > 0 && mobileTransactions[0]?.createdAt
                        ? new Date(mobileTransactions[0].createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : mobileSelectedContact.createdAt
                        ? new Date(mobileSelectedContact.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Recent Transactions Card (Real Transactions) */}
              <div className="mobile-detail-card">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h4 className="mobile-detail-card-title mb-0">Recent Transactions</h4>
                  <span className="text-muted very-small">
                    {mobileTransactions.length} recorded
                  </span>
                </div>

                {loadingLedger ? (
                  <div className="py-3 text-center text-muted small">Loading transactions...</div>
                ) : mobileTransactions.length === 0 ? (
                  <div className="py-3 text-center text-muted small">
                    No ledger transactions recorded for this contact yet.
                  </div>
                ) : (
                  <div className="mobile-txns-list">
                    {(showAllPersonTxns ? mobileTransactions : mobileTransactions.slice(0, 20)).map((t) => {
                      const isIncoming =
                        t.providerId?._id === mobileSelectedContact._id ||
                        t.providerId === mobileSelectedContact._id;
                      const isMoney = t.assetType === "money";
                      const formattedDate = new Date(t.transactionDate || t.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });
                      return (
                        <div key={t._id || t.txnId} className="mobile-txn-row">
                          <div className={`mobile-txn-icon-wrap ${isIncoming ? "in" : "out"}`}>
                            {isIncoming ? <FaArrowUp /> : <FaArrowDown />}
                          </div>
                          <div className="mobile-txn-details">
                            <span className="mobile-txn-title">
                              {t.description || (isIncoming ? "Payment Received" : "Payment Sent")}
                            </span>
                            <span className="mobile-txn-sub">
                              {formattedDate} • {t.paymentMethod || t.transactionType || "Ledger"}
                            </span>
                          </div>
                          <span className={`mobile-txn-amount ${isIncoming ? "in" : "out"}`}>
                            {isMoney
                              ? `₹ ${(t.money?.amount || 0).toLocaleString("en-IN")}`
                              : `${(t.gold?.weight || 0).toFixed(3)} g`}
                          </span>
                        </div>
                      );
                    })}

                    {mobileTransactions.length > 10 && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm w-100 py-1 very-small mt-2"
                        onClick={() => setShowAllPersonTxns(!showAllPersonTxns)}
                      >
                        {showAllPersonTxns
                          ? "Show Last 10 Transactions"
                          : `Show All ${mobileTransactions.length} Transactions`}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* 5. Outstanding Summary Card (Real Balances) */}
              <div className="mobile-detail-card">
                <h4 className="mobile-detail-card-title">Outstanding Summary</h4>
                <div className="d-flex flex-column gap-2">
                  <div className="mobile-outstanding-row in">
                    <div className="d-flex align-items-center gap-2">
                      <div className="mobile-outstanding-icon in">₹</div>
                      <span className="small fw-semibold">Money Receivable</span>
                    </div>
                    <span className="fw-bold">
                      ₹ {(mobileBalance?.moneyOwedToOwner || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="mobile-outstanding-row out">
                    <div className="d-flex align-items-center gap-2">
                      <div className="mobile-outstanding-icon out">₹</div>
                      <span className="small fw-semibold">Money Payable</span>
                    </div>
                    <span className="fw-bold">
                      ₹ {(mobileBalance?.moneyOwnerOwes || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="mobile-outstanding-row gold">
                    <div className="d-flex align-items-center gap-2">
                      <div className="mobile-outstanding-icon in" style={{color: '#d97706', background: 'rgba(217, 119, 6, 0.1)'}}>🪙</div>
                      <span className="small fw-semibold">Gold Receivable</span>
                    </div>
                    <span className="fw-bold text-success">
                      {renderGoldValue((mobileBalance?.goldOwedToOwner || 0).toFixed(3), mobileBalance?.goldOwedToOwnerValuation || 0)}
                    </span>
                  </div>
                  
                  <div className="mobile-outstanding-row gold">
                    <div className="d-flex align-items-center gap-2">
                      <div className="mobile-outstanding-icon out" style={{color: '#d97706', background: 'rgba(217, 119, 6, 0.1)'}}>🪙</div>
                      <span className="small fw-semibold">Gold Payable</span>
                    </div>
                    <span className="fw-bold text-danger">
                      {renderGoldValue((mobileBalance?.goldOwnerOwes || 0).toFixed(3), mobileBalance?.goldOwnerOwesValuation || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sticky Bottom Record Transaction Button */}
              <div className="mobile-detail-fixed-footer">
                <button
                  className="btn btn-gold w-100 py-2 fw-bold"
                  onClick={() => navigate(`/ledger?contactId=${mobileSelectedContact._id}`)}
                >
                  <FaPlus /> Record Transaction
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================
         ADD / EDIT PERSON DRAWER (DESKTOP & MOBILE)
         ============================================================ */}
      {drawerOpen && (
        <>
          <div
            className="ppl-backdrop"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="ppl-drawer open">
            <div className="drw-header">
              <div>
                <h3 className="drw-title">{editingId ? "Edit Contact" : "Add New Person"}</h3>
                <p className="drw-sub">
                  {editingId ? "Update contact information" : "Create a new contact in your business registry"}
                </p>
              </div>
              <button
                className="drw-close"
                onClick={() => setDrawerOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="drw-body">
              {/* Category */}
              <div className="drw-section">
                <span className="drw-label">Contact Category</span>
                <div className="drw-select-wrap">
                  <FaUser className="sel-icon" />
                  <select
                    className="drw-select"
                    value={form.personType}
                    onChange={(e) => setField("personType", e.target.value)}
                  >
                    <option value="Customer">Customer</option>
                    <option value="Worker">Worker / Karigar</option>
                    <option value="Wholeseller">Wholeseller</option>
                  </select>
                </div>
              </div>

              {/* Name & Phone */}
              <div className="drw-section">
                <span className="drw-label">Basic Information</span>
                <div className="drw-row">
                  <div className="drw-field">
                    <label>
                      Full Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Manepally Jewels"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="drw-field">
                    <label>Business Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Wholesale Hub"
                      value={form.businessName}
                      onChange={(e) => setField("businessName", e.target.value)}
                    />
                  </div>
                </div>

                <div className="drw-row">
                  <div className="drw-field">
                    <label>Phone Number</label>
                    <div className="phone-wrap">
                      <span className="phone-prefix">+91</span>
                      <input
                        type="text"
                        className="phone-num"
                        placeholder="99887 43210"
                        value={form.phone}
                        onChange={(e) => setField("phone", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="drw-field">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="contact@business.com"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="drw-section">
                <span className="drw-label">Address &amp; Location</span>
                <div className="drw-field">
                  <label>Street Address</label>
                  <input
                    type="text"
                    placeholder="Shop #, Street, Area"
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                  />
                </div>
                <div className="drw-row">
                  <div className="drw-field">
                    <label>City</label>
                    <input
                      type="text"
                      placeholder="Hyderabad"
                      value={form.city}
                      onChange={(e) => setField("city", e.target.value)}
                    />
                  </div>
                  <div className="drw-field">
                    <label>State</label>
                    <input
                      type="text"
                      placeholder="Telangana"
                      value={form.state}
                      onChange={(e) => setField("state", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Tax Identifiers */}
              <div className="drw-section">
                <span className="drw-label">Tax &amp; Identification</span>
                <div className="drw-row">
                  <div className="drw-field">
                    <label>GST Number</label>
                    <input
                      type="text"
                      placeholder="36AAAAA0000A1Z5"
                      value={form.gstNumber}
                      onChange={(e) => setField("gstNumber", e.target.value)}
                    />
                  </div>
                  <div className="drw-field">
                    <label>PAN Number</label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      value={form.panNumber}
                      onChange={(e) => setField("panNumber", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="drw-section">
                <span className="drw-label">Notes &amp; Details</span>
                <div className="drw-field">
                  <label>Notes</label>
                  <textarea
                    placeholder="Add special instructions or details..."
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                  />
                </div>
              </div>

              <div className="drw-footer">
                <button
                  type="button"
                  className="drw-cancel"
                  onClick={() => setDrawerOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="drw-save"
                  disabled={saving}
                >
                  {saving ? "Saving..." : editingId ? "Update Contact" : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
