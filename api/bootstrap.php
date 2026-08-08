<?php

require_once __DIR__ . '/env.php';
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/db.php';

load_env();
apply_cors();

const APP_USER_ID = 1;

try {
    $pdo = get_pdo();
} catch (PDOException $e) {
    json_error('Database connection failed: ' . $e->getMessage(), 500);
}
