import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home/Home";
import Settings from "./pages/Settings/Settings";
import Inventory from "./pages/Inventory/Inventory";
import OverviewPanel from "./pages/Overview/OverviewPanel";
import Order from "./pages/Orders/Order";
import Sold from "./pages/Sold/Sold";
import Dashboard from "./pages/Dashboard/Dashboard";
import { useEffect } from "react";
import ProtectedRoute from "./components/ProtectedRoute";

// 🔔 Toast Provider
import ToastProvider from "./components/Toast/ToastProvider";

function App() {

  // Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem("theme-dark-enabled") === "true";
    if (saved) document.body.classList.add("theme-dark");
  }, []);

  const toggleTheme = () => {
    document.body.classList.toggle("theme-dark");

    localStorage.setItem(
      "theme-dark-enabled",
      document.body.classList.contains("theme-dark")
    );
  };

  const isDark = document.body.classList.contains("theme-dark");

  return (
    <ToastProvider>
      <div className="App">

        {/* ROUTES */}
        <BrowserRouter>
          <Routes>

            {/* ✅ PUBLIC */}
            <Route path="/" element={<Home />} />

            {/* 🔐 PROTECTED */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/overview"
              element={
                <ProtectedRoute>
                  <OverviewPanel />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Order />
                </ProtectedRoute>
              }
            />

            <Route
              path="/sold"
              element={
                <ProtectedRoute>
                  <Sold />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

          </Routes>
        </BrowserRouter>

        {/* 🌗 Floating Theme Toggle Button */}
        <button
          className="floating-theme-toggle"
          onClick={toggleTheme}
          title="Toggle Theme"
        >
          {isDark ? "🌕" : "🌑"}
        </button>

      </div>
    </ToastProvider>
  );
}

export default App;