import { BrowserRouter, Routes, Route } from 'react-router-dom';
import "./App.css"
import Home from './pages/Home/Home';
import Settings from './pages/Settings/Settings';
import Inventory from './pages/Inventory/Inventory';
import OverviewPanel from './pages/Overview/OverviewPanel';
import Order from './pages/Orders/Order';
import Sold from './pages/Sold/Sold';
import { useEffect } from 'react';

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
    <div className="App">

      {/* ROUTES */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/overview" element={<OverviewPanel />} />
          <Route path="/orders" element={<Order />} />
          <Route path="/sold" element={<Sold />} />
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
  );
}

export default App;