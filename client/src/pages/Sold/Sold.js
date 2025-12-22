import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import OverviewPanel from "../Overview/OverviewPanel";
import TopPanel from "../TopPanel/TopPanel";
import "./Sold.css";

export default function Sold() {
    const [soldItems, setSoldItems] = useState([]);

    const [searchText, setSearchText] = useState("");
    const [filters, setFilters] = useState([]);
    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState("asc");
    const [statusFilter, setStatusFilter] = useState(""); // 🔥 NEW

    const [allFields, setAllFields] = useState([]);

    // ---------------- FETCH SOLD ----------------
    const fetchSoldItems = async () => {
        try {
            const res = await api.get("/sold");
            if (res.data.success) {
                setSoldItems(res.data.items || []);
            }
        } catch (error) {
            console.error("Error fetching sold items:", error);
        }
    };

    // ---------------- FETCH FIELDS ----------------
    const fetchFields = async () => {
        try {
            const res = await api.get("/fields");
            if (res.data?.success) {
                setAllFields(res.data.fields || []);
            }
        } catch (err) {
            console.error("Failed to load fields", err);
        }
    };

    useEffect(() => {
        fetchSoldItems();
        fetchFields();
    }, []);

    // ---------------- TOP PANEL CALLBACK ----------------
    const handleFiltersChange = (newFilters, sortBy, order, status) => {
        setFilters(newFilters || []);
        setSortField(sortBy || "");
        setSortOrder(order || "asc");
        setStatusFilter(status || "");
    };

    // ---------------- APPLY SEARCH / FILTER / SORT ----------------
    const applySearchFilterSort = () => {
        let data = [...soldItems];

        /* 🔍 SEARCH */
        if (searchText.trim()) {
            const q = searchText.toLowerCase();
            data = data.filter(item => {
                const values = [
                    item.billingID,
                    item.productID,
                    item.paymentStatus,
                    ...(item.productFields || []).map(f => String(f.value)),
                    ...(item.soldFields || []).map(f => String(f.value)),
                ];
                return values.some(v => v?.toLowerCase().includes(q));
            });
        }

        /* 💳 STATUS FILTER */
        if (statusFilter) {
            data = data.filter(item => item.paymentStatus === statusFilter);
        }

        /* 📌 FIELD FILTERS */
        filters.forEach(filter => {
            data = data.filter(item => {
                // backend numeric fields
                if (filter.fieldId.startsWith("__")) {
                    const key = filter.fieldId.replace("__", "");
                    return String(item[key]) === String(filter.value);
                }

                const all = [
                    ...(item.productFields || []),
                    ...(item.soldFields || [])
                ];

                const found = all.find(f => f.fieldRef?._id === filter.fieldId);
                if (!found) return false;

                return String(found.value) === String(filter.value);
            });
        });

        /* 🔼 SORT */
        if (sortField) {
            data.sort((a, b) => {
                const getValue = (item) => {
                    if (sortField.startsWith("__")) {
                        return Number(item[sortField.replace("__", "")] || 0);
                    }

                    if (item[sortField] !== undefined) {
                        return Number(item[sortField]);
                    }

                    const all = [
                        ...(item.productFields || []),
                        ...(item.soldFields || [])
                    ];

                    const f = all.find(x => x.fieldRef?._id === sortField);
                    return Number(f?.value || 0);
                };

                const A = getValue(a);
                const B = getValue(b);

                return sortOrder === "asc" ? A - B : B - A;
            });
        }

        return data;
    };

    const finalItems = applySearchFilterSort();

    // ---------------- RENDER ----------------
    return (
        <div className="sold-page">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold text-gold">🧾 Sold Items</h4>
                <div className="flex-grow-1 ms-4">
                    <TopPanel
                        section="sold"
                        fields={allFields}
                        onSearchChange={setSearchText}
                        onFiltersChange={handleFiltersChange}
                    /></div>
            </div>



            <OverviewPanel
                section="sold"
                items={finalItems}
                onRefresh={fetchSoldItems}
            />
        </div>
    );
}