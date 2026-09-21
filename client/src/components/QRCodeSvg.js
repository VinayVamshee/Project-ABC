import React, { useMemo } from "react";
import { generateQRMatrix } from "../utils/qrcode";

export default function QRCodeSvg({
  value,
  size = 120,
  fgColor = "#1C1917",
  bgColor = "transparent",
  className = "",
}) {
  const matrix = useMemo(() => {
    try {
      return generateQRMatrix(value || "");
    } catch (err) {
      console.error("QR Code generation error:", err);
      return [];
    }
  }, [value]);

  if (!matrix || matrix.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          color: "#888",
          border: "1px dashed #ccc",
          borderRadius: 6,
        }}
      >
        No QR
      </div>
    );
  }

  const moduleCount = matrix.length;
  // Use a viewBox so it scales crisply at any size
  const viewBox = `0 0 ${moduleCount} ${moduleCount}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      className={className}
      style={{ display: "block", shapeRendering: "crispEdges" }}
    >
      {bgColor && bgColor !== "transparent" && (
        <rect width={moduleCount} height={moduleCount} fill={bgColor} />
      )}
      {matrix.map((row, r) =>
        row.map((isDark, c) =>
          isDark ? (
            <rect
              key={`${r}-${c}`}
              x={c}
              y={r}
              width={1}
              height={1}
              fill={fgColor}
            />
          ) : null
        )
      )}
    </svg>
  );
}

/**
 * Helper to generate standalone inline SVG string for print tags
 */
export function getQRCodeSvgString(value, size = 90) {
  try {
    const matrix = generateQRMatrix(value || "");
    if (!matrix || matrix.length === 0) return "";
    const count = matrix.length;
    let rects = "";
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (matrix[r][c]) {
          rects += `<rect x="${c}" y="${r}" width="1" height="1" fill="#000" />`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${count} ${count}" width="${size}" height="${size}" style="shape-rendering:crispEdges;display:inline-block;">${rects}</svg>`;
  } catch (e) {
    console.error("Failed to generate QR SVG string", e);
    return "";
  }
}
