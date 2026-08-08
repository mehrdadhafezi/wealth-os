<?php

require __DIR__ . '/bootstrap.php';

const ASSET_FIELDS = [
    'name', 'category', 'purchase_date', 'purchase_value', 'current_value',
    'annual_return', 'risk', 'liquidity', 'horizon', 'ai_recommendation',
];

function validate_asset_fields(array $body): ?string
{
    if (isset($body['risk']) && !in_array((int) $body['risk'], [1, 2, 3, 4, 5], true)) {
        return 'risk must be between 1 and 5';
    }
    if (isset($body['liquidity']) && !in_array((int) $body['liquidity'], [1, 2, 3, 4, 5], true)) {
        return 'liquidity must be between 1 and 5';
    }
    return null;
}

function fetch_asset(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM assets WHERE id = :id AND user_id = :user_id LIMIT 1');
    $stmt->execute(['id' => $id, 'user_id' => APP_USER_ID]);
    $row = $stmt->fetch();
    return $row ?: null;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT * FROM assets WHERE user_id = :user_id ORDER BY current_value DESC');
    $stmt->execute(['user_id' => APP_USER_ID]);
    json_response($stmt->fetchAll());
}

if ($method === 'POST') {
    $body = read_json_body();
    if (empty($body['name'])) json_error('name is required');
    if ($error = validate_asset_fields($body)) json_error($error);

    $values = ['user_id' => APP_USER_ID];
    foreach (ASSET_FIELDS as $field) {
        $values[$field] = $body[$field] ?? null;
    }

    $columns = array_keys($values);
    $placeholders = array_map(fn($c) => ":$c", $columns);
    $stmt = $pdo->prepare('INSERT INTO assets (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')');
    $stmt->execute($values);
    $newId = (int) $pdo->lastInsertId();

    $history = $pdo->prepare('INSERT INTO asset_history (asset_id, user_id, field_changed, old_value, new_value) VALUES (:asset_id, :user_id, :field, NULL, :new_value)');
    $history->execute(['asset_id' => $newId, 'user_id' => APP_USER_ID, 'field' => 'created', 'new_value' => $body['name']]);

    json_response(fetch_asset($pdo, $newId), 201);
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : null;

if ($method === 'PUT') {
    if (!$id) json_error('id is required');
    $existing = fetch_asset($pdo, $id);
    if (!$existing) json_error('asset not found', 404);

    $body = read_json_body();
    if ($error = validate_asset_fields($body)) json_error($error);

    $updates = [];
    $values = ['id' => $id, 'user_id' => APP_USER_ID];
    $historyRows = [];
    foreach (ASSET_FIELDS as $field) {
        if (!array_key_exists($field, $body)) continue;
        $updates[] = "$field = :$field";
        $values[$field] = $body[$field];
        if ((string) ($existing[$field] ?? '') !== (string) ($body[$field] ?? '')) {
            $historyRows[] = [$field, (string) ($existing[$field] ?? ''), (string) ($body[$field] ?? '')];
        }
    }

    if ($updates) {
        $stmt = $pdo->prepare('UPDATE assets SET ' . implode(', ', $updates) . ' WHERE id = :id AND user_id = :user_id');
        $stmt->execute($values);
    }

    if ($historyRows) {
        $history = $pdo->prepare('INSERT INTO asset_history (asset_id, user_id, field_changed, old_value, new_value) VALUES (:asset_id, :user_id, :field, :old_value, :new_value)');
        foreach ($historyRows as [$field, $old, $new]) {
            $history->execute(['asset_id' => $id, 'user_id' => APP_USER_ID, 'field' => $field, 'old_value' => $old, 'new_value' => $new]);
        }
    }

    json_response(fetch_asset($pdo, $id));
}

if ($method === 'DELETE') {
    if (!$id) json_error('id is required');
    $existing = fetch_asset($pdo, $id);
    if (!$existing) json_error('asset not found', 404);

    $history = $pdo->prepare('INSERT INTO asset_history (asset_id, user_id, field_changed, old_value, new_value) VALUES (:asset_id, :user_id, :field, :old_value, NULL)');
    $history->execute(['asset_id' => $id, 'user_id' => APP_USER_ID, 'field' => 'deleted', 'old_value' => $existing['name']]);

    $stmt = $pdo->prepare('DELETE FROM assets WHERE id = :id AND user_id = :user_id');
    $stmt->execute(['id' => $id, 'user_id' => APP_USER_ID]);

    json_response(['deleted' => true]);
}

json_error('Method not allowed', 405);
