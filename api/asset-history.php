<?php

require __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Method not allowed', 405);
}

$assetId = isset($_GET['asset_id']) ? (int) $_GET['asset_id'] : null;
if (!$assetId) json_error('asset_id is required');

$stmt = $pdo->prepare('
    SELECT * FROM asset_history
    WHERE user_id = :user_id AND asset_id = :asset_id
    ORDER BY changed_at DESC
');
$stmt->execute(['user_id' => APP_USER_ID, 'asset_id' => $assetId]);

json_response($stmt->fetchAll());
