import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import api from "../../api/axios";
import "./Layout.css";
import {
  FiGrid,
  FiBox,
  FiFileText,
  FiBookOpen,
  FiMoreHorizontal,
  FiSun,
  FiMoon,
  FiUsers,
  FiCheckCircle,
  FiSettings,
  FiLogOut,
  FiX,
} from "react-icons/fi";
import { FaCrown } from "react-icons/fa";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Persisted Sidebar collapsed state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

  // Persisted Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme-dark-enabled") === "true" ||
      document.body.classList.contains("theme-dark")
    );
  });

  // Mobile More sheet state
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Sync theme with body & localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add("theme-dark");
    } else {
      document.body.classList.remove("theme-dark");
    }
    localStorage.setItem("theme-dark-enabled", isDarkMode ? "true" : "false");
  }, [isDarkMode]);

  // Sync collapsed with localStorage
  const handleToggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", next ? "true" : "false");
      return next;
    });
  };

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user_role");
      delete api.defaults.headers.common["Authorization"];
      navigate("/");
    }
  };

  // Close more sheet when navigating
  useEffect(() => {
    setMoreMenuOpen(false);
  }, [location.pathname]);

  const isTabActive = (path) => {
    if (path === "/dashboard" && location.pathname === "/dashboard") return true;
    if (path !== "/dashboard" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="app-layout">
      {/* DESKTOP SIDEBAR */}
      <Sidebar
        isCollapsed={isCollapsed}
        toggleSidebar={handleToggleSidebar}
        isDarkMode={isDarkMode}
        toggleTheme={handleToggleTheme}
      />

      {/* MAIN VIEWPORT */}
      <div className={`main-content ${isCollapsed ? "collapsed" : ""}`}>
        <Outlet />
      </div>

      {/* ============================================================
         📱 IPHONE 15 PRO MAX GLOBAL BOTTOM NAVIGATION BAR
         ============================================================ */}
      <nav className="ios-bottom-nav-bar">
        <Link
          to="/dashboard"
          className={`ios-nav-item ${isTabActive("/dashboard") ? "active" : ""}`}
        >
          <div className="ios-nav-icon-wrap">
            <FiGrid />
          </div>
          <span>Dashboard</span>
        </Link>

        <Link
          to="/inventory"
          className={`ios-nav-item ${isTabActive("/inventory") ? "active" : ""}`}
        >
          <div className="ios-nav-icon-wrap">
            <FiBox />
          </div>
          <span>Inventory</span>
        </Link>

        <Link
          to="/orders"
          className={`ios-nav-item ${isTabActive("/orders") ? "active" : ""}`}
        >
          <div className="ios-nav-icon-wrap">
            <FiFileText />
          </div>
          <span>Orders</span>
        </Link>

        <Link
          to="/ledger"
          className={`ios-nav-item ${isTabActive("/ledger") ? "active" : ""}`}
        >
          <div className="ios-nav-icon-wrap">
            <FiBookOpen />
          </div>
          <span>Ledger</span>
        </Link>

        <button
          type="button"
          className={`ios-nav-item ${moreMenuOpen ? "active" : ""}`}
          onClick={() => setMoreMenuOpen(true)}
        >
          <div className="ios-nav-icon-wrap">
            <FiMoreHorizontal />
          </div>
          <span>More</span>
        </button>
      </nav>

      {/* ============================================================
         📱 IPHONE 15 PRO MAX "MORE / SETTINGS & THEME" BOTTOM SHEET
         ============================================================ */}
      {moreMenuOpen && (
        <div
          className="ios-more-sheet-overlay"
          onClick={() => setMoreMenuOpen(false)}
        >
          <div
            className="ios-more-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grabber Indicator */}
            <div className="ios-sheet-grabber" />

            <div className="ios-sheet-header">
              <div className="d-flex align-items-center gap-2">
                <div className="brand-icon-box" style={{ width: 28, height: 28, fontSize: 12 }}>
                  <FaCrown />
                </div>
                <div>
                  <h4 className="ios-sheet-title">Workspace Menu</h4>
                  <span className="very-small text-muted">Aneesh Business Console</span>
                </div>
              </div>
              <button
                type="button"
                className="ios-close-btn"
                onClick={() => setMoreMenuOpen(false)}
              >
                <FiX />
              </button>
            </div>

            {/* THEME TOGGLE CARD */}
            <div className="ios-theme-card">
              <div className="d-flex align-items-center gap-2">
                {isDarkMode ? <FiMoon className="text-warning fs-5" /> : <FiSun className="text-warning fs-5" />}
                <div>
                  <span className="fw-bold d-block small">Interface Theme</span>
                  <span className="very-small text-muted">
                    {isDarkMode ? "Dark Mode (OLED Luxury)" : "Light Mode (Classic Gold)"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={`ios-theme-toggle-switch ${isDarkMode ? "dark-active" : "light-active"}`}
                onClick={handleToggleTheme}
              >
                <span className="ios-theme-pill">
                  <FiSun size={12} /> Light
                </span>
                <span className="ios-theme-pill">
                  <FiMoon size={12} /> Dark
                </span>
                <div className="ios-theme-thumb" />
              </button>
            </div>

            {/* QUICK NAVIGATION LINKS */}
            <div className="ios-sheet-links-list">
              <Link to="/people" className="ios-sheet-link-item">
                <div className="ios-link-icon-box">
                  <FiUsers />
                </div>
                <div className="d-flex flex-column flex-fill">
                  <span className="fw-bold">People &amp; Contacts</span>
                  <span className="very-small text-muted">Wholesalers, Workers &amp; Customers</span>
                </div>
              </Link>

              <Link to="/sold" className="ios-sheet-link-item">
                <div className="ios-link-icon-box">
                  <FiCheckCircle />
                </div>
                <div className="d-flex flex-column flex-fill">
                  <span className="fw-bold">Sold &amp; Sales Ledger</span>
                  <span className="very-small text-muted">Archived and completed sales</span>
                </div>
              </Link>

              <Link to="/settings" className="ios-sheet-link-item">
                <div className="ios-link-icon-box">
                  <FiSettings />
                </div>
                <div className="d-flex flex-column flex-fill">
                  <span className="fw-bold">System Settings</span>
                  <span className="very-small text-muted">Gold rate, taxes &amp; preferences</span>
                </div>
              </Link>
            </div>

            {/* LOGOUT BUTTON */}
            <button
              type="button"
              className="ios-logout-btn"
              onClick={handleLogout}
            >
              <FiLogOut />
              <span>Log Out of Console</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
