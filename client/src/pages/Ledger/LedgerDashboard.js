import { useQuery } from "@tanstack/react-query";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { notify } from "../../components/Toast/toast";
import "./Ledger.css";
import {
  FaCheckCircle,
  FaSave,
  FaUndo,
  FaChevronDown,
  FaSearch,
  FaLightbulb,
  FaListAlt,
  FaUsers,
  FaBalanceScale,
  FaArrowRight,
  FaArrowDown,
  FaTimes,
  FaFilter,
  FaChevronRight,
} from "react-icons/fa";

const OWNER_CONTACT = {
  _id: "__OWNER__",
  name: "My Business (You)",
  businessName: "Aneesh Business Console",
  categories: ["Business Owner"],
  isOwner: true,
};

const REASON_OPTIONS = [
  { id: "wage", label: "Worker Payment", icon: "👷" },
  { id: "advance", label: "Advance", icon: "💰" },
  { id: "purchase", label: "Purchase", icon: "🛍️" },
  { id: "settlement", label: "Settlement", icon: "⚖️" },
  { id: "repayment", label: "Repayment", icon: "🔄" },
  { id: "expense", label: "Expense", icon: "💸" },
  { id: "other", label: "Other", icon: "💬" },
];

// Filter to only include Wholesalers, Workers, Suppliers, and B2B entities (No Customers)
const isLedgerParticipant = (contact) => {
  if (!contact) return false;
  if (contact.isOwner) return true;
  const cats = (contact.categories || []).map((c) => c.toLowerCase());
  const allowed = [
    "wholesaler",
    "wholeseller",
    "worker",
    "karigar",
    "supplier",
    "staff",
    "artisan",
    "businessman",
    "partner",
    "financier",
    "vendor",
    "broker",
    "agent",
  ];
  const hasAllowedRole = cats.some((c) => allowed.includes(c));
  const isCustomer = cats.includes("customer");
  if (isCustomer && !hasAllowedRole) return false;
  return hasAllowedRole;
};

// Helper to format transaction date blocks for mobile
const getTxnDateParts = (dateStr) => {
  const d = new Date(dateStr || Date.now());
  const months = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ];
  return {
    month: months[d.getMonth()],
    day: d.getDate(),
    year: d.getFullYear(),
  };
};

// Pastel Avatar theme colors
const getAvatarTheme = (name) => {
  const themes = [
    { bg: "#EDE9FE", color: "#6D28D9" }, // Purple
    { bg: "#FEF3C7", color: "#B45309" }, // Gold/Amber
    { bg: "#CCFBF1", color: "#0F766E" }, // Teal
    { bg: "#E0E7FF", color: "#4338CA" }, // Indigo
    { bg: "#FCE7F3", color: "#BE185D" }, // Pink
    { bg: "#E0F2FE", color: "#0369A1" }, // Sky
  ];
  if (!name) return themes[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return themes[sum % themes.length];
};

export default function LedgerDashboard() {
  const navigate = useNavigate();

  // Active Tab: "record" | "balances" | "transactions" | "groups" | "obligations"
  const [activeTab, setActiveTab] = useState("record");

  // Global Data from Backend
  const [contacts, setContacts] = useState([]);
  const [totals, setTotals] = useState({
    totalMoneyReceivable: 0,
    totalMoneyPayable: 0,
    totalGoldReceivable: 0,
    totalGoldPayable: 0,
  });
    const [obligations, setObligations] = useState([]);
  const [saving, setSaving] = useState(false);

  // Form State
  const [provider, setProvider] = useState(OWNER_CONTACT);
  const [receiver, setReceiver] = useState(null);
  const [onBehalfOf, setOnBehalfOf] = useState(OWNER_CONTACT);

  const [assetType, setAssetType] = useState("money"); // "money" | "gold" | "goods"
  const [moneyAmount, setMoneyAmount] = useState("10000");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const [goldWeight, setGoldWeight] = useState("");
  const [goldPurity, setGoldPurity] = useState("22K (91.6% Hallmark)");
  const [goldRate, setGoldRate] = useState("");
  const [goldValuation, setGoldValuation] = useState("");

  const [goodsDesc, setGoodsDesc] = useState("");
  const [goodsQty, setGoodsQty] = useState("1");
  const [goodsUnit, setGoodsUnit] = useState("piece");
  const [goodsValuation, setGoodsValuation] = useState("");

  const [reason, setReason] = useState("wage");
  const [note, setNote] = useState("");
  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10));

  // Contact Picker Modal State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState("provider"); // "provider" | "receiver" | "onBehalfOf"
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCategoryFilter, setPickerCategoryFilter] = useState("all"); // "all" | "wholesaler" | "worker"

  // Search & Filter States
  const [balancesSearch, setBalancesSearch] = useState("");
  const [balancesCategory, setBalancesCategory] = useState("all"); // "all" | "wholesaler" | "worker" | "supplier" | "financier"

  // Transactions Search, Filters & Pagination
  const [txnSearch, setTxnSearch] = useState("");
  const [txnFilterAsset, setTxnFilterAsset] = useState("all"); // "all" | "money" | "gold" | "goods"
  const [txnFilterType, setTxnFilterType] = useState("all"); // "all" | "advance" | "repayment" | "purchase" | "wage" | "settlement" | "transfer"
  const [txnFilterDirection, setTxnFilterDirection] = useState("all"); // "all" | "paid" | "received"
  const [txnFilterOpen, setTxnFilterOpen] = useState(false);
  const [txnFilterDate, setTxnFilterDate] = useState("all");
  const [txnSort, setTxnSort] = useState("newest");
  const [txnPage, setTxnPage] = useState(1);
  const [showAllTxns, setShowAllTxns] = useState(false);
  const txnPerPage = 20;

  // Obligations Search & Filters
  const [obligationSearch, setObligationSearch] = useState("");
  const [obFilterStatus, setObFilterStatus] = useState("all"); // "all" | "outstanding" | "partially_settled" | "settled"
  const [obFilterAsset, setObFilterAsset] = useState("all"); // "all" | "money" | "gold"
  const [obFilterDirection, setObFilterDirection] = useState("all"); // "all" | "receivable" | "payable"
  const [obFilterOpen, setObFilterOpen] = useState(false);

  // Write-off modal state (Obligations tab)
  const [writingOff,    setWritingOff]   = useState(null);
  const [writeOffForm,  setWriteOffForm] = useState({ amount: "", reason: "" });
  const [savingWriteOff, setSavingWriteOff] = useState(false);

  // Track which obligation cards have their log expanded (Set of obligation _id strings)
  const [expandedLogs, setExpandedLogs] = useState(new Set());

  const toggleLog = (obId) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(obId)) next.delete(obId);
      else next.add(obId);
      return next;
    });
  };

  const handleWriteOff = async () => {
    if (!writingOff) return;
    if (!writeOffForm.reason.trim()) { notify.error("Please enter a reason for the write-off"); return; }
    if (!writeOffForm.amount || parseFloat(writeOffForm.amount) <= 0) { notify.error("Enter a valid write-off amount"); return; }
    setSavingWriteOff(true);
    try {
      const res = await api.post(`/ledger/obligations/${writingOff._id}/writeoff`, {
        amount: parseFloat(writeOffForm.amount),
        reason: writeOffForm.reason.trim(),
      });
      if (res.data.success) {
        notify.success("Write-off recorded!");
        setWritingOff(null);
        setWriteOffForm({ amount: "", reason: "" });
        loadObligations();
        loadLedgerData();
      }
    } catch (err) {
      notify.error(err.response?.data?.message || "Write-off failed");
    } finally { setSavingWriteOff(false); }
  };

  // Load Real Data from Backend
  const loadLedgerData = useCallback(async () => {
    try {
      const [resContacts, resBalances,  ] = await Promise.all([
        api.get("/contacts?limit=500"),
        api.get("/ledger/balances"),
        api.get("/rates").catch(() => null)
      ]);

      

      if (resContacts.data.success) {
        const fetchedContacts = resContacts.data.contacts || [];
        const balanceMap = {};
        if (resBalances?.data?.success && Array.isArray(resBalances.data.contacts)) {
          resBalances.data.contacts.forEach((b) => {
            if (b._id) balanceMap[b._id.toString()] = b.balances;
          });
        }

        // Strictly filter to Wholesalers and Workers (Exclude all retail Customers)
        const ledgerParticipants = fetchedContacts
          .filter(isLedgerParticipant)
          .map((c) => ({
            ...c,
            balances: balanceMap[c._id?.toString()] || c.balances || {
              moneyOwedToOwner: 0,
              moneyOwnerOwes: 0,
              goldOwedToOwner: 0,
              goldOwnerOwes: 0,
            },
          }));

        setContacts(ledgerParticipants);
        // Default receiver to first contact if empty
        if (!receiver && ledgerParticipants.length > 0) {
          setReceiver(ledgerParticipants[0]);
        }
      }

      if (resBalances?.data?.success) {
        setTotals(resBalances.data.totals || {});
      }
    } catch (err) {
      console.error("Error loading ledger data:", err);
      notify.error("Failed to fetch live ledger balances.");
    }
  }, [receiver]);

  const { data: txnData, refetch: loadTransactions } = useQuery({
    queryKey: ["ledger-transactions", txnPage, txnPerPage, txnSort, txnFilterAsset, txnFilterType],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: txnPage,
        limit: txnPerPage,
      });
      if (txnFilterAsset !== "all") params.append("assetType", txnFilterAsset);
      if (txnFilterType !== "all") params.append("transactionType", txnFilterType);
      
      let sortField = "transactionDate";
      let sortOrder = "desc";
      if (txnSort === "newest") { sortField = "transactionDate"; sortOrder = "desc"; }
      if (txnSort === "oldest") { sortField = "transactionDate"; sortOrder = "asc"; }
      if (txnSort === "amount_high") { sortField = "money.amount"; sortOrder = "desc"; } // simplified
      if (txnSort === "amount_low") { sortField = "money.amount"; sortOrder = "asc"; }
      
      params.append("sortField", sortField);
      params.append("sortOrder", sortOrder);

      const res = await api.get("/ledger/transactions?" + params.toString());
      return res.data;
    },
    keepPreviousData: true
  });
  
  const transactions = txnData?.transactions || [];
      

  // Load Obligations when tab changes
  const loadObligations = async () => {
    try {
      const res = await api.get("/ledger/obligations");
      if (res.data.success) {
        setObligations(res.data.obligations || []);
      }
    } catch (err) {
      console.error("Error fetching obligations:", err);
    }
  };

  useEffect(() => {
    loadLedgerData();
  }, [loadLedgerData]);

  useEffect(() => {
    if (activeTab === "transactions") loadTransactions();
    if (activeTab === "obligations") loadObligations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Auto-calculate gold valuation
  useEffect(() => {
    if (assetType === "gold" && goldWeight && goldRate) {
      const calcVal = (parseFloat(goldWeight) * parseFloat(goldRate)).toFixed(0);
      setGoldValuation(calcVal);
    }
  }, [assetType, goldWeight, goldRate]);

  // Open Contact Picker
  const openPicker = (target) => {
    setPickerTarget(target);
    setPickerSearch("");
    setPickerOpen(true);
  };

  // Select Contact from Modal
  const handleSelectContact = (contact) => {
    if (pickerTarget === "provider") {
      setProvider(contact);
    } else if (pickerTarget === "receiver") {
      setReceiver(contact);
    } else if (pickerTarget === "onBehalfOf") {
      setOnBehalfOf(contact);
    }
    setPickerOpen(false);
  };

  // Filtered Contacts for Modal
  const filteredPickerContacts = contacts.filter((c) => {
    // Category tab filter
    if (pickerCategoryFilter === "wholesaler") {
      const isW = c.categories?.some((cat) =>
        ["wholesaler", "wholeseller", "supplier"].includes(cat.toLowerCase())
      );
      if (!isW) return false;
    } else if (pickerCategoryFilter === "worker") {
      const isWorker = c.categories?.some((cat) =>
        ["worker", "karigar", "artisan", "staff"].includes(cat.toLowerCase())
      );
      if (!isWorker) return false;
    }

    if (!pickerSearch) return true;
    const s = pickerSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(s) ||
      c.businessName?.toLowerCase().includes(s) ||
      c.phone?.includes(s) ||
      c.categories?.some((cat) => cat.toLowerCase().includes(s))
    );
  });

  // Helper for Initials
  const getInitials = (contact) => {
    if (!contact) return "??";
    if (contact.isOwner) return "👑";
    const parts = (contact.name || "").trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Compute Live Result Banner Message & Amount
  const getComputedResult = () => {
    const isProviderOwner = provider?.isOwner;
    const isReceiverOwner = receiver?.isOwner;
    const isOnBehalfOwner = onBehalfOf?.isOwner || !onBehalfOf;

    let text = "";
    let amountStr = "";

    if (assetType === "money") {
      amountStr = `₹ ${(parseFloat(moneyAmount) || 0).toLocaleString("en-IN")}`;
    } else if (assetType === "gold") {
      amountStr = `${parseFloat(goldWeight) || 0} g Gold`;
    } else {
      amountStr = `${goodsQty} ${goodsUnit} (${goodsDesc || "Goods"})`;
    }

    if (reason === "wage" || reason === "expense") {
      text = `${receiver?.name || "Receiver"} received ${reason === "wage" ? "Wages" : "Payment"} (Expense)`;
    } else if (isProviderOwner && !isReceiverOwner && isOnBehalfOwner) {
      text = `${receiver?.name || "Contact"} owes Business`;
    } else if (!isProviderOwner && isReceiverOwner && isOnBehalfOwner) {
      text = `Business owes ${provider?.name || "Contact"}`;
    } else if (!isProviderOwner && !isReceiverOwner && isOnBehalfOwner) {
      text = `Business owes ${provider?.name || "Provider"} (on behalf of ${receiver?.name || "Receiver"})`;
    } else if (!isOnBehalfOwner) {
      text = `${onBehalfOf?.name || "Beneficiary"} owes ${provider?.name || "Provider"}`;
    } else {
      text = `Direct transfer between ${provider?.name || "P"} and ${receiver?.name || "R"}`;
    }

    return { text, amountStr };
  };

  const resultPreview = getComputedResult();

  // Reset Form
  const handleReset = () => {
    setProvider(OWNER_CONTACT);
    setReceiver(contacts[0] || null);
    setOnBehalfOf(OWNER_CONTACT);
    setAssetType("money");
    setMoneyAmount("10000");
    setPaymentMethod("Cash");
    setGoldWeight("");
    setGoldRate("");
    setGoldValuation("");
    setGoodsDesc("");
    setGoodsQty("1");
    setReason("wage");
    setNote("");
    setTxnDate(new Date().toISOString().slice(0, 10));
    notify.info("Form reset to default values.");
  };

  // Submit Transaction
  const handleSaveTransaction = async (e) => {
    e?.preventDefault();

    if (!provider) {
      notify.error("Please select who gave the asset (Provider).");
      return;
    }
    if (!receiver) {
      notify.error("Please select who received the asset (Receiver).");
      return;
    }
    if (provider._id === receiver._id) {
      notify.error("Provider and Receiver cannot be the same entity.");
      return;
    }

    if (assetType === "money" && (!moneyAmount || parseFloat(moneyAmount) <= 0)) {
      notify.error("Please enter a valid monetary amount.");
      return;
    }
    if (assetType === "gold" && (!goldWeight || parseFloat(goldWeight) <= 0)) {
      notify.error("Please enter a valid gold weight in grams.");
      return;
    }
    if (assetType === "goods" && !goodsDesc) {
      notify.error("Please enter goods description.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        transactionType: reason,
        providerId: provider.isOwner ? null : provider._id,
        receiverId: receiver.isOwner ? null : receiver._id,
        onBehalfOfId: onBehalfOf?.isOwner ? null : onBehalfOf?._id || null,
        assetType,
        money: {
          amount: parseFloat(moneyAmount) || 0,
          currency: "INR",
        },
        gold: {
          weight: parseFloat(goldWeight) || 0,
          purity: goldPurity,
          ratePerGram: parseFloat(goldRate) || 0,
          valuation: parseFloat(goldValuation) || 0,
        },
        goods: {
          description: goodsDesc,
          quantity: parseFloat(goodsQty) || 1,
          unit: goodsUnit,
          valuation: parseFloat(goodsValuation) || 0,
        },
        paymentMethod,
        description: note || `${reason.toUpperCase()} - ${provider.name} to ${receiver.name}`,
        notes: note,
        transactionDate: txnDate,
      };

      const res = await api.post("/ledger/transactions", payload);
      if (res.data.success) {
        notify.success("Transaction recorded and obligations updated!");
        handleReset();
        loadLedgerData();
      }
    } catch (err) {
      console.error("Transaction save error:", err);
      notify.error(err.response?.data?.message || "Failed to record transaction.");
    } finally {
      setSaving(false);
    }
  };

  // Filter contacts for Balances & Contacts Tab
  const filteredBalancesContacts = contacts.filter((c) => {
    // 1. Category Filter
    if (balancesCategory !== "all") {
      const cats = (c.categories || []).map((x) => x.toLowerCase());
      if (balancesCategory === "wholesaler") {
        if (!cats.some((cat) => cat.includes("wholesal") || cat.includes("wholesel"))) return false;
      } else if (balancesCategory === "worker") {
        if (!cats.some((cat) => cat.includes("work") || cat.includes("karigar") || cat.includes("artisan"))) return false;
      } else if (balancesCategory === "customer") {
        if (!cats.includes("customer")) return false;
      } else if (balancesCategory === "supplier") {
        if (!cats.includes("supplier")) return false;
      } else if (balancesCategory === "financier") {
        if (!cats.includes("financier")) return false;
      }
    }

    // 2. Search Filter
    if (balancesSearch.trim()) {
      const q = balancesSearch.toLowerCase();
      const matchName = c.name?.toLowerCase().includes(q);
      const matchBiz = c.businessName?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q);
      if (!matchName && !matchBiz && !matchPhone) return false;
    }

    return true;
  });

  const countWholesalers = contacts.filter((c) =>
    (c.categories || []).some(
      (x) => x.toLowerCase().includes("wholesal") || x.toLowerCase().includes("wholesel")
    )
  ).length;

  const countWorkers = contacts.filter((c) =>
    (c.categories || []).some(
      (x) => x.toLowerCase().includes("work") || x.toLowerCase().includes("karigar") || x.toLowerCase().includes("artisan")
    )
  ).length;

  const countSuppliers = contacts.filter((c) =>
    (c.categories || []).some((x) => x.toLowerCase() === "supplier")
  ).length;

  const countFinanciers = contacts.filter((c) =>
    (c.categories || []).some((x) => x.toLowerCase() === "financier")
  ).length;

  // Filter transactions with deep search + asset/type/direction filters
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Search Query
    if (txnSearch.trim()) {
      const q = txnSearch.toLowerCase();
      const pName = tx.providerId?.name?.toLowerCase() || "business owner (you)";
      const rName = tx.receiverId?.name?.toLowerCase() || "business owner (you)";
      const obName = tx.onBehalfOfId?.name?.toLowerCase() || "";
      const type = tx.transactionType?.toLowerCase() || "";
      const asset = tx.assetType?.toLowerCase() || "";
      const method = tx.paymentMethod?.toLowerCase() || "";
      const desc = tx.description?.toLowerCase() || "";
      const notes = tx.notes?.toLowerCase() || "";
      const id = tx.txnId?.toLowerCase() || "";
      const moneyAmt = tx.money?.amount ? String(tx.money.amount) : "";
      const goldWt = tx.gold?.weight ? String(tx.gold.weight) : "";
      const dateStr = new Date(tx.transactionDate || tx.createdAt).toLocaleDateString("en-IN").toLowerCase();

      const match =
        pName.includes(q) ||
        rName.includes(q) ||
        obName.includes(q) ||
        type.includes(q) ||
        asset.includes(q) ||
        method.includes(q) ||
        desc.includes(q) ||
        notes.includes(q) ||
        id.includes(q) ||
        moneyAmt.includes(q) ||
        goldWt.includes(q) ||
        dateStr.includes(q);

      if (!match) return false;
    }

    // 2. Asset filter
    if (txnFilterAsset !== "all" && tx.assetType !== txnFilterAsset) return false;

    // 3. Type filter
    if (txnFilterType !== "all" && tx.transactionType !== txnFilterType) return false;

    // 4. Direction filter
    if (txnFilterDirection === "paid") {
      if (tx.providerId && !tx.providerId.isOwner) return false;
    } else if (txnFilterDirection === "received") {
      if (tx.receiverId && !tx.receiverId.isOwner) return false;
    }

    // 5. Date filter
    if (txnFilterDate !== "all") {
      const txDate = new Date(tx.transactionDate || tx.createdAt);
      const now = new Date();
      if (txnFilterDate === "today") {
        if (txDate.toDateString() !== now.toDateString()) return false;
      } else if (txnFilterDate === "week") {
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        if (txDate < weekAgo) return false;
      } else if (txnFilterDate === "month") {
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        if (txDate < monthAgo) return false;
      }
    }

    return true;
  });

  // Apply Sorting
  filteredTransactions.sort((a, b) => {
    const dateA = new Date(a.transactionDate || a.createdAt).getTime();
    const dateB = new Date(b.transactionDate || b.createdAt).getTime();
    if (txnSort === "newest") return dateB - dateA;
    if (txnSort === "oldest") return dateA - dateB;
    
    // Amount sorting (approximate cross-asset)
    const valA = a.assetType === "money" ? (a.money?.amount || 0) : (a.assetType === "gold" ? (a.gold?.valuation || 0) : (a.goods?.valuation || 0));
    const valB = b.assetType === "money" ? (b.money?.amount || 0) : (b.assetType === "gold" ? (b.gold?.valuation || 0) : (b.goods?.valuation || 0));
    
    if (txnSort === "amount_high") return valB - valA;
    if (txnSort === "amount_low") return valA - valB;
    return 0;
  });

  // Paginated Transactions slice
  const txnTotalPages = Math.max(1, Math.ceil(filteredTransactions.length / txnPerPage));
  const paginatedTransactions = showAllTxns
    ? filteredTransactions
    : filteredTransactions.slice((txnPage - 1) * txnPerPage, txnPage * txnPerPage);


  // Helper to render Gold weight + Est Money Value
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

  // Filter obligations with deep search + status/asset/direction filters
  const filteredObligations = obligations.filter((ob) => {
    // 1. Search Query
    if (obligationSearch.trim()) {
      const q = obligationSearch.toLowerCase();
      const dName = ob.debtorId?.name?.toLowerCase() || "business owner (you)";
      const cName = ob.creditorId?.name?.toLowerCase() || "business owner (you)";
      const status = ob.status?.toLowerCase() || "";
      const id = ob.obligationId?.toLowerCase() || "";
      const moneyBal = String(ob.moneyBalance || "");
      const goldBal  = String(ob.goldBalance  || "");

      const match =
        dName.includes(q) ||
        cName.includes(q) ||
        status.includes(q) ||
        id.includes(q) ||
        moneyBal.includes(q) ||
        goldBal.includes(q);

      if (!match) return false;
    }

    // 2. Status filter
    if (obFilterStatus !== "all" && ob.status !== obFilterStatus) return false;

    // 3. Direction filter
    if (obFilterDirection === "receivable") {
      if (ob.creditorId && !ob.creditorId.isOwner) return false;
    } else if (obFilterDirection === "payable") {
      if (ob.debtorId && !ob.debtorId.isOwner) return false;
    }

    return true;
  });


  const txnActiveFiltersCount =
    (txnFilterAsset !== "all" ? 1 : 0) +
    (txnFilterType !== "all" ? 1 : 0) +
    (txnFilterDirection !== "all" ? 1 : 0) +
    (txnFilterDate !== "all" ? 1 : 0) +
    (txnSort !== "newest" ? 1 : 0);

  const obActiveFiltersCount =
    (obFilterStatus !== "all" ? 1 : 0) +
    (obFilterAsset !== "all" ? 1 : 0) +
    (obFilterDirection !== "all" ? 1 : 0);

  return (
    <div className="personal-ledger-workspace">
      {/* WORKSPACE TOP NAVIGATION BAR (Top row hidden on mobile, 4 compact tabs 100% width) */}
      <div className="ledger-top-nav-bar">
        <div className="d-none d-md-flex align-items-center justify-content-between w-100 pb-2 border-bottom">
          <div className="d-flex align-items-center gap-2">
            <h2 className="mb-0 fw-bold fs-5 text-nowrap">Personal Ledger</h2>
            <span className="badge ldg-live-engine-badge font-monospace">
              LIVE ENGINE
            </span>
          </div>
        </div>

        {/* Compact 4-Tab Bar - 100% width on mobile without horizontal scroll */}
        <div className="ledger-tab-group">
          <button
            type="button"
            className={`ledger-tab-btn ${activeTab === "record" ? "active" : ""}`}
            onClick={() => setActiveTab("record")}
            title="New Transaction"
          >
            <span className="tab-icon">⚡</span>
            <span className="tab-text d-none d-md-inline">New Transaction</span>
            <span className="tab-text d-inline d-md-none">New Txn</span>
          </button>
          <button
            type="button"
            className={`ledger-tab-btn ${activeTab === "balances" ? "active" : ""}`}
            onClick={() => setActiveTab("balances")}
            title="Balances & Contacts"
          >
            <FaUsers className="tab-icon" />
            <span className="tab-text d-none d-md-inline">Balances &amp; Contacts</span>
            <span className="tab-text d-inline d-md-none">Balances</span>
          </button>
          <button
            type="button"
            className={`ledger-tab-btn ${activeTab === "transactions" ? "active" : ""}`}
            onClick={() => setActiveTab("transactions")}
            title="All Transactions"
          >
            <FaListAlt className="tab-icon" />
            <span className="tab-text d-none d-md-inline">All Transactions</span>
            <span className="tab-text d-inline d-md-none">All Txns</span>
          </button>
          <button
            type="button"
            className={`ledger-tab-btn ${activeTab === "obligations" ? "active" : ""}`}
            onClick={() => setActiveTab("obligations")}
            title="Active Obligations"
          >
            <FaBalanceScale className="tab-icon" />
            <span className="tab-text d-none d-md-inline">Obligations</span>
            <span className="tab-text d-inline d-md-none">Debts</span>
          </button>
        </div>
      </div>

      {/* ============================================================
         TAB 1: NEW TRANSACTION (EXACT USER MOCKUP IMPLEMENTATION)
         ============================================================ */}
      {activeTab === "record" && (
        <div className="ledger-main-layout">
          {/* LEFT SIDEBAR: TODAY'S SUMMARY MINI CARD */}
          <aside className="today-summary-card">
            <div className="today-summary-header">
              <span>Today's Summary</span>
            </div>

            <div className="today-summary-list">
              <div className="today-summary-item">
                <span className="today-summary-label">Money Receivable</span>
                <span className="today-summary-val green">
                  ₹{(totals.totalMoneyReceivable || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="today-summary-item">
                <span className="today-summary-label">Money Payable</span>
                <span className="today-summary-val red">
                  ₹{(totals.totalMoneyPayable || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="today-summary-item">
                <span className="today-summary-label">Gold Receivable</span>
                <span className="today-summary-val green" style={{fontSize: "1.1rem"}}>
                  {renderGoldValue((totals.totalGoldReceivable || 0).toFixed(3), totals.totalGoldReceivableValuation || 0)}
                </span>
              </div>
              <div className="today-summary-item">
                <span className="today-summary-label">Gold Payable</span>
                <span className="today-summary-val gold" style={{fontSize: "1.1rem"}}>
                  {renderGoldValue((totals.totalGoldPayable || 0).toFixed(3), totals.totalGoldPayableValuation || 0)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="today-summary-link"
              onClick={() => setActiveTab("balances")}
            >
              View All Summary <FaArrowRight className="ms-1" />
            </button>
          </aside>

          {/* MAIN TRANSACTION WIZARD */}
          <main className="new-transaction-container">
            <div className="new-txn-header">
              <div>
                <h1 className="new-txn-title">New Transaction</h1>
                <p className="new-txn-subtitle">
                  Record money, gold or goods movement in a few taps.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm rounded-pill px-3"
                onClick={() => setActiveTab("balances")}
              >
                &larr; Back to Ledger
              </button>
            </div>

            {/* STEP 1, 2, 3: ACTOR FLOW (WHO GAVE -> WHO RECEIVED -> FOR WHOM) */}
            <div className="actor-flow-row">
              {/* Step 1: Who gave? */}
              <div className="actor-box-wrapper">
                <label className="step-number-label">
                  <span className="step-num-badge">1</span> Who gave? (From)
                </label>
                <button
                  type="button"
                  className={`actor-card ${provider?.isOwner ? "is-owner" : ""}`}
                  onClick={() => openPicker("provider")}
                >
                  <div
                    className={`actor-avatar ${provider?.isOwner ? "owner-gold" : ""}`}
                  >
                    {getInitials(provider)}
                  </div>
                  <div className="actor-info">
                    <span className="actor-name">
                      {provider?.name || "Select Provider"}
                    </span>
                    <span className="actor-category">
                      {provider?.categories?.[0] || "Business Owner"}
                    </span>
                  </div>
                  <FaChevronDown className="actor-chevron" />
                </button>
              </div>

              {/* Arrow 1 */}
              <div className="actor-flow-arrow">
                <FaArrowRight className="d-none d-md-block" />
                <FaArrowDown className="d-md-none" />
              </div>

              {/* Step 2: Who received? */}
              <div className="actor-box-wrapper">
                <label className="step-number-label">
                  <span className="step-num-badge">2</span> Who received? (To)
                </label>
                <button
                  type="button"
                  className={`actor-card ${receiver?.isOwner ? "is-owner" : ""}`}
                  onClick={() => openPicker("receiver")}
                >
                  <div
                    className={`actor-avatar ${receiver?.isOwner ? "owner-gold" : ""}`}
                  >
                    {getInitials(receiver)}
                  </div>
                  <div className="actor-info">
                    <span className="actor-name">
                      {receiver?.name || "Select Receiver"}
                    </span>
                    <span className="actor-category">
                      {receiver?.categories?.[0] || "Contact"}
                    </span>
                  </div>
                  <FaChevronDown className="actor-chevron" />
                </button>
              </div>

              {/* Arrow 2 */}
              <div className="actor-flow-arrow">
                <FaArrowRight className="d-none d-md-block" />
                <FaArrowDown className="d-md-none" />
              </div>

              {/* Step 3: For whom? (On behalf of) */}
              <div className="actor-box-wrapper">
                <label className="step-number-label">
                  <span className="step-num-badge">3</span> For whom? (On behalf of)
                </label>
                <button
                  type="button"
                  className={`actor-card ${onBehalfOf?.isOwner ? "is-owner" : ""}`}
                  onClick={() => openPicker("onBehalfOf")}
                >
                  <div
                    className={`actor-avatar ${
                      onBehalfOf?.isOwner ? "owner-gold" : ""
                    }`}
                  >
                    {getInitials(onBehalfOf)}
                  </div>
                  <div className="actor-info">
                    <span className="actor-name">
                      {onBehalfOf?.name || "My Business (You)"}
                    </span>
                    <span className="actor-category">
                      {onBehalfOf?.categories?.[0] || "Business Owner"}
                    </span>
                  </div>
                  <FaChevronDown className="actor-chevron" />
                </button>
              </div>
            </div>

            {/* TIP BANNER */}
            <div className="tip-banner">
              <FaLightbulb className="text-warning flex-shrink-0" />
              <span>
                Leave &ldquo;For whom?&rdquo; as <strong>My Business (You)</strong> if this is a direct trade or for the receiver himself.
              </span>
            </div>

            {/* STEP 4: WHAT WAS MOVED? (ASSET SELECTOR) */}
            <div>
              <label className="step-number-label">
                <span className="step-num-badge">4</span> What was moved?
              </label>
              <div className="asset-type-cards">
                <button
                  type="button"
                  className={`asset-toggle-card ${assetType === "money" ? "active" : ""}`}
                  onClick={() => setAssetType("money")}
                >
                  <span className="asset-icon-emoji">💼</span> Money (₹)
                </button>
                <button
                  type="button"
                  className={`asset-toggle-card ${assetType === "gold" ? "active" : ""}`}
                  onClick={() => setAssetType("gold")}
                >
                  <span className="asset-icon-emoji">🪙</span> Gold (Grams)
                </button>
                <button
                  type="button"
                  className={`asset-toggle-card ${assetType === "goods" ? "active" : ""}`}
                  onClick={() => setAssetType("goods")}
                >
                  <span className="asset-icon-emoji">📦</span> Goods / Items
                </button>
              </div>
            </div>

            {/* ASSET SPECIFIC INPUTS */}
            {assetType === "money" && (
              <div className="asset-inputs-grid">
                <div className="ldg-input-group">
                  <label>
                    <span className="step-num-badge">5</span> Amount (₹)
                  </label>
                  <input
                    type="number"
                    className="ldg-input-control"
                    placeholder="₹ 10,000"
                    value={moneyAmount}
                    onChange={(e) => setMoneyAmount(e.target.value)}
                  />
                </div>
                <div className="ldg-input-group">
                  <label>Payment Method</label>
                  <select
                    className="ldg-input-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="UPI">📱 UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Bank Transfer">🏦 Bank Transfer (IMPS / NEFT)</option>
                    <option value="Cheque">📜 Cheque</option>
                    <option value="RTGS">🏛️ RTGS</option>
                    <option value="Gold Settlement">🪙 Gold Settlement</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}

            {assetType === "gold" && (
              <div className="row g-3">
                <div className="col-md-3">
                  <div className="ldg-input-group">
                    <label>Gold Weight (Grams) *</label>
                    <input
                      type="number"
                      step="0.001"
                      className="ldg-input-control"
                      placeholder="e.g. 25.500"
                      value={goldWeight}
                      onChange={(e) => setGoldWeight(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ldg-input-group">
                    <label>Purity / Hallmark</label>
                    <select
                      className="ldg-input-control"
                      value={goldPurity}
                      onChange={(e) => setGoldPurity(e.target.value)}
                    >
                      <option value="24K (99.9%)">24K (99.9% Fine Bullion)</option>
                      <option value="22K (91.6% Hallmark)">22K (91.6% Hallmark)</option>
                      <option value="18K (75%)">18K (75.0% Jewellery)</option>
                      <option value="14K (58.5%)">14K (58.5%)</option>
                      <option value="Custom">Custom Purity</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ldg-input-group">
                    <label>Gold Rate (₹/g)</label>
                    <input
                      type="number"
                      className="ldg-input-control"
                      placeholder="e.g. 6850"
                      value={goldRate}
                      onChange={(e) => setGoldRate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ldg-input-group">
                    <label>Calculated Valuation (₹)</label>
                    <input
                      type="number"
                      className="ldg-input-control"
                      placeholder="Auto-calculated"
                      value={goldValuation}
                      onChange={(e) => setGoldValuation(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {assetType === "goods" && (
              <div className="row g-3">
                <div className="col-md-5">
                  <div className="ldg-input-group">
                    <label>Goods Description *</label>
                    <input
                      type="text"
                      className="ldg-input-control"
                      placeholder="e.g. Diamond Stones Box / Silver Utensils"
                      value={goodsDesc}
                      onChange={(e) => setGoodsDesc(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="ldg-input-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      className="ldg-input-control"
                      value={goodsQty}
                      onChange={(e) => setGoodsQty(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="ldg-input-group">
                    <label>Unit</label>
                    <select
                      className="ldg-input-control"
                      value={goodsUnit}
                      onChange={(e) => setGoodsUnit(e.target.value)}
                    >
                      <option value="piece">Piece</option>
                      <option value="set">Set</option>
                      <option value="gram">Gram</option>
                      <option value="carat">Carat</option>
                      <option value="box">Box</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="ldg-input-group">
                    <label>Valuation (₹)</label>
                    <input
                      type="number"
                      className="ldg-input-control"
                      placeholder="e.g. 45000"
                      value={goodsValuation}
                      onChange={(e) => setGoodsValuation(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: WHY? (REASON SELECTOR) */}
            <div>
              <label className="step-number-label">
                <span className="step-num-badge">6</span> Why? (Transaction Purpose)
              </label>
              <div className="reason-pills-row">
                {REASON_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`reason-pill-btn ${reason === opt.id ? "active" : ""}`}
                    onClick={() => setReason(opt.id)}
                  >
                    <span>{opt.icon}</span> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 6: NOTE & DATE */}
            <div className="note-date-row">
              <div className="ldg-input-group">
                <label>Note (Optional)</label>
                <input
                  type="text"
                  className="ldg-input-control"
                  placeholder="Add a short note or invoice reference..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="ldg-input-group">
                <label>Date</label>
                <input
                  type="date"
                  className="ldg-input-control"
                  value={txnDate}
                  onChange={(e) => setTxnDate(e.target.value)}
                />
              </div>
            </div>

            {/* STEP 7: LIVE TRANSACTION RESULT BANNER */}
            <div className="txn-result-banner">
              <div className="txn-result-left">
                <div className="txn-result-icon">
                  <FaCheckCircle />
                </div>
                <div className="txn-result-text">
                  <span className="text-muted d-block very-small">Transaction Result</span>
                  <strong>{resultPreview.text}</strong>
                </div>
              </div>
              <div className="txn-result-right">
                <span className="txn-result-sub">Outstanding Amount</span>
                <span className="txn-result-amount">{resultPreview.amountStr}</span>
              </div>
            </div>

            {/* STEP 8: BOTTOM ACTIONS ROW */}
            <div className="new-txn-actions-row">
              <button
                type="button"
                className="btn-reset"
                onClick={handleReset}
                disabled={saving}
              >
                <FaUndo className="me-1" /> Reset
              </button>
              <button
                type="button"
                className="btn-save-txn"
                onClick={handleSaveTransaction}
                disabled={saving}
              >
                <FaSave /> {saving ? "Recording..." : "Save Transaction"}
              </button>
            </div>
          </main>
        </div>
      )}

      {/* ============================================================
         TAB 2: BALANCES & CONTACTS
         ============================================================ */}
      {activeTab === "balances" && (
        <div className="d-flex flex-column gap-3">
          {/* Sticky Search Bar & Filter Controls on Scroll */}
          <div className="ledger-sticky-controls">
            <div className="d-flex gap-2 align-items-center">
              <div className="search-box ldg-search-bar flex-grow-1">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by name, phone, business..."
                  value={balancesSearch}
                  onChange={(e) => setBalancesSearch(e.target.value)}
                />
                {balancesSearch && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-muted"
                    onClick={() => setBalancesSearch("")}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            </div>

            {/* Sleek Horizontal Category Filter Chips */}
            <div className="ldg-filter-chip-row">
              <button
                type="button"
                className={`ldg-filter-chip ${balancesCategory === "all" ? "active" : ""}`}
                onClick={() => setBalancesCategory("all")}
              >
                All ({contacts.length})
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${balancesCategory === "wholesaler" ? "active" : ""}`}
                onClick={() => setBalancesCategory("wholesaler")}
              >
                🏭 Wholesellers ({countWholesalers})
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${balancesCategory === "worker" ? "active" : ""}`}
                onClick={() => setBalancesCategory("worker")}
              >
                🔨 Workers ({countWorkers})
              </button>
              {countSuppliers > 0 && (
                <button
                  type="button"
                  className={`ldg-filter-chip ${balancesCategory === "supplier" ? "active" : ""}`}
                  onClick={() => setBalancesCategory("supplier")}
                >
                  📦 Suppliers ({countSuppliers})
                </button>
              )}
              {countFinanciers > 0 && (
                <button
                  type="button"
                  className={`ldg-filter-chip ${balancesCategory === "financier" ? "active" : ""}`}
                  onClick={() => setBalancesCategory("financier")}
                >
                  💰 Financiers ({countFinanciers})
                </button>
              )}
            </div>
          </div>

          {/* Category Section Header */}
          <div className="d-flex justify-content-between align-items-center mt-1">
            <span className="mobile-section-header-title">
              {balancesCategory === "all"
                ? `ALL CONTACTS (${filteredBalancesContacts.length})`
                : balancesCategory === "wholesaler"
                ? `WHOLESELLERS (${filteredBalancesContacts.length})`
                : balancesCategory === "worker"
                ? `WORKERS (${filteredBalancesContacts.length})`
                : `${balancesCategory.toUpperCase()} (${filteredBalancesContacts.length})`}
            </span>
          </div>

          <div className="ledger-balances-grid">
            {filteredBalancesContacts.map((c) => {
              const owesUs = c.balances?.moneyOwedToOwner || 0;
              const weOwe = c.balances?.moneyOwnerOwes || 0;
              const goldOwesUs = c.balances?.goldOwedToOwner || 0;
              const goldWeOwe = c.balances?.goldOwnerOwes || 0;
              const avatarTheme = getAvatarTheme(c.name);

              return (
                <div
                  key={c._id}
                  className="contact-balance-card"
                  onClick={() => navigate(`/people?contactId=${c._id}&from=ledger`)}
                >
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="actor-avatar"
                        style={{
                          backgroundColor: avatarTheme.bg,
                          color: avatarTheme.color,
                          fontWeight: 800,
                        }}
                      >
                        {getInitials(c)}
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0 text-truncate" style={{ maxWidth: "190px" }}>
                          {c.name}
                        </h6>
                        <span className="text-muted very-small d-block">
                          {c.businessName || c.categories?.[0] || "Business Contact"}
                        </span>
                        {c.phone ? (
                          <span className="text-muted very-small d-block">
                            +91 {c.phone.replace("+91", "").trim()}
                          </span>
                        ) : (
                          <span className="text-muted very-small d-block">—</span>
                        )}
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <span className="mobile-active-status-badge">
                        <span className="status-dot-green" /> Active
                      </span>
                      <FaChevronRight className="text-muted very-small" />
                    </div>
                  </div>

                  <div className="border-top pt-2 mt-1">
                    <div className="d-flex justify-content-between very-small mb-1">
                      <span className="text-muted">Money:</span>
                      {owesUs > 0 ? (
                        <span className="text-success fw-bold">
                          They Owe: ₹{owesUs.toLocaleString("en-IN")}
                        </span>
                      ) : weOwe > 0 ? (
                        <span className="text-danger fw-bold">
                          You Owe: ₹{weOwe.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-muted">Settled (₹0)</span>
                      )}
                    </div>

                    <div className="d-flex justify-content-between very-small">
                      <span className="text-muted">Gold:</span>
                      {goldOwesUs > 0 ? (
                        <span className="text-success fw-bold">
                          They Owe: {renderGoldValue(goldOwesUs.toFixed(3), c.balances?.goldOwedToOwnerValuation || 0)}
                        </span>
                      ) : goldWeOwe > 0 ? (
                        <span className="text-danger fw-bold">
                          You Owe: {renderGoldValue(goldWeOwe.toFixed(3), c.balances?.goldOwnerOwesValuation || 0)}
                        </span>
                      ) : (
                        <span className="text-muted">Settled ({renderGoldValue("0", 0)})</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredBalancesContacts.length === 0 && (
            <div className="text-center py-5 text-muted small bg-card rounded-3 border">
              No contacts found matching "{balancesSearch || balancesCategory}".
              <div className="mt-2">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setBalancesSearch("");
                    setBalancesCategory("all");
                  }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
         TAB 3: ALL TRANSACTIONS (MOCKUP SCREEN 2 MATCH)
         ============================================================ */}
      {activeTab === "transactions" && (
        <div className="d-flex flex-column gap-3">
          {/* Sticky Search Bar + Sleek Quick Filter Chips on Scroll */}
          <div className="ledger-sticky-controls">
            <div className="d-flex gap-2 align-items-center">
              <div className="search-box ldg-search-bar flex-grow-1">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by contact, type, notes, amount..."
                  value={txnSearch}
                  onChange={(e) => {
                    setTxnSearch(e.target.value);
                    setTxnPage(1);
                  }}
                />
                {txnSearch && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-muted"
                    onClick={() => {
                      setTxnSearch("");
                      setTxnPage(1);
                    }}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              <button
                type="button"
                className={`btn ${txnFilterOpen || txnActiveFiltersCount > 0 ? "btn-gold" : "btn-outline"} p-2 d-flex align-items-center justify-content-center position-relative`}
                style={{ height: "38px", minWidth: "38px" }}
                title="Filter Transactions"
                onClick={() => setTxnFilterOpen(!txnFilterOpen)}
              >
                <FaFilter />
                {txnActiveFiltersCount > 0 && (
                  <span className="ldg-filter-badge">{txnActiveFiltersCount}</span>
                )}
              </button>
            </div>

            {/* Sleek Horizontal Quick Filter Chips */}
            <div className="ldg-filter-chip-row">
              <button
                type="button"
                className={`ldg-filter-chip ${txnFilterAsset === "all" && txnFilterType === "all" && txnFilterDirection === "all" ? "active" : ""}`}
                onClick={() => {
                  setTxnFilterAsset("all");
                  setTxnFilterType("all");
                  setTxnFilterDirection("all");
                  setTxnPage(1);
                }}
              >
                All Txns ({filteredTransactions.length})
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${txnFilterAsset === "money" ? "active" : ""}`}
                onClick={() => {
                  setTxnFilterAsset(txnFilterAsset === "money" ? "all" : "money");
                  setTxnPage(1);
                }}
              >
                💼 Money
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${txnFilterAsset === "gold" ? "active" : ""}`}
                onClick={() => {
                  setTxnFilterAsset(txnFilterAsset === "gold" ? "all" : "gold");
                  setTxnPage(1);
                }}
              >
                🪙 Gold
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${txnFilterDirection === "paid" ? "active" : ""}`}
                onClick={() => {
                  setTxnFilterDirection(txnFilterDirection === "paid" ? "all" : "paid");
                  setTxnPage(1);
                }}
              >
                📤 You Paid
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${txnFilterDirection === "received" ? "active" : ""}`}
                onClick={() => {
                  setTxnFilterDirection(txnFilterDirection === "received" ? "all" : "received");
                  setTxnPage(1);
                }}
              >
                📥 You Received
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${txnFilterType === "advance" ? "active" : ""}`}
                onClick={() => {
                  setTxnFilterType(txnFilterType === "advance" ? "all" : "advance");
                  setTxnPage(1);
                }}
              >
                ⚡ Advance
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${txnFilterType === "purchase" ? "active" : ""}`}
                onClick={() => {
                  setTxnFilterType(txnFilterType === "purchase" ? "all" : "purchase");
                  setTxnPage(1);
                }}
              >
                🛒 Purchase
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${txnFilterType === "repayment" ? "active" : ""}`}
                onClick={() => {
                  setTxnFilterType(txnFilterType === "repayment" ? "all" : "repayment");
                  setTxnPage(1);
                }}
              >
                💵 Repayment
              </button>
            </div>

            {/* Expandable Filter Drawer (Smooth Accordion Panel) */}
            {txnFilterOpen && (
              <div className="ldg-filter-drawer">
                <div className="d-flex justify-content-between align-items-center pb-1 border-bottom">
                  <span className="fw-bold small">Filter Transactions</span>
                  {txnActiveFiltersCount > 0 && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-danger very-small text-decoration-none"
                      onClick={() => {
                        setTxnFilterAsset("all");
                        setTxnFilterType("all");
                        setTxnFilterDirection("all");
                        setTxnFilterDate("all");
                        setTxnSort("newest");
                        setTxnPage(1);
                      }}
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>

                {/* Asset Filter Group */}
                <div>
                  <div className="ldg-filter-group-title">Asset</div>
                  <div className="ldg-segmented-control">
                    {[
                      { id: "all", label: "All Assets" },
                      { id: "money", label: "💼 Money" },
                      { id: "gold", label: "🪙 Gold" },
                      { id: "goods", label: "📦 Goods" },
                    ].map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={`ldg-segmented-btn ${txnFilterAsset === a.id ? "active" : ""}`}
                        onClick={() => { setTxnFilterAsset(a.id); setTxnPage(1); }}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type Filter Group */}
                <div>
                  <div className="ldg-filter-group-title">Transaction Type</div>
                  <div className="ldg-segmented-control">
                    {[
                      { id: "all", label: "All Types" },
                      { id: "advance", label: "Advance" },
                      { id: "repayment", label: "Repayment" },
                      { id: "purchase", label: "Purchase" },
                      { id: "wage", label: "Wage" },
                      { id: "settlement", label: "Settlement" },
                      { id: "transfer", label: "Transfer" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`ldg-segmented-btn ${txnFilterType === t.id ? "active" : ""}`}
                        onClick={() => { setTxnFilterType(t.id); setTxnPage(1); }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Filter Group */}
                <div>
                  <div className="ldg-filter-group-title">Date Range</div>
                  <div className="ldg-segmented-control">
                    {[
                      { id: "all", label: "All Time" },
                      { id: "today", label: "Today" },
                      { id: "week", label: "Past 7 Days" },
                      { id: "month", label: "Past 30 Days" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className={`ldg-segmented-btn ${txnFilterDate === d.id ? "active" : ""}`}
                        onClick={() => { setTxnFilterDate(d.id); setTxnPage(1); }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Sort Group */}
                <div>
                  <div className="ldg-filter-group-title">Sort By</div>
                  <div className="ldg-segmented-control" style={{ flexWrap: 'wrap' }}>
                    {[
                      { id: "newest", label: "Latest" },
                      { id: "oldest", label: "Oldest" },
                      { id: "amount_high", label: "Highest Amt" },
                      { id: "amount_low", label: "Lowest Amt" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`ldg-segmented-btn ${txnSort === s.id ? "active" : ""}`}
                        onClick={() => { setTxnSort(s.id); setTxnPage(1); }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direction Filter Group */}
                <div>
                  <div className="ldg-filter-group-title">Cash/Gold Flow</div>
                  <div className="ldg-segmented-control">
                    {[
                      { id: "all", label: "All Flows" },
                      { id: "paid", label: "📤 You Paid / Gave" },
                      { id: "received", label: "📥 You Received" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`ldg-segmented-btn ${txnFilterDirection === f.id ? "active" : ""}`}
                        onClick={() => { setTxnFilterDirection(f.id); setTxnPage(1); }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="d-flex justify-content-end pt-1">
                  <button
                    type="button"
                    className="btn btn-gold btn-sm px-3 py-1 very-small"
                    onClick={() => setTxnFilterOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card List (Screen 2 Reference Match) */}
          <div className="d-md-none d-flex flex-column gap-2">
            {paginatedTransactions.map((tx) => {
              const dt = getTxnDateParts(tx.transactionDate || tx.createdAt);
              const isMoney = tx.assetType === "money";
              const isGold = tx.assetType === "gold";
              const typeClass =
                tx.transactionType === "advance"
                  ? "pill-advance"
                  : tx.transactionType?.includes("payment") || tx.transactionType === "repayment"
                  ? "pill-payment"
                  : isGold || tx.transactionType === "purchase"
                  ? "pill-gold"
                  : "pill-settlement";

              const otherContact = tx.providerId?._id ? tx.providerId : tx.receiverId;

              return (
                <div
                  key={tx._id}
                  className="mobile-txn-card"
                  onClick={() => otherContact?._id && navigate(`/people?contactId=${otherContact._id}&from=ledger`)}
                  style={{ cursor: "pointer" }}
                >
                  {/* Left Date Block */}
                  <div className="mobile-txn-date-block">
                    <span className="mobile-txn-month">{dt.month}</span>
                    <span className="mobile-txn-day">{dt.day}</span>
                    <span className="mobile-txn-year">{dt.year}</span>
                  </div>

                  {/* Middle Info */}
                  <div className="mobile-txn-info">
                    <div className="d-flex align-items-center gap-2">
                      <span className={`mobile-txn-type-pill ${typeClass}`}>
                        {tx.transactionType}
                      </span>
                    </div>
                    <div className="mobile-txn-flow">
                      <span className="mobile-txn-provider">
                        {tx.providerId?.name || "Business Owner (You)"}
                      </span>
                      <span className="mobile-txn-arrow">→</span>
                      <span className="mobile-txn-receiver">
                        {tx.receiverId?.name || "Business Owner (You)"}
                      </span>
                    </div>
                    <div className="mobile-txn-asset">
                      <span>{isMoney ? "💼 Money" : isGold ? "🪙 Gold" : "📦 Goods"}</span>
                      {tx.notes && <span className="ms-1 text-truncate opacity-75"> • {tx.notes}</span>}
                    </div>
                  </div>

                  {/* Right Amount & Status */}
                  <div className="mobile-txn-right">
                    <span
                      className={`mobile-txn-status ${
                        tx.status === "active" ? "active" : "settled"
                      }`}
                    >
                      {tx.status === "active" ? "Active" : "Settled"}
                    </span>
                    <span className={`mobile-txn-amount ${isGold ? "gold" : "green"}`}>
                      {isMoney
                        ? `₹${(tx.money?.amount || 0).toLocaleString("en-IN")}`
                        : isGold
                        ? `${(tx.gold?.weight || 0).toFixed(3)} g`
                        : `₹${(tx.goods?.valuation || 0).toLocaleString("en-IN")} (${tx.goods?.quantity || 1} ${tx.goods?.unit || "pcs"})`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="d-none d-md-block table-responsive ldg-table-wrapper">
            <table className="table ldg-theme-table align-middle mb-0 small">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>From (Provider)</th>
                  <th>To (Receiver)</th>
                  <th>On Behalf Of</th>
                  <th>Asset</th>
                  <th>Amount / Wt</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((tx) => {
                  const otherContact = tx.providerId?._id ? tx.providerId : tx.receiverId;
                  return (
                    <tr
                      key={tx._id}
                      onClick={() => otherContact?._id && navigate(`/people?contactId=${otherContact._id}&from=ledger`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>{new Date(tx.transactionDate || tx.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className="badge ldg-type-badge text-uppercase">
                          {tx.transactionType}
                        </span>
                      </td>
                      <td className="fw-semibold">
                        {tx.providerId?.name || "Business Owner (You)"}
                      </td>
                      <td className="fw-semibold">
                        {tx.receiverId?.name || "Business Owner (You)"}
                      </td>
                      <td className="text-muted">
                        {tx.onBehalfOfId?.name || "—"}
                      </td>
                      <td>
                        <span className="badge ldg-asset-badge">
                          {tx.assetType}
                        </span>
                      </td>
                      <td className="fw-bold">
                        {tx.assetType === "money"
                          ? `₹${(tx.money?.amount || 0).toLocaleString("en-IN")}`
                          : tx.assetType === "gold"
                          ? `${tx.gold?.weight || 0}g Gold`
                          : `${tx.goods?.quantity || 1} ${tx.goods?.unit || "pcs"}`}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            tx.status === "active" ? "bg-success" : "bg-secondary"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2">
            <div className="d-flex align-items-center gap-2">
              <span className="text-muted very-small">
                {showAllTxns
                  ? `Showing all ${filteredTransactions.length} transactions`
                  : `Page ${txnPage} of ${txnTotalPages} (${filteredTransactions.length} transactions total)`}
              </span>
              {filteredTransactions.length > txnPerPage && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm py-0 px-2 very-small"
                  onClick={() => setShowAllTxns(!showAllTxns)}
                >
                  {showAllTxns ? "Paginate (20/page)" : `Show All (${filteredTransactions.length})`}
                </button>
              )}
            </div>
            {!showAllTxns && txnTotalPages > 1 && (
              <div className="d-flex gap-1">
                <button
                  type="button"
                  className="btn btn-outline btn-sm py-1 px-3 very-small"
                  disabled={txnPage === 1}
                  onClick={() => setTxnPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                {Array.from({ length: txnTotalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    className={`btn btn-sm py-1 px-2 very-small ${txnPage === pg ? "btn-gold" : "btn-outline"}`}
                    onClick={() => setTxnPage(pg)}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-outline btn-sm py-1 px-3 very-small"
                  disabled={txnPage === txnTotalPages}
                  onClick={() => setTxnPage((p) => Math.min(txnTotalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-5 text-muted small bg-card rounded-3 border">
              No ledger transactions found matching filters.
              <div className="mt-2">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setTxnSearch("");
                    setTxnFilterAsset("all");
                    setTxnFilterType("all");
                    setTxnFilterDirection("all");
                    setTxnPage(1);
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
         TAB 4: OBLIGATIONS & SETTLEMENTS (MOCKUP SCREEN 3 MATCH)
         ============================================================ */}
      {activeTab === "obligations" && (
        <div className="d-flex flex-column gap-3">
          {/* Top Mini Summary Cards (Moved Above Search & Filter) */}
          <div className="mobile-obligations-summary-grid">
            <div className="mobile-ob-summary-card">
              <div className="mobile-ob-icon-box green">
                <span>🔄</span>
              </div>
              <div className="d-flex flex-column">
                <span className="mobile-ob-sub">To Receive</span>
                <span className="mobile-ob-val green">
                  ₹{(totals.totalMoneyReceivable || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="mobile-ob-summary-card">
              <div className="mobile-ob-icon-box red">
                <span>🏦</span>
              </div>
              <div className="d-flex flex-column">
                <span className="mobile-ob-sub">To Pay</span>
                <span className="mobile-ob-val red">
                  ₹{(totals.totalMoneyPayable || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="mobile-ob-summary-card">
              <div className="mobile-ob-icon-box gold">
                <span>🪙</span>
              </div>
              <div className="d-flex flex-column">
                <span className="mobile-ob-sub">Gold To Receive</span>
                <span className="mobile-ob-val green">
                  {renderGoldValue((totals.totalGoldReceivable || 0).toFixed(3), totals.totalGoldReceivableValuation || 0)}
                </span>
              </div>
            </div>
            
            <div className="mobile-ob-summary-card">
              <div className="mobile-ob-icon-box gold">
                <span>🪙</span>
              </div>
              <div className="d-flex flex-column">
                <span className="mobile-ob-sub">Gold You Owe</span>
                <span className="mobile-ob-val gold">
                  {renderGoldValue((totals.totalGoldPayable || 0).toFixed(3), totals.totalGoldPayableValuation || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Search Bar + Sleek Quick Filter Chips on Scroll */}
          <div className="ledger-sticky-controls">
            <div className="d-flex gap-2 align-items-center">
              <div className="search-box ldg-search-bar flex-grow-1">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by contact, status, asset, amount..."
                  value={obligationSearch}
                  onChange={(e) => setObligationSearch(e.target.value)}
                />
                {obligationSearch && (
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-muted"
                    onClick={() => setObligationSearch("")}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              <button
                type="button"
                className={`btn ${obFilterOpen || obActiveFiltersCount > 0 ? "btn-gold" : "btn-outline"} p-2 d-flex align-items-center justify-content-center position-relative`}
                style={{ height: "38px", minWidth: "38px" }}
                title="Filter Obligations"
                onClick={() => setObFilterOpen(!obFilterOpen)}
              >
                <FaFilter />
                {obActiveFiltersCount > 0 && (
                  <span className="ldg-filter-badge">{obActiveFiltersCount}</span>
                )}
              </button>
            </div>

            {/* Sleek Horizontal Quick Filter Chips */}
            <div className="ldg-filter-chip-row">
              <button
                type="button"
                className={`ldg-filter-chip ${obFilterStatus === "all" && obFilterAsset === "all" && obFilterDirection === "all" ? "active" : ""}`}
                onClick={() => {
                  setObFilterStatus("all");
                  setObFilterAsset("all");
                  setObFilterDirection("all");
                }}
              >
                All Debts ({filteredObligations.length})
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${obFilterStatus === "outstanding" ? "active" : ""}`}
                onClick={() => setObFilterStatus(obFilterStatus === "outstanding" ? "all" : "outstanding")}
              >
                ⏳ Outstanding
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${obFilterStatus === "partially_settled" ? "active" : ""}`}
                onClick={() => setObFilterStatus(obFilterStatus === "partially_settled" ? "all" : "partially_settled")}
              >
                🔄 Partial
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${obFilterAsset === "money" ? "active" : ""}`}
                onClick={() => setObFilterAsset(obFilterAsset === "money" ? "all" : "money")}
              >
                💼 Money
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${obFilterAsset === "gold" ? "active" : ""}`}
                onClick={() => setObFilterAsset(obFilterAsset === "gold" ? "all" : "gold")}
              >
                🪙 Gold
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${obFilterDirection === "receivable" ? "active" : ""}`}
                onClick={() => setObFilterDirection(obFilterDirection === "receivable" ? "all" : "receivable")}
              >
                📥 They Owe You
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${obFilterDirection === "payable" ? "active" : ""}`}
                onClick={() => setObFilterDirection(obFilterDirection === "payable" ? "all" : "payable")}
              >
                📤 You Owe Them
              </button>
              <button
                type="button"
                className={`ldg-filter-chip ${obFilterStatus === "settled" ? "active" : ""}`}
                onClick={() => setObFilterStatus(obFilterStatus === "settled" ? "all" : "settled")}
              >
                ✅ Settled
              </button>
            </div>

            {/* Expandable Filter Drawer (Smooth Accordion Panel) */}
            {obFilterOpen && (
              <div className="ldg-filter-drawer">
                <div className="d-flex justify-content-between align-items-center pb-1 border-bottom">
                  <span className="fw-bold small">Filter Obligations</span>
                  {obActiveFiltersCount > 0 && (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-danger very-small text-decoration-none"
                      onClick={() => {
                        setObFilterStatus("all");
                        setObFilterAsset("all");
                        setObFilterDirection("all");
                      }}
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>

                {/* Status Group */}
                <div>
                  <div className="ldg-filter-group-title">Status</div>
                  <div className="ldg-segmented-control">
                    {[
                      { id: "all", label: "All Status" },
                      { id: "outstanding", label: "⏳ Outstanding" },
                      { id: "partially_settled", label: "🔄 Partially Settled" },
                      { id: "settled", label: "✅ Settled" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`ldg-segmented-btn ${obFilterStatus === s.id ? "active" : ""}`}
                        onClick={() => setObFilterStatus(s.id)}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Asset Group */}
                <div>
                  <div className="ldg-filter-group-title">Asset</div>
                  <div className="ldg-segmented-control">
                    {[
                      { id: "all", label: "All Assets" },
                      { id: "money", label: "💼 Money" },
                      { id: "gold", label: "🪙 Gold" },
                    ].map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className={`ldg-segmented-btn ${obFilterAsset === a.id ? "active" : ""}`}
                        onClick={() => setObFilterAsset(a.id)}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Direction Group */}
                <div>
                  <div className="ldg-filter-group-title">Obligation Direction</div>
                  <div className="ldg-segmented-control">
                    {[
                      { id: "all", label: "All Directions" },
                      { id: "receivable", label: "📥 They Owe You (Receivables)" },
                      { id: "payable", label: "📤 You Owe Them (Payables)" },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        className={`ldg-segmented-btn ${obFilterDirection === d.id ? "active" : ""}`}
                        onClick={() => setObFilterDirection(d.id)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="d-flex justify-content-end pt-1">
                  <button
                    type="button"
                    className="btn btn-gold btn-sm px-3 py-1 very-small"
                    onClick={() => setObFilterOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Obligation Cards */}
          <div className="d-md-none d-flex flex-column gap-3">
            {filteredObligations.map((ob) => {
              const otherParty = ob.debtorId?.isOwner ? ob.creditorId : ob.debtorId;
              const isWeOwe   = ob.debtorId?.isOwner || !ob.debtorId;
              const hasGold   = (ob.goldBalance || 0) > 0;
              const hasMoney  = (ob.moneyBalance || 0) > 0;

              // What they owe / you owe — expressed clearly
              const balanceLabel = hasMoney
                ? `₹${(ob.moneyBalance || 0).toLocaleString("en-IN")}${hasGold ? ` + ${(ob.goldBalance || 0).toFixed(3)}g` : ""}`
                : hasGold
                ? `${(ob.goldBalance || 0).toFixed(3)}g Gold`
                : "₹0 (Settled)";

              const totalLabel = ob.totalDebtMoney > 0
                ? `₹${(ob.totalDebtMoney || 0).toLocaleString("en-IN")} total`
                : "";

              const settledLabel = ob.totalSettledMoney > 0
                ? `₹${(ob.totalSettledMoney || 0).toLocaleString("en-IN")} settled`
                : "";

              return (
                <div key={ob._id} className="mobile-ob-card">
                  {/* Header Row */}
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <div className="actor-avatar" style={{ width: "36px", height: "36px", fontSize: "12px", backgroundColor: "#FEF3C7", color: "#B45309" }}>
                        {getInitials(otherParty)}
                      </div>
                      <div className="d-flex flex-column" style={{ minWidth: 0 }}>
                        <span className="mobile-ob-title fw-bold text-truncate" style={{ maxWidth: "160px" }}>
                          {otherParty?.name || "Registered Contact"}
                        </span>
                        <span className="mobile-ob-role text-muted very-small">
                          {isWeOwe ? "You owe them" : "They owe you"}
                        </span>
                      </div>
                    </div>
                    <span className={`mobile-ob-status ${ob.status === "outstanding" ? "outstanding" : ob.status === "partially_settled" ? "partial" : "settled"}`}>
                      {ob.status === "outstanding" ? "Outstanding" : ob.status === "partially_settled" ? "Partial" : "Settled"}
                    </span>
                  </div>

                  {/* Balance Display */}
                  <div className="mt-2 mb-1">
                    <div className={`fw-bold ${hasMoney || hasGold ? "text-primary" : "text-success"}`} style={{ fontSize: "16px" }}>
                      {balanceLabel}
                    </div>
                    {(totalLabel || settledLabel) && (
                      <div className="very-small text-muted d-flex gap-2 mt-1">
                        {totalLabel && <span>Total: {totalLabel}</span>}
                        {settledLabel && <span>· {settledLabel}</span>}
                      </div>
                    )}
                  </div>

                  {/* Settlement Log Timeline — capped at 4, expandable */}
                  {ob.settlementLog && ob.settlementLog.length > 0 && (
                    <div className="mt-2" style={{ borderTop: "1px solid var(--border-light)", paddingTop: "8px" }}>
                      <div className="very-small fw-semibold text-muted mb-1">Transaction History</div>
                      <div className="d-flex flex-column gap-1">
                        {(() => {
                          const log = [...(ob.settlementLog || [])].reverse();
                          const isExpanded = expandedLogs.has(ob._id);
                          const visible = isExpanded ? log : log.slice(0, 4);
                          const hiddenCount = log.length - 4;
                          return (
                            <>
                              {visible.map((entry, i) => {
                                const isAdded    = entry.direction === "added";
                                const isWriteOff = entry.direction === "writeoff";
                                const entryMoney = entry.moneyApplied || 0;
                                const entryGold  = entry.goldGrams    || 0;
                                const dateStr    = entry.date
                                  ? new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
                                  : "";
                                let amtLabel = "";
                                if (entry.assetType === "gold" && entryGold > 0) {
                                  amtLabel = `${entryGold.toFixed(3)}g gold`;
                                  if (entryMoney > 0) amtLabel += ` (₹${entryMoney.toLocaleString("en-IN")})`;
                                } else {
                                  amtLabel = entryMoney > 0 ? `₹${entryMoney.toLocaleString("en-IN")}` : entry.assetType;
                                }
                                const color  = isWriteOff ? "#D97706" : isAdded ? "#EF4444" : "#22C55E";
                                const prefix = isWriteOff ? "✍" : isAdded ? "+" : "−";
                                return (
                                  <div key={i} className="d-flex flex-column gap-0 very-small">
                                    <div className="d-flex align-items-center gap-2">
                                      <span style={{ color, fontWeight: 700, width: "12px" }}>{prefix}</span>
                                      <span className="text-muted" style={{ minWidth: "60px" }}>{dateStr}</span>
                                      <span style={{ color }}>{amtLabel}</span>
                                      <span className="text-muted" style={{ fontSize: "10px" }}>{entry.txnId || ""}</span>
                                    </div>
                                    {isWriteOff && entry.description && (
                                      <span className="text-muted" style={{ fontSize: "10px", paddingLeft: "26px" }}>↳ {entry.description}</span>
                                    )}
                                  </div>
                                );
                              })}
                              {hiddenCount > 0 && (
                                <button className="ob-log-expand-btn" onClick={(e) => { e.stopPropagation(); toggleLog(ob._id); }}>
                                  {isExpanded ? "Show less ↑" : `+ ${hiddenCount} more transactions ↓`}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Action Row */}
                  <div className="d-flex align-items-center justify-content-between mt-2 gap-2">
                    <div className="mobile-ob-view-link" onClick={() => otherParty?._id && navigate(`/people?contactId=${otherParty._id}&from=ledger`)}>
                      <span>View Full Ledger</span>
                      <FaChevronRight className="very-small" />
                    </div>
                    {ob.status !== "settled" && ob.status !== "void" && (
                      <button
                        className="ob-writeoff-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWritingOff(ob);
                          setWriteOffForm({ amount: String(Math.round(ob.moneyBalance || 0)), reason: "" });
                        }}
                      >
                        ✍ Write Off
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="d-none d-md-block table-responsive ldg-table-wrapper">
            <table className="table ldg-theme-table align-middle mb-0 small">
              <thead>
                <tr>
                  <th>Who Owes</th>
                  <th>Who is Owed</th>
                  <th>Outstanding Balance</th>
                  <th>Total Debt</th>
                  <th>Settled</th>
                  <th>Status</th>
                  <th>Settlement Log</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredObligations.map((ob) => {
                  const otherParty = ob.debtorId?.isOwner ? ob.creditorId : ob.debtorId;
                  const hasMoney   = (ob.moneyBalance || 0) > 0;
                  const hasGold    = (ob.goldBalance  || 0) > 0;
                  const balanceDisplay = hasMoney
                    ? `₹${(ob.moneyBalance || 0).toLocaleString("en-IN")}${hasGold ? ` + ${(ob.goldBalance || 0).toFixed(3)}g` : ""}`
                    : hasGold
                    ? `${(ob.goldBalance || 0).toFixed(3)}g Gold`
                    : "₹0";
                  const log = [...(ob.settlementLog || [])].reverse();
                  const isExpanded = expandedLogs.has(ob._id);
                  const visibleLog = isExpanded ? log : log.slice(0, 4);
                  const hiddenCount = log.length - 4;
                  const isActive = ob.status !== "settled" && ob.status !== "void";
                  return (
                    <tr key={ob._id} onClick={() => otherParty?._id && navigate(`/people?contactId=${otherParty._id}&from=ledger`)} style={{ cursor: "pointer" }}>
                      <td className="fw-bold text-danger">{ob.debtorId?.name || "Business Owner (You)"}</td>
                      <td className="fw-bold text-success">{ob.creditorId?.name || "Business Owner (You)"}</td>
                      <td className="fw-bold text-primary">{balanceDisplay}</td>
                      <td className="text-muted">{ob.totalDebtMoney > 0 ? `₹${(ob.totalDebtMoney || 0).toLocaleString("en-IN")}` : "—"}</td>
                      <td className="text-muted">{ob.totalSettledMoney > 0 ? `₹${(ob.totalSettledMoney || 0).toLocaleString("en-IN")}` : "—"}</td>
                      <td>
                        <span className={`badge ${ob.status === "outstanding" ? "bg-warning text-dark" : ob.status === "settled" ? "bg-success" : "bg-info"}`}>
                          {ob.status}
                        </span>
                      </td>
                      <td style={{ maxWidth: "260px" }}>
                        <div className="d-flex flex-column gap-1 very-small">
                          {visibleLog.map((entry, i) => {
                            const isAdded    = entry.direction === "added";
                            const isWriteOff = entry.direction === "writeoff";
                            const entryMoney = entry.moneyApplied || 0;
                            const entryGold  = entry.goldGrams    || 0;
                            const dateStr    = entry.date
                              ? new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                              : "";
                            let amtLabel = "";
                            if (entry.assetType === "gold" && entryGold > 0) {
                              amtLabel = `${entryGold.toFixed(3)}g`;
                              if (entryMoney > 0) amtLabel += ` (₹${entryMoney.toLocaleString("en-IN")})`;
                            } else {
                              amtLabel = entryMoney > 0 ? `₹${entryMoney.toLocaleString("en-IN")}` : entry.assetType;
                            }
                            const color  = isWriteOff ? "#D97706" : isAdded ? "#EF4444" : "#22C55E";
                            const prefix = isWriteOff ? "✍" : isAdded ? "+" : "−";
                            return (
                              <div key={i} className="d-flex flex-column gap-0">
                                <span style={{ color }}>
                                  {prefix} {amtLabel} <span className="text-muted">({dateStr}{entry.txnId ? ` · ${entry.txnId}` : ""})</span>
                                </span>
                                {isWriteOff && entry.description && (
                                  <span className="text-muted" style={{ fontSize: "10px", paddingLeft: "14px" }}>↳ {entry.description}</span>
                                )}
                              </div>
                            );
                          })}
                          {hiddenCount > 0 && (
                            <button
                              className="ob-log-expand-btn"
                              onClick={(e) => { e.stopPropagation(); toggleLog(ob._id); }}
                            >
                              {isExpanded ? "Show less ↑" : `+ ${hiddenCount} more ↓`}
                            </button>
                          )}
                        </div>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {isActive && (
                          <button
                            className="ob-writeoff-btn-sm"
                            onClick={() => {
                              setWritingOff(ob);
                              setWriteOffForm({ amount: String(Math.round(ob.moneyBalance || 0)), reason: "" });
                            }}
                          >
                            ✍ Write Off
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredObligations.length === 0 && (
            <div className="text-center py-5 text-muted small bg-card rounded-3 border">
              No outstanding obligations recorded matching filters.
              <div className="mt-2">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setObligationSearch("");
                    setObFilterStatus("all");
                    setObFilterAsset("all");
                    setObFilterDirection("all");
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}

        </div>
      )}


      {/* ============================================================
         WRITE-OFF MODAL
         ============================================================ */}
      {writingOff && (
        <div className="settle-overlay" onClick={() => setWritingOff(null)}>
          <div className="settle-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settle-modal-header">
              <h3>✍ Write Off Debt</h3>
              <button className="settle-close" onClick={() => setWritingOff(null)}>✕</button>
            </div>
            <div className="settle-modal-body">
              <div className="settle-info">
                <strong>{writingOff.debtorId?.name || "Business Owner (You)"}</strong> owes{" "}
                <strong>{writingOff.creditorId?.name || "Business Owner (You)"}</strong>
                <span className="settle-outstanding">
                  Outstanding: ₹{(writingOff.moneyBalance || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="writeoff-note">
                No money changes hands — this reduces the outstanding debt with a reason (e.g. salary, concession, work done in lieu).
              </div>

              <div className="txn-field">
                <label>Amount to Write Off (₹) *</label>
                <input
                  type="number"
                  value={writeOffForm.amount}
                  onChange={(e) => setWriteOffForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder={`Max ₹${(writingOff.moneyBalance || 0).toLocaleString("en-IN")}`}
                />
              </div>

              <div className="txn-field">
                <label>Reason *</label>
                <input
                  type="text"
                  value={writeOffForm.reason}
                  onChange={(e) => setWriteOffForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Salary for Sept, Concession granted, Work done in lieu…"
                />
              </div>

              <div className="settle-footer">
                <button className="ldg-btn outline" onClick={() => setWritingOff(null)}>Cancel</button>
                <button className="ldg-btn amber" disabled={savingWriteOff} onClick={handleWriteOff}>
                  {savingWriteOff ? "Recording…" : "Confirm Write-Off"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
         CONTACT PICKER MODAL (FOR PROVIDER / RECEIVER / ON BEHALF OF)
         ============================================================ */}
      {pickerOpen && (
        <div className="contact-picker-modal" onClick={() => setPickerOpen(false)}>
          <div
            className="contact-picker-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="contact-picker-header">
              <h6 className="fw-bold mb-0">
                Select {pickerTarget === "provider" ? "Who Gave (Provider)" : pickerTarget === "receiver" ? "Who Received (Receiver)" : "For Whom (On Behalf Of)"}
              </h6>
              <button
                type="button"
                className="btn-close"
                onClick={() => setPickerOpen(false)}
              />
            </div>

            <div className="contact-picker-search">
              <div className="search-box w-100 mb-2">
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search by name, phone or category..."
                  value={pickerSearch}
                  autoFocus
                  onChange={(e) => setPickerSearch(e.target.value)}
                />
              </div>

              {/* Category Filter Pills */}
              <div className="d-flex gap-1">
                <button
                  type="button"
                  className={`btn btn-sm ${pickerCategoryFilter === "all" ? "btn-gold" : "btn-outline"} py-1 px-2 very-small`}
                  onClick={() => setPickerCategoryFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${pickerCategoryFilter === "wholesaler" ? "btn-gold" : "btn-outline"} py-1 px-2 very-small`}
                  onClick={() => setPickerCategoryFilter("wholesaler")}
                >
                  🏭 Wholesalers
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${pickerCategoryFilter === "worker" ? "btn-gold" : "btn-outline"} py-1 px-2 very-small`}
                  onClick={() => setPickerCategoryFilter("worker")}
                >
                  👷 Workers
                </button>
              </div>
            </div>

            <div className="contact-picker-list">
              {/* Option 1: Business Owner */}
              <button
                type="button"
                className="contact-picker-option"
                onClick={() => handleSelectContact(OWNER_CONTACT)}
              >
                <div className="actor-avatar owner-gold">👑</div>
                <div className="d-flex flex-column">
                  <span className="fw-bold">My Business (You)</span>
                  <span className="very-small text-muted">Business Owner Account</span>
                </div>
              </button>

              {/* Registered Contacts */}
              {filteredPickerContacts.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  className="contact-picker-option"
                  onClick={() => handleSelectContact(c)}
                >
                  <div className="actor-avatar">{getInitials(c)}</div>
                  <div className="d-flex flex-column">
                    <span className="fw-bold">{c.name}</span>
                    <span className="very-small text-muted">
                      {c.categories?.join(", ") || "Contact"} {c.phone ? `· ${c.phone}` : ""}
                    </span>
                  </div>
                </button>
              ))}

              {filteredPickerContacts.length === 0 && (
                <div className="text-center py-4 text-muted small">
                  No contacts found matching &ldquo;{pickerSearch}&rdquo;
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
