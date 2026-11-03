<?php
declare(strict_types=1);

// Pooja Taxi Services: the per-car sheet and vehicle records linked to taxi_vehicles - extra details, documents (RC, insurance, PUC...) with expiry,
// service history with "next due" (date and/or km), and accidents. `taxi/due` gathers everything that is overdue or due soon.

const TV_DOC_TYPES = ['RC book', 'Insurance', 'PUC', 'Fitness certificate', 'Road tax', 'Permit', 'Vehicle photo', 'Purchase invoice', 'Loan / EMI papers', 'Service bill', 'Accident report / photo', 'Other'];
const TV_SERVICE_KINDS = ['Regular service', 'Oil change', 'Tyres', 'Battery', 'Brakes', 'Clutch', 'CNG kit / cylinder test', 'AC', 'Wheel alignment & balancing', 'Other'];
const TV_CLAIMS = ['None', 'Filed', 'Settled', 'Rejected'];
const TV_ACC_STATUS = ['Open', 'Repaired'];
const TV_SOON_DAYS = 30;  // a date item is "due soon" this many days ahead
const TV_SOON_KM = 500;   // a km item is "due soon" this many km ahead
const TV_MAX_BYTES = 5 * 1024 * 1024;

function tv_dir(): string {
    $d = __DIR__ . '/storage/vehicles';
    if (!is_dir($d)) mkdir($d, 0750, true);
    $ht = __DIR__ . '/storage/.htaccess';
    if (!is_file($ht)) file_put_contents($ht, "Require all denied\n");
    return $d;
}

function tv_nullable_date(mixed $v, string $label): ?string {
    $v = trim((string) ($v ?? ''));
    if ($v === '') return null;
    if (!cw_valid_date($v)) fail("Enter a valid $label", 422);
    return $v;
}

function tv_money(mixed $v, string $label): float {
    if ($v === null || $v === '') return 0.0;
    if (!is_numeric($v) || $v < 0 || $v > 1000000000) fail("Enter a valid $label", 422);
    return round((float) $v, 2);
}

function tv_km(mixed $v, string $label): ?float {
    if ($v === null || $v === '') return null;
    if (!is_numeric($v) || $v < 0 || $v > 100000000) fail("Enter a valid $label", 422);
    return round((float) $v, 1);
}

function tv_text(mixed $v, string $label, int $max, bool $required = false): string {
    $v = trim((string) ($v ?? ''));
    if ($required && $v === '') fail("Enter the $label", 422);
    if (mb_strlen($v) > $max) fail("$label is too long (max $max characters)", 422);
    return $v;
}

function tv_vehicle(PDO $pdo, int $id): array {
    $st = $pdo->prepare('SELECT * FROM taxi_vehicles WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    if (!$r) fail('Vehicle not found', 404);
    return $r;
}

function tv_detail_row(array $r): array {
    return array_merge(taxi_vehicle_row($r), [
        'make' => $r['make'], 'fuel_type' => $r['fuel_type'], 'color' => $r['color'], 'mfg_year' => $r['mfg_year'] === null ? null : (int) $r['mfg_year'],
        'reg_date' => $r['reg_date'], 'chassis_no' => $r['chassis_no'], 'engine_no' => $r['engine_no'], 'owner_name' => $r['owner_name'],
        'purchase_date' => $r['purchase_date'], 'purchase_price' => $r['purchase_price'] === null ? null : (float) $r['purchase_price'], 'notes' => $r['notes'],
        'account_name' => $r['account_name'] ?? '', 'deposit_to' => $r['deposit_to'] ?? '',
    ]);
}

function tv_doc_row(array $r): array {
    return ['id' => (int) $r['id'], 'vehicle_id' => (int) $r['vehicle_id'], 'doc_type' => $r['doc_type'], 'doc_number' => $r['doc_number'], 'issued_on' => $r['issued_on'], 'expires_on' => $r['expires_on'],
        'notes' => $r['notes'], 'original_name' => $r['original_name'], 'mime' => $r['mime'], 'size' => (int) $r['size'], 'uploaded_at' => $r['uploaded_at']];
}

function tv_service_row(array $r): array {
    return ['id' => (int) $r['id'], 'vehicle_id' => (int) $r['vehicle_id'], 'service_date' => $r['service_date'], 'kind' => $r['kind'], 'odometer_km' => $r['odometer_km'] === null ? null : (float) $r['odometer_km'],
        'cost' => (float) $r['cost'], 'vendor' => $r['vendor'], 'description' => $r['description'], 'next_due_date' => $r['next_due_date'], 'next_due_km' => $r['next_due_km'] === null ? null : (float) $r['next_due_km']];
}

function tv_accident_row(array $r): array {
    return ['id' => (int) $r['id'], 'vehicle_id' => (int) $r['vehicle_id'], 'accident_date' => $r['accident_date'], 'driver_id' => $r['driver_id'] === null ? null : (int) $r['driver_id'], 'location' => $r['location'],
        'description' => $r['description'], 'damage' => $r['damage'], 'repair_cost' => (float) $r['repair_cost'], 'insurance_claim' => $r['insurance_claim'], 'claim_amount' => (float) $r['claim_amount'],
        'status' => $r['status'], 'repaired_on' => $r['repaired_on'], 'notes' => $r['notes']];
}

// latest odometer we know: the highest end reading on a daily entry, or an odometer typed on a service record
function tv_odometer(PDO $pdo, int $vehicleId): ?float {
    $a = $pdo->prepare('SELECT MAX(end_km) FROM taxi_trips WHERE vehicle_id = ?'); $a->execute([$vehicleId]);
    $b = $pdo->prepare('SELECT MAX(odometer_km) FROM taxi_vehicle_services WHERE vehicle_id = ?'); $b->execute([$vehicleId]);
    $vals = array_filter([$a->fetchColumn(), $b->fetchColumn()], fn($x) => $x !== null && $x !== false);
    return $vals ? (float) max($vals) : null;
}

// Everything overdue or due soon for one vehicle (or all). A renewed document or a repeated service supersedes the older one:
// only the latest expiry per document type, the latest service per kind, and accidents still open count.
function tv_due_items(PDO $pdo, ?int $vehicleId = null): array {
    $today = date('Y-m-d');
    $vehicles = [];
    foreach ($pdo->query('SELECT id, code, active FROM taxi_vehicles')->fetchAll() as $v) if ($vehicleId === null || (int) $v['id'] === $vehicleId) $vehicles[(int) $v['id']] = $v;
    $items = [];
    $dayItem = function (int $vid, string $kind, string $label, string $date, int $ref) use (&$items, $vehicles, $today) {
        $left = (int) round((strtotime($date) - strtotime($today)) / 86400);
        if ($left > TV_SOON_DAYS) return;
        $items[] = ['vehicle_id' => $vid, 'vehicle_code' => $vehicles[$vid]['code'], 'kind' => $kind, 'label' => $label, 'due_date' => $date, 'days_left' => $left, 'due_km' => null, 'km_left' => null, 'status' => $left < 0 ? 'overdue' : 'soon', 'ref_id' => $ref];
    };
    foreach ($vehicles as $vid => $v) {
        if (!$v['active']) continue;
        // documents: latest expiry per type
        $st = $pdo->prepare('SELECT id, doc_type, expires_on FROM taxi_vehicle_documents WHERE vehicle_id = ? AND expires_on IS NOT NULL ORDER BY expires_on DESC, id DESC');
        $st->execute([$vid]);
        $seen = [];
        foreach ($st->fetchAll() as $d) { if (isset($seen[$d['doc_type']])) continue; $seen[$d['doc_type']] = 1; $dayItem($vid, 'document', $d['doc_type'] . ' expires', $d['expires_on'], (int) $d['id']); }
        // services: latest per kind, only if it carries a next due
        $st = $pdo->prepare('SELECT * FROM taxi_vehicle_services WHERE vehicle_id = ? ORDER BY service_date DESC, id DESC');
        $st->execute([$vid]);
        $seen = []; $odo = tv_odometer($pdo, $vid);
        foreach ($st->fetchAll() as $s) {
            if (isset($seen[$s['kind']])) continue; $seen[$s['kind']] = 1;
            if ($s['next_due_date']) $dayItem($vid, 'service', $s['kind'] . ' due', $s['next_due_date'], (int) $s['id']);
            if ($s['next_due_km'] !== null && $odo !== null) {
                $kmLeft = round((float) $s['next_due_km'] - $odo, 1);
                if ($kmLeft <= TV_SOON_KM) $items[] = ['vehicle_id' => $vid, 'vehicle_code' => $v['code'], 'kind' => 'service', 'label' => $s['kind'] . ' due at ' . number_format((float) $s['next_due_km'], 0) . ' km', 'due_date' => null, 'days_left' => null, 'due_km' => (float) $s['next_due_km'], 'km_left' => $kmLeft, 'status' => $kmLeft < 0 ? 'overdue' : 'soon', 'ref_id' => (int) $s['id']];
            }
        }
        // accidents not yet repaired
        $st = $pdo->prepare("SELECT id, accident_date, description FROM taxi_vehicle_accidents WHERE vehicle_id = ? AND status = 'Open'");
        $st->execute([$vid]);
        foreach ($st->fetchAll() as $a) $items[] = ['vehicle_id' => $vid, 'vehicle_code' => $v['code'], 'kind' => 'accident', 'label' => 'Repair pending: ' . mb_substr($a['description'], 0, 60), 'due_date' => $a['accident_date'], 'days_left' => null, 'due_km' => null, 'km_left' => null, 'status' => 'overdue', 'ref_id' => (int) $a['id']];
    }
    if ($vehicleId === null) { // drivers' licences are reminded alongside the vehicle papers
        $today2 = date('Y-m-d');
        foreach ($pdo->query('SELECT id, name, licence_expiry FROM taxi_drivers WHERE active = 1 AND licence_expiry IS NOT NULL')->fetchAll() as $d) {
            $left = (int) round((strtotime($d['licence_expiry']) - strtotime($today2)) / 86400);
            if ($left > TV_SOON_DAYS) continue;
            $items[] = ['vehicle_id' => null, 'vehicle_code' => '', 'driver_id' => (int) $d['id'], 'driver_name' => $d['name'], 'kind' => 'licence', 'label' => 'Driving licence expires', 'due_date' => $d['licence_expiry'], 'days_left' => $left, 'due_km' => null, 'km_left' => null, 'status' => $left < 0 ? 'overdue' : 'soon', 'ref_id' => (int) $d['id']];
        }
    }
    usort($items, fn($a, $b) => [$a['status'] === 'overdue' ? 0 : 1, $a['days_left'] ?? $a['km_left'] ?? 0] <=> [$b['status'] === 'overdue' ? 0 : 1, $b['days_left'] ?? $b['km_left'] ?? 0]);
    return $items;
}

// One car's sheet for a month, laid out like the owner's Excel sheet: a row per calendar day (a second row if two drivers ran
// the car that day). Total Run, Cash to Collect, Earning (30%), Average, Cost and Gain are worked out here, never typed.
// Cost = fuel + driver share + supplies + the car's EMI for the day (as in the sheet); EMI is charged for every day up to today.
function taxi_sheet(PDO $pdo, array $car, string $from, string $to): array {
    $vid = (int) $car['id'];
    $today = date('Y-m-d');
    $drivers = array_column($pdo->query('SELECT id, name FROM taxi_drivers')->fetchAll(), 'name', 'id');
    $st = $pdo->prepare('SELECT * FROM taxi_trips WHERE vehicle_id = ? AND trip_date >= ? AND trip_date <= ? ORDER BY trip_date, id');
    $st->execute([$vid, $from, $to]);
    $byDate = [];
    foreach ($st->fetchAll() as $t) $byDate[$t['trip_date']][] = $t;
    $adv = taxi_advances_by_day($pdo);
    $st = $pdo->prepare("SELECT entry_date, amount, note FROM taxi_ledger WHERE kind = 'Damage' AND vehicle_id = ? AND entry_date >= ? AND entry_date <= ?");
    $st->execute([$vid, $from, $to]);
    $dmg = [];
    foreach ($st->fetchAll() as $d) $dmg[$d['entry_date']][] = $d;
    $emiDay = (float) $car['emi_per_day'];
    $maintDay = (float) ($car['maintenance_per_day'] ?? 0); // maintenance: every day up to today, like the EMI (not the same as the running-day charge below)
    $chargeDay = (float) ($car['run_day_charge'] ?? 0); // fixed charge for every day the car runs (not for leave or idle days)
    // Some cars are costed simply as CNG + petrol + driver earning (no EMI, maintenance, running-day charge or other expenses).
    $fuelShare = ($car['cost_mode'] ?? 'full') === 'fuel_share';
    if ($fuelShare) { $emiDay = 0.0; $maintDay = 0.0; $chargeDay = 0.0; }

    $rows = [];
    $tot = ['km' => 0.0, 'cng_kg' => 0.0, 'cng_amount' => 0.0, 'petrol_ltr' => 0.0, 'petrol_amount' => 0.0, 'total_earning' => 0.0, 'payout' => 0.0, 'online_transfer' => 0.0, 'parking' => 0.0,
        'cash_to_collect' => 0.0, 'cash_received' => 0.0, 'driver_share' => 0.0, 'advance_paid' => 0.0, 'leave_days' => 0, 'supplies' => 0.0, 'cost' => 0.0, 'emi' => 0.0, 'maintenance' => 0.0, 'run_charge' => 0.0, 'gain' => 0.0];
    for ($d = $from; $d <= $to; $d = date('Y-m-d', strtotime("$d +1 day"))) {
        $emiToday = $d <= $today ? $emiDay : 0.0;
        $maintToday = $d <= $today ? $maintDay : 0.0;
        $charged = false; // the running-day charge is taken once per day, on the first row where the car ran
        $entries = $byDate[$d] ?? [null];
        $damageText = implode('; ', array_map(fn($x) => '₹' . number_format((float) $x['amount'], 0) . ($x['note'] !== '' ? ' ' . $x['note'] : ''), $dmg[$d] ?? []));
        foreach ($entries as $i => $t) {
            $emi = $i === 0 ? $emiToday : 0.0;
            $maint = $i === 0 ? $maintToday : 0.0;
            $row = ['date' => $d, 'day' => date('l', strtotime($d)), 's_no' => (int) substr($d, 8, 2), 'trip_id' => null, 'driver_id' => null, 'driver_name' => '', 'vehicle_code' => $car['code'], 'shift' => '',
                'in_time' => '', 'out_time' => '', 'start_km' => null, 'end_km' => null, 'km' => null, 'cng_kg' => null, 'cng_amount' => null, 'petrol_ltr' => null, 'petrol_amount' => null,
                'total_earning' => null, 'payout' => null, 'online_transfer' => null, 'parking' => null, 'cash_to_collect' => null, 'cash_received' => null, 'driver_share' => null, 'share_pct' => null, 'average' => null,
                'advance_paid' => null, 'on_leave' => false, 'supplies' => null, 'other_items' => [], 'emi' => $emi, 'maintenance' => $maint, 'run_charge' => 0.0, 'status' => '', 'damage' => $i === 0 ? $damageText : ''];
            if ($t) {
                $r = taxi_trip_row($t);
                $advance = $adv[$t['driver_id'] . '|' . $d] ?? 0;
                $runCharge = (!$r['on_leave'] && !$charged) ? $chargeDay : 0.0;
                if (!$r['on_leave']) $charged = true;
                $cost = $r['fuel'] + $r['driver_share'] + ($fuelShare ? 0.0 : $r['supplies']) + $emi + $maint + $runCharge;
                $row = array_merge($row, ['trip_id' => $r['id'], 'driver_id' => $r['driver_id'], 'driver_name' => $drivers[$r['driver_id']] ?? '', 'shift' => $r['on_leave'] ? '' : $r['shift'],
                    'in_time' => $r['in_time'], 'out_time' => $r['out_time'], 'start_km' => $r['start_km'], 'end_km' => $r['end_km'], 'km' => $r['on_leave'] || $r['start_km'] === null || $r['end_km'] === null ? null : $r['km'],
                    'cng_kg' => $r['on_leave'] ? null : $r['cng_kg'], 'cng_amount' => $r['on_leave'] ? null : $r['cng_amount'], 'petrol_ltr' => $r['on_leave'] ? null : $r['petrol_ltr'], 'petrol_amount' => $r['on_leave'] ? null : $r['petrol_amount'],
                    'total_earning' => $r['on_leave'] ? null : $r['total_earning'], 'payout' => $r['on_leave'] ? null : $r['payout'], 'online_transfer' => $r['on_leave'] ? null : $r['online_transfer'], 'parking' => $r['on_leave'] ? null : $r['parking'],
                    'cash_to_collect' => $r['on_leave'] ? null : $r['cash_to_collect'], 'cash_received' => $r['on_leave'] ? null : $r['cash_received'], 'driver_share' => $r['on_leave'] ? null : $r['driver_share'], 'share_pct' => $r['share_pct'],
                    'advance_paid' => $advance > 0 ? $advance : null, 'on_leave' => $r['on_leave'], 'supplies' => $r['on_leave'] ? null : $r['supplies'], 'other_items' => $r['other_items'], 'status' => $r['notes']]);
                $row['average'] = $row['km'] && $row['total_earning'] !== null ? round($row['total_earning'] / $row['km'], 2) : null;
                $row['run_charge'] = $runCharge;
                $row['cost'] = round($cost, 2);
                $row['gain'] = round((float) ($row['payout'] ?? 0) - $cost, 2); // profit = payout - cost
                foreach (['km', 'cng_kg', 'cng_amount', 'petrol_ltr', 'petrol_amount', 'total_earning', 'payout', 'online_transfer', 'parking', 'cash_to_collect', 'cash_received', 'driver_share', 'supplies'] as $k) $tot[$k] += (float) ($row[$k] ?? 0);
                $tot['advance_paid'] += $advance;
                if ($r['on_leave']) $tot['leave_days']++;
            } else {
                $row['cost'] = round($emi + $maint, 2);
                $row['gain'] = round(-($emi + $maint), 2);
            }
            $tot['emi'] += $emi; $tot['maintenance'] += $maint; $tot['run_charge'] += (float) ($row['run_charge'] ?? 0); $tot['cost'] += $row['cost']; $tot['gain'] += $row['gain'];
            $rows[] = $row;
        }
    }
    foreach ($tot as $k => $v) $tot[$k] = is_float($v) ? round($v, 2) : $v;
    $tot['average'] = $tot['km'] > 0 ? round($tot['total_earning'] / $tot['km'], 2) : null;

    // everything this car has done since its first entry
    $st = $pdo->prepare('SELECT MIN(trip_date) AS first, SUM(total_earning) AS earning, SUM(payout) AS payout, SUM(cng_amount + petrol_amount' . ($fuelShare ? '' : ' + supplies') . ' + total_earning * share_pct / 100) AS opcost FROM taxi_trips WHERE vehicle_id = ? AND on_leave = 0');
    $st->execute([$vid]);
    $all = $st->fetch();
    $first = $all['first'];
    $days = $first ? (int) round((strtotime($today) - strtotime($first)) / 86400) + 1 : 0;
    $emiAll = round($emiDay * max($days, 0), 2);
    $maintAll = round($maintDay * max($days, 0), 2);
    $rd = $pdo->prepare('SELECT COUNT(DISTINCT trip_date) FROM taxi_trips WHERE vehicle_id = ? AND on_leave = 0'); $rd->execute([$vid]);
    $chargeAll = round($chargeDay * (int) $rd->fetchColumn(), 2);
    $since = ['first_date' => $first, 'earning' => round((float) $all['earning'], 2), 'cost' => round((float) $all['opcost'] + $emiAll + $maintAll + $chargeAll, 2), 'emi' => $emiAll, 'maintenance' => $maintAll, 'run_charge' => $chargeAll];
    $since['gain'] = round((float) $all['payout'] - $since['cost'], 2); // profit = payout - cost

    return ['vehicle' => ['id' => $vid, 'code' => $car['code'], 'model' => $car['model'], 'emi_per_day' => $emiDay, 'maintenance_per_day' => $maintDay, 'run_day_charge' => $chargeDay, 'cost_mode' => $fuelShare ? 'fuel_share' : 'full', 'driver_id' => $car['driver_id'] === null ? null : (int) $car['driver_id'], 'driver_name' => $drivers[(int) ($car['driver_id'] ?? 0)] ?? ''],
        'month' => substr($from, 0, 7), 'rows' => $rows, 'totals' => $tot, 'since_start' => $since];
}

// Every car's rows for one day (`taxi/day`) or a date range (`taxi/history`), worked out exactly as on each car's own sheet.
// For a range, days a car did not run are left out unless it still carried a cost that day (EMI), so the totals match the sheets.
function taxi_all_cars(PDO $pdo, string $from, string $to, ?int $onlyVehicle, bool $entriesOnly): array {
    if ($to < $from) fail('The end date is before the start date', 422);
    if ((strtotime($to) - strtotime($from)) / 86400 > 366) fail('Choose a period of up to one year', 422);
    $today = date('Y-m-d');
    $cars = $pdo->query('SELECT * FROM taxi_vehicles ORDER BY code')->fetchAll();
    $out = []; $rows = [];
    foreach ($cars as $car) {
        if ($onlyVehicle !== null && (int) $car['id'] !== $onlyVehicle) continue;
        $sheet = taxi_sheet($pdo, $car, $from, $to);
        $has = count(array_filter($sheet['rows'], fn($r) => $r['trip_id']));
        if (!$car['active'] && !$has) continue; // a car taken out of use only appears when it has entries in the period
        $mine = array_values(array_filter($sheet['rows'], fn($r) => $r['trip_id'] || ($entriesOnly ? false : ($r['date'] <= $today && $r['cost'] != 0))));
        foreach ($mine as &$r) { $r['vehicle_code'] = $car['code']; } unset($r);
        $out[] = ['vehicle' => $sheet['vehicle'], 'rows' => $mine, 'totals' => $sheet['totals']];
        array_push($rows, ...$mine);
    }
    usort($rows, fn($a, $b) => [$a['date'], $a['vehicle_code']] <=> [$b['date'], $b['vehicle_code']]);
    return ['cars' => $out, 'rows' => $rows];
}

// returns without output when the path is not a vehicle-records path, so taxi_route carries on
function taxi_vehicle_records_route(string $method, string $path, array $user): void {
    $pdo = db();
    $admin = $user['role'] === 'admin';

    if ($method === 'GET' && $path === 'taxi/day') { // all cars on one day: a row per entry, or one "no entry" row for a car
        $date = (string) ($_GET['date'] ?? date('Y-m-d'));
        if (!cw_valid_date($date)) fail('Choose a valid date', 422);
        $r = taxi_all_cars($pdo, $date, $date, null, false);
        $cars = [];
        foreach ($r['cars'] as $c) {
            $rows = $c['rows'];
            if (!$rows) { // a car with nothing that day still gets its own line, so all cars are always visible
                $rows = [array_merge(taxi_sheet($pdo, tv_vehicle($pdo, $c['vehicle']['id']), $date, $date)['rows'][0], ['vehicle_code' => $c['vehicle']['code']])];
            }
            $cars[] = ['vehicle' => $c['vehicle'], 'rows' => $rows];
        }
        $tot = ['earning' => 0.0, 'cost' => 0.0, 'gain' => 0.0, 'km' => 0.0];
        foreach ($cars as $c) foreach ($c['rows'] as $row) { $tot['earning'] += (float) ($row['total_earning'] ?? 0); $tot['cost'] += (float) $row['cost']; $tot['gain'] += (float) $row['gain']; $tot['km'] += (float) ($row['km'] ?? 0); }
        json_out(['date' => $date, 'today' => date('Y-m-d'), 'cars' => $cars, 'totals' => array_map(fn($v) => round($v, 2), $tot)]);
    }
    if ($method === 'GET' && $path === 'taxi/history') { // for downloads: every car (or one) over a period
        $from = (string) ($_GET['from'] ?? ''); $to = (string) ($_GET['to'] ?? '');
        if (!cw_valid_date($from) || !cw_valid_date($to)) fail('Enter a valid date range', 422);
        $vid = ($_GET['vehicle_id'] ?? '') === '' ? null : (int) $_GET['vehicle_id'];
        if (($_GET['car'] ?? '') !== '') { $q = $pdo->prepare('SELECT id FROM taxi_vehicles WHERE code = ?'); $q->execute([(string) $_GET['car']]); $vid = (int) ($q->fetchColumn() ?: 0); if (!$vid) fail('Choose a valid car', 422); }
        $r = taxi_all_cars($pdo, $from, $to, $vid, false);
        json_out(['rows' => $r['rows']]);
    }
    if ($method === 'GET' && $path === 'taxi/sheet') {
        [$from, $to] = taxi_month_bounds((string) ($_GET['month'] ?? date('Y-m')));
        json_out(taxi_sheet($pdo, tv_vehicle($pdo, (int) ($_GET['vehicle_id'] ?? 0)), $from, $to));
    }
    if ($method === 'GET' && $path === 'taxi/due') json_out(['items' => tv_due_items($pdo), 'soon_days' => TV_SOON_DAYS, 'soon_km' => TV_SOON_KM]);

    // ------------------------------------------------------------ one vehicle, everything
    if ($method === 'GET' && preg_match('#^taxi/vehicles/(\d+)$#', $path, $m)) {
        $id = (int) $m[1];
        $v = tv_vehicle($pdo, $id);
        $q = function (string $sql) use ($pdo, $id): array { $st = $pdo->prepare($sql); $st->execute([$id]); return $st->fetchAll(); };
        json_out([
            'vehicle' => tv_detail_row($v),
            'documents' => array_map('tv_doc_row', $q('SELECT * FROM taxi_vehicle_documents WHERE vehicle_id = ? ORDER BY doc_type, expires_on DESC, id DESC')),
            'services' => array_map('tv_service_row', $q('SELECT * FROM taxi_vehicle_services WHERE vehicle_id = ? ORDER BY service_date DESC, id DESC')),
            'accidents' => array_map('tv_accident_row', $q('SELECT * FROM taxi_vehicle_accidents WHERE vehicle_id = ? ORDER BY accident_date DESC, id DESC')),
            'due' => tv_due_items($pdo, $id), 'odometer' => tv_odometer($pdo, $id),
            'doc_types' => TV_DOC_TYPES, 'service_kinds' => TV_SERVICE_KINDS, 'claims' => TV_CLAIMS, 'accident_statuses' => TV_ACC_STATUS,
        ]);
    }
    if ($method === 'PUT' && preg_match('#^taxi/vehicles/(\d+)/details$#', $path, $m)) {
        if (!$admin) fail('Not allowed', 403);
        $id = (int) $m[1]; tv_vehicle($pdo, $id);
        $b = body();
        $year = $b['mfg_year'] ?? null;
        if ($year === '' || $year === null) $year = null; elseif (!is_numeric($year) || $year < 1990 || $year > (int) date('Y') + 1) fail('Enter a valid year', 422); else $year = (int) $year;
        $price = $b['purchase_price'] ?? null;
        if ($price === '' || $price === null) $price = null; elseif (!is_numeric($price) || $price < 0 || $price > 1000000000) fail('Enter a valid purchase price', 422); else $price = round((float) $price, 2);
        $fuel = (string) ($b['fuel_type'] ?? 'CNG');
        if (!in_array($fuel, ['CNG', 'Petrol', 'Diesel', 'Electric', 'CNG + Petrol'], true)) fail('Choose the fuel type', 422);
        $pdo->prepare('UPDATE taxi_vehicles SET make=?, fuel_type=?, color=?, mfg_year=?, reg_date=?, chassis_no=?, engine_no=?, owner_name=?, purchase_date=?, purchase_price=?, notes=?, account_name=?, deposit_to=? WHERE id=?')->execute([
            tv_text($b['make'] ?? '', 'make', 60), $fuel, tv_text($b['color'] ?? '', 'colour', 40), $year, tv_nullable_date($b['reg_date'] ?? '', 'registration date'),
            tv_text($b['chassis_no'] ?? '', 'chassis number', 40), tv_text($b['engine_no'] ?? '', 'engine number', 40), tv_text($b['owner_name'] ?? '', 'owner name', 100),
            tv_nullable_date($b['purchase_date'] ?? '', 'purchase date'), $price, tv_text($b['notes'] ?? '', 'notes', 500),
            tv_text($b['account_name'] ?? '', 'account name', 100), tv_text($b['deposit_to'] ?? '', 'deposit account', 100), $id]);
        json_out(['vehicle' => tv_detail_row(tv_vehicle($pdo, $id))]);
    }

    // ------------------------------------------------------------ documents
    if (preg_match('#^taxi/vehicle-documents/(\d+)$#', $path, $m)) {
        $st = $pdo->prepare('SELECT * FROM taxi_vehicle_documents WHERE id = ?'); $st->execute([(int) $m[1]]);
        $d = $st->fetch();
        if (!$d) fail('Document not found', 404);
        if ($method === 'GET') {
            $file = tv_dir() . '/' . basename($d['stored_name']);
            if (!is_file($file)) fail('File is missing', 404);
            header('Content-Type: ' . $d['mime']); header('Content-Length: ' . filesize($file)); header('X-Content-Type-Options: nosniff'); header('Cache-Control: private, max-age=300');
            header('Content-Disposition: inline; filename="' . preg_replace('/[^A-Za-z0-9._-]/', '_', $d['original_name']) . '"');
            readfile($file); exit;
        }
        if (!$admin) fail('Not allowed', 403);
        if ($method === 'PUT') {
            $b = body();
            $pdo->prepare('UPDATE taxi_vehicle_documents SET doc_number=?, issued_on=?, expires_on=?, notes=? WHERE id=?')->execute([tv_text($b['doc_number'] ?? '', 'document number', 60), tv_nullable_date($b['issued_on'] ?? '', 'issue date'), tv_nullable_date($b['expires_on'] ?? '', 'expiry date'), tv_text($b['notes'] ?? '', 'notes', 300), $d['id']]);
            $st->execute([$d['id']]);
            json_out(['document' => tv_doc_row($st->fetch())]);
        }
        if ($method === 'DELETE') {
            @unlink(tv_dir() . '/' . basename($d['stored_name']));
            $pdo->prepare('DELETE FROM taxi_vehicle_documents WHERE id = ?')->execute([$d['id']]);
            json_out(['ok' => true]);
        }
    }
    if ($method === 'POST' && preg_match('#^taxi/vehicles/(\d+)/documents$#', $path, $m)) {
        if (!$admin) fail('Not allowed', 403);
        $id = (int) $m[1]; tv_vehicle($pdo, $id);
        $type = (string) ($_POST['doc_type'] ?? '');
        if (!in_array($type, TV_DOC_TYPES, true)) fail('Choose a document type', 422);
        $issued = tv_nullable_date($_POST['issued_on'] ?? '', 'issue date'); $expires = tv_nullable_date($_POST['expires_on'] ?? '', 'expiry date');
        if ($issued && $expires && $expires < $issued) fail('Expiry cannot be before the issue date', 422);
        $number = tv_text($_POST['doc_number'] ?? '', 'document number', 60); $notes = tv_text($_POST['notes'] ?? '', 'notes', 300);
        $f = $_FILES['file'] ?? null;
        if (!$f) fail('Choose a file to upload', 422);
        if (in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) fail('That file is too large for the server. Try a smaller one.', 413);
        if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) fail('Upload failed. Please try again.', 400);
        if ($f['size'] > TV_MAX_BYTES) fail('File is too large (max 5 MB)', 413);
        $kind = em_sniff($f['tmp_name']);
        if (!$kind) fail('Only JPG, PNG, WEBP or PDF files are allowed', 415);
        $stored = bin2hex(random_bytes(16)) . '.' . $kind[1];
        if (!move_uploaded_file($f['tmp_name'], tv_dir() . '/' . $stored)) fail('Could not save the file', 500);
        chmod(tv_dir() . '/' . $stored, 0640);
        $orig = mb_substr(preg_replace('/[^\p{L}\p{N}._ -]/u', '_', basename((string) $f['name'])), 0, 200) ?: 'file';
        $pdo->prepare('INSERT INTO taxi_vehicle_documents (vehicle_id,doc_type,doc_number,issued_on,expires_on,notes,original_name,stored_name,mime,size,uploaded_by,uploaded_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
            ->execute([$id, $type, $number, $issued, $expires, $notes, $orig, $stored, $kind[0], (int) $f['size'], $user['id'], date('Y-m-d H:i:s')]);
        $st = $pdo->prepare('SELECT * FROM taxi_vehicle_documents WHERE id = ?'); $st->execute([(int) $pdo->lastInsertId()]);
        json_out(['document' => tv_doc_row($st->fetch())], 201);
    }

    // ------------------------------------------------------------ service history
    $svcClean = function (array $b): array {
        $date = trim((string) ($b['service_date'] ?? ''));
        if (!cw_valid_date($date)) fail('Enter a valid service date', 422);
        if ($date > date('Y-m-d')) fail('The service date cannot be in the future', 422);
        $kind = (string) ($b['kind'] ?? '');
        if (!in_array($kind, TV_SERVICE_KINDS, true)) fail('Choose the type of service', 422);
        $next = tv_nullable_date($b['next_due_date'] ?? '', 'next due date');
        if ($next && $next < $date) fail('The next due date cannot be before the service date', 422);
        $odo = tv_km($b['odometer_km'] ?? null, 'odometer reading'); $nextKm = tv_km($b['next_due_km'] ?? null, 'next due km');
        if ($odo !== null && $nextKm !== null && $nextKm <= $odo) fail('Next due km must be more than the odometer reading', 422);
        return [$date, $kind, $odo, tv_money($b['cost'] ?? 0, 'cost'), tv_text($b['vendor'] ?? '', 'vendor', 100), tv_text($b['description'] ?? '', 'description', 500), $next, $nextKm];
    };
    if ($method === 'POST' && preg_match('#^taxi/vehicles/(\d+)/services$#', $path, $m)) {
        $id = (int) $m[1]; tv_vehicle($pdo, $id);
        $pdo->prepare('INSERT INTO taxi_vehicle_services (vehicle_id,service_date,kind,odometer_km,cost,vendor,description,next_due_date,next_due_km,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)')->execute([$id, ...$svcClean(body()), $user['id']]);
        $st = $pdo->prepare('SELECT * FROM taxi_vehicle_services WHERE id = ?'); $st->execute([(int) $pdo->lastInsertId()]);
        json_out(['service' => tv_service_row($st->fetch())], 201);
    }
    if (preg_match('#^taxi/vehicle-services/(\d+)$#', $path, $m)) {
        $st = $pdo->prepare('SELECT * FROM taxi_vehicle_services WHERE id = ?'); $st->execute([(int) $m[1]]);
        if (!$st->fetch()) fail('Service record not found', 404);
        if ($method === 'PUT') {
            $pdo->prepare('UPDATE taxi_vehicle_services SET service_date=?,kind=?,odometer_km=?,cost=?,vendor=?,description=?,next_due_date=?,next_due_km=? WHERE id=?')->execute([...$svcClean(body()), (int) $m[1]]);
            $st->execute([(int) $m[1]]);
            json_out(['service' => tv_service_row($st->fetch())]);
        }
        if ($method === 'DELETE') { if (!$admin) fail('Not allowed', 403); $pdo->prepare('DELETE FROM taxi_vehicle_services WHERE id = ?')->execute([(int) $m[1]]); json_out(['ok' => true]); }
    }

    // ------------------------------------------------------------ accidents
    $accClean = function (array $b) use ($pdo): array {
        $date = trim((string) ($b['accident_date'] ?? ''));
        if (!cw_valid_date($date)) fail('Enter a valid accident date', 422);
        if ($date > date('Y-m-d')) fail('The accident date cannot be in the future', 422);
        $driver = ($b['driver_id'] ?? '') === '' || ($b['driver_id'] ?? null) === null ? null : (int) $b['driver_id'];
        if ($driver !== null) { $d = $pdo->prepare('SELECT 1 FROM taxi_drivers WHERE id = ?'); $d->execute([$driver]); if (!$d->fetch()) fail('Choose a valid driver', 422); }
        $claim = (string) ($b['insurance_claim'] ?? 'None');
        if (!in_array($claim, TV_CLAIMS, true)) fail('Choose the insurance claim status', 422);
        $status = (string) ($b['status'] ?? 'Open');
        if (!in_array($status, TV_ACC_STATUS, true)) fail('Choose Open or Repaired', 422);
        $repaired = tv_nullable_date($b['repaired_on'] ?? '', 'repair date');
        if ($repaired && $repaired < $date) fail('The repair date cannot be before the accident', 422);
        if ($status === 'Open') $repaired = null;
        return [$date, $driver, tv_text($b['location'] ?? '', 'location', 150), tv_text($b['description'] ?? '', 'description', 500, true), tv_text($b['damage'] ?? '', 'damage details', 300),
            tv_money($b['repair_cost'] ?? 0, 'repair cost'), $claim, tv_money($b['claim_amount'] ?? 0, 'claim amount'), $status, $repaired, tv_text($b['notes'] ?? '', 'notes', 500)];
    };
    if ($method === 'POST' && preg_match('#^taxi/vehicles/(\d+)/accidents$#', $path, $m)) {
        $id = (int) $m[1]; tv_vehicle($pdo, $id);
        $pdo->prepare('INSERT INTO taxi_vehicle_accidents (vehicle_id,accident_date,driver_id,location,description,damage,repair_cost,insurance_claim,claim_amount,status,repaired_on,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([$id, ...$accClean(body()), $user['id']]);
        $st = $pdo->prepare('SELECT * FROM taxi_vehicle_accidents WHERE id = ?'); $st->execute([(int) $pdo->lastInsertId()]);
        json_out(['accident' => tv_accident_row($st->fetch())], 201);
    }
    if (preg_match('#^taxi/vehicle-accidents/(\d+)$#', $path, $m)) {
        $st = $pdo->prepare('SELECT * FROM taxi_vehicle_accidents WHERE id = ?'); $st->execute([(int) $m[1]]);
        if (!$st->fetch()) fail('Accident record not found', 404);
        if ($method === 'PUT') {
            $pdo->prepare('UPDATE taxi_vehicle_accidents SET accident_date=?,driver_id=?,location=?,description=?,damage=?,repair_cost=?,insurance_claim=?,claim_amount=?,status=?,repaired_on=?,notes=? WHERE id=?')->execute([...$accClean(body()), (int) $m[1]]);
            $st->execute([(int) $m[1]]);
            json_out(['accident' => tv_accident_row($st->fetch())]);
        }
        if ($method === 'DELETE') { if (!$admin) fail('Not allowed', 403); $pdo->prepare('DELETE FROM taxi_vehicle_accidents WHERE id = ?')->execute([(int) $m[1]]); json_out(['ok' => true]); }
    }
}
