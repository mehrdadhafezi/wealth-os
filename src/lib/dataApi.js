const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((body && body.error) || res.statusText);
  return body;
}

/* ------------------------------------------------------------------------
   Row <-> JS shape mapping (snake_case API <-> camelCase used by the UI)
------------------------------------------------------------------------ */
function rowToAsset(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    purchaseDate: row.purchase_date,
    purchaseValue: Number(row.purchase_value),
    currentValue: Number(row.current_value),
    annualReturn: Number(row.annual_return),
    risk: Number(row.risk),
    liquidity: Number(row.liquidity),
    horizon: row.horizon,
    ai: row.ai_recommendation,
    trend: [Number(row.purchase_value), Number(row.current_value)],
  };
}

function assetToRow(asset) {
  return {
    name: asset.name,
    category: asset.category,
    purchase_date: asset.purchaseDate,
    purchase_value: asset.purchaseValue,
    current_value: asset.currentValue,
    annual_return: asset.annualReturn,
    risk: asset.risk,
    liquidity: asset.liquidity,
    horizon: asset.horizon,
    ai_recommendation: asset.ai,
  };
}

function rowToCommodity(row) {
  return {
    id: row.id,
    name: row.name,
    symbol: row.symbol,
    price: Number(row.price),
    unit: row.unit,
    change: Number(row.change_pct),
    valuation: row.valuation,
    confidence: row.confidence != null ? Number(row.confidence) : null,
    phase: row.phase,
    angle: row.angle != null ? Number(row.angle) : null,
    trend: Array.isArray(row.trend) ? row.trend : [],
    producers: Array.isArray(row.producers) ? row.producers : [],
    geoRisk: row.geo_risk != null ? Number(row.geo_risk) : null,
    infl: row.infl != null ? Number(row.infl) : null,
    dxy: row.dxy != null ? Number(row.dxy) : null,
  };
}

function rowToMyAssets(row) {
  const shares = row.business_shares || {};
  return {
    estor: Number(shares.estor || 0),
    biyavin: Number(shares.biyavin || 0),
    romina: Number(shares.romina || 0),
    teflon: Number(shares.teflon || 0),
    villa: Number(row.villa_value),
    goldGrams: Number(row.gold_grams),
    goldValue: Number(row.gold_value),
    cryptoBtc: Number(row.crypto_btc),
    cryptoValue: Number(row.crypto_value),
    cash: Number(row.cash),
    liabilities: Number(row.liabilities),
  };
}

function myAssetsToRow(myAssets) {
  return {
    cash: myAssets.cash,
    liabilities: myAssets.liabilities,
    gold_grams: myAssets.goldGrams,
    gold_value: myAssets.goldValue,
    crypto_btc: myAssets.cryptoBtc,
    crypto_value: myAssets.cryptoValue,
    business_shares: {
      estor: myAssets.estor, biyavin: myAssets.biyavin,
      romina: myAssets.romina, teflon: myAssets.teflon,
    },
    villa_value: myAssets.villa,
  };
}

/* ------------------------------------------------------------------------
   Wealth snapshot ("Edit real numbers")
------------------------------------------------------------------------ */
export async function getWealthSnapshot() {
  const row = await apiFetch("/wealth-snapshot.php");
  return row ? rowToMyAssets(row) : null;
}

export async function upsertWealthSnapshot(myAssets) {
  const row = await apiFetch("/wealth-snapshot.php", {
    method: "POST",
    body: JSON.stringify(myAssetsToRow(myAssets)),
  });
  return rowToMyAssets(row);
}

/* ------------------------------------------------------------------------
   Assets — full CRUD + history
------------------------------------------------------------------------ */
export async function listAssets() {
  const rows = await apiFetch("/assets.php");
  return (rows || []).map(rowToAsset);
}

export async function createAsset(fields) {
  const row = await apiFetch("/assets.php", {
    method: "POST",
    body: JSON.stringify(assetToRow(fields)),
  });
  return rowToAsset(row);
}

export async function updateAsset(id, oldAsset, newFields) {
  const row = await apiFetch(`/assets.php?id=${id}`, {
    method: "PUT",
    body: JSON.stringify(assetToRow(newFields)),
  });
  return rowToAsset(row);
}

export async function deleteAsset(asset) {
  await apiFetch(`/assets.php?id=${asset.id}`, { method: "DELETE" });
}

export async function getAssetHistory(assetId) {
  const rows = await apiFetch(`/asset-history.php?asset_id=${assetId}`);
  return rows || [];
}

/* ------------------------------------------------------------------------
   Commodities — read-only fetch in Phase 1 (add/edit form is Phase 2)
------------------------------------------------------------------------ */
export async function listCommodities() {
  const rows = await apiFetch("/commodities.php");
  return (rows || []).map(rowToCommodity);
}

/* ------------------------------------------------------------------------
   First-run seed — called once on initial load if there's no data yet
------------------------------------------------------------------------ */
export async function seedInitialData() {
  await apiFetch("/seed.php", { method: "POST" });
}
