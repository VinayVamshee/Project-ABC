import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  FaCrown,
  FaSignInAlt,
  FaEye,
  FaEyeSlash
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user_role", res.data.role || "admin");
      api.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
      
      setLoading(false);
      navigate("/dashboard");

    } catch (err) {
      setLoading(false);
      setError(
        err.response?.data?.message || "Invalid username or password"
      );
    }
  };

  return (
    <div className="home-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="login-card" style={{ maxWidth: "450px", width: "100%", background: "#fff", padding: "2rem", borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}>
        
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ background: "var(--accent-gold)", width: "60px", height: "60px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto" }}>
            <FaCrown size={30} color="#fff" />
          </div>
          <h2 style={{ fontWeight: "700", margin: "0" }}>Aneesh Console</h2>
          <p style={{ color: "#666" }}>Login to your workspace</p>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label" style={{ fontWeight: "600" }}>Username / Email</label>
            <input
              type="text"
              className="form-control"
              placeholder="admin"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: "0.8rem" }}
            />
          </div>

          <div className="mb-4 position-relative">
            <label className="form-label" style={{ fontWeight: "600" }}>Password</label>
            <input
              type={showPassword ? "text" : "password"}
              className="form-control"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: "0.8rem", paddingRight: "40px" }}
            />
            <button
              type="button"
              className="btn btn-link position-absolute end-0 top-50 translate-middle-y mt-2"
              onClick={() => setShowPassword(!showPassword)}
              style={{ color: "#999", textDecoration: "none" }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <button
            type="submit"
            className="btn w-100"
            disabled={loading}
            style={{ background: "var(--accent-gold)", color: "#fff", padding: "0.8rem", fontWeight: "600", fontSize: "1.1rem" }}
          >
            {loading ? "Authenticating..." : (
              <>
                <FaSignInAlt className="me-2" /> Sign In
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
