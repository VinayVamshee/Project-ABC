import React, { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import api from "../../api/axios";
import { notify } from "../Toast/toast";
import { FiUploadCloud, FiCheckCircle, FiAlertCircle, FiFileText } from "react-icons/fi";
import "./BulkImportModal.css";

export default function BulkImportModal({ isOpen, onClose }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // Phases: 'upload' -> 'preview' -> 'importing' -> 'summary'
  const [phase, setPhase] = useState("upload");
  const [fileName, setFileName] = useState("");
  
  const [validRows, setValidRows] = useState([]);
  const [invalidRows, setInvalidRows] = useState([]);
  
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });
  const [failedImports, setFailedImports] = useState([]);

  // Fetch Wholesalers to map name to ID
  const { data: wholesalers = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const res = await api.get("/contacts");
      return res.data.contacts || [];
    },
    enabled: isOpen
  });

  
  const handleDownloadTemplate = async () => {
    try {
      notify.info("Generating Excel template with live wholesalers & categories...");
      const response = await api.get("/inventory/template", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "ABC_Inventory_Bulk_Import_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify.success("Downloaded Excel template with dynamic dropdowns!");
    } catch (err) {
      console.error("Error downloading template from server:", err);
      notify.error("Failed to download template from server.");
    }
  };

  if (!isOpen) return null;

  const resetModal = () => {
    setPhase("upload");
    setFileName("");
    setValidRows([]);
    setInvalidRows([]);
    setProgress(0);
    setImportStats({ success: 0, failed: 0 });
    setFailedImports([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (phase === "importing") {
      notify.error("Cannot close while import is in progress!");
      return;
    }
    if (phase === "summary" && importStats.success > 0) {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    }
    resetModal();
    onClose();
  };

  const parseExcelFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonRows.length === 0) {
          notify.error("The uploaded spreadsheet has no data rows.");
          resetModal();
          return;
        }

        validateAndMapRows(jsonRows);
      } catch (err) {
        console.error("Bulk file parse error:", err);
        notify.error("Failed to parse spreadsheet file.");
        resetModal();
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validateAndMapRows = (rows) => {
    const valid = [];
    const invalid = [];

    rows.forEach((row, index) => {
      const errors = [];
      
      // Standardize keys (remove trailing asterisks/spaces)
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        const cleanKey = key.replace(/\*/g, "").trim().toLowerCase();
        cleanRow[cleanKey] = row[key];
      });

      // Extract Values
      const productName = cleanRow["product name"] || cleanRow["name"];
      const category = cleanRow["category"];
      const wholesalerName = cleanRow["wholesaler / supplier"] || cleanRow["wholesaler"];
      const grossWeight = parseFloat(cleanRow["gross weight (g)"] || cleanRow["gross weight"]) || 0;
      const baseCostPrice = parseFloat(cleanRow["base cost price (₹)"] || cleanRow["base cost price"]) || 0;

      // Validation Rules
      if (!productName) errors.push("Product Name is required");
      if (!category) errors.push("Category is required");
      if (grossWeight <= 0) errors.push("Gross weight must be > 0");
      if (baseCostPrice <= 0) errors.push("Base Cost Price must be > 0");

      if (errors.length > 0) {
        invalid.push({ index: index + 2, productName: productName || "Unknown Row", errors });
      } else {
        // Map Wholesaler Name to ID
        let wholeSellerId = "";
        if (wholesalerName) {
          const match = wholesalers.find(w => w.name.toLowerCase() === String(wholesalerName).trim().toLowerCase());
          if (match) wholeSellerId = match._id;
        }

        // Calculate Net Weight automatically if not provided perfectly
        const stoneWeight = parseFloat(cleanRow["stone weight (g)"] || cleanRow["stone weight"]) || 0;
        const otherWeight = parseFloat(cleanRow["other weight (g)"] || cleanRow["other weight"]) || 0;
        let netWeight = parseFloat(cleanRow["net weight (g)"] || cleanRow["net weight"]) || 0;
        if (!netWeight && grossWeight > 0) {
          netWeight = Math.max(0, grossWeight - stoneWeight - otherWeight);
        }

        valid.push({
          productName: String(productName).trim(),
          category: String(category).trim(),
          wholeSellerId,
          metalType: String(cleanRow["metal type"] || "Gold").trim(),
          purity: parseFloat(cleanRow["purity (%)"] || cleanRow["purity"]) || 91.6,
          grossWeight: Number(grossWeight.toFixed(3)),
          stoneWeight: Number(stoneWeight.toFixed(3)),
          otherWeight: Number(otherWeight.toFixed(3)),
          netWeight: Number(netWeight.toFixed(3)),
          baseCostPrice: Number(baseCostPrice.toFixed(2)),
          totalCostPrice: parseFloat(cleanRow["total cost price (₹)"] || cleanRow["total cost price"]) || baseCostPrice,
          purchaseType: String(cleanRow["purchase type"] || "Cash").trim(),
          gender: String(cleanRow["gender"] || "Unisex").trim(),
          occasion: String(cleanRow["occasion"] || "Daily & Traditional").trim(),
          stoneComposition: String(cleanRow["stone composition"] || "").trim(),
          productImage: String(cleanRow["primary image url"] || cleanRow["product image"] || "").trim(),
          notes: String(cleanRow["notes"] || "").trim(),
          inStock: true,
          status: "in_stock"
        });
      }
    });

    setValidRows(valid);
    setInvalidRows(invalid);
    setPhase("preview");
  };

  const startImport = async () => {
    if (validRows.length === 0) return;
    setPhase("importing");
    
    let successes = 0;
    let fails = 0;
    const failedDetails = [];

    for (let i = 0; i < validRows.length; i++) {
      try {
        await api.post("/inventory", validRows[i]);
        successes++;
      } catch (err) {
        fails++;
        failedDetails.push({
          productName: validRows[i].productName,
          reason: err.response?.data?.message || err.message || "Failed to save"
        });
      }
      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImportStats({ success: successes, failed: fails });
    setFailedImports(failedDetails);
    setPhase("summary");
  };

  return (
    <div className={`bulk-modal-overlay ${phase === "importing" ? "importing-locked" : ""}`}>
      <div className="bulk-modal-content">
        
        {/* HEADER */}
        <div className="bulk-modal-header">
          <h2 className="bulk-modal-title">Bulk Import Inventory</h2>
          <button className="btn-close" onClick={handleClose} disabled={phase === "importing"}></button>
        </div>

        {/* BODY */}
        <div className="bulk-modal-body">
          

          {phase === "upload" && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-light rounded border border-light">
                <div>
                  <span className="fw-bold d-block text-dark">Download Excel Template</span>
                  <span className="text-muted small">Pre-populated with your live wholesalers & categories.</span>
                </div>
                <button className="btn btn-outline-secondary btn-sm" onClick={handleDownloadTemplate}>
                  <FiFileText className="me-1"/> Download Template
                </button>
              </div>

              <div className="upload-zone" onClick={() => fileInputRef.current.click()}>

                <FiUploadCloud size={48} className="text-muted mb-3" />
                <h5 className="fw-bold">Click to Upload Excel File</h5>
                <p className="text-muted small">Supports .xlsx and .csv</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".xlsx, .xls, .csv" 
                  className="d-none" 
                  onChange={parseExcelFile} 
                />
              </div>
            </div>
          )}

          {phase === "preview" && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0 fw-bold">Validation Preview</h5>
                <span className="badge bg-secondary">{fileName}</span>
              </div>
              
              <div className="row">
                <div className="col-md-6">
                  <div className="summary-card text-center border border-success border-opacity-50">
                    <h2 className="text-success fw-bold mb-0">{validRows.length}</h2>
                    <span className="text-muted small">Valid Items Ready</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="summary-card text-center border border-danger border-opacity-50">
                    <h2 className="text-danger fw-bold mb-0">{invalidRows.length}</h2>
                    <span className="text-muted small">Rows with Errors</span>
                  </div>
                </div>
              </div>

              {invalidRows.length > 0 && (
                <div className="mt-3">
                  <span className="fw-bold text-danger d-flex align-items-center gap-2 mb-2">
                    <FiAlertCircle /> Fix these errors before importing:
                  </span>
                  <div className="error-list">
                    {invalidRows.map((err, i) => (
                      <div key={i} className="error-item">
                        <strong>Row {err.index} ({err.productName}):</strong> {err.errors.join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === "importing" && (
            <div className="text-center py-5">
              <h4 className="fw-bold mb-3">Importing Items...</h4>
              <p className="text-muted">Please do not close this window.</p>
              <div className="progress-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="fw-bold">{progress}% Complete</span>
            </div>
          )}

          {phase === "summary" && (
            <div>
              <div className="text-center mb-4">
                {importStats.failed === 0 ? (
                  <FiCheckCircle size={64} className="text-success mb-2" />
                ) : (
                  <FiAlertCircle size={64} className="text-warning mb-2" />
                )}
                <h3 className="fw-bold">Import Complete</h3>
              </div>

              <div className="summary-card d-flex justify-content-around text-center">
                <div>
                  <h3 className="text-success mb-0">{importStats.success}</h3>
                  <small className="text-muted">Successfully Added</small>
                </div>
                <div>
                  <h3 className="text-danger mb-0">{importStats.failed}</h3>
                  <small className="text-muted">Failed to Add</small>
                </div>
              </div>

              {failedImports.length > 0 && (
                <div className="mt-4">
                  <h6 className="fw-bold text-danger border-bottom pb-2">Failed Items Breakdown</h6>
                  <div className="error-list">
                    {failedImports.map((fail, i) => (
                      <div key={i} className="error-item">
                        <strong>{fail.productName}:</strong> {fail.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="bulk-modal-footer">
          {phase !== "importing" && phase !== "summary" && (
            <button className="btn btn-outline-secondary" onClick={handleClose}>Cancel</button>
          )}
          
          {phase === "preview" && validRows.length > 0 && (
            <button className="btn btn-gold" onClick={startImport}>
              Import {validRows.length} Items
            </button>
          )}

          {phase === "summary" && (
            <button className="btn btn-gold" onClick={handleClose}>
              Done
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
