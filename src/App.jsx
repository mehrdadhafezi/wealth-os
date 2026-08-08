import React, { useState, useEffect, useMemo, useContext, createContext } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  Treemap, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import {
  TrendingUp, TrendingDown, Sparkles, CheckCircle2, Circle, ArrowUpRight, ArrowDownRight,
  ArrowRight, Wallet, PiggyBank, Landmark, ChevronRight, ChevronLeft, ChevronDown, X, Plus,
  Coins, Building2, Bitcoin, Flame, CircleDollarSign, CircleDot, Zap, Swords, Check, Minus,
  Home, Layers, Waves, Target, Pencil, Trash2, Save, RefreshCw, AlertCircle,
} from "lucide-react";
import { COLORS, fmt, clamp } from "./lib/theme.jsx";
import { Card, Label, Dots } from "./components/ui.jsx";
import AssetFormModal from "./components/AssetFormModal.jsx";
import {
  getWealthSnapshot, upsertWealthSnapshot, seedInitialData,
  listAssets, createAsset, updateAsset, deleteAsset,
  listCommodities,
} from "./lib/dataApi.js";

/* ========================================================================
   LIVE MARKET PRICES — کریپتو از currency-api (jsdelivr، بدون CORS)
   طلا/نقره از exchangerate-api (بدون CORS)، با fallback از allorigins.win
   هر ۶۰ ثانیه یک‌بار fetch می‌شود؛ در صورت خطا آخرین قیمت ذخیره‌شده می‌ماند.
======================================================================== */
const LivePricesContext = createContext(null);
// قیمت‌های نمونه — همیشه از ابتدا نمایش داده می‌شوند؛ اگر fetch زنده موفق شود جایگزین می‌شوند
const STATIC_FALLBACK = {
  gold: { price: 2380, change: 0.8 },
  silver: { price: 29.4, change: 1.2 },
  bitcoin: { price: 68500, change: 1.4 },
  ethereum: { price: 3420, change: 0.9 },
};
const fallbackTicker = (key) => ({ ...STATIC_FALLBACK[key], live: false, updatedAt: null });

function fetchWithTimeout(url, ms = 8000, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

// تلاش مستقیم؛ اگر شکست خورد (شبکه/CORS)، از پروکسی allorigins عبور می‌کند
async function fetchJsonWithFallback(url, ms = 8000) {
  try {
    const res = await fetchWithTimeout(url, ms);
    if (!res.ok) throw new Error("bad status");
    return await res.json();
  } catch (e) {
    const proxied = "https://api.allorigins.win/get?url=" + encodeURIComponent(url);
    const res2 = await fetchWithTimeout(proxied, ms);
    if (!res2.ok) throw new Error("proxy bad status");
    const wrapped = await res2.json();
    return JSON.parse(wrapped.contents);
  }
}

function useLivePricesFeed() {
  const [prices, setPrices] = useState({
    gold: fallbackTicker("gold"), silver: fallbackTicker("silver"),
    bitcoin: fallbackTicker("bitcoin"), ethereum: fallbackTicker("ethereum"),
  });
  const lastMetals = React.useRef({});
  const lastCrypto = React.useRef({});

  React.useEffect(() => {
    let cancelled = false;

    async function fetchCrypto() {
      const [btcRes, ethRes] = await Promise.allSettled([
        fetchJsonWithFallback("https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/btc/usd.json"),
        fetchJsonWithFallback("https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/eth/usd.json"),
      ]);
      if (cancelled) return;
      const btcPrice = btcRes.status === "fulfilled" ? Number(btcRes.value?.btc?.usd) : null;
      const ethPrice = ethRes.status === "fulfilled" ? Number(ethRes.value?.eth?.usd) : null;
      const now = new Date();
      setPrices((p) => {
        const prevBtc = lastCrypto.current.bitcoin;
        const prevEth = lastCrypto.current.ethereum;
        const btcChange = btcPrice && prevBtc ? ((btcPrice - prevBtc) / prevBtc) * 100 : p.bitcoin.change;
        const ethChange = ethPrice && prevEth ? ((ethPrice - prevEth) / prevEth) * 100 : p.ethereum.change;
        lastCrypto.current = { bitcoin: btcPrice || prevBtc, ethereum: ethPrice || prevEth };
        return {
          ...p,
          bitcoin: btcPrice ? { price: btcPrice, change: btcChange, live: true, updatedAt: now } : { ...p.bitcoin, live: false },
          ethereum: ethPrice ? { price: ethPrice, change: ethChange, live: true, updatedAt: now } : { ...p.ethereum, live: false },
        };
      });
    }

    async function fetchMetals() {
      const [xauRes, xagRes] = await Promise.allSettled([
        fetchJsonWithFallback("https://api.exchangerate-api.com/v4/latest/XAU"),
        fetchJsonWithFallback("https://api.exchangerate-api.com/v4/latest/XAG"),
      ]);
      if (cancelled) return;
      const goldPrice = xauRes.status === "fulfilled" ? Number(xauRes.value?.rates?.USD) : null;
      const silverPrice = xagRes.status === "fulfilled" ? Number(xagRes.value?.rates?.USD) : null;
      const now = new Date();
      setPrices((p) => {
        const prevGold = lastMetals.current.gold;
        const prevSilver = lastMetals.current.silver;
        const goldChange = goldPrice && prevGold ? ((goldPrice - prevGold) / prevGold) * 100 : p.gold.change;
        const silverChange = silverPrice && prevSilver ? ((silverPrice - prevSilver) / prevSilver) * 100 : p.silver.change;
        lastMetals.current = { gold: goldPrice || prevGold, silver: silverPrice || prevSilver };
        return {
          ...p,
          gold: goldPrice ? { price: goldPrice, change: goldChange, live: true, updatedAt: now } : { ...p.gold, live: false },
          silver: silverPrice ? { price: silverPrice, change: silverChange, live: true, updatedAt: now } : { ...p.silver, live: false },
        };
      });
    }

    const runAll = () => { fetchCrypto(); fetchMetals(); };
    runAll();
    const interval = setInterval(runAll, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return prices;
}
function usePrices() { return useContext(LivePricesContext); }

function LiveDot({ live, size = 7 }) {
  return (
    <span
      title={live ? "زنده" : "آخرین داده ذخیره‌شده"}
      style={{
        display: "inline-block", width: size, height: size, borderRadius: 999,
        background: live ? COLORS.oliveDeep : COLORS.roseDeep,
        boxShadow: live ? "0 0 0 3px rgba(111,122,87,0.16)" : "0 0 0 3px rgba(169,112,95,0.14)",
        flexShrink: 0,
      }}
    />
  );
}
function fmtTime(d) { return d ? d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) : "—"; }
function fmtPrice(v) {
  if (v == null) return "—";
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: v >= 1000 ? 0 : 2 });
}

function LivePriceTicker() {
  const prices = usePrices();
  const items = [
    { key: "gold", label: "طلا (اونس)" }, { key: "silver", label: "نقره (اونس)" },
    { key: "bitcoin", label: "بیتکوین" }, { key: "ethereum", label: "اتریوم" },
  ];
  return (
    <Card style={{ gridColumn: "span 12", padding: 0 }}>
      <div className="wos-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", overflowX: "auto" }}>
        {items.map((it, i) => {
          const d = prices[it.key];
          const positive = (d.change ?? 0) >= 0;
          return (
            <div key={it.key} style={{ padding: "16px 18px", borderRight: i > 0 ? `1px solid ${COLORS.line}` : "none", minWidth: 130 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <LiveDot live={d.live} /><span style={{ fontSize: 11.5, color: COLORS.inkSoft }}>{it.label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 17, color: COLORS.ink, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{fmtPrice(d.price)}</span>
                {d.price != null && d.change != null && (
                  <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, color: positive ? COLORS.oliveDeep : COLORS.roseDeep }}>
                    {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(d.change).toFixed(1)}٪
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: COLORS.inkFaint, marginTop: 4 }}>
                {d.live ? `به‌روزشده ${fmtTime(d.updatedAt)}` : d.updatedAt ? `آخرین به‌روزرسانی: ${fmtTime(d.updatedAt)}` : "قیمت نمونه"}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ========================================================================WEALTH DATA CONTEXT — اعداد واقعی کاربر، مشترک بین همه تب‌ها
======================================================================== */
// حالت پیش‌فرض هنگام بارگذاری اولیه، پیش از رسیدن داده واقعی از Supabase
const EMPTY_MY_ASSETS = {
  estor: 0, biyavin: 0, romina: 0, teflon: 0, villa: 0,
  goldGrams: 0, goldValue: 0, cryptoBtc: 0, cryptoValue: 0, cash: 0, liabilities: 0,
};
const WealthDataContext = createContext(null);
function useWealthData() { return useContext(WealthDataContext); }

// «سهام/صندوق» و «طلب» دیگر عدد ثابت نیستند — مستقیماً از جدول assets واقعی جمع زده می‌شوند
function useWealthTotals(myAssets, assets) {
  return useMemo(() => {
    const business = myAssets.estor + myAssets.biyavin + myAssets.romina + myAssets.teflon;
    const realEstate = myAssets.villa;
    const alternative = myAssets.goldValue + myAssets.cryptoValue;
    const equities = assets
      .filter((a) => a.category === "سهام" || a.category === "صندوق (ETF)")
      .reduce((s, a) => s + a.currentValue, 0);
    const loan = assets
      .filter((a) => a.category === "طلب (وام اعطایی)")
      .reduce((s, a) => s + a.currentValue, 0);
    const cash = myAssets.cash + loan;
    const totalAssets = business + realEstate + alternative + equities + cash;
    const liabilities = myAssets.liabilities || 0;
    const netWorth = totalAssets - liabilities;
    return { business, realEstate, alternative, equities, cash, totalAssets, liabilities, netWorth };
  }, [myAssets, assets]);
}

/* ========================================================================
   1) EXECUTIVE OVERVIEW
======================================================================== */
const netWorthHistory = [
  { m: "شهریور", v: 25.9 }, { m: "مهر", v: 26.3 }, { m: "آبان", v: 25.8 },
  { m: "آذر", v: 26.6 }, { m: "دی", v: 27.1 }, { m: "بهمن", v: 26.9 },
  { m: "اسفند", v: 27.5 }, { m: "فروردین", v: 27.2 }, { m: "اردیبهشت", v: 27.8 },
  { m: "خرداد", v: 28.0 }, { m: "تیر", v: 27.85 }, { m: "مرداد", v: 28.45 },
];
const growthRanges = {
  "۱ ساله": netWorthHistory,
  "۳ ساله": [{ m: "۱۴۰۱", v: 19.4 }, { m: "۱۴۰۲", v: 23.1 }, { m: "۱۴۰۳", v: 28.45 }],
  "۵ ساله": [{ m: "۹۹", v: 12.8 }, { m: "۱۴۰۰", v: 15.6 }, { m: "۱۴۰۱", v: 19.4 }, { m: "۱۴۰۲", v: 23.1 }, { m: "۱۴۰۳", v: 28.45 }],
  "۱۰ ساله": [{ m: "۹۴", v: 4.2 }, { m: "۹۶", v: 7.1 }, { m: "۹۸", v: 10.5 }, { m: "۱۴۰۰", v: 15.6 }, { m: "۱۴۰۲", v: 23.1 }, { m: "۱۴۰۳", v: 28.45 }],
};
const allocationEO = [
  { name: "سهم کسب‌وکار", value: 42, color: COLORS.oliveDeep },
  { name: "املاک", value: 20, color: COLORS.blue },
  { name: "سهام و صندوق", value: 16, color: COLORS.rose },
  { name: "نقد و سپرده", value: 14, color: COLORS.beigeDeep },
  { name: "طلا و آلترناتیو", value: 8, color: COLORS.inkFaint },
];
const wealthSubScores = [
  { label: "نقدشوندگی", value: 72 }, { label: "نسبت بدهی", value: 81 }, { label: "تنوع دارایی", value: 68 },
  { label: "روند رشد", value: 85 }, { label: "پیشرفت اهداف", value: 74 },
];
const advisorItems = {
  opportunities: [
    "نرخ سود سپرده بانک X به ۲۸٪ رسیده — جابجایی نقدینگی راکد بازده بیشتری می‌دهد",
    "طلا در فاز Recovery چرخه کالایی است؛ وزن فعلی طلا پایین‌تر از میانگین تاریخی شماست",
    "ارزش‌گذاری املاک منطقه شمال در ۳ ماه اخیر ۸٪ رشد داشته",
  ],
  risks: [
    "وزن دارایی‌های کسب‌وکار به ۴۲٪ پرتفوی رسیده — بالاتر از آستانه تنوع شما",
    "سررسید یکی از تسهیلات کسب‌وکار ظرف ۴۵ روز آینده است",
    "بازده واقعی (تعدیل‌شده با تورم) پرتفوی نقدی در ۱۲ ماه اخیر منفی بوده",
  ],
  actions: [
    "بازنگری تخصیص دارایی کسب‌وکار در Asset Intelligence",
    "بررسی افزایش پوشش بیمه‌ای دارایی‌های اصلی",
    "شبیه‌سازی سناریوی تورم در Scenario Engine",
  ],
};

function NetWorthCard() {
  const { totals } = useWealthData();
  const currentM = totals.netWorth / 1000000;
  const liveHistory = useMemo(() => {
    const h = netWorthHistory.map((d) => ({ ...d }));
    h[h.length - 1].v = currentM;
    return h;
  }, [currentM]);
  const prev = liveHistory[liveHistory.length - 2].v;
  const delta = prev > 0 ? (((currentM - prev) / prev) * 100).toFixed(1) : "0.0";
  const deltaNeg = currentM < prev;
  return (
    <Card style={{ gridColumn: "span 7" }}>
      <Label>ارزش خالص</Label>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 44, fontWeight: 500, color: COLORS.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {fmt(currentM, 2)}M
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: deltaNeg ? "rgba(169,112,95,0.16)" : "rgba(156,165,131,0.18)", color: deltaNeg ? COLORS.roseDeep : COLORS.oliveDeep, padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 500 }}>
          {deltaNeg ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />} {Math.abs(delta)}٪ این ماه
        </div>
      </div>
      <div style={{ display: "flex", gap: 32, marginTop: 20, paddingTop: 18, borderTop: `1px solid ${COLORS.line}` }}>
        <div><div style={{ fontSize: 12, color: COLORS.inkFaint, marginBottom: 4 }}>دارایی‌ها</div><div style={{ fontSize: 16, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.totalAssets / 1000000, 2)}M</div></div>
        <div><div style={{ fontSize: 12, color: COLORS.inkFaint, marginBottom: 4 }}>بدهی‌ها</div><div style={{ fontSize: 16, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{fmt(totals.liabilities / 1000000, 2)}M</div></div>
      </div>
      <div style={{ height: 64, marginTop: 16 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={liveHistory} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs><linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.oliveDeep} stopOpacity={0.28} /><stop offset="100%" stopColor={COLORS.oliveDeep} stopOpacity={0} /></linearGradient></defs>
            <Area type="monotone" dataKey="v" stroke={COLORS.oliveDeep} strokeWidth={2} fill="url(#nwFill)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
function WealthScoreCard() {
  const score = 78;
  const data = [{ value: score }, { value: 100 - score }];
  return (
    <Card style={{ gridColumn: "span 5", display: "flex", flexDirection: "column" }}>
      <Label>امتیاز سلامت ثروت</Label><div style={{ position: "relative", height: 148, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={COLORS.blueDeep} /><stop offset="100%" stopColor={COLORS.oliveDeep} /></linearGradient></defs>
            <Pie data={data} dataKey="value" startAngle={90} endAngle={-270} innerRadius={52} outerRadius={66} stroke="none">
              <Cell fill="url(#scoreGrad)" /><Cell fill={COLORS.line} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", textAlign: "center" }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 34, fontWeight: 500, color: COLORS.ink, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: 12, color: COLORS.oliveDeep, marginTop: 2 }}>قوی</div>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {wealthSubScores.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 11, color: COLORS.inkSoft, width: 78, flexShrink: 0 }}>{s.label}</div>
            <div style={{ flex: 1, height: 4, background: COLORS.line, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${s.value}%`, height: "100%", background: COLORS.oliveDeep, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
function CashFlowStrip() {
  const items = [
    { icon: Wallet, label: "درآمد ماهانه", value: "$185,000", tint: COLORS.blueDeep },
    { icon: TrendingUp, label: "هزینه ماهانه", value: "$62,000", tint: COLORS.roseDeep },
    { icon: PiggyBank, label: "جریان نقدی خالص", value: "+$123,000", tint: COLORS.oliveDeep },
    { icon: Landmark, label: "درآمد غیرفعال", value: "$54,000 (۲۹٪)", tint: COLORS.inkSoft },
  ];
  return (
    <Card style={{ gridColumn: "span 12", padding: 0 }}>
      <div className="wos-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
        {items.map((it, i) => (
          <div key={it.label} style={{ padding: "20px 24px", borderRight: i > 0 ? `1px solid ${COLORS.line}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <it.icon size={15} color={it.tint} /><span style={{ fontSize: 12.5, color: COLORS.inkSoft }}>{it.label}</span>
            </div>
            <div style={{ fontSize: 19, color: COLORS.ink, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>{it.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
function AllocationCard() {
  const { totals } = useWealthData();
  const pct = (x) => (totals.totalAssets > 0 ? Math.round((x / totals.totalAssets) * 100) : 0);
  const allocationLive = [
    { name: "سهم کسب‌وکار", value: pct(totals.business), color: COLORS.oliveDeep },
    { name: "املاک", value: pct(totals.realEstate), color: COLORS.blue },
    { name: "سهام و صندوق", value: pct(totals.equities), color: COLORS.rose },
    { name: "نقد و سپرده", value: pct(totals.cash), color: COLORS.beigeDeep },
    { name: "طلا و آلترناتیو", value: pct(totals.alternative), color: COLORS.inkFaint },
  ];
  return (
    <Card style={{ gridColumn: "span 5" }}>
      <Label>تخصیص دارایی</Label>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={allocationLive} dataKey="value" innerRadius={44} outerRadius={68} stroke={COLORS.beige} strokeWidth={3}>
                {allocationLive.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 10, fontSize: 12 }} formatter={(v) => `${v}٪`} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", pointerEvents: "none" }}>
            <div style={{ fontSize: 11, color: COLORS.inkFaint }}>کل</div>
            <div style={{ fontSize: 15, color: COLORS.ink, fontWeight: 500 }}>{fmt(totals.totalAssets / 1000000, 2)}M</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          {allocationLive.map((d) => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: 3, background: d.color, flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, color: COLORS.ink, flex: 1 }}>{d.name}</div>
              <div style={{ fontSize: 12.5, color: COLORS.inkSoft, fontVariantNumeric: "tabular-nums" }}>{d.value}٪</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
function GrowthTimelineCard() {
  const [range, setRange] = useState("۱ ساله");
  const data = growthRanges[range];
  return (
    <Card style={{ gridColumn: "span 7" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <Label>روند رشد ثروت</Label>
        <div style={{ display: "flex", gap: 4 }}>
          {Object.keys(growthRanges).map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{ border: "none", background: range === r ? COLORS.oliveDeep : "transparent", color: range === r ? COLORS.cream : COLORS.inkSoft, fontSize: 11.5, padding: "5px 10px", borderRadius: 999, cursor: "pointer" }}>
              {r}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 168, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <defs><linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.blueDeep} stopOpacity={0.22} /><stop offset="100%" stopColor={COLORS.blueDeep} stopOpacity={0} /></linearGradient></defs>
            <Tooltip contentStyle={{ background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 10, fontSize: 12 }} formatter={(v) => [fmt(v, 1) + "M", "ارزش خالص"]} labelStyle={{ color: COLORS.inkSoft }} />
            <Area type="monotone" dataKey="v" stroke={COLORS.blueDeep} strokeWidth={2} fill="url(#growthFill)" dot={{ r: 2.5, fill: COLORS.blueDeep, strokeWidth: 0 }} activeDot={{ r: 5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
function buildPortfolioPrompt(myAssets, totals) {
  const pct = (x) => (totals.totalAssets > 0 ? Math.round((x / totals.totalAssets) * 100) : 0);
  return `تو یک تحلیلگر ارشد Family Office هستی. بر اساس داده واقعی پرتفوی زیر، دقیقاً یک شیء JSON خام (بدون Markdown، بدون بک‌تیک، بدون هیچ متن اضافه قبل یا بعد) با این ساختار برگردان:
{"opportunities": ["...", "...", "..."], "risks": ["...", "...", "..."], "actions": ["...", "...", "..."]}

هرکدام از سه آرایه باید دقیقاً ۳ جمله کوتاه فارسی (هرکدام حداکثر ۲۲ کلمه) داشته باشد: ۳ فرصت واقعی، ۳ ریسک واقعی، ۳ اقدام پیشنهادی مشخص — همه باید مستقیماً بر اساس اعداد زیر و نسبت‌های واقعی پرتفوی باشند، نه توصیه کلی و عمومی.

داده پرتفوی (به دلار):
- ارزش خالص کل: ${totals.netWorth.toLocaleString("en-US")}
- سهم کسب‌وکارها (Estor/Novin Rahkar, Biyavin, رومینا, کارخانه تفلون): ${totals.business.toLocaleString("en-US")} — ${pct(totals.business)}٪ از پرتفوی
- املاک (ویلای شمال): ${totals.realEstate.toLocaleString("en-US")} — ${pct(totals.realEstate)}٪
- سهام و صندوق: ${totals.equities.toLocaleString("en-US")} — ${pct(totals.equities)}٪
- نقد و سپرده: ${totals.cash.toLocaleString("en-US")} — ${pct(totals.cash)}٪
- طلا و کریپتو: ${totals.alternative.toLocaleString("en-US")} — ${pct(totals.alternative)}٪ (طلا: ${myAssets.goldValue.toLocaleString("en-US")}، کریپتو: ${myAssets.cryptoValue.toLocaleString("en-US")})
- بدهی‌ها: ${totals.liabilities.toLocaleString("en-US")}

فقط همان شیء JSON را برگردان.`;
}

async function fetchAIAdvice(myAssets, totals) {
  const prompt = buildPortfolioPrompt(myAssets, totals);
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", 20000, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error("network");
  const data = await response.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  if (!textBlock) throw new Error("empty");
  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned);
  if (!parsed.opportunities || !parsed.risks || !parsed.actions) throw new Error("shape");
  return parsed;
}

function AdvisorColumn({ title, items, tint, doneSet, toggle, prefix }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: tint, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: 999, background: tint }} />{title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((txt, i) => {
          const key = `${prefix}-${i}`;
          const done = doneSet.has(key);
          return (
            <div key={key} onClick={() => toggle(key)} style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", opacity: done ? 0.45 : 1 }}>
              {done ? <CheckCircle2 size={15} color={COLORS.oliveDeep} style={{ marginTop: 2, flexShrink: 0 }} /> : <Circle size={15} color={COLORS.inkFaint} style={{ marginTop: 2, flexShrink: 0 }} />}
              <div style={{ fontSize: 13, lineHeight: 1.6, color: COLORS.ink, textDecoration: done ? "line-through" : "none" }}>{txt}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function AIAdvisorCard() {
  const { myAssets, totals } = useWealthData();
  const [doneSet, setDoneSet] = useState(new Set());
  const [advice, setAdvice] = useState(advisorItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const toggle = (key) => setDoneSet((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAIAdvice(myAssets, totals);
      setAdvice(result);
      setDoneSet(new Set());
      setLastUpdated(new Date());
    } catch (e) {
      setError("امکان اتصال به سرویس تحلیل هوش مصنوعی وجود نداشت. تحلیل قبلی همچنان نمایش داده می‌شود.");
    } finally {
      setLoading(false);
    }
  };

  const timeLabel = lastUpdated
    ? `به‌روزشده همین الان — ${lastUpdated.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}`
    : "به‌روزشده امروز ساعت ۰۸:۰۰";

  return (
    <Card style={{ gridColumn: "span 12", background: COLORS.beigeDeep }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={16} color={COLORS.oliveDeep} /><span style={{ fontSize: 14, fontWeight: 500, color: COLORS.ink }}>برای شما امروز</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: COLORS.inkFaint }}>{timeLabel}</span>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: COLORS.cream, color: COLORS.ink,border: `1px solid ${COLORS.line}`, borderRadius: 999, padding: "6px 12px", fontSize: 12,
              cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            <RefreshCw size={12} className={loading ? "spin-icon" : ""} />
            {loading ? "در حال تحلیل..." : "به‌روزرسانی AI"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(169,112,95,0.12)", color: COLORS.roseDeep, fontSize: 12, padding: "8px 12px", borderRadius: 10, marginBottom: 14 }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 36, flexWrap: "wrap", opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
        <AdvisorColumn title="فرصت‌ها" items={advice.opportunities} tint={COLORS.oliveDeep} doneSet={doneSet} toggle={toggle} prefix="opp" />
        <AdvisorColumn title="ریسک‌ها" items={advice.risks} tint={COLORS.roseDeep} doneSet={doneSet} toggle={toggle} prefix="risk" />
        <AdvisorColumn title="اقدامات پیشنهادی" items={advice.actions} tint={COLORS.blueDeep} doneSet={doneSet} toggle={toggle} prefix="act" />
      </div>
    </Card>
  );
}
const FORM_FIELDS = [
  { group: "کسب‌وکارها", items: [
    { key: "estor", label: "سهم مالکیت — Estor / Novin Rahkar" },
    { key: "biyavin", label: "سهم مالکیت — Biyavin" },
    { key: "romina", label: "سهم مالکیت — رومینا (کازمتیک)" },
    { key: "teflon", label: "سهم مالکیت — کارخانه تفلون" },
  ]},
  { group: "املاک", items: [
    { key: "villa", label: "ارزش تقریبی — ویلای شمال" },
  ]},
  { group: "طلا", items: [
    { key: "goldGrams", label: "مقدار طلا (گرم)", unit: true },
    { key: "goldValue", label: "ارزش طلا ($)" },
  ]},
  { group: "کریپتو", items: [
    { key: "cryptoBtc", label: "مقدار کریپتو (معادل BTC)", unit: true },
    { key: "cryptoValue", label: "ارزش کریپتو ($)" },
  ]},
  { group: "نقد و بدهی", items: [
    { key: "cash", label: "موجودی نقد ($)" },
    { key: "liabilities", label: "بدهی‌ها ($) — اختیاری" },
  ]},
];

function EditRealNumbersForm({ onClose }) {
  const { myAssets, setMyAssets } = useWealthData();
  const [form, setForm] = useState(myAssets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const update = (key, val) => setForm((f) => {
    if (val === "") return { ...f, [key]: 0 };
    const n = Number(val);
    return { ...f, [key]: Number.isNaN(n) ? f[key] : n };
  });
  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await setMyAssets(form);
      onClose();
    } catch (e) {
      setError(e.message || "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(52,48,43,0.32)" }} />
      <div style={{
        position: "absolute", top: "4vh", bottom: "4vh", left: 0, right: 0, margin: "auto",
        maxWidth: 480, maxHeight: "92vh", background: COLORS.cream, borderRadius: 20,
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)", overflowY: "auto", direction: "rtl",
        width: "92%",
      }}>
        <div style={{ position: "sticky", top: 0, background: COLORS.cream, padding: "22px 24px 14px", borderBottom: `1px solid ${COLORS.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
          <div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, color: COLORS.ink }}>ویرایش اعداد واقعی</div>
            <div style={{ fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>داشبورد بلافاصله بعد از ذخیره به‌روزرسانی می‌شود</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: COLORS.beige, borderRadius: 999, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <X size={16} color={COLORS.inkSoft} />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {FORM_FIELDS.map((g) => (
            <div key={g.group} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12.5, color: COLORS.oliveDeep, fontWeight: 500, marginBottom: 10 }}>{g.group}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {g.items.map((f) => (
                  <div key={f.key}>
                    <div style={{ fontSize: 12, color: COLORS.inkSoft, marginBottom: 5 }}>{f.label}</div>
                    <input
                      type="number"
                      value={form[f.key]}
                      onChange={(e) => update(f.key, e.target.value)}
                      style={{
                        width: "100%", fontSize: 15, color: COLORS.ink, background: COLORS.beige,
                        border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "10px 14px",
                        fontVariantNumeric: "tabular-nums", direction: "ltr", textAlign: "right",
                        outline: "none",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ margin: "0 24px 14px", display: "flex", alignItems: "center", gap: 6, background: "rgba(169,112,95,0.12)", color: COLORS.roseDeep, fontSize: 12, padding: "8px 12px", borderRadius: 10 }}>
            <AlertCircle size={13} /> {error}
          </div>
        )}
        <div style={{ position: "sticky", bottom: 0, background: COLORS.cream, padding: "14px 24px 22px", borderTop: `1px solid ${COLORS.line}`, display: "flex", gap: 8 }}>
          <button onClick={save} disabled={saving} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 10, border: "none", background: COLORS.oliveDeep, color: COLORS.cream, fontSize: 13.5, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1 }}>
            <Save size={14} /> {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </button>
          <button onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.ink, fontSize: 13.5, cursor: "pointer" }}>
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}

function ExecutiveOverviewView() {
  const today = useMemo(() => new Date().toLocaleDateString("fa-IR", { weekday: "long", day: "numeric", month: "long" }), []);
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: COLORS.ink, marginBottom: 2 }}>صبح بخیر، طاها</div>
          <div style={{ fontSize: 13, color: COLORS.inkSoft }}>{today}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.inkFaint }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: COLORS.oliveDeep }} />همگام‌سازی زنده
          </div>
          <button
            onClick={() => setEditOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.beigeDeep, color: COLORS.ink, border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12.5, cursor: "pointer" }}
          >
            <Pencil size={13} /> ویرایش اعداد واقعی
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>
        <LivePriceTicker />
        <NetWorthCard /><WealthScoreCard /><CashFlowStrip /><AllocationCard /><GrowthTimelineCard /><AIAdvisorCard />
      </div>
      {editOpen && <EditRealNumbersForm onClose={() => setEditOpen(false)} />}
    </div>
  );
}

/* ========================================================================
   2) ASSET INTELLIGENCE
======================================================================== */
const CATEGORY_META = {
  "کسب‌وکار": { color: COLORS.oliveDeep, icon: Building2 },
  "املاک": { color: COLORS.blueDeep, icon: Landmark },
  "سهام": { color: COLORS.roseDeep, icon: TrendingUp },
  "صندوق (ETF)": { color: COLORS.roseDeep, icon: TrendingUp },
  "کریپتو": { color: COLORS.roseDeep, icon: Bitcoin },
  "نقد": { color: COLORS.beigeDeep, icon: Wallet },
  "طلا": { color: COLORS.inkFaint, icon: Coins },"طلب (وام اعطایی)": { color: COLORS.blueDeep, icon: Landmark },
};
const aiTone = {
  Hold: { bg: "rgba(139,133,121,0.14)", fg: COLORS.inkSoft, label: "نگهداری" },
  Add: { bg: "rgba(111,122,87,0.16)", fg: COLORS.oliveDeep, label: "افزایش" },
  Sell: { bg: "rgba(169,112,95,0.16)", fg: COLORS.roseDeep, label: "بررسی فروش" },
};
function AIBadge({ status }) {
  const t = aiTone[status];
  return <span style={{ background: t.bg, color: t.fg, fontSize: 11.5, fontWeight: 500, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{t.label}</span>;
}
function SummaryStripAsset({ assets }) {
  const total = assets.reduce((s, a) => s + a.currentValue, 0);
  const best = assets.length ? [...assets].sort((a, b) => b.annualReturn - a.annualReturn)[0] : null;
  return (
    <Card style={{ gridColumn: "span 12", padding: 0 }}>
      <div className="wos-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}><div style={{ padding: "20px 24px" }}><Label>کل ارزش پرتفوی دارایی</Label><div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{fmt(total, 1)}</div></div>
        <div style={{ padding: "20px 24px", borderRight: `1px solid ${COLORS.line}` }}><Label>تعداد دارایی‌ها</Label><div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, color: COLORS.ink }}>{assets.length} <span style={{ fontSize: 14, color: COLORS.inkFaint, fontFamily: "'Inter', sans-serif" }}>در {Object.keys(CATEGORY_META).length} دسته</span></div></div>
        <div style={{ padding: "20px 24px", borderRight: `1px solid ${COLORS.line}` }}><Label>بهترین Performer ماه</Label>{best ? <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><div style={{ fontSize: 15, color: COLORS.ink }}>{best.name}</div><div style={{ fontSize: 13, color: COLORS.oliveDeep, fontVariantNumeric: "tabular-nums" }}>+{best.annualReturn}٪</div></div> : <div style={{ fontSize: 13, color: COLORS.inkFaint }}>—</div>}</div>
      </div>
    </Card>
  );
}
function CategorySidebarAsset({ assets, active, setActive }) {
  const byCategory = useMemo(() => { const map = {}; assets.forEach((a) => { map[a.category] = (map[a.category] || 0) + a.currentValue; }); return map; }, [assets]);
  return (
    <Card style={{ gridColumn: "span 3" }}>
      <Label>دسته‌بندی‌ها</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
        <button onClick={() => setActive(null)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: active === null ? COLORS.beigeDeep : "transparent", border: "none", borderRadius: 10, padding: "9px 10px", cursor: "pointer", textAlign: "right" }}>
          <span style={{ fontSize: 13, color: COLORS.ink }}>همه دارایی‌ها</span>
          <span style={{ fontSize: 12, color: COLORS.inkFaint, fontVariantNumeric: "tabular-nums" }}>{fmt(assets.reduce((s, a) => s + a.currentValue, 0), 1)}</span>
        </button>
        {Object.entries(byCategory).map(([cat, val]) => {
          const meta = CATEGORY_META[cat]; const Icon = meta.icon;
          return (
            <button key={cat} onClick={() => setActive(cat)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, background: active === cat ? COLORS.beigeDeep : "transparent", border: "none", borderRadius: 10, padding: "9px 10px", cursor: "pointer", textAlign: "right" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon size={14} color={meta.color} /><span style={{ fontSize: 13, color: COLORS.ink }}>{cat}</span></span>
              <span style={{ fontSize: 11.5, color: COLORS.inkFaint, fontVariantNumeric: "tabular-nums" }}>{fmt(val, 1)}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
function TreemapContentAsset({ x, y, width, height, name, category, currentValue }) {
  if (width < 2 || height < 2 || !category) return null;
  const meta = CATEGORY_META[category] || { color: COLORS.inkFaint };
  const showText = width > 70 && height > 34;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill: meta.color, stroke: COLORS.beige, strokeWidth: 3 }} />
      {showText && (
        <>
          <text x={x + 10} y={y + 20} fontSize={12} fill="#FAF6F0" fontFamily="Inter" fontWeight={500}>{name && name.length > 22 ? name.slice(0, 20) + "…" : name}</text>
          <text x={x + 10} y={y + 38} fontSize={11} fill="#FAF6F0" opacity={0.85} fontFamily="Inter">{fmt(currentValue, 1)}</text>
        </>
      )}
    </g>
  );
}
function TreemapCardAsset({ assets, onSelect }) {
  const data = assets.map((a) => ({ name: a.name, size: a.currentValue, category: a.category, currentValue: a.currentValue, id: a.id }));
  return (
    <Card style={{ gridColumn: "span 9" }}>
      <Label>نقشه دارایی‌ها</Label>
      <div style={{ height: 260, marginTop: 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={data} dataKey="size" stroke={COLORS.beige} content={<TreemapContentAsset />} onClick={(node) => node && node.id && onSelect(node.id)} animationDuration={300}>
            <Tooltip contentStyle={{ background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 10, fontSize: 12 }} formatter={(v) => fmt(v, 1)} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
const ASSET_COLUMNS = [
  { key: "name", label: "نام" }, { key: "category", label: "دسته" }, { key: "currentValue", label: "ارزش فعلی" },
  { key: "pnl", label: "سود/زیان" }, { key: "annualReturn", label: "بازده سالانه" }, { key: "risk", label: "ریسک" },
  { key: "liquidity", label: "نقدشوندگی" }, { key: "ai", label: "توصیه AI" },
];
function AssetTable({ assets, onSelect }) {
  const [sortKey, setSortKey] = useState("currentValue");
  const [sortDir, setSortDir] = useState("desc");
  const sorted = useMemo(() => {
    const withPnl = assets.map((a) => ({ ...a, pnl: ((a.currentValue - a.purchaseValue) / a.purchaseValue) * 100 }));
    return withPnl.sort((a, b) => { const va = a[sortKey], vb = b[sortKey]; const cmp = typeof va === "string" ? va.localeCompare(vb, "fa") : va - vb; return sortDir === "asc" ? cmp : -cmp; });
  }, [assets, sortKey, sortDir]);
  const toggleSort = (key) => { if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(key); setSortDir("desc"); } };
  return (
    <Card style={{ gridColumn: "span 12", padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{ASSET_COLUMNS.map((c) => (
            <th key={c.key} onClick={() => toggleSort(c.key)} style={{ textAlign: "right", padding: "14px 18px", cursor: "pointer", color: COLORS.inkSoft, fontWeight: 500, fontSize: 12.5, borderBottom: `1px solid ${COLORS.line}`, userSelect: "none", whiteSpace: "nowrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{c.label}{sortKey === c.key && <ChevronDown size={12} style={{ transform: sortDir === "asc" ? "rotate(180deg)" : "none" }} />}</span>
            </th>
          ))}</tr></thead>
          <tbody>
            {sorted.map((a, i) => {
              const meta = CATEGORY_META[a.category];
              return (
                <tr key={a.id} onClick={() => onSelect(a.id)} style={{ cursor: "pointer", background: i % 2 === 0 ? "transparent" : "rgba(234,224,204,0.35)" }}>
                  <td style={{ padding: "13px 18px", color: COLORS.ink, fontWeight: 500, borderBottom: `1px solid ${COLORS.line}` }}>{a.name}</td>
                  <td style={{ padding: "13px 18px", borderBottom: `1px solid ${COLORS.line}` }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: COLORS.inkSoft }}><span style={{ width: 6, height: 6, borderRadius: 999, background: meta.color }} />{a.category}</span></td>
                  <td style={{ padding: "13px 18px", color: COLORS.ink, fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${COLORS.line}` }}>{fmt(a.currentValue, 1)}</td>
                  <td style={{ padding: "13px 18px", borderBottom: `1px solid ${COLORS.line}` }}><span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: a.pnl >= 0 ? COLORS.oliveDeep : COLORS.roseDeep, fontVariantNumeric: "tabular-nums" }}>{a.pnl >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{Math.abs(a.pnl).toFixed(1)}٪</span></td>
                  <td style={{ padding: "13px 18px", color: a.annualReturn >= 0 ? COLORS.oliveDeep : COLORS.roseDeep, fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${COLORS.line}` }}>{a.annualReturn >= 0 ? "+" : ""}{a.annualReturn}٪</td>
                  <td style={{ padding: "13px 18px", borderBottom: `1px solid ${COLORS.line}` }}><Dots n={a.risk} color={COLORS.roseDeep} /></td>
                  <td style={{ padding: "13px 18px", borderBottom: `1px solid ${COLORS.line}` }}><Dots n={a.liquidity} color={COLORS.blueDeep} /></td><td style={{ padding: "13px 18px", borderBottom: `1px solid ${COLORS.line}` }}><AIBadge status={a.ai} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
function DetailSlideOver({ asset, onClose, onEdit, onDelete }) {
  if (!asset) return null;
  const pnl = ((asset.currentValue - asset.purchaseValue) / asset.purchaseValue) * 100;
  const meta = CATEGORY_META[asset.category];
  const trendData = asset.trend.map((v, i) => ({ i, v }));
  const aiNote = {
    Hold: "این دارایی عملکردی مطابق انتظار داشته؛ نگهداری در ترکیب فعلی توصیه می‌شود.",
    Add: "روند رشد این دارایی از میانگین دسته خودش بهتر بوده — افزایش تدریجی وزن قابل بررسی است.",
    Sell: "این دارایی در ۳ ماه اخیر عملکردی ضعیف‌تر از میانگین دسته داشته — بازبینی یا کاهش وزن پیشنهاد می‌شود.",
  }[asset.ai];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(52,48,43,0.28)" }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 380, maxWidth: "88vw", background: COLORS.cream, boxShadow: "4px 0 24px rgba(0,0,0,0.08)", padding: 28, overflowY: "auto", direction: "rtl" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: COLORS.inkSoft, marginBottom: 8 }}><span style={{ width: 6, height: 6, borderRadius: 999, background: meta.color }} />{asset.category}</span>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 19, color: COLORS.ink, lineHeight: 1.4 }}>{asset.name}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: COLORS.beige, borderRadius: 999, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><X size={15} color={COLORS.inkSoft} /></button>
        </div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 30, color: COLORS.ink, fontVariantNumeric: "tabular-nums", marginBottom: 4 }}>{fmt(asset.currentValue, 1)}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, color: pnl >= 0 ? COLORS.oliveDeep : COLORS.roseDeep, fontSize: 13, marginBottom: 20 }}>{pnl >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(pnl).toFixed(1)}٪ از خرید</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, paddingTop: 16, borderTop: `1px solid ${COLORS.line}`, marginBottom: 18 }}>
          <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 3 }}>تاریخ خرید</div><div style={{ fontSize: 13, color: COLORS.ink }}>{asset.purchaseDate}</div></div>
          <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 3 }}>قیمت خرید</div><div style={{ fontSize: 13, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{fmt(asset.purchaseValue, 0)}</div></div>
          <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 3 }}>بازده سالانه</div><div style={{ fontSize: 13, color: asset.annualReturn >= 0 ? COLORS.oliveDeep : COLORS.roseDeep }}>{asset.annualReturn}٪</div></div>
          <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 3 }}>افق سرمایه‌گذاری</div><div style={{ fontSize: 13, color: COLORS.ink }}>{asset.horizon}</div></div>
        </div>
        <div style={{ display: "flex", gap: 20, marginBottom: 18 }}>
          <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 5 }}>ریسک</div><Dots n={asset.risk} color={COLORS.roseDeep} /></div>
          <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 5 }}>نقدشوندگی</div><Dots n={asset.liquidity} color={COLORS.blueDeep} /></div>
        </div>
        <div style={{ height: 70, marginBottom: 18 }}>
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={trendData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs><linearGradient id="detailFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={meta.color} stopOpacity={0.3} /><stop offset="100%" stopColor={meta.color} stopOpacity={0} /></linearGradient></defs>
              <Area type="monotone" dataKey="v" stroke={meta.color} strokeWidth={2} fill="url(#detailFill)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: COLORS.beigeDeep, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}><Sparkles size={13} color={COLORS.oliveDeep} /><span style={{ fontSize: 12.5, fontWeight: 500, color: COLORS.ink }}>تحلیل AI</span><span style={{ marginRight: "auto" }}><AIBadge status={asset.ai} /></span></div>
          <div style={{ fontSize: 12.5, color: COLORS.ink, lineHeight: 1.7 }}>{aiNote}</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onEdit} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.ink, fontSize: 13, cursor: "pointer" }}>
            <Pencil size={13} /> ویرایش
          </button>
          <button onClick={onDelete} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 10, border: "none", background: "rgba(169,112,95,0.16)", color: COLORS.roseDeep, fontSize: 13, cursor: "pointer" }}>
            <Trash2 size={13} /> حذف
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------
   پنل تخصصی طلا و نقره — بازار ایران (افزوده جدید، مستقل از بقیه سیستم)
------------------------------------------------------------------------ */
const fmtToman = (n) => Math.round(n).toLocaleString("en-US") + " تومان";

const GOLD_ITEMS = [
  { id: "azadi_full", name: "سکه بهار آزادی (تمام سکه)", qty: 3, unitPrice: 42500000, bubble: 2.8, liquidity: 5 },
  { id: "azadi_half", name: "نیم سکه", qty: 5, unitPrice: 22800000, bubble: 3.5, liquidity: 5 },
  { id: "azadi_quarter", name: "ربع سکه", qty: 8, unitPrice: 13200000, bubble: 4.2, liquidity: 5 },
  { id: "gerami", name: "سکه گرمی (۱ گرم)", qty: 12, unitPrice: 5100000, bubble: 6.1, liquidity: 4 },
  { id: "molten", name: "طلای آبشده (هر گرم)", qty: 85, unitPrice: 4850000, bubble: 0.0, liquidity: 5 },
  { id: "gold_cert", name: "گواهی سپرده طلا (بورس کالا)", qty: 40, unitPrice: 4870000, bubble: -0.4, liquidity: 5 },
];
const SILVER_ITEMS = [
  { id: "silver_coin", name: "سکه نقره", qty: 15, unitPrice: 850000, bubble: 8.5, liquidity: 3 },
  { id: "silver_bar", name: "شمش نقره (هر گرم)", qty: 450, unitPrice: 62000, bubble: 1.2, liquidity: 4 },
  { id: "silver_cert", name: "گواهی سپرده نقره (بورس کالا)", qty: 200, unitPrice: 61500, bubble: -0.3, liquidity: 5 },
];
const ALL_METAL_ITEMS = [...GOLD_ITEMS, ...SILVER_ITEMS];

function MetalTable({ title, items, accent }) {
  const total = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  return (
    <Card style={{ gridColumn: "span 6", padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "18px 20px 4px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <Label>{title}</Label>
        <div style={{ fontSize: 12.5, color: COLORS.inkSoft, fontVariantNumeric: "tabular-nums" }}>جمع: {fmtToman(total)}</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr>
              {["نام", "مقدار", "قیمت واحد", "ارزش کل", "حباب", "نقدشوندگی"].map((h) => (
                <th key={h} style={{ textAlign: "right", padding: "10px 14px", fontSize: 11.5, color: COLORS.inkSoft, fontWeight: 500, borderBottom: `1px solid ${COLORS.line}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} style={{ background: i % 2 === 0 ? "transparent" : "rgba(234,224,204,0.35)" }}>
                <td style={{ padding: "11px 14px", color: COLORS.ink, borderBottom: `1px solid ${COLORS.line}`, whiteSpace: "nowrap" }}>{it.name}</td>
                <td style={{ padding: "11px 14px", color: COLORS.ink, fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${COLORS.line}` }}>{it.qty}</td>
                <td style={{ padding: "11px 14px", color: COLORS.inkSoft, fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${COLORS.line}`, whiteSpace: "nowrap" }}>{fmtToman(it.unitPrice)}</td>
                <td style={{ padding: "11px 14px", color: COLORS.ink, fontVariantNumeric: "tabular-nums", borderBottom: `1px solid ${COLORS.line}`, whiteSpace: "nowrap" }}>{fmtToman(it.qty * it.unitPrice)}</td>
                <td style={{ padding: "11px 14px", borderBottom: `1px solid ${COLORS.line}` }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color: it.bubble >= 0 ? accent : COLORS.blueDeep, fontVariantNumeric: "tabular-nums" }}>
                    {it.bubble >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(it.bubble).toFixed(1)}٪
                  </span>
                </td>
                <td style={{ padding: "11px 14px", borderBottom: `1px solid ${COLORS.line}` }}><Dots n={it.liquidity} color={accent} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ArbitrageCalculator() {
  const [fromId, setFromId] = useState(GOLD_ITEMS[3].id); // سکه گرمی
  const [toId, setToId] = useState(GOLD_ITEMS[4].id);     // طلای آبشده
  const [qty, setQty] = useState(1);
  const FEE = 0.01;

  const fromItem = ALL_METAL_ITEMS.find((i) => i.id === fromId);
  const toItem = ALL_METAL_ITEMS.find((i) => i.id === toId);

  const result = useMemo(() => {
    const q = Number(qty) || 0;
    const grossToman = q * fromItem.unitPrice;
    const trueValueFrom = grossToman / (1 + fromItem.bubble / 100);
    const netAfterFee = grossToman * (1 - FEE);
    const unitsBought = toItem.unitPrice > 0 ? netAfterFee / toItem.unitPrice : 0;
    const trueValueTo = netAfterFee / (1 + toItem.bubble / 100);
    const profitToman = trueValueTo - trueValueFrom;
    const profitPct = trueValueFrom > 0 ? (profitToman / trueValueFrom) * 100 : 0;
    return { grossToman, unitsBought, profitToman, profitPct };
  }, [fromId, toId, qty, fromItem, toItem]);

  const positive = result.profitToman >= 0;
  const selectStyle = {
    width: "100%", fontSize: 13, color: COLORS.ink, background: COLORS.cream,
    border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "9px 12px", outline: "none",
  };

  return (
    <Card style={{ gridColumn: "span 12" }}>
      <Label>ماشین‌حساب آربیتراژ طلا و نقره — کارمزد ۱٪</Label>
      <div className="wos-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 8 }}>
        <div>
          <div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 5 }}>از</div>
          <select value={fromId} onChange={(e) => setFromId(e.target.value)} style={selectStyle}>
            {ALL_METAL_ITEMS.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 5 }}>به</div>
          <select value={toId} onChange={(e) => setToId(e.target.value)} style={selectStyle}>
            {ALL_METAL_ITEMS.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 5 }}>مقدار (تعداد/گرم از «از»)</div>
          <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} style={{ ...selectStyle, fontVariantNumeric: "tabular-nums", direction: "ltr", textAlign: "right" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${COLORS.line}` }}>
        <div>
          <div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 3 }}>ارزش ناخالص «از»</div>
          <div style={{ fontSize: 14, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{fmtToman(result.grossToman)}</div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 3 }}>مقدار قابل خرید از «به» (پس از کارمزد)</div>
          <div style={{ fontSize: 14, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{result.unitsBought.toFixed(2)} واحد</div></div>
        <div style={{ marginRight: "auto" }}>
          <div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 3 }}>سود / زیان واقعی این تبدیل</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: positive ? COLORS.oliveDeep : COLORS.roseDeep }}>
              {positive ? "+" : ""}{fmtToman(result.profitToman)}
            </span>
            <span style={{ fontSize: 12.5, color: positive ? COLORS.oliveDeep : COLORS.roseDeep }}>
              ({positive ? "+" : ""}{result.profitPct.toFixed(2)}٪)
            </span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginTop: 12, lineHeight: 1.7 }}>
        محاسبه بر اساس ارزش واقعی (تعدیل‌شده با حباب) هر قلم است: تبدیل از یک قلم با حبابِ بالاتر به قلمی با حبابِ پایین‌تر، پس از کسر ۱٪ کارمزد، می‌تواند سود واقعی ایجاد کند و برعکس.
      </div>
    </Card>
  );
}

function GoldSilverPanel() {
  return (
    <>
      <div style={{ gridColumn: "span 12", marginTop: 4 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: COLORS.ink, marginBottom: 2 }}>طلا و نقره — بازار ایران</div>
        <div style={{ fontSize: 12.5, color: COLORS.inkSoft }}>قیمت‌ها به تومان؛ حباب نسبت به ارزش ذاتی محاسبه شده است</div>
      </div>
      <MetalTable title="طلا" items={GOLD_ITEMS} accent={COLORS.roseDeep} />
      <MetalTable title="نقره" items={SILVER_ITEMS} accent={COLORS.blueDeep} />
      <ArbitrageCalculator />
    </>
  );
}

function AssetIntelligenceView() {
  const { assets, addAsset, editAsset, removeAsset } = useWealthData();
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [formMode, setFormMode] = useState(null); // null | 'create' | 'edit'
  const filtered = activeCategory ? assets.filter((a) => a.category === activeCategory) : assets;
  const selectedAsset = assets.find((a) => a.id === selectedId) || null;

  const handleCreate = (fields) => addAsset(fields);
  const handleEdit = (fields) => editAsset(selectedAsset.id, selectedAsset, fields);
  const handleDelete = async () => {
    if (!selectedAsset) return;
    if (!window.confirm(`دارایی «${selectedAsset.name}» حذف شود؟`)) return;
    await removeAsset(selectedAsset);
    setSelectedId(null);
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: COLORS.ink }}>Asset Intelligence</div>
        <button onClick={() => setFormMode("create")} style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.oliveDeep, color: COLORS.cream, border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}><Plus size={14} /> افزودن دارایی</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>
        <SummaryStripAsset assets={assets} />
        <CategorySidebarAsset assets={assets} active={activeCategory} setActive={setActiveCategory} />
        <TreemapCardAsset assets={filtered} onSelect={setSelectedId} />
        <AssetTable assets={filtered} onSelect={setSelectedId} />
        <GoldSilverPanel />
      </div>
      <DetailSlideOver
        asset={selectedAsset}
        onClose={() => setSelectedId(null)}
        onEdit={() => setFormMode("edit")}
        onDelete={handleDelete}
      />
      {formMode === "create" && (
        <AssetFormModal onClose={() => setFormMode(null)} onSubmit={handleCreate} />
      )}
      {formMode === "edit" && selectedAsset && (
        <AssetFormModal asset={selectedAsset} onClose={() => setFormMode(null)} onSubmit={handleEdit} />
      )}
    </div>
  );
}

/* ========================================================================
   3) COMMODITY INTELLIGENCE
======================================================================== */
const VAL_TONE = {
  Undervalued: { bg: "rgba(111,122,87,0.16)", fg: COLORS.oliveDeep, label: "ارزان" },
  Fair: { bg: "rgba(139,133,121,0.14)", fg: COLORS.inkSoft, label: "منصفانه" },
  Overvalued: { bg: "rgba(169,112,95,0.16)", fg: COLORS.roseDeep, label: "گران" },
};
const PHASE_LABEL = { Recovery: "بهبود", Peak: "اوج", Contraction: "انقباض", Trough: "کف" };

function CommodityCard({ c }) {
  const tone = VAL_TONE[c.valuation];
  const positive = c.change >= 0;
  const trendData = c.trend.map((v, i) => ({ i, v }));
  return (
    <Card style={{ gridColumn: "span 4" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, color: COLORS.ink, fontWeight: 500 }}>{c.name}</div>
          <div style={{ fontSize: 11, color: COLORS.inkFaint, marginTop: 2 }}>{c.symbol} · {PHASE_LABEL[c.phase]}</div>
        </div>
        <span style={{ background: tone.bg, color: tone.fg, fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{tone.label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>${c.price.toLocaleString("en-US")}</span>
        <span style={{ fontSize: 11.5, color: COLORS.inkFaint }}>/{c.unit}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11.5, color: positive ? COLORS.oliveDeep : COLORS.roseDeep, marginRight: "auto" }}>
          {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{Math.abs(c.change).toFixed(1)}٪
        </span>
      </div>
      <div style={{ height: 44, marginBottom: 10 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs><linearGradient id={`cfill-${c.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={positive ? COLORS.oliveDeep : COLORS.roseDeep} stopOpacity={0.25} /><stop offset="100%" stopColor={positive ? COLORS.oliveDeep : COLORS.roseDeep} stopOpacity={0} /></linearGradient></defs>
            <Area type="monotone" dataKey="v" stroke={positive ? COLORS.oliveDeep : COLORS.roseDeep} strokeWidth={1.6} fill={`url(#cfill-${c.id})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.inkSoft, paddingTop: 10, borderTop: `1px solid ${COLORS.line}` }}>
        <span>ریسک ژئوپلیتیک</span><span style={{ color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{c.geoRisk}٪</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
        {c.producers.map((p) => (
          <div key={p.c} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 10.5, color: COLORS.inkFaint, width: 52, flexShrink: 0 }}>{p.c}</div>
            <div style={{ flex: 1, height: 3, background: COLORS.line, borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${p.p * 2.5}%`, height: "100%", background: COLORS.blueDeep, borderRadius: 999 }} /></div>
            <div style={{ fontSize: 10, color: COLORS.inkFaint, width: 26, textAlign: "left" }}>{p.p}٪</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
function CommodityIntelligenceView() {
  const { commodities } = useWealthData();
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: COLORS.ink, marginBottom: 4 }}>Commodity Intelligence</div>
      <div style={{ fontSize: 13, color: COLORS.inkSoft, marginBottom: 24 }}>ارزش‌گذاری، فاز چرخه و ریسک ژئوپلیتیک کالاهای اصلی</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 20 }}>
        {commodities.map((c) => <CommodityCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}

/* ========================================================================
   4) INVESTMENT DECISION ENGINE
======================================================================== */
const OPPORTUNITY = { name: "سهم مالکیت — Biyavin (بسته دوم)", category: "کسب‌وکار", amount: 850000, horizon: "بلندمدت (۵+ سال)" };
const FUNDAMENTAL = [
  { label: "رشد درآمد", value: 82 }, { label: "حاشیه سود", value: 71 },
  { label: "کیفیت مدیریت", value: 78 }, { label: "موقعیت رقابتی", value: 69 },
];
const FUNDAMENTAL_SCORE = Math.round(FUNDAMENTAL.reduce((s, f) => s + f.value, 0) / FUNDAMENTAL.length);
const RISK_DIMENSIONS = [
  { label: "نقدشوندگی", value: 28 }, { label: "تمرکز", value: 62 },
  { label: "اجرایی", value: 40 }, { label: "بازار", value: 35 }, { label: "نظارتی", value: 22 },
];
const RISK_SCORE = Math.round(RISK_DIMENSIONS.reduce((s, r) => s + r.value, 0) / RISK_DIMENSIONS.length);
const VALUATION = { current: 850000, low: 900000, high: 1150000 };
const CASE_SCENARIOS = [
  { key: "bull", label: "سناریو خوش‌بینانه", ret: 34, desc: "رشد بازار هدف و اجرای موفق برنامه توسعه", tone: COLORS.oliveDeep },
  { key: "base", label: "سناریو پایه", ret: 16, desc: "ادامه روند فعلی رشد درآمد و حاشیه سود", tone: COLORS.blueDeep },
  { key: "bear", label: "سناریو بدبینانه", ret: -8, desc: "کاهش تقاضا یا فشار رقابتی غیرمنتظره", tone: COLORS.roseDeep },
];
const COMPARISON = [
  { label: "opt1", name: "Biyavin (این فرصت)", fundamental: FUNDAMENTAL_SCORE, risk: RISK_SCORE, valuation: "ارزان", highlight: true },
  { label: "opt2", name: "ETF شاخص جهانی", fundamental: 74, risk: 24, valuation: "منصفانه", highlight: false },
  { label: "opt3", name: "سپرده بانکی", fundamental: 40, risk: 8, valuation: "—", highlight: false },
];
const WEIGHTS = { fundamental: 0.3, risk: 0.2, valuation: 0.2, scenario: 0.15, relative: 0.15 };
const riskAdjusted = 100 - RISK_SCORE;
const valuationScore = Math.round(clamp(((VALUATION.high - VALUATION.current) / (VALUATION.high - VALUATION.low)) * 100, 0, 100));
const scenarioEV = Math.round(CASE_SCENARIOS.reduce((s, c) => s + c.ret, 0) / CASE_SCENARIOS.length) + 60;
const relativeScore = Math.round((FUNDAMENTAL_SCORE - COMPARISON[1].fundamental) / 2) + 60;
const COMPOSITE = Math.round(
  FUNDAMENTAL_SCORE * WEIGHTS.fundamental +
  riskAdjusted * WEIGHTS.risk +
  valuationScore * WEIGHTS.valuation +
  Math.min(100, scenarioEV) * WEIGHTS.scenario +
  relativeScore * WEIGHTS.relative
);
const DECISION = COMPOSITE >= 70
  ? { fa: "پیشنهاد می‌شود", bg: "rgba(111,122,87,0.16)", tone: COLORS.oliveDeep }
  : COMPOSITE >= 50
  ? { fa: "نیازمند بررسی بیشتر", bg: "rgba(139,133,121,0.14)", tone: COLORS.inkSoft }
  : { fa: "توصیه نمی‌شود", bg: "rgba(169,112,95,0.16)", tone: COLORS.roseDeep };

function InvStepFrame({ title, children }) {
  return (
    <Card pad={28}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: COLORS.ink, marginBottom: 18 }}>{title}</div>
      {children}
    </Card>
  );
}
function ScoreBar({ label, value, tone }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 12.5, color: COLORS.ink }}>{label}</span><span style={{ fontSize: 12, color: COLORS.inkSoft, fontVariantNumeric: "tabular-nums" }}>{value}</span></div>
      <div style={{ height: 6, background: COLORS.line, borderRadius: 999, overflow: "hidden" }}><div style={{ width: `${value}%`, height: "100%", background: tone, borderRadius: 999 }} /></div>
    </div>
  );
}

function InvStep1() {
  return (
    <InvStepFrame title="مرحله ۱ — جمع‌آوری اطلاعات">
      <div className="wos-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 4 }}>نام / نماد فرصت</div><div style={{ fontSize: 15, color: COLORS.ink, background: COLORS.cream, borderRadius: 10, padding: "10px 14px", border: `1px solid ${COLORS.line}` }}>{OPPORTUNITY.name}</div></div>
        <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 4 }}>نوع دارایی</div><div style={{ fontSize: 15, color: COLORS.ink, background: COLORS.cream, borderRadius: 10, padding: "10px 14px", border: `1px solid ${COLORS.line}` }}>{OPPORTUNITY.category}</div></div>
        <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 4 }}>مبلغ پیشنهادی</div><div style={{ fontSize: 15, color: COLORS.ink, background: COLORS.cream, borderRadius: 10, padding: "10px 14px", border: `1px solid ${COLORS.line}`, fontVariantNumeric: "tabular-nums" }}>${OPPORTUNITY.amount.toLocaleString("en-US")}</div></div>
        <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 4 }}>افق زمانی</div><div style={{ fontSize: 15, color: COLORS.ink, background: COLORS.cream, borderRadius: 10, padding: "10px 14px", border: `1px solid ${COLORS.line}` }}>{OPPORTUNITY.horizon}</div></div>
      </div>
      <div style={{ marginTop: 16, fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.7 }}>داده بازار، صورت مالی و تاریخچه قیمت این فرصت به‌طور خودکار دریافت شد.</div>
    </InvStepFrame>
  );
}
function InvStep2() {
  return (
    <InvStepFrame title="مرحله ۲ — تحلیل بنیادی">
      {FUNDAMENTAL.map((f) => <ScoreBar key={f.label} label={f.label} value={f.value} tone={COLORS.blueDeep} />)}
      <div style={{ marginTop: 6, paddingTop: 16, borderTop: `1px solid ${COLORS.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: COLORS.ink }}>Fundamental Score</span><span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: COLORS.blueDeep }}>{FUNDAMENTAL_SCORE}</span></div>
    </InvStepFrame>
  );
}
function InvStep3() {
  const radarData = RISK_DIMENSIONS.map((r) => ({ subject: r.label, value: r.value, fullMark: 100 }));
  return (
    <InvStepFrame title="مرحله ۳ — تحلیل ریسک">
      <div className="wos-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "center" }}>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke={COLORS.line} /><PolarAngleAxis dataKey="subject" tick={{ fill: COLORS.inkSoft, fontSize: 11 }} />
              <Radar dataKey="value" stroke={COLORS.roseDeep} fill={COLORS.roseDeep} fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div>
          {RISK_DIMENSIONS.map((r) => <ScoreBar key={r.label} label={r.label} value={r.value} tone={COLORS.roseDeep} />)}
          <div style={{ marginTop: 6, paddingTop: 14, borderTop: `1px solid ${COLORS.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 13, color: COLORS.ink }}>Risk Score</span><span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: COLORS.roseDeep }}>{RISK_SCORE}</span></div>
        </div>
      </div>
    </InvStepFrame>
  );
}
function InvStep4() {
  const range = VALUATION.high - VALUATION.low;
  const pos = clamp(((VALUATION.current - (VALUATION.low - range * 0.4)) / (range * 1.8)) * 100, 4, 96);
  return (
    <InvStepFrame title="مرحله ۴ — ارزش‌گذاری">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}><span style={{ fontSize: 13, color: COLORS.ink }}>قیمت پیشنهادی فعلی</span><span style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>${VALUATION.current.toLocaleString("en-US")}</span></div>
      <div style={{ position: "relative", height: 10, borderRadius: 999, background: `linear-gradient(to left, ${COLORS.roseDeep}55, ${COLORS.beigeDeep}, ${COLORS.oliveDeep}55)`, marginBottom: 8 }}>
        <div style={{ position: "absolute", top: -5, left: `${pos}%`, transform: "translateX(50%)", width: 20, height: 20, borderRadius: 999, background: COLORS.ink, border: `3px solid ${COLORS.cream}` }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.inkFaint, marginBottom: 18 }}><span>گران</span><span>منصفانه</span><span>ارزان</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 14, borderTop: `1px solid ${COLORS.line}` }}><span style={{ fontSize: 13, color: COLORS.inkSoft }}>بازه ارزش منصفانه تخمینی</span><span style={{ fontSize: 14, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>${VALUATION.low.toLocaleString("en-US")} – ${VALUATION.high.toLocaleString("en-US")}</span></div>
      <div style={{ marginTop: 12 }}><span style={{ background: "rgba(111,122,87,0.16)", color: COLORS.oliveDeep, fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 999 }}>Undervalued — پایین‌تر از بازه منصفانه</span></div>
    </InvStepFrame>
  );
}
function InvStep5() {
  return (
    <InvStepFrame title="مرحله ۵ — سناریوسازی">
      <div className="wos-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {CASE_SCENARIOS.map((s) => (
          <div key={s.key} style={{ background: COLORS.cream, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12.5, color: COLORS.inkSoft, marginBottom: 8 }}>{s.label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>{s.ret > 0 ? <TrendingUp size={16} color={s.tone} /> : <TrendingDown size={16} color={s.tone} />}<span style={{ fontFamily: "'Fraunces', serif", fontSize: 22, color: s.tone }}>{s.ret > 0 ? "+" : ""}{s.ret}٪</span></div>
            <div style={{ fontSize: 11.5, color: COLORS.inkFaint, lineHeight: 1.6 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </InvStepFrame>
  );
}
function InvStep6() {
  return (
    <InvStepFrame title="مرحله ۶ — مقایسه با گزینه‌های دیگر">
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
          <thead><tr>{COMPARISON.map((c) => <th key={c.label} style={{ textAlign: "right", padding: "10px 14px", fontSize: 12, color: COLORS.inkSoft, fontWeight: 500, borderBottom: `1px solid ${COLORS.line}`, background: c.highlight ? COLORS.beigeDeep : "transparent" }}>{c.label}</th>)}</tr></thead>
          <tbody>
            <tr>{COMPARISON.map((c) => <td key={c.label} style={{ padding: "12px 14px", color: COLORS.ink, fontWeight: 500, background: c.highlight ? "rgba(234,224,204,0.4)" : "transparent" }}>{c.name}</td>)}</tr>
            <tr>{COMPARISON.map((c) => <td key={c.label} style={{ padding: "12px 14px", background: c.highlight ? "rgba(234,224,204,0.4)" : "transparent" }}><span style={{ fontSize: 12, color: COLORS.inkSoft }}>Fundamental: </span><span style={{ color: COLORS.blueDeep }}>{c.fundamental}</span></td>)}</tr>
            <tr>{COMPARISON.map((c) => <td key={c.label} style={{ padding: "12px 14px", background: c.highlight ? "rgba(234,224,204,0.4)" : "transparent" }}><span style={{ fontSize: 12, color: COLORS.inkSoft }}>Risk: </span><span style={{ color: COLORS.roseDeep }}>{c.risk}</span></td>)}</tr>
            <tr>{COMPARISON.map((c) => <td key={c.label} style={{ padding: "12px 14px", background: c.highlight ? "rgba(234,224,204,0.4)" : "transparent" }}><span style={{ fontSize: 12, color: COLORS.inkSoft }}>Valuation: </span><span style={{ color: COLORS.ink }}>{c.valuation}</span></td>)}</tr>
          </tbody>
        </table>
      </div>
    </InvStepFrame>
  );
}
function InvStep7() {
  const rows = [{ label: "Fundamental Score", value: FUNDAMENTAL_SCORE, weight: WEIGHTS.fundamental },
    { label: "Risk-Adjusted Score", value: riskAdjusted, weight: WEIGHTS.risk },
    { label: "Valuation Alignment", value: valuationScore, weight: WEIGHTS.valuation },
    { label: "Scenario Expected Value", value: Math.min(100, scenarioEV), weight: WEIGHTS.scenario },
    { label: "Relative Attractiveness", value: relativeScore, weight: WEIGHTS.relative },
  ];
  return (
    <InvStepFrame title="مرحله ۷ — پیشنهاد نهایی">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12.5, color: COLORS.ink, width: 190, flexShrink: 0 }}>{r.label}</div>
            <div style={{ flex: 1, height: 6, background: COLORS.line, borderRadius: 999, overflow: "hidden", minWidth: 80 }}><div style={{ width: `${r.value}%`, height: "100%", background: COLORS.oliveDeep, borderRadius: 999 }} /></div>
            <div style={{ fontSize: 12, color: COLORS.inkSoft, width: 60, textAlign: "left" }}>{r.value} × {Math.round(r.weight * 100)}٪</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${COLORS.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 14, color: COLORS.ink }}>Composite Score</span><span style={{ fontFamily: "'Fraunces', serif", fontSize: 30, color: DECISION.tone }}>{COMPOSITE}</span></div>
    </InvStepFrame>
  );
}
function DecisionOutput({ onRestart }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card pad={32}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <span style={{ display: "inline-block", background: DECISION.bg, color: DECISION.tone, fontSize: 20, fontWeight: 600, padding: "10px 32px", borderRadius: 999, marginBottom: 10 }}>{DECISION.fa}</span>
        <div style={{ fontSize: 13, color: COLORS.inkSoft }}>امتیاز: {COMPOSITE} / ۱۰۰</div>
      </div>
      <div className="wos-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, paddingTop: 18, paddingBottom: 18, borderTop: `1px solid ${COLORS.line}`, borderBottom: `1px solid ${COLORS.line}` }}>
        <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 4 }}>سطح ریسک</div><div style={{ display: "flex", gap: 3 }}>{[1, 2, 3, 4, 5].map((i) => <div key={i} style={{ width: 16, height: 6, borderRadius: 3, background: i <= 3 ? COLORS.roseDeep : COLORS.line }} />)}</div></div>
        <div><div style={{ fontSize: 11.5, color: COLORS.inkFaint, marginBottom: 4 }}>بازده احتمالی</div><div style={{ fontSize: 15, color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{CASE_SCENARIOS[2].ret}٪ تا +{CASE_SCENARIOS[0].ret}٪</div></div>
      </div>
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 13, color: COLORS.ink, marginBottom: 10 }}>چرا این تصمیم؟</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {[
            { icon: Check, text: `بنیاد قوی (امتیاز ${FUNDAMENTAL_SCORE}) با رشد درآمد پایدار`, tone: COLORS.oliveDeep },
            { icon: Check, text: "در حال حاضر Undervalued نسبت به بازه ارزش منصفانه", tone: COLORS.oliveDeep },
            { icon: Check, text: "همبستگی پایین با ترکیب فعلی پرتفوی — کاهش ریسک کلی", tone: COLORS.oliveDeep },
            { icon: Minus, text: "نقدشوندگی متوسط — در تصمیم‌گیری زمان‌بندی در نظر داشته باشید", tone: COLORS.inkSoft },
          ].map((r, i) => <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: COLORS.ink, alignItems: "flex-start" }}><r.icon size={14} color={r.tone} style={{ marginTop: 2, flexShrink: 0 }} />{r.text}</div>)}
        </div>
      </div>
      <button onClick={() => setExpanded((e) => !e)} style={{ marginTop: 18, background: "transparent", border: "none", color: COLORS.blueDeep, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
        {expanded ? "بستن جزئیات" : "مشاهده جزئیات محاسبه"}
        <ChevronDown size={13} style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
      </button>
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.line}` }}>
          {[
            { label: "Fundamental Score", value: FUNDAMENTAL_SCORE, weight: WEIGHTS.fundamental },
            { label: "Risk-Adjusted Score", value: riskAdjusted, weight: WEIGHTS.risk },
            { label: "Valuation Alignment", value: valuationScore, weight: WEIGHTS.valuation },
            { label: "Scenario Expected Value", value: Math.min(100, scenarioEV), weight: WEIGHTS.scenario },
            { label: "Relative Attractiveness", value: relativeScore, weight: WEIGHTS.relative },
          ].map((r) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.inkSoft, padding: "4px 0" }}>
              <span>{r.label} ({Math.round(r.weight * 100)}٪)</span><span style={{ color: COLORS.ink, fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={onRestart} style={{ marginTop: 18, width: "100%", padding: "12px 0", borderRadius: 10, border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.ink, fontSize: 13.5, cursor: "pointer" }}>
        بررسی فرصت جدید
      </button>
    </Card>
  );
}

const INV_STEPS = [InvStep1, InvStep2, InvStep3, InvStep4, InvStep5, InvStep6, InvStep7];
function InvestmentDecisionView() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const restart = () => { setStep(0); setDone(false); };
  const StepComp = INV_STEPS[step];
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: COLORS.ink }}>Investment Decision Engine</div>
        {!done && <div style={{ fontSize: 12.5, color: COLORS.inkSoft }}>مرحله {step + 1} از {INV_STEPS.length}</div>}
      </div>
      {!done && (
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {INV_STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= step ? COLORS.oliveDeep : COLORS.line }} />
          ))}
        </div>
      )}
      {done ? (
        <DecisionOutput onRestart={restart} />
      ) : (
        <>
          <StepComp />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: `1px solid ${COLORS.line}`, color: COLORS.ink, borderRadius: 10, padding: "9px 16px", fontSize: 13, cursor: step === 0 ? "default" : "pointer", opacity: step === 0 ? 0.4 : 1 }}
            >
              <ChevronRight size={14} /> قبلی
            </button>
            <button
              onClick={() => (step === INV_STEPS.length - 1 ? setDone(true) : setStep((s) => s + 1))}
              style={{ display: "flex", alignItems: "center", gap: 4, background: COLORS.oliveDeep, border: "none", color: COLORS.cream, borderRadius: 10, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}
            >
              {step === INV_STEPS.length - 1 ? "مشاهده تصمیم نهایی" : "بعدی"} <ChevronLeft size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ========================================================================
   APP SHELL
======================================================================== */
const TABS = [
  { key: "overview", label: "نمای کلی", icon: Home, Comp: ExecutiveOverviewView },
  { key: "assets", label: "دارایی‌ها", icon: Layers, Comp: AssetIntelligenceView },
  { key: "commodities", label: "کالاها", icon: Waves, Comp: CommodityIntelligenceView },
  { key: "decision", label: "تحلیل فرصت", icon: Target, Comp: InvestmentDecisionView },
];

const GLOBAL_STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; background: ${COLORS.cream}; font-family: 'Inter', -apple-system, sans-serif; }
  .wos-card { grid-column: span var(--col-span, 12); }
  @media (max-width: 860px) {
    .wos-card { grid-column: span 12 !important; }
    .wos-2col, .wos-3col, .wos-4col { grid-template-columns: 1fr !important; }
  }
  .spin-icon { animation: wos-spin 0.9s linear infinite; }
  @keyframes wos-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.beigeDeep}; border-radius: 999px; }
`;

function FullScreenMessage({ children }) {
  return (
    <div dir="rtl" style={{
      minHeight: "100vh", background: COLORS.cream, fontFamily: "'Inter', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12,
    }}>
      {children}
    </div>
  );
}

function LoadingScreen() {
  return (
    <FullScreenMessage>
      <RefreshCw size={22} color={COLORS.oliveDeep} className="spin-icon" />
      <div style={{ fontSize: 13, color: COLORS.inkSoft }}>در حال بارگذاری...</div>
    </FullScreenMessage>
  );
}

function ErrorScreen({ message }) {
  return (
    <FullScreenMessage>
      <AlertCircle size={22} color={COLORS.roseDeep} />
      <div style={{ fontSize: 13, color: COLORS.ink, maxWidth: 320, textAlign: "center", lineHeight: 1.7 }}>{message}</div>
      <button
        onClick={() => window.location.reload()}
        style={{ background: COLORS.oliveDeep, color: COLORS.cream, border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, cursor: "pointer" }}
      >
        تلاش مجدد
      </button>
    </FullScreenMessage>
  );
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [myAssets, setMyAssetsState] = useState(null);
  const [assets, setAssets] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setDataLoading(true);
      setDataError(null);
      try {
        let snapshot = await getWealthSnapshot();
        if (!snapshot) {
          await seedInitialData();
          snapshot = await getWealthSnapshot();
        }
        const [assetList, commodityList] = await Promise.all([listAssets(), listCommodities()]);
        if (cancelled) return;
        setMyAssetsState(snapshot);
        setAssets(assetList);
        setCommodities(commodityList);
      } catch (e) {
        if (!cancelled) setDataError(e.message || "خطا در بارگذاری داده از سرور");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const persistMyAssets = async (newVals) => {
    const saved = await upsertWealthSnapshot(newVals);
    setMyAssetsState(saved);
  };
  const addAssetAction = async (fields) => {
    const created = await createAsset(fields);
    setAssets((prev) => [created, ...prev]);
  };
  const editAssetAction = async (id, oldAsset, fields) => {
    const updated = await updateAsset(id, oldAsset, fields);
    setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };
  const removeAssetAction = async (asset) => {
    await deleteAsset(asset);
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
  };

  const livePrices = useLivePricesFeed();
  const totals = useWealthTotals(myAssets || EMPTY_MY_ASSETS, assets);
  const wealthValue = useMemo(() => ({
    myAssets: myAssets || EMPTY_MY_ASSETS, setMyAssets: persistMyAssets, totals,
    assets, addAsset: addAssetAction, editAsset: editAssetAction, removeAsset: removeAssetAction,
    commodities,
  }), [myAssets, totals, assets, commodities]);

  const ActiveComp = TABS.find((t) => t.key === activeTab).Comp;

  if (dataError) return <ErrorScreen message={dataError} />;
  if (dataLoading || !myAssets) return <LoadingScreen />;

  return (
    <LivePricesContext.Provider value={livePrices}>
      <WealthDataContext.Provider value={wealthValue}>
        <style>{GLOBAL_STYLE}</style>
        <div dir="rtl" style={{ minHeight: "100vh", background: COLORS.cream, fontFamily: "'Inter', sans-serif" }}>
          <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(250,246,240,0.92)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${COLORS.line}` }}>
            <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", gap: 4, padding: "14px 20px", overflowX: "auto" }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, color: COLORS.ink, marginLeft: 18, whiteSpace: "nowrap" }}>Wealth OS</div>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                    background: activeTab === t.key ? COLORS.beigeDeep : "transparent",
                    color: activeTab === t.key ? COLORS.ink : COLORS.inkSoft,
                    border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, cursor: "pointer",
                  }}
                >
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: "28px 20px 60px" }}>
            <ActiveComp />
          </div>
        </div>
      </WealthDataContext.Provider>
    </LivePricesContext.Provider>
  );
}

export default function App() {
  return <Dashboard />;
}