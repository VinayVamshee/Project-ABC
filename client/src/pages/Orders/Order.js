import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import OverviewPanel from "../Overview/OverviewPanel";
import TopPanel from "../TopPanel/TopPanel";
import "./Order.css";

export default function Order() {
  /* =======================
     STATE
  ======================= */
  const [orderFields, setOrderFields] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [orders, setOrders] = useState([]);
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
  const [activeFilters, setActiveFilters] = useState([]);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [statusFilter, setStatusFilter] = useState("");

  const handleTopPanelChange = (filters, sortF, sortO, status) => {
    setActiveFilters(filters);
    setSortField(sortF);
    setSortOrder(sortO);
    setStatusFilter(status);
  };

  const filteredOrders = orders
    .filter(order => {
      // 🔍 SEARCH
      if (searchText) {
        const search = searchText.toLowerCase();
        const values = [
          ...(order.orderFields || []).map(f => String(f.value || "").toLowerCase()),
          String(order.orderID || "").toLowerCase(),
          String(order._id || "").toLowerCase(),
        ];
        if (!values.some(v => v?.includes(search))) return false;
      }

      // 🏷 STATUS FILTER
      if (statusFilter && order.status !== statusFilter) return false;

      // 📌 FIELD FILTERS
      for (const f of activeFilters) {

        // Backend field (not dynamic)
        if (f.fieldId === "buyingCostPrice") {
          if (Number(order.buyingCostPrice || 0) !== Number(f.value)) {
            return false;
          }
          continue;
        }

        const field = order.orderFields?.find(
          x => String(x.fieldRef?._id) === String(f.fieldId)
        );

        if (!field) return false;

        // Checkbox
        if (f.type === "checkbox") {
          const expected = f.value === "true";
          if (Boolean(field.value) !== expected) return false;
          continue;
        }

        // Number / currency
        if (["number", "currency", "weight"].includes(f.type)) {
          if (Number(field.value) !== Number(f.value)) return false;
          continue;
        }

        // Text / select / mcq
        if (
          String(field.value).toLowerCase() !==
          String(f.value).toLowerCase()
        ) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (!sortField) return 0;

      const getVal = (item) => {
        if (item[sortField] !== undefined) return Number(item[sortField] || 0);
        const f = item.orderFields?.find(x => x.fieldRef === sortField);
        return Number(f?.value || 0);
      };

      const diff = getVal(a) - getVal(b);
      return sortOrder === "asc" ? diff : -diff;
    });

  const fetchSoldFields = async () => {
    try {
      const res = await api.get("/fields");
      if (res.data.success) {
        const soldFields = res.data.fields
          .filter(f => f.showIn?.sold?.show)
          .sort(
            (a, b) =>
              (a.showIn.sold.serialNo || 0) -
              (b.showIn.sold.serialNo || 0)
          );

        setSoldFieldsDefs(soldFields);
      }
    } catch (err) {
      console.error("Failed to fetch sold fields", err);
    }
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
  const fetchFields = async () => {
    try {
      const res = await api.get("/fields");
      if (res.data.success) {
        const filtered = res.data.fields
          .filter(f => f.showIn?.orders?.show)
          .sort(
            (a, b) =>
              (a.showIn.orders.serialNo || 0) -
              (b.showIn.orders.serialNo || 0)
          );

        setOrderFields(filtered);
      }
    } catch (err) {
      console.error("Failed to fetch order fields", err);
    }
  };

  /* =======================
     FETCH ORDERS
  ======================= */
  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders");
      if (res.data.success) {
        setOrders(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  };

  useEffect(() => {
    fetchFields();
    fetchOrders();
    fetchSoldFields();
  }, []);

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
    <div className="order-page p-4">

      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold text-gold">🧾 Orders</h4>

        <div className="flex-grow-1 ms-4">
          <TopPanel
            section="orders"
            fields={orderFields}
            onSearchChange={setSearchText}
            onFiltersChange={handleTopPanelChange}
          />
        </div>

        <button
          className="btn btn-gold"
          data-bs-toggle="modal"
          data-bs-target="#addOrderModal"
        >
          + Create New Order
        </button>
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
         ORDERS OVERVIEW
      ======================= */}
      <OverviewPanel
        section="orders"
        items={filteredOrders}
        onRefresh={fetchOrders}
        onSell={handleSellFromOrder}
      />
    </div>
  );
}