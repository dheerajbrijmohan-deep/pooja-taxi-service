<?php
declare(strict_types=1);

// AutoShine membership passes: Full Wash only, price per wash by vehicle type, NOT valid on Saturdays, Sundays and public holidays.

const MEMBERSHIP_PLANS = ['Monthly' => ['washes' => 4, 'days' => 30], 'Quarterly' => ['washes' => 12, 'days' => 90], 'Half-yearly' => ['washes' => 24, 'days' => 180], 'Annual' => ['washes' => 48, 'days' => 365]];
const MEMBERSHIP_RATES = ['Hatchback' => 250, 'Sedan' => 350, 'SUV' => 450]; // per wash
const MEMBERSHIP_MODES = ['Online', 'Cash', 'Credit'];

function mem_valid_date(string $d): bool {
    $dt = DateTimeImmutable::createFromFormat('Y-m-d', $d);
    return $dt !== false && $dt->format('Y-m-d') === $d;
}

// Why a pass cannot be used on $date, or null when the day is fine.
function mem_blocked_reason(PDO $pdo, string $date): ?string {
    $dow = (int) (new DateTimeImmutable($date))->format('N'); // 6 = Saturday, 7 = Sunday
    if ($dow >= 6) return $dow === 6 ? 'Saturday' : 'Sunday';
    $st = $pdo->prepare('SELECT name FROM public_holidays WHERE holiday_date = ?');
    $st->execute([$date]);
    $n = $st->fetchColumn();
    return $n !== false ? "public holiday ($n)" : null;
}

function mem_row(array $r, array $washDates, string $today): array {
    $used = count($washDates);
    $status = $r['status'];
    if ($status === 'Active') {
        if ($r['end_date'] < $today) $status = 'Expired';
        elseif ($used >= (int) $r['washes_total']) $status = 'Used up';
    }
    return [
        'id' => (int) $r['id'], 'pass_no' => $r['pass_no'], 'name' => $r['name'], 'mobile' => $r['mobile'], 'vehicle_number' => $r['vehicle_number'],
        'model' => $r['model'], 'vehicle_type' => $r['vehicle_type'], 'plan' => $r['plan'], 'washes_total' => (int) $r['washes_total'],
        'washes_used' => $used, 'washes_left' => max(0, (int) $r['washes_total'] - $used), 'rate' => (float) $r['rate'], 'amount' => (float) $r['amount'],
        'payment_mode' => $r['payment_mode'], 'sold_on' => $r['sold_on'], 'start_date' => $r['start_date'], 'end_date' => $r['end_date'],
        'status' => $status, 'wash_dates' => $washDates,
    ];
}

function mem_fetch(PDO $pdo, ?int $id = null): array {
    $today = date('Y-m-d');
    $rows = $id === null
        ? $pdo->query('SELECT * FROM carwash_memberships ORDER BY id DESC LIMIT 2000')->fetchAll()
        : (function () use ($pdo, $id) { $st = $pdo->prepare('SELECT * FROM carwash_memberships WHERE id = ?'); $st->execute([$id]); return $st->fetchAll(); })();
    if (!$rows) return [];
    $washes = [];
    foreach ($pdo->query('SELECT membership_id, wash_date FROM carwash_membership_washes ORDER BY wash_date')->fetchAll() as $w) $washes[(int) $w['membership_id']][] = $w['wash_date'];
    return array_map(fn($r) => mem_row($r, $washes[(int) $r['id']] ?? [], $today), $rows);
}

function membership_route(string $method, string $path, array $user): void {
    $pdo = db();
    $admin = $user['role'] === 'admin';
    $today = date('Y-m-d');

    // ---- public holidays
    if ($path === 'carwash/holidays' && $method === 'GET') {
        json_out(['holidays' => $pdo->query('SELECT id, holiday_date, name FROM public_holidays ORDER BY holiday_date')->fetchAll()]);
    }
    if ($path === 'carwash/holidays' && $method === 'POST') {
        if (!$admin) fail('Only the owner can change the holiday list', 403);
        $in = body();
        $d = trim((string) ($in['holiday_date'] ?? ''));
        $n = trim((string) ($in['name'] ?? ''));
        if (!mem_valid_date($d)) fail('Enter a valid date', 422);
        if ($n === '' || mb_strlen($n) > 100) fail('Enter the holiday name', 422);
        $dup = $pdo->prepare('SELECT 1 FROM public_holidays WHERE holiday_date = ?'); $dup->execute([$d]);
        if ($dup->fetch()) fail('That date is already in the list', 409);
        $pdo->prepare('INSERT INTO public_holidays (holiday_date, name) VALUES (?,?)')->execute([$d, $n]);
        json_out(['ok' => true], 201);
    }
    if (preg_match('#^carwash/holidays/(\d+)$#', $path, $m) && $method === 'DELETE') {
        if (!$admin) fail('Only the owner can change the holiday list', 403);
        $pdo->prepare('DELETE FROM public_holidays WHERE id = ?')->execute([(int) $m[1]]);
        json_out(['ok' => true]);
    }

    // ---- passes
    if ($path === 'carwash/memberships' && $method === 'GET') {
        json_out(['memberships' => mem_fetch($pdo), 'today' => $today, 'blocked_today' => mem_blocked_reason($pdo, $today), 'plans' => MEMBERSHIP_PLANS, 'rates' => MEMBERSHIP_RATES]);
    }

    if ($path === 'carwash/memberships' && $method === 'POST') {
        $in = body();
        $name = trim((string) ($in['name'] ?? ''));
        $mobile = preg_replace('/[^0-9+]/', '', (string) ($in['mobile'] ?? ''));
        $vehicle = cw_vehicle((string) ($in['vehicle_number'] ?? ''));
        $model = trim((string) ($in['model'] ?? ''));
        $type = (string) ($in['vehicle_type'] ?? '');
        $plan = (string) ($in['plan'] ?? '');
        $mode = (string) ($in['payment_mode'] ?? '');
        $start = trim((string) ($in['start_date'] ?? $today));
        if ($name === '' || mb_strlen($name) > 100) fail('Enter the customer name', 422);
        if (!preg_match('/^(\+91)?[0-9]{10}$/', $mobile)) fail('Enter a valid 10-digit mobile number', 422);
        if ($vehicle === '' || mb_strlen($vehicle) > 20) fail('Enter the vehicle number', 422);
        if (mb_strlen($model) > 100) fail('Model is too long', 422);
        if (!isset(MEMBERSHIP_RATES[$type])) fail('Choose Hatchback, Sedan or SUV', 422);
        if (!isset(MEMBERSHIP_PLANS[$plan])) fail('Choose the plan', 422);
        if (!in_array($mode, MEMBERSHIP_MODES, true)) fail('Choose Online, Cash or Credit', 422);
        if (!mem_valid_date($start)) fail('Enter a valid start date', 422);
        $washes = MEMBERSHIP_PLANS[$plan]['washes'];
        $rate = MEMBERSHIP_RATES[$type];
        $end = (new DateTimeImmutable($start))->modify('+' . (MEMBERSHIP_PLANS[$plan]['days'] - 1) . ' days')->format('Y-m-d');
        $active = $pdo->prepare("SELECT pass_no FROM carwash_memberships WHERE vehicle_number = ? AND status = 'Active' AND end_date >= ? AND start_date <= ?");
        $active->execute([$vehicle, $start, $end]);
        if ($row = $active->fetch()) fail("This vehicle already has pass {$row['pass_no']} running in those dates", 409);
        $pdo->prepare('INSERT INTO carwash_memberships (name,mobile,vehicle_number,model,vehicle_type,plan,washes_total,rate,amount,payment_mode,sold_on,start_date,end_date,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$name, $mobile, $vehicle, $model, $type, $plan, $washes, $rate, $rate * $washes, $mode, $today, $start, $end, $user['id']]);
        $id = (int) $pdo->lastInsertId();
        $pdo->prepare('UPDATE carwash_memberships SET pass_no = ? WHERE id = ?')->execute([sprintf('AS-%04d', $id), $id]);
        $GLOBALS['notify_text'] = 'sold a membership pass: ' . implode(' · ', array_filter([$name, $vehicle, "$plan $type", '₹' . number_format($rate * $washes, 0) . " $mode"]));
        json_out(['membership' => mem_fetch($pdo, $id)[0]], 201);
    }

    if (preg_match('#^carwash/memberships/(\d+)/wash$#', $path, $m) && $method === 'POST') {
        $id = (int) $m[1];
        $pass = mem_fetch($pdo, $id)[0] ?? null;
        if (!$pass) fail('Pass not found', 404);
        if ($pass['status'] === 'Cancelled') fail('This pass has been cancelled', 409);
        if ($pass['status'] === 'Expired') fail('This pass expired on ' . $pass['end_date'], 409);
        if ($pass['status'] === 'Used up') fail('All washes on this pass are used', 409);
        if ($today < $pass['start_date']) fail('This pass starts on ' . $pass['start_date'], 409);
        if ($why = mem_blocked_reason($pdo, $today)) fail("This pass is not valid on a $why", 409);
        if (in_array($today, $pass['wash_dates'], true)) fail('A wash is already recorded on this pass today', 409);
        if ($pass['payment_mode'] === 'Credit') fail('Payment for this pass is still due (Credit). Record it as received first.', 409);
        $pdo->beginTransaction();
        $pdo->prepare("INSERT INTO carwash_entries (entry_date,name,mobile,address,model,vehicle_number,vehicle_type,service,paid,payment_mode,due_on,created_by) VALUES (?,?,?,'',?,?,'Car','Full Wash',0,'Membership',?,?)")
            ->execute([$today, $pass['name'], $pass['mobile'], $pass['model'], $pass['vehicle_number'], (new DateTimeImmutable($today))->modify('+' . CARWASH_DUE_DAYS . ' days')->format('Y-m-d'), $user['id']]);
        $entryId = (int) $pdo->lastInsertId();
        $pdo->prepare('INSERT INTO carwash_membership_washes (membership_id, wash_date, entry_id, created_by) VALUES (?,?,?,?)')->execute([$id, $today, $entryId, $user['id']]);
        $pdo->commit();
        $after = mem_fetch($pdo, $id)[0];
        $GLOBALS['notify_text'] = 'used a membership wash: ' . implode(' · ', array_filter([$pass['name'], $pass['vehicle_number'], "{$after['washes_left']} left on {$pass['pass_no']}"]));
        json_out(['membership' => $after]);
    }

    if (preg_match('#^carwash/memberships/(\d+)/received$#', $path, $m) && $method === 'POST') {
        $id = (int) $m[1];
        $pass = mem_fetch($pdo, $id)[0] ?? null;
        if (!$pass) fail('Pass not found', 404);
        if ($pass['payment_mode'] !== 'Credit') fail('This pass is not on credit', 409);
        $mode = (string) (body()['payment_mode'] ?? '');
        if (!in_array($mode, ['Online', 'Cash'], true)) fail('Choose Online or Cash to record the payment received', 422);
        $pdo->prepare('UPDATE carwash_memberships SET payment_mode = ? WHERE id = ?')->execute([$mode, $id]);
        $GLOBALS['notify_text'] = 'received the credit payment for pass ' . $pass['pass_no'] . ': ' . implode(' · ', array_filter([$pass['name'], '₹' . number_format($pass['amount'], 0), $mode]));
        json_out(['membership' => mem_fetch($pdo, $id)[0]]);
    }

    if (preg_match('#^carwash/memberships/(\d+)/cancel$#', $path, $m) && $method === 'POST') {
        if (!$admin) fail('Only the owner can cancel a pass', 403);
        $pdo->prepare("UPDATE carwash_memberships SET status = 'Cancelled' WHERE id = ?")->execute([(int) $m[1]]);
        json_out(['membership' => mem_fetch($pdo, (int) $m[1])[0] ?? null]);
    }

    if (preg_match('#^carwash/memberships/(\d+)$#', $path, $m) && $method === 'DELETE') {
        if (!$admin) fail('Only the owner can delete a pass', 403);
        $n = $pdo->prepare('SELECT COUNT(*) FROM carwash_membership_washes WHERE membership_id = ?');
        $n->execute([(int) $m[1]]);
        if ((int) $n->fetchColumn() > 0) fail('Washes are already recorded on this pass. Cancel it instead.', 409);
        $pdo->prepare('DELETE FROM carwash_memberships WHERE id = ?')->execute([(int) $m[1]]);
        json_out(['ok' => true]);
    }

    fail('Not found', 404);
}
