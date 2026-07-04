import React from "react";
import "./toast.css";

export default function ToastContainer({ toasts }) {
  return (
    <div className="toast-wrapper">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-card toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}