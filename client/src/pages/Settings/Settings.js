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

    const [expandedField, setExpandedField] = useState(null);

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
            <div className="settings-header">

                <div>

                    <h2>Dynamic Input Fields</h2>

                    <p>
                        Configure fields available throughout the application.
                    </p>

                </div>

                <button
                    className="btn-new-field"
                    data-bs-toggle="modal"
                    data-bs-target="#addFieldModal"
                >
                    <i className="bi bi-plus-lg"></i>
                    New Field
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

                            <div>

                                <h4 className="modal-title">

                                    {editFieldId
                                        ? "Edit Dynamic Field"
                                        : "Create Dynamic Field"}

                                </h4>

                                <p className="modal-subtitle">

                                    Configure reusable fields used throughout the system.

                                </p>

                            </div>

                            <button
                                className="btn-close"
                                data-bs-dismiss="modal"
                            />

                        </div>

                        <div className="modal-body">

                            {/* =======================================================
        GENERAL INFORMATION
    ======================================================= */}

                            <div className="modal-card">

                                <div className="modal-card-header">

                                    <div>

                                        <h5>General Information</h5>

                                        <p>
                                            Basic information about this dynamic field.
                                        </p>

                                    </div>

                                </div>

                                <div className="modal-grid">

                                    <div className="form-group">

                                        <label className="form-label">
                                            Field Label
                                        </label>

                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Example : Gross Weight"
                                            value={label}
                                            onChange={(e) =>
                                                setLabel(e.target.value)
                                            }
                                        />

                                    </div>

                                    <div className="form-group">

                                        <label className="form-label">
                                            Field Type
                                        </label>

                                        <select
                                            className="form-select"
                                            value={type}
                                            onChange={(e) =>
                                                setType(e.target.value)
                                            }
                                        >

                                            <option value="text">
                                                Text
                                            </option>

                                            <option value="number">
                                                Number
                                            </option>

                                            <option value="checkbox">
                                                Checkbox
                                            </option>

                                            <option value="file">
                                                File
                                            </option>

                                            <option value="select">
                                                Dropdown / Select
                                            </option>

                                        </select>

                                    </div>

                                </div>

                            </div>


                            {/* =======================================================
        NUMBER CONFIG
    ======================================================= */}

                            {

                                type === "number" &&

                                <div className="modal-card">

                                    <div className="modal-card-header">

                                        <div>

                                            <h5>Number Configuration</h5>

                                            <p>
                                                Select how this number should behave.
                                            </p>

                                        </div>

                                    </div>

                                    <div className="modal-grid">

                                        <div className="form-group">

                                            <label className="form-label">
                                                Number Type
                                            </label>

                                            <select
                                                className="form-select"
                                                value={numberSubType}
                                                onChange={(e) =>
                                                    setNumberSubType(e.target.value)
                                                }
                                            >

                                                <option value="">
                                                    Select...
                                                </option>

                                                <option value="currency">
                                                    Currency ₹
                                                </option>

                                                <option value="weight">
                                                    Weight
                                                </option>

                                                <option value="phone">
                                                    Phone
                                                </option>

                                                <option value="plain">
                                                    Plain Number
                                                </option>

                                            </select>

                                        </div>

                                    </div>

                                </div>

                            }


                            {/* =======================================================
        FILE CONFIG
    ======================================================= */}

                            {

                                type === "file" &&

                                <div className="modal-card">

                                    <div className="modal-card-header">

                                        <div>

                                            <h5>File Configuration</h5>

                                            <p>
                                                Allowed upload type.
                                            </p>

                                        </div>

                                    </div>

                                    <div className="modal-grid">

                                        <div className="form-group">

                                            <label className="form-label">
                                                File Type
                                            </label>

                                            <select
                                                className="form-select"
                                                value={fileType}
                                                onChange={(e) =>
                                                    setFileType(e.target.value)
                                                }
                                            >

                                                <option value="">
                                                    Select...
                                                </option>

                                                <option value="image">
                                                    Image
                                                </option>

                                                <option
                                                    value="pdf"
                                                    disabled
                                                >
                                                    PDF
                                                </option>

                                            </select>

                                        </div>

                                    </div>

                                </div>

                            }
                            {/* =======================================================
    SELECT OPTIONS
======================================================= */}

                            {

                                type === "select" &&

                                <div className="modal-card">

                                    <div className="modal-card-header">

                                        <div>

                                            <h5>Dropdown Options</h5>

                                            <p>
                                                Configure values available in the dropdown.
                                            </p>

                                        </div>

                                    </div>

                                    <div className="option-editor">

                                        {

                                            selectOptions.map((opt, index) => (

                                                <div
                                                    key={opt.id}
                                                    className="option-input-row"
                                                >

                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        placeholder={`Option ${index + 1}`}
                                                        value={opt.value}
                                                        onChange={(e) =>
                                                            updateOptionValue(
                                                                opt.id,
                                                                e.target.value
                                                            )
                                                        }
                                                    />

                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger"
                                                        onClick={() =>
                                                            removeOption(opt.id)
                                                        }
                                                        disabled={
                                                            selectOptions.length === 1
                                                        }
                                                    >
                                                        Remove
                                                    </button>

                                                </div>

                                            ))

                                        }

                                        <button
                                            type="button"
                                            className="btn btn-primary option-add-btn"
                                            onClick={addOption}
                                        >
                                            + Add Option
                                        </button>

                                    </div>

                                </div>

                            }



                            {/* =======================================================
    VISIBILITY
======================================================= */}

                            <div className="modal-card">

                                <div className="modal-card-header">

                                    <div>

                                        <h5>Visibility</h5>

                                        <p>
                                            Choose where this field should appear.
                                        </p>

                                    </div>

                                </div>

                                <div className="visibility-grid">

                                    {

                                        ["inventory", "orders", "sold"].map(section => (

                                            <div
                                                key={section}
                                                className={`visibility-card ${showIn[section]
                                                        ? "active"
                                                        : ""
                                                    }`}
                                            >

                                                <div className="visibility-header">

                                                    <div className="visibility-title">

                                                        <input

                                                            type="checkbox"

                                                            checked={
                                                                showIn[section]
                                                            }

                                                            onChange={() =>
                                                                handleShowInChange(section)
                                                            }

                                                        />

                                                        <span>

                                                            {

                                                                section.charAt(0)
                                                                    .toUpperCase()

                                                                +

                                                                section.slice(1)

                                                            }

                                                        </span>

                                                    </div>

                                                    {

                                                        showIn[section]

                                                        &&

                                                        <span className="visibility-badge">

                                                            Enabled

                                                        </span>

                                                    }

                                                </div>

                                                {

                                                    showIn[section]

                                                    &&

                                                    <div className="visibility-body">

                                                        <div className="form-group">

                                                            <label>

                                                                Display Order

                                                            </label>

                                                            <input

                                                                type="number"

                                                                className="form-control"

                                                                placeholder="Serial"

                                                                value={
                                                                    serialNumbers[
                                                                    section
                                                                    ]
                                                                }

                                                                onChange={(e) =>

                                                                    setSerialNumbers(

                                                                        prev => ({

                                                                            ...prev,

                                                                            [section]:
                                                                                e.target.value

                                                                        })

                                                                    )

                                                                }

                                                            />

                                                        </div>

                                                        <div className="overview-box">

                                                            <label className="overview-check">

                                                                <input

                                                                    type="checkbox"

                                                                    checked={
                                                                        overview[
                                                                        section
                                                                        ]
                                                                    }

                                                                    onChange={() =>

                                                                        handleOverviewChange(
                                                                            section
                                                                        )

                                                                    }

                                                                />

                                                                Show in Overview

                                                            </label>

                                                            {

                                                                overview[
                                                                section
                                                                ]

                                                                &&

                                                                <input

                                                                    type="number"

                                                                    className="form-control mt-2"

                                                                    placeholder="Overview Order"

                                                                    value={

                                                                        overviewSerialNumbers[
                                                                        section
                                                                        ]

                                                                    }

                                                                    onChange={(e) =>

                                                                        setOverviewSerialNumbers(

                                                                            prev => ({

                                                                                ...prev,

                                                                                [section]:
                                                                                    e.target.value

                                                                            })

                                                                        )

                                                                    }

                                                                />

                                                            }

                                                        </div>

                                                    </div>

                                                }

                                            </div>

                                        ))

                                    }

                                </div>

                            </div>
                        </div>
                        <div className="modal-footer">

                            <button
                                type="button"
                                className="btn btn-light modal-btn-cancel"
                                data-bs-dismiss="modal"
                                id="closeModalBtn"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="btn modal-btn-save"
                                onClick={handleSaveField}
                            >
                                {editFieldId
                                    ? "Update Field"
                                    : "Create Field"}
                            </button>

                        </div>
                    </div>
                </div>
            </div>

            {/* ----------------------------------------------------
                Existing Input Fields — Grouped by Category
               ---------------------------------------------------- */}
            <div className="existing-fields">

                <div className="settings-toolbar">
                    <div>
                        <h4 className="settings-title">Existing Input Fields</h4>
                        <p className="settings-subtitle">
                            Manage all dynamic fields used across Inventory, Orders and Sold.
                        </p>
                    </div>
                </div>

                {["inventory", "orders", "sold"].map((section) => {

                    const filtered = fields
                        .filter(f => f.showIn[section]?.show)
                        .sort(
                            (a, b) =>
                                (a.showIn[section].serialNo || 0) -
                                (b.showIn[section].serialNo || 0)
                        );

                    return (

                        <div key={section} className="settings-section">

                            <div className="settings-section-header">

                                <h5 className="settings-section-title">
                                    {section}
                                    <span className="section-count">
                                        {filtered.length}
                                    </span>
                                </h5>

                                <div className="settings-divider"></div>

                            </div>

                            {

                                filtered.length === 0 ?

                                    <div className="empty-section">
                                        No fields added.
                                    </div>

                                    :

                                    <div className="settings-list">

                                        {

                                            filtered.map(field => {

                                                const expanded =
                                                    expandedField === field._id;

                                                return (

                                                    <div
                                                        key={field._id}
                                                        className={`settings-item ${expanded ? "expanded" : ""}`}
                                                    >

                                                        {/* SUMMARY */}

                                                        <div
                                                            className="settings-summary"
                                                            onClick={() =>
                                                                setExpandedField(
                                                                    expanded
                                                                        ? null
                                                                        : field._id
                                                                )
                                                            }
                                                        >

                                                            <div className="summary-left">

                                                                <span className="expand-icon">
                                                                    {expanded ? "▼" : "▶"}
                                                                </span>

                                                                <span className="serial-badge">
                                                                    #
                                                                    {field.showIn[section]?.serialNo}
                                                                </span>

                                                                <span className="field-name">
                                                                    {field.label}
                                                                </span>

                                                            </div>

                                                            <div className="summary-right">

                                                                <span className="badge badge-type">
                                                                    {field.type}
                                                                </span>

                                                                {

                                                                    field.numberSubType &&

                                                                    <span className="badge">
                                                                        {field.numberSubType}
                                                                    </span>

                                                                }

                                                                {

                                                                    field.fileType &&

                                                                    <span className="badge">
                                                                        {field.fileType}
                                                                    </span>

                                                                }

                                                            </div>

                                                        </div>

                                                        {/* DETAILS */}

                                                        {

                                                            expanded &&

                                                            <div className="settings-details">

                                                                <div className="details-grid">

                                                                    <div>

                                                                        <h6>Visibility</h6>

                                                                        <div className="badge-group">

                                                                            {

                                                                                ["inventory", "orders", "sold"]
                                                                                    .filter(
                                                                                        x =>
                                                                                            field.showIn[x]?.show
                                                                                    )
                                                                                    .map(x => (

                                                                                        <span
                                                                                            key={x}
                                                                                            className="badge"
                                                                                        >
                                                                                            {x}
                                                                                        </span>

                                                                                    ))

                                                                            }

                                                                        </div>

                                                                    </div>

                                                                    {

                                                                        field.type === "select"
                                                                        &&
                                                                        field.selectOptions?.length > 0 &&

                                                                        <div>

                                                                            <h6>Options</h6>

                                                                            <div className="badge-group">

                                                                                {

                                                                                    field.selectOptions.map(opt => (

                                                                                        <span
                                                                                            key={opt._id}
                                                                                            className="badge"
                                                                                        >
                                                                                            {opt.label}
                                                                                        </span>

                                                                                    ))

                                                                                }

                                                                            </div>

                                                                        </div>

                                                                    }

                                                                    {

                                                                        field.showIn[section]?.overview?.show &&

                                                                        <div>

                                                                            <h6>Overview Position</h6>

                                                                            <span className="badge">

                                                                                #

                                                                                {

                                                                                    field.showIn[section]
                                                                                        .overview
                                                                                        .serialNo

                                                                                }

                                                                            </span>

                                                                        </div>

                                                                    }

                                                                </div>

                                                                <div className="details-actions">

                                                                    <button
                                                                        className="btn-gold-outline-sm btn"
                                                                        onClick={() =>
                                                                            handleEditField(field)
                                                                        }
                                                                    >
                                                                        Edit
                                                                    </button>

                                                                    <button
                                                                        className="btn-danger-outline-sm btn"
                                                                        onClick={() =>
                                                                            handleDeleteField(field._id)
                                                                        }
                                                                    >
                                                                        Delete
                                                                    </button>

                                                                </div>

                                                            </div>

                                                        }

                                                    </div>

                                                );

                                            })

                                        }

                                    </div>

                            }

                        </div>

                    );

                })}

            </div>


        </div>
    );
}