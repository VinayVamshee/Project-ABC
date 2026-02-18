import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import OverviewPanel from "../Overview/OverviewPanel";
import "./Inventory.css";
import TopPanel from "../TopPanel/TopPanel";
import { notify } from "../../components/Toast/toast"

export default function Inventory() {
    const [fields, setFields] = useState([]); // all fetched fields
    const [inventoryFields, setInventoryFields] = useState([]); // filtered for inventory
    const [formValues, setFormValues] = useState({});
    const [inventoryItems, setInventoryItems] = useState([]); // fetched saved inventory items

    const [editItem, setEditItem] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [editBaseCostPrice, setEditBaseCostPrice] = useState("");

    const [isSavingInventory, setIsSavingInventory] = useState(false);
    const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
    const [isSelling, setIsSelling] = useState(false);

    const openEditModal = (item) => {
        setEditItem(item);

        const prefilled = {};

        // fill existing values
        item.fields.forEach(f => {
            const id = f.fieldRef?._id || f.fieldRef;
            prefilled[id] = f.value;
        });

        // ensure ALL fields exist (even empty ones)
        inventoryFields.forEach(f => {
            if (!(f._id in prefilled)) {
                prefilled[f._id] = f.type === "select" ? [] : "";
            }
        });

        setEditValues(prefilled);
        setEditBaseCostPrice(item.baseCostPrice || 0);

        new window.bootstrap.Modal(
            document.getElementById("editInventoryModal")
        ).show();
    };


    const [baseCostPrice, setBaseCostPrice] = useState("");

    // at top inside Inventory component
    const [sellModalItem, setSellModalItem] = useState(null);
    const [soldFieldsDefs, setSoldFieldsDefs] = useState([]);   // fields that belong to sold page
    const [sellSoldValues, setSellSoldValues] = useState({});   // sold fields entered by user
    const [sellingPrice, setSellingPrice] = useState("");        // final selling price
    const [sellProductValues, setSellProductValues] = useState({}); // fieldRefId -> value (editable)

    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilters, setActiveFilters] = useState([]);

    const [filteredInventoryItems, setFilteredInventoryItems] = useState([]);

    const [sortField, setSortField] = useState("");
    const [sortOrder, setSortOrder] = useState("asc");

    const [discount, setDiscount] = useState(0);

    const [payments, setPayments] = useState([
        { amount: "", date: new Date().toISOString().slice(0, 10) }
    ]);

    const finalPrice = Math.max(Number(sellingPrice) - Number(discount), 0);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const amountDue = Math.max(finalPrice - totalPaid, 0);

    const getPaymentDetailLabel = (mode) => {
        switch (mode) {
            case "upi":
                return "UPI Name / ID (optional)";
            case "bank":
                return "Bank Txn No / Bank Name";
            case "card":
                return "Card Holder / Last 4 digits";
            case "cheque":
                return "Cheque Number";
            case "gold":
                return "Gold grams / details";
            default:
                return "Notes (optional)";
        }
    };

    const handlePaymentChange = (index, field, value) => {
        setPayments(prev => {
            const copy = [...prev];
            copy[index][field] = value;
            return copy;
        });
    };

    const addPaymentRow = () => {
        setPayments(prev => [
            ...prev,
            {
                amount: "",
                date: new Date().toISOString().slice(0, 10),
                mode: "cash",
                paidBy: ""
            }
        ]);
    };

    const removePaymentRow = (index) => {
        if (payments.length === 1) return;
        setPayments(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (!inventoryItems || inventoryItems.length === 0) {
            setFilteredInventoryItems([]);
            return;
        }

        let result = [...inventoryItems];

        // ✨ BASIC SEARCH FILTER
        if (searchTerm.trim() !== "") {
            const s = searchTerm.toLowerCase();

            result = result.filter((item) => {
                return item.fields.some((f) =>
                    (f.value + "").toLowerCase().includes(s)
                );
            });
        }

        // ✨ ADVANCED MULTI FILTER SYSTEM
        activeFilters.forEach((flt) => {
            const { fieldId, value, type } = flt;

            result = result.filter((item) => {
                const fieldObj = item.fields.find(
                    (f) => f.fieldRef?._id === fieldId
                );

                if (!fieldObj) return false;

                // TEXT match
                if (type === "text") {
                    return (fieldObj.value + "")
                        .toLowerCase()
                        .includes(value.toLowerCase());
                }

                // NUMBER exact match
                if (type === "number") {
                    return Number(fieldObj.value) === Number(value);
                }

                // SELECT exact match
                if (type === "select") {
                    return fieldObj.value === value;
                }

                // CHECKBOX
                if (type === "checkbox") {
                    return Boolean(fieldObj.value) === Boolean(value);
                }

                return true;
            });
        });
        if (sortField) {
            result.sort((a, b) => {
                const fa = a.fields.find((f) => f.fieldRef?._id === sortField);
                const fb = b.fields.find((f) => f.fieldRef?._id === sortField);

                const valA = Number(fa?.value || 0);
                const valB = Number(fb?.value || 0);

                return sortOrder === "asc" ? valA - valB : valB - valA;
            });
        };

        setFilteredInventoryItems(result);
    }, [searchTerm, activeFilters, inventoryItems, sortField, sortOrder]);

    // Open Sell modal and prefill product fields
    const openSellModal = (inventoryItem) => {
        setSellModalItem(inventoryItem);

        // Prefill product fields (editable)
        const pre = {};
        inventoryItem.fields?.forEach((f) => {
            const id = f.fieldRef?._id || f.fieldRef;
            pre[id] = f.value;
        });
        setSellProductValues(pre);

        // Fetch SOLD fields only
        const soldDefs = fields
            .filter((f) => f.showIn?.sold?.show)
            .sort((a, b) => (a.showIn.sold.serialNo || 0) - (b.showIn.sold.serialNo || 0));

        setSoldFieldsDefs(soldDefs);

        // Reset modal sold/custom input fields
        const soldPre = {};
        soldDefs.forEach((sf) => { soldPre[sf._id] = ""; });
        setSellSoldValues(soldPre);

        setSellingPrice("");

        const modal = new window.bootstrap.Modal(document.getElementById("sellModal"));
        modal.show();
    };

    const handleSellProductChange = (fieldId, value) => {
        setSellProductValues(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleConfirmSell = async () => {

        if (!sellModalItem || isSelling) return;
        setIsSelling(true);

        const productFieldsPayload = Object.entries(sellProductValues).map(([fieldRef, value]) => ({
            fieldRef,
            value,
        }));

        const soldFieldsPayload = Object.entries(sellSoldValues).map(([fieldRef, value]) => ({
            fieldRef,
            value,
        }));

        try {
            const res = await api.post("/sold", {
                inventoryId: sellModalItem._id,
                productFields: productFieldsPayload,
                soldFields: soldFieldsPayload,
                sellingPrice,
                discount,
                payments
            });

            if (res.data.success) {
                notify.success("Item sold successfully");

                document.querySelector("#sellModal .btn-close")?.click();
                fetchInventoryItems();
                fetchFields();
            }
        } catch (error) {
            console.error("SELL ERROR:", error);
            notify.error("Failed to sell item");
        } finally {
            setIsSelling(false);
        }
    };

    // ✅ Fetch all input fields
    const fetchFields = async () => {
        try {
            const res = await api.get("/fields");
            if (res.data.success) {
                const allFields = res.data.fields || [];

                // Filter fields shown in inventory and sort by serialNo
                const inventory = allFields
                    .filter((f) => f.showIn?.inventory?.show === true)
                    .sort(
                        (a, b) =>
                            (a.showIn.inventory.serialNo || 0) -
                            (b.showIn.inventory.serialNo || 0)
                    );

                setFields(allFields);
                setInventoryFields(inventory);
            }
        } catch (error) {
            console.error("Error fetching fields:", error);
            notify.error("Failed to fetch input fields");
        }
    };

    // ✅ Fetch all saved inventory items
    const fetchInventoryItems = async () => {
        try {
            const res = await api.get("/inventory");
            if (res.data.success) {
                setInventoryItems(res.data.items || []);
            }
        } catch (error) {
            console.error("Error fetching inventory items:", error);
            notify.error("Failed to load inventory items");
        }
    };

    useEffect(() => {
        fetchFields();
        fetchInventoryItems();
    }, []);

    // ✅ Handle value change for dynamic inputs
    const handleChange = (fieldId, value) => {
        setFormValues((prev) => ({
            ...prev,
            [fieldId]: value,
        }));
    };

    // ✅ Handle submit
    const handleSave = async () => {

        if (isSavingInventory) return;
        setIsSavingInventory(true);

        // 🔒 Basic validation
        if (!baseCostPrice || Number(baseCostPrice) <= 0) {
            // alert("Please enter a valid Buying Cost Price.");
            // return;
            setBaseCostPrice(0);
        }

        const formattedFields = Object.entries(formValues).map(([fieldRef, value]) => ({
            fieldRef,
            value,
        }));

        try {
            const res = await api.post("/inventory", {
                fields: formattedFields,
                baseCostPrice: Number(baseCostPrice),   // 🔥 send to backend
            });

            if (res.data.success) {
                notify.success("Inventory item added successfully");
                setFormValues({});
                setBaseCostPrice("");                   // reset cost input
                fetchInventoryItems();
                document.getElementById("closeInventoryModalBtn").click();
            }
        } catch (error) {
            console.error("Error saving inventory item:", error);
            notify.error("Failed to add inventory item");
        } finally {
            setIsSavingInventory(false);
        }
    };

    // ✅ Upload file to ImgBB and return the image URL
    const uploadToImgBB = async (file) => {
        try {
            const formData = new FormData();
            formData.append("key", "8451f34223c6e62555eec9187d855f8f"); // your API key
            formData.append("image", file);

            const res = await fetch("https://api.imgbb.com/1/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.success) {
                return data.data.display_url || data.data.url;
            } else {
                throw new Error("Image upload failed");
            }
        } catch (error) {
            console.error("Error uploading image:", error);
            notify.error("Image upload failed");
            return null;
        }
    };

    const handleUpdateInventory = async () => {
        if (!editItem || isUpdatingInventory) return;

        setIsUpdatingInventory(true);

        const fieldsPayload = Object.entries(editValues).map(
            ([fieldRef, value]) => ({ fieldRef, value })
        );

        try {
            const res = await api.put(`/inventory/${editItem._id}`, {
                fields: fieldsPayload,
                baseCostPrice: Number(editBaseCostPrice)
            });

            if (res.data.success) {
                notify.success("Inventory updated successfully");
                document.querySelector("#editInventoryModal .btn-close")?.click();
                fetchInventoryItems();
            }
        } catch (err) {
            console.error("Update failed", err);
            notify.error("Failed to update inventory");
        } finally {
            setIsUpdatingInventory(false);
        }
    };

    return (
        <div className="inventory-page">
            {/* Header */}
            <div className="top-header d-flex align-items-center gap-3 mb-4">
                <h4 className="fw-bold text-gold">📦 Inventory</h4>
                <div className="flex-grow-1">
                    <TopPanel
                        section="inventory"
                        fields={fields}
                        onSearchChange={(text) => setSearchTerm(text)}
                        onFiltersChange={(filters, sortFieldFromPanel, sortOrderFromPanel) => {
                            setActiveFilters(filters);
                            setSortField(sortFieldFromPanel);
                            setSortOrder(sortOrderFromPanel);
                        }}
                    />
                </div>
                <button
                    className="btn btn-gold"
                    data-bs-toggle="modal"
                    data-bs-target="#addInventoryModal"
                >
                    + Add New Item
                </button>
            </div>

            {/* Bootstrap Modal */}
            <div
                className="modal fade"
                id="addInventoryModal"
                tabIndex="-1"
                aria-labelledby="addInventoryModalLabel"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-xl">
                    <div className="modal-content custom-modal">
                        <div className="modal-header">
                            <h5 className="modal-title">Add New Inventory Item</h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                                id="closeInventoryModalBtn"
                            />
                        </div>

                        <div className="modal-body">
                            {inventoryFields.length === 0 ? (
                                <p className="text-muted text-center">
                                    No inventory fields found. Enable “Show in Inventory” in Settings.
                                </p>
                            ) : (
                                <div className="container-fluid">
                                    <div className="row g-4">

                                        {/* LEFT SIDE — FORM */}
                                        <div className="col-lg-8">

                                            {/* 🟧 COST SECTION */}
                                            <div className="info-section mb-4 p-2">
                                                <h5 className="section-title">🟧 Cost Details</h5>

                                                <div className="row g-3">
                                                    <div className="col-md-6">
                                                        <div className="info-box">
                                                            <div className="info-label">
                                                                Buying Cost Price (₹) <span className="text-danger">*</span>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                placeholder="Enter buying cost"
                                                                value={baseCostPrice}
                                                                onChange={(e) => setBaseCostPrice(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 🟦 PRODUCT DETAILS */}
                                            <div className="info-section p-2">
                                                <h5 className="section-title">🟦 Product Details</h5>

                                                <div className="row g-3">
                                                    {inventoryFields
                                                        .filter(f => f.type !== "file")
                                                        .map(field => (
                                                            <div key={field._id} className="col-md-6">
                                                                <div className="info-box">
                                                                    <div className="info-label">
                                                                        <small className="text-muted me-2">
                                                                            #{field.showIn.inventory.serialNo || "-"}
                                                                        </small>
                                                                        {field.label}
                                                                    </div>

                                                                    {/* TEXT */}
                                                                    {field.type === "text" && (
                                                                        <input
                                                                            type="text"
                                                                            className="form-control"
                                                                            placeholder={`Enter ${field.label}`}
                                                                            value={formValues[field._id] || ""}
                                                                            onChange={(e) => handleChange(field._id, e.target.value)}
                                                                        />
                                                                    )}

                                                                    {/* NUMBER */}
                                                                    {field.type === "number" && (
                                                                        <input
                                                                            type="number"
                                                                            className="form-control"
                                                                            placeholder={`Enter ${field.label}`}
                                                                            value={formValues[field._id] || ""}
                                                                            onChange={(e) => handleChange(field._id, e.target.value)}
                                                                        />
                                                                    )}

                                                                    {/* CHECKBOX */}
                                                                    {field.type === "checkbox" && (
                                                                        <div className="form-check mt-2">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="form-check-input"
                                                                                id={`chk-${field._id}`}
                                                                                checked={!!formValues[field._id]}
                                                                                onChange={(e) =>
                                                                                    handleChange(field._id, e.target.checked)
                                                                                }
                                                                            />
                                                                            <label className="form-check-label" htmlFor={`chk-${field._id}`}>
                                                                                Yes / No
                                                                            </label>
                                                                        </div>
                                                                    )}

                                                                    {/* SELECT / MCQ */}
                                                                    {field.type === "select" && (
                                                                        <div className="border rounded p-2" style={{ height: '40px', overflow: 'scroll' }}>
                                                                            {field.selectOptions?.map(opt => (
                                                                                <div key={opt._id} className="form-check">
                                                                                    <input
                                                                                        className="form-check-input"
                                                                                        type="checkbox"
                                                                                        id={`${field._id}-${opt._id}`}
                                                                                        checked={(formValues[field._id] || []).includes(opt.label)}
                                                                                        onChange={(e) => {
                                                                                            const prev = formValues[field._id] || [];
                                                                                            const updated = e.target.checked
                                                                                                ? [...prev, opt.label]
                                                                                                : prev.filter(v => v !== opt.label);

                                                                                            handleChange(field._id, updated);
                                                                                        }}
                                                                                    />
                                                                                    <label
                                                                                        className="form-check-label"
                                                                                        htmlFor={`${field._id}-${opt._id}`}
                                                                                    >
                                                                                        {opt.label}
                                                                                    </label>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT SIDE — IMAGES */}
                                        <div className="col-lg-4">
                                            <div className="image-panel sticky-top">
                                                <h6 className="image-panel-title">🖼 Images</h6>

                                                {inventoryFields
                                                    .filter(f => f.type === "file")
                                                    .map(field => (
                                                        <div key={field._id} className="image-upload-box">
                                                            <div className="info-label mb-1">{field.label}</div>

                                                            <input
                                                                type="file"
                                                                className="form-control"
                                                                accept="image/*"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files[0];
                                                                    if (!file) return;

                                                                    handleChange(field._id, "Uploading...");
                                                                    const uploadedUrl = await uploadToImgBB(file);
                                                                    handleChange(field._id, uploadedUrl || "");
                                                                }}
                                                            />

                                                            {formValues[field._id] &&
                                                                formValues[field._id] !== "Uploading..." && (
                                                                    <a
                                                                        href={formValues[field._id]}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="image-card mt-2"
                                                                    >
                                                                        <img src={formValues[field._id]} alt="Preview" />
                                                                    </a>
                                                                )}

                                                            {formValues[field._id] === "Uploading..." && (
                                                                <div className="small text-muted mt-1">Uploading…</div>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        {/* FOOTER */}
                        <div className="modal-footer">
                            <button className="btn btn-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button
                                className="btn btn-gold"
                                onClick={handleSave}
                                disabled={isSavingInventory}
                            >
                                {isSavingInventory ? "Saving..." : "Save Item"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <div
                className="modal fade"
                id="editInventoryModal"
                tabIndex="-1"
            >
                <div className="modal-dialog modal-xl">
                    <div className="modal-content custom-modal">
                        <div className="modal-header">
                            <h5 className="modal-title">Edit Inventory Item</h5>
                            <button className="btn-close" data-bs-dismiss="modal"></button>
                        </div>

                        <div className="modal-body">
                            {editItem && (
                                <div className="container-fluid">
                                    <div className="row g-4">

                                        {/* ================= LEFT SIDE ================= */}
                                        <div className="col-lg-8">

                                            {/* COST */}
                                            <div className="info-section mb-4 p-2">
                                                <h5 className="section-title">🟧 Cost Details</h5>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={editBaseCostPrice}
                                                    onChange={(e) => setEditBaseCostPrice(e.target.value)}
                                                />
                                            </div>

                                            {/* PRODUCT DETAILS */}
                                            <div className="info-section p-2">
                                                <h5 className="section-title">🟦 Product Details</h5>

                                                <div className="row g-3">
                                                    {inventoryFields
                                                        .filter(f => f.type !== "file")
                                                        .map(field => (
                                                            <div key={field._id} className="col-md-6">
                                                                <div className="info-box">
                                                                    <div className="info-label">{field.label}</div>

                                                                    {/* TEXT */}
                                                                    {field.type === "text" && (
                                                                        <input
                                                                            className="form-control"
                                                                            value={editValues[field._id] || ""}
                                                                            onChange={(e) =>
                                                                                setEditValues(p => ({ ...p, [field._id]: e.target.value }))
                                                                            }
                                                                        />
                                                                    )}

                                                                    {/* NUMBER */}
                                                                    {field.type === "number" && (
                                                                        <input
                                                                            type="number"
                                                                            className="form-control"
                                                                            value={editValues[field._id] || ""}
                                                                            onChange={(e) =>
                                                                                setEditValues(p => ({ ...p, [field._id]: e.target.value }))
                                                                            }
                                                                        />
                                                                    )}

                                                                    {/* CHECKBOX */}
                                                                    {field.type === "checkbox" && (
                                                                        <input
                                                                            type="checkbox"
                                                                            className="form-check-input"
                                                                            checked={!!editValues[field._id]}
                                                                            onChange={(e) =>
                                                                                setEditValues(p => ({ ...p, [field._id]: e.target.checked }))
                                                                            }
                                                                        />
                                                                    )}

                                                                    {/* SELECT */}
                                                                    {field.type === "select" && (
                                                                        <div className="border rounded p-2">
                                                                            {field.selectOptions?.map(opt => (
                                                                                <div key={opt._id} className="form-check">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        className="form-check-input"
                                                                                        checked={(editValues[field._id] || []).includes(opt.label)}
                                                                                        onChange={(e) => {
                                                                                            const prev = editValues[field._id] || [];
                                                                                            const updated = e.target.checked
                                                                                                ? [...prev, opt.label]
                                                                                                : prev.filter(v => v !== opt.label);

                                                                                            setEditValues(p => ({ ...p, [field._id]: updated }));
                                                                                        }}
                                                                                    />
                                                                                    <label className="form-check-label">{opt.label}</label>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* ================= RIGHT SIDE — IMAGES ================= */}
                                        <div className="col-lg-4">
                                            <div className="image-panel sticky-top">
                                                <h6 className="image-panel-title">🖼 Images</h6>

                                                {inventoryFields
                                                    .filter(f => f.type === "file")
                                                    .map(field => (
                                                        <div key={field._id} className="image-upload-box">
                                                            <div className="info-label">{field.label}</div>

                                                            {/* EXISTING IMAGE PREVIEW */}
                                                            {editValues[field._id] && (
                                                                <a
                                                                    href={editValues[field._id]}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="image-card mb-2"
                                                                >
                                                                    <img src={editValues[field._id]} alt={field.label} />
                                                                </a>
                                                            )}

                                                            {/* UPLOAD / REPLACE */}
                                                            <input
                                                                type="file"
                                                                className="form-control"
                                                                accept="image/*"
                                                                onChange={async (e) => {
                                                                    const file = e.target.files[0];
                                                                    if (!file) return;

                                                                    setEditValues(p => ({ ...p, [field._id]: "Uploading..." }));
                                                                    const url = await uploadToImgBB(file);
                                                                    setEditValues(p => ({ ...p, [field._id]: url || "" }));
                                                                }}
                                                            />

                                                            {/* EMPTY PLACEHOLDER */}
                                                            {!editValues[field._id] && (
                                                                <div className="small text-muted mt-1">No image uploaded</div>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" data-bs-dismiss="modal">
                                Cancel
                            </button>
                            <button
                                className="btn btn-gold"
                                onClick={handleUpdateInventory}
                                disabled={isUpdatingInventory}
                            >
                                {isUpdatingInventory ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>


            {/* SELL Modal */}
            <div className="modal fade" id="sellModal" tabIndex="-1" aria-hidden="true">
                <div className="modal-dialog modal-xl">
                    <div className="modal-content custom-modal">
                        <div className="modal-header">
                            <h5 className="modal-title">Create Order — Sell Item</h5>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>

                        <div className="modal-body">
                            {!sellModalItem ? (
                                <p className="text-muted">No item selected.</p>
                            ) : (
                                <>
                                    {/* PRODUCT DETAILS */}
                                    <h6 className="text-gold">Product Details (editable)</h6>
                                    <div className="row g-3 mb-4">
                                        {sellModalItem.fields
                                            ?.sort((a, b) => {
                                                const aRef = a.fieldRef?.showIn?.inventory?.serialNo || 0;
                                                const bRef = b.fieldRef?.showIn?.inventory?.serialNo || 0;
                                                return aRef - bRef;
                                            })
                                            .map((f) => {
                                                const fid = f.fieldRef?._id || f.fieldRef;
                                                const label = f.fieldRef?.label;
                                                const type = f.fieldRef?.type;

                                                return (
                                                    <div key={fid} className="col-md-6">
                                                        <label className="form-label fw-semibold">{label}</label>

                                                        {type === "text" && (
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                value={sellProductValues[fid] || ""}
                                                                onChange={(e) =>
                                                                    handleSellProductChange(fid, e.target.value)
                                                                }
                                                            />
                                                        )}
                                                        {type === "number" && (
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                value={sellProductValues[fid] || ""}
                                                                onChange={(e) =>
                                                                    handleSellProductChange(fid, e.target.value)
                                                                }
                                                            />
                                                        )}
                                                        {type === "select" && (
                                                            <select
                                                                className="form-select"
                                                                value={sellProductValues[fid] || ""}
                                                                onChange={(e) =>
                                                                    handleSellProductChange(fid, e.target.value)
                                                                }
                                                            >
                                                                <option value="">Select {label}</option>
                                                                {f.fieldRef?.selectOptions?.map((opt) => (
                                                                    <option key={opt._id} value={opt.label}>
                                                                        {opt.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        {type === "checkbox" && (
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input"
                                                                checked={!!sellProductValues[fid]}
                                                                onChange={(e) =>
                                                                    handleSellProductChange(fid, e.target.checked)
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>

                                    <hr />

                                    {/* CUSTOMER SOLD FIELDS */}
                                    <h6 className="text-gold mt-4">Customer Details</h6>

                                    <div className="row g-3">
                                        {soldFieldsDefs.map((sf) => (
                                            <div key={sf._id} className="col-md-6">
                                                <label className="form-label fw-semibold">
                                                    #{sf.showIn?.sold?.serialNo || "-"} {sf.label}
                                                </label>

                                                {sf.type === "text" && (
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={sellSoldValues[sf._id] || ""}
                                                        onChange={(e) =>
                                                            setSellSoldValues((prev) => ({
                                                                ...prev,
                                                                [sf._id]: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                )}

                                                {sf.type === "number" && (
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={sellSoldValues[sf._id] || ""}
                                                        onChange={(e) =>
                                                            setSellSoldValues((prev) => ({
                                                                ...prev,
                                                                [sf._id]: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <hr />

                                    {/* FINANCIAL SECTION */}
                                    <h6 className="text-gold mb-3">Pricing & Payments</h6>

                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Selling Price</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={sellingPrice}
                                                onChange={(e) => setSellingPrice(e.target.value)}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Discount</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={discount}
                                                onChange={(e) => setDiscount(e.target.value)}
                                            />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Final Price</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={finalPrice}
                                                disabled
                                            />
                                        </div>
                                    </div>

                                    {/* PAYMENTS SECTION */}
                                    <h6 className="text-gold mt-4">Customer Payments</h6>

                                    {payments.map((p, index) => (
                                        <div className="row g-3 align-items-end mb-2" key={index}>
                                            {/* AMOUNT */}
                                            <div className="col-md-3">
                                                <label className="form-label">Amount</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={p.amount}
                                                    onChange={(e) =>
                                                        handlePaymentChange(index, "amount", e.target.value)
                                                    }
                                                />
                                            </div>

                                            {/* DATE */}
                                            <div className="col-md-3">
                                                <label className="form-label">Date</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={p.date}
                                                    onChange={(e) =>
                                                        handlePaymentChange(index, "date", e.target.value)
                                                    }
                                                />
                                            </div>

                                            {/* MODE */}
                                            <div className="col-md-3">
                                                <label className="form-label">Mode</label>
                                                <select
                                                    className="form-select"
                                                    value={p.mode || "cash"}
                                                    onChange={(e) =>
                                                        handlePaymentChange(index, "mode", e.target.value)
                                                    }
                                                >
                                                    <option value="cash">Cash</option>
                                                    <option value="upi">UPI</option>
                                                    <option value="bank">Bank Transfer</option>
                                                    <option value="card">Card</option>
                                                    <option value="cheque">Cheque</option>
                                                    <option value="gold">Gold Exchange</option>
                                                </select>
                                            </div>

                                            {/* EXTRA DETAIL / NOTES */}
                                            <div className="col-md-3">
                                                <label className="form-label">
                                                    {getPaymentDetailLabel(p.mode)}
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={p.paidBy || ""}
                                                    onChange={(e) =>
                                                        handlePaymentChange(index, "paidBy", e.target.value)
                                                    }
                                                />
                                            </div>

                                            {/* REMOVE BUTTON (full width below on small screens) */}
                                            <div className="col-md-2 mt-2">
                                                <button
                                                    className="btn btn-outline-danger w-100"
                                                    onClick={() => removePaymentRow(index)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <button className="btn btn-gold mt-2" onClick={addPaymentRow}>
                                        + Add Payment
                                    </button>

                                    <hr />

                                    {/* TOTALS */}
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Total Paid</label>
                                            <input type="number" className="form-control" value={totalPaid} disabled />
                                        </div>

                                        <div className="col-md-4">
                                            <label className="form-label fw-semibold">Amount Due</label>
                                            <input type="number" className="form-control" value={amountDue} disabled />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button id="closeSellModalBtn" type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleConfirmSell}
                                disabled={isSelling}
                            >
                                {isSelling ? "Processing..." : "Confirm Sell"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ✅ Common Overview Panel (reuse component, no refetching) */}
            <OverviewPanel
                section="inventory"
                items={filteredInventoryItems}
                fields={fields}
                onSell={openSellModal}  // <-- must pass this
                onRefresh={fetchInventoryItems}
                onEdit={openEditModal}
            />
        </div>
    );
}