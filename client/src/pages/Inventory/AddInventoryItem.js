import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../api/axios";
import { notify } from "../../components/Toast/toast";
import "./AddInventoryItem.css";
import {
  FiSave,
  FiX,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiChevronRight,
  FiLayers,
} from "react-icons/fi";

import LogoLoader from "../../components/Loader/LogoLoader";

const CATEGORIES = [
  "Necklace / హారం (Haram)",
  "Kasulaperu / కాసుల పేరు",
  "Guttapusalu / గుట్టపూసలు",
  "Kante / కంటె (Choker)",
  "Mangalsutra / నల్లపూసలు (Nallapusalu / పుస్తెల తాడు)",
  "Chain / గొలుసు (Golusu)",
  "Pendant / లాకెట్ (Locket / డాలర్)",
  "Earrings / బుట్టలు (Buttalu / Jhumkas)",
  "Champaswaralu / చెవి మాటీలు (Ear Chains)",
  "Bangles / గాజులు (Gajulu / Kadas)",
  "Vanki / వంకీ (Armlet / Bajuband)",
  "Waist Belt / వడ్డాణం (Vaddanam)",
  "Pattilu / పట్టీలు (Anklets / Payal)",
  "Mettelu / మెట్టెలు (Toe Rings)",
  "Mukkupudaka / ముక్కుపుడక (Nose Pin)",
  "Ring / ఉంగరం (Ungaram)",
  "Bracelet / బ్రాస్‌లెట్",
  "Gold Coin / Bar (బంగారు నాణెం / బిస్కెట్)",
  "Pooja Articles & Silver / వెండి పూజ సామాగ్రి",
  "Baby Jewellery / పిల్లల దిష్టి గాజులు / ఉయ్యాలలు",
  "Other Jewellery / ఇతర ఆభరణాలు",
];

const PURITY_OPTIONS = [
  { label: "24K (99.9% Pure Gold)", value: 99.9 },
  { label: "22K (91.6% Hallmark 916)", value: 91.6 },
  { label: "18K (75.0% Hallmark 750)", value: 75.0 },
  { label: "14K (58.5% Hallmark 585)", value: 58.5 },
  { label: "9K (37.5% Hallmark 375)", value: 37.5 },
];

const METAL_TYPES = ["Gold", "Rose Gold", "White Gold", "Dual Tone Gold", "Platinum", "Silver"];
const GENDERS = ["Women", "Men", "Unisex", "Kids"];
const OCCASIONS = ["Daily & Traditional", "Bridal / Wedding", "Festive", "Party / Evening", "Engagement", "Investment & Gifting"];
const PURCHASE_TYPES = ["Cash", "Credit", "Gold Exchange", "Other"];

export default function AddInventoryItem() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);


  // Form State (Cleaned of all removed fields)
  const [formData, setFormData] = useState({
    productID: "",
    barcode: "",
    productName: "",
    description: "",

    category: "Necklace",
    gender: "Women",
    occasion: "Bridal / Wedding",
    tags: [],

    metalType: "Gold",
    purity: 91.6,

    grossWeight: 0,
    stoneWeight: 0,
    otherWeight: 0,
    netWeight: 0,

    stones: [],
    stoneComposition: "",

    wholeSellerId: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseInvoiceNumber: "",
    purchaseType: "Cash",
    purchaseGoldRate: 0,
    goldValueAtPurchase: 0,
    purchaseMakingCharge: 0,
    purchaseStoneCost: 0,
    purchaseOtherCost: 0,

    baseCostPrice: "",
    totalCostPrice: "",

    productImage: "",
    productImages: [],
    notes: "",
  });

  const [tagInput, setTagInput] = useState("");

  // Fetch Wholesalers for purchase section
  const { data: wholesalers = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await api.get("/contacts");
      return res.data.contacts || [];
    }
  });

  // Fetch item data if in edit mode
  const { data: itemData, isLoading: itemLoading, error: itemError } = useQuery({
    queryKey: ['inventory', id],
    queryFn: async () => {
      const res = await api.get(`/inventory/${id}`);
      return res.data.data;
    },
    enabled: isEditMode,
  });

  useEffect(() => {
    if (itemData) {
      setFormData({
        ...itemData,
        wholeSellerId: itemData.wholeSellerId?._id || itemData.wholeSellerId || "",
        purchaseDate: itemData.purchaseDate ? new Date(itemData.purchaseDate).toISOString().slice(0, 10) : "",
        stones: itemData.stones || [],
        tags: itemData.tags || [],
        productImages: itemData.productImages || [],
      });
    }
    if (itemError) {
      console.error("Error loading item:", itemError);
      notify.error("Failed to load inventory item");
    }
  }, [itemData, itemError]);

  // Recalculate Net Weight automatically
  const handleWeightChange = (field, val) => {
    const num = parseFloat(val) || 0;
    setFormData((prev) => {
      const gross = field === "grossWeight" ? num : parseFloat(prev.grossWeight) || 0;
      const stone = field === "stoneWeight" ? num : parseFloat(prev.stoneWeight) || 0;
      const other = field === "otherWeight" ? num : parseFloat(prev.otherWeight) || 0;
      const calculatedNet = Math.max(0, gross - stone - other);

      const next = { ...prev, [field]: val };
      if (field !== "netWeight") {
        next.netWeight = Number(calculatedNet.toFixed(3));
      }
      return next;
    });
  };

  // Recalculate Stone Weight from stones array
  const handleStoneChange = (index, field, value) => {
    const updatedStones = [...formData.stones];
    updatedStones[index] = { ...updatedStones[index], [field]: value };

    // Total stone weight in grams
    const totalStoneWeightGrams = updatedStones.reduce((sum, st) => {
      const w = parseFloat(st.weight) || 0;
      if (st.unit === "ct") return sum + w * 0.2; // 1 carat = 0.2g
      if (st.unit === "mg") return sum + w * 0.001;
      return sum + w;
    }, 0);

    const gross = parseFloat(formData.grossWeight) || 0;
    const other = parseFloat(formData.otherWeight) || 0;
    const newNet = Math.max(0, gross - totalStoneWeightGrams - other);

    setFormData((prev) => ({
      ...prev,
      stones: updatedStones,
      stoneWeight: Number(totalStoneWeightGrams.toFixed(3)),
      netWeight: Number(newNet.toFixed(3)),
    }));
  };

  const handleAddStone = () => {
    setFormData((prev) => ({
      ...prev,
      stones: [
        ...prev.stones,
        {
          type: "Diamond",
          color: "F-G",
          quantity: 1,
          weight: 0,
          unit: "ct",
          quality: "VVS",
          shape: "Round",
          certification: "IGI",
          value: 0,
        },
      ],
    }));
  };

  const handleRemoveStone = (index) => {
    const updatedStones = formData.stones.filter((_, i) => i !== index);
    const totalStoneWeightGrams = updatedStones.reduce((sum, st) => {
      const w = parseFloat(st.weight) || 0;
      if (st.unit === "ct") return sum + w * 0.2;
      if (st.unit === "mg") return sum + w * 0.001;
      return sum + w;
    }, 0);

    const gross = parseFloat(formData.grossWeight) || 0;
    const other = parseFloat(formData.otherWeight) || 0;
    const newNet = Math.max(0, gross - totalStoneWeightGrams - other);

    setFormData((prev) => ({
      ...prev,
      stones: updatedStones,
      stoneWeight: Number(totalStoneWeightGrams.toFixed(3)),
      netWeight: Number(newNet.toFixed(3)),
    }));
  };

  // Add Tag
  const handleAddTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const uploadToImgBB = async (file) => {
    const formData = new FormData();
    formData.append("key", "8451f34223c6e62555eec9187d855f8f");
    formData.append("image", file);
    setUploading(true);
    try {
      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && (data.data?.display_url || data.data?.url)) {
        return data.data.display_url || data.data.url;
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err) {
      console.error("Image upload failed", err);
      notify.error("Image upload failed: " + err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  // Image Upload handler (Uploads to ImgBB)
  const handleImageFile = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const uploadedUrl = await uploadToImgBB(file);
      if (uploadedUrl) {
        setFormData((prev) => ({ ...prev, [fieldName]: uploadedUrl }));
      }
    } catch (err) {
      console.error("Primary image upload error", err);
    }
  };

  const handleMultipleImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      try {
        const uploadedUrl = await uploadToImgBB(file);
        if (uploadedUrl) {
          setFormData((prev) => ({
            ...prev,
            productImages: [...prev.productImages, uploadedUrl],
          }));
        }
      } catch (err) {
        console.error("Multiple image upload error", err);
      }
    }
  };

  const handleRemoveProductImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      productImages: prev.productImages.filter((_, i) => i !== indexToRemove),
    }));
  };

  // Save Item
  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.productName.trim()) {
      notify.error("Please enter a Product Name.");
      return;
    }

    if (formData.baseCostPrice === "" || isNaN(Number(formData.baseCostPrice))) {
      notify.error("Please enter a valid Base Cost Price.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        baseCostPrice: Number(formData.baseCostPrice),
        totalCostPrice: Number(formData.totalCostPrice || formData.baseCostPrice),
        grossWeight: Number(formData.grossWeight || 0),
        stoneWeight: Number(formData.stoneWeight || 0),
        otherWeight: Number(formData.otherWeight || 0),
        netWeight: Number(formData.netWeight || 0),
        purity: Number(formData.purity || 91.6),
        wholeSellerId: formData.wholeSellerId || null,
        inStock: true,
      };

      let res;
      if (isEditMode) {
        res = await api.put(`/inventory/${id}`, payload);
      } else {
        res = await api.post("/inventory", payload);
      }

      if (res.data.success) {
        notify.success(isEditMode ? "Inventory item updated successfully!" : "Inventory item added successfully!");
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
        navigate("/inventory");
      }
    } catch (err) {
      console.error("Save error:", err);
      notify.error(err.response?.data?.message || "Failed to save inventory item.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-inventory-page">
      {isEditMode && itemLoading && (
        <LogoLoader
          fullScreen={true}
          text="Loading product details..."
        />
      )}
      {(loading || uploading) && (
        <LogoLoader 
          fullScreen={true} 
          text={uploading ? "Uploading Image..." : "Saving Item..."} 
        />
      )}
      {/* HEADER & ACTION BUTTONS */}
      <header className="add-inv-header">
        <div className="add-inv-header__left">
          <nav className="add-inv-breadcrumbs">
            <Link to="/inventory">Inventory</Link>
            <FiChevronRight size={14} />
            <span>Items</span>
            <FiChevronRight size={14} />
            <span className="current">{isEditMode ? "Edit Item" : "Add New Item"}</span>
          </nav>
          <h1 className="add-inv-title">{isEditMode ? "Edit Inventory Item" : "Add New Inventory Item"}</h1>
          <p className="add-inv-subtitle">Enter item details to add new inventory</p>
        </div>

        <div className="add-inv-header__actions">
          <button
            type="button"
            className="btn btn-outline-secondary rounded-pill px-4"
            onClick={() => navigate("/inventory")}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-gold-solid rounded-pill px-4 shadow-sm"
            onClick={handleSave}
            disabled={loading || uploading}
          >
            <FiSave className="me-2" /> {loading ? "Saving..." : uploading ? "Uploading Image..." : "Save Item"}
          </button>
        </div>
      </header>

      {/* FORM BODY GRID */}
      <form className="add-inv-form" onSubmit={handleSave}>
        <div className="add-inv-main-col">
          {/* SECTION 1: BASIC INFORMATION */}
          <div className="add-inv-card">
            <h3 className="add-inv-card__title">1. Basic Information</h3>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Product ID</label>
                <input
                  type="text"
                  className="form-control add-inv-input-disabled"
                  value={formData.productID || "Auto Generated on Save"}
                  disabled
                />
              </div>

              <div className="col-md-6">
                <label className="form-label">
                  🔲 Barcode / QR
                </label>
                <input
                  type="text"
                  className="form-control add-inv-input-disabled"
                  value={formData.barcode || "Auto Generated Unique Barcode"}
                  disabled
                />
              </div>

              <div className="col-md-12">
                <label className="form-label">
                  Product Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter product name"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  required
                />
              </div>

              <div className="col-md-12">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Enter description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: CLASSIFICATION */}
          <div className="add-inv-card">
            <h3 className="add-inv-card__title">2. Classification</h3>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">
                  Category <span className="text-danger">*</span>
                </label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Gender</label>
                <select
                  className="form-select"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4">
                <label className="form-label">Occasion</label>
                <select
                  className="form-select"
                  value={formData.occasion}
                  onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                >
                  {OCCASIONS.map((occ) => (
                    <option key={occ} value={occ}>
                      {occ}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-12">
                <label className="form-label">Tags</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. wedding, antique, luxury (Press Enter to add)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                />
                {formData.tags.length > 0 && (
                  <div className="add-inv-tags mt-2">
                    {formData.tags.map((t, idx) => (
                      <span key={idx} className="add-inv-tag-pill">
                        {t}
                        <button type="button" onClick={() => handleRemoveTag(t)}>
                          <FiX size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3 & 4 IN TWO COLUMNS: METAL / GOLD & WEIGHTS */}
          <div className="row g-3">
            <div className="col-md-6">
              <div className="add-inv-card h-100">
                <h3 className="add-inv-card__title">3. Metal / Gold Information</h3>
                <div className="row g-3">
                  <div className="col-md-12">
                    <label className="form-label">
                      Metal Type <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.metalType}
                      onChange={(e) => setFormData({ ...formData, metalType: e.target.value })}
                    >
                      {METAL_TYPES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-12">
                    <label className="form-label">
                      Purity <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={formData.purity}
                      onChange={(e) => setFormData({ ...formData, purity: Number(e.target.value) })}
                    >
                      {PURITY_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="add-inv-card h-100">
                <h3 className="add-inv-card__title">4. Weights (in grams)</h3>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">
                      Gross Weight <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-control form-control-sm"
                      placeholder="0.000"
                      value={formData.grossWeight}
                      onChange={(e) => handleWeightChange("grossWeight", e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Stone Weight</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-control form-control-sm"
                      placeholder="0.000"
                      value={formData.stoneWeight}
                      onChange={(e) => handleWeightChange("stoneWeight", e.target.value)}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Other Weight</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-control form-control-sm"
                      placeholder="0.000"
                      value={formData.otherWeight}
                      onChange={(e) => handleWeightChange("otherWeight", e.target.value)}
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label small fw-bold text-gold">Net Weight</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-control form-control-sm fw-bold border-gold"
                      placeholder="0.000"
                      value={formData.netWeight}
                      onChange={(e) => handleWeightChange("netWeight", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: STONES */}
          <div className="add-inv-card">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h3 className="add-inv-card__title mb-0">5. Stones</h3>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                onClick={handleAddStone}
              >
                <FiPlus className="me-1" /> Add Another Stone
              </button>
            </div>

            {formData.stones.length > 0 && (
              <div className="table-responsive mb-3">
                <table className="table table-bordered table-sm add-inv-stone-table align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "35px" }}>#</th>
                      <th>Type</th>
                      <th>Color</th>
                      <th style={{ width: "65px" }}>Qty</th>
                      <th style={{ width: "75px" }}>Weight</th>
                      <th style={{ width: "75px" }}>Unit</th>
                      <th>Quality</th>
                      <th>Shape</th>
                      <th>Certification</th>
                      <th style={{ width: "85px" }}>Value (₹)</th>
                      <th style={{ width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.stones.map((st, idx) => (
                      <tr key={idx}>
                        <td className="text-center text-muted small">{idx + 1}</td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="e.g. Diamond"
                            value={st.type}
                            onChange={(e) => handleStoneChange(idx, "type", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="e.g. D-F"
                            value={st.color}
                            onChange={(e) => handleStoneChange(idx, "color", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={st.quantity}
                            onChange={(e) => handleStoneChange(idx, "quantity", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control form-control-sm"
                            value={st.weight}
                            onChange={(e) => handleStoneChange(idx, "weight", e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={st.unit}
                            onChange={(e) => handleStoneChange(idx, "unit", e.target.value)}
                          >
                            <option value="ct">ct</option>
                            <option value="g">g</option>
                            <option value="mg">mg</option>
                            <option value="piece">pc</option>
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="e.g. VVS1"
                            value={st.quality}
                            onChange={(e) => handleStoneChange(idx, "quality", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="e.g. Round"
                            value={st.shape}
                            onChange={(e) => handleStoneChange(idx, "shape", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="IGI / GIA"
                            value={st.certification}
                            onChange={(e) => handleStoneChange(idx, "certification", e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={st.value}
                            onChange={(e) => handleStoneChange(idx, "value", e.target.value)}
                          />
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm p-1 border-0"
                            onClick={() => handleRemoveStone(idx)}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-2">
              <label className="form-label small">Stone Composition</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="e.g. Diamond: 0.50ct, Ruby: 2pcs (Optional summary of stones)"
                value={formData.stoneComposition}
                onChange={(e) => setFormData({ ...formData, stoneComposition: e.target.value })}
              />
            </div>
          </div>

          {/* SECTION 6: PURCHASE & COST LEDGER */}
          <div className="add-inv-card add-inv-card--ledger">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 className="add-inv-card__title mb-0">6. Purchase & Cost Ledger</h3>
              {parseFloat(formData.netWeight) > 0 && parseFloat(formData.baseCostPrice) > 0 && (
                <span className="ledger-cost-per-g-pill">
                  Per Gram (Cost): ₹{(parseFloat(formData.baseCostPrice) / parseFloat(formData.netWeight)).toLocaleString(undefined, { maximumFractionDigits: 2 })} / g
                </span>
              )}
            </div>

            {/* PART A: SUPPLIER & INVOICE DETAILS */}
            <div className="ledger-sub-section mb-3">
              <span className="ledger-sub-label">Supplier & Procurement Details</span>
              <div className="row g-3 mt-1">
                <div className="col-md-3">
                  <label className="form-label small">Wholesaler / Supplier</label>
                  <select
                    className="form-select"
                    value={formData.wholeSellerId}
                    onChange={(e) => setFormData({ ...formData, wholeSellerId: e.target.value })}
                  >
                    <option value="">Select wholesaler</option>
                    {wholesalers.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-3">
                  <label className="form-label small">Purchase Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label small">Invoice / Bill Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. INV-2025-089"
                    value={formData.purchaseInvoiceNumber}
                    onChange={(e) => setFormData({ ...formData, purchaseInvoiceNumber: e.target.value })}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label small">Purchase Type</label>
                  <select
                    className="form-select"
                    value={formData.purchaseType}
                    onChange={(e) => setFormData({ ...formData, purchaseType: e.target.value })}
                  >
                    {PURCHASE_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* PART B: COST BREAKDOWN CALCULATOR */}
            <div className="ledger-sub-section mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <span className="ledger-sub-label">Cost Breakdown & Calculation</span>
                <button
                  type="button"
                  className="btn btn-link btn-sm text-gold p-0 text-decoration-none fw-bold"
                  onClick={() => {
                    const goldVal = parseFloat(formData.goldValueAtPurchase) || 0;
                    const mc = parseFloat(formData.purchaseMakingCharge) || 0;
                    const stone = parseFloat(formData.purchaseStoneCost) || 0;
                    const other = parseFloat(formData.purchaseOtherCost) || 0;
                    const sum = goldVal + mc + stone + other;
                    if (sum > 0) {
                      setFormData((prev) => ({
                        ...prev,
                        baseCostPrice: String(sum),
                        totalCostPrice: String(sum),
                      }));
                      notify.success(`Calculated Total Cost: ₹${sum.toLocaleString()}`);
                    } else {
                      notify.info("Enter gold value or making charges to calculate");
                    }
                  }}
                >
                  ⚡ Auto-Sum to Cost Price
                </button>
              </div>

              <div className="row g-2 mt-1 align-items-center">
                <div className="col-md-2">
                  <label className="form-label very-small text-muted">Gold Rate (₹/g)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="0.00"
                    value={formData.purchaseGoldRate}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      const val = Number((rate * (parseFloat(formData.netWeight) || 0)).toFixed(0));
                      setFormData({
                        ...formData,
                        purchaseGoldRate: e.target.value,
                        goldValueAtPurchase: val,
                      });
                    }}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label very-small text-muted">Gold Value (₹)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="0.00"
                    value={formData.goldValueAtPurchase}
                    onChange={(e) => setFormData({ ...formData, goldValueAtPurchase: e.target.value })}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label very-small text-muted">+ Making Charge (₹)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="0.00"
                    value={formData.purchaseMakingCharge}
                    onChange={(e) => setFormData({ ...formData, purchaseMakingCharge: e.target.value })}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label very-small text-muted">+ Stone Cost (₹)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="0.00"
                    value={formData.purchaseStoneCost}
                    onChange={(e) => setFormData({ ...formData, purchaseStoneCost: e.target.value })}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label very-small text-muted">+ Other Cost (₹)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="0.00"
                    value={formData.purchaseOtherCost}
                    onChange={(e) => setFormData({ ...formData, purchaseOtherCost: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* PART C: FINAL INVENTORY COST SUMMARY */}
            <div className="ledger-final-box">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">
                    Buying / Base Cost Price (₹) <span className="text-danger">*</span>
                  </label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text bg-white border-end-0 fw-bold text-success">₹</span>
                    <input
                      type="number"
                      className="form-control form-control-lg fw-bold border-start-0 text-success"
                      placeholder="0.00"
                      value={formData.baseCostPrice}
                      onChange={(e) => setFormData({ ...formData, baseCostPrice: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted">
                    Total Acquisition Cost (₹)
                  </label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text bg-white border-end-0 text-muted">₹</span>
                    <input
                      type="number"
                      className="form-control form-control-lg border-start-0"
                      placeholder="0.00"
                      value={formData.totalCostPrice}
                      onChange={(e) => setFormData({ ...formData, totalCostPrice: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 8: NOTES */}
          <div className="add-inv-card">
            <h3 className="add-inv-card__title">8. Notes</h3>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Enter any notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: IMAGES ONLY */}
        <div className="add-inv-side-col">
          {/* SECTION 9: IMAGES (PRIMARY & MULTIPLE ONLY) */}
          <div className="add-inv-card">
            <h3 className="add-inv-card__title">Product Images</h3>

            <div className="d-flex flex-column gap-3">
              {/* Primary Image */}
              <div>
                <label className="form-label small fw-bold">Primary / Main Image</label>
                <div className="add-inv-upload-zone add-inv-upload-zone--primary">
                  {formData.productImage ? (
                    <div className="add-inv-preview-box">
                      <img src={formData.productImage} alt="Primary" />
                      <button
                        type="button"
                        className="add-inv-preview-remove"
                        onClick={() => setFormData({ ...formData, productImage: "" })}
                      >
                        <FiX />
                      </button>
                    </div>
                  ) : (
                    <label className="add-inv-drop-area">
                      <FiUploadCloud size={30} className="text-muted mb-2" />
                      <span className="small fw-bold">Upload Main Image</span>
                      <span className="text-muted very-small">JPG, PNG up to 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="d-none"
                        onChange={(e) => handleImageFile(e, "productImage")}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Product Images (Multiple) */}
              <div>
                <label className="form-label small fw-bold">Additional Product Images</label>
                <div className="add-inv-upload-zone">
                  <label className="add-inv-drop-area">
                    <FiLayers size={26} className="text-muted mb-1" />
                    <span className="small fw-semibold">Upload Multiple Photos</span>
                    <span className="text-muted very-small">
                      {formData.productImages.length > 0
                        ? `${formData.productImages.length} photos selected`
                        : "JPG, PNG up to 5MB"}
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="d-none"
                      onChange={handleMultipleImages}
                    />
                  </label>
                </div>

                {formData.productImages.length > 0 && (
                  <div className="add-inv-multi-thumbs mt-2">
                    {formData.productImages.map((imgUrl, idx) => (
                      <div key={idx} className="add-inv-multi-thumb">
                        <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} />
                        <button
                          type="button"
                          className="add-inv-multi-thumb-remove"
                          onClick={() => handleRemoveProductImage(idx)}
                        >
                          <FiX size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
