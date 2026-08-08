import React from "react";
import { COLORS } from "../lib/theme.jsx";

export function Card({ children, style = {}, pad = 24 }) {
  const { gridColumn, ...restStyle } = style;
  const colSpanVar = gridColumn ? String(gridColumn).replace("span ", "") : "12";
  return (
    <div
      className="wos-card"
      style={{
        background: COLORS.beige, borderRadius: 20, padding: pad, border: `1px solid ${COLORS.line}`,
        "--col-span": colSpanVar, ...restStyle,
      }}
    >
      {children}
    </div>
  );
}

export function Label({ children }) {
  return <div style={{ fontSize: 13, color: COLORS.inkSoft, letterSpacing: 0.2, marginBottom: 6 }}>{children}</div>;
}

export function Dots({ n, color }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ width: 5, height: 5, borderRadius: 999, background: i <= n ? color : COLORS.line }} />
      ))}
    </div>
  );
}
