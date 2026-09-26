import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Home from "./pages/Home/Home";
import Inventory from "./pages/Inventory/Inventory";
import AddInventoryItem from "./pages/Inventory/AddInventoryItem";
import OverviewPanel from "./pages/Overview/OverviewPanel";
import Order from "./pages/Orders/Order";
import Sales from "./pages/Sold/Sales";
import Dashboard from "./pages/Dashboard/Dashboard";
import People from "./pages/People/People";


import LedgerDashboard from "./pages/Ledger/LedgerDashboard";
import LedgerContacts from "./pages/Ledger/LedgerContacts";
import LedgerContactView from "./pages/Ledger/LedgerContactView";
import LedgerTransactions from "./pages/Ledger/LedgerTransactions";
import LedgerGroupCreate from "./pages/Ledger/LedgerGroupCreate";

import { useEffect } from "react";
import ProtectedRoute from "./components/ProtectedRoute";

// 🔔 Toast Provider
import ToastProvider from "./components/Toast/ToastProvider";

import BarcodeScanner from "./components/BarcodeScanner/BarcodeScanner";
import Layout from "./components/Layout/Layout";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes caching
      refetchOnWindowFocus: true,
    },
  },
});

function App() {

  // Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem("theme-dark-enabled") === "true";
    if (saved) document.body.classList.add("theme-dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <div className="App">
          {/* ROUTES */}
          <BrowserRouter>
            <BarcodeScanner />
            <Routes>

              {/* ✅ PUBLIC */}
            <Route path="/" element={<Home />} />

            {/* 🔐 PROTECTED with Sidebar Layout */}
            <Route element={<Layout />}>
              
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute>
                    <Inventory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/add"
                element={
                  <ProtectedRoute>
                    <AddInventoryItem />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory/edit/:id"
                element={
                  <ProtectedRoute>
                    <AddInventoryItem />
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
                path="/sales"
                element={
                  <ProtectedRoute>
                    <Sales />
                  </ProtectedRoute>
                }
              />
              <Route path="/sold" element={<Navigate to="/sales" replace />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/people"
                element={
                  <ProtectedRoute>
                    <People />
                  </ProtectedRoute>
                }
              />
              
              {/* LEDGER ROUTES */}
              <Route
                path="/ledger"
                element={
                  <ProtectedRoute>
                    <LedgerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ledger/contacts"
                element={
                  <ProtectedRoute>
                    <LedgerContacts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ledger/contacts/:id"
                element={
                  <ProtectedRoute>
                    <LedgerContactView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ledger/contact/:contactId"
                element={
                  <ProtectedRoute>
                    <LedgerContactView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ledger/transactions"
                element={
                  <ProtectedRoute>
                    <LedgerTransactions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ledger/group/new"
                element={
                  <ProtectedRoute>
                    <LedgerGroupCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ledger/obligations"
                element={
                  <ProtectedRoute>
                    <LedgerTransactions />
                  </ProtectedRoute>
                }
              />
            </Route>

          </Routes>
        </BrowserRouter>
      </div>
    </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;