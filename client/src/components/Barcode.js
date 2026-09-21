import React from "react";
import QRCodeSvg from "./QRCodeSvg";

export default function Barcode({ value, size = 90 }) {
  return <QRCodeSvg value={value} size={size} />;
}