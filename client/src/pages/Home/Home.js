import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import {
  FaBoxes,
  FaClipboardList,
  FaCheckCircle,
  FaCog,
  FaChartLine,
  FaSignInAlt,
  FaEye,
  FaEyeSlash,
  FaSignOutAlt
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Home.css";

export default function Home() {

  /* =======================
     AUTH STATE
  ======================== */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuth, setIsAuth] = useState(false);

  /* =======================
     CHECK TOKEN ON LOAD
  ======================== */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuth(true);
    }
  }, []);

  /* =======================
     DASHBOARD CARDS
  ======================== */
  const cards = [
    {
      name: "Dashboard",
      description: "Business insights, sales, profit and analytics",
      icon: <FaChartLine size={24} />,
      link: "/dashboard",
    },
    { name: "Inventory", description: "Track stock and product details", icon: <FaBoxes size={24} />, link: "/inventory" },
    { name: "Orders", description: "Manage pending and completed orders", icon: <FaClipboardList size={24} />, link: "/orders" },
    { name: "Sold", description: "Review sales and payment status", icon: <FaCheckCircle size={24} />, link: "/sold" },
    { name: "Settings", description: "Customize fields and workflow", icon: <FaCog size={24} />, link: "/settings" },
  ];

  /* =======================
     VALIDATION
  ======================== */
  const validate = () => {
    if (!email) return "Username is required";
    if (!password) return "Password is required";
    return null;
  };

  /* =======================
     LOGIN
  ======================== */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/login", {
        email,     // username
        password,
      });

      // ✅ SAVE TOKEN
      localStorage.setItem("token", res.data.token);
      setIsAuth(true);

      setLoading(false);

      // Close modal safely
      const modal = document.getElementById("loginModal");
      if (modal && window.bootstrap?.Modal) {
        const modalInstance = window.bootstrap.Modal.getOrCreateInstance(modal);
        modalInstance.hide();
      }

      setEmail("");
      setPassword("");

    } catch (err) {
      setLoading(false);
      setError(
        err.response?.data?.message || "Login failed"
      );
    }
  };

  /* =======================
     LOGOUT
  ======================== */
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuth(false);
  };

  return (
    <div className="home-container">
      <div className="home-shell">
        <header className="home-header">
          <div className="home-brand">
            <div className="brand-mark">ABC</div>
            <div>
              <h1>Aneesh Business Console</h1>
              <p>Gold shop inventory, orders, and sales in one refined workspace.</p>
            </div>
          </div>

          {!isAuth ? (
            <button
              type="button"
              className="home-login-btn"
              data-bs-toggle="modal"
              data-bs-target="#loginModal"
            >
              <FaSignInAlt size={15} />
              <span>Login</span>
            </button>
          ) : (
            <button
              type="button"
              className="home-login-btn home-logout-btn"
              onClick={handleLogout}
            >
              <FaSignOutAlt size={15} />
              <span>Logout</span>
            </button>
          )}
        </header>

        <section className="home-hero">
          <div className="hero-copy">
            <span className="eyebrow">Premium operations hub</span>
            <h2>Designed for elegant inventory control and trusted business flow.</h2>
            <p>Move from stock to sales with clarity, minimal effort, and a polished experience.</p>
          </div>
        </section>

        <section className="card-container">
          {cards.map((card, i) => (
            <Link key={i} to={card.link} className="home-card text-decoration-none">
              <div className="home-card-icon">{card.icon}</div>
              <div className="home-card-content">
                <h5>{card.name}</h5>
                <p>{card.description}</p>
              </div>
            </Link>
          ))}
        </section>

        {/* =======================
            LOGIN MODAL
        ======================== */}
        <div className="modal fade" id="loginModal" tabIndex="-1">
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content login-modal">

              <div className="modal-header border-0 px-5 pt-4">
                <div>
                  <h2 className="fw-bold mb-1">Welcome to ABC</h2>
                  <p className="text-muted mb-0">
                    Secure access to Aneesh Business Console
                  </p>
                </div>
                <button type="button" className="btn-close" data-bs-dismiss="modal" />
              </div>

              <div className="login-divider"></div>

              <div className="modal-body px-5 py-4">
                <form className="login-form mx-auto" onSubmit={handleLogin}>

                  {error && (
                    <div className="alert alert-danger py-2">
                      {error}
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      Username
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      Password
                    </label>
                    <div className="input-group input-group-lg">
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div className="d-grid">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg login-btn"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign In"}
                    </button>
                  </div>

                </form>
              </div>

              <div className="modal-footer border-0 justify-content-center pb-4">
                <small className="text-muted">
                  © {new Date().getFullYear()} ABC • Secure Business Access
                </small>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
