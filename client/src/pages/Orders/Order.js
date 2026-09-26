import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axios";
import "./Order.css";

export default function Order() {
  /* =======================
     STATE
  ======================= */
    const [orderFields] = useState([]);
  const [formValues, setFormValues] = useState({});

  const [uploadingField, setUploadingField] = useState(null);

  const [sellModalOrder, setSellModalOrder] = useState(null);
  const [sellingPrice, setSellingPrice] = useState("");
  const [discount, setDiscount] = useState(0);
  const [payments, setPayments] = useState([
    {
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      mode: "cash",
      paidBy: ""
    }
  ]);
  const finalPrice = Math.max(Number(sellingPrice) - Number(discount), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const amountDue = Math.max(finalPrice - totalPaid, 0);
  const [buyingCostPrice, setBuyingCostPrice] = useState("");
  const [soldFieldsDefs, setSoldFieldsDefs] = useState([]);
  const [sellSoldValues, setSellSoldValues] = useState({});

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchText), 500);
    return () => clearTimeout(handler);
  }, [searchText]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const fetchSoldFields = async () => {
    setSoldFieldsDefs([]);
  };

  const getPaymentDetailLabel = (mode) => {
    switch (mode) {
      case "upi":
        return "UPI ID / Name";
      case "bank":
        return "Bank Txn / Ref No";
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

  const handleConfirmSell = async () => {
    if (!sellModalOrder) return;

    const soldFieldsPayload = Object.entries(sellSoldValues).map(
      ([fieldRef, value]) => ({ fieldRef, value })
    );

    try {
      const res = await api.post(
        `/sold/order/${sellModalOrder._id}`,
        {
          sellingPrice,
          discount,
          payments,
          soldFields: soldFieldsPayload,
        }
      );

      if (res.data.success) {
        alert("Order sold successfully");
        document.querySelector("#sellOrderModal .btn-close")?.click();
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to sell order");
    }
  };

  /* =======================
     FETCH ORDER FIELDS
  ======================= */
  
  /* =======================
     FETCH ORDERS
  ======================= */
  const { data, refetch: fetchOrders } = useQuery({
    queryKey: ["orders", currentPage, rowsPerPage, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: currentPage, limit: rowsPerPage });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      const res = await api.get("/orders?" + params.toString());
      return res.data;
    },
    keepPreviousData: true
  });
  
  const orders = data?.data || [];
  const totalPages = data?.pagination?.pages || 1;
  const totals = data?.totals || {};
  

  useEffect(() => {
        fetchSoldFields();
  }, []); // eslint-disable-line

  /* =======================
     FORM HANDLING
  ======================= */
  const handleChange = (fieldId, value) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const uploadToImgBB = async (file) => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(
        "https://api.imgbb.com/1/upload?key=8451f34223c6e62555eec9187d855f8f",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (data.success) {
        return data.data.display_url; // ✅ USE THIS
      }

      throw new Error("Upload failed");
    } catch (err) {
      console.error("Image upload failed", err);
      return "";
    }
  };

  /* =======================
     SAVE ORDER
  ======================= */
  const handleSave = async () => {
    const orderFieldsPayload = Object.entries(formValues).map(
      ([fieldRef, value]) => ({ fieldRef, value })
    );

    try {
      const res = await api.post("/orders", {
        orderFields: orderFieldsPayload,
        buyingCostPrice: Number(buyingCostPrice || 0),
        status: "pending",
      });

      if (res.data.success) {
        setFormValues({});
        document.getElementById("closeOrderModalBtn")?.click();
        fetchOrders();
      }
    } catch (err) {
      console.error("Failed to create order", err);
      alert("Failed to create order");
    }
  };

  /* =======================
     SELL FROM ORDER
     (HOOK INTO YOUR SELL MODAL)
  ======================= */
  const handleSellFromOrder = (order) => {
    setSellModalOrder(order);
    setSellingPrice("");
    setDiscount(0);
    setPayments([{ amount: "", date: new Date().toISOString().slice(0, 10), mode: "cash" }]);

    const modal = new window.bootstrap.Modal(
      document.getElementById("sellOrderModal")
    );
    modal.show();
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="orders-workspace">

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold text-gold m-0">🧾 Orders</h4>
        <div className="orders-actions d-flex gap-2">
          <button
            className="btn btn-gold"
            data-bs-toggle="modal"
            data-bs-target="#addOrderModal"
          >
            + Create New Order
          </button>
        </div>
      </div>


      {/* =======================
         CREATE ORDER MODAL
      ======================= */}

      <div
        className="modal fade"
        id="addOrderModal"
        tabIndex="-1"
        aria-labelledby="addOrderModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-xl">
          <div className="modal-content custom-modal">

            {/* HEADER */}
            <div className="modal-header">
              <h5 className="modal-title">Create New Order</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                id="closeOrderModalBtn"
              />
            </div>

            {/* BODY */}
            <div className="modal-body">
              {orderFields.length === 0 ? (
                <p className="text-muted text-center">
                  No order fields found. Enable “Show in Orders” in Settings.
                </p>
              ) : (
                <div className="container-fluid">
                  <div className="row g-4 p-2">

                    {/* =======================
                 LEFT SIDE — FORM
              ======================= */}
                    <div className="col-lg-8">

                      <div className="info-section p-2 mb-3">
                        <h5 className="section-title">💰 Cost Details</h5>

                        <div className="row">
                          <div className="col-md-6">
                            <label className="form-label">Buying Cost Price</label>
                            <input
                              type="number"
                              className="form-control"
                              placeholder="Enter buying cost (optional)"
                              value={buyingCostPrice}
                              onChange={(e) => setBuyingCostPrice(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      {/* 🟦 ORDER / CUSTOMER DETAILS */}
                      <div className="info-section p-2">
                        <h5 className="section-title">🧾 Order / Customer Details</h5>

                        <div className="row g-3">
                          {orderFields
                            .filter(f => f.type !== "file")
                            .map(field => (
                              <div key={field._id} className="col-md-6">
                                <div className="info-box">

                                  <div className="info-label">
                                    <small className="text-muted me-2">
                                      #{field.showIn.orders.serialNo || "-"}
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
                                      onChange={(e) =>
                                        handleChange(field._id, e.target.value)
                                      }
                                    />
                                  )}

                                  {/* NUMBER */}
                                  {field.type === "number" && (
                                    <input
                                      type="number"
                                      className="form-control"
                                      placeholder={`Enter ${field.label}`}
                                      value={formValues[field._id] || ""}
                                      onChange={(e) =>
                                        handleChange(field._id, e.target.value)
                                      }
                                    />
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
                                      <label
                                        className="form-check-label"
                                        htmlFor={`chk-${field._id}`}
                                      >
                                        Yes / No
                                      </label>
                                    </div>
                                  )}

                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    {/* =======================
                        RIGHT SIDE — IMAGES
                    ======================= */}
                    <div className="col-lg-4">
                      <div className="image-panel sticky-top">
                        <h6 className="image-panel-title">🖼 Images / Attachments</h6>

                        {orderFields
                          .filter(f => f.type === "file")
                          .map(field => (
                            <div key={field._id} className="image-upload-box mb-3">

                              <div className="info-label mb-1">
                                {field.label}
                              </div>

                              <input
                                type="file"
                                className="form-control"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;

                                  setUploadingField(field._id);

                                  const uploadedUrl = await uploadToImgBB(file);

                                  if (uploadedUrl) {
                                    handleChange(field._id, uploadedUrl);
                                  }

                                  setUploadingField(null);
                                }}
                              />

                              {/* UPLOADING STATE */}
                              {uploadingField === field._id && (
                                <div className="small text-muted mt-1">Uploading…</div>
                              )}

                              {/* IMAGE PREVIEW */}
                              {formValues[field._id] && uploadingField !== field._id && (
                                <a
                                  href={formValues[field._id]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="image-card mt-2"
                                >
                                  <img src={formValues[field._id]} alt="Preview" />
                                </a>
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
              <button
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                className="btn btn-gold"
                onClick={handleSave}
              >
                Save Order
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* SELL ORDER MODAL */}
      <div className="modal fade" id="sellOrderModal" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content custom-modal">

            <div className="modal-header">
              <h5 className="modal-title">Sell Order</h5>
              <button className="btn-close" data-bs-dismiss="modal"></button>
            </div>

            <div className="modal-body">
              {!sellModalOrder ? (
                <p className="text-muted">No order selected</p>
              ) : (
                <>


                  <h6 className="text-gold mt-3">Customer Details</h6>

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
                              setSellSoldValues(prev => ({
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
                              setSellSoldValues(prev => ({
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

                  <h6 className="text-gold mb-3">Pricing</h6>

                  <div className="row g-3 mb-3">
                    <div className="col-md-4">
                      <label>Selling Price</label>
                      <input
                        type="number"
                        className="form-control"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                      />
                    </div>

                    <div className="col-md-4">
                      <label>Discount</label>
                      <input
                        type="number"
                        className="form-control"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                    </div>

                    <div className="col-md-4">
                      <label>Final Price</label>
                      <input
                        type="number"
                        className="form-control"
                        value={finalPrice}
                        disabled
                      />
                    </div>
                  </div>

                  <h6 className="text-gold mt-4">Payments</h6>

                  {payments.map((p, i) => (
                    <div className="row g-2 mb-2" key={i}>
                      {/* AMOUNT */}
                      <div className="col-md-3">
                        <input
                          type="number"
                          className="form-control"
                          placeholder="Amount"
                          value={p.amount}
                          onChange={(e) => {
                            const copy = [...payments];
                            copy[i].amount = e.target.value;
                            setPayments(copy);
                          }}
                        />
                      </div>

                      {/* DATE */}
                      <div className="col-md-3">
                        <input
                          type="date"
                          className="form-control"
                          value={p.date}
                          onChange={(e) => {
                            const copy = [...payments];
                            copy[i].date = e.target.value;
                            setPayments(copy);
                          }}
                        />
                      </div>

                      {/* MODE */}
                      <div className="col-md-3">
                        <select
                          className="form-select"
                          value={p.mode}
                          onChange={(e) => {
                            const copy = [...payments];
                            copy[i].mode = e.target.value;
                            setPayments(copy);
                          }}
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="bank">Bank</option>
                          <option value="card">Card</option>
                          <option value="cheque">Cheque</option>
                          <option value="gold">Gold</option>
                        </select>
                      </div>

                      {/* NOTES / PAID BY */}
                      <div className="col-md-3">
                        <input
                          type="text"
                          className="form-control"
                          placeholder={getPaymentDetailLabel(p.mode)}
                          value={p.paidBy || ""}
                          onChange={(e) => {
                            const copy = [...payments];
                            copy[i].paidBy = e.target.value;
                            setPayments(copy);
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    className="btn btn-gold mt-2"
                    onClick={() =>
                      setPayments(prev => [
                        ...prev,
                        {
                          amount: "",
                          date: new Date().toISOString().slice(0, 10),
                          mode: "cash",
                          paidBy: ""
                        }
                      ])
                    }
                  >
                    + Add Payment
                  </button>

                  <div className="row g-3 mt-3">
                    <div className="col-md-6">
                      <label>Total Paid</label>
                      <input className="form-control" value={totalPaid} disabled />
                    </div>
                    <div className="col-md-6">
                      <label>Amount Due</label>
                      <input className="form-control" value={amountDue} disabled />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button className="btn btn-gold" onClick={handleConfirmSell}>
                Confirm Sell
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* =======================
         ORDERS OVERVIEW (SEXY SPLIT-PANE UI)
      ======================= */}
      
      {/* ── Stat Cards ── */}
      <div className="orders-stat-cards mb-4">
        <div className="orders-stat-card">
          <div className="orders-stat-icon orders-stat-icon--total">🧾</div>
          <div className="orders-stat-info">
            <span className="orders-stat-label">Total Orders</span>
            <span className="orders-stat-value">{totals?.totalOrders || 0}</span>
            <span className="orders-stat-sub">Across system</span>
          </div>
        </div>
        <div className="orders-stat-card">
          <div className="orders-stat-icon orders-stat-icon--pending">⏳</div>
          <div className="orders-stat-info">
            <span className="orders-stat-label">Pending</span>
            <span className="orders-stat-value">{totals?.pendingCount || 0}</span>
            <span className="orders-stat-sub">In progress</span>
          </div>
        </div>
        <div className="orders-stat-card">
          <div className="orders-stat-icon orders-stat-icon--paid">✅</div>
          <div className="orders-stat-info">
            <span className="orders-stat-label">Completed</span>
            <span className="orders-stat-value">{totals?.completedCount || 0}</span>
            <span className="orders-stat-sub">Sold</span>
          </div>
        </div>
        <div className="orders-stat-card">
          <div className="orders-stat-icon orders-stat-icon--partial">💰</div>
          <div className="orders-stat-info">
            <span className="orders-stat-label">Gold Given</span>
            <span className="orders-stat-value">{totals?.totalGoldGiven || 0}g</span>
            <span className="orders-stat-sub">To workers</span>
          </div>
        </div>
      </div>

      <div className={`orders-content-grid ${selectedItem ? "has-preview" : "no-preview"}`}>
        <div className="orders-main">
          {/* SEARCH AND FILTERS */}
          <div className="d-flex gap-3 mb-3 bg-white p-2 rounded shadow-sm border align-items-center">
            <div className="position-relative flex-grow-1">
              <input
                type="text"
                className="form-control"
                placeholder="Search by Order ID, Customer, or Order For..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ paddingLeft: "35px" }}
              />
              <span className="position-absolute text-muted" style={{ left: "12px", top: "50%", transform: "translateY(-50%)" }}>🔍</span>
            </div>
            
            <select
              className="form-select"
              style={{ width: "200px" }}
              value={statusFilter || "all"}
              onChange={(e) => {
                setStatusFilter(e.target.value === "all" ? "" : e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="orders-table-wrapper">
            <table className="orders-table table-hover w-100">
              <thead>
                <tr>
                  <th className="ps-3 py-3">#</th>
                  <th className="py-3">Order Info</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Order For</th>
                  <th className="py-3">Gold Given</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-4 text-muted">No orders found.</td></tr>
                ) : orders.map((order, idx) => {
                  const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                  return (
                    <tr key={order._id} onClick={() => setSelectedItem(order)} className={selectedItem?._id === order._id ? "selected-row" : ""} style={{ cursor: "pointer" }}>
                      <td className="ps-3 fw-bold text-muted">{globalIdx}</td>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f5ebc9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                            {order.modelImage ? <img src={order.modelImage} alt="" style={{width: '100%', height: '100%', borderRadius: 8, objectFit: "cover"}} /> : "🧾"}
                          </div>
                          <div className="d-flex flex-column">
                            <span className="fw-bold text-gold">{order.orderID}</span>
                            <span className="small text-muted">{order.customerId?.name || "Walk-in"}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                         <span className={`badge bg-${order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : 'danger'}`}>{order.status.toUpperCase()}</span>
                      </td>
                      <td className="text-muted fw-medium">{order.orderFor || "—"}</td>
                      <td className="text-muted fw-medium">{order.goldGivenToWorker || 0}g</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          <div className="d-flex justify-content-between align-items-center mt-3 bg-white p-2 rounded shadow-sm border">
             <div className="d-flex align-items-center gap-2">
               <span className="small text-muted fw-medium">Rows per page:</span>
               <select className="form-select form-select-sm" style={{width: 70}} value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                 <option value={10}>10</option>
                 <option value={20}>20</option>
                 <option value={50}>50</option>
               </select>
             </div>
             <div className="d-flex align-items-center gap-3">
               <button className="btn btn-sm btn-outline-secondary" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
               <span className="small fw-bold">Page {currentPage} of {totalPages}</span>
               <button className="btn btn-sm btn-outline-secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
             </div>
          </div>
        </div>

        {selectedItem && (
          <div className="orders-detail bg-white rounded shadow-sm border p-4 position-relative" style={{ height: 'fit-content' }}>
            <button className="btn-close position-absolute top-0 end-0 m-3" onClick={() => setSelectedItem(null)}></button>
            <div className="text-center mb-4">
              {selectedItem.modelImage ? (
                 <img src={selectedItem.modelImage} alt="Order Preview" className="img-fluid rounded shadow-sm mb-3" style={{ maxHeight: 200, objectFit: "cover" }} />
              ) : (
                 <div className="mx-auto rounded d-flex align-items-center justify-content-center bg-light mb-3" style={{ width: 120, height: 120, fontSize: 40 }}>🧾</div>
              )}
              <h4 className="fw-bold text-gold m-0">{selectedItem.orderID}</h4>
              <span className={`badge bg-${selectedItem.status === 'completed' ? 'success' : selectedItem.status === 'pending' ? 'warning' : 'danger'} mt-2`}>{selectedItem.status.toUpperCase()}</span>
            </div>
            
            <hr className="text-muted" />
            
            <div className="d-flex flex-column gap-2 mb-4">
              <div className="d-flex justify-content-between"><span className="text-muted">Customer:</span><strong className="text-dark">{selectedItem.customerId?.name || "-"}</strong></div>
              <div className="d-flex justify-content-between"><span className="text-muted">Worker:</span><strong className="text-dark">{selectedItem.workerId?.name || "-"}</strong></div>
              <div className="d-flex justify-content-between"><span className="text-muted">Order For:</span><strong className="text-dark">{selectedItem.orderFor || "-"}</strong></div>
              <div className="d-flex justify-content-between"><span className="text-muted">Ordered To:</span><strong className="text-dark">{selectedItem.orderedTo || "-"}</strong></div>
              <div className="d-flex justify-content-between"><span className="text-muted">Home Delivery:</span><strong className="text-dark">{selectedItem.homeDelivery ? "Yes" : "No"}</strong></div>
              <div className="d-flex justify-content-between"><span className="text-muted">Address:</span><strong className="text-dark">{selectedItem.orderedAddress || "-"}</strong></div>
              <div className="d-flex justify-content-between"><span className="text-muted">Cost Price:</span><strong className="text-dark">₹{selectedItem.buyingCostPrice || 0}</strong></div>
              <div className="d-flex justify-content-between"><span className="text-muted">Gold Given:</span><strong className="text-dark">{selectedItem.goldGivenToWorker || 0}g ({selectedItem.goldPurity || 0}%)</strong></div>
            </div>
            
            {selectedItem.status !== "completed" && selectedItem.status !== "cancelled" && (
              <button 
                className="btn btn-gold w-100 py-2 fw-bold" 
                onClick={() => handleSellFromOrder(selectedItem)}
              >
                Complete & Sell Order
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}