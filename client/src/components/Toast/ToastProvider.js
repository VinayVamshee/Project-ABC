import React, { useEffect, useState } from "react";
import { registerNotify } from "./toast";
import ToastContainer from "./ToastContainer";

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    registerNotify(addToast);
  }, []);

  const addToast = (type, message) => {
    const id = Date.now();

    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} />
    </>
  );
}