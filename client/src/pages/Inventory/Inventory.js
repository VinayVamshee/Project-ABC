import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from "xlsx";
import JsBarcode from "jsbarcode";
import api from "../../api/axios";
import { notify } from "../../components/Toast/toast";
import "./Inventory.css";
import {
  FaBoxOpen,
  FaWeightHanging,
  FaMoneyBillWave,
  FaSearch,
  FaBarcode,
  FaFileExport,
  FaCloudUploadAlt,
  FaPlus,
  FaEye,
  FaEdit,
  FaEllipsisH,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaExpandAlt,
  FaCompressAlt,
  FaPrint,
  FaCrown,
  FaBell,
  FaBars,
  FaSlidersH,
  FaShareAlt,
  FaTrashAlt,
  FaCopy,
  FaFolder,
  FaGem,
} from "react-icons/fa";
import LogoLoader from "../../components/Loader/LogoLoader";
import BulkImportModal from "../../components/BulkImport/BulkImportModal";

// Visual Barcode SVG Component
const BarcodeSvg = ({ value }) => {
  const svgRef = useRef(null);
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 11,
          font: "Inter, -apple-system, sans-serif",
          textMargin: 3,
          lineColor: "#1C1917",
          background: "transparent",
        });
      } catch (e) {
        console.error("Barcode render error", e);
      }
    }
  }, [value]);

  return <svg ref={svgRef} className="barcode-svg" />;
};

export default function Inventory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [isExpandedView, setIsExpandedView] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showInStockOnly, setShowInStockOnly] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Mobile specific state (iPhone 15 Pro Max)
  const [mobileViewMode, setMobileViewMode] = useState("overview"); // "overview" | "full"
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileQuickMenuOpen, setMobileQuickMenuOpen] = useState(false);
  const [mobileItemActionsOpen, setMobileItemActionsOpen] = useState(false);
  const [mobilePurityFilter, setMobilePurityFilter] = useState("all");
  const [mobileMinWeight, setMobileMinWeight] = useState("");
  const [mobileMaxWeight, setMobileMaxWeight] = useState("");
  const [mobileMinPrice, setMobileMinPrice] = useState("");
  const [mobileMaxPrice, setMobileMaxPrice] = useState("");
  const [mobileSortBy, setMobileSortBy] = useState("recent");
  const [mobileSortOrder, setMobileSortOrder] = useState("desc");
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);



  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await api.get("/inventory");
      if (res.data.success) {
        return res.data.items || [];
      }
      throw new Error("Failed to load inventory");
    },
  });

  useEffect(() => {
    if (items.length > 0 && !selectedItem) {
      const inStockItems = items.filter((i) => i.inStock);
      if (inStockItems.length > 0) {
        setSelectedItem(inStockItems[0]);
        setActiveImageIndex(0);
      }
    }
  }, [items, selectedItem]);

  // Distinct categories
  const categoriesList = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean))
  );

  // Filter items
  const filteredItems = items
    .filter((item) => {
      if (showInStockOnly && !item.inStock) return false;
      if (selectedCategory !== "all" && item.category !== selectedCategory)
        return false;
      if (mobilePurityFilter !== "all" && String(item.purity) !== mobilePurityFilter)
        return false;
      if (mobileMinWeight && Number(item.netWeight || 0) < Number(mobileMinWeight))
        return false;
      if (mobileMaxWeight && Number(item.netWeight || 0) > Number(mobileMaxWeight))
        return false;
      if (mobileMinPrice && Number(item.baseCostPrice || 0) < Number(mobileMinPrice))
        return false;
      if (mobileMaxPrice && Number(item.baseCostPrice || 0) > Number(mobileMaxPrice))
        return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchName = item.productName?.toLowerCase().includes(term);
        const matchId = item.productID?.toLowerCase().includes(term);
        const matchCat = item.category?.toLowerCase().includes(term);
        const matchBarcode = item.barcode?.toLowerCase().includes(term);
        if (!matchName && !matchId && !matchCat && !matchBarcode) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (mobileSortBy === "netWeight") {
        return mobileSortOrder === "asc"
          ? (a.netWeight || 0) - (b.netWeight || 0)
          : (b.netWeight || 0) - (a.netWeight || 0);
      }
      if (mobileSortBy === "price") {
        return mobileSortOrder === "asc"
          ? (a.baseCostPrice || 0) - (b.baseCostPrice || 0)
          : (b.baseCostPrice || 0) - (a.baseCostPrice || 0);
      }
      if (mobileSortBy === "name") {
        return mobileSortOrder === "asc"
          ? (a.productName || "").localeCompare(b.productName || "")
          : (b.productName || "").localeCompare(a.productName || "");
      }
      // default: recent / ID desc
      return mobileSortOrder === "asc"
        ? (a.productID || "").localeCompare(b.productID || "")
        : (b.productID || "").localeCompare(a.productID || "");
    });

  // Calculate totals based ONLY on filtered items
  const calculateTotals = () => {
    let totalNet = 0;
    let totalGross = 0;
    let totalStone = 0;
    let totalCost = 0;
    filteredItems.forEach((item) => {
      totalNet += Number(item.netWeight || 0);
      totalGross += Number(item.grossWeight || 0);
      totalStone += Number(item.stoneWeight || 0);
      totalCost += Number(item.baseCostPrice || 0);
    });
    return { totalNet, totalGross, totalStone, totalCost };
  };

  const totals = calculateTotals();

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / rowsPerPage) || 1;
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleRowClick = (item) => {
    setSelectedItem(item);
    setActiveImageIndex(0);
  };

  const handleMobileCardClick = (item) => {
    setSelectedItem(item);
    setActiveImageIndex(0);
    setMobileDetailOpen(true);
  };

  const getCategoryColorClass = (cat) => {
    if (!cat) return "cat-default";
    const lower = cat.toLowerCase();
    if (lower.includes("coin") || lower.includes("bar") || lower.includes("kasu") || lower.includes("నాణెం")) return "cat-gold";
    if (lower.includes("bracelet") || lower.includes("vanki") || lower.includes("వంకీ")) return "cat-purple";
    if (lower.includes("belt") || lower.includes("vaddanam") || lower.includes("వడ్డాణం")) return "cat-blue";
    if (lower.includes("mangalsutra") || lower.includes("nalla") || lower.includes("నల్లపూసలు") || lower.includes("పుస్తెల")) return "cat-green";
    if (lower.includes("necklace") || lower.includes("haram") || lower.includes("హారం") || lower.includes("guttapusalu") || lower.includes("గుట్టపూసలు") || lower.includes("kante") || lower.includes("కంటె")) return "cat-teal";
    if (lower.includes("earring") || lower.includes("jhumka") || lower.includes("buttalu") || lower.includes("బుట్టలు") || lower.includes("చెవి")) return "cat-red";
    if (lower.includes("bangle") || lower.includes("gajulu") || lower.includes("గాజులు") || lower.includes("kada")) return "cat-indigo";
    if (lower.includes("ring") || lower.includes("ungaram") || lower.includes("ఉంగరం") || lower.includes("mettelu") || lower.includes("మెట్టెలు")) return "cat-orange";
    if (lower.includes("pattilu") || lower.includes("పట్టీలు") || lower.includes("anklet") || lower.includes("payal") || lower.includes("వెండి") || lower.includes("silver")) return "cat-cyan";
    if (lower.includes("pendant") || lower.includes("locket") || lower.includes("లాకెట్") || lower.includes("ముక్కుపుడక") || lower.includes("mukku")) return "cat-pink";
    return "cat-default";
  };

  // EXPORT CURRENT INVENTORY TO EXCEL
  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      notify.error("No items to export.");
      return;
    }

    const dataToExport = filteredItems.map((item, idx) => ({
      "#": idx + 1,
      "Product ID": item.productID || "",
      Barcode: item.barcode || "",
      "Product Name": item.productName || "",
      Category: item.category || "",
      Gender: item.gender || "Unisex",
      "Metal Type": item.metalType || "Gold",
      "Purity (%)": item.purity || 91.6,
      "Gross Weight (g)": item.grossWeight || 0,
      "Stone Weight (g)": item.stoneWeight || 0,
      "Other Weight (g)": item.otherWeight || 0,
      "Net Weight (g)": item.netWeight || 0,
      "Buying Cost Price (₹)": item.baseCostPrice || 0,
      "Stone Composition": item.stoneComposition || "",
      Description: item.description || "",
      "Primary Image URL": item.productImage || "",
      Status: item.inStock ? "In Stock" : "Out of Stock",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Stock");
    XLSX.writeFile(
      wb,
      `ABC_Inventory_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    notify.success("Exported inventory to Excel successfully!");
  };

  
  
  
  // Extract all available images for selected product
  const getProductImageGallery = (item) => {
    if (!item) return [];
    const images = [];
    if (item.productImage) images.push(item.productImage);
    if (Array.isArray(item.productImages)) {
      item.productImages.forEach((img) => {
        if (img && !images.includes(img)) images.push(img);
      });
    }
    return images;
  };

  const currentGallery = selectedItem ? getProductImageGallery(selectedItem) : [];
  const activeImage = currentGallery[activeImageIndex] || selectedItem?.productImage || "";

  // Print Barcode Label
  const handlePrintBarcode = (item) => {
    if (!item) return;
    const printWindow = window.open("", "_blank", "width=400,height=300");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode - ${item.productID}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            .tag { border: 1px dashed #333; padding: 12px; border-radius: 8px; max-width: 280px; margin: auto; }
            .title { font-size: 14px; font-weight: bold; margin-bottom: 4px; }
            .meta { font-size: 11px; color: #555; margin-bottom: 8px; }
            .price { font-size: 13px; font-weight: bold; color: #111; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="tag">
            <div class="title">${item.productName}</div>
            <div class="meta">${item.category} | ${item.metalType} ${item.purity}% | Net: ${item.netWeight}g</div>
            <svg id="print-barcode"></svg>
            <div class="price">ID: ${item.productID}</div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            JsBarcode("#print-barcode", "${item.barcode || item.productID}", {
              format: "CODE128",
              width: 1.8,
              height: 40,
              displayValue: true
            });
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedCategory("all");
    setShowInStockOnly(true);
    setMobilePurityFilter("all");
    setMobileMinWeight("");
    setMobileMaxWeight("");
    setMobileMinPrice("");
    setMobileMaxPrice("");
    setMobileSortBy("recent");
    setMobileSortOrder("desc");
    setMobileFilterOpen(false);
    notify.info("Filters reset to default.");
  };

  return (
    <div className="inventory-workspace">
      {isLoading && <LogoLoader fullScreen={true} text="Loading Inventory..." />}
      {/* ============================================================
         DESKTOP SECTION (>= 768px)
         ============================================================ */}
      <div className="inventory-header">
        <div className="inventory-actions">
          <button className="btn-outline" onClick={handleExportExcel} title="Export to Excel">
            <FaFileExport /> Export
          </button>
          <button
            className="btn-outline"
            onClick={() => notify.info("Ready for barcode scanning")}
            title="Scan Barcode"
          >
            <FaBarcode /> Scan Barcode
          </button>
          <button
            className="btn-outline"
            onClick={() => setIsBulkModalOpen(true)}
            title="Bulk Excel Import"
          >
            <FaCloudUploadAlt /> Bulk Upload
          </button>
          <button className="btn-gold" onClick={() => navigate("/inventory/add")}>
            <FaPlus /> Add New Item
          </button>
        </div>
      </div>

      {/* STAT CARDS (DESKTOP) */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon box-icon">
            <FaBoxOpen />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Items</span>
            <span className="stat-value">{filteredItems.length}</span>
            <span className="stat-sub">All products</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon weight-icon">
            <FaWeightHanging />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Net Weight</span>
            <span className="stat-value">{totals.totalNet.toFixed(1)}</span>
            <span className="stat-sub">Grams</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gross-icon">
            <FaWeightHanging />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Gross Weight</span>
            <span className="stat-value">{totals.totalGross.toFixed(1)}</span>
            <span className="stat-sub">Grams</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon value-icon">
            <FaMoneyBillWave />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Value (Cost Price)</span>
            <span className="stat-value">₹{totals.totalCost.toLocaleString()}</span>
            <span className="stat-sub">Invested value</span>
          </div>
        </div>
      </div>

      {/* DESKTOP SPLIT VIEW TABLE & PERSISTENT DRAWER */}
      <div
        className={`inventory-content-grid ${
          selectedItem ? (isExpandedView ? "has-expanded-view" : "has-preview") : "no-preview"
        }`}
      >
        {/* LEFT MAIN TABLE SECTION */}
        <div className="inventory-main">
          <div className="inventory-filters">
            <div className="search-box">
              <FaSearch />
              <input
                type="text"
                placeholder="Search products, IDs or barcodes..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <div className="filter-dropdowns">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                value={showInStockOnly ? "instock" : "all"}
                onChange={(e) => {
                  setShowInStockOnly(e.target.value === "instock");
                  setCurrentPage(1);
                }}
              >
                <option value="instock">In Stock Only</option>
                <option value="all">All Products</option>
              </select>
            </div>
          </div>

          <div className="inventory-table-container">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>PRODUCT</th>
                  <th>CATEGORY</th>
                  <th>NET WEIGHT</th>
                  <th>GROSS WEIGHT</th>
                  <th>STONE WEIGHT</th>
                  <th>COST PRICE</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((item, index) => {
                  const globalIndex = (currentPage - 1) * rowsPerPage + index + 1;
                  return (
                    <tr
                      key={item._id}
                      onClick={() => handleRowClick(item)}
                      className={selectedItem?._id === item._id ? "selected-row" : ""}
                    >
                      <td className="row-number">{globalIndex}</td>
                      <td>
                        <div className="product-cell">
                          <div className="product-img-mini">
                            {item.productImage ? (
                              <img src={item.productImage} alt="img" />
                            ) : (
                              <div className="img-placeholder-mini" />
                            )}
                          </div>
                          <div className="product-info-mini">
                            <span className="prod-id">{item.productID}</span>
                            <span className="prod-name">{item.productName || "Unknown Item"}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`category-badge ${getCategoryColorClass(item.category)}`}>
                          {item.category || "Uncategorized"}
                        </span>
                      </td>
                      <td>{item.netWeight || 0} g</td>
                      <td>{item.grossWeight || 0} g</td>
                      <td>{item.stoneWeight || 0} g</td>
                      <td className="cost-price-cell">
                        ₹{(item.baseCostPrice || 0).toLocaleString()}
                      </td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="icon-btn"
                            title="Full Product View"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(item);
                              setIsExpandedView(true);
                            }}
                          >
                            <FaEye />
                          </button>
                          <button
                            className="icon-btn"
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/inventory/edit/${item._id}`);
                            }}
                          >
                            <FaEdit />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="inventory-table-tfoot">
                <tr>
                  <td colSpan={3} className="total-title-cell">
                    <span className="total-text">TOTAL &mdash;</span>
                  </td>
                  <td className="total-val-cell">{totals.totalNet.toFixed(1)} g</td>
                  <td className="total-val-cell">{totals.totalGross.toFixed(1)} g</td>
                  <td className="total-val-cell">{totals.totalStone.toFixed(1)} g</td>
                  <td className="total-val-cell total-cost-val">
                    ₹{totals.totalCost.toLocaleString()}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="inventory-pagination">
            <div className="rows-per-page">
              <span>Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="page-nav">
              <button
                className="page-nav-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <FaChevronLeft />
              </button>
              <span className="page-num active">{currentPage}</span>
              <span className="very-small text-muted">of {totalPages}</span>
              <button
                className="page-nav-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PREVIEW DRAWER (30% <---> 70%) */}
        {selectedItem && (
          <aside
            className={`inventory-side-preview ${
              isExpandedView ? "inventory-side-preview--expanded" : ""
            }`}
          >
            <div className="side-preview-header">
              <div>
                <h3 className="side-prod-id">{selectedItem.productID}</h3>
                <h4 className="side-prod-name">{selectedItem.productName}</h4>
                <div className="d-flex align-items-center gap-2 mt-1">
                  <span
                    className={`category-badge-small ${getCategoryColorClass(
                      selectedItem.category
                    )}`}
                  >
                    {selectedItem.category}
                  </span>
                  <span
                    className={`in-stock-badge ${
                      selectedItem.inStock ? "in-stock" : "out-stock"
                    }`}
                  >
                    {selectedItem.inStock ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
              </div>
              <div className="side-preview-header__actions">
                <button
                  className={`icon-action-btn ${isExpandedView ? "active-gold" : ""}`}
                  title={isExpandedView ? "Collapse to 30% View" : "Expand to 70% Full Spec View"}
                  onClick={() => setIsExpandedView(!isExpandedView)}
                >
                  {isExpandedView ? <FaCompressAlt /> : <FaExpandAlt />}
                </button>
                <button
                  className="icon-action-btn"
                  title="Close Side Panel"
                  onClick={() => {
                    setSelectedItem(null);
                    setIsExpandedView(false);
                  }}
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="drawer-dynamic-body">
              {/* PRIMARY LEFT COLUMN */}
              <div className="drawer-primary-column">
                <div
                  className={`side-prod-image ${
                    isExpandedView ? "side-prod-image--expanded" : ""
                  }`}
                >
                  {activeImage ? (
                    <img src={activeImage} alt={selectedItem.productName} />
                  ) : (
                    <span>No Image Available</span>
                  )}
                </div>

                {currentGallery.length > 1 && (
                  <div className="side-thumb-strip">
                    {currentGallery.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        className={`side-thumb-btn ${
                          activeImageIndex === idx ? "active" : ""
                        }`}
                        onClick={() => setActiveImageIndex(idx)}
                      >
                        <img src={imgUrl} alt={`thumb-${idx}`} />
                      </button>
                    ))}
                  </div>
                )}

                {/* Scannable Barcode Box */}
                <div className="side-barcode-box">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="very-small fw-bold text-muted text-uppercase">
                      Scannable Barcode
                    </span>
                    <button
                      className="btn btn-link btn-sm p-0 text-decoration-none very-small text-gold"
                      onClick={() => handlePrintBarcode(selectedItem)}
                    >
                      <FaPrint /> Print Tag
                    </button>
                  </div>
                  <div className="d-flex justify-content-center py-1">
                    <BarcodeSvg value={selectedItem.barcode || selectedItem.productID} />
                  </div>
                </div>

                {/* Action row below Barcode */}
                {isExpandedView ? (
                  <div className="expanded-action-single-row">
                    <button
                      className="btn btn-gold flex-fill"
                      onClick={() =>
                        navigate(`/sales/new?productId=${selectedItem.productID}`)
                      }
                    >
                      Sell Item Now
                    </button>
                    <button
                      className="btn btn-outline flex-fill"
                      onClick={() =>
                        navigate(`/inventory/edit/${selectedItem._id}`)
                      }
                    >
                      <FaEdit /> Edit Item
                    </button>
                    <button
                      className="btn btn-outline"
                      title="Collapse to 30% View"
                      onClick={() => setIsExpandedView(false)}
                    >
                      <FaCompressAlt />
                    </button>
                  </div>
                ) : (
                  <div className="side-footer-actions">
                    <button
                      className="btn-gold full-width"
                      onClick={() =>
                        navigate(`/sales/new?productId=${selectedItem.productID}`)
                      }
                    >
                      Sell Item Now
                    </button>
                    <button
                      className="btn-outline icon-only"
                      title="Edit Item"
                      onClick={() =>
                        navigate(`/inventory/edit/${selectedItem._id}`)
                      }
                    >
                      <FaEdit />
                    </button>
                  </div>
                )}

                {/* Quick Specs 2x2 Grid */}
                <div className="expanded-quick-specs-clean">
                  <div className="quick-spec-item">
                    <span className="quick-spec-label">Metal</span>
                    <span className="quick-spec-val">{selectedItem.metalType || "Gold"}</span>
                  </div>
                  <div className="quick-spec-item">
                    <span className="quick-spec-label">Purity</span>
                    <span className="quick-spec-val">{selectedItem.purity || 91.6}%</span>
                  </div>
                  <div className="quick-spec-item">
                    <span className="quick-spec-label">Gender</span>
                    <span className="quick-spec-val">{selectedItem.gender || "Unisex"}</span>
                  </div>
                  <div className="quick-spec-item">
                    <span className="quick-spec-label">Occasion</span>
                    <span className="quick-spec-val">{selectedItem.occasion || "Traditional"}</span>
                  </div>
                </div>
              </div>

              {/* SECONDARY EXPANDED COLUMN (70% FULL VIEW) */}
              <div
                className={`drawer-expanded-column ${
                  isExpandedView ? "is-visible" : "is-collapsed"
                }`}
              >
                {/* 1. Weight Dynamics */}
                <div className="expanded-card">
                  <h5 className="expanded-card__title">Weight Dynamics</h5>
                  <div className="row g-2">
                    <div className="col-3">
                      <div className="weight-metric-box">
                        <span className="weight-metric-label">Gross Wt</span>
                        <span className="weight-metric-value">
                          {selectedItem.grossWeight || 0}g
                        </span>
                        <span className="weight-metric-sub">Total</span>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="weight-metric-box">
                        <span className="weight-metric-label">Stone Wt</span>
                        <span className="weight-metric-value">
                          {selectedItem.stoneWeight || 0}g
                        </span>
                        <span className="weight-metric-sub">Gems</span>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="weight-metric-box">
                        <span className="weight-metric-label">Other Wt</span>
                        <span className="weight-metric-value">
                          {selectedItem.otherWeight || 0}g
                        </span>
                        <span className="weight-metric-sub">Enamel/Wax</span>
                      </div>
                    </div>
                    <div className="col-3">
                      <div className="weight-metric-box weight-metric-box--net">
                        <span className="weight-metric-label text-gold">Net Wt</span>
                        <span className="weight-metric-value text-gold">
                          {selectedItem.netWeight || 0}g
                        </span>
                        <span className="weight-metric-sub">Pure Metal</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Financial & Procurement Ledger */}
                <div className="expanded-card expanded-card--gold">
                  <h5 className="expanded-card__title text-gold">
                    Financial &amp; Procurement Ledger
                  </h5>
                  <div className="row g-2">
                    <div className="col-6">
                      <div className="expanded-spec-box expanded-spec-box--highlight">
                        <span className="expanded-spec-label">
                          Total Procurement Cost
                        </span>
                        <span className="expanded-large-cost">
                          ₹{(selectedItem.baseCostPrice || 0).toLocaleString()}
                        </span>
                        <span className="expanded-spec-sub">
                          Inclusive of metal &amp; stones
                        </span>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="expanded-spec-box expanded-spec-box--highlight">
                        <span className="expanded-spec-label">
                          Effective Cost / Gram
                        </span>
                        <span className="expanded-large-cost expanded-large-cost--secondary">
                          ₹
                          {selectedItem.netWeight > 0
                            ? (
                                (selectedItem.baseCostPrice || 0) /
                                selectedItem.netWeight
                              ).toFixed(2)
                            : "0.00"}
                          /g
                        </span>
                        <span className="expanded-spec-sub">
                          Calculated on Net Weight
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="row g-2 mt-1">
                    <div className="col-4">
                      <div className="expanded-spec-box">
                        <span className="expanded-spec-label">SUPPLIER / SOURCE</span>
                        <span className="expanded-spec-val">
                          {selectedItem.supplier || selectedItem.wholesaler || "Wholesale Karigar / Merchant"}
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="expanded-spec-box">
                        <span className="expanded-spec-label">PURCHASE BILL NO</span>
                        <span className="expanded-spec-val">
                          {selectedItem.purchaseBillNo || selectedItem.billNo || "INV-2026-089"}
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="expanded-spec-box">
                        <span className="expanded-spec-label">PROCUREMENT DATE</span>
                        <span className="expanded-spec-val">
                          {selectedItem.createdAt
                            ? new Date(selectedItem.createdAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Recent Stock"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Stone & Gemstone Breakdown */}
                <div className="expanded-card">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="expanded-card__title mb-0">Stone &amp; Gemstone Composition</h5>
                    <span className="badge bg-warning-subtle text-warning border border-warning-subtle very-small">
                      {selectedItem.stoneWeight > 0 ? `${selectedItem.stoneWeight}g Total Gems` : "Plain Metal"}
                    </span>
                  </div>

                  {selectedItem.stoneDetails && selectedItem.stoneDetails.length > 0 ? (
                    <div className="table-responsive border rounded-2">
                      <table className="table table-sm mb-0 very-small">
                        <thead>
                          <tr>
                            <th>Stone Type</th>
                            <th>Cut / Color</th>
                            <th>Pieces</th>
                            <th>Weight (ct/g)</th>
                            <th>Est. Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedItem.stoneDetails.map((st, sIdx) => (
                            <tr key={sIdx}>
                              <td className="fw-bold">{st.stoneType || st.type || "Gemstone"}</td>
                              <td>{st.cut || "Brilliant Cut"} / {st.color || "Fine"}</td>
                              <td>{st.pieces || st.count || 1} pcs</td>
                              <td>{st.carats || st.weight || 0} ct</td>
                              <td className="fw-bold text-success">₹{(st.value || st.price || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="expanded-spec-box d-flex justify-content-between align-items-center">
                      <div>
                        <span className="expanded-spec-label">STONE SPECIFICATION</span>
                        <span className="expanded-spec-val">
                          {selectedItem.stoneComposition || "Standard Fine Quality Setting / Navaratna"}
                        </span>
                      </div>
                      <div className="text-end">
                        <span className="expanded-spec-label">GEMS WEIGHT</span>
                        <span className="expanded-spec-val text-gold">{selectedItem.stoneWeight || 0} g</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Hallmark, Purity & Vault Location DNA */}
                <div className="expanded-card">
                  <h5 className="expanded-card__title">Hallmark &amp; Vault Identification</h5>
                  <div className="row g-2">
                    <div className="col-4">
                      <div className="expanded-spec-box">
                        <span className="expanded-spec-label">BIS HALLMARK</span>
                        <span className="expanded-spec-val text-gold">
                          BIS 916 • {selectedItem.purity || 91.6}% {selectedItem.metalType || "Gold"}
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="expanded-spec-box">
                        <span className="expanded-spec-label">HUID / CERTIFICATE</span>
                        <span className="expanded-spec-val">
                          {selectedItem.huid || selectedItem.barcode || selectedItem.productID}
                        </span>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="expanded-spec-box">
                        <span className="expanded-spec-label">STORAGE LOCATION</span>
                        <span className="expanded-spec-val">
                          {selectedItem.locationTray || "Main Vault • Showcase 01"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Notes & Traditional Description */}
                <div className="expanded-card">
                  <h5 className="expanded-card__title">Craftsmanship Notes &amp; Description</h5>
                  <p className="very-small text-muted mb-2 lh-base">
                    {selectedItem.description ||
                      selectedItem.notes ||
                      "Handcrafted traditional fine jewellery piece with master Nakshi & Filigree craftsmanship. Tested and certified for pure hallmarked gold authenticity."}
                  </p>
                  <div className="side-tags-wrap">
                    <span className="side-tag-pill">#{selectedItem.metalType?.toLowerCase() || "gold"}</span>
                    <span className="side-tag-pill">#{selectedItem.purity || 91.6}k</span>
                    <span className="side-tag-pill">#{selectedItem.category?.split("/")[0]?.trim()?.toLowerCase() || "jewellery"}</span>
                    <span className="side-tag-pill">#{selectedItem.gender?.toLowerCase() || "traditional"}</span>
                    <span className="side-tag-pill">#hallmark</span>
                    <span className="side-tag-pill">#handcrafted</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ============================================================
         📱 IPHONE 15 PRO MAX & MOBILE REDESIGNED EXPERIENCE
         ============================================================ */}
      <div className="mobile-inventory-view">
        {/* MOBILE BRAND HEADER */}
        <div className="mobile-brand-header">
          <div className="mobile-brand-left">
            <div className="mobile-brand-crown-box">
              <FaCrown />
            </div>
            <div>
              <span className="mobile-brand-title d-block">Aneesh Console</span>
              <span className="mobile-brand-sub">PRO WORKSPACE</span>
            </div>
          </div>
          <div className="mobile-brand-actions">
            <button
              className="mobile-icon-btn"
              onClick={() => setMobileQuickMenuOpen(true)}
              aria-label="Menu"
            >
              <FaBars />
            </button>
            <button
              className="mobile-icon-btn"
              onClick={() => notify.info("No new notifications")}
              aria-label="Notifications"
            >
              <FaBell />
            </button>
          </div>
        </div>

        {/* MOBILE TITLE ROW */}
        <div className="mobile-title-row">
          <div>
            <h1 className="mobile-page-title">Inventory</h1>
            <p className="mobile-page-sub">Track all your products</p>
          </div>
          <div className="mobile-title-actions">
            <button
              className="mobile-btn-add"
              onClick={() => navigate("/inventory/add")}
            >
              <FaPlus /> Add Item
            </button>
            <button
              className="mobile-icon-btn"
              onClick={() => setMobileFilterOpen(true)}
              title="Filters"
            >
              <FaSlidersH />
            </button>
          </div>
        </div>

        {/* 2x2 MINI STATS GRID */}
        <div className="mobile-stats-grid">
          <div className="mobile-stat-card">
            <div className="mobile-stat-icon box-icon">
              <FaBoxOpen />
            </div>
            <div className="mobile-stat-content">
              <span className="mobile-stat-val">{filteredItems.length}</span>
              <span className="mobile-stat-lbl">Total Items</span>
            </div>
          </div>
          <div className="mobile-stat-card">
            <div className="mobile-stat-icon weight-icon">
              <FaWeightHanging />
            </div>
            <div className="mobile-stat-content">
              <span className="mobile-stat-val">{totals.totalNet.toFixed(1)} g</span>
              <span className="mobile-stat-lbl">Net Weight</span>
            </div>
          </div>
          <div className="mobile-stat-card">
            <div className="mobile-stat-icon gross-icon">
              <FaWeightHanging />
            </div>
            <div className="mobile-stat-content">
              <span className="mobile-stat-val">{totals.totalGross.toFixed(1)} g</span>
              <span className="mobile-stat-lbl">Gross Weight</span>
            </div>
          </div>
          <div className="mobile-stat-card">
            <div className="mobile-stat-icon value-icon">
              <FaMoneyBillWave />
            </div>
            <div className="mobile-stat-content">
              <span className="mobile-stat-val">
                ₹{totals.totalCost.toLocaleString()}
              </span>
              <span className="mobile-stat-lbl">Total Value</span>
            </div>
          </div>
        </div>

        {/* 📌 STICKY TOP CONTROLS (SEARCH & VIEW MODE SWITCHER) */}
        <div className="mobile-sticky-top-controls">
          {/* MOBILE SEARCH BAR */}
          <div className="mobile-search-bar">
            <FaSearch />
            <input
              type="text"
              placeholder="Search products, IDs or barcodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="btn btn-link btn-sm p-0 text-muted"
                onClick={() => setSearchTerm("")}
              >
                <FaTimes />
              </button>
            )}
          </div>

          {/* MOBILE VIEW SWITCHER SEGMENT & MENU TRIGGER */}
          <div className="mobile-view-control-row">
            <div className="mobile-segment-control">
              <button
                className={`mobile-segment-btn ${
                  mobileViewMode === "overview" ? "active" : ""
                }`}
                onClick={() => setMobileViewMode("overview")}
              >
                Overview
              </button>
              <button
                className={`mobile-segment-btn ${
                  mobileViewMode === "full" ? "active" : ""
                }`}
                onClick={() => setMobileViewMode("full")}
              >
                Full View
              </button>
            </div>
            <button
              className="mobile-menu-trigger-btn"
              onClick={() => setMobileQuickMenuOpen(true)}
              title="Options"
            >
              <FaEllipsisH />
            </button>
          </div>
        </div>

        {/* ============================================================
           MODE 1: OVERVIEW CARD LIST VIEW (SCREEN 1 MATCH)
           ============================================================ */}
        {mobileViewMode === "overview" && (
          <div className="mobile-card-list">
            {filteredItems.length === 0 ? (
              <div className="text-center py-5 text-muted small bg-white rounded-3 border">
                No inventory items match your search.
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item._id}
                  className="mobile-product-card"
                  onClick={() => handleMobileCardClick(item)}
                >
                  <div className="mobile-product-thumb">
                    {item.productImage ? (
                      <img src={item.productImage} alt={item.productName} />
                    ) : (
                      <FaGem className="text-muted" />
                    )}
                  </div>
                  <div className="mobile-card-details">
                    <div className="mobile-card-top-line">
                      <span className="mobile-card-id">{item.productID}</span>
                    </div>
                    <span className="mobile-card-name">{item.productName}</span>
                  </div>
                  <div className="mobile-card-right">
                    <span className="mobile-weight-pill">
                      {item.netWeight || 0} g
                    </span>
                    <span className="mobile-card-price">
                      ₹{(item.baseCostPrice || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ============================================================
           MODE 2: COMPACT FULL VIEW TABLE (SCREEN 3 MATCH)
           ============================================================ */}
        {mobileViewMode === "full" && (
          <div className="d-flex flex-column gap-2">
            <div className="mobile-compact-table-wrap">
              <table className="mobile-compact-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Product</th>
                    <th>Net Wt</th>
                    <th>Cost Price</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item._id}
                      onClick={() => handleMobileCardClick(item)}
                    >
                      <td className="fw-bold text-gold">{item.productID}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div className="product-img-mini" style={{ width: 26, height: 26 }}>
                            {item.productImage ? (
                              <img src={item.productImage} alt="thumb" />
                            ) : (
                              <FaGem className="text-muted very-small" />
                            )}
                          </div>
                          <span
                            className="text-truncate"
                            style={{ maxWidth: 110, display: "inline-block" }}
                          >
                            {item.productName}
                          </span>
                        </div>
                      </td>
                      <td className="fw-semibold">{item.netWeight || 0} g</td>
                      <td className="fw-bold text-danger">
                        ₹{(item.baseCostPrice || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* STICKY BOTTOM SUMMARY TOTALS (SCREEN 3 MATCH) */}
            <div className="mobile-sticky-summary-box">
              <div>
                <span className="very-small text-gold fw-bold text-uppercase d-block">
                  TOTAL
                </span>
                <span className="fw-bold fs-6">
                  {totals.totalNet.toFixed(1)} g
                </span>
                <span className="very-small text-muted d-block">Net Weight</span>
              </div>
              <div>
                <span className="very-small text-muted fw-bold text-uppercase d-block">
                  GROSS
                </span>
                <span className="fw-bold fs-6">
                  {totals.totalGross.toFixed(1)} g
                </span>
                <span className="very-small text-muted d-block">Gross Weight</span>
              </div>
              <div className="text-end">
                <span className="very-small text-danger fw-bold text-uppercase d-block">
                  TOTAL VALUE
                </span>
                <span className="fw-bold fs-6 text-danger">
                  ₹{totals.totalCost.toLocaleString()}
                </span>
                <span className="very-small text-muted d-block">Total Cost</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
         📱 MOBILE PRODUCT DETAIL SLIDE-IN SCREEN (SCREEN 2 MATCH)
         ============================================================ */}
      {mobileDetailOpen && selectedItem && (
        <div className="mobile-detail-overlay">
          {/* Header */}
          <div className="mobile-detail-header">
            <button
              className="mobile-detail-back-btn"
              onClick={() => setMobileDetailOpen(false)}
            >
              <FaChevronLeft /> <span className="fs-6 fw-bold">{selectedItem.productID}</span>
            </button>
            <div className="mobile-detail-header-actions">
              <button
                className="mobile-icon-btn"
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  notify.info("Product link copied!");
                }}
                title="Share"
              >
                <FaShareAlt />
              </button>
              <button
                className="mobile-icon-btn"
                onClick={() => setMobileItemActionsOpen(true)}
                title="More Actions"
              >
                <FaEllipsisH />
              </button>
            </div>
          </div>

          {/* Hero Image Carousel */}
          <div className="mobile-detail-hero-box">
            {activeImage ? (
              <img src={activeImage} alt={selectedItem.productName} />
            ) : (
              <span className="text-white small">No Image Available</span>
            )}
            <span className="mobile-detail-counter-badge">
              {activeImageIndex + 1}/{currentGallery.length || 1}
            </span>
            {currentGallery.length > 1 && (
              <div className="mobile-detail-dots">
                {currentGallery.map((_, idx) => (
                  <span
                    key={idx}
                    className={`mobile-detail-dot ${
                      activeImageIndex === idx ? "active" : ""
                    }`}
                    onClick={() => setActiveImageIndex(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Title & Category Badge */}
          <div className="mobile-detail-title-card">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <h2 className="mobile-detail-title">{selectedItem.productName}</h2>
              <span
                className={`in-stock-badge flex-shrink-0 ${
                  selectedItem.inStock ? "in-stock" : "out-stock"
                }`}
              >
                {selectedItem.inStock ? "● In Stock" : "● Out of Stock"}
              </span>
            </div>
            <div className="mobile-detail-badges-row">
              <span
                className={`category-badge-small ${getCategoryColorClass(
                  selectedItem.category
                )}`}
              >
                {selectedItem.category}
              </span>
            </div>
          </div>

          {/* 2x3 Spec Metrics Grid */}
          <div className="mobile-detail-specs-grid">
            <div className="mobile-spec-card">
              <span className="mobile-spec-lbl">Metal &amp; Purity</span>
              <span className="mobile-spec-val">
                {selectedItem.metalType || "Gold"} {selectedItem.purity || 91.6}%
              </span>
            </div>
            <div className="mobile-spec-card">
              <span className="mobile-spec-lbl">Net Weight</span>
              <span className="mobile-spec-val gold">
                {selectedItem.netWeight || 0} g
              </span>
            </div>
            <div className="mobile-spec-card">
              <span className="mobile-spec-lbl">Gross Weight</span>
              <span className="mobile-spec-val">
                {selectedItem.grossWeight || 0} g
              </span>
            </div>
            <div className="mobile-spec-card">
              <span className="mobile-spec-lbl">Stone Weight</span>
              <span className="mobile-spec-val">
                {selectedItem.stoneWeight || 0} g
              </span>
            </div>
            <div className="mobile-spec-card">
              <span className="mobile-spec-lbl">Cost Price</span>
              <span className="mobile-spec-val green">
                ₹{(selectedItem.baseCostPrice || 0).toLocaleString()}
              </span>
            </div>
            <div className="mobile-spec-card">
              <span className="mobile-spec-lbl">Per Gram (Cost)</span>
              <span className="mobile-spec-val">
                ₹
                {selectedItem.netWeight > 0
                  ? (
                      (selectedItem.baseCostPrice || 0) / selectedItem.netWeight
                    ).toFixed(2)
                  : "0.00"}
              </span>
            </div>
          </div>

          {/* Product Overview Box */}
          <div className="mobile-detail-overview-box">
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-bold fs-6">Product Overview</span>
              <button
                className="btn btn-link btn-sm p-0 text-decoration-none text-gold very-small fw-bold"
                onClick={() => setIsExpandedView(true)}
              >
                Full View ⛶
              </button>
            </div>
            <p className="very-small text-muted mb-2">
              {selectedItem.description ||
                "Authentic fine jewellery piece crafted with high precision and verified hallmarked purity."}
            </p>

            {/* Barcode & Tags */}
            <div className="d-flex justify-content-center py-2 bg-light rounded-3">
              <BarcodeSvg value={selectedItem.barcode || selectedItem.productID} />
            </div>
          </div>

          {/* Fixed Bottom Action Bar */}
          <div className="mobile-detail-bottom-actions">
            <button
              className="btn btn-outline flex-fill"
              onClick={() => navigate(`/inventory/edit/${selectedItem._id}`)}
            >
              <FaEdit /> Edit
            </button>
            <button
              className="btn btn-gold flex-fill"
              onClick={() => setMobileItemActionsOpen(true)}
            >
              <FaEllipsisH /> More Actions
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
         📱 MOBILE FILTER BOTTOM SHEET (SCREEN 4 MATCH)
         ============================================================ */}
      {mobileFilterOpen && (
        <div
          className="mobile-bottom-sheet-overlay"
          onClick={() => setMobileFilterOpen(false)}
        >
          <div
            className="mobile-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title">Filters</h3>
              <button
                className="btn-close"
                onClick={() => setMobileFilterOpen(false)}
              />
            </div>

            <div className="d-flex flex-column gap-3">
              <div className="ldg-input-group">
                <label>Category</label>
                <select
                  className="ldg-input-control"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ldg-input-group">
                <label>Stock Status</label>
                <select
                  className="ldg-input-control"
                  value={showInStockOnly ? "instock" : "all"}
                  onChange={(e) => setShowInStockOnly(e.target.value === "instock")}
                >
                  <option value="instock">In Stock Only</option>
                  <option value="all">All Items</option>
                </select>
              </div>

              <div className="ldg-input-group">
                <label>Metal &amp; Purity</label>
                <select
                  className="ldg-input-control"
                  value={mobilePurityFilter}
                  onChange={(e) => setMobilePurityFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="91.6">22K (91.6% Hallmark)</option>
                  <option value="99.9">24K (99.9% Bullion)</option>
                  <option value="75">18K (75.0% Jewellery)</option>
                </select>
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <div className="ldg-input-group">
                    <label>Weight Min (g)</label>
                    <input
                      type="number"
                      className="ldg-input-control"
                      placeholder="Min (g)"
                      value={mobileMinWeight}
                      onChange={(e) => setMobileMinWeight(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <div className="ldg-input-group">
                    <label>Weight Max (g)</label>
                    <input
                      type="number"
                      className="ldg-input-control"
                      placeholder="Max (g)"
                      value={mobileMaxWeight}
                      onChange={(e) => setMobileMaxWeight(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <div className="ldg-input-group">
                    <label>Price Min (₹)</label>
                    <input
                      type="number"
                      className="ldg-input-control"
                      placeholder="Min (₹)"
                      value={mobileMinPrice}
                      onChange={(e) => setMobileMinPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <div className="ldg-input-group">
                    <label>Price Max (₹)</label>
                    <input
                      type="number"
                      className="ldg-input-control"
                      placeholder="Max (₹)"
                      value={mobileMaxPrice}
                      onChange={(e) => setMobileMaxPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="row g-2">
                <div className="col-6">
                  <div className="ldg-input-group">
                    <label>Sort By</label>
                    <select
                      className="ldg-input-control"
                      value={mobileSortBy}
                      onChange={(e) => setMobileSortBy(e.target.value)}
                    >
                      <option value="recent">Recently Added</option>
                      <option value="netWeight">Net Weight</option>
                      <option value="price">Cost Price</option>
                      <option value="name">Product Name</option>
                    </select>
                  </div>
                </div>
                <div className="col-6">
                  <div className="ldg-input-group">
                    <label>Sort Order</label>
                    <select
                      className="ldg-input-control"
                      value={mobileSortOrder}
                      onChange={(e) => setMobileSortOrder(e.target.value)}
                    >
                      <option value="desc">High to Low / Newest</option>
                      <option value="asc">Low to High / Oldest</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 pt-2">
                <button
                  className="btn btn-outline flex-fill"
                  onClick={handleResetFilters}
                >
                  Reset
                </button>
                <button
                  className="btn btn-gold flex-fill"
                  onClick={() => setMobileFilterOpen(false)}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
         📱 MOBILE QUICK MENU BOTTOM SHEET (SCREEN 5 MATCH)
         ============================================================ */}
      {mobileQuickMenuOpen && (
        <div
          className="mobile-bottom-sheet-overlay"
          onClick={() => setMobileQuickMenuOpen(false)}
        >
          <div
            className="mobile-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title">Inventory Actions</h3>
              <button
                className="btn-close"
                onClick={() => setMobileQuickMenuOpen(false)}
              />
            </div>

            <div className="d-flex flex-column gap-1">
              <button
                className="mobile-sheet-menu-item"
                onClick={() => {
                  setMobileQuickMenuOpen(false);
                  handleExportExcel();
                }}
              >
                <FaFileExport className="text-gold" /> Export Inventory (Excel / PDF)
              </button>
              <button
                className="mobile-sheet-menu-item"
                onClick={() => {
                  setMobileQuickMenuOpen(false);
                  notify.info("Camera barcode scanner ready");
                }}
              >
                <FaBarcode className="text-primary" /> Scan Barcode
              </button>
              <button
                className="mobile-sheet-menu-item"
                onClick={() => {
                  setMobileQuickMenuOpen(false);
                  document.querySelector('[data-bs-target="#bulkImportModal"]')?.click();
                }}
              >
                <FaCloudUploadAlt className="text-success" /> Bulk Upload (Excel)
              </button>

              <button
                className="mobile-sheet-menu-item danger mt-2"
                onClick={() => setMobileQuickMenuOpen(false)}
              >
                <FaTimes /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
         📱 MOBILE MORE ACTIONS BOTTOM SHEET (SCREEN 6 MATCH)
         ============================================================ */}
      {mobileItemActionsOpen && selectedItem && (
        <div
          className="mobile-bottom-sheet-overlay"
          onClick={() => setMobileItemActionsOpen(false)}
        >
          <div
            className="mobile-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-sheet-header">
              <h3 className="mobile-sheet-title">More Actions</h3>
              <button
                className="btn-close"
                onClick={() => setMobileItemActionsOpen(false)}
              />
            </div>

            <div className="d-flex flex-column gap-1">
              <button
                className="mobile-sheet-menu-item"
                onClick={() => {
                  setMobileItemActionsOpen(false);
                  navigate(`/inventory/add?duplicate=${selectedItem._id}`);
                }}
              >
                <FaCopy className="text-primary" /> Duplicate Item
              </button>
              <button
                className="mobile-sheet-menu-item"
                onClick={() => {
                  setMobileItemActionsOpen(false);
                  navigate(`/inventory/edit/${selectedItem._id}`);
                }}
              >
                <FaFolder className="text-warning" /> Move to Category
              </button>
              <button
                className="mobile-sheet-menu-item"
                onClick={() => {
                  setMobileItemActionsOpen(false);
                  handlePrintBarcode(selectedItem);
                }}
              >
                <FaPrint className="text-info" /> Print Barcode Tag
              </button>
              <button
                className="mobile-sheet-menu-item danger mt-2"
                onClick={async () => {
                  if (
                    window.confirm(
                      `Are you sure you want to delete ${selectedItem.productID}?`
                    )
                  ) {
                    try {
                      await api.delete(`/inventory/${selectedItem._id}`);
                      notify.success("Item deleted successfully!");
                      setMobileItemActionsOpen(false);
                      setMobileDetailOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["inventory"] });
                    } catch (err) {
                      notify.error("Failed to delete item.");
                    }
                  }
                }}
              >
                <FaTrashAlt /> Delete Item
              </button>
            </div>
          </div>
        </div>
      )}



            <BulkImportModal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} />
    </div>
  );
}