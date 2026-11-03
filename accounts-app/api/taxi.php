<?php
declare(strict_types=1);

// Pooja Taxi Services. Drivers are not on a fixed salary: they earn a share (30%) of each day's total earning. Money the owner
// pays them in advance, damage deducted from their pay, and salary actually paid out are kept as separate ledger rows, so
// "balance due" = earned share - advances - damages - salary paid. Everything derived (share, cash to collect, gain) is
// calculated here, never typed in.

const TAXI_SHIFTS = ['Day', 'Night', 'Mid Night'];
const TAXI_KINDS = ['Advance', 'Damage', 'Salary paid'];

function taxi_num(mixed $v, string $label, float $max = 10000000, bool $nullable = false): ?float {
    if ($nullable && ($v === null || $v === '')) return null;
    if ($v === null || $v === '') return 0.0;
    if (!is_numeric($v) || $v < 0 || $v > $max) fail("Enter a valid $label", 422);
    return round((float) $v, 2);
}

// "Other expenses" of a day: a list of {item, amount} (parking, puncture...). The sheet's Other Expenses figure is their sum.
function taxi_other_items(mixed $items): array {
    if (!is_array($items)) return [[], 0.0];
    if (count($items) > 10) fail('Too many other-expense lines (10 at most)', 422);
    $out = []; $sum = 0.0;
    foreach ($items as $it) {
        $name = trim((string) ($it['item'] ?? ''));
        $amt = $it['amount'] ?? 0;
        if ($amt === '' || $amt === null) $amt = 0;
        if (!is_numeric($amt) || $amt < 0 || $amt > 10000000) fail('Enter a valid amount for the other expense', 422);
        $amt = round((float) $amt, 2);
        if ($amt == 0 && $name === '') continue;
        if (mb_strlen($name) > 60) fail('An expense name is too long (60 characters)', 422);
        $out[] = ['item' => $name !== '' ? $name : 'Other', 'amount' => $amt];
        $sum += $amt;
    }
    return [$out, round($sum, 2)];
}

function taxi_time(mixed $v, string $label): string {
    $v = trim((string) ($v ?? ''));
    if ($v === '') return '';
    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v)) fail("Enter a valid $label", 422);
    return $v;
}

function taxi_vehicle_row(array $r): array {
    return ['id' => (int) $r['id'], 'code' => $r['code'], 'model' => $r['model'], 'emi_per_day' => (float) $r['emi_per_day'], 'run_day_charge' => (float) ($r['run_day_charge'] ?? 0), 'maintenance_per_day' => (float) ($r['maintenance_per_day'] ?? 0), 'active' => (bool) $r['active'],
        'driver_id' => ($r['driver_id'] ?? null) === null ? null : (int) $r['driver_id']];
}

function taxi_driver_row(array $r): array {
    return ['id' => (int) $r['id'], 'name' => $r['name'], 'mobile' => $r['mobile'], 'share_pct' => (float) $r['share_pct'], 'active' => (bool) $r['active']];
}

function taxi_trip_row(array $r, array $advanceOn = []): array {
    $earning = (float) $r['total_earning'];
    $fuel = (float) $r['cng_amount'] + (float) $r['petrol_amount'];
    $share = round($earning * (float) $r['share_pct'] / 100, 2);
    $parking = (float) ($r['parking'] ?? 0);
    $cash = round(max(0, (float) $r['payout'] - ((float) $r['online_transfer'] + $parking)), 2); // cash to collect = payout - (online + parking)
    $received = $cash; // cash received is always the same as cash to collect
    return [
        'id' => (int) $r['id'], 'trip_date' => $r['trip_date'], 'driver_id' => (int) $r['driver_id'], 'vehicle_id' => $r['vehicle_id'] === null ? null : (int) $r['vehicle_id'],
        'shift' => $r['shift'], 'in_time' => $r['in_time'], 'out_time' => $r['out_time'],
        'start_km' => $r['start_km'] === null ? null : (float) $r['start_km'], 'end_km' => $r['end_km'] === null ? null : (float) $r['end_km'],
        'km' => $r['start_km'] !== null && $r['end_km'] !== null ? round((float) $r['end_km'] - (float) $r['start_km'], 1) : 0.0,
        'cng_kg' => (float) $r['cng_kg'], 'cng_amount' => (float) $r['cng_amount'], 'petrol_ltr' => (float) $r['petrol_ltr'], 'petrol_amount' => (float) $r['petrol_amount'],
        'cash_received' => $received,
        'total_earning' => $earning, 'payout' => (float) $r['payout'], 'online_transfer' => (float) $r['online_transfer'], 'supplies' => (float) $r['supplies'], 'parking' => $parking, 'advance' => (float) ($advanceOn[$r['driver_id'] . '|' . $r['trip_date']] ?? 0), 'other_items' => json_decode((string) ($r['other_items'] ?? ''), true) ?: [],
        'share_pct' => (float) $r['share_pct'], 'on_leave' => (bool) $r['on_leave'], 'notes' => $r['notes'],
        // derived
        'cash_to_collect' => $cash, 'fuel' => round($fuel, 2), 'driver_share' => $share,
        'gain' => round((float) $r['payout'] - $fuel - $share - (float) $r['supplies'], 2), // profit = payout - cost

    ];
}

function taxi_ledger_row(array $r): array {
    return ['id' => (int) $r['id'], 'entry_date' => $r['entry_date'], 'driver_id' => (int) $r['driver_id'], 'kind' => $r['kind'], 'amount' => (float) $r['amount'],
        'vehicle_id' => $r['vehicle_id'] === null ? null : (int) $r['vehicle_id'], 'note' => $r['note']];
}

function taxi_advances_by_day(PDO $pdo): array {
    $out = [];
    foreach ($pdo->query("SELECT driver_id, entry_date, SUM(amount) AS s FROM taxi_ledger WHERE kind = 'Advance' GROUP BY driver_id, entry_date")->fetchAll() as $r) $out[$r['driver_id'] . '|' . $r['entry_date']] = (float) $r['s'];
    return $out;
}

// The "Advance paid" box on a day's entry sets that driver's total advance for that day in the ledger (it is deducted on the salary slip).
// Only acts when the entry sends an `advance` value; an unchanged value leaves the ledger alone.
function taxi_set_day_advance(PDO $pdo, int $driverId, string $date, array $in, int $userId): void {
    if (!array_key_exists('advance', $in)) return;
    $amt = $in['advance'];
    if ($amt === '' || $amt === null) $amt = 0;
    if (!is_numeric($amt) || $amt < 0 || $amt > 10000000) fail('Enter a valid advance amount', 422);
    $amt = round((float) $amt, 2);
    $cur = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM taxi_ledger WHERE driver_id = ? AND entry_date = ? AND kind = 'Advance'");
    $cur->execute([$driverId, $date]);
    if (abs((float) $cur->fetchColumn() - $amt) < 0.005) return;
    $pdo->prepare("DELETE FROM taxi_ledger WHERE driver_id = ? AND entry_date = ? AND kind = 'Advance'")->execute([$driverId, $date]);
    if ($amt > 0) $pdo->prepare("INSERT INTO taxi_ledger (entry_date, driver_id, kind, amount, note, created_by) VALUES (?,?,'Advance',?,?,?)")->execute([$date, $driverId, $amt, 'Entered with the day\'s entry', $userId]);
}

// ---- Pooja Taxi expenses, car by car (puncture, servicing, other). They feed the net profit.
const TAXI_EXPENSE_CATEGORIES = ['Puncture', 'Servicing', 'Other'];

function taxi_expense_clean(PDO $pdo, array $in): array {
    $date = trim((string) ($in['expense_date'] ?? ''));
    if (!cw_valid_date($date)) fail('Enter a valid date', 422);
    if ($date > date('Y-m-d')) fail('The date cannot be in the future', 422);
    $v = $pdo->prepare('SELECT 1 FROM taxi_vehicles WHERE id = ?'); $v->execute([(int) ($in['vehicle_id'] ?? 0)]);
    if (!$v->fetch()) fail('Choose the car', 422);
    $cat = (string) ($in['category'] ?? '');
    if (!in_array($cat, TAXI_EXPENSE_CATEGORIES, true)) fail('Choose Puncture, Servicing or Other', 422);
    $item = trim((string) ($in['item'] ?? ''));
    if (mb_strlen($item) > 120) fail('The description is too long (120 characters)', 422);
    if ($cat === 'Other' && $item === '') fail('Say what the expense was', 422);
    $amt = $in['amount'] ?? null;
    if (!is_numeric($amt) || $amt <= 0 || $amt > 10000000) fail('Enter a valid amount', 422);
    return [$date, (int) $in['vehicle_id'], $cat, $item, round((float) $amt, 2)];
}

function taxi_expense_rows(PDO $pdo, string $from, string $to, ?int $vehicleId = null): array {
    $q = 'SELECT e.id, e.expense_date, e.vehicle_id, e.category, e.item, e.amount, v.code AS car_code FROM taxi_expenses e JOIN taxi_vehicles v ON v.id = e.vehicle_id WHERE e.expense_date >= ? AND e.expense_date <= ?';
    $args = [$from, $to];
    if ($vehicleId) { $q .= ' AND e.vehicle_id = ?'; $args[] = $vehicleId; }
    $st = $pdo->prepare($q . ' ORDER BY e.expense_date DESC, e.id DESC'); $st->execute($args);
    return array_map(fn($r) => ['id' => (int) $r['id'], 'date' => $r['expense_date'], 'vehicle_id' => (int) $r['vehicle_id'], 'car_code' => $r['car_code'],
        'category' => $r['category'], 'item' => $r['item'], 'amount' => (float) $r['amount']], $st->fetchAll());
}

// ---- Driver salary slip (Pooja Taxi): one car, one driver, one calendar month (1st to last day), paid on the 3rd of the next month.
//   driver earning = the driver's share (30%) of each worked day's total earning
//   net payable    = driver earning - advances paid in the month
// Saved slips keep a copy of this whole array, so later changes to entries or driver details never alter them.
function taxi_salary_slip_data(PDO $pdo, int $driverId, int $vehicleId, string $month): array {
    $dq = $pdo->prepare('SELECT * FROM taxi_drivers WHERE id = ?'); $dq->execute([$driverId]); $d = $dq->fetch();
    if (!$d) fail('Choose the driver', 422);
    $cq = $pdo->prepare('SELECT * FROM taxi_vehicles WHERE id = ?'); $cq->execute([$vehicleId]); $car = $cq->fetch();
    if (!$car) fail('Choose the car', 422);
    [$from, $to] = taxi_month_bounds($month);
    $sheet = taxi_sheet($pdo, $car, $from, $to);
    $lq = $pdo->prepare("SELECT entry_date, amount, note FROM taxi_ledger WHERE driver_id = ? AND kind = 'Advance' AND entry_date >= ? AND entry_date <= ? ORDER BY entry_date, id");
    $lq->execute([$driverId, $from, $to]);
    $advances = array_map(fn($l) => ['date' => $l['entry_date'], 'amount' => (float) $l['amount'], 'note' => (string) $l['note']], $lq->fetchAll());
    $advOn = [];
    foreach ($advances as $a) $advOn[$a['date']] = ($advOn[$a['date']] ?? 0) + $a['amount'];
    $days = []; $earning = 0.0; $share = 0.0; $worked = 0; $leave = 0;
    foreach ($sheet['rows'] as $r) {
        if (!$r['trip_id'] || (int) $r['driver_id'] !== $driverId) continue;
        $row = ['date' => $r['date'], 'day' => date('D', strtotime($r['date'])), 'status' => $r['on_leave'] ? 'Leave' : 'Worked',
                'total_earning' => $r['on_leave'] ? null : (float) $r['total_earning'], 'driver_earning' => $r['on_leave'] ? null : (float) $r['driver_share'],
                'advance' => isset($advOn[$r['date']]) ? round($advOn[$r['date']], 2) : null];
        if ($r['on_leave']) { $leave++; } else { $worked++; $earning += (float) $r['total_earning']; $share += (float) $r['driver_share']; }
        $days[] = $row;
    }
    $advTotal = round(array_sum(array_column($advances, 'amount')), 2);
    $share = round($share, 2);
    return [
        'driver' => ['id' => (int) $d['id'], 'name' => $d['name'], 'mobile' => (string) $d['mobile'], 'share_pct' => (float) $d['share_pct'],
                     'employee_id' => (string) ($d['employee_id'] ?? ''), 'join_date' => $d['join_date'],
                     'bank_name' => (string) ($d['bank_name'] ?? ''), 'bank_account' => (string) ($d['bank_account'] ?? ''), 'ifsc' => (string) ($d['ifsc'] ?? '')],
        'car' => ['id' => (int) $car['id'], 'code' => $car['code'], 'model' => $car['model']],
        'month' => $month, 'from' => $from, 'to' => $to,
        'pay_day' => (new DateTimeImmutable("$month-01", new DateTimeZone('UTC')))->modify('+1 month')->format('Y-m-') . '03',
        'days_worked' => $worked, 'leave_days' => $leave,
        'earning' => round($earning, 2), 'driver_earning' => $share, 'advances_total' => $advTotal, 'net_payable' => round($share - $advTotal, 2),
        'advances' => $advances, 'days' => $days,
    ];
}

function taxi_trip_clean(PDO $pdo, array $in): array {
    $date = trim((string) ($in['trip_date'] ?? ''));
    if (!cw_valid_date($date)) fail('Enter a valid date', 422);
    if ($date > date('Y-m-d')) fail('The date cannot be in the future', 422);
    $driver = $pdo->prepare('SELECT * FROM taxi_drivers WHERE id = ?');
    $driver->execute([(int) ($in['driver_id'] ?? 0)]);
    $d = $driver->fetch();
    if (!$d) fail('Choose the driver', 422);
    $leave = !empty($in['on_leave']);
    $vehicleId = ($in['vehicle_id'] ?? '') === '' || ($in['vehicle_id'] ?? null) === null ? null : (int) $in['vehicle_id'];
    if ($vehicleId !== null) {
        $v = $pdo->prepare('SELECT id FROM taxi_vehicles WHERE id = ?');
        $v->execute([$vehicleId]);
        if (!$v->fetch()) fail('Choose a valid vehicle', 422);
    }
    if (!$leave && $vehicleId === null) fail('Choose the vehicle', 422);
    $shift = (string) ($in['shift'] ?? 'Day');
    if (!in_array($shift, TAXI_SHIFTS, true)) fail('Choose Day, Night or Mid Night', 422);
    $notes = trim((string) ($in['notes'] ?? ''));
    if (mb_strlen($notes) > 500) fail('Notes are too long (500 characters)', 422);
    $start = taxi_num($in['start_km'] ?? null, 'start reading', 100000000, true);
    $end = taxi_num($in['end_km'] ?? null, 'end reading', 100000000, true);
    if ($start !== null && $end !== null && $end < $start) fail('End reading cannot be less than the start reading', 422);
    $earning = taxi_num($in['total_earning'] ?? 0, 'total earning');
    $payout = taxi_num($in['payout'] ?? 0, 'payout');
    $online = taxi_num($in['online_transfer'] ?? 0, 'online transfer');
    $parking = taxi_num($in['parking'] ?? 0, 'parking');
    if ($payout > 0 && $online + $parking > $payout) fail('Online transfer plus parking cannot be more than the payout', 422); // payout may still be empty while the day is being filled in
    $received = null; // cash received is not typed in: it always equals cash to collect
    if ($leave) { // a leave day has no run, earning or fuel
        return [$date, (int) $d['id'], $vehicleId, $shift, '', '', null, null, 0, 0, 0, 0, 0, 0, 0, 0, '', (float) $d['share_pct'], null, 1, $notes, 0.0];
    }
    // other expenses: a list of items, or (older callers) a single amount
    if (array_key_exists('other_items', $in)) { [$items, $suppliesTotal] = taxi_other_items($in['other_items']); }
    else { $items = []; $suppliesTotal = taxi_num($in['supplies'] ?? 0, 'other expenses'); }
    return [$date, (int) $d['id'], $vehicleId, $shift, taxi_time($in['in_time'] ?? '', 'in time'), taxi_time($in['out_time'] ?? '', 'out time'), $start, $end,
        taxi_num($in['cng_kg'] ?? 0, 'CNG quantity', 1000), taxi_num($in['cng_amount'] ?? 0, 'CNG amount'), taxi_num($in['petrol_ltr'] ?? 0, 'petrol litres', 1000), taxi_num($in['petrol_amount'] ?? 0, 'petrol amount'),
        $earning, $payout, $online, $suppliesTotal, $items ? json_encode($items, JSON_UNESCAPED_UNICODE) : '', (float) $d['share_pct'], $received, 0, $notes, $parking];
}

// ?from=&to= (reports) or ?month= (dashboard)
function taxi_range(): array {
    $f = (string) ($_GET['from'] ?? ''); $t = (string) ($_GET['to'] ?? '');
    if ($f !== '' || $t !== '') {
        if (!cw_valid_date($f) || !cw_valid_date($t) || $t < $f) fail('Enter a valid date range', 422);
        return [$f, $t];
    }
    return ($_GET['month'] ?? '') === 'all' ? ['0000-01-01', '9999-12-31'] : taxi_month_bounds((string) ($_GET['month'] ?? date('Y-m')));
}

function taxi_month_bounds(string $month): array {
    if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) fail('Choose a valid month', 422);
    return [$month . '-01', date('Y-m-t', strtotime($month . '-01'))];
}

function taxi_summary(PDO $pdo, string $month): array {
    [$from, $to] = taxi_month_bounds($month);
    $advOn = taxi_advances_by_day($pdo);
    $st = $pdo->prepare('SELECT * FROM taxi_trips WHERE trip_date >= ? AND trip_date <= ? ORDER BY trip_date, id');
    $st->execute([$from, $to]);
    $trips = array_map(fn($r) => taxi_trip_row($r, $advOn), $st->fetchAll());

    $today = date('Y-m-d');
    $elapsed = $today < $from ? 0 : ($today > $to ? (int) date('t', strtotime($from)) : (int) date('j'));

    $vehicles = [];
    foreach ($pdo->query('SELECT * FROM taxi_vehicles ORDER BY code')->fetchAll() as $v) {
        $vehicles[(int) $v['id']] = ['id' => (int) $v['id'], 'code' => $v['code'], 'model' => $v['model'], 'active' => (bool) $v['active'], 'emi_per_day' => (float) $v['emi_per_day'], 'cost_mode' => $v['cost_mode'] ?? 'full', 'run_day_charge' => (float) $v['run_day_charge'], 'maintenance_per_day' => (float) $v['maintenance_per_day'], 'maintenance' => round((float) $v['maintenance_per_day'] * $elapsed, 2), 'run_dates' => [], 'charge' => 0.0,
            'days_run' => 0, 'km' => 0.0, 'payout' => 0.0, 'earning' => 0.0, 'fuel' => 0.0, 'supplies' => 0.0, 'share' => 0.0, 'emi' => round((float) $v['emi_per_day'] * $elapsed, 2)];
    }
    $drivers = [];
    foreach ($pdo->query('SELECT * FROM taxi_drivers ORDER BY name')->fetchAll() as $d) {
        $drivers[(int) $d['id']] = ['id' => (int) $d['id'], 'name' => $d['name'], 'active' => (bool) $d['active'], 'share_pct' => (float) $d['share_pct'],
            'days_worked' => 0, 'leave_days' => 0, 'earning' => 0.0, 'share' => 0.0, 'advances' => 0.0, 'damages' => 0.0, 'paid' => 0.0, 'earned_total' => 0.0, 'balance' => 0.0];
    }
    $daily = [];
    $tot = ['earning' => 0.0, 'fuel' => 0.0, 'supplies' => 0.0, 'share' => 0.0, 'km' => 0.0, 'cash_to_collect' => 0.0, 'days' => 0];
    foreach ($trips as $t) {
        if ($t['on_leave']) { if (isset($drivers[$t['driver_id']])) $drivers[$t['driver_id']]['leave_days']++; continue; }
        $tot['earning'] += $t['total_earning']; $tot['fuel'] += $t['fuel']; $tot['supplies'] += $t['supplies']; $tot['share'] += $t['driver_share'];
        $tot['km'] += $t['km']; $tot['cash_to_collect'] += $t['cash_to_collect']; $tot['days']++;
        $daily[$t['trip_date']] = ($daily[$t['trip_date']] ?? 0) + $t['total_earning'];
        if ($t['vehicle_id'] !== null && isset($vehicles[$t['vehicle_id']])) {
            $v = &$vehicles[$t['vehicle_id']];
            $v['days_run']++; $v['run_dates'][$t['trip_date']] = 1; $v['km'] += $t['km']; $v['earning'] += $t['total_earning']; $v['payout'] += $t['payout']; $v['fuel'] += $t['fuel']; $v['supplies'] += $t['supplies']; $v['share'] += $t['driver_share'];
            unset($v);
        }
        if (isset($drivers[$t['driver_id']])) { $dr = &$drivers[$t['driver_id']]; $dr['days_worked']++; $dr['earning'] += $t['total_earning']; $dr['share'] += $t['driver_share']; unset($dr); }
    }
    // ledger: this month for the month figures, everything for the running balance
    foreach ($pdo->query('SELECT driver_id, kind, entry_date, amount FROM taxi_ledger')->fetchAll() as $l) {
        if (!isset($drivers[(int) $l['driver_id']])) continue;
        $dr = &$drivers[(int) $l['driver_id']];
        $key = ['Advance' => 'advances', 'Damage' => 'damages', 'Salary paid' => 'paid'][$l['kind']] ?? null;
        if ($key) {
            $dr['all_' . $key] = ($dr['all_' . $key] ?? 0) + (float) $l['amount'];
            if ($l['entry_date'] >= $from && $l['entry_date'] <= $to) $dr[$key] += (float) $l['amount'];
        }
        unset($dr);
    }
    foreach ($pdo->query('SELECT driver_id, trip_date, total_earning, share_pct FROM taxi_trips WHERE on_leave = 0')->fetchAll() as $r) {
        if (isset($drivers[(int) $r['driver_id']])) $drivers[(int) $r['driver_id']]['earned_total'] += round((float) $r['total_earning'] * (float) $r['share_pct'] / 100, 2);
    }
    foreach ($drivers as &$dr) {
        $dr['balance'] = round($dr['earned_total'] - ($dr['all_advances'] ?? 0) - ($dr['all_damages'] ?? 0) - ($dr['all_paid'] ?? 0), 2);
        foreach (['earning', 'share', 'advances', 'damages', 'paid', 'earned_total'] as $k) $dr[$k] = round($dr[$k], 2);
        unset($dr['all_advances'], $dr['all_damages'], $dr['all_paid']);
    }
    unset($dr);
    $exSupp = 0.0;
    foreach ($vehicles as &$v) {
        foreach (['km', 'earning', 'fuel', 'supplies', 'share'] as $k) $v[$k] = round($v[$k], 2);
        $v['charge'] = round($v['run_day_charge'] * count($v['run_dates']), 2); // the fixed charge applies once for every day the car ran
        if ($v['cost_mode'] === 'fuel_share') { // this car's cost is only CNG + petrol + driver earning
            $exSupp += $v['supplies']; $v['supplies'] = 0.0; $v['emi'] = 0.0; $v['charge'] = 0.0; $v['maintenance'] = 0.0;
        }
        unset($v['run_dates']);
        $v['gain'] = round($v['payout'] - $v['fuel'] - $v['supplies'] - $v['share'] - $v['emi'] - $v['charge'] - $v['maintenance'], 2);
        $v['per_km'] = $v['km'] > 0 ? round($v['earning'] / $v['km'], 2) : 0;
    }
    unset($v);
    $tot['supplies'] -= $exSupp;
    $emi = array_sum(array_column($vehicles, 'emi'));
    $charge = array_sum(array_column($vehicles, 'charge'));
    $maint = array_sum(array_column($vehicles, 'maintenance'));
    foreach (['earning', 'fuel', 'supplies', 'share', 'km', 'cash_to_collect'] as $k) $tot[$k] = round($tot[$k], 2);
    $tot['emi'] = round($emi, 2);
    $tot['charge'] = round($charge, 2);
    $tot['maintenance'] = round($maint, 2);
    $tot['gain'] = round(array_sum(array_column($vehicles, 'payout')) - $tot['fuel'] - $tot['supplies'] - $tot['share'] - $emi - $charge - $maint, 2);
    $series = [];
    for ($d = $from; $d <= $to; $d = date('Y-m-d', strtotime("$d +1 day"))) $series[] = ['date' => $d, 'earning' => round($daily[$d] ?? 0, 2)];
    return ['month' => $month, 'today' => $today, 'totals' => $tot, 'vehicles' => array_values($vehicles), 'drivers' => array_values($drivers), 'daily' => $series];
}

// Monthly taxi money for the Investments ROI: income = total earning; operating cost = fuel + supplies + driver share (EMI is loan repayment, not an operating cost)
function taxi_income_by_month(PDO $pdo): array {
    return array_map('floatval', array_column($pdo->query('SELECT SUBSTR(trip_date,1,7) AS m, SUM(total_earning) AS v FROM taxi_trips WHERE on_leave = 0 GROUP BY SUBSTR(trip_date,1,7)')->fetchAll(), 'v', 'm'));
}

function taxi_opex_by_month(PDO $pdo): array {
    $out = array_map('floatval', array_column($pdo->query('SELECT SUBSTR(trip_date,1,7) AS m, SUM(cng_amount + petrol_amount + supplies + total_earning * share_pct / 100) AS v FROM taxi_trips WHERE on_leave = 0 GROUP BY SUBSTR(trip_date,1,7)')->fetchAll(), 'v', 'm'));
    // each car's fixed charge once for every day it ran
    $q = 'SELECT SUBSTR(d.trip_date,1,7) AS m, SUM(d.charge) AS v FROM (SELECT DISTINCT t.vehicle_id, t.trip_date, v.run_day_charge AS charge FROM taxi_trips t JOIN taxi_vehicles v ON v.id = t.vehicle_id WHERE t.on_leave = 0) d GROUP BY SUBSTR(d.trip_date,1,7)';
    foreach ($pdo->query($q)->fetchAll() as $r) $out[$r['m']] = ($out[$r['m']] ?? 0) + (float) $r['v'];
    // daily maintenance (every day, from the car's first entry to today), like the EMI days but a running cost
    $today = date('Y-m-d');
    foreach ($pdo->query('SELECT v.maintenance_per_day AS per, MIN(t.trip_date) AS first FROM taxi_vehicles v JOIN taxi_trips t ON t.vehicle_id = v.id WHERE v.maintenance_per_day > 0 GROUP BY v.id')->fetchAll() as $r) {
        for ($d = $r['first']; $d <= $today; $d = date('Y-m-d', strtotime("$d +1 day"))) $out[substr($d, 0, 7)] = ($out[substr($d, 0, 7)] ?? 0) + (float) $r['per'];
    }
    return $out;
}

function taxi_route(string $method, string $path, array $user): void {
    $pdo = db();
    $admin = $user['role'] === 'admin';

    taxi_account_route($method, $path, $user);         // owner's account sheet, deposits and money-to-ask-for (admin only); returns if the path is not theirs
    taxi_driver_records_route($method, $path, $user);  // driver profiles and documents (owner only); returns if the path is not theirs
    taxi_vehicle_records_route($method, $path, $user); // documents, services, accidents, due items, earnings sheet; returns if the path is not theirs

    // ---------------------------------------------------------------- vehicles & drivers (owner sets these up)
    if ($path === 'taxi/vehicles' && $method === 'GET') json_out(['vehicles' => array_map('taxi_vehicle_row', $pdo->query('SELECT * FROM taxi_vehicles ORDER BY code')->fetchAll())]);
    if ($path === 'taxi/drivers' && $method === 'GET') json_out(['drivers' => array_map('taxi_driver_row', $pdo->query('SELECT * FROM taxi_drivers ORDER BY name')->fetchAll())]);

    if (in_array($path, ['taxi/vehicles', 'taxi/drivers'], true) || preg_match('#^taxi/(vehicles|drivers)/(\d+)$#', $path)) {
        if (!$admin) fail('Not allowed', 403);
        $b = body();
        if ($path === 'taxi/vehicles' || str_starts_with($path, 'taxi/vehicles/')) {
            $code = strtoupper(preg_replace('/\s+/', '', (string) ($b['code'] ?? '')));
            $model = trim((string) ($b['model'] ?? ''));
            if ($method !== 'DELETE') {
                if ($code === '' || mb_strlen($code) > 20) fail('Enter the vehicle number', 422);
                if (mb_strlen($model) > 100) fail('Model is too long', 422);
                $emi = taxi_num($b['emi_per_day'] ?? 0, 'EMI per day', 1000000);
                $runCharge = taxi_num($b['run_day_charge'] ?? 0, 'managing & maintenance per running day', 1000000);
                $maintDay = taxi_num($b['maintenance_per_day'] ?? 0, 'maintenance per day', 1000000);
                $assigned = ($b['driver_id'] ?? '') === '' || ($b['driver_id'] ?? null) === null ? null : (int) $b['driver_id'];
                if ($assigned !== null) { $dq = $pdo->prepare('SELECT 1 FROM taxi_drivers WHERE id = ?'); $dq->execute([$assigned]); if (!$dq->fetch()) fail('Choose a valid driver', 422); }
            }
            if ($method === 'POST') {
                $dup = $pdo->prepare('SELECT 1 FROM taxi_vehicles WHERE code = ?'); $dup->execute([$code]);
                if ($dup->fetch()) fail('That vehicle is already added', 409);
                $pdo->prepare('INSERT INTO taxi_vehicles (code, model, emi_per_day, run_day_charge, maintenance_per_day, active, driver_id) VALUES (?,?,?,?,?,1,?)')->execute([$code, $model, $emi, $runCharge, $maintDay, $assigned]);
                $st = $pdo->prepare('SELECT * FROM taxi_vehicles WHERE id = ?'); $st->execute([(int) $pdo->lastInsertId()]);
                json_out(['vehicle' => taxi_vehicle_row($st->fetch())], 201);
            }
            if (preg_match('#^taxi/vehicles/(\d+)$#', $path, $m)) {
                $id = (int) $m[1];
                $st = $pdo->prepare('SELECT * FROM taxi_vehicles WHERE id = ?'); $st->execute([$id]);
                if (!$st->fetch()) fail('Vehicle not found', 404);
                if ($method === 'PUT') {
                    $dup = $pdo->prepare('SELECT 1 FROM taxi_vehicles WHERE code = ? AND id <> ?'); $dup->execute([$code, $id]);
                    if ($dup->fetch()) fail('That vehicle is already added', 409);
                    $pdo->prepare('UPDATE taxi_vehicles SET code=?, model=?, emi_per_day=?, run_day_charge=?, maintenance_per_day=?, active=?, driver_id=? WHERE id=?')->execute([$code, $model, $emi, $runCharge, $maintDay, !empty($b['active']) ? 1 : 0, $assigned, $id]);
                    $st->execute([$id]);
                    json_out(['vehicle' => taxi_vehicle_row($st->fetch())]);
                }
                if ($method === 'DELETE') {
                    foreach (['taxi_trips', 'taxi_vehicle_documents', 'taxi_vehicle_services', 'taxi_vehicle_accidents'] as $tbl) {
                        $use = $pdo->prepare("SELECT 1 FROM $tbl WHERE vehicle_id = ? LIMIT 1"); $use->execute([$id]);
                        if ($use->fetch()) fail('This vehicle has records (trips, documents, services or accidents). Mark it inactive instead.', 409);
                    }
                    $pdo->prepare('DELETE FROM taxi_vehicles WHERE id = ?')->execute([$id]);
                    json_out(['ok' => true]);
                }
            }
        } else {
            $name = trim((string) ($b['name'] ?? ''));
            $mobile = preg_replace('/[^0-9+]/', '', (string) ($b['mobile'] ?? ''));
            if ($method !== 'DELETE') {
                if ($name === '' || mb_strlen($name) > 100) fail('Enter the driver name', 422);
                if (mb_strlen($mobile) > 20) fail('Mobile number is too long', 422);
                $pct = $b['share_pct'] ?? 30;
                if (!is_numeric($pct) || $pct < 0 || $pct > 100) fail('Share must be between 0 and 100', 422);
            }
            if ($method === 'POST') {
                $pdo->prepare('INSERT INTO taxi_drivers (name, mobile, share_pct, active) VALUES (?,?,?,1)')->execute([$name, $mobile, round((float) $pct, 2)]);
                $st = $pdo->prepare('SELECT * FROM taxi_drivers WHERE id = ?'); $st->execute([(int) $pdo->lastInsertId()]);
                json_out(['driver' => taxi_driver_row($st->fetch())], 201);
            }
            if (preg_match('#^taxi/drivers/(\d+)$#', $path, $m)) {
                $id = (int) $m[1];
                $st = $pdo->prepare('SELECT * FROM taxi_drivers WHERE id = ?'); $st->execute([$id]);
                if (!$st->fetch()) fail('Driver not found', 404);
                if ($method === 'PUT') { // past trips keep the share they were recorded with; the new share applies to new trips
                    $pdo->prepare('UPDATE taxi_drivers SET name=?, mobile=?, share_pct=?, active=? WHERE id=?')->execute([$name, $mobile, round((float) $pct, 2), !empty($b['active']) ? 1 : 0, $id]);
                    $st->execute([$id]);
                    json_out(['driver' => taxi_driver_row($st->fetch())]);
                }
                if ($method === 'DELETE') {
                    $u1 = $pdo->prepare('SELECT 1 FROM taxi_trips WHERE driver_id = ? LIMIT 1'); $u1->execute([$id]);
                    $u2 = $pdo->prepare('SELECT 1 FROM taxi_ledger WHERE driver_id = ? LIMIT 1'); $u2->execute([$id]);
                    $pdo->prepare('UPDATE taxi_vehicles SET driver_id = NULL WHERE driver_id = ?')->execute([$id]);
                    if ($u1->fetch() || $u2->fetch()) { // their past entries and payments stay; they simply leave the driver lists
                        $pdo->prepare('UPDATE taxi_drivers SET active = 0 WHERE id = ?')->execute([$id]);
                        json_out(['ok' => true, 'deactivated' => true]);
                    }
                    td_purge($pdo, $id);
                    $pdo->prepare('DELETE FROM taxi_drivers WHERE id = ?')->execute([$id]);
                    json_out(['ok' => true, 'deactivated' => false]);
                }
            }
        }
    }

    // ---------------------------------------------------------------- daily trips
    if ($method === 'GET' && $path === 'taxi/summary') json_out(taxi_summary($pdo, (string) ($_GET['month'] ?? date('Y-m'))));
    if ($method === 'GET' && $path === 'taxi/other-items') { // expense names used before, most used first, for the dropdown
        $count = [];
        foreach ($pdo->query("SELECT other_items FROM taxi_trips WHERE other_items IS NOT NULL AND other_items <> ''")->fetchAll() as $r)
            foreach (json_decode($r['other_items'], true) ?: [] as $it) if (($it['item'] ?? '') !== '') $count[$it['item']] = ($count[$it['item']] ?? 0) + 1;
        arsort($count);
        json_out(['items' => array_keys($count)]);
    }
    if ($method === 'GET' && $path === 'taxi/trips') {
        [$from, $to] = taxi_range();
        $st = $pdo->prepare('SELECT * FROM taxi_trips WHERE trip_date >= ? AND trip_date <= ? ORDER BY trip_date DESC, id DESC');
        $st->execute([$from, $to]);
        $adv = taxi_advances_by_day($pdo);
        json_out(['trips' => array_map(fn($r) => taxi_trip_row($r, $adv), $st->fetchAll())]);
    }
    $cols = 'trip_date,driver_id,vehicle_id,shift,in_time,out_time,start_km,end_km,cng_kg,cng_amount,petrol_ltr,petrol_amount,total_earning,payout,online_transfer,supplies,other_items,share_pct,cash_received,on_leave,notes,parking';
    if ($method === 'POST' && $path === 'taxi/trips') {
        $b = body();
        $v = taxi_trip_clean($pdo, $b);
        $dup = $pdo->prepare('SELECT 1 FROM taxi_trips WHERE driver_id = ? AND trip_date = ?'); $dup->execute([$v[1], $v[0]]);
        if ($dup->fetch()) fail('This driver already has an entry for that day. Edit it instead.', 409);
        $pdo->prepare("INSERT INTO taxi_trips ($cols,created_by) VALUES (" . implode(',', array_fill(0, 23, '?')) . ')')->execute([...$v, $user['id']]);
        $newId = (int) $pdo->lastInsertId();
        taxi_set_day_advance($pdo, (int) $v[1], $v[0], $b, (int) $user['id']);
        $st = $pdo->prepare('SELECT * FROM taxi_trips WHERE id = ?'); $st->execute([$newId]);
        json_out(['trip' => taxi_trip_row($st->fetch(), taxi_advances_by_day($pdo))], 201);
    }
    if (preg_match('#^taxi/trips/(\d+)$#', $path, $m)) {
        $id = (int) $m[1];
        $st = $pdo->prepare('SELECT * FROM taxi_trips WHERE id = ?'); $st->execute([$id]);
        if (!$st->fetch()) fail('Entry not found', 404);
        if ($method === 'PUT') {
            if (!$admin) fail('Only the admin can edit an entry', 403);
            $b = body();
            $v = taxi_trip_clean($pdo, $b);
            $dup = $pdo->prepare('SELECT 1 FROM taxi_trips WHERE driver_id = ? AND trip_date = ? AND id <> ?'); $dup->execute([$v[1], $v[0], $id]);
            if ($dup->fetch()) fail('This driver already has an entry for that day.', 409);
            $set = implode(',', array_map(fn($c) => "$c=?", explode(',', $cols)));
            $pdo->prepare("UPDATE taxi_trips SET $set WHERE id=?")->execute([...$v, $id]);
            taxi_set_day_advance($pdo, (int) $v[1], $v[0], $b, (int) $user['id']);
            $st->execute([$id]);
            json_out(['trip' => taxi_trip_row($st->fetch(), taxi_advances_by_day($pdo))]);
        }
        if ($method === 'DELETE') {
            if (!$admin) fail('Not allowed', 403);
            $pdo->prepare('DELETE FROM taxi_trips WHERE id = ?')->execute([$id]);
            json_out(['ok' => true]);
        }
    }

    // ---------------------------------------------------------------- car-wise expenses: view and add (owner and manager); change or remove (owner)
    if ($path === 'taxi/expenses' && $method === 'GET') {
        [$from, $to] = taxi_month_bounds((string) ($_GET['month'] ?? date('Y-m')));
        $rows = taxi_expense_rows($pdo, $from, $to, ((int) ($_GET['vehicle_id'] ?? 0)) ?: null);
        json_out(['month' => substr($from, 0, 7), 'expenses' => $rows, 'categories' => TAXI_EXPENSE_CATEGORIES, 'total' => round(array_sum(array_column($rows, 'amount')), 2)]);
    }
    if ($path === 'taxi/expenses' && $method === 'POST') {
        $v = taxi_expense_clean($pdo, body());
        $pdo->prepare('INSERT INTO taxi_expenses (expense_date, vehicle_id, category, item, amount, created_by) VALUES (?,?,?,?,?,?)')->execute([...$v, $user['id']]);
        json_out(['id' => (int) $pdo->lastInsertId()], 201);
    }
    if (preg_match('#^taxi/expenses/(\d+)$#', $path, $m) && in_array($method, ['PUT', 'DELETE'], true)) {
        if (!$admin) fail('Only the admin can change or remove an expense', 403);
        $st = $pdo->prepare('SELECT 1 FROM taxi_expenses WHERE id = ?'); $st->execute([(int) $m[1]]);
        if (!$st->fetch()) fail('Expense not found', 404);
        if ($method === 'DELETE') { $pdo->prepare('DELETE FROM taxi_expenses WHERE id = ?')->execute([(int) $m[1]]); json_out(['ok' => true]); }
        $v = taxi_expense_clean($pdo, body());
        $pdo->prepare('UPDATE taxi_expenses SET expense_date=?, vehicle_id=?, category=?, item=?, amount=? WHERE id=?')->execute([...$v, (int) $m[1]]);
        json_out(['ok' => true]);
    }

    // ---------------------------------------------------------------- net profit for the month (owner only)
    //   net profit = profit of all cars (payout - cost, as on each car's sheet) - Pooja Taxi expenses of the month
    if ($path === 'taxi/net-profit' && $method === 'GET') {
        if (!$admin) fail('Not allowed', 403);
        [$from, $to] = taxi_month_bounds((string) ($_GET['month'] ?? date('Y-m')));
        $cars = []; $carsProfit = 0.0;
        foreach ($pdo->query('SELECT * FROM taxi_vehicles ORDER BY code')->fetchAll() as $car) {
            $sh = taxi_sheet($pdo, $car, $from, $to);
            $t = $sh['totals'];
            $cars[] = ['id' => (int) $car['id'], 'code' => $car['code'], 'model' => $car['model'], 'driver' => $sh['vehicle']['driver_name'],
                'days_run' => count(array_filter($sh['rows'], fn($r) => $r['trip_id'] && !$r['on_leave'])),
                'total_earning' => (float) $t['total_earning'], 'payout' => (float) $t['payout'], 'cost' => (float) $t['cost'], 'profit' => (float) $t['gain']];
            $carsProfit += (float) $t['gain'];
        }
        $exp = taxi_expense_rows($pdo, $from, $to);
        $expTotal = round(array_sum(array_column($exp, 'amount')), 2);
        $byCar = []; $byCat = array_fill_keys(TAXI_EXPENSE_CATEGORIES, 0.0);
        foreach ($exp as $e) { $byCar[$e['vehicle_id']] = ($byCar[$e['vehicle_id']] ?? 0) + $e['amount']; $byCat[$e['category']] += $e['amount']; }
        foreach ($cars as &$c) { $c['expenses'] = round($byCar[$c['id']] ?? 0, 2); $c['net_profit'] = round($c['profit'] - $c['expenses'], 2); }
        unset($c);
        json_out(['month' => substr($from, 0, 7), 'from' => $from, 'to' => $to, 'cars' => $cars, 'expenses' => $exp, 'by_category' => array_map(fn($v) => round($v, 2), $byCat),
            'cars_profit' => round($carsProfit, 2), 'expenses_total' => $expTotal, 'net_profit' => round($carsProfit - $expTotal, 2)]);
    }

    // ---------------------------------------------------------------- driver salary slips (owner only): preview, generate & save, saved list
    if ($path === 'taxi/salary-slip' && $method === 'GET') { // live preview, nothing saved
        if (!$admin) fail('Not allowed', 403);
        json_out(['slip' => taxi_salary_slip_data($pdo, (int) ($_GET['driver_id'] ?? 0), (int) ($_GET['vehicle_id'] ?? 0), (string) ($_GET['month'] ?? ''))]);
    }
    if ($path === 'taxi/salary-slips' && $method === 'GET') {
        if (!$admin) fail('Not allowed', 403);
        $q = 'SELECT s.id, s.driver_id, s.vehicle_id, s.month, s.net_payable, s.generated_at, d.name AS driver_name, v.code AS car_code
              FROM taxi_salary_slips s JOIN taxi_drivers d ON d.id = s.driver_id JOIN taxi_vehicles v ON v.id = s.vehicle_id';
        $args = [];
        if ((int) ($_GET['driver_id'] ?? 0) > 0) { $q .= ' WHERE s.driver_id = ?'; $args[] = (int) $_GET['driver_id']; }
        $st = $pdo->prepare($q . ' ORDER BY s.month DESC, s.id DESC'); $st->execute($args);
        json_out(['slips' => array_map(fn($r) => ['id' => (int) $r['id'], 'driver_id' => (int) $r['driver_id'], 'vehicle_id' => (int) $r['vehicle_id'], 'month' => $r['month'], 'net_payable' => (float) $r['net_payable'],
            'generated_at' => $r['generated_at'], 'driver_name' => $r['driver_name'], 'car_code' => $r['car_code']], $st->fetchAll())]);
    }
    if ($path === 'taxi/salary-slips' && $method === 'POST') { // generate = work it out now and keep a permanent copy
        if (!$admin) fail('Not allowed', 403);
        $b = body();
        $slip = taxi_salary_slip_data($pdo, (int) ($b['driver_id'] ?? 0), (int) ($b['vehicle_id'] ?? 0), (string) ($b['month'] ?? ''));
        if ($slip['days_worked'] + $slip['leave_days'] === 0) fail("No entries for {$slip['driver']['name']} on car " . substr($slip['car']['code'], -4) . " in {$slip['month']}. Choose the car this driver drove.", 422);
        $now = gmdate('Y-m-d H:i:s');
        $pdo->prepare('INSERT INTO taxi_salary_slips (driver_id, vehicle_id, month, net_payable, data, generated_at, generated_by) VALUES (?,?,?,?,?,?,?)')
            ->execute([$slip['driver']['id'], $slip['car']['id'], $slip['month'], $slip['net_payable'], json_encode($slip, JSON_UNESCAPED_UNICODE), $now, $user['id']]);
        json_out(['slip' => $slip + ['id' => (int) $pdo->lastInsertId(), 'generated_at' => $now]], 201);
    }
    if (preg_match('#^taxi/salary-slips/(\d+)$#', $path, $m) && $method === 'DELETE') { // remove a slip generated by mistake
        if (!$admin) fail('Not allowed', 403);
        $st = $pdo->prepare('SELECT 1 FROM taxi_salary_slips WHERE id = ?'); $st->execute([(int) $m[1]]);
        if (!$st->fetch()) fail('Slip not found', 404);
        $pdo->prepare('DELETE FROM taxi_salary_slips WHERE id = ?')->execute([(int) $m[1]]);
        json_out(['ok' => true]);
    }
    if (preg_match('#^taxi/salary-slips/(\d+)$#', $path, $m) && $method === 'GET') { // a saved slip, exactly as it was generated
        if (!$admin) fail('Not allowed', 403);
        $st = $pdo->prepare('SELECT * FROM taxi_salary_slips WHERE id = ?'); $st->execute([(int) $m[1]]);
        $r = $st->fetch();
        if (!$r) fail('Slip not found', 404);
        json_out(['slip' => (json_decode($r['data'], true) ?: []) + ['id' => (int) $r['id'], 'generated_at' => $r['generated_at']]]);
    }

    // ---------------------------------------------------------------- ledger: advances, damages, salary paid
    if ($method === 'GET' && $path === 'taxi/ledger') {
        [$from, $to] = taxi_range();
        $st = $pdo->prepare('SELECT * FROM taxi_ledger WHERE entry_date >= ? AND entry_date <= ? ORDER BY entry_date DESC, id DESC');
        $st->execute([$from, $to]);
        json_out(['ledger' => array_map('taxi_ledger_row', $st->fetchAll())]);
    }
    $ledgerClean = function (array $in) use ($pdo): array {
        $date = trim((string) ($in['entry_date'] ?? ''));
        if (!cw_valid_date($date)) fail('Enter a valid date', 422);
        if ($date > date('Y-m-d')) fail('The date cannot be in the future', 422);
        $d = $pdo->prepare('SELECT 1 FROM taxi_drivers WHERE id = ?'); $d->execute([(int) ($in['driver_id'] ?? 0)]);
        if (!$d->fetch()) fail('Choose the driver', 422);
        $kind = (string) ($in['kind'] ?? '');
        if (!in_array($kind, TAXI_KINDS, true)) fail('Choose Advance, Damage or Salary paid', 422);
        $amount = $in['amount'] ?? null;
        if (!is_numeric($amount) || $amount <= 0 || $amount > 10000000) fail('Enter a valid amount', 422);
        $vid = ($in['vehicle_id'] ?? '') === '' ? null : (int) $in['vehicle_id'];
        $note = trim((string) ($in['note'] ?? ''));
        if (mb_strlen($note) > 300) fail('Note is too long (300 characters)', 422);
        return [$date, (int) $in['driver_id'], $kind, round((float) $amount, 2), $kind === 'Damage' ? $vid : null, $note];
    };
    if ($method === 'POST' && $path === 'taxi/ledger') {
        if (($v = $ledgerClean(body()))[2] === 'Salary paid' && !$admin) fail('Only the owner can record salary paid', 403);
        $pdo->prepare('INSERT INTO taxi_ledger (entry_date,driver_id,kind,amount,vehicle_id,note,created_by) VALUES (?,?,?,?,?,?,?)')->execute([...$v, $user['id']]);
        $st = $pdo->prepare('SELECT * FROM taxi_ledger WHERE id = ?'); $st->execute([(int) $pdo->lastInsertId()]);
        json_out(['entry' => taxi_ledger_row($st->fetch())], 201);
    }
    if (preg_match('#^taxi/ledger/(\d+)$#', $path, $m)) {
        if (!$admin) fail('Not allowed', 403); // changing or removing money records is the owner's call
        $id = (int) $m[1];
        $st = $pdo->prepare('SELECT * FROM taxi_ledger WHERE id = ?'); $st->execute([$id]);
        if (!$st->fetch()) fail('Entry not found', 404);
        if ($method === 'PUT') {
            $v = $ledgerClean(body());
            $pdo->prepare('UPDATE taxi_ledger SET entry_date=?,driver_id=?,kind=?,amount=?,vehicle_id=?,note=? WHERE id=?')->execute([...$v, $id]);
            $st->execute([$id]);
            json_out(['entry' => taxi_ledger_row($st->fetch())]);
        }
        if ($method === 'DELETE') { $pdo->prepare('DELETE FROM taxi_ledger WHERE id = ?')->execute([$id]); json_out(['ok' => true]); }
    }
}
