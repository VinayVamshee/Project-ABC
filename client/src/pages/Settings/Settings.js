import { useState, useEffect } from "react";
import api from "../../api/axios";
import "./Settings.css"; // gold-white theme styling

export default function Settings() {
    const [label, setLabel] = useState("");
    const [type, setType] = useState("text");
    const [numberSubType, setNumberSubType] = useState("");
    const [fileType, setFileType] = useState("");
    const [showIn, setShowIn] = useState({
        inventory: false,
        orders: false,
        sold: false,
    });

    const [overview, setOverview] = useState({
        inventory: false,
        orders: false,
        sold: false,
    });

    const [serialNumbers, setSerialNumbers] = useState({
        inventory: "",
        orders: "",
        sold: "",
    });

    const [overviewSerialNumbers, setOverviewSerialNumbers] = useState({
        inventory: "",
        orders: "",
        sold: "",
    });

    // For select field options
    const [selectOptions, setSelectOptions] = useState([{ id: Date.now(), value: "" }]);

    // Toggle "Show in" section (Inventory, Orders, Sold)
    const handleShowInChange = (field) => {
        setShowIn((prev) => ({ ...prev, [field]: !prev[field] }));
        if (showIn[field]) setOverview((prev) => ({ ...prev, [field]: false }));
    };

    // Toggle Overview per section
    const handleOverviewChange = (field) => {
        setOverview((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    // Add new empty option
    const addOption = () => {
        setSelectOptions((prev) => [...prev, { id: Date.now(), value: "" }]);
    };

    // Remove an option by id
    const removeOption = (id) => {
        setSelectOptions((prev) => prev.filter((opt) => opt.id !== id));
    };

    // Update the value of a specific option
    const updateOptionValue = (id, value) => {
        setSelectOptions((prev) =>
            prev.map((opt) => (opt.id === id ? { ...opt, value } : opt))
        );
    };

    // ✅ Save or Update input field
    const handleSaveField = async () => {
        if (!label.trim()) {
            alert("Please enter a field label");
            return;
        }

        const formattedShowIn = {};
        ["inventory", "orders", "sold"].forEach((key) => {
            formattedShowIn[key] = showIn[key]
                ? {
                    show: true,
                    serialNo: Number(serialNumbers[key]) || 0,
                    overview: {
                        show: overview[key],
                        serialNo: Number(overviewSerialNumbers[key]) || 0,
                    },
                }
                : { show: false };
        });

        const fieldData = {
            label,
            type,
            numberSubType: type === "number" ? numberSubType : null,
            fileType: type === "file" ? fileType : null,
            selectOptions:
                type === "select"
                    ? selectOptions
                        .map((o) => ({
                            label: o.value.trim(),
                        }))
                        .filter((o) => o.label)
                    : [],
            showIn: formattedShowIn,
        };

        try {
            if (editFieldId) {
                // ✏️ UPDATE existing field
                const res = await api.put(`/fields/${editFieldId}`, fieldData);
                if (res.data.success) alert("Field updated successfully!");
            } else {
                // 🆕 CREATE new field
                const res = await api.post("/fields", fieldData);
                if (res.data.success) alert("Field created successfully!");
            }

            // Reset form
            setLabel("");
            setType("text");
            setNumberSubType("");
            setFileType("");
            setShowIn({ inventory: false, orders: false, sold: false });
            setOverview({ inventory: false, orders: false, sold: false });
            setEditFieldId(null);

            // Close modal & refresh list
            document.getElementById("closeModalBtn").click();
            fetchFields();
        } catch (error) {
            console.error("Error saving field:", error);
            alert(error.response?.data?.message || "Failed to save field.");
        }
    };

    const [fields, setFields] = useState([]); // stores all fields
    const [editFieldId, setEditFieldId] = useState(null); // if editing

    // ✅ Fetch all fields on page load
    const fetchFields = async () => {
        try {
            const res = await api.get("/fields");
            if (res.data.success) setFields(res.data.fields || []);
        } catch (err) {
            console.error("Error fetching fields:", err);
            alert("Failed to load fields from server");
        }
    };

    useEffect(() => {
        fetchFields();
    }, []);

    // ✅ Edit function
    const handleEditField = (field) => {
        setEditFieldId(field._id);
        setLabel(field.label);
        setType(field.type);
        setNumberSubType(field.numberSubType || "");
        setFileType(field.fileType || "");

        setShowIn({
            inventory: field.showIn.inventory?.show || false,
            orders: field.showIn.orders?.show || false,
            sold: field.showIn.sold?.show || false,
        });

        setOverview({
            inventory: field.showIn.inventory?.overview?.show || false,
            orders: field.showIn.orders?.overview?.show || false,
            sold: field.showIn.sold?.overview?.show || false,
        });

        // ✅ FIX HERE — convert backend { _id, label } → frontend { id, value }
        if (field.type === "select") {
            setSelectOptions(
                field.selectOptions && field.selectOptions.length > 0
                    ? field.selectOptions.map((opt) => ({
                        id: opt._id || Date.now() + Math.random(),
                        value: opt.label || "",
                    }))
                    : [{ id: Date.now(), value: "" }]
            );
        } else {
            setSelectOptions([{ id: Date.now(), value: "" }]);
        }

        // Open modal for editing
        const modal = new window.bootstrap.Modal(document.getElementById("addFieldModal"));
        modal.show();
    };


    // ✅ Delete function
    const handleDeleteField = async (id) => {
        if (!window.confirm("Are you sure you want to delete this field?")) return;

        try {
            const res = await api.delete(`/fields/${id}`);
            if (res.data.success) {
                alert("Field deleted successfully!");
                fetchFields();
            }
        } catch (error) {
            console.error("Error deleting field:", error);
            alert("Failed to delete field");
        }
    };

    return (
        <div className="settings-page">
            {/* Add Field Button */}
            <div className="d-flex justify-content-end mb-3">
                <button
                    type="button"
                    className="btn btn-gold"
                    data-bs-toggle="modal"
                    data-bs-target="#addFieldModal"
                >
                    + Add New Input Field
                </button>
            </div>

            {/* Modal */}
            <div
                className="modal fade"
                id="addFieldModal"
                tabIndex="-1"
                aria-labelledby="addFieldModalLabel"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-lg">
                    <div className="modal-content custom-modal">
                        <div className="modal-header">
                            <h5 className="modal-title" id="addFieldModalLabel">
                                {editFieldId
                                    ? `Editing: ${label || "Selected Field"}`
                                    : "Add New Input Field"}
                            </h5>

                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            ></button>
                        </div>

                        <div className="modal-body text-start">
                            {/* Label */}
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Field Label</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter field label"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                />
                            </div>

                            {/* Field Type */}
                            <div className="mb-3">
                                <label className="form-label fw-semibold">Field Type</label>
                                <select
                                    className="form-select"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                >
                                    <option value="text">Text (default)</option>
                                    <option value="number">Number</option>
                                    <option value="checkbox">Checkbox</option>
                                    <option value="file">File</option>
                                    <option value="select">Select / Options</option>
                                </select>
                            </div>

                            {/* Number Type */}
                            {type === "number" && (
                                <div className="mb-3 ms-3">
                                    <label className="form-label">Number Type</label>
                                    <select
                                        className="form-select"
                                        value={numberSubType}
                                        onChange={(e) => setNumberSubType(e.target.value)}
                                    >
                                        <option value="">Select Sub-Type</option>
                                        <option value="currency">Currency (₹)</option>
                                        <option value="weight">Weight (grams)</option>
                                        <option value="phone">Phone Number</option>
                                        <option value="plain">Plain Number</option>
                                    </select>
                                </div>
                            )}

                            {/* File Type */}
                            {type === "file" && (
                                <div className="mb-3 ms-3">
                                    <label className="form-label">File Type</label>
                                    <select
                                        className="form-select"
                                        value={fileType}
                                        onChange={(e) => setFileType(e.target.value)}
                                    >
                                        <option value="">Select File Type</option>
                                        <option value="image">Image</option>
                                        <option value="pdf" disabled>PDF</option>
                                    </select>
                                </div>
                            )}

                            {/* Select Options */}
                            {type === "select" && (
                                <div className="mb-3 ms-3">
                                    <label className="form-label fw-semibold text-gold">
                                        Select Options
                                    </label>

                                    {selectOptions.map((opt, idx) => (
                                        <div
                                            key={opt.id}
                                            className="d-flex align-items-center mb-2 option-input-row"
                                        >
                                            <input
                                                type="text"
                                                className="form-control form-control-sm me-2"
                                                placeholder={`Option ${idx + 1}`}
                                                value={opt.value}
                                                onChange={(e) => updateOptionValue(opt.id, e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => removeOption(opt.id)}
                                                disabled={selectOptions.length === 1}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-gold mt-2"
                                        onClick={addOption}
                                    >
                                        + Add Option
                                    </button>
                                </div>
                            )}

                            {/* Show Sections */}
                            <div className="show-section mt-4">
                                <h6 className="section-title">Show this field in:</h6>
                                <hr className="gold-divider" />

                                <div className="d-flex justify-content-around flex-wrap gap-3">
                                    {["inventory", "orders", "sold"].map((section) => (
                                        <div key={section} className="show-box">
                                            <div className="form-check d-flex justify-content-center align-items-center mb-2">
                                                <input
                                                    className="form-check-input me-2"
                                                    type="checkbox"
                                                    id={`show-${section}`}
                                                    checked={showIn[section]}
                                                    onChange={() => handleShowInChange(section)}
                                                />
                                                <label
                                                    className="form-check-label fw-semibold text-capitalize"
                                                    htmlFor={`show-${section}`}
                                                >
                                                    {section}
                                                </label>
                                            </div>

                                            {showIn[section] && (
                                                <>
                                                    <hr className="mini-divider" />
                                                    <div className="mt-2">
                                                        <input
                                                            type="number"
                                                            placeholder="Serial No."
                                                            className="form-control form-control-sm mb-2 mx-auto"
                                                            value={serialNumbers[section] || ""}
                                                            onChange={(e) =>
                                                                setSerialNumbers((prev) => ({ ...prev, [section]: e.target.value }))
                                                            }
                                                        />
                                                        <div className="form-check">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id={`overview-${section}`}
                                                                checked={overview[section]}
                                                                onChange={() => handleOverviewChange(section)}
                                                            />
                                                            <label
                                                                className="form-check-label"
                                                                htmlFor={`overview-${section}`}
                                                            >
                                                                Show in Overview
                                                            </label>
                                                        </div>
                                                        {overview[section] && (
                                                            <input
                                                                type="number"
                                                                placeholder="Overview Serial No."
                                                                className="form-control form-control-sm mt-2 mx-auto"
                                                                value={overviewSerialNumbers[section] || ""}
                                                                onChange={(e) =>
                                                                    setOverviewSerialNumbers((prev) => ({
                                                                        ...prev,
                                                                        [section]: e.target.value,
                                                                    }))
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer">
                            <button
                                type="button"
                                id="closeModalBtn"
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleSaveField}
                            >
                                {editFieldId ? "Update Field" : "Save Field"}
                            </button>

                        </div>
                    </div>
                </div>
            </div>

            {/* ----------------------------------------------------
                Existing Input Fields — Grouped by Category
               ---------------------------------------------------- */}
            <div className="existing-fields mt-5">
                <h4 className="fw-bold text-center mb-4 text-gold">📋 Existing Input Fields</h4>

                {["inventory", "orders", "sold"].map((section) => {
                    const filtered = fields
                        .filter((f) => f.showIn[section]?.show)
                        .sort(
                            (a, b) =>
                                (a.showIn[section].serialNo || 0) -
                                (b.showIn[section].serialNo || 0)
                        );

                    return (
                        <div key={section} className="mb-5">
                            <div className="d-flex align-items-center mb-3">
                                <h5 className="fw-semibold text-uppercase mb-0 me-3 text-gold">
                                    {section}
                                </h5>
                                <div className="flex-grow-1 border-top border-gold opacity-50"></div>
                            </div>

                            {filtered.length === 0 ? (
                                <p className="text-muted fst-italic ms-2">
                                    No fields added to {section}.
                                </p>
                            ) : (
                                <div className="row g-3">
                                    {filtered.map((field) => (
                                        <div key={field._id} className="col-6 col-md-4 col-lg-2">
                                            <div className="field-card h-100 d-flex flex-column justify-content-between">

                                                {/* Header */}
                                                <div className="field-card-header d-flex align-items-center justify-content-between">
                                                    <div className="serial-and-label d-flex align-items-center gap-2">
                                                        <span className="serial-display">#{field.showIn[section]?.serialNo || "-"}</span>
                                                        <h6 className="field-label mb-0 text-truncate">{field.label}</h6>
                                                    </div>
                                                </div>
                                                <hr className="field-divider" />

                                                {/* Body */}
                                                <div className="field-card-body flex-grow-1">
                                                    <p className="field-info">
                                                        <span>Type:</span> {field.type}
                                                    </p>
                                                    {field.numberSubType && (
                                                        <p className="field-info">
                                                            <span>Sub:</span> {field.numberSubType}
                                                        </p>
                                                    )}
                                                    {field.fileType && (
                                                        <p className="field-info">
                                                            <span>File:</span> {field.fileType}
                                                        </p>
                                                    )}
                                                    {field.showIn[section]?.overview?.show && (
                                                        <p className="field-info">
                                                            <span>Overview #:</span>{" "}
                                                            {field.showIn[section].overview.serialNo || "-"}
                                                        </p>
                                                    )}

                                                    {/* ✅ Select Options (if any) */}
                                                    {field.type === "select" && field.selectOptions?.length > 0 && (
                                                        <div className="mt-3">
                                                            <p className="field-info mb-1">
                                                                <span>Options:</span>
                                                            </p>
                                                            <div className="option-list">
                                                                {field.selectOptions.map((opt) => (
                                                                    <div key={opt._id} className="option-item">
                                                                        • {opt.label}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer */}
                                                <div className="field-card-footer d-flex justify-content-end align-items-center mt-auto pt-2">
                                                    <hr className="field-divider-footer" />
                                                    <div className="d-flex gap-2 mt-2">
                                                        <button
                                                            className="btn-gold-outline-sm"
                                                            onClick={() => handleEditField(field)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            className="btn-danger-outline-sm"
                                                            onClick={() => handleDeleteField(field._id)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>


                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>


        </div>
    );
}