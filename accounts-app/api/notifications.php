<?php
declare(strict_types=1);

// Tells the owner what a manager just entered or changed. A bell on the owner's screen reads this list.
// Any successful write by a manager is recorded automatically (see notify_watch); routes may set $GLOBALS['notify_text'] for a clearer line.

function notify_text(PDO $pdo, string $method, string $path, array $in): ?string {
    $inr = fn($n) => '₹' . number_format((float) $n, 0);
    $car = function ($id) use ($pdo): string {
        if (!$id) return '';
        $st = $pdo->prepare('SELECT code FROM taxi_vehicles WHERE id = ?'); $st->execute([(int) $id]);
        return (string) ($st->fetchColumn() ?: '');
    };
    $driver = function ($id) use ($pdo): string {
        if (!$id) return '';
        $st = $pdo->prepare('SELECT name FROM taxi_drivers WHERE id = ?'); $st->execute([(int) $id]);
        return (string) ($st->fetchColumn() ?: '');
    };
    $join = fn(array $p) => implode(' · ', array_filter($p, fn($x) => $x !== '' && $x !== null));
    $verb = $method === 'POST' ? 'added' : ($method === 'DELETE' ? 'removed' : 'changed');

    if ($path === 'carwash/entries' && $method === 'POST') {
        $pay = ($in['payment_mode'] ?? '') !== '' ? $inr($in['paid'] ?? 0) . ' ' . $in['payment_mode'] : 'not paid yet';
        return 'added a car wash entry: ' . $join([$in['name'] ?? '', strtoupper((string) ($in['vehicle_number'] ?? '')), $in['service'] ?? '', $pay]);
    }
    if (str_starts_with($path, 'carwash/entries/')) return $verb . ' a car wash entry: ' . $join([$in['name'] ?? '', strtoupper((string) ($in['vehicle_number'] ?? '')), ($in['payment_mode'] ?? '') !== '' ? $in['payment_mode'] : '']);
    if ($path === 'carwash/calls') return 'recorded a reminder call for ' . strtoupper((string) ($in['vehicle_number'] ?? ''));
    if ($path === 'taxi/trips' && $method === 'POST') return 'added a daily vehicle entry: ' . $join([$car($in['vehicle_id'] ?? null), $driver($in['driver_id'] ?? null), $in['trip_date'] ?? '']);
    if (str_starts_with($path, 'taxi/trips/')) return $verb . ' a daily vehicle entry';
    if ($path === 'taxi/expenses') return 'added a taxi expense: ' . $join([$car($in['vehicle_id'] ?? null), $in['category'] ?? '', $in['item'] ?? '', isset($in['amount']) ? $inr($in['amount']) : '']);
    if ($path === 'taxi/ledger') return 'added a ' . strtolower((string) ($in['kind'] ?? 'ledger')) . ' entry: ' . $join([$driver($in['driver_id'] ?? null), isset($in['amount']) ? $inr($in['amount']) : '', $in['entry_date'] ?? '']);
    if ($path === 'expenses') return 'added an expense: ' . $join([$in['business'] ?? '', $in['category'] ?? '', $in['item'] ?? '']);
    if (str_starts_with($path, 'attendance')) return 'updated attendance';
    if (preg_match('#^taxi/vehicles/\d+/(documents|services|accidents)$#', $path, $m)) return 'added a vehicle ' . rtrim($m[1], 's') . ' record';
    if ($path === 'planned') return 'updated the planned business notes';
    return $verb . ' ' . $path;
}

function notify_watch(array $user, string $method, string $path): void {
    if ($method === 'GET' || $user['role'] !== 'manager') return;
    $in = body();
    register_shutdown_function(function () use ($user, $method, $path, $in): void {
        $code = http_response_code();
        if ($code < 200 || $code >= 300) return;
        try {
            $pdo = db();
            $text = $GLOBALS['notify_text'] ?? notify_text($pdo, $method, $path, $in);
            if ($text === null) return;
            $pdo->prepare('INSERT INTO notifications (created_at, actor_name, summary) VALUES (?,?,?)')
                ->execute([date('Y-m-d H:i:s'), $user['name'], mb_substr($text, 0, 300)]);
        } catch (Throwable $e) {
            error_log('notify: ' . $e->getMessage());
        }
    });
}

function notifications_route(string $method, string $path, array $user): void {
    $pdo = db();
    if ($method === 'GET' && $path === 'notifications') {
        $rows = $pdo->query('SELECT id, created_at, actor_name, summary, is_read FROM notifications ORDER BY id DESC LIMIT 60')->fetchAll();
        $unread = (int) $pdo->query('SELECT COUNT(*) FROM notifications WHERE is_read = 0')->fetchColumn();
        json_out(['unread' => $unread, 'items' => array_map(fn($r) => ['id' => (int) $r['id'], 'at' => $r['created_at'], 'by' => $r['actor_name'], 'text' => $r['summary'], 'read' => (bool) $r['is_read']], $rows)]);
    }
    if ($method === 'POST' && $path === 'notifications/read') {
        $pdo->exec('UPDATE notifications SET is_read = 1 WHERE is_read = 0');
        // keep the table small: drop read items older than 90 days
        $pdo->prepare('DELETE FROM notifications WHERE is_read = 1 AND created_at < ?')->execute([date('Y-m-d H:i:s', strtotime('-90 days'))]);
        json_out(['ok' => true]);
    }
    fail('Not found', 404);
}
