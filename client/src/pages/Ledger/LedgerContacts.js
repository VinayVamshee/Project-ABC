import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import { notify } from "../../components/Toast/toast";
import "./Ledger.css";

export default function LedgerContacts() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [categories, setCategories] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ['ledgerBalances'],
    queryFn: async () => {
      const res = await api.get("/ledger/balances");
      if (res.data.success) {
        return res.data.contacts || [];
      }
      return [];
    }
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (isAdding) return;
    setIsAdding(true);
    try {
      const catArray = categories.split(",").map(c => c.trim()).filter(c => c);
      const res = await api.post("/contacts", { name, phone, categories: catArray });
      if (res.data.success) {
        notify.success("Contact added");
        setName("");
        setPhone("");
        setCategories("");
        document.getElementById("closeAddContactBtn")?.click();
        queryClient.invalidateQueries({ queryKey: ["ledgerBalances"] });
      }
    } catch (err) {
      console.error(err);
      notify.error("Failed to add contact");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Ledger Contacts</h2>
          <p className="page-subtitle">Manage people and businesses in your personal ledger</p>
        </div>
        <div>
          <Link to="/ledger" className="btn btn-outline-secondary me-2">Dashboard</Link>
          <button className="btn btn-gold" data-bs-toggle="modal" data-bs-target="#addContactModal">
            + Add Contact
          </button>
        </div>
      </div>

      <div className="page-card p-4">
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Name</th>
                <th>Categories</th>
                <th>Money Given (You Owe)</th>
                <th>Money Received (They Owe)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c._id}>
                  <td className="fw-bold">{c.name}</td>
                  <td>
                    {c.categories?.map(cat => (
                      <span key={cat} className="badge bg-secondary me-1">{cat}</span>
                    ))}
                  </td>
                  <td className="text-danger fw-bold">₹{Math.round(c.balances?.moneyOwnerOwes || 0).toLocaleString("en-IN")}</td>
                  <td className="text-success fw-bold">₹{Math.round(c.balances?.moneyOwedToOwner || 0).toLocaleString("en-IN")}</td>
                  <td>
                    <Link to={`/ledger/contacts/${c._id}`} className="btn btn-sm btn-outline-primary">
                      View Ledger
                    </Link>
                  </td>
                </tr>
              ))}
              {contacts.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">No contacts found in ledger.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <div className="modal fade" id="addContactModal" tabIndex="-1">
        <div className="modal-dialog">
          <form className="modal-content custom-modal" onSubmit={handleAdd}>
            <div className="modal-header">
              <h5 className="modal-title">Add Ledger Contact</h5>
              <button type="button" className="btn-close" id="closeAddContactBtn" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Name *</label>
                <input required type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Phone</label>
                <input type="text" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label">Categories (comma separated)</label>
                <input type="text" className="form-control" placeholder="e.g. Worker, Wholesaler" value={categories} onChange={e => setCategories(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" className="btn btn-gold" disabled={isAdding}>Save Contact</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
