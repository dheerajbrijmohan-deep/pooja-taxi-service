<?php
declare(strict_types=1);

// Owner's account sheet for a car (e.g. "Jiju's Account" for 1376): one row per running day, copied from the car's own sheet.
//   Profit = Payout - Driver share - CNG - Petrol - Management (the car's managing & maintenance charge, once per running day)
// A loss day is netted off the next deposit (pending is the net of all complete days). Each profit is deposited into the deposit account (e.g. Edura Consulting Account) and the row is stamped with the date of the click.
// Nothing is deducted in advance for service / insurance / permit: those are tracked as "money to ask for" and asked when due.
// Owner (admin) only.

const TA_DUE_KINDS = ['Insurance', 'Service', 'Permit', 'PUC', 'Fitness', 'Road tax', 'Tyres', 'Battery', 'Repair', 'Other'];

function ta_car(PDO $pdo, int $id): array {
    $st = $pdo->prepare('SELECT * FROM taxi_vehicles WHERE id = ?');
    $st->execute([$id]);
    $c = $st->fetch();
    if (!$c) fail('Car not found', 404);
    return $c;
}

function ta_rows(PDO $pdo, array $car, string $from, string $to): array {
    $drivers = array_column($pdo->query('SELECT id, name FROM taxi_drivers')->fetchAll(), 'name', 'id');
    $st = $pdo->prepare('SELECT * FROM taxi_trips WHERE vehicle_id = ? AND on_leave = 0 AND trip_date >= ? AND trip_date <= ? ORDER BY trip_date, id');
    $st->execute([(int) $car['id'], $from, $to]);
    $charge = (float) $car['run_day_charge'];
    $rows = []; $charged = [];
    foreach ($st->fetchAll() as $t) {
        $r = taxi_trip_row($t);
        $mgmt = isset($charged[$t['trip_date']]) ? 0.0 : $charge; // the management charge is taken once for each day the car runs
        $charged[$t['trip_date']] = true;
        $profit = round($r['payout'] - $r['driver_share'] - $r['cng_amount'] - $r['petrol_amount'] - $mgmt, 2);
        $dep = $t['deposited_on'] !== null;
        $rows[] = ['trip_id' => $r['id'], 'date' => $t['trip_date'], 'driver_name' => $drivers[$r['driver_id']] ?? '', 'total_earning' => $r['total_earning'], 'payout' => $r['payout'],
            'driver_share' => $r['driver_share'], 'cng_amount' => $r['cng_amount'], 'petrol_amount' => $r['petrol_amount'], 'management' => $mgmt, 'profit' => $profit,
            'ready' => $r['payout'] > 0, // the day is complete enough to deposit once its payout is in
            'deposited_on' => $t['deposited_on'], 'deposited_amount' => $dep ? (float) $t['deposited_amount'] : null,
            'changed' => $dep && abs((float) $t['deposited_amount'] - $profit) > 0.005]; // the day was edited after it was deposited
    }
    return $rows;
}

function ta_totals(array $rows): array {
    $t = ['total_earning' => 0.0, 'payout' => 0.0, 'driver_share' => 0.0, 'cng_amount' => 0.0, 'petrol_amount' => 0.0, 'management' => 0.0, 'profit' => 0.0, 'deposited' => 0.0, 'pending' => 0.0, 'pending_days' => 0];
    foreach ($rows as $r) {
        foreach (['total_earning', 'payout', 'driver_share', 'cng_amount', 'petrol_amount', 'management', 'profit'] as $k) $t[$k] += $r[$k];
        if ($r['deposited_on'] !== null) $t['deposited'] += $r['deposited_amount'];
        elseif ($r['ready']) { $t['pending'] += $r['profit']; $t['pending_days']++; } // net of the loss days, so what is deposited always adds up
    }
    return array_map(fn($v) => is_float($v) ? round($v, 2) : $v, $t);
}

// Deposits grouped by the month (and date) they were made on, i.e. the date of the click, not the date of the trip.
function ta_deposits(PDO $pdo, array $car): array {
    $drivers = array_column($pdo->query('SELECT id, name FROM taxi_drivers')->fetchAll(), 'name', 'id');
    $st = $pdo->prepare('SELECT id, trip_date, driver_id, deposited_on, deposited_amount FROM taxi_trips WHERE vehicle_id = ? AND deposited_on IS NOT NULL ORDER BY deposited_on DESC, trip_date');
    $st->execute([(int) $car['id']]);
    $months = [];
    foreach ($st->fetchAll() as $t) {
        $m = substr($t['deposited_on'], 0, 7); $d = $t['deposited_on'];
        $months[$m] ??= ['month' => $m, 'total' => 0.0, 'days' => 0, 'dates' => []];
        $months[$m]['dates'][$d] ??= ['date' => $d, 'total' => 0.0, 'days' => []];
        $amt = (float) $t['deposited_amount'];
        $months[$m]['total'] += $amt; $months[$m]['days']++; $months[$m]['dates'][$d]['total'] += $amt;
        $months[$m]['dates'][$d]['days'][] = ['trip_date' => $t['trip_date'], 'driver_name' => $drivers[(int) $t['driver_id']] ?? '', 'amount' => round($amt, 2)];
    }
    foreach ($months as &$m) {
        $m['total'] = round($m['total'], 2);
        $m['dates'] = array_values(array_map(function ($x) { $x['total'] = round($x['total'], 2); return $x; }, $m['dates']));
    }
    unset($m);
    krsort($months);
    return array_values($months);
}

function ta_due_row(array $r): array {
    return ['id' => (int) $r['id'], 'vehicle_id' => (int) $r['vehicle_id'], 'kind' => $r['kind'], 'description' => $r['description'], 'amount' => (float) $r['amount'], 'due_date' => $r['due_date'],
        'status' => $r['status'], 'asked_on' => $r['asked_on'], 'received_on' => $r['received_on'], 'ref' => $r['ref'], 'note' => $r['note']];
}

function ta_kind_for(string $label): string {
    foreach (['Insurance' => 'Insurance', 'PUC' => 'PUC', 'Fitness' => 'Fitness', 'Road tax' => 'Road tax', 'Permit' => 'Permit', 'Tyre' => 'Tyres', 'Battery' => 'Battery'] as $needle => $kind) if (stripos($label, $needle) !== false) return $kind;
    return preg_match('/service|oil|brake|clutch|cng kit|ac |alignment/i', $label . ' ') ? 'Service' : 'Other';
}

function ta_due_clean(PDO $pdo, array $in): array {
    $car = ta_car($pdo, (int) ($in['vehicle_id'] ?? 0));
    $kind = (string) ($in['kind'] ?? '');
    if (!in_array($kind, TA_DUE_KINDS, true)) fail('Choose what the money is for', 422);
    $amount = $in['amount'] ?? 0;
    if ($amount === '' || $amount === null) $amount = 0;
    if (!is_numeric($amount) || $amount < 0 || $amount > 100000000) fail('Enter a valid amount (0 if it is not known yet)', 422);
    $due = trim((string) ($in['due_date'] ?? ''));
    if ($due !== '' && !cw_valid_date($due)) fail('Enter a valid due date', 422);
    $desc = trim((string) ($in['description'] ?? '')); $note = trim((string) ($in['note'] ?? '')); $ref = trim((string) ($in['ref'] ?? ''));
    if (mb_strlen($desc) > 200) fail('Details are too long (200 characters)', 422);
    if (mb_strlen($note) > 300) fail('Note is too long (300 characters)', 422);
    if (mb_strlen($ref) > 40) fail('Invalid link', 422);
    return [(int) $car['id'], $kind, $desc, round((float) $amount, 2), $due === '' ? null : $due, $ref, $note];
}

function taxi_account_route(string $method, string $path, array $user): void {
    $pdo = db();
    if (!preg_match('#^taxi/(accounts?|dues)(/.*)?$#', $path)) return;
    if ($user['role'] !== 'admin') fail('Not allowed', 403);
    $today = date('Y-m-d');

    // ---- which cars have an account sheet
    if ($method === 'GET' && $path === 'taxi/accounts') {
        $rows = $pdo->query("SELECT id, code, model, account_name, deposit_to FROM taxi_vehicles WHERE account_name <> '' ORDER BY code")->fetchAll();
        json_out(['accounts' => array_map(fn($r) => ['vehicle_id' => (int) $r['id'], 'code' => $r['code'], 'model' => $r['model'], 'account_name' => $r['account_name'], 'deposit_to' => $r['deposit_to']], $rows)]);
    }

    // ---- the sheet
    if ($method === 'GET' && $path === 'taxi/account') {
        $car = ta_car($pdo, (int) ($_GET['vehicle_id'] ?? 0));
        if ($car['account_name'] === '') fail('This car has no account sheet', 404);
        [$from, $to] = taxi_range();
        $rows = ta_rows($pdo, $car, $from, $to);
        $all = ta_totals(ta_rows($pdo, $car, '1900-01-01', '9999-12-31'));
        $dm = ta_deposits($pdo, $car);
        $thisMonth = array_values(array_filter($dm, fn($m) => $m['month'] === substr($today, 0, 7)))[0] ?? ['total' => 0.0, 'days' => 0];
        json_out(['vehicle' => ['id' => (int) $car['id'], 'code' => $car['code'], 'model' => $car['model'], 'account_name' => $car['account_name'], 'deposit_to' => $car['deposit_to'], 'run_day_charge' => (float) $car['run_day_charge']],
            'from' => $from, 'to' => $to, 'rows' => $rows, 'totals' => ta_totals($rows), 'all_time' => $all, 'today' => $today,
            'deposited_this_month' => ['month' => substr($today, 0, 7), 'amount' => $thisMonth['total'], 'days' => $thisMonth['days']]]);
    }

    // ---- everything deposited so far, newest first: by month of the deposit, then by the day it was deposited
    if ($method === 'GET' && $path === 'taxi/account/deposits') {
        $car = ta_car($pdo, (int) ($_GET['vehicle_id'] ?? 0));
        $months = ta_deposits($pdo, $car);
        json_out(['months' => $months, 'total' => round(array_sum(array_column($months, 'total')), 2), 'days' => array_sum(array_column($months, 'days'))]);
    }

    // ---- deposit: stamps each chosen day with the date of the click and remembers the amount that was deposited
    if ($method === 'POST' && $path === 'taxi/account/deposit') {
        $ids = array_values(array_unique(array_map('intval', (array) (body()['trip_ids'] ?? []))));
        if (!$ids) fail('Choose the days to deposit', 422);
        $n = 0; $sum = 0.0;
        foreach ($ids as $id) {
            $st = $pdo->prepare('SELECT * FROM taxi_trips WHERE id = ?'); $st->execute([$id]);
            $t = $st->fetch();
            if (!$t || !$t['vehicle_id'] || $t['deposited_on'] !== null || $t['on_leave']) continue;
            $car = ta_car($pdo, (int) $t['vehicle_id']);
            if ($car['account_name'] === '') continue;
            foreach (ta_rows($pdo, $car, $t['trip_date'], $t['trip_date']) as $r) {
                if ($r['trip_id'] !== $id || !$r['ready']) continue;
                $pdo->prepare('UPDATE taxi_trips SET deposited_on = ?, deposited_amount = ?, deposited_by = ? WHERE id = ?')->execute([$today, $r['profit'], $user['id'], $id]);
                $n++; $sum += $r['profit'];
            }
        }
        if ($n === 0) fail('Nothing to deposit: the day needs its payout entered, and must not be deposited already', 422);
        json_out(['deposited' => $n, 'amount' => round($sum, 2), 'on' => $today]);
    }
    if ($method === 'POST' && $path === 'taxi/account/undeposit') {
        $id = (int) (body()['trip_id'] ?? 0);
        $st = $pdo->prepare('SELECT deposited_on FROM taxi_trips WHERE id = ?'); $st->execute([$id]);
        $r = $st->fetch();
        if (!$r) fail('Entry not found', 404);
        if ($r['deposited_on'] === null) fail('This day is not marked as deposited', 422);
        $pdo->prepare('UPDATE taxi_trips SET deposited_on = NULL, deposited_amount = NULL, deposited_by = NULL WHERE id = ?')->execute([$id]);
        json_out(['ok' => true]);
    }

    // ---- money to ask for
    if ($method === 'GET' && $path === 'taxi/dues') {
        $car = ta_car($pdo, (int) ($_GET['vehicle_id'] ?? 0));
        $st = $pdo->prepare("SELECT * FROM taxi_owner_dues WHERE vehicle_id = ? ORDER BY CASE status WHEN 'Due' THEN 0 WHEN 'Asked' THEN 1 ELSE 2 END, COALESCE(due_date, '9999-12-31'), id");
        $st->execute([(int) $car['id']]);
        $dues = array_map('ta_due_row', $st->fetchAll());
        $sum = fn(string $s) => round(array_sum(array_map(fn($d) => $d['status'] === $s ? $d['amount'] : 0, $dues)), 2);
        $have = array_column($dues, 'ref');
        $upcoming = [];
        foreach (tv_due_items($pdo, (int) $car['id']) as $i) { // what the Vehicles tab says is coming up, so it can be added with one click
            if (!in_array($i['kind'], ['document', 'service'], true)) continue;
            $ref = $i['kind'] . ':' . $i['ref_id'];
            $upcoming[] = ['ref' => $ref, 'label' => $i['label'], 'kind' => ta_kind_for($i['label']), 'due_date' => $i['due_date'], 'days_left' => $i['days_left'], 'km_left' => $i['km_left'], 'status' => $i['status'], 'added' => in_array($ref, $have, true)];
        }
        json_out(['dues' => $dues, 'totals' => ['to_ask' => $sum('Due'), 'asked' => $sum('Asked'), 'received' => $sum('Received'), 'outstanding' => round($sum('Due') + $sum('Asked'), 2)], 'upcoming' => $upcoming, 'kinds' => TA_DUE_KINDS]);
    }
    if ($method === 'POST' && $path === 'taxi/dues') {
        $v = ta_due_clean($pdo, body());
        $pdo->prepare('INSERT INTO taxi_owner_dues (vehicle_id,kind,description,amount,due_date,ref,note,created_by) VALUES (?,?,?,?,?,?,?,?)')->execute([...$v, $user['id']]);
        $st = $pdo->prepare('SELECT * FROM taxi_owner_dues WHERE id = ?'); $st->execute([(int) $pdo->lastInsertId()]);
        json_out(['due' => ta_due_row($st->fetch())], 201);
    }
    if (preg_match('#^taxi/dues/(\d+)(?:/(asked|received|reopen))?$#', $path, $m)) {
        $id = (int) $m[1]; $act = $m[2] ?? '';
        $st = $pdo->prepare('SELECT * FROM taxi_owner_dues WHERE id = ?'); $st->execute([$id]);
        $d = $st->fetch();
        if (!$d) fail('Not found', 404);
        if ($method === 'POST' && $act === 'asked') $pdo->prepare("UPDATE taxi_owner_dues SET status='Asked', asked_on=?, received_on=NULL WHERE id=?")->execute([$today, $id]);
        elseif ($method === 'POST' && $act === 'received') $pdo->prepare("UPDATE taxi_owner_dues SET status='Received', asked_on=COALESCE(asked_on, ?), received_on=? WHERE id=?")->execute([$today, $today, $id]);
        elseif ($method === 'POST' && $act === 'reopen') $pdo->prepare("UPDATE taxi_owner_dues SET status='Due', asked_on=NULL, received_on=NULL WHERE id=?")->execute([$id]);
        elseif ($method === 'PUT' && $act === '') { $v = ta_due_clean($pdo, array_merge(body(), ['vehicle_id' => $d['vehicle_id']])); $pdo->prepare('UPDATE taxi_owner_dues SET kind=?, description=?, amount=?, due_date=?, ref=?, note=? WHERE id=?')->execute([$v[1], $v[2], $v[3], $v[4], $d['ref'] !== '' ? $d['ref'] : $v[5], $v[6], $id]); }
        elseif ($method === 'DELETE' && $act === '') { $pdo->prepare('DELETE FROM taxi_owner_dues WHERE id = ?')->execute([$id]); json_out(['ok' => true]); }
        else fail('Not found', 404);
        $st->execute([$id]);
        json_out(['due' => ta_due_row($st->fetch())]);
    }
    fail('Not found', 404);
}
