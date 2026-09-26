import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiBox,
  FiFileText,
  FiCheckCircle,
  FiUsers,
  FiDatabase,
  FiBookOpen,
    FiLogOut,
  FiMenu,
  FiChevronRight,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import { FaCrown } from "react-icons/fa";
import api from "../../api/axios";
import "./Sidebar.css";

export default function Sidebar({
  isCollapsed,
  toggleSidebar,
  isDarkMode,
  toggleTheme,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = localStorage.getItem("user_role") || "admin";

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: <FiGrid /> },
    { name: "Inventory", path: "/inventory", icon: <FiBox /> },
    { name: "Orders", path: "/orders", icon: <FiFileText /> },
    { name: "Sales", path: "/sales", icon: <FiCheckCircle /> },

    { name: "People", path: "/people", icon: <FiUsers /> },
    {
      name: "Personal Ledger",
      path: "/ledger",
      icon: <FiBookOpen />,
      roles: ["admin"],
    },
      ];

  const handleBackup = () => {
    api.get("/system/backup", { responseType: "blob" })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `ABC_Full_Backup_${new Date().toISOString().slice(0,10)}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(() => alert("Backup failed"));
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

  return (
    <aside className={`luxury-sidebar ${isCollapsed ? "collapsed" : ""}`}>
      {/* BRAND HEADER */}
      <div className="sidebar-header">
        <div className="brand-wrapper">
          <div className="brand-icon-box">
            <FaCrown className="brand-crown-icon" />
          </div>
          <div className="brand-meta">
            <span className="brand-title">Aneesh Console</span>
            <span className="brand-tag">PRO WORKSPACE</span>
          </div>
        </div>

        <button
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle navigation menu"
        >
          {isCollapsed ? <FiChevronRight size={18} /> : <FiMenu size={18} />}
        </button>
      </div>

      {/* NAVIGATION LIST */}
      <nav className="sidebar-nav-container">
        <ul className="sidebar-nav-list">
          {navItems
            .filter((item) => !item.roles || item.roles.includes(userRole))
            .map((item) => {
              const isActive =
                item.path === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.path);
              return (
                <li key={item.name} className="sidebar-nav-item">
                  <Link
                    to={item.path}
                    className={`sidebar-nav-link ${isActive ? "active" : ""}`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <span className="sidebar-nav-icon">{item.icon}</span>
                    <span className="sidebar-nav-label">{item.name}</span>
                    {isActive && <span className="active-pill-indicator" />}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      {/* FOOTER: THEME TOGGLE & LOGOUT & BACKUP */}
      <div className="sidebar-footer-container">
        <button
          type="button"
          className="sidebar-logout-btn mb-2 d-flex justify-content-center align-items-center"
          style={{ background: "var(--portal-gold-soft)", color: "var(--portal-gold-dark)", border: "1px dashed var(--portal-gold)" }}
          onClick={handleBackup}
          title="Download Full Database Backup"
        >
          <span className="sidebar-nav-icon"><FiDatabase /></span>
          {!isCollapsed && <span className="sidebar-nav-label ms-2">Download Backup</span>}
        </button>
        {/* THEME TOGGLE BUTTON */}
        <div className="sidebar-theme-wrapper">
          {!isCollapsed ? (
            <button
              type="button"
              className={`theme-toggle-segmented ${
                isDarkMode ? "dark-active" : "light-active"
              }`}
              onClick={toggleTheme}
              title={`Switch to ${isDarkMode ? "Light" : "Dark"} Mode`}
            >
              <span className="theme-toggle-pill">
                <FiSun className="theme-icon" size={14} />
                <span>Light</span>
              </span>
              <span className="theme-toggle-pill">
                <FiMoon className="theme-icon" size={14} />
                <span>Dark</span>
              </span>
              <div className="theme-slider-thumb" />
            </button>
          ) : (
            <button
              type="button"
              className="theme-toggle-collapsed-btn"
              onClick={toggleTheme}
              title={`Switch to ${isDarkMode ? "Light" : "Dark"} Mode`}
            >
              {isDarkMode ? (
                <FiMoon className="theme-icon rotate-anim" size={18} />
              ) : (
                <FiSun className="theme-icon rotate-anim" size={18} />
              )}
            </button>
          )}
        </div>

        <div className="sidebar-footer-divider" />

        {/* LOGOUT BUTTON */}
        <button
          className="sidebar-logout-btn"
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
        >
          <span className="sidebar-nav-icon logout-icon">
            <FiLogOut />
          </span>
          <span className="sidebar-nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
