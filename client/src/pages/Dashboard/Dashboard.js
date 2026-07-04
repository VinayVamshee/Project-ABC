import React, { useEffect, useMemo, useState, useCallback } from "react";
import api from "../../api/axios";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";
import { FiBox, FiTrendingUp, FiDollarSign, FiLayers } from "react-icons/fi";
import "./Dashboard.css";

const palette = {
    gold: "#C8A14B",
    green: "#2E9D58",
    red: "#D64B4B",
    blue: "#2D73FF",
    orange: "#F59E0B",
    purple: "#7B61FF",
    background: "#faf8f4",
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

function KpiCard({ icon, title, value, change, tone, formatType = "currency" }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let frame;
        let startTime;
        const duration = 900;
        const from = 0;
        const to = Number(value || 0);

        const animate = (ts) => {
            if (!startTime) startTime = ts;
            const progress = Math.min((ts - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayValue(from + (to - from) * eased);

            if (progress < 1) {
                frame = requestAnimationFrame(animate);
            }
        };

        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [value]);

    const renderValue = () => {
        if (formatType === "percent") {
            return `${displayValue.toFixed(1)}%`;
        }
        if (formatType === "number") {
            return formatNumber(displayValue);
        }
        return formatCurrency(displayValue);
    };

    return (
        <div className={`kpi-card kpi-card--${tone}`}>
            <div className="kpi-card__icon">{icon}</div>
            <div className="kpi-card__body">
                <p className="kpi-card__title">{title}</p>
                <h3 className="kpi-card__value">{renderValue()}</h3>
                <p className="kpi-card__change">{change}</p>
            </div>
        </div>
    );
}

function ChartCard({ title, subtitle, children, className = "" }) {
    return (
        <div className={`chart-card ${className}`.trim()}>
            <div className="chart-card__header">
                <div>
                    <h4>{title}</h4>
                    <p>{subtitle}</p>
                </div>
            </div>
            <div className="chart-card__body">{children}</div>
        </div>
    );
}

function SummaryPanel({ metrics }) {
    return (
        <div className="summary-panel">
            <div className="summary-panel__header">
                <h4>Business Summary</h4>
                <p>Snapshot of operational performance</p>
            </div>
            <div className="summary-panel__grid">
                {metrics.map((item) => (
                    <div key={item.label} className="summary-panel__item">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RecentActivityPanel({ activities }) {
    return (
        <div className="recent-panel">
            <div className="recent-panel__header">
                <h4>Recent Activity</h4>
                <p>Latest movements</p>
            </div>
            <div className="recent-panel__list">
                {activities.map((activity, index) => (
                    <div key={`${activity.title}-${index}`} className="recent-item">
                        <div className="recent-item__dot" />
                        <div className="recent-item__content">
                            <strong>{activity.title}</strong>
                            <p>{activity.detail}</p>
                        </div>
                        <span className="recent-item__time">{activity.time}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TopSellingPanel({ items }) {
    return (
        <div className="top-selling-panel">
            <div className="top-selling-panel__header">
                <h4>Top Selling Products</h4>
                <p>Best revenue contribution</p>
            </div>
            <div className="top-selling-panel__rows">
                {items.map((item) => (
                    <div key={item.label} className="top-selling-row">
                        <span>{item.label}</span>
                        <strong>{formatCurrency(item.value)}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PaymentDonut({ data }) {
    return (
        <div className="mini-donut-card">
            <div className="mini-donut-card__chart">
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                        <Pie data={data} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={2}>
                            <Cell fill={palette.green} />
                            <Cell fill={palette.orange} />
                            <Cell fill={palette.red} />
                        </Pie>
                        <Tooltip formatter={(value) => `${value} Bills`} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="mini-donut-card__legend">
                {data.map((item) => (
                    <div key={item.name} className="legend-item">
                        <span className="legend-dot" style={{ background: item.color }} />
                        <span>{item.name}</span>
                        <strong>{item.value}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}

function RevenueChart({ data }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={palette.blue} stopOpacity={0.45} />
                        <stop offset="95%" stopColor={palette.blue} stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={palette.green} stopOpacity={0.38} />
                        <stop offset="95%" stopColor={palette.green} stopOpacity={0.04} />
                    </linearGradient>
                </defs>
                <CartesianGrid stroke="#eee" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke={palette.blue} fill="url(#revenueGradient)" />
                <Area type="monotone" dataKey="profit" stroke={palette.green} fill="url(#profitGradient)" />
            </AreaChart>
        </ResponsiveContainer>
    );
}

function InventoryDonut({ data }) {
    return (
        <div className="mini-donut-card mini-donut-card--inventory">
            <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                    <Pie data={data} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={2}>
                        <Cell fill={palette.purple} />
                        <Cell fill={palette.gold} />
                    </Pie>
                    <Tooltip formatter={(value) => `${value} Items`} />
                </PieChart>
            </ResponsiveContainer>
            <div className="mini-donut-card__legend">
                {data.map((item) => (
                    <div key={item.name} className="legend-item">
                        <span className="legend-dot" style={{ background: item.color }} />
                        <span>{item.name}</span>
                        <strong>{item.value}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SalesBarChart({ data }) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <CartesianGrid stroke="#f0ece4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="sales" radius={[8, 8, 0, 0]} fill={palette.gold} />
            </BarChart>
        </ResponsiveContainer>
    );
}

function Dashboard() {
    const [inventoryItems, setInventoryItems] = useState([]);
    const [soldItems, setSoldItems] = useState([]);
    const [timeRange, setTimeRange] = useState("weekly");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [inventoryRes, soldRes] = await Promise.all([api.get("/inventory"), api.get("/sold")]);
                setInventoryItems(inventoryRes.data.items || inventoryRes.data.data || []);
                setSoldItems(soldRes.data.items || soldRes.data.data || []);
            } catch (err) {
                console.error("Dashboard data error", err);
                setError("Unable to load dashboard data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getRangeBounds = useCallback((range) => {
        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const start = new Date(end);

        switch (range) {
            case "today":
                start.setHours(0, 0, 0, 0);
                return { start, end };
            case "yesterday": {
                start.setDate(end.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(end.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                return { start, end };
            }
            case "weekly":
                start.setDate(end.getDate() - 6);
                start.setHours(0, 0, 0, 0);
                return { start, end };
            case "monthly":
                start.setMonth(end.getMonth() - 1);
                start.setHours(0, 0, 0, 0);
                return { start, end };
            case "quarterly":
                start.setMonth(end.getMonth() - 3);
                start.setHours(0, 0, 0, 0);
                return { start, end };
            case "yearly":
                start.setFullYear(end.getFullYear() - 1);
                start.setHours(0, 0, 0, 0);
                return { start, end };
            default:
                start.setDate(end.getDate() - 6);
                start.setHours(0, 0, 0, 0);
                return { start, end };
        }
    }, []);

    const getPreviousRangeBounds = useCallback((range) => {
        const { start, end } = getRangeBounds(range);
        const span = end - start;
        const previousEnd = new Date(start);
        previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);
        const previousStart = new Date(previousEnd.getTime() - span);

        return {
            start: previousStart,
            end: previousEnd,
        };
    }, [getRangeBounds]);

    const isInRange = useCallback((value, range) => {
        const { start, end } = getRangeBounds(range);
        const date = new Date(value);
        return date >= start && date <= end;
    }, [getRangeBounds]);

    const inRangeSold = useMemo(() => soldItems.filter((item) => isInRange(item.soldAt || item.createdAt, timeRange)), [soldItems, timeRange, isInRange]);

    const previousRangeSold = useMemo(() => {
        const { start, end } = getPreviousRangeBounds(timeRange);
        return soldItems.filter((item) => {
            const date = new Date(item.soldAt || item.createdAt);
            return date >= start && date <= end;
        });
    }, [soldItems, timeRange, getPreviousRangeBounds]);

    const inventoryInStock = inventoryItems.filter((item) => item.inStock !== false);
    const inventorySoldOut = inventoryItems.filter((item) => item.inStock === false);

    const revenue = inRangeSold.reduce((sum, item) => sum + Number(item.finalPrice || item.sellingPrice || 0), 0);
    const profit = inRangeSold.reduce((sum, item) => sum + Number(item.profit || 0), 0);
    const inventoryValue = inventoryInStock.reduce((sum, item) => sum + Number(item.baseCostPrice || 0), 0);
    const inventoryCost = inRangeSold.reduce((sum, item) => sum + Number(item.inventoryPrice || 0), 0);
    const amountReceived = inRangeSold.reduce((sum, item) => sum + (item.payments || []).reduce((total, payment) => total + Number(payment.amount || 0), 0), 0);
    const pendingAmount = Math.max(revenue - amountReceived, 0);
    const collectionPercent = revenue > 0 ? (amountReceived / revenue) * 100 : 0;
    const discountGiven = inRangeSold.reduce((sum, item) => sum + Number(item.discount || 0), 0);
    const billsGenerated = inRangeSold.length;
    const paidBills = inRangeSold.filter((item) => item.paymentStatus === "paid").length;
    const partialBills = inRangeSold.filter((item) => item.paymentStatus === "partial").length;
    const pendingBills = inRangeSold.filter((item) => item.paymentStatus === "pending").length;
    const averageSale = billsGenerated > 0 ? revenue / billsGenerated : 0;
    const averageProfit = billsGenerated > 0 ? profit / billsGenerated : 0;

    const previousRevenue = previousRangeSold.reduce((sum, item) => sum + Number(item.finalPrice || item.sellingPrice || 0), 0);
    const previousProfit = previousRangeSold.reduce((sum, item) => sum + Number(item.profit || 0), 0);

    const buildTimeline = () => {
        const buckets = [];
        const { start, end } = getRangeBounds(timeRange);
        const stepDays = timeRange === "today" || timeRange === "yesterday" ? 1 : timeRange === "weekly" ? 1 : timeRange === "monthly" ? 7 : timeRange === "quarterly" ? 30 : 30;
        const cursor = new Date(start);

        while (cursor <= end) {
            const label = (() => {
                if (timeRange === "yearly") {
                    return cursor.toLocaleString("en-IN", { month: "short" });
                }
                if (timeRange === "quarterly") {
                    return cursor.toLocaleString("en-IN", { month: "short" });
                }
                return cursor.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            })();

            const bucketStart = new Date(cursor);
            const bucketEnd = new Date(cursor);
            bucketEnd.setDate(bucketEnd.getDate() + (timeRange === "weekly" ? 1 : timeRange === "monthly" ? 7 : timeRange === "quarterly" ? 30 : 30));

            const bucketItems = inRangeSold.filter((item) => {
                const d = new Date(item.soldAt || item.createdAt);
                return d >= bucketStart && d < bucketEnd;
            });

            buckets.push({
                label,
                revenue: bucketItems.reduce((sum, item) => sum + Number(item.finalPrice || item.sellingPrice || 0), 0),
                profit: bucketItems.reduce((sum, item) => sum + Number(item.profit || 0), 0),
                sales: bucketItems.length,
                cost: bucketItems.reduce((sum, item) => sum + Number(item.inventoryPrice || 0), 0),
            });

            cursor.setDate(cursor.getDate() + stepDays);
        }

        if (buckets.length === 0) {
            buckets.push({ label: "No sales", revenue: 0, profit: 0, sales: 0, cost: 0 });
        }

        return buckets;
    };
    const timelineData = useMemo(buildTimeline, [
        inRangeSold,
        timeRange,
        getRangeBounds,
    ]);
    const paymentStatusData = [
        { name: "Paid", value: paidBills, color: palette.green },
        { name: "Partial", value: partialBills, color: palette.orange },
        { name: "Pending", value: pendingBills, color: palette.red },
    ];

    const inventoryStatusData = [
        { name: "Available", value: inventoryInStock.length, color: palette.purple },
        { name: "Sold", value: inventorySoldOut.length, color: palette.gold },
    ];

    const summaryMetrics = [
        { label: "Inventory Items", value: formatNumber(inventoryInStock.length) },
        { label: "Items Sold", value: formatNumber(billsGenerated) },
        { label: "Inventory Value", value: formatCurrency(inventoryValue) },
        { label: "Revenue", value: formatCurrency(revenue) },
        { label: "Cost", value: formatCurrency(inventoryCost) },
        { label: "Profit", value: formatCurrency(profit) },
        { label: "Discount Given", value: formatCurrency(discountGiven) },
        { label: "Bills Generated", value: formatNumber(billsGenerated) },
        { label: "Paid Bills", value: formatNumber(paidBills) },
        { label: "Partial Bills", value: formatNumber(partialBills) },
        { label: "Pending Bills", value: formatNumber(pendingBills) },
        { label: "Amount Received", value: formatCurrency(amountReceived) },
        { label: "Amount Pending", value: formatCurrency(pendingAmount) },
        { label: "Collection %", value: `${collectionPercent.toFixed(1)}%` },
        { label: "Average Bill Value", value: formatCurrency(averageSale) },
        { label: "Average Profit", value: formatCurrency(averageProfit) },
    ];

    const recentActivities = useMemo(() => {
        const activities = [];

        [...inRangeSold]
            .sort((a, b) => new Date(b.soldAt || b.createdAt) - new Date(a.soldAt || a.createdAt))
            .slice(0, 8)
            .forEach((item) => {
                activities.push({
                    title: `Sold ${item.productID || item.billingID}`,
                    detail: `Received ${formatCurrency(Number(item.finalPrice || item.sellingPrice || 0))}`,
                    time: new Date(item.soldAt || item.createdAt).toLocaleDateString("en-IN"),
                });
            });

        inventoryItems
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 4)
            .forEach((item) => {
                activities.push({
                    title: `New Inventory Added`,
                    detail: `${item.productID || "Inventory item"} • ${formatCurrency(Number(item.baseCostPrice || 0))}`,
                    time: new Date(item.createdAt).toLocaleDateString("en-IN"),
                });
            });

        return activities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
    }, [inRangeSold, inventoryItems]);

    const topSelling = useMemo(() => {
        const grouped = {};
        inRangeSold.forEach((item) => {
            const key = item.productID || item.billingID;
            grouped[key] = (grouped[key] || 0) + Number(item.finalPrice || item.sellingPrice || 0);
        });

        return Object.entries(grouped)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([label, value]) => ({ label, value }));
    }, [inRangeSold]);

    const highestProfitSales = useMemo(() => {
        return [...inRangeSold]
            .sort((a, b) => Number(b.profit || 0) - Number(a.profit || 0))
            .slice(0, 3)
            .map((item) => ({ label: item.productID || item.billingID, value: Number(item.profit || 0) }));
    }, [inRangeSold]);

    const lowestProfitSales = useMemo(() => {
        return [...inRangeSold]
            .sort((a, b) => Number(a.profit || 0) - Number(b.profit || 0))
            .slice(0, 3)
            .map((item) => ({ label: item.productID || item.billingID, value: Number(item.profit || 0) }));
    }, [inRangeSold]);

    if (loading) {
        return <div className="dashboard-page dashboard-page--loading">Loading dashboard…</div>;
    }

    if (error) {
        return <div className="dashboard-page dashboard-page--loading">{error}</div>;
    }

    const rangeLabel = {
        today: "Today",
        yesterday: "Yesterday",
        weekly: "Weekly",
        monthly: "Monthly",
        quarterly: "Quarterly",
        yearly: "Yearly",
    }[timeRange];

    return (
        <div className="dashboard-page">
            <header className="dashboard-topbar">
                <div>
                    <p className="dashboard-eyebrow">Business Dashboard</p>
                    <h1>Luxury Jewellery Analytics</h1>
                    <p className="dashboard-subtitle">Real-time insights across inventory, sales, revenue, payments and profitability.</p>
                </div>
                <div className="dashboard-topbar__actions">
                    <label className="range-select" htmlFor="time-range">
                        <span>Time Range</span>
                        <select id="time-range" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </label>
                </div>
            </header>

            <section className="kpi-grid">
                <KpiCard icon={<FiBox />} title="Inventory In Stock" value={inventoryInStock.length} change={`+${Math.max(0, inventoryInStock.length - Math.max(1, previousRangeSold.length))} vs ${rangeLabel}`} tone="purple" formatType="number" />
                <KpiCard icon={<FiDollarSign />} title="Inventory Value" value={inventoryValue} change={`+${formatCurrency(Math.max(0, inventoryValue - previousRevenue))}`} tone="gold" />
                <KpiCard icon={<FiTrendingUp />} title="Revenue" value={revenue} change={`+${((revenue - previousRevenue) / Math.max(previousRevenue, 1) * 100).toFixed(1)}%`} tone="blue" />
                <KpiCard icon={<FiLayers />} title="Net Profit" value={profit} change={`+${((profit - previousProfit) / Math.max(previousProfit, 1) * 100).toFixed(1)}%`} tone="green" />
            </section>

            <section className="dashboard-grid">
                <ChartCard title="Revenue vs Profit" subtitle="Performance across the selected range" className="chart-card--wide">
                    <RevenueChart data={timelineData} />
                </ChartCard>

                <ChartCard title="Payment Status" subtitle="Bills by payment state" className="chart-card--compact">
                    <PaymentDonut data={paymentStatusData} />
                    <div className="chart-card__stat-row">
                        <div><span>Paid Bills</span><strong>{paidBills}</strong></div>
                        <div><span>Partial Bills</span><strong>{partialBills}</strong></div>
                        <div><span>Pending Bills</span><strong>{pendingBills}</strong></div>
                    </div>
                </ChartCard>
            </section>

            <section className="dashboard-grid dashboard-grid--second">
                <ChartCard title="Inventory Status" subtitle="Available and sold stock" className="chart-card--compact">
                    <InventoryDonut data={inventoryStatusData} />
                </ChartCard>

                <ChartCard title="Sales Trend" subtitle="Sales count over the selected period" className="chart-card--middle">
                    <SalesBarChart data={timelineData} />
                </ChartCard>

                <ChartCard title="Revenue vs Cost" subtitle="Cost and margin visibility" className="chart-card--compact">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timelineData}>
                            <CartesianGrid stroke="#f0ece4" vertical={false} />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} />
                            <YAxis tickLine={false} axisLine={false} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="cost" stackId="a" fill={palette.gold} radius={[8, 8, 0, 0]} />
                            <Bar dataKey="revenue" stackId="a" fill={palette.blue} radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </section>

            <section className="dashboard-grid dashboard-grid--bottom">
                <SummaryPanel metrics={summaryMetrics} />
                <RecentActivityPanel activities={recentActivities} />
            </section>

            <section className="bottom-strip">
                <TopSellingPanel items={topSelling} />
                <div className="bottom-strip__panel bottom-strip__panel--profit">
                    <div className="bottom-strip__header">
                        <h4>Highest Profit Sales</h4>
                        <p>Best margin contributors</p>
                    </div>
                    <div className="bottom-strip__rows">
                        {highestProfitSales.map((item) => (
                            <div key={item.label} className="bottom-strip__row">
                                <span>{item.label}</span>
                                <strong>{formatCurrency(item.value)}</strong>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bottom-strip__panel bottom-strip__panel--loss">
                    <div className="bottom-strip__header">
                        <h4>Lowest Profit Sales</h4>
                        <p>Watch-list items</p>
                    </div>
                    <div className="bottom-strip__rows">
                        {lowestProfitSales.map((item) => (
                            <div key={item.label} className="bottom-strip__row">
                                <span>{item.label}</span>
                                <strong>{formatCurrency(item.value)}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}



export default Dashboard;
