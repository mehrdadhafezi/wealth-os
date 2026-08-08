<?php

require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM wealth_snapshots WHERE user_id = :user_id LIMIT 1');
    $stmt->execute(['user_id' => APP_USER_ID]);
    $row = $stmt->fetch();
    json_response($row ? decode_json_fields($row, ['business_shares']) : null);
}

if ($method === 'POST') {
    $body = read_json_body();
    $fields = [
        'cash' => (float) ($body['cash'] ?? 0),
        'liabilities' => (float) ($body['liabilities'] ?? 0),
        'gold_grams' => (float) ($body['gold_grams'] ?? 0),
        'gold_value' => (float) ($body['gold_value'] ?? 0),
        'crypto_btc' => (float) ($body['crypto_btc'] ?? 0),
        'crypto_value' => (float) ($body['crypto_value'] ?? 0),
        'business_shares' => json_encode($body['business_shares'] ?? new stdClass(), JSON_UNESCAPED_UNICODE),
        'villa_value' => (float) ($body['villa_value'] ?? 0),
    ];

    $stmt = $pdo->prepare('
        INSERT INTO wealth_snapshots (user_id, cash, liabilities, gold_grams, gold_value, crypto_btc, crypto_value, business_shares, villa_value)
        VALUES (:user_id, :cash, :liabilities, :gold_grams, :gold_value, :crypto_btc, :crypto_value, :business_shares, :villa_value)
        ON DUPLICATE KEY UPDATE
            cash = VALUES(cash), liabilities = VALUES(liabilities), gold_grams = VALUES(gold_grams),
            gold_value = VALUES(gold_value), crypto_btc = VALUES(crypto_btc), crypto_value = VALUES(crypto_value),
            business_shares = VALUES(business_shares), villa_value = VALUES(villa_value)
    ');
    $stmt->execute(array_merge(['user_id' => APP_USER_ID], $fields));

    $stmt = $pdo->prepare('SELECT * FROM wealth_snapshots WHERE user_id = :user_id LIMIT 1');
    $stmt->execute(['user_id' => APP_USER_ID]);
    $row = $stmt->fetch();
    json_response(decode_json_fields($row, ['business_shares']));
}

json_error('Method not allowed', 405);
