<?php
declare(strict_types=1);

const CARWASH_DUE_DAYS = 15;   // next wash is due this many days after a wash
const CARWASH_SERVICES = ['Full Wash', 'Top Wash', 'Water Spray', 'Interior Vacuum', 'Interior Deep Clean', 'Wax Polish', 'Glass Clean'];
const CARWASH_CALL_AFTER = 12; // customers appear on the caller's list this many days after their last wash

function cw_row(array $r): array {
    return [
        'id' => (int) $r['id'],
        'entry_date' => $r['entry_date'],
        'name' => $r['name'],
        'mobile' => $r['mobile'],
        'address' => $r['address'],
        'model' => $r['model'],
        'vehicle_number' => $r['vehicle_number'],
        'vehicle_type' => $r['vehicle_type'],
        'service' => $r['service'],
        'paid' => (float) $r['paid'],
        'payment_mode' => $r['payment_mode'] ?? '',
        'due_on' => $r['due_on'],
    ];
}

function cw_valid_date(string $d): bool {
    $dt = DateTimeImmutable::createFromFormat('Y-m-d', $d);
    return $dt !== false && $dt->format('Y-m-d') === $d;
}

// MH31FM7700 -> MH-31 FM-7700. Numbers that do not fit that shape are kept as given, in capitals and without spaces.
function cw_vehicle(string $raw): string {
    $c = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $raw));
    if (preg_match('/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{1,4})$/', $c, $m)) return "$m[1]-$m[2] $m[3]-$m[4]";
    return $c;
}

function cw_clean(array $in): array {
    $date = trim((string) ($in['entry_date'] ?? ''));
    $name = trim((string) ($in['name'] ?? ''));
    $mobile = preg_replace('/[^0-9+]/', '', (string) ($in['mobile'] ?? ''));
    $vehicle = cw_vehicle((string) ($in['vehicle_number'] ?? ''));
    $address = trim((string) ($in['address'] ?? ''));
    $model = trim((string) ($in['model'] ?? ''));
    $type = (string) ($in['vehicle_type'] ?? 'Car');
    $service = trim((string) ($in['service'] ?? ''));
    $paid = $in['paid'] ?? 0;
    $mode = trim((string) ($in['payment_mode'] ?? ''));
    if (is_string($paid) && trim($paid) === '') $paid = 0;

    if (!cw_valid_date($date)) fail('Enter a valid date', 422);
    // name, mobile, vehicle number, address, model, service and paid may be left blank
    if (mb_strlen($name) > 100) fail('Name is too long', 422);
    if ($mobile !== '' && !preg_match('/^(\+91)?[0-9]{10}$/', $mobile)) fail('Mobile number must be 10 digits, or leave it blank', 422);
    if (mb_strlen($vehicle) > 20) fail('Vehicle number is too long', 422);
    if ($service !== '' && !in_array($service, CARWASH_SERVICES, true)) fail('Choose a service from the list', 422);
    if (mb_strlen($address) > 255 || mb_strlen($model) > 100) fail('Address or model is too long', 422);
    if (!in_array($mode, ['', 'Online', 'Cash', 'Credit', 'Complimentary'], true)) fail('Choose Online, Cash, Credit or Complimentary', 422);
    if (!in_array($type, ['Car', 'Bike', 'Auto'], true)) fail('Choose Car, Bike or Auto', 422);
    if (!is_numeric($paid) || $paid < 0 || $paid > 10000000) fail('Enter a valid paid amount', 422);

    if ($name === '' && $mobile === '' && $vehicle === '' && $service === '' && $model === '' && $address === '' && (float) $paid == 0.0) fail('Enter at least one detail besides the date', 422);

    if ($mode === 'Complimentary') $paid = 0;

    $due = (new DateTimeImmutable($date))->modify('+' . CARWASH_DUE_DAYS . ' days')->format('Y-m-d');
    return [$date, $name, $mobile, $address, $model, $vehicle, $type, $service, round((float) $paid, 2), $due, $mode];
}

// Latest entry per vehicle whose last wash was CARWASH_CALL_AFTER or more days ago, with call history attached.
function cw_call_list(PDO $pdo): array {
    $cutoff = date('Y-m-d', strtotime('-' . CARWASH_CALL_AFTER . ' days'));
    $st = $pdo->prepare('SELECT e.* FROM carwash_entries e
        WHERE e.id = (SELECT e2.id FROM carwash_entries e2 WHERE e2.vehicle_number = e.vehicle_number ORDER BY e2.entry_date DESC, e2.id DESC LIMIT 1)
        AND LENGTH(e.vehicle_number) > 0 AND LENGTH(e.mobile) > 0 AND e.entry_date <= ? ORDER BY e.entry_date ASC, e.id ASC');
    $st->execute([$cutoff]);
    $rows = $st->fetchAll();
    if (!$rows) return [];

    $vehicles = array_values(array_unique(array_column($rows, 'vehicle_number')));
    $in = implode(',', array_fill(0, count($vehicles), '?'));
    $st = $pdo->prepare("SELECT vehicle_number, comment, called_by_name, called_at FROM carwash_calls WHERE vehicle_number IN ($in) ORDER BY called_at DESC, id DESC");
    $st->execute($vehicles);
    $calls = [];
    foreach ($st->fetchAll() as $c) {
        $calls[$c['vehicle_number']][] = ['comment' => $c['comment'], 'by' => $c['called_by_name'], 'at' => $c['called_at']];
    }
    return array_map(function ($r) use ($calls) {
        $e = cw_row($r);
        $e['calls'] = array_slice($calls[$r['vehicle_number']] ?? [], 0, 10);
        return $e;
    }, $rows);
}

function carwash_route(string $method, string $path, array $user): void {
    $pdo = db();

    if ($method === 'GET' && $path === 'carwash/entries') {
        // optional date range (used by reports) lifts the 2,000-row cap of the everyday list
        $from = (string) ($_GET['from'] ?? '');
        $to = (string) ($_GET['to'] ?? '');
        if ($from !== '' || $to !== '') {
            if (($from !== '' && !cw_valid_date($from)) || ($to !== '' && !cw_valid_date($to))) fail('Enter a valid date range', 422);
            $st = $pdo->prepare('SELECT * FROM carwash_entries WHERE entry_date >= ? AND entry_date <= ? ORDER BY entry_date DESC, id DESC LIMIT 50000');
            $st->execute([$from !== '' ? $from : '1900-01-01', $to !== '' ? $to : '9999-12-31']);
            $rows = $st->fetchAll();
        } else {
            $rows = $pdo->query('SELECT * FROM carwash_entries ORDER BY entry_date DESC, id DESC LIMIT 2000')->fetchAll();
        }
        json_out(['entries' => array_map('cw_row', $rows)]);
    }

    if ($method === 'POST' && $path === 'carwash/entries') {
        [$date, $name, $mobile, $address, $model, $vehicle, $type, $service, $paid, $due, $mode] = cw_clean(body());
        $pdo->prepare('INSERT INTO carwash_entries (entry_date,name,mobile,address,model,vehicle_number,vehicle_type,service,paid,payment_mode,due_on,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$date, $name, $mobile, $address, $model, $vehicle, $type, $service, $paid, $mode, $due, $user['id']]);
        $st = $pdo->prepare('SELECT * FROM carwash_entries WHERE id = ?');
        $st->execute([(int) $pdo->lastInsertId()]);
        json_out(['entry' => cw_row($st->fetch())], 201);
    }

    if (preg_match('#^carwash/entries/(\d+)$#', $path, $m)) {
        $id = (int) $m[1];
        if ($method === 'PUT') {
            // a manager can complete an entry only until its payment is recorded; after that only the owner can change it
            $cur = $pdo->prepare('SELECT payment_mode FROM carwash_entries WHERE id = ?');
            $cur->execute([$id]);
            $was = $cur->fetchColumn();
            if ($was === false) fail('Entry not found', 404);
            $in = body();
            if ($user['role'] !== 'admin' && $was === 'Credit') {
                // a manager may only settle a credit: choose how it was paid; nothing else changes, and the entry then locks
                $newMode = (string) ($in['payment_mode'] ?? '');
                if (!in_array($newMode, ['Online', 'Cash'], true)) fail('Choose Online or Cash to record the payment received', 422);
                $row = $pdo->prepare('SELECT * FROM carwash_entries WHERE id = ?');
                $row->execute([$id]);
                $r0 = $row->fetch();
                $pdo->prepare('UPDATE carwash_entries SET payment_mode = ? WHERE id = ?')->execute([$newMode, $id]);
                $GLOBALS['notify_text'] = 'received the credit payment: ' . implode(' · ', array_filter([$r0['name'], $r0['vehicle_number'], '₹' . number_format((float) $r0['paid'], 0), $newMode]));
                $row->execute([$id]);
                json_out(['entry' => cw_row($row->fetch())]);
            }
            if ($user['role'] !== 'admin' && $was !== '') fail('This entry is locked because its payment is recorded. Only the owner can change it.', 403);
            [$date, $name, $mobile, $address, $model, $vehicle, $type, $service, $paid, $due, $mode] = cw_clean(body());
            $st = $pdo->prepare('UPDATE carwash_entries SET entry_date=?,name=?,mobile=?,address=?,model=?,vehicle_number=?,vehicle_type=?,service=?,paid=?,payment_mode=?,due_on=? WHERE id=?');
            $st->execute([$date, $name, $mobile, $address, $model, $vehicle, $type, $service, $paid, $mode, $due, $id]);
            $st = $pdo->prepare('SELECT * FROM carwash_entries WHERE id = ?');
            $st->execute([$id]);
            $r = $st->fetch();
            if (!$r) fail('Entry not found', 404);
            json_out(['entry' => cw_row($r)]);
        }
        if ($method === 'DELETE') {
            if ($user['role'] !== 'admin') fail('Only the owner can delete entries', 403);
            $pdo->prepare('DELETE FROM carwash_entries WHERE id = ?')->execute([$id]);
            json_out(['ok' => true]);
        }
    }

    if ($method === 'GET' && $path === 'carwash/call-list') {
        json_out(['customers' => cw_call_list($pdo), 'call_after_days' => CARWASH_CALL_AFTER, 'due_days' => CARWASH_DUE_DAYS]);
    }

    if ($method === 'POST' && $path === 'carwash/calls') {
        $in = body();
        $vehicle = cw_vehicle((string) ($in['vehicle_number'] ?? ''));
        $comment = trim((string) ($in['comment'] ?? ''));
        if ($comment === '' || mb_strlen($comment) > 500) fail('Write a comment (up to 500 characters)', 422);
        $st = $pdo->prepare('SELECT COUNT(*) FROM carwash_entries WHERE vehicle_number = ?');
        $st->execute([$vehicle]);
        if (!(int) $st->fetchColumn()) fail('Vehicle not found', 404);
        $pdo->prepare('INSERT INTO carwash_calls (vehicle_number, comment, called_by, called_by_name, called_at) VALUES (?,?,?,?,?)')
            ->execute([$vehicle, $comment, $user['id'], $user['name'], date('Y-m-d H:i:s')]);
        json_out(['ok' => true], 201);
    }

    if ($method === 'GET' && $path === 'carwash/stats') {
        $today = date('Y-m-d');
        $monthStart = date('Y-m-01');
        $sum = function (string $where, array $args) use ($pdo): array {
            $st = $pdo->prepare("SELECT COUNT(*) AS cars, COALESCE(SUM(CASE WHEN payment_mode = 'Credit' THEN 0 ELSE paid END),0) AS earned, COALESCE(SUM(CASE WHEN payment_mode = 'Credit' THEN paid ELSE 0 END),0) AS credit FROM carwash_entries WHERE $where");
            $st->execute($args);
            $r = $st->fetch();
            return ['cars' => (int) $r['cars'], 'earned' => (float) $r['earned'], 'credit' => (float) $r['credit']];
        };

        json_out([
            'today' => $today,
            'day' => $sum('entry_date = ?', [$today]),
            'month' => $sum('entry_date >= ?', [$monthStart]),
            'all' => $sum('1=1', []),
            'to_call' => count(cw_call_list($pdo)),
        ]);
    }

    fail('Not found', 404);
}
