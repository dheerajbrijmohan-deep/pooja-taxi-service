<?php
declare(strict_types=1);
require __DIR__ . '/lib.php';
require __DIR__ . '/carwash.php';
require __DIR__ . '/planned.php';
require __DIR__ . '/taxi.php';
require __DIR__ . '/vehicles.php';
require __DIR__ . '/drivers.php';
require __DIR__ . '/account.php';
require __DIR__ . '/investments.php';
require __DIR__ . '/employees.php';
require __DIR__ . '/expenses.php';
require __DIR__ . '/attendance.php';
date_default_timezone_set('Asia/Kolkata');

$method = $_SERVER['REQUEST_METHOD'];
$path = trim((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$path = preg_replace('#^(?:[^/]+/)*?api(?:/|$)#', '', $path, 1); // works for /api/x and /manage/api/x

// CSRF guard: state-changing calls must carry our custom header (cross-site forms can't).
if ($method !== 'GET' && ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'fetch') {
    fail('Bad request', 400);
}

try {
    start_session();

    switch ("$method $path") {
        case 'GET me':
            json_out(['user' => current_user()]);

        case 'POST login':
            $in = body();
            $username = strtolower(trim((string) ($in['username'] ?? '')));
            $password = (string) ($in['password'] ?? '');
            $ip = $_SERVER['REMOTE_ADDR'] ?? '';
            $pdo = db();

            // throttle: 5 failures per username+IP in 15 minutes
            $since = gmdate('Y-m-d H:i:s', time() - 900);
            $st = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE username = ? AND ip = ? AND attempted_at > ?');
            $st->execute([$username, $ip, $since]);
            if ((int) $st->fetchColumn() >= 5) fail('Too many attempts. Try again in 15 minutes.', 429);

            $st = $pdo->prepare('SELECT * FROM users WHERE username = ? AND active = 1');
            $st->execute([$username]);
            $u = $st->fetch();
            // always run a hash check so timing doesn't reveal valid usernames
            $hash = $u['password_hash'] ?? '$2y$10$usesomesillystringforsaltvOZ2KtwJyBO0ZXKvE7bz1m6kO1oGq';
            if (!password_verify($password, $hash) || !$u) {
                $pdo->prepare('INSERT INTO login_attempts (username, ip, attempted_at) VALUES (?,?,?)')
                    ->execute([$username, $ip, gmdate('Y-m-d H:i:s')]);
                fail('Invalid username or password', 401);
            }
            $pdo->prepare('DELETE FROM login_attempts WHERE username = ? AND ip = ?')->execute([$username, $ip]);
            $pdo->prepare('UPDATE users SET last_login_at = ? WHERE id = ?')->execute([gmdate('Y-m-d H:i:s'), $u['id']]);
            session_regenerate_id(true);
            $_SESSION['uid'] = (int) $u['id'];
            json_out(['user' => ['id' => (int) $u['id'], 'username' => $u['username'], 'name' => $u['name'], 'role' => $u['role']]]);

        case 'POST logout':
            $_SESSION = [];
            session_destroy();
            json_out(['ok' => true]);

        default:
            if (str_starts_with($path, 'investments') || str_starts_with($path, 'loans')) investments_route($method, $path, require_role('admin'));
            if (str_starts_with($path, 'expenses')) expenses_route($method, $path, require_role('admin', 'manager'));
            if (str_starts_with($path, 'attendance')) attendance_route($method, $path, require_role('admin', 'manager'));
            if (str_starts_with($path, 'salary')) salary_route($method, $path, require_role('admin'));
            if (str_starts_with($path, 'employees')) employees_route($method, $path, require_role('admin'));
            if ($path === 'planned') planned_route($method, require_role('admin', 'manager'));
            if (str_starts_with($path, 'taxi/')) taxi_route($method, $path, require_role('admin', 'manager'));
            if (str_starts_with($path, 'carwash/')) carwash_route($method, $path, require_role('admin', 'manager'));
            fail('Not found', 404);
    }
} catch (Throwable $e) {
    error_log($e->getMessage());
    fail('Server error', 500);
}
