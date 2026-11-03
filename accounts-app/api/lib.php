<?php
declare(strict_types=1);

function config(): array {
    static $c = null;
    return $c ??= require __DIR__ . '/config.php';
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = config();
    $opts = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];
    if ($c['driver'] === 'sqlite') {
        $pdo = new PDO('sqlite:' . $c['sqlite_path'], null, null, $opts);
    } else {
        $m = $c['mysql'];
        $pdo = new PDO("mysql:host={$m['host']};dbname={$m['name']};charset=utf8mb4", $m['user'], $m['pass'], $opts);
    }
    return $pdo;
}

function json_out(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode($data);
    exit;
}

function fail(string $msg, int $status): never {
    json_out(['error' => $msg], $status);
}

function start_session(): void {
    session_name('pooja_sid');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => (bool) config()['secure_cookie'],
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function current_user(): ?array {
    $id = $_SESSION['uid'] ?? null;
    if (!$id) return null;
    $st = db()->prepare('SELECT id, username, name, role FROM users WHERE id = ? AND active = 1');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}

function require_role(string ...$roles): array {
    $u = current_user();
    if (!$u) fail('Not signed in', 401);
    if (!in_array($u['role'], $roles, true)) fail('Not allowed', 403);
    return $u;
}

function body(): array {
    $d = json_decode(file_get_contents('php://input') ?: '', true);
    return is_array($d) ? $d : [];
}

// ---- Addresses (drivers and employees): current address = `address` + city/state/pincode; permanent address = perm_* fields.
const IN_STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry'];
const ADDRESS_COLS = 'city,state,pincode,perm_address,perm_city,perm_state,perm_pincode';

function address_fields(array $in): array { // values in ADDRESS_COLS order, validated
    $text = function (string $k, int $max, string $label) use ($in): string {
        $v = trim((string) ($in[$k] ?? ''));
        if (mb_strlen($v) > $max) fail("$label is too long ($max characters at most)", 422);
        return $v;
    };
    $state = function (string $k, string $label) use ($in): string {
        $v = trim((string) ($in[$k] ?? ''));
        if ($v !== '' && !in_array($v, IN_STATES, true)) fail("Choose the $label from the list", 422);
        return $v;
    };
    $pin = function (string $k, string $label) use ($in): string {
        $v = preg_replace('/\s+/', '', (string) ($in[$k] ?? ''));
        if ($v !== '' && !preg_match('/^[1-9][0-9]{5}$/', $v)) fail("Enter a valid 6-digit $label", 422);
        return $v;
    };
    return [$text('city', 60, 'City'), $state('state', 'state'), $pin('pincode', 'PIN code'),
            $text('perm_address', 255, 'Permanent address'), $text('perm_city', 60, 'Permanent city'), $state('perm_state', 'permanent state'), $pin('perm_pincode', 'permanent PIN code')];
}

function address_row(array $r): array {
    $o = [];
    foreach (explode(',', ADDRESS_COLS) as $c) $o[$c] = (string) ($r[$c] ?? '');
    return $o;
}
