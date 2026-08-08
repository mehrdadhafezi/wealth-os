-- Wealth OS — MySQL schema (Phase 1b, no-auth / single fixed user)
-- Run this once via phpMyAdmin (or `mysql < schema.sql`) against an empty database.
-- Every table carries user_id INT NOT NULL DEFAULT 1 as a placeholder for a future
-- login phase — no auth.users table / RLS exists in this phase.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS assets (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NOT NULL DEFAULT 1,
  name              VARCHAR(255) NOT NULL,
  category          VARCHAR(100) NOT NULL,
  purchase_date     VARCHAR(50),
  purchase_value    DECIMAL(18,2) NOT NULL DEFAULT 0,
  current_value     DECIMAL(18,2) NOT NULL DEFAULT 0,
  annual_return     DECIMAL(8,2)  NOT NULL DEFAULT 0,
  risk              TINYINT NOT NULL DEFAULT 3,
  liquidity         TINYINT NOT NULL DEFAULT 3,
  horizon           VARCHAR(50),
  ai_recommendation VARCHAR(50),
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_assets_user_id (user_id),
  CONSTRAINT chk_assets_risk CHECK (risk BETWEEN 1 AND 5),
  CONSTRAINT chk_assets_liquidity CHECK (liquidity BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS asset_history (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  asset_id      INT NULL,
  user_id       INT NOT NULL DEFAULT 1,
  field_changed VARCHAR(100) NOT NULL,
  old_value     TEXT NULL,
  new_value     TEXT NULL,
  changed_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_asset_history_user_id (user_id),
  KEY idx_asset_history_asset_id (asset_id),
  CONSTRAINT fk_asset_history_asset
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS commodities (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL DEFAULT 1,
  name       VARCHAR(100) NOT NULL,
  symbol     VARCHAR(20) NOT NULL,
  price      DECIMAL(18,4) NOT NULL DEFAULT 0,
  unit       VARCHAR(30),
  change_pct DECIMAL(8,2) DEFAULT 0,
  valuation  VARCHAR(30),
  confidence DECIMAL(6,2) NULL,
  phase      VARCHAR(30),
  angle      DECIMAL(8,2) NULL,
  geo_risk   DECIMAL(6,2) NULL,
  trend      JSON NULL,
  producers  JSON NULL,
  infl       DECIMAL(6,2) NULL,
  dxy        DECIMAL(6,2) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_commodities_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS investment_opportunities (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL DEFAULT 1,
  name             VARCHAR(255) NOT NULL,
  category         VARCHAR(100),
  amount           DECIMAL(18,2) NOT NULL DEFAULT 0,
  horizon          VARCHAR(50),
  fundamental_score DECIMAL(6,2) NULL,
  risk_score        DECIMAL(6,2) NULL,
  valuation_low     DECIMAL(18,2) NULL,
  valuation_high    DECIMAL(18,2) NULL,
  status            ENUM('draft','decided') NOT NULL DEFAULT 'draft',
  decision          VARCHAR(50) NULL,
  composite_score   DECIMAL(6,2) NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_investment_opportunities_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wealth_snapshots (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL DEFAULT 1,
  cash            DECIMAL(18,2) NOT NULL DEFAULT 0,
  liabilities     DECIMAL(18,2) NOT NULL DEFAULT 0,
  gold_grams      DECIMAL(12,2) NOT NULL DEFAULT 0,
  gold_value      DECIMAL(18,2) NOT NULL DEFAULT 0,
  crypto_btc      DECIMAL(12,4) NOT NULL DEFAULT 0,
  crypto_value    DECIMAL(18,2) NOT NULL DEFAULT 0,
  business_shares JSON NULL,
  villa_value     DECIMAL(18,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_wealth_snapshots_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
