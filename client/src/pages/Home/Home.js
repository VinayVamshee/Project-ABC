import React from "react";
import { Link } from "react-router-dom";
import { FaBoxes, FaClipboardList, FaCheckCircle, FaCog } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Home.css";

export default function Home() {
  const cards = [
    { name: "Inventory", icon: <FaBoxes size={40} />, link: "/inventory" },
    { name: "Orders", icon: <FaClipboardList size={40} />, link: "/orders" },
    { name: "Sold", icon: <FaCheckCircle size={40} />, link: "/sold" },
    { name: "Settings", icon: <FaCog size={40} />, link: "/settings" },
  ];

  return (
    <div className="home-container text-center">
      {/* Marquee */}
      <div className="home-marquee">
        <marquee scrollamount="7">ABC - Aneesh Business Console</marquee>
      </div>

      {/* Cards */}
      <div className="container mt-5">
        <div className="row align-items-center justify-content-center">
          {cards.map((card) => (
            <div key={card.name} className="col-10 col-sm-5 col-md-2 m-3">
              <Link to={card.link} className="text-decoration-none">
                <div className="home-card">
                  <div className="home-icon">{card.icon}</div>
                  <h5>{card.name}</h5>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
