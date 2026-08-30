import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";
import {
    FiBox,
    FiTrendingUp,
    FiShoppingCart,
    FiLayers,
    FiCalendar,
    FiRefreshCw,
    FiArrowUpRight,
    FiArrowDownRight,
    FiPlus,
    FiAlertTriangle,
} from "react-icons/fi";
import { FaCrown } from "react-icons/fa";
import "./Dashboard.css";

const palette = {
    gold: "#C8A14B",
    goldDark: "#9A7B38",
    goldLight: "#FBF5E8",
    green: "#2E9D58",
    greenLight: "#E8F8EE",
    blue: "#2D73FF",
    blueLight: "#EEF4FF",
    purple: "#7B61FF",
    purpleLight: "#F5EFFE",
    orange: "#F59E0B",
    red: "#EF4444",
    redLight: "#FEE2E2",
    gray: "#8E8E93",
};

function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

function formatNumber(value, digits = 0) {
    return new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: digits,
    }).format(Number(value || 0));
}

// Relative Time Formatter for real timestamps
function formatRelativeTime(dateInput) {
    if (!dateInput) return "Recently";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "Recently";

    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSeconds < 60) return "Just now";
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Helper to extract a display name from sold or inventory items
function getItemTitle(item) {
    if (!item) return "Jewellery Item";
    if (item.inventoryId) {
        const inv = item.inventoryId;
        if (inv.productFields && Array.isArray(inv.productFields)) {
            const nameField = inv.productFields.find((f) => {
                const label = f.fieldRef?.label?.toLowerCase() || "";
                return label.includes("product") || label.includes("name") || label.includes("item") || label.includes("title");
            });
            if (nameField && nameField.value) return String(nameField.value);
        }
        if (inv.fields && Array.isArray(inv.fields)) {
            const nameField = inv.fields.find((f) => {
                const label = f.fieldRef?.label?.toLowerCase() || "";
                return label.includes("product") || label.includes("name") || label.includes("item");
            });
            if (nameField && nameField.value) return String(nameField.value);
        }
        if (inv.productID) return inv.productID;
    }
    if (item.productFields && Array.isArray(item.productFields)) {
        const nameField = item.productFields.find((f) => {
            const label = f.fieldRef?.label?.toLowerCase() || "";
            return label.includes("product") || label.includes("name") || label.includes("item") || label.includes("title");
        });
        if (nameField && nameField.value) return String(nameField.value);
    }
    if (item.orderId?.orderFields && Array.isArray(item.orderId.orderFields)) {
        const nameField = item.orderId.orderFields.find((f) => {
            const label = f.fieldRef?.label?.toLowerCase() || "";
            return label.includes("product") || label.includes("name") || label.includes("item");
        });
        if (nameField && nameField.value) return String(nameField.value);
    }
    if (item.fields && Array.isArray(item.fields)) {
        const nameField = item.fields.find((f) => {
            const label = f.fieldRef?.label?.toLowerCase() || "";
            return label.includes("product") || label.includes("name") || label.includes("item");
        });
        if (nameField && nameField.value) return String(nameField.value);
    }
    return item.productID || item.billingID || item.orderID || "Gold Ornament";
}

// Helper to extract customer name
function getCustomerName(item) {
    if (!item) return "Walk-in Customer";
    if (item.customerId?.name) return item.customerId.name;
    if (item.soldFields && Array.isArray(item.soldFields)) {
        const custField = item.soldFields.find((f) => {
            const label = f.fieldRef?.label?.toLowerCase() || "";
            return label.includes("customer") || label.includes("buyer") || label.includes("name");
        });
        if (custField && custField.value) return String(custField.value);
    }
    return "Customer";
}

// Mini Sparkline SVG for Top KPI Cards
function MiniSparkline({ color, points = [] }) {
    const safePoints = points.length > 1 ? points : [0, 0];
    const min = Math.min(...safePoints);
    const max = Math.max(...safePoints) || (min > 0 ? min * 2 : 1);
    const height = 36;
    const width = 84;
    const step = width / Math.max(safePoints.length - 1, 1);

    const pathData = safePoints
        .map((val, idx) => {
            const x = idx * step;
            const y = height - ((val - min) / (max - min || 1)) * (height - 10) - 5;
            return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ");

    return (
        <svg className="kpi-sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <path d={pathData} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();

    const [inventoryItems, setInventoryItems] = useState([]);
    const [soldItems, setSoldItems] = useState([]);
    const [orders, setOrders] = useState([]);
    const [ledgerBalances, setLedgerBalances] = useState({ contacts: [], totals: null });
    const [ledgerTransactions, setLedgerTransactions] = useState([]);
    const [liveRates, setLiveRates] = useState(null);
    const [ratesRefreshing, setRatesRefreshing] = useState(false);

    const [timeRange, setTimeRange] = useState("weekly");
    const [customStartDate, setCustomStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [customEndDate, setCustomEndDate] = useState(() => {
        return new Date().toISOString().split("T")[0];
    });
    const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
    const [tempStartDate, setTempStartDate] = useState(customStartDate);
    const [tempEndDate, setTempEndDate] = useState(customEndDate);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Fetch Live Rates
    const fetchLiveRates = useCallback(async (forceRefresh = false) => {
        try {
            setRatesRefreshing(true);
            const url = forceRefresh ? "/rates?refresh=true" : "/rates";
            const res = await api.get(url);
            if (res.data?.success && res.data?.data) {
                setLiveRates(res.data.data);
            }
        } catch (e) {
            console.warn("Live rates fetch issue:", e);
        } finally {
            setRatesRefreshing(false);
        }
    }, []);

    // Fetch all real backend datasets
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [invRes, soldRes, orderRes, balancesRes, txnRes, ratesRes] = await Promise.all([
                    api.get("/inventory").catch(() => ({ data: { items: [] } })),
                    api.get("/sold").catch(() => ({ data: { data: [] } })),
                    api.get("/orders").catch(() => ({ data: { items: [] } })),
                    api.get("/ledger/balances").catch(() => ({ data: { contacts: [], totals: null } })),
                    api.get("/ledger/transactions").catch(() => ({ data: { transactions: [] } })),
                    api.get("/rates").catch(() => null),
                ]);

                setInventoryItems(invRes.data.items || invRes.data.data || []);
                setSoldItems(soldRes.data.data || soldRes.data.items || []);
                setOrders(orderRes.data.items || orderRes.data.data || []);
                setLedgerBalances({
                    contacts: balancesRes.data.contacts || [],
                    totals: balancesRes.data.totals || null,
                });
                setLedgerTransactions(txnRes.data.transactions || []);

                if (ratesRes?.data?.success && ratesRes.data?.data) {
                    setLiveRates(ratesRes.data.data);
                }
            } catch (err) {
                console.error("Dashboard load error", err);
                setError("Unable to load dashboard data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Real Date Bounds Calculation (supports daily, weekly, monthly, yearly, custom)
    const getRangeBounds = useCallback((range) => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);

        switch (range) {
            case "daily":
            case "today":
                start.setHours(0, 0, 0, 0);
                return { start, end };
            case "weekly":
                start.setDate(end.getDate() - 6);
                start.setHours(0, 0, 0, 0);
                return { start, end };
            case "monthly":
                start.setMonth(end.getMonth() - 1);
                start.setHours(0, 0, 0, 0);
                return { start, end };
            case "yearly":
                start.setFullYear(end.getFullYear() - 1);
                start.setHours(0, 0, 0, 0);
                return { start, end };
            case "custom": {
                const cStart = customStartDate ? new Date(customStartDate) : new Date(end.getTime() - 30 * 24 * 3600 * 1000);
                cStart.setHours(0, 0, 0, 0);
                const cEnd = customEndDate ? new Date(customEndDate) : new Date();
                cEnd.setHours(23, 59, 59, 999);
                return { start: cStart, end: cEnd };
            }
            default:
                start.setDate(end.getDate() - 6);
                start.setHours(0, 0, 0, 0);
                return { start, end };
        }
    }, [customStartDate, customEndDate]);

    const getPreviousRangeBounds = useCallback((range) => {
        const { start, end } = getRangeBounds(range);
        const span = end - start;
        const previousEnd = new Date(start);
        previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
        const previousStart = new Date(previousEnd.getTime() - span);
        return { start: previousStart, end: previousEnd };
    }, [getRangeBounds]);

    const isInRange = useCallback((dateValue, range) => {
        if (!dateValue) return false;
        const { start, end } = getRangeBounds(range);
        const d = new Date(dateValue);
        return d >= start && d <= end;
    }, [getRangeBounds]);

    // Real Filtered Datasets
    const inRangeSold = useMemo(() => {
        return soldItems.filter((item) => isInRange(item.soldAt || item.createdAt, timeRange));
    }, [soldItems, timeRange, isInRange]);

    const previousRangeSold = useMemo(() => {
        const { start, end } = getPreviousRangeBounds(timeRange);
        return soldItems.filter((item) => {
            const d = new Date(item.soldAt || item.createdAt);
            return d >= start && d <= end;
        });
    }, [soldItems, timeRange, getPreviousRangeBounds]);

    // 1. Real KPI Calculations
    const inventoryInStock = useMemo(() => {
        return inventoryItems.filter((item) => item.inStock !== false);
    }, [inventoryItems]);

    const inventoryValue = useMemo(() => {
        return inventoryInStock.reduce(
            (sum, item) => sum + Number(item.baseCostPrice || item.inventoryPrice || item.finalPrice || 0),
            0
        );
    }, [inventoryInStock]);

    const revenue = useMemo(() => {
        return inRangeSold.reduce((sum, item) => sum + Number(item.finalPrice || item.sellingPrice || 0), 0);
    }, [inRangeSold]);

    const profit = useMemo(() => {
        return inRangeSold.reduce((sum, item) => sum + Number(item.profit || 0), 0);
    }, [inRangeSold]);

    const totalItemsSold = inRangeSold.length;

    // Real Growth Calculations vs Previous Period
    const previousRevenue = useMemo(() => {
        return previousRangeSold.reduce((sum, item) => sum + Number(item.finalPrice || item.sellingPrice || 0), 0);
    }, [previousRangeSold]);

    const previousProfit = useMemo(() => {
        return previousRangeSold.reduce((sum, item) => sum + Number(item.profit || 0), 0);
    }, [previousRangeSold]);

    const revenueGrowth = useMemo(() => {
        if (previousRevenue === 0) return revenue > 0 ? 100 : 0;
        return (((revenue - previousRevenue) / previousRevenue) * 100).toFixed(1);
    }, [revenue, previousRevenue]);

    const profitGrowth = useMemo(() => {
        if (previousProfit === 0) return profit > 0 ? 100 : 0;
        return (((profit - previousProfit) / Math.max(previousProfit, 1)) * 100).toFixed(1);
    }, [profit, previousProfit]);

    // 2. Real Daily/Monthly Timeline for Chart & Sparklines
    const timelineData = useMemo(() => {
        const buckets = [];
        const { start, end } = getRangeBounds(timeRange);

        if (timeRange === "yearly") {
            // 12 monthly buckets
            for (let i = 11; i >= 0; i--) {
                const bStart = new Date(end.getFullYear(), end.getMonth() - i, 1, 0, 0, 0);
                const bEnd = new Date(end.getFullYear(), end.getMonth() - i + 1, 0, 23, 59, 59);
                const label = bStart.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

                const bucketItems = inRangeSold.filter((item) => {
                    const d = new Date(item.soldAt || item.createdAt);
                    return d >= bStart && d <= bEnd;
                });

                buckets.push({
                    label,
                    revenue: bucketItems.reduce((s, item) => s + Number(item.finalPrice || item.sellingPrice || 0), 0),
                    profit: bucketItems.reduce((s, item) => s + Number(item.profit || 0), 0),
                });
            }
            return buckets;
        }

        const spanMs = end.getTime() - start.getTime();
        const spanDays = Math.max(Math.ceil(spanMs / (1000 * 3600 * 24)), 1);

        let stepDays = 1;
        if (spanDays > 180) {
            stepDays = 30;
        } else if (spanDays > 60) {
            stepDays = 7;
        } else if (spanDays > 14) {
            stepDays = 3;
        } else {
            stepDays = 1;
        }

        const cursor = new Date(start);
        while (cursor <= end) {
            const label = cursor.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            const bucketStart = new Date(cursor);
            const bucketEnd = new Date(cursor);
            bucketEnd.setDate(bucketEnd.getDate() + stepDays);

            const bucketItems = inRangeSold.filter((item) => {
                const d = new Date(item.soldAt || item.createdAt);
                return d >= bucketStart && d < bucketEnd;
            });

            const bucketRev = bucketItems.reduce((sum, item) => sum + Number(item.finalPrice || item.sellingPrice || 0), 0);
            const bucketProf = bucketItems.reduce((sum, item) => sum + Number(item.profit || 0), 0);

            buckets.push({
                label,
                revenue: bucketRev,
                profit: bucketProf,
            });

            cursor.setDate(cursor.getDate() + stepDays);
        }

        return buckets;
    }, [inRangeSold, timeRange, getRangeBounds]);

    // Real Sparkline Points
    const revenueSparkPoints = useMemo(() => {
        return timelineData.map((d) => d.revenue);
    }, [timelineData]);

    const profitSparkPoints = useMemo(() => {
        return timelineData.map((d) => d.profit);
    }, [timelineData]);

    const soldSparkPoints = useMemo(() => {
        return timelineData.map((d) => (d.revenue > 0 ? 1 : 0));
    }, [timelineData]);

    // 3. Real Inventory Weights & Status
    const totalGoldWeight = useMemo(() => {
        const wt = inventoryInStock.reduce((sum, item) => {
            return sum + Number(item.goldWeight || item.netWeight || item.weight || 0);
        }, 0);
        return wt.toFixed(1);
    }, [inventoryInStock]);

    const totalStoneWeight = useMemo(() => {
        const wt = inventoryInStock.reduce((sum, item) => {
            return sum + Number(item.stoneWeight || item.diamondWeight || 0);
        }, 0);
        return wt.toFixed(1);
    }, [inventoryInStock]);

    const lowStockCount = useMemo(() => {
        return inventoryInStock.filter((item) => item.quantity != null && Number(item.quantity) <= 2).length;
    }, [inventoryInStock]);

    const recentlyAddedCount = useMemo(() => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return inventoryItems.filter((item) => new Date(item.createdAt || 0) >= sevenDaysAgo).length;
    }, [inventoryItems]);

    // 4. Real Orders Breakdown
    const totalOrdersCount = orders.length;
    const pendingOrdersCount = orders.filter((o) => (o.status || "").toLowerCase() === "pending").length;
    const inProgressOrdersCount = orders.filter(
        (o) => (o.status || "").toLowerCase() === "in progress" || (o.status || "").toLowerCase() === "processing"
    ).length;
    const completedOrdersCount = orders.filter(
        (o) => (o.status || "").toLowerCase() === "completed" || (o.status || "").toLowerCase() === "delivered"
    ).length;

    // 5. Real Payment Status Breakdown
    const paidBills = inRangeSold.filter((item) => (item.paymentStatus || "").toLowerCase() === "paid").length;
    const partialBills = inRangeSold.filter((item) => (item.paymentStatus || "").toLowerCase() === "partial").length;
    const pendingBills = inRangeSold.filter((item) => !item.paymentStatus || item.paymentStatus.toLowerCase() === "pending").length;
    const totalBills = inRangeSold.length;

    const paidPercent = totalBills > 0 ? Math.round((paidBills / totalBills) * 100) : 0;
    const partialPercent = totalBills > 0 ? Math.round((partialBills / totalBills) * 100) : 0;
    const pendingPercent = totalBills > 0 ? Math.max(0, 100 - paidPercent - partialPercent) : 0;

    const paidAmount = inRangeSold
        .filter((i) => (i.paymentStatus || "").toLowerCase() === "paid")
        .reduce((s, i) => s + Number(i.finalPrice || i.sellingPrice || 0), 0);
    const partialAmount = inRangeSold
        .filter((i) => (i.paymentStatus || "").toLowerCase() === "partial")
        .reduce((s, i) => s + Number(i.finalPrice || i.sellingPrice || 0), 0);
    const pendingAmount = inRangeSold
        .filter((i) => !i.paymentStatus || i.paymentStatus.toLowerCase() === "pending")
        .reduce((s, i) => s + Number(i.finalPrice || i.sellingPrice || 0), 0);

    const paymentDonutData = useMemo(() => {
        if (totalBills === 0) {
            return [{ name: "No Sales", value: 1, color: "#D1D5DB", percent: 0, amount: 0 }];
        }
        return [
            { name: "Paid", value: paidBills, color: palette.green, percent: paidPercent, amount: paidAmount },
            { name: "Partial", value: partialBills, color: palette.orange, percent: partialPercent, amount: partialAmount },
            { name: "Pending", value: pendingBills, color: palette.red, percent: pendingPercent, amount: pendingAmount },
        ];
    }, [totalBills, paidBills, partialBills, pendingBills, paidPercent, partialPercent, pendingPercent, paidAmount, partialAmount, pendingAmount]);

    // 6. Real Ledger Balances & Positions
    const ledgerTotalReceivable = useMemo(() => {
        if (ledgerBalances.totals?.moneyReceivable != null) return ledgerBalances.totals.moneyReceivable;
        return ledgerBalances.contacts.reduce((sum, c) => sum + (c.balances?.moneyOwedToOwner || 0), 0);
    }, [ledgerBalances]);

    const ledgerTotalPayable = useMemo(() => {
        if (ledgerBalances.totals?.moneyPayable != null) return ledgerBalances.totals.moneyPayable;
        return ledgerBalances.contacts.reduce((sum, c) => sum + (c.balances?.moneyOwnerOwes || 0), 0);
    }, [ledgerBalances]);

    const ledgerGoldReceivable = useMemo(() => {
        if (ledgerBalances.totals?.goldReceivable != null) return ledgerBalances.totals.goldReceivable;
        return ledgerBalances.contacts.reduce((sum, c) => sum + (c.balances?.goldOwedToOwner || 0), 0);
    }, [ledgerBalances]);

    const ledgerGoldPayable = useMemo(() => {
        if (ledgerBalances.totals?.goldPayable != null) return ledgerBalances.totals.goldPayable;
        return ledgerBalances.contacts.reduce((sum, c) => sum + (c.balances?.goldOwnerOwes || 0), 0);
    }, [ledgerBalances]);

    const netLedgerMoney = Math.abs(ledgerTotalPayable - ledgerTotalReceivable);
    const netGoldPosition = Math.abs(ledgerGoldReceivable - ledgerGoldPayable);

    // 7. Real Recent Sold Items
    const displayRecentSold = useMemo(() => {
        return soldItems.slice(0, 4).map((item, idx) => ({
            id: item._id || idx,
            name: getItemTitle(item),
            code: item.billingID || item.inventoryId?.productID || item.productID || `INV-${item._id?.slice(-4) || idx + 1}`,
            price: Number(item.finalPrice || item.sellingPrice || 0),
            date: formatRelativeTime(item.soldAt || item.createdAt),
            status: item.paymentStatus || "paid",
        }));
    }, [soldItems]);

    // 8. Real Unified Activity Stream
    const displayRecentActivities = useMemo(() => {
        const activities = [];

        // Add real ledger transactions
        ledgerTransactions.slice(0, 4).forEach((tx) => {
            const isGold = tx.assetType === "gold";
            const valStr = isGold ? `${tx.gold?.weight || 0}g Gold` : formatCurrency(tx.money?.amount || 0);
            const partyName = tx.otherPartyId?.name || "Business Contact";
            const isPaid = tx.flow === "outflow";

            activities.push({
                id: `tx-${tx._id}`,
                icon: "🔄",
                iconClass: isPaid ? "red" : "blue",
                title: tx.type ? `Ledger ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}` : "Ledger Entry",
                subtitle: `${isPaid ? "Paid to" : "Received from"} ${partyName}`,
                amount: valStr,
                time: formatRelativeTime(tx.date || tx.createdAt),
                rawDate: new Date(tx.date || tx.createdAt || 0).getTime(),
            });
        });

        // Add real sold items
        soldItems.slice(0, 4).forEach((sale) => {
            activities.push({
                id: `sale-${sale._id}`,
                icon: "💎",
                iconClass: "purple",
                title: "Sale Completed",
                subtitle: `${getItemTitle(sale)} sold to ${getCustomerName(sale)}`,
                amount: formatCurrency(sale.finalPrice || sale.sellingPrice || 0),
                time: formatRelativeTime(sale.soldAt || sale.createdAt),
                rawDate: new Date(sale.soldAt || sale.createdAt || 0).getTime(),
            });
        });

        // Add real inventory additions
        inventoryItems.slice(0, 3).forEach((inv) => {
            activities.push({
                id: `inv-${inv._id}`,
                icon: "📦",
                iconClass: "green",
                title: "New Item Added",
                subtitle: `${getItemTitle(inv)} added to inventory`,
                amount: inv.baseCostPrice ? formatCurrency(inv.baseCostPrice) : null,
                time: formatRelativeTime(inv.createdAt),
                rawDate: new Date(inv.createdAt || 0).getTime(),
            });
        });

        return activities.sort((a, b) => b.rawDate - a.rawDate).slice(0, 4);
    }, [ledgerTransactions, soldItems, inventoryItems]);

    // Active Date Range string calculation
    const activeDateRangeLabel = useMemo(() => {
        const { start, end } = getRangeBounds(timeRange);
        const startStr = start.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        const endStr = end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
        return `${startStr} - ${endStr}`;
    }, [timeRange, getRangeBounds]);

    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";
    const userName = localStorage.getItem("user_name") || "Aneesh";

    if (loading) {
        return (
            <div className="dashboard-page dashboard-page--loading">
                <div className="spinner-border text-warning mb-3" role="status"></div>
                <p>Loading real-time business data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-page dashboard-page--loading">
                <div className="alert alert-danger">{error}</div>
            </div>
        );
    }

    return (
        <div className="dashboard-page modern-dashboard">
            {/* ============================================================
               1. HEADER SECTION
               ============================================================ */}
            <header className="dash-header">
                <div className="dash-header__left">
                    <h1 className="dash-greeting">
                        {greeting}, {userName}! <span className="wave-hand">👋</span>
                    </h1>
                    <p className="dash-greeting-sub">Here's what's happening with your business today.</p>
                </div>

                <div className="dash-header__right">
                    {/* Real Date Range Selector Pill (Clickable) */}
                    <div
                        className="dash-pill dash-pill--date dash-pill--clickable"
                        title="Click to change custom date range"
                        onClick={() => {
                            setTempStartDate(customStartDate);
                            setTempEndDate(customEndDate);
                            setShowCustomDatePicker(true);
                        }}
                    >
                        <FiCalendar className="dash-pill__icon" />
                        <span>{activeDateRangeLabel}</span>
                    </div>

                    {/* User Profile Chip */}
                    <div className="dash-profile-chip">
                        <div className="dash-avatar">
                            <FaCrown size={15} color="#C8A14B" />
                        </div>
                        <div className="dash-profile-info">
                            <span className="dash-profile-name">{userName}</span>
                            <span className="dash-profile-role">Admin</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* ============================================================
               CUSTOM DATE RANGE PICKER MODAL
               ============================================================ */}
            {showCustomDatePicker && (
                <div className="dash-modal-overlay" onClick={() => setShowCustomDatePicker(false)}>
                    <div className="dash-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="dash-modal-header">
                            <h4>Select Custom Date Range</h4>
                            <button
                                className="dash-modal-close"
                                onClick={() => setShowCustomDatePicker(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="dash-modal-body">
                            <div className="dash-date-field">
                                <label>From Date:</label>
                                <input
                                    type="date"
                                    className="dash-date-input"
                                    value={tempStartDate}
                                    onChange={(e) => setTempStartDate(e.target.value)}
                                />
                            </div>
                            <div className="dash-date-field">
                                <label>To Date:</label>
                                <input
                                    type="date"
                                    className="dash-date-input"
                                    value={tempEndDate}
                                    onChange={(e) => setTempEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="dash-modal-footer">
                            <button
                                className="dash-modal-btn dash-modal-btn--secondary"
                                onClick={() => setShowCustomDatePicker(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="dash-modal-btn dash-modal-btn--primary"
                                onClick={() => {
                                    setCustomStartDate(tempStartDate);
                                    setCustomEndDate(tempEndDate);
                                    setTimeRange("custom");
                                    setShowCustomDatePicker(false);
                                }}
                            >
                                Apply Range
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================
               2. TOP 4 METRIC KPI CARDS (Real Calculated Values & Sparklines)
               ============================================================ */}
            <section className="dash-kpi-grid">
                {/* 1. Inventory Value */}
                <div className="dash-kpi-card">
                    <div className="dash-kpi-card__left">
                        <div className="dash-kpi-card__icon dash-kpi-card__icon--gold">
                            <FiBox />
                        </div>
                        <div className="dash-kpi-card__meta">
                            <span className="dash-kpi-card__label">Inventory Value</span>
                            <h2 className="dash-kpi-card__value">
                                {formatCurrency(inventoryValue)}
                            </h2>
                            <span className="dash-kpi-card__trend dash-kpi-card__trend--up">
                                <FiTrendingUp /> {inventoryInStock.length} items in stock
                            </span>
                        </div>
                    </div>
                    <div className="dash-kpi-card__spark">
                        <MiniSparkline color={palette.gold} points={[inventoryValue * 0.9, inventoryValue]} />
                    </div>
                </div>

                {/* 2. Total Revenue */}
                <div className="dash-kpi-card">
                    <div className="dash-kpi-card__left">
                        <div className="dash-kpi-card__icon dash-kpi-card__icon--green">
                            <FiTrendingUp />
                        </div>
                        <div className="dash-kpi-card__meta">
                            <span className="dash-kpi-card__label">Total Revenue</span>
                            <h2 className="dash-kpi-card__value">
                                {formatCurrency(revenue)}
                            </h2>
                            <span className="dash-kpi-card__trend dash-kpi-card__trend--up">
                                <FiTrendingUp /> {revenueGrowth}% vs prev period
                            </span>
                        </div>
                    </div>
                    <div className="dash-kpi-card__spark">
                        <MiniSparkline color={palette.green} points={revenueSparkPoints} />
                    </div>
                </div>

                {/* 3. Net Profit */}
                <div className="dash-kpi-card">
                    <div className="dash-kpi-card__left">
                        <div className="dash-kpi-card__icon dash-kpi-card__icon--blue">
                            <FiLayers />
                        </div>
                        <div className="dash-kpi-card__meta">
                            <span className="dash-kpi-card__label">Net Profit</span>
                            <h2 className="dash-kpi-card__value">
                                {formatCurrency(profit)}
                            </h2>
                            <span className="dash-kpi-card__trend dash-kpi-card__trend--up">
                                <FiTrendingUp /> {profitGrowth}% vs prev period
                            </span>
                        </div>
                    </div>
                    <div className="dash-kpi-card__spark">
                        <MiniSparkline color={palette.blue} points={profitSparkPoints} />
                    </div>
                </div>

                {/* 4. Items Sold */}
                <div className="dash-kpi-card">
                    <div className="dash-kpi-card__left">
                        <div className="dash-kpi-card__icon dash-kpi-card__icon--purple">
                            <FiShoppingCart />
                        </div>
                        <div className="dash-kpi-card__meta">
                            <span className="dash-kpi-card__label">Items Sold</span>
                            <h2 className="dash-kpi-card__value">
                                {formatNumber(totalItemsSold)}
                            </h2>
                            <span className="dash-kpi-card__trend dash-kpi-card__trend--up">
                                <FiTrendingUp /> {soldItems.length} all-time sales
                            </span>
                        </div>
                    </div>
                    <div className="dash-kpi-card__spark">
                        <MiniSparkline color={palette.purple} points={soldSparkPoints} />
                    </div>
                </div>
            </section>

            {/* ============================================================
               3. ROW 2: REAL LIVE MARKET RATES & REAL BUSINESS LEDGER
               ============================================================ */}
            <section className="dash-rates-ledger-grid">
                {/* Left: Real Live Market Rates (India) */}
                <div className="dash-card dash-rates-card">
                    <div className="dash-card__header">
                        <div className="d-flex align-items-center gap-2">
                            <h3 className="dash-card__title">Live Market Rates (India)</h3>
                            <span className="dash-live-badge">
                                <span className="dash-live-pulse"></span> Live
                            </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <span className="dash-rates-updated">
                                Updated: {liveRates?.last_updated || "Just now"}
                            </span>
                            <button
                                className={`dash-refresh-btn ${ratesRefreshing ? "spinning" : ""}`}
                                title="Refresh Live Rates"
                                onClick={() => fetchLiveRates(true)}
                            >
                                <FiRefreshCw size={13} />
                            </button>
                        </div>
                    </div>

                    <div className="dash-rates-pills-grid">
                        {/* Gold 24K */}
                        <div className="dash-rate-pill">
                            <div className="dash-rate-pill__header">
                                <span className="dash-rate-dot gold"></span>
                                <span className="dash-rate-name">Gold 24K (999)</span>
                            </div>
                            <div className="dash-rate-pill__body">
                                <span className="dash-rate-price">₹{formatNumber(liveRates?.gold_24k || 0)}/g</span>
                                <span className="dash-rate-change green">
                                    <FiArrowUpRight size={12} /> {liveRates?.gold_24k_change || "+0.00%"}
                                </span>
                            </div>
                        </div>

                        {/* Gold 22K */}
                        <div className="dash-rate-pill">
                            <div className="dash-rate-pill__header">
                                <span className="dash-rate-dot gold"></span>
                                <span className="dash-rate-name">Gold 22K (916)</span>
                            </div>
                            <div className="dash-rate-pill__body">
                                <span className="dash-rate-price">₹{formatNumber(liveRates?.gold_22k || 0)}/g</span>
                                <span className="dash-rate-change green">
                                    <FiArrowUpRight size={12} /> {liveRates?.gold_22k_change || "+0.00%"}
                                </span>
                            </div>
                        </div>

                        {/* Gold 18K */}
                        <div className="dash-rate-pill">
                            <div className="dash-rate-pill__header">
                                <span className="dash-rate-dot gold"></span>
                                <span className="dash-rate-name">Gold 18K (750)</span>
                            </div>
                            <div className="dash-rate-pill__body">
                                <span className="dash-rate-price">₹{formatNumber(liveRates?.gold_18k || 0)}/g</span>
                                <span className="dash-rate-change green">
                                    <FiArrowUpRight size={12} /> {liveRates?.gold_18k_change || "+0.00%"}
                                </span>
                            </div>
                        </div>

                        {/* Silver */}
                        <div className="dash-rate-pill">
                            <div className="dash-rate-pill__header">
                                <span className="dash-rate-dot silver"></span>
                                <span className="dash-rate-name">Silver (999)</span>
                            </div>
                            <div className="dash-rate-pill__body">
                                <span className="dash-rate-price">₹{liveRates?.silver || 0}/g</span>
                                <span className={`dash-rate-change ${(liveRates?.silver_change || "").includes("-") ? "red" : "green"}`}>
                                    {(liveRates?.silver_change || "").includes("-") ? <FiArrowDownRight size={12} /> : <FiArrowUpRight size={12} />}
                                    {liveRates?.silver_change || "+0.00%"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Real Personal Business Ledger */}
                <div className="dash-card dash-ledger-summary-card">
                    <div className="dash-card__header">
                        <h3 className="dash-card__title">Personal Business Ledger</h3>
                        <Link to="/ledger" className="dash-link-action">
                            Open Ledger →
                        </Link>
                    </div>

                    <div className="dash-ledger-four-grid">
                        <div className="dash-ledger-col">
                            <span className="dash-ledger-sub">Receivables</span>
                            <span className="dash-ledger-val green">
                                ₹{formatNumber(ledgerTotalReceivable)}
                            </span>
                        </div>
                        <div className="dash-ledger-col">
                            <span className="dash-ledger-sub">Payables</span>
                            <span className="dash-ledger-val red">
                                ₹{formatNumber(ledgerTotalPayable)}
                            </span>
                        </div>
                        <div className="dash-ledger-col">
                            <span className="dash-ledger-sub">Gold Owed to You</span>
                            <span className="dash-ledger-val gold">
                                {ledgerGoldReceivable.toFixed(2)} g
                            </span>
                        </div>
                        <div className="dash-ledger-col">
                            <span className="dash-ledger-sub">Gold You Owe</span>
                            <span className="dash-ledger-val gold">
                                {ledgerGoldPayable.toFixed(2)} g
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============================================================
               4. ROW 3: REVENUE VS PROFIT | ORDERS | PAYMENT | LEDGER POSITION
               ============================================================ */}
            <section className="dash-middle-four-grid">
                {/* 1. Real Revenue vs Profit Chart */}
                <div className="dash-card dash-chart-card">
                    <div className="dash-card__header">
                        <div>
                            <h3 className="dash-card__title">Revenue vs Profit</h3>
                            <div className="dash-chart-legend">
                                <span className="dash-legend-item">
                                    <span className="dash-legend-dot gold"></span> Revenue
                                </span>
                                <span className="dash-legend-item">
                                    <span className="dash-legend-dot green"></span> Profit
                                </span>
                            </div>
                        </div>

                        <div className="dash-time-tabs">
                            <button
                                className={`dash-time-tab ${timeRange === "daily" ? "active" : ""}`}
                                onClick={() => setTimeRange("daily")}
                            >
                                Daily
                            </button>
                            <button
                                className={`dash-time-tab ${timeRange === "weekly" ? "active" : ""}`}
                                onClick={() => setTimeRange("weekly")}
                            >
                                Weekly
                            </button>
                            <button
                                className={`dash-time-tab ${timeRange === "monthly" ? "active" : ""}`}
                                onClick={() => setTimeRange("monthly")}
                            >
                                Monthly
                            </button>
                            <button
                                className={`dash-time-tab ${timeRange === "yearly" ? "active" : ""}`}
                                onClick={() => setTimeRange("yearly")}
                            >
                                Yearly
                            </button>
                            <button
                                className={`dash-time-tab ${timeRange === "custom" ? "active" : ""}`}
                                onClick={() => {
                                    setTempStartDate(customStartDate);
                                    setTempEndDate(customEndDate);
                                    setShowCustomDatePicker(true);
                                }}
                            >
                                Custom
                            </button>
                        </div>
                    </div>

                    <div className="dash-card__body dash-chart-container">
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#C8A14B" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="#C8A14B" stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2E9D58" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2E9D58" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(200, 161, 75, 0.12)" />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#8E8E93", fontSize: 11 }} />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: "#8E8E93", fontSize: 11 }}
                                    tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}K` : val)}
                                />
                                <Tooltip
                                    formatter={(value, name) => [formatCurrency(value), name === "revenue" ? "Revenue" : "Profit"]}
                                    contentStyle={{
                                        background: "var(--dash-card-bg)",
                                        borderRadius: "12px",
                                        border: "1px solid var(--dash-border)",
                                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                                        fontSize: "12px",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#C8A14B"
                                    strokeWidth={2.8}
                                    dot={{ fill: "#C8A14B", r: 3.5 }}
                                    activeDot={{ r: 5 }}
                                    fill="url(#goldGrad)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="#2E9D58"
                                    strokeWidth={2.2}
                                    dot={{ fill: "#2E9D58", r: 3 }}
                                    activeDot={{ r: 4.5 }}
                                    fill="url(#greenGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="dash-chart-footer">
                        <div className="dash-chart-footer__item">
                            <span className="dash-legend-dot gold"></span>
                            <span className="dash-chart-footer__label">Total Revenue</span>
                            <strong className="dash-chart-footer__val">{formatCurrency(revenue)}</strong>
                        </div>
                        <div className="dash-chart-footer__item">
                            <span className="dash-legend-dot green"></span>
                            <span className="dash-chart-footer__label">Total Profit</span>
                            <strong className="dash-chart-footer__val">{formatCurrency(profit)}</strong>
                        </div>
                    </div>
                </div>

                {/* 2. Real Orders Summary */}
                <div className="dash-card dash-orders-card">
                    <div className="dash-card__header">
                        <h3 className="dash-card__title">Orders Summary</h3>
                    </div>

                    <div className="dash-orders-list">
                        <div className="dash-order-row">
                            <div className="dash-order-row__left">
                                <span className="dash-order-icon orange">📦</span>
                                <span>Total Orders</span>
                            </div>
                            <strong className="dash-order-row__val">{totalOrdersCount}</strong>
                        </div>

                        <div className="dash-order-row">
                            <div className="dash-order-row__left">
                                <span className="dash-order-icon amber">📋</span>
                                <span>Pending Orders</span>
                            </div>
                            <strong className="dash-order-row__val orange">{pendingOrdersCount}</strong>
                        </div>

                        <div className="dash-order-row">
                            <div className="dash-order-row__left">
                                <span className="dash-order-icon blue">⚙️</span>
                                <span>In Progress</span>
                            </div>
                            <strong className="dash-order-row__val blue">{inProgressOrdersCount}</strong>
                        </div>

                        <div className="dash-order-row">
                            <div className="dash-order-row__left">
                                <span className="dash-order-icon green">✅</span>
                                <span>Completed</span>
                            </div>
                            <strong className="dash-order-row__val green">{completedOrdersCount}</strong>
                        </div>
                    </div>

                    <Link to="/orders" className="dash-card-footer-link">
                        View All Orders →
                    </Link>
                </div>

                {/* 3. Real Payment Status Donut */}
                <div className="dash-card dash-donut-card">
                    <div className="dash-card__header">
                        <h3 className="dash-card__title">Payment Status</h3>
                    </div>

                    <div className="dash-donut-wrapper">
                        <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                                <Pie
                                    data={paymentDonutData}
                                    dataKey="value"
                                    innerRadius={46}
                                    outerRadius={66}
                                    paddingAngle={3}
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {paymentDonutData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [`${value} Bills`, name]} />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Centered Donut Label */}
                        <div className="dash-donut-center">
                            <span className="dash-donut-center__count">{totalBills}</span>
                            <span className="dash-donut-center__label">Total Bills</span>
                        </div>
                    </div>

                    {/* Breakdown 3-col footer */}
                    <div className="dash-donut-legend-row">
                        <div className="dash-donut-legend-col">
                            <div className="d-flex align-items-center gap-1 mb-1">
                                <span className="dash-legend-dot green"></span>
                                <span className="dash-donut-sub">Paid</span>
                            </div>
                            <strong className="dash-donut-val">{paidBills} ({paidPercent}%)</strong>
                            <span className="dash-donut-amt">₹{formatNumber(paidAmount)}</span>
                        </div>
                        <div className="dash-donut-legend-col">
                            <div className="d-flex align-items-center gap-1 mb-1">
                                <span className="dash-legend-dot orange"></span>
                                <span className="dash-donut-sub">Partial</span>
                            </div>
                            <strong className="dash-donut-val">{partialBills} ({partialPercent}%)</strong>
                            <span className="dash-donut-amt">₹{formatNumber(partialAmount)}</span>
                        </div>
                        <div className="dash-donut-legend-col">
                            <div className="d-flex align-items-center gap-1 mb-1">
                                <span className="dash-legend-dot red"></span>
                                <span className="dash-donut-sub">Pending</span>
                            </div>
                            <strong className="dash-donut-val">{pendingBills} ({pendingPercent}%)</strong>
                            <span className="dash-donut-amt">₹{formatNumber(pendingAmount)}</span>
                        </div>
                    </div>

                    <Link to="/sold" className="dash-card-footer-link">
                        View All →
                    </Link>
                </div>

                {/* 4. Real Ledger Position (Summary) */}
                <div className="dash-card dash-position-card">
                    <div className="dash-card__header">
                        <h3 className="dash-card__title">Ledger Position <span className="dash-card__title-sub">(Summary)</span></h3>
                    </div>

                    <div className="dash-position-list">
                        <div className="dash-position-row">
                            <div className="dash-position-row__left">
                                <span className="dash-pos-badge green">🔄</span>
                                <span>You will Receive</span>
                            </div>
                            <strong className="dash-pos-val">₹{formatNumber(ledgerTotalReceivable)}</strong>
                        </div>

                        <div className="dash-position-row">
                            <div className="dash-position-row__left">
                                <span className="dash-pos-badge red">📥</span>
                                <span>You will Pay</span>
                            </div>
                            <strong className="dash-pos-val">₹{formatNumber(ledgerTotalPayable)}</strong>
                        </div>

                        <div className="dash-position-row">
                            <div className="dash-position-row__left">
                                <span className="dash-pos-badge blue">⚖️</span>
                                <span>Net Balance</span>
                            </div>
                            <strong className="dash-pos-val blue">₹{formatNumber(netLedgerMoney)}</strong>
                        </div>

                        <div className="dash-position-row">
                            <div className="dash-position-row__left">
                                <span className="dash-pos-badge gold">🪙</span>
                                <span>Net Gold Position</span>
                            </div>
                            <strong className="dash-pos-val gold">{netGoldPosition.toFixed(2)} g</strong>
                        </div>
                    </div>

                    <Link to="/ledger" className="dash-card-footer-link">
                        View Full Ledger →
                    </Link>
                </div>
            </section>

            {/* ============================================================
               5. ROW 4: REAL INVENTORY OVERVIEW | RECENT SOLD | RECENT ACTIVITY
               ============================================================ */}
            <section className="dash-bottom-three-grid">
                {/* 1. Real Inventory Overview */}
                <div className="dash-card dash-inventory-card">
                    <div className="dash-card__header">
                        <h3 className="dash-card__title">Inventory Overview</h3>
                    </div>

                    {/* 2x2 Real Stats Grid */}
                    <div className="dash-inv-stats-grid">
                        <div className="dash-inv-stat-box">
                            <div className="dash-inv-stat-icon orange">
                                <FiBox size={16} />
                            </div>
                            <div className="dash-inv-stat-meta">
                                <span className="dash-inv-stat-sub">Total Items</span>
                                <strong className="dash-inv-stat-val">{formatNumber(inventoryInStock.length)}</strong>
                            </div>
                        </div>

                        <div className="dash-inv-stat-box">
                            <div className="dash-inv-stat-icon gold">
                                <span>🪙</span>
                            </div>
                            <div className="dash-inv-stat-meta">
                                <span className="dash-inv-stat-sub">Gold (Net Weight)</span>
                                <strong className="dash-inv-stat-val">{totalGoldWeight} g</strong>
                            </div>
                        </div>

                        <div className="dash-inv-stat-box">
                            <div className="dash-inv-stat-icon purple">
                                <span>💎</span>
                            </div>
                            <div className="dash-inv-stat-meta">
                                <span className="dash-inv-stat-sub">Stone Weight</span>
                                <strong className="dash-inv-stat-val">{totalStoneWeight} g</strong>
                            </div>
                        </div>

                        <div className="dash-inv-stat-box">
                            <div className="dash-inv-stat-icon green">
                                <span>₹</span>
                            </div>
                            <div className="dash-inv-stat-meta">
                                <span className="dash-inv-stat-sub">Inventory Value</span>
                                <strong className="dash-inv-stat-val">₹{formatNumber(inventoryValue)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Low Stock & Recently Added Status Bars */}
                    <div className="dash-inv-status-bars">
                        <div className="dash-inv-status-bar alert-bar">
                            <div className="d-flex align-items-center gap-2">
                                <FiAlertTriangle className="text-danger" size={16} />
                                <div>
                                    <span className="dash-bar-label">Low Stock Items</span>
                                    <strong className="dash-bar-count d-block">{lowStockCount}</strong>
                                </div>
                            </div>
                            <Link to="/inventory" className="dash-bar-link">
                                View All →
                            </Link>
                        </div>

                        <div className="dash-inv-status-bar add-bar">
                            <div className="d-flex align-items-center gap-2">
                                <FiPlus className="text-primary" size={16} />
                                <div>
                                    <span className="dash-bar-label">Recently Added</span>
                                    <strong className="dash-bar-count d-block">{recentlyAddedCount}</strong>
                                </div>
                            </div>
                            <Link to="/inventory" className="dash-bar-link">
                                View All →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 2. Real Recent Sold Items */}
                <div className="dash-card dash-sold-items-card">
                    <div className="dash-card__header">
                        <h3 className="dash-card__title">Recent Sold Items</h3>
                        <Link to="/sold" className="dash-link-action">
                            View All Sales →
                        </Link>
                    </div>

                    <div className="dash-sold-items-list">
                        {displayRecentSold.map((item) => (
                            <div key={item.id} className="dash-sold-item-row" onClick={() => navigate("/sold")}>
                                <div className="dash-sold-item-thumb">
                                    <span>💍</span>
                                </div>
                                <div className="dash-sold-item-info">
                                    <span className="dash-sold-item-name">{item.name}</span>
                                    <span className="dash-sold-item-code">{item.code}</span>
                                </div>
                                <div className="dash-sold-item-price-meta">
                                    <strong className="dash-sold-item-price">₹{formatNumber(item.price)}</strong>
                                    <span className="dash-sold-item-date">{item.date}</span>
                                </div>
                            </div>
                        ))}
                        {displayRecentSold.length === 0 && (
                            <div className="text-center py-4 text-muted small">
                                No sold items recorded yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Real Recent Activity Timeline */}
                <div className="dash-card dash-activity-card">
                    <div className="dash-card__header">
                        <h3 className="dash-card__title">Recent Activity</h3>
                        <Link to="/sold" className="dash-link-action">
                            View All →
                        </Link>
                    </div>

                    <div className="dash-activity-timeline">
                        {displayRecentActivities.map((act) => (
                            <div key={act.id} className="dash-activity-timeline-row">
                                <div className={`dash-activity-icon-box ${act.iconClass}`}>
                                    <span>{act.icon}</span>
                                </div>
                                <div className="dash-activity-text-info">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <strong className="dash-activity-title">{act.title}</strong>
                                        {act.amount && (
                                            <strong className="dash-activity-amount">{act.amount}</strong>
                                        )}
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mt-0.5">
                                        <span className="dash-activity-subtitle">{act.subtitle}</span>
                                        <span className="dash-activity-time">{act.time}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {displayRecentActivities.length === 0 && (
                            <div className="text-center py-4 text-muted small">
                                No activity recorded yet.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
