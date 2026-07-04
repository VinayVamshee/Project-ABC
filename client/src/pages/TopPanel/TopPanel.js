import React, { useState, useEffect, useRef } from "react";
import "./TopPanel.css";

export default function TopPanel({
    section,         // "inventory" | "orders" | "sold"
    fields,          // all input fields (from backend)
    onSearchChange,  // callback(text)
    onFiltersChange, // callback(filters, sortField, sortOrder, status)
}) {
    const [pageFields, setPageFields] = useState([]);
    const [selectedField, setSelectedField] = useState(null);
    const [filterValue, setFilterValue] = useState("");
    const [filters, setFilters] = useState([]);

    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState("asc");

    const [statusFilter, setStatusFilter] = useState(""); // pending | partial | paid

    const searchInputRef = useRef(null);
    const barcodeBufferRef = useRef("");
    const lastScanTimeRef = useRef(0);
    const scanTimerRef = useRef(null);

    // ----------------------------------
    // Extract fields for current section
    // ----------------------------------
    useEffect(() => {
        if (!fields || fields.length === 0) return;

        let filtered = [];

        if (section === "inventory") {
            filtered = fields.filter(f => f.showIn?.inventory?.show);
        }

        if (section === "sold") {
            filtered = fields.filter(f => f.showIn?.sold?.show);
        }

        if (section === "orders") {
            filtered = fields.filter(f => f.showIn?.orders?.show);
        }

        // Sort by serial number
        filtered.sort(
            (a, b) =>
                (a.showIn?.[section]?.serialNo || 0) -
                (b.showIn?.[section]?.serialNo || 0)
        );

        // 🔥 Inject SOLD backend numeric fields
        if (section === "sold") {
            filtered = [
                ...filtered,
                { _id: "__sellingPrice", label: "Selling Price", type: "currency" },
                { _id: "__inventoryPrice", label: "Cost Price", type: "currency" },
                { _id: "__discount", label: "Discount", type: "currency" },
                { _id: "__finalPrice", label: "Final Price", type: "currency" },
            ];
        }

        setPageFields(filtered);
    }, [fields, section]);

    // ----------------------------------
    // Notify parent on any change
    // ----------------------------------
    useEffect(() => {
        onFiltersChange?.(filters, sortField, sortOrder, statusFilter);
    }, [filters, sortField, sortOrder, statusFilter, onFiltersChange]);

    // ----------------------------------
    // Add filter
    // ----------------------------------
    const handleAddFilter = () => {
        if (!selectedField || filterValue === "") return;

        const newFilter = {
            fieldId: selectedField._id,
            label: selectedField.label,
            type: selectedField.type,
            value: filterValue,
        };

        setFilters(prev => [...prev, newFilter]);
        setFilterValue("");
        setSelectedField(null);
    };

    // ----------------------------------
    // Remove filter
    // ----------------------------------
    const removeFilter = (index) => {
        setFilters(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            const now = Date.now();

            // Reset buffer if pause is long (human typing)
            if (now - lastScanTimeRef.current > 100) {
                barcodeBufferRef.current = "";
            }

            lastScanTimeRef.current = now;

            // Only capture printable characters
            if (e.key.length === 1) {
                barcodeBufferRef.current += e.key;
            }

            // Clear previous timer safely
            if (scanTimerRef.current) {
                clearTimeout(scanTimerRef.current);
            }

            // Scanner finishes quickly → finalize scan
            scanTimerRef.current = setTimeout(() => {
                const scanned = barcodeBufferRef.current.trim();

                if (scanned.length >= 5 && searchInputRef.current) {
                    searchInputRef.current.value = scanned;

                    // 🔥 trigger existing onChange logic
                    searchInputRef.current.dispatchEvent(
                        new Event("input", { bubbles: true })
                    );
                }

                barcodeBufferRef.current = "";
            }, 80);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (scanTimerRef.current) {
                clearTimeout(scanTimerRef.current);
            }
        };
    }, []);

    return (
        <div className="top-panel">
            <div className="top-panel-row top-panel-main">
                <div className="search-box">
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="form-control"
                        placeholder={`Search in ${section}`}
                        onChange={(e) => onSearchChange?.(e.target.value)}
                    />
                </div>

                <select
                    className="form-select filter-field-select"
                    value={selectedField?._id || ""}
                    onChange={(e) => {
                        const f = pageFields.find(x => x._id === e.target.value);
                        setSelectedField(f || null);
                        setFilterValue("");
                    }}
                >
                    <option value="">Select Field</option>
                    {pageFields.map((f) => (
                        <option key={f._id} value={f._id}>
                            {f.label}
                        </option>
                    ))}
                </select>

                {selectedField && (
                    <>
                        {selectedField.type === "text" && (
                            <input
                                type="text"
                                className="form-control filter-value-input"
                                placeholder={`Enter ${selectedField.label}`}
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                            />
                        )}

                        {["number", "currency", "weight"].includes(selectedField.type) && (
                            <input
                                type="number"
                                className="form-control filter-value-input"
                                placeholder={`Enter ${selectedField.label}`}
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                            />
                        )}

                        {selectedField.type === "checkbox" && (
                            <select
                                className="form-select"
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                            >
                                <option value="">Select</option>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                            </select>
                        )}

                        {(selectedField.type === "select" || selectedField.type === "mcq") && (
                            <select
                                className="form-control filter-value-input"
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                            >
                                <option value="">Select {selectedField.label}</option>
                                {selectedField.selectOptions?.map(opt => (
                                    <option key={opt._id} value={opt.label}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        {!["text", "number", "currency", "weight", "checkbox", "select", "mcq"]
                            .includes(selectedField.type) && (
                                <input
                                    type="text"
                                    className="form-control filter-value-input"
                                    placeholder={`Enter ${selectedField.label}`}
                                    value={filterValue}
                                    onChange={(e) => setFilterValue(e.target.value)}
                                />
                            )}
                    </>
                )}

                {selectedField && (
                    <button
                        className="toolbar-btn add-filter-btn"
                        onClick={handleAddFilter}
                    >
                        <span>+</span>
                        <span>Add Filter</span>
                    </button>
                )}

                <div className="sort-tools">
                    <div className="sort-field-wrap">
                        <span className="sort-field-icon">⇅</span>
                        <select
                            className="form-select sort-select sort-field-select"
                            value={sortField}
                            onChange={(e) => setSortField(e.target.value)}
                            aria-label="Sort field"
                            title="Sort field"
                        >
                            <option value="">Sort</option>
                            {pageFields
                                .filter(f => ["number", "currency", "weight"].includes(f.type))
                                .map(f => (
                                    <option key={f._id} value={f._id}>
                                        {f.label}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        className="btn sort-order-btn"
                        onClick={() => setSortOrder(prev => (prev === "asc" ? "desc" : "asc"))}
                        disabled={!sortField}
                        title="Toggle sort order"
                        aria-label="Toggle sort order"
                    >
                        {sortOrder === "asc" ? "↑" : "↓"}
                    </button>
                </div>

                {section === "sold" && (
                    <div className="status-filter d-flex gap-2">
                        {["pending", "partial", "paid"].map((s) => (
                            <button
                                key={s}
                                className={`status-btn status-${s} ${statusFilter === s ? "active" : ""}`}
                                onClick={() =>
                                    setStatusFilter(prev => (prev === s ? "" : s))
                                }
                            >
                                {s.toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}

                {section === "orders" && (
                    <div className="status-filter d-flex gap-2">
                        {["pending", "completed", "cancelled"].map((s) => (
                            <button
                                key={s}
                                className={`status-btn status-${s} ${statusFilter === s ? "active" : ""}`}
                                onClick={() =>
                                    setStatusFilter(prev => (prev === s ? "" : s))
                                }
                            >
                                {s.toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}

                <div className="top-panel-actions">
                    <button
                        className="btn barcode-btn"
                        onClick={() => searchInputRef.current?.focus()}
                    >
                        <span className="barcode-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M4 6v12M7 6v12M10 8v8M13 6v12M16 8v8M19 6v12" />
                            </svg>
                        </span>

                        <span className="barcode-label">
                            Scan Barcode
                        </span>
                    </button>
                </div>
            </div>

            {filters.length > 0 && (
                <div className="top-panel-row top-panel-tags-row">
                    <div className="filter-tags d-flex gap-2 flex-wrap">
                        {filters.map((f, i) => (
                            <div key={i} className="filter-tag">
                                {f.label}: {String(f.value)}
                                <span className="remove-tag" onClick={() => removeFilter(i)}>×</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
