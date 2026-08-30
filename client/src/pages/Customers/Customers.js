import React, { useState, useEffect } from "react";
import api from "../../api/axios";
import { notify } from "../../components/Toast/toast";
import TopPanel from "../TopPanel/TopPanel";

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams, setSearchParams] = useState("");

    const fetchCustomers = async (search = "") => {
        try {
            setLoading(true);
            const res = await api.get(`/customers?search=${search}`);
            if (res.data.success) {
                setCustomers(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch customers", error);
            notify.error("Failed to fetch customers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers(searchParams);
    }, [searchParams]);

    return (
        <div className="page-shell p-4">
            <div className="top-header mb-4 bg-white rounded shadow-sm border p-3 d-flex align-items-center">
                <h4 className="fw-bold">👥 Customer Directory</h4>
                <div className="flex-grow-1">
                    <TopPanel
                        section="customers"
                        onSearchChange={(text) => setSearchParams(text)}
                        hideFilters={true}
                    />
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-gold" onClick={() => notify.info("Coming soon!")}>
                        + Add Customer
                    </button>
                </div>
            </div>

            {loading ? (
                <p>Loading customers...</p>
            ) : customers.length === 0 ? (
                <div className="alert alert-info">No customers found. Start selling to build your directory!</div>
            ) : (
                <div className="table-responsive bg-white rounded shadow-sm border border-gold-light">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Loyalty Points</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c) => (
                                <tr key={c._id}>
                                    <td className="fw-bold">{c.name}</td>
                                    <td>{c.phone}</td>
                                    <td>{c.email || "-"}</td>
                                    <td><span className="badge bg-warning text-dark">{c.loyaltyPoints}</span></td>
                                    <td>
                                        <button className="btn btn-sm btn-outline-action" onClick={() => notify.info("Coming soon!")}>View Profile</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
