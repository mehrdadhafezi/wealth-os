<?php

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/seed_data.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Method not allowed', 405);
}

$stmt = $pdo->prepare('SELECT COUNT(*) FROM assets WHERE user_id = :user_id');
$stmt->execute(['user_id' => APP_USER_ID]);
if ((int) $stmt->fetchColumn() > 0) {
    json_response(['seeded' => false]);
}

$pdo->beginTransaction();

try {
    $snapshot = seed_wealth_snapshot();
    $stmt = $pdo->prepare('
        INSERT INTO wealth_snapshots (user_id, cash, liabilities, gold_grams, gold_value, crypto_btc, crypto_value, business_shares, villa_value)
        VALUES (:user_id, :cash, :liabilities, :gold_grams, :gold_value, :crypto_btc, :crypto_value, :business_shares, :villa_value)
        ON DUPLICATE KEY UPDATE
            cash = VALUES(cash), liabilities = VALUES(liabilities), gold_grams = VALUES(gold_grams),
            gold_value = VALUES(gold_value), crypto_btc = VALUES(crypto_btc), crypto_value = VALUES(crypto_value),
            business_shares = VALUES(business_shares), villa_value = VALUES(villa_value)
    ');
    $stmt->execute(array_merge(['user_id' => APP_USER_ID], $snapshot, [
        'business_shares' => json_encode($snapshot['business_shares'], JSON_UNESCAPED_UNICODE),
    ]));

    $assetStmt = $pdo->prepare('
        INSERT INTO assets (user_id, name, category, purchase_date, purchase_value, current_value, annual_return, risk, liquidity, horizon, ai_recommendation)
        VALUES (:user_id, :name, :category, :purchase_date, :purchase_value, :current_value, :annual_return, :risk, :liquidity, :horizon, :ai_recommendation)
    ');
    $historyStmt = $pdo->prepare('
        INSERT INTO asset_history (asset_id, user_id, field_changed, old_value, new_value)
        VALUES (:asset_id, :user_id, :field, NULL, :new_value)
    ');
    foreach (seed_assets() as $asset) {
        $assetStmt->execute(array_merge(['user_id' => APP_USER_ID], $asset));
        $historyStmt->execute([
            'asset_id' => (int) $pdo->lastInsertId(),
            'user_id' => APP_USER_ID,
            'field' => 'created',
            'new_value' => $asset['name'],
        ]);
    }

    $commodityStmt = $pdo->prepare('
        INSERT INTO commodities (user_id, name, symbol, price, unit, change_pct, valuation, confidence, phase, angle, geo_risk, trend, producers, infl, dxy)
        VALUES (:user_id, :name, :symbol, :price, :unit, :change_pct, :valuation, :confidence, :phase, :angle, :geo_risk, :trend, :producers, :infl, :dxy)
    ');
    foreach (seed_commodities() as $c) {
        $commodityStmt->execute(array_merge(['user_id' => APP_USER_ID], $c, [
            'trend' => json_encode($c['trend'], JSON_UNESCAPED_UNICODE),
            'producers' => json_encode($c['producers'], JSON_UNESCAPED_UNICODE),
        ]));
    }

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    json_error('Seeding failed: ' . $e->getMessage(), 500);
}

json_response(['seeded' => true]);
