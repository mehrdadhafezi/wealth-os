<?php

require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

$stmt = $pdo->prepare('SELECT * FROM commodities WHERE user_id = :user_id ORDER BY name');
$stmt->execute(['user_id' => APP_USER_ID]);
$rows = array_map(fn($row) => decode_json_fields($row, ['trend', 'producers']), $stmt->fetchAll());

json_response($rows);
