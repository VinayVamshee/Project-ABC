import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import {
  FaCrown,
} from "react-icons/fa";
import {
  FiUser,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiSun,
  FiMoon,
  FiShield,
  FiCheckCircle,
} from "react-icons/fi";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Home.css";

export default function Home() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme-dark-enabled") === "true";
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add("theme-dark");
      localStorage.setItem("theme-dark-enabled", "true");
    } else {
      document.body.classList.remove("theme-dark");
      localStorage.setItem("theme-dark-enabled", "false");
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user_role", res.data.role || "admin");
      localStorage.setItem("user_name", res.data.user?.username || "Aneesh");
      api.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;

      setLoading(false);
      navigate("/dashboard");
    } catch (err) {
      setLoading(false);
      setError(
        err.response?.data?.message || "Invalid username or password. Please try again."
      );
    }
  };

  const handleQuickFill = () => {
    setEmail("SVLJ1983");
    setPassword("ANee12345");
    setError("");
  };

  return (
    <div className="login-portal-wrapper">
      {/* Background Ambient Glow Circles */}
      <div className="login-ambient-glow login-ambient-glow--1"></div>
      <div className="login-ambient-glow login-ambient-glow--2"></div>

      {/* Top Header Navigation */}
      <header className="login-top-nav">
        <div className="login-brand-pill">
          <div className="login-brand-icon">
            <FaCrown size={16} />
          </div>
          <span className="login-brand-text">Aneesh Console</span>
          <span className="login-version-badge">PRO</span>
        </div>

        <button
          type="button"
          className="login-theme-toggle"
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <FiSun size={17} /> : <FiMoon size={17} />}
          <span className="d-none d-sm-inline">{isDark ? "Light" : "Dark"}</span>
        </button>
      </header>

      {/* Main Centered Login Section */}
      <main className="login-main-container">
        <div className="login-glass-card">
          {/* Card Header */}
          <div className="login-card-header">
            <div className="login-emblem-ring">
              <FaCrown size={28} color="#C8A14B" />
            </div>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">
              Sign in to manage your jewellery inventory, live market rates, and business ledger.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="login-error-banner" role="alert">
              <span className="login-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="login-form" onSubmit={handleLogin}>
            {/* Username / ID Field */}
            <div className="login-input-group">
              <label htmlFor="username-input" className="login-input-label">
                Username / Admin ID
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <FiUser size={18} />
                </span>
                <input
                  id="username-input"
                  type="text"
                  className="login-text-input"
                  placeholder="e.g. SVLJ1983"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-input-group">
              <label htmlFor="password-input" className="login-input-label">
                Password
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">
                  <FiLock size={18} />
                </span>
                <input
                  id="password-input"
                  type={showPassword ? "text" : "password"}
                  className="login-text-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {/* Quick Demo Credentials Chip */}
            <div className="login-demo-helper" onClick={handleQuickFill}>
              <span className="login-demo-badge">
                <FiCheckCircle size={13} /> Quick Fill
              </span>
              <span className="login-demo-text">
                Demo Account: <strong>SVLJ1983</strong> / <strong>ANee12345</strong>
              </span>
            </div>

            {/* Submit CTA Button */}
            <button
              type="submit"
              className={`login-submit-btn ${loading ? "login-submit-btn--loading" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Authenticating...
                </>
              ) : (
                <>
                  <span>Sign In to Console</span>
                  <FiArrowRight size={18} className="login-btn-arrow" />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Badge */}
          <div className="login-card-footer">
            <div className="login-security-tag">
              <FiShield size={14} />
              <span>256-Bit SSL Encrypted Enterprise Workspace</span>
            </div>
          </div>
        </div>
      </main>

      {/* Portal Bottom Footer */}
      <footer className="login-bottom-footer">
        <p>© 2026 Aneesh Jewellery Business Console • All Rights Reserved</p>
      </footer>
    </div>
  );
}
