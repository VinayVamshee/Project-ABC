import React, { useState } from "react";
import api from "../../api/axios";
import "./OverviewPanel.css";

export default function OverviewPanel({ section, items, onRefresh, onSell, onEdit }) {

    const formatIndianNumber = (value, { isCurrency = false } = {}) => {
        const num = Number(value);

        if (isNaN(num)) {
            // if it's "-", null etc, just return as is
            return value ?? "-";
        }

        const formatted = num.toLocaleString("en-IN"); // 1000000 -> 10,00,000

        return isCurrency ? `₹${formatted}` : formatted;
    };

    const [selectedItem, setSelectedItem] = useState(null);

    // 🧾 Payments history modal (Sold)
    const [paymentsHistoryItem, setPaymentsHistoryItem] = useState(null);

    // Open payments history (fetch latest sold record so we have payments + populated fields)
    const openPaymentsHistoryModal = async (item) => {
        try {
            // try to fetch fresh copy from server (populated)
            const res = await api.get(`/sold/${item._id}`);
            if (res.data && res.data.success && res.data.item) {
                setPaymentsHistoryItem(res.data.item);
            } else {
                // fallback: use passed item
                setPaymentsHistoryItem(item);
            }

            const modal = new window.bootstrap.Modal(
                document.getElementById("paymentsHistoryModal")
            );
            modal.show();
        } catch (err) {
            console.error("Failed to fetch sold item for payments history:", err);
            // fallback show passed item if network fails
            setPaymentsHistoryItem(item);
            const modal = new window.bootstrap.Modal(
                document.getElementById("paymentsHistoryModal")
            );
            modal.show();
        }
    };

    const getTotalPaidFromPayments = (item) =>
        (item?.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const getAmountDueForSold = (item) => {
        const totalPaid = getTotalPaidFromPayments(item);
        const finalPrice = Number(item?.finalPrice || 0);
        return Math.max(finalPrice - totalPaid, 0);
    };

    // const splitFieldsByType = (fields = []) => {
    //     const textFields = [];
    //     const imageFields = [];

    //     fields.forEach(f => {
    //         if (!f?.fieldRef) return;

    //         if (f.fieldRef.type === "file" && f.value) {
    //             imageFields.push(f);
    //         } else {
    //             textFields.push(f);
    //         }
    //     });

    //     return { textFields, imageFields };
    // };


    //     const imageFields = [
    //     ...(selectedItem.productFields || []),
    //     ...(selectedItem.orderId?.orderFields || []),
    //     ...(selectedItem.soldFields || []),
    // ].filter(
    //     f => f.fieldRef?.type === "file" && f.value
    // );

    // 🆕 For Add Payment modal (sold)
    const [paymentModalItem, setPaymentModalItem] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        mode: "cash",
        reference: "",
        paidBy: "customer",
    });

    const handlePaymentFormChange = (field, value) => {
        setPaymentForm(prev => ({ ...prev, [field]: value }));
    };

    const openPaymentModal = (item) => {
        setPaymentModalItem(item);
        setPaymentForm({
            amount: "",
            date: new Date().toISOString().slice(0, 10),
            mode: "cash",
            reference: "",
            paidBy: "customer",
        });

        const modal = new window.bootstrap.Modal(
            document.getElementById("addPaymentModal")
        );
        modal.show();
    };

    const handleAddPaymentConfirm = async () => {
        if (!paymentModalItem) return;

        if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        try {
            const res = await api.post(
                `/sold/${paymentModalItem._id}/payments`,
                {
                    ...paymentForm,
                    date: new Date(),
                }
            );

            if (res.data.success) {
                alert("Payment added successfully!");
                document.querySelector("#addPaymentModal .btn-close")?.click();
                onRefresh?.();
            }
        } catch (error) {
            console.error("Error adding payment:", error);
            alert("Failed to add payment");
        }
    };

    // Pagination
    const [itemsPerPage, setItemsPerPage] = useState(100); // default 100
    const [currentPage, setCurrentPage] = useState(1);

    // Total pages
    const totalPages = itemsPerPage === "all"
        ? 1
        : Math.ceil(items.length / itemsPerPage);

    if (section === "sold") {
        items = items.map(item => ({
            ...item,
            totalPaid: item.payments?.reduce((t, p) => t + Number(p.amount || 0), 0)
        }));
    }

    // Slice items for table
    const paginatedItems =
        itemsPerPage === "all"
            ? items
            : items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Change page safely
    const changePage = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    if (!items || items.length === 0) {
        return (
            <div className="overview-panel">
                {/* <h5 className="fw-semibold text-gold text-uppercase mb-3">
                    {section} Overview
                </h5> */}
                <p className="text-muted">No items found in {section}.</p>
            </div>
        );
    }

    // const attachFieldRefDetails = (rawFields, allFields) => {
    //     return rawFields.map(f => {
    //         if (typeof f.fieldRef === "string") {
    //             // find data from DB fields (sent to frontend)
    //             const ref = allFields.find(x => x._id === f.fieldRef);
    //             return { ...f, fieldRef: ref || f.fieldRef };
    //         }
    //         return f;
    //     });
    // };

    // 🔥 Get all fields depending on section
    const getAllFieldsForSection = (item) => {
        if (section === "inventory") return item.fields || [];

        if (section === "orders")
            return [
                ...(Array.isArray(item.productFields) ? item.productFields : []),
                ...(Array.isArray(item.orderFields) ? item.orderFields : [])
            ];

        if (section === "sold")
            return [
                ...(Array.isArray(item.productFields) ? item.productFields : []),
                ...(Array.isArray(item.soldFields) ? item.soldFields : [])
            ];

        return [];
    };

    // For overview table → extract fields from first item
    const mergedFirst = getAllFieldsForSection(items[0]);

    const overviewRefs = mergedFirst
        ?.filter((f) => f.fieldRef?.showIn?.[section]?.overview?.show)
        .map((f) => f.fieldRef) || [];

    // EXTRA BACKEND FIELDS (for SOLD page)
    const soldBackendColumns = [
        { key: "sellingPrice", label: "Selling Price", type: "currency" },
        { key: "discount", label: "Discount", type: "currency" },
        { key: "finalPrice", label: "Final Price", type: "currency" },
        { key: "inventoryPrice", label: "Cost Price", type: "currency" },
        { key: "profit", label: "Profit", type: "currency" },
        { key: "totalPaid", label: "Paid", type: "currency" },
        { key: "paymentStatus", label: "Status", type: "text" },
    ];

    // EXTRA BACKEND FIELDS (for ORDERS page)
    const orderBackendColumns = [
        { key: "buyingCostPrice", label: "Cost To Owner", type: "currency" },
    ];

    // Sort overview refs
    let overviewFields = overviewRefs.sort(
        (a, b) =>
            (a.showIn?.[section]?.overview?.serialNo || 0) -
            (b.showIn?.[section]?.overview?.serialNo || 0)
    );

    // inject backend fields into SOLD overview
    // inject backend fields into SOLD overview
    if (section === "sold") {
        overviewFields = [
            ...overviewFields,
            ...soldBackendColumns.map(c => ({
                _id: c.key,
                label: c.label,
                type: c.type
            }))
        ];
    }

    // inject backend fields into ORDERS overview
    if (section === "orders") {
        overviewFields = [
            ...overviewFields,
            ...orderBackendColumns.map(c => ({
                _id: c.key,
                label: c.label,
                type: c.type
            }))
        ];
    }

    // Get value inside item
    const getFieldValue = (item, fieldId) => {
        const all = getAllFieldsForSection(item);
        // backend fields (sold + orders)
        if (
            (section === "sold" || section === "orders") &&
            item[fieldId] !== undefined
        ) {
            return item[fieldId];
        }

        const found = all.find((f) => f.fieldRef?._id === fieldId);
        return found ? found.value : "-";
    };

    // Remove inventory item
    const handleRemove = async (id) => {
        if (!window.confirm("Are you sure you want to remove this item?")) return;

        try {
            const res = await api.delete(`/inventory/${id}`);
            if (res.data.success) {
                alert("Item removed successfully!");
                onRefresh?.();
            }
        } catch (error) {
            console.error("Error removing item:", error);
            alert("Failed to remove item.");
        }
    };

    // UPDATE ORDER STATUS
    const handleStatusChange = async (id, status) => {
        try {
            const res = await api.put(`/orders/${id}`, { status });

            if (res.data.success) {
                onRefresh?.(); // reload parent
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    // Open modal
    const handleViewDetails = (item) => {
        setSelectedItem(item);
        const modal = new window.bootstrap.Modal(
            document.getElementById("fullInfoModal")
        );
        modal.show();
    };

    // Render file/image/text fields
    const renderField = (f) => {
        const label = f.fieldRef?.label;
        const type = f.fieldRef?.type;
        const fileType = f.fieldRef?.fileType;

        if (type === "file") {
            if (fileType === "image" && f.value) {
                return (
                    <a href={f.value} target="_blank" rel="noopener noreferrer">
                        <img src={f.value} alt={label} className="preview-image-lg" />
                    </a>
                );
            }

            return f.value ? (
                <a
                    href={f.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-gold"
                >
                    View File
                </a>
            ) : (
                <span className="text-muted">No file</span>
            );
        }

        if (Array.isArray(f.value)) {
            return <span>{f.value.join(" ")}</span>; // 👈 FIX
        }

        return <span>{f.value || "-"}</span>;

    };

    // const getFieldsForFullInfo = (item) => {
    //     if (!item) return [];

    //     if (section === "inventory") return item.fields || [];

    //     if (section === "orders") return item.orderFields || [];

    //     if (section === "sold") {
    //         return [
    //             ...(item.productFields || []),

    //             // 🔥 ORDER DETAILS (if sold from order)
    //             ...(item.orderId?.orderFields || []),

    //             // 🔥 CUSTOMER DETAILS
    //             ...(item.soldFields || []),
    //         ];
    //     }

    //     return [];
    // };

    return (
        <div className="overview-panel" style={{ height: '87vh', overflowX: 'scroll' }}>
            {/* <h5 className="fw-semibold text-gold text-uppercase mb-3">
                {section} Overview
            </h5> */}

            <div className="table-responsive overview-table-wrapper" style={{ height: '93%', overflowX: 'scroll' }}>
                <table className="table table-hover align-middle overview-table">

                    {/* HEADER */}
                    <thead className="table-light">
                        <tr>
                            <th>#</th>
                            <th>Product ID</th>

                            {overviewFields.map(field => (
                                <th key={field._id}>{field.label}</th>
                            ))}

                            {section === "inventory" && (
                                <>
                                    <th>Cost Price</th>
                                    <th>Actions</th>
                                </>
                            )}

                            {section === "orders" && <th>Status</th>}

                            <th>Full Info</th>
                        </tr>
                    </thead>

                    {/* BODY */}
                    <tbody>
                        {paginatedItems.map((item, index) => (
                            <tr key={item._id}>
                                <td><strong>{index + 1}</strong></td>
                                <td className="text-nowrap">
                                    {item.productID || "-"}
                                </td>

                                {overviewFields.map(field => {
                                    const raw = getFieldValue(item, field._id);

                                    const isBackendCurrency =
                                        ["sellingPrice", "discount", "finalPrice", "inventoryPrice", "profit", "totalPaid"]
                                            .includes(field._id);

                                    const isCurrency =
                                        field.type === "currency" || isBackendCurrency;

                                    const isNumeric =
                                        field.type === "number" || field.type === "currency" || isBackendCurrency;

                                    const displayValue = Array.isArray(raw)
                                        ? raw.join(" ")
                                        : isNumeric
                                            ? formatIndianNumber(raw, { isCurrency })
                                            : raw;

                                    return (
                                        <td key={field._id} className="text-nowrap">
                                            {displayValue}
                                        </td>
                                    );
                                })}

                                {/* INVENTORY ACTIONS */}
                                {section === "inventory" && (
                                    <>
                                        <td className="text-nowrap">
                                            {formatIndianNumber(item.baseCostPrice, { isCurrency: true })}
                                        </td>

                                        <td className="text-center">
                                            <div className="d-flex gap-2 justify-content-center flex-wrap">
                                                <button
                                                    className="btn-sm btn-outline-gold"
                                                    onClick={() => onEdit(item)}  
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="btn-sm btn-gold"
                                                    onClick={() => onSell(item)}
                                                >
                                                    Sell
                                                </button>

                                                <button
                                                    className="btn-sm btn-outline-danger"
                                                    onClick={() => handleRemove(item._id)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                )}


                                {/* ORDER STATUS + ACTIONS */}
                                {section === "orders" && (
                                    <td>
                                        <div className="d-flex align-items-center gap-2">
                                            <select
                                                className={`status-select status-${item.status}`}
                                                value={item.status}
                                                onChange={(e) => handleStatusChange(item._id, e.target.value)}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="completed">Completed</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>

                                            <button
                                                className="btn btn-sm btn-gold"
                                                onClick={() => onSell(item)}
                                                disabled={item.status !== "completed"}
                                            >
                                                Sell
                                            </button>
                                        </div>
                                    </td>
                                )}

                                {/* SOLD ACTIONS */}
                                <td className="text-center">
                                    {section === "sold" ? (
                                        <div className="d-flex gap-2 justify-content-center flex-wrap">

                                            <button
                                                className="btn-sm btn-gold"
                                                onClick={() => openPaymentModal(item)}
                                            >
                                                Add Payment
                                            </button>

                                            <button
                                                className="btn-sm btn-outline-gold"
                                                onClick={() => openPaymentsHistoryModal(item)}
                                            >
                                                Payments
                                            </button>

                                            <button
                                                className="btn-sm btn-outline-gold"
                                                onClick={() => handleViewDetails(item)}
                                            >
                                                View
                                            </button>

                                        </div>
                                    ) : (
                                        <button
                                            className="btn-sm btn-outline-gold"
                                            onClick={() => handleViewDetails(item)}
                                        >
                                            View
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>

                    <tfoot>
                        <tr className="total-row">
                            <td className="text-gold fw-bold">Total</td>

                            {overviewFields.map((field) => {
                                const type = field.type;
                                const subType = field.numberSubType;

                                const isCurrency =
                                    type === "currency" ||
                                    subType === "currency" ||
                                    ["sellingPrice", "discount", "finalPrice"].includes(field.label);

                                const isBackendCurrency =
                                    ["sellingPrice", "discount", "finalPrice", "inventoryPrice", "profit", "totalPaid"]
                                        .includes(field._id);

                                const isWeight = type === "weight" || subType === "weight";
                                const isQuantity = subType === "quantity";

                                const shouldSum = isCurrency || isWeight || isQuantity || isBackendCurrency;

                                if (!shouldSum) {
                                    return <td key={field._id}>—</td>;
                                }

                                const sum = paginatedItems.reduce((acc, item) => {
                                    const raw = getFieldValue(item, field._id);
                                    const n = Number(raw);
                                    return !isNaN(n) ? acc + n : acc;
                                }, 0);

                                const displayTotal = formatIndianNumber(sum, {
                                    isCurrency: isCurrency || isBackendCurrency,
                                });

                                return (
                                    <td key={field._id} className="fw-bold text-gold">
                                        {displayTotal}
                                    </td>
                                );
                            })}

                            {section === "inventory" && (
                                <td className="fw-bold text-gold">
                                    {formatIndianNumber(
                                        paginatedItems.reduce(
                                            (sum, item) => sum + Number(item.baseCostPrice || 0),
                                            0
                                        ),
                                        { isCurrency: true }
                                    )}
                                </td>
                            )}
                            {section === "orders" && <td>—</td>}

                            <td>—</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="pagination-bar mt-3 d-flex justify-content-between align-items-center flex-wrap">

                {/* Items per page */}
                <div className="d-flex align-items-center gap-2">
                    <span className="text-gold fw-semibold">Rows per page:</span>

                    <select
                        className="pagination-select"
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(e.target.value === "all" ? "all" : Number(e.target.value));
                            setCurrentPage(1);
                        }}
                    >
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value="all">All</option>
                    </select>
                </div>

                {/* Page numbers */}
                <div className="d-flex align-items-center gap-2">

                    <button
                        className="page-btn"
                        onClick={() => changePage(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        ‹ Prev
                    </button>

                    <span className="page-info">
                        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                    </span>

                    <button
                        className="page-btn"
                        onClick={() => changePage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next ›
                    </button>
                </div>
            </div>

            {/* FULL INFO MODAL */}
            <div
                className="modal fade"
                id="fullInfoModal"
                tabIndex="-1"
                aria-labelledby="fullInfoModalLabel"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-xl">
                    <div className="modal-content custom-modal">
                        <div className="modal-header">
                            <h5 className="modal-title">Full Information</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                        </div>

                        <div className="modal-body">
                            {selectedItem ? (
                                <div className="container-fluid">
                                    <div className="row g-4">

                                        {/* ================= LEFT SIDE — DETAILS ================= */}
                                        <div className="col-lg-8">

                                            {/* 🟦 INVENTORY DETAILS */}
                                            {section === "inventory" &&
                                                selectedItem.fields?.filter(f => f.fieldRef?.type !== "file").length > 0 && (
                                                    <div className="info-section mb-4 p-2">
                                                        <h5 className="section-title">🟦 Product Details</h5>

                                                        <div className="row g-3">
                                                            {selectedItem.fields
                                                                .filter(f => f.fieldRef?.type !== "file")
                                                                .map((f, i) => (
                                                                    <div key={i} className="col-md-6">
                                                                        <div className="info-box">
                                                                            <div className="info-label">{f.fieldRef?.label}</div>
                                                                            <div className="info-value">{renderField(f)}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                            {/* 🧾 ORDER DETAILS */}
                                            {section === "orders" &&
                                                selectedItem.orderFields?.filter(f => f.fieldRef?.type !== "file").length > 0 && (
                                                    <div className="info-section mb-4 p-2">
                                                        <h5 className="section-title">🧾 Order Details</h5>

                                                        <div className="row g-3">
                                                            {selectedItem.orderFields
                                                                .filter(f => f.fieldRef?.type !== "file")
                                                                .map((f, i) => (
                                                                    <div key={i} className="col-md-6">
                                                                        <div className="info-box">
                                                                            <div className="info-label">{f.fieldRef?.label}</div>
                                                                            <div className="info-value">{renderField(f)}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                            {/* 🟦 PRODUCT DETAILS (Sold) */}
                                            {section === "sold" &&
                                                selectedItem.productFields?.filter(f => f.fieldRef?.type !== "file").length > 0 && (
                                                    <div className="info-section mb-4 p-2">
                                                        <h5 className="section-title">🟦 Product Details</h5>

                                                        <div className="row g-3">
                                                            {selectedItem.productFields
                                                                .filter(f => f.fieldRef?.type !== "file")
                                                                .map((f, i) => (
                                                                    <div key={i} className="col-md-6">
                                                                        <div className="info-box">
                                                                            <div className="info-label">{f.fieldRef?.label}</div>
                                                                            <div className="info-value">{renderField(f)}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                            {/* 🧾 ORDER DETAILS (Sold-from-order) */}
                                            {section === "sold" &&
                                                selectedItem.orderId?.orderFields?.filter(f => f.fieldRef?.type !== "file").length > 0 && (
                                                    <div className="info-section mb-4 p-2">
                                                        <h5 className="section-title">🧾 Order Details</h5>

                                                        <div className="row g-3">
                                                            {selectedItem.orderId.orderFields
                                                                .filter(f => f.fieldRef?.type !== "file")
                                                                .map((f, i) => (
                                                                    <div key={i} className="col-md-6">
                                                                        <div className="info-box">
                                                                            <div className="info-label">{f.fieldRef?.label}</div>
                                                                            <div className="info-value">{renderField(f)}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                            {/* 🟩 CUSTOMER DETAILS */}
                                            {section === "sold" &&
                                                selectedItem.soldFields?.filter(f => f.fieldRef?.type !== "file").length > 0 && (
                                                    <div className="info-section mb-4 p-2">
                                                        <h5 className="section-title">🟩 Customer Details</h5>

                                                        <div className="row g-3">
                                                            {selectedItem.soldFields
                                                                .filter(f => f.fieldRef?.type !== "file")
                                                                .map((f, i) => (
                                                                    <div key={i} className="col-md-6">
                                                                        <div className="info-box">
                                                                            <div className="info-label">{f.fieldRef?.label}</div>
                                                                            <div className="info-value">{renderField(f)}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                        </div>

                                        {/* ================= RIGHT SIDE — IMAGES ================= */}

                                        <div className="col-lg-4">
                                            <div className="image-panel sticky-top">
                                                <h6 className="image-panel-title">🖼 Images</h6>

                                                {(() => {
                                                    let productImages = [];
                                                    let orderImages = [];
                                                    let customerImages = [];

                                                    // 🔵 INVENTORY
                                                    if (section === "inventory") {
                                                        productImages = (selectedItem.fields || []).filter(
                                                            f => f.fieldRef?.type === "file" && f.value
                                                        );
                                                    }

                                                    // 🧾 ORDERS
                                                    if (section === "orders") {
                                                        orderImages = (selectedItem.orderFields || []).filter(
                                                            f => f.fieldRef?.type === "file" && f.value
                                                        );
                                                    }

                                                    // 🟩 SOLD
                                                    if (section === "sold") {
                                                        productImages = (selectedItem.productFields || []).filter(
                                                            f => f.fieldRef?.type === "file" && f.value
                                                        );

                                                        orderImages = (selectedItem.orderId?.orderFields || []).filter(
                                                            f => f.fieldRef?.type === "file" && f.value
                                                        );

                                                        customerImages = (selectedItem.soldFields || []).filter(
                                                            f => f.fieldRef?.type === "file" && f.value
                                                        );
                                                    }

                                                    if (
                                                        productImages.length === 0 &&
                                                        orderImages.length === 0 &&
                                                        customerImages.length === 0
                                                    ) {
                                                        return (
                                                            <div className="text-muted small text-center mt-3">
                                                                No images available
                                                            </div>
                                                        );
                                                    }

                                                    const renderGroup = (title, images) =>
                                                        images.length > 0 && (
                                                            <div className="mb-3">
                                                                <div className="fw-semibold small text-muted mb-2">
                                                                    {title}
                                                                </div>

                                                                {images.map((f, i) => (
                                                                    <a
                                                                        key={i}
                                                                        href={f.value}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="image-card"
                                                                    >
                                                                        <img src={f.value} alt={f.fieldRef?.label} />
                                                                        <div className="image-label">
                                                                            {f.fieldRef?.label}
                                                                        </div>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        );

                                                    return (
                                                        <>
                                                            {renderGroup("🟦 Product Images", productImages)}
                                                            {renderGroup("🧾 Order Images", orderImages)}
                                                            {renderGroup("🟩 Customer Images", customerImages)}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted text-center">No data available.</p>
                            )}
                        </div>


                        <div className="modal-footer">
                            <button className="btn btn-secondary" data-bs-dismiss="modal">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ADD PAYMENT MODAL (Sold) */}
            <div
                className="modal fade"
                id="addPaymentModal"
                tabIndex="-1"
                aria-labelledby="addPaymentModalLabel"
                aria-hidden="true"
            >
                <div className="modal-dialog">
                    <div className="modal-content custom-modal">
                        <div className="modal-header">
                            <h5 className="modal-title" id="addPaymentModalLabel">
                                Add Payment
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                        </div>

                        <div className="modal-body">
                            {paymentModalItem ? (
                                <>
                                    {/* Summary */}
                                    <div className="mb-3">
                                        <div className="small text-muted">Billing ID</div>
                                        <div className="fw-semibold">
                                            {paymentModalItem.billingID || "-"}
                                        </div>
                                    </div>

                                    <div className="row g-2 mb-3">
                                        <div className="col-6">
                                            <div className="small text-muted">Final Price</div>
                                            <div className="fw-semibold">
                                                {formatIndianNumber(paymentModalItem.finalPrice, { isCurrency: true })}
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="small text-muted">Already Paid</div>
                                            <div className="fw-semibold">
                                                {formatIndianNumber(
                                                    (paymentModalItem.payments || []).reduce(
                                                        (sum, p) => sum + Number(p.amount || 0),
                                                        0
                                                    ),
                                                    { isCurrency: true }
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form */}
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Amount</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={paymentForm.amount}
                                            onChange={(e) => handlePaymentFormChange("amount", e.target.value)}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={paymentForm.date}
                                            onChange={(e) => handlePaymentFormChange("date", e.target.value)}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Mode</label>
                                        <select
                                            className="form-select"
                                            value={paymentForm.mode}
                                            onChange={(e) => handlePaymentFormChange("mode", e.target.value)}
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="upi">UPI</option>
                                            <option value="bank-transfer">Bank Transfer</option>
                                            <option value="card">Card</option>
                                            <option value="cheque">Cheque</option>
                                            <option value="gold-exchange">Gold Exchange</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">
                                            Reference (UPI name / Txn ID / Cheque no / Gold grams)
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={paymentForm.reference}
                                            onChange={(e) => handlePaymentFormChange("reference", e.target.value)}
                                        />
                                    </div>
                                </>
                            ) : (
                                <p className="text-muted">No bill selected.</p>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleAddPaymentConfirm}>
                                Save Payment
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAYMENTS HISTORY MODAL (Sold) */}
            <div
                className="modal fade"
                id="paymentsHistoryModal"
                tabIndex="-1"
                aria-labelledby="paymentsHistoryModalLabel"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-lg">
                    <div className="modal-content custom-modal">
                        <div className="modal-header">
                            <h5 className="modal-title" id="paymentsHistoryModalLabel">
                                Payments History
                            </h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                        </div>

                        <div className="modal-body">
                            {paymentsHistoryItem ? (
                                <>
                                    {/* Summary */}
                                    <div className="mb-3">
                                        <div className="small text-muted">Billing ID</div>
                                        <div className="fw-semibold">
                                            {paymentsHistoryItem.billingID || "-"}
                                        </div>
                                    </div>

                                    <div className="row g-2 mb-3">
                                        <div className="col-md-4">
                                            <div className="small text-muted">Final Price</div>
                                            <div className="fw-semibold">
                                                {formatIndianNumber(
                                                    paymentsHistoryItem.finalPrice,
                                                    { isCurrency: true }
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="small text-muted">Total Paid</div>
                                            <div className="fw-semibold">
                                                {formatIndianNumber(
                                                    getTotalPaidFromPayments(paymentsHistoryItem),
                                                    { isCurrency: true }
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-md-4">
                                            <div className="small text-muted">Amount Due</div>
                                            <div className="fw-semibold">
                                                {formatIndianNumber(
                                                    getAmountDueForSold(paymentsHistoryItem),
                                                    { isCurrency: true }
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table */}
                                    {(!paymentsHistoryItem.payments || paymentsHistoryItem.payments.length === 0) ? (
                                        <p className="text-muted mb-0">No payments recorded yet.</p>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-sm align-middle payments-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: 40 }}>#</th>
                                                        <th>Reference</th>
                                                        <th style={{ minWidth: 120 }}>Method</th>
                                                        <th style={{ minWidth: 140 }}>Date</th>
                                                        <th className="text-end" style={{ minWidth: 120 }}>Amount</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {paymentsHistoryItem.payments.map((p, idx) => (
                                                        <tr key={p._id || idx}>
                                                            {/* index */}
                                                            <td className="align-middle text-center">{idx + 1}</td>

                                                            {/* Paid By (shows paidBy, reference, and faint ID/notes) */}
                                                            <td>
                                                                <div className="fw-semibold">{p.paidBy || "Customer"}</div>

                                                                {p.reference ? (
                                                                    <div className="small text-muted">Ref: {p.reference}</div>
                                                                ) : null}

                                                                {p.notes ? (
                                                                    <div className="small text-muted">Notes: {p.notes}</div>
                                                                ) : null}

                                                                {p.recordedBy ? (
                                                                    <div className="small text-muted">Recorded by: {p.recordedBy}</div>
                                                                ) : null}

                                                                {/* internal id faint */}
                                                                {/* {p._id ? (
                <div className="small text-muted mt-1 faint-id">ID: {p._id}</div>
              ) : null} */}
                                                            </td>

                                                            {/* Mode */}
                                                            <td className="text-capitalize align-middle">{p.mode || "-"}</td>

                                                            {/* Date + time */}
                                                            <td className="align-middle">
                                                                {p.date ? new Date(p.date).toLocaleDateString("en-IN") : "-"}
                                                                {p.date ? (
                                                                    <div className="small text-muted">
                                                                        {new Date(p.date).toLocaleTimeString("en-IN")}
                                                                    </div>
                                                                ) : null}
                                                            </td>

                                                            {/* Amount */}
                                                            <td className="text-end align-middle fw-semibold">
                                                                {formatIndianNumber(p.amount, { isCurrency: true })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>

                                                <tfoot>
                                                    <tr>
                                                        <th colSpan="4" className="text-end">Total Paid</th>
                                                        <th className="text-end">
                                                            {formatIndianNumber(getTotalPaidFromPayments(paymentsHistoryItem), { isCurrency: true })}
                                                        </th>
                                                    </tr>
                                                    <tr>
                                                        <th colSpan="4" className="text-end">Amount Due</th>
                                                        <th className="text-end">
                                                            {formatIndianNumber(getAmountDueForSold(paymentsHistoryItem), { isCurrency: true })}
                                                        </th>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-muted mb-0">No bill selected.</p>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" data-bs-dismiss="modal">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}