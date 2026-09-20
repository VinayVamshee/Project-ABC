import React from "react";
import "./LogoLoader.css";

export default function LogoLoader({ text, fullScreen = false }) {
  return (
    <div className={`logo-loader-container ${fullScreen ? "fullscreen" : ""}`}>
      <div className="logo-loader-pulse">
        <img src="/logo192.png" alt="Loading..." className="logo-img" />
      </div>
      {text && <div className="logo-loader-text">{text}</div>}
    </div>
  );
}
