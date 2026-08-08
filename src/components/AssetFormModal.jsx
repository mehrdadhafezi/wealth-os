import React, { useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import { COLORS } from "../lib/theme.jsx";

const CATEGORY_OPTIONS = ["کسب‌وکار", "املاک", "سهام", "صندوق (ETF)", "کریپتو", "نقد", "طلا", "طلب (وام اعطایی)"];
const HORIZON_OPTIONS = ["کوتاه‌مدت", "میان‌مدت", "بلندمدت"];
const AI_OPTIONS = [
  { value: "Hold", label: "نگهداری" },
  { value: "Add", label: "افزایش" },
  { value: "Sell", label: "بررسی فروش" },
];

const EMPTY_FORM = {
  name: "", category: CATEGORY_OPTIONS[0], purchaseDate: "", purchaseValue: 0,
  currentValue: 0, annualReturn: 0, risk: 3, liquidity: 3, horizon: HORIZON_OPTIONS[2], ai: "Hold",
};

const fieldWrap = { marginBottom: 14 };
const labelStyle = { fontSize: 12, color: COLORS.inkSoft, marginBottom: 5 };
const inputStyle = {
  width: "100%", fontSize: 14, color: COLORS.ink, background: COLORS.beige,
  border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 14px", outline: "none",
};
const numberInputStyle = { ...inputStyle, fontVariantNumeric: "tabular-nums", direction: "ltr", textAlign: "right" };

export default function AssetFormModal({ asset, onClose, onSubmit }) {
  const isEdit = !!asset;
  const [form, setForm] = useState(() =>
    asset
      ? { name: asset.name, category: asset.category, purchaseDate: asset.purchaseDate, purchaseValue: asset.purchaseValue, currentValue: asset.currentValue, annualReturn: asset.annualReturn, risk: asset.risk, liquidity: asset.liquidity, horizon: asset.horizon, ai: asset.ai }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const updateNumber = (key, val) => setForm((f) => {
    if (val === "") return { ...f, [key]: 0 };
    const n = Number(val);
    return { ...f, [key]: Number.isNaN(n) ? f[key] : n };
  });

  const save = async () => {
    if (!form.name.trim()) { setError("نام دارایی الزامی است"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (e) {
      setError(e.message || "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(52,48,43,0.32)" }} />
      <div style={{
        position: "absolute", top: "4vh", bottom: "4vh", left: 0, right: 0, margin: "auto",
        maxWidth: 480, maxHeight: "92vh", background: COLORS.cream, borderRadius: 20,
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)", overflowY: "auto", direction: "rtl", width: "92%",
      }}>
        <div style={{ position: "sticky", top: 0, background: COLORS.cream, padding: "22px 24px 14px", borderBottom: `1px solid ${COLORS.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, color: COLORS.ink }}>
            {isEdit ? "ویرایش دارایی" : "افزودن دارایی"}
          </div>
          <button onClick={onClose} style={{ border: "none", background: COLORS.beige, borderRadius: 999, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={16} color={COLORS.inkSoft} />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <div style={fieldWrap}>
            <div style={labelStyle}>نام دارایی</div>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} style={inputStyle} />
          </div>
          <div style={fieldWrap}>
            <div style={labelStyle}>دسته</div>
            <select value={form.category} onChange={(e) => update("category", e.target.value)} style={inputStyle}>
              {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={fieldWrap}>
            <div style={labelStyle}>تاریخ خرید (مثلاً ۱۴۰۲/۰۵)</div>
            <input value={form.purchaseDate} onChange={(e) => update("purchaseDate", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>ارزش خرید ($)</div>
              <input type="number" value={form.purchaseValue} onChange={(e) => updateNumber("purchaseValue", e.target.value)} style={numberInputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>ارزش فعلی ($)</div>
              <input type="number" value={form.currentValue} onChange={(e) => updateNumber("currentValue", e.target.value)} style={numberInputStyle} />
            </div>
          </div>
          <div style={fieldWrap}>
            <div style={labelStyle}>بازده سالانه (٪)</div>
            <input type="number" step="0.1" value={form.annualReturn} onChange={(e) => updateNumber("annualReturn", e.target.value)} style={numberInputStyle} />
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>ریسک (۱ تا ۵)</div>
              <select value={form.risk} onChange={(e) => update("risk", Number(e.target.value))} style={inputStyle}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>نقدشوندگی (۱ تا ۵)</div>
              <select value={form.liquidity} onChange={(e) => update("liquidity", Number(e.target.value))} style={inputStyle}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div style={fieldWrap}>
            <div style={labelStyle}>افق سرمایه‌گذاری</div>
            <select value={form.horizon} onChange={(e) => update("horizon", e.target.value)} style={inputStyle}>
              {HORIZON_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div style={fieldWrap}>
            <div style={labelStyle}>توصیه AI</div>
            <select value={form.ai} onChange={(e) => update("ai", e.target.value)} style={inputStyle}>
              {AI_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(169,112,95,0.12)", color: COLORS.roseDeep, fontSize: 12, padding: "8px 12px", borderRadius: 10, marginBottom: 4 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>

        <div style={{ position: "sticky", bottom: 0, background: COLORS.cream, padding: "14px 24px 22px", borderTop: `1px solid ${COLORS.line}`, display: "flex", gap: 8 }}>
          <button onClick={save} disabled={saving} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 10, border: "none", background: COLORS.oliveDeep, color: COLORS.cream, fontSize: 13.5, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
            <Save size={14} /> {saving ? "در حال ذخیره..." : "ذخیره"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.ink, fontSize: 13.5, cursor: "pointer" }}>
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}
