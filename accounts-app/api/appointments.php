<?php
declare(strict_types=1);

// AutoShine appointments. One bay, so one car per slot. Slots are 2 hours long, from 9 am to 9 pm.
// Statuses: Booked (not yet confirmed with the customer) -> Confirmed -> Arrived -> Done, or No-show / Cancelled. Moving it to another time puts it back to Booked.
// Only Booked, Confirmed, Arrived and Done keep the slot taken.

const APPT_SLOTS = [9, 11, 13, 15, 17, 19];   // start hour of each 2-hour slot
const APPT_HOURS = 2;
const APPT_ACTIVE = ['Booked', 'Confirmed', 'Arrived', 'Done'];

function appt_row(array $r): array {
    return [
        'id' => (int) $r['id'], 'appt_date' => $r['appt_date'], 'slot_hour' => (int) $r['slot_hour'], 'name' => $r['name'], 'mobile' => $r['mobile'],
        'vehicle_number' => $r['vehicle_number'], 'vehicle_type' => $r['vehicle_type'], 'model' => $r['model'], 'service' => $r['service'],
        'notes' => $r['notes'], 'status' => $r['status'], 'entry_id' => $r['entry_id'] === null ? null : (int) $r['entry_id'], 'by' => $r['created_by_name'],
    ];
}

function appt_label(string $date, int $hour): string {
    $h = fn(int $x) => (($x + 11) % 12 + 1) . ($x < 12 || $x === 24 ? ' AM' : ' PM');
    return (new DateTimeImmutable($date))->format('j M') . ', ' . $h($hour) . ' – ' . $h($hour + APPT_HOURS);
}

function appt_who(array $a): string {
    return implode(' · ', array_filter([$a['name'] ?? '', $a['vehicle_number'] ?? '']));
}

function appt_clean(array $in): array {
    $date = trim((string) ($in['appt_date'] ?? ''));
    $hour = (int) ($in['slot_hour'] ?? 0);
    $name = trim((string) ($in['name'] ?? ''));
    $mobile = preg_replace('/[^0-9+]/', '', (string) ($in['mobile'] ?? ''));
    $vehicle = cw_vehicle((string) ($in['vehicle_number'] ?? ''));
    $type = (string) ($in['vehicle_type'] ?? 'Car');
    $model = trim((string) ($in['model'] ?? ''));
    $service = trim((string) ($in['service'] ?? ''));
    $notes = trim((string) ($in['notes'] ?? ''));

    if (!cw_valid_date($date)) fail('Choose the date of the appointment', 422);
    if (!in_array($hour, APPT_SLOTS, true)) fail('Choose a time slot', 422);
    if (mb_strlen($name) > 100) fail('Name is too long', 422);
    if ($mobile !== '' && !preg_match('/^(\+91)?[0-9]{10}$/', $mobile)) fail('Mobile number must be 10 digits, or leave it blank', 422);
    if (mb_strlen($vehicle) > 20) fail('Vehicle number is too long', 422);
    if (!in_array($type, ['Car', 'Bike', 'Auto'], true)) fail('Choose Car, Bike or Auto', 422);
    if ($service !== '' && !in_array($service, CARWASH_SERVICES, true)) fail('Choose a service from the list', 422);
    if (mb_strlen($model) > 100 || mb_strlen($notes) > 300) fail('Model or note is too long', 422);
    if ($name === '' && $mobile === '' && $vehicle === '') fail('Enter the customer name, mobile number or vehicle number', 422);
    return [$date, $hour, $name, $mobile, $vehicle, $type, $model, $service, $notes];
}

// A new or moved appointment must not be in the past (a slot already over today counts as past).
function appt_check_future(string $date, int $hour): void {
    $today = date('Y-m-d');
    if ($date < $today) fail('That date has already passed', 422);
    if ($date === $today && (int) date('G') >= $hour + APPT_HOURS) fail('That time slot is already over for today', 422);
}

function appt_one(PDO $pdo, int $id): array {
    $st = $pdo->prepare('SELECT * FROM carwash_appointments WHERE id = ?');
    $st->execute([$id]);
    $r = $st->fetch();
    if (!$r) fail('Appointment not found', 404);
    return $r;
}

function appt_is_dup(Throwable $e): bool {
    return str_contains($e->getMessage(), 'Duplicate') || str_contains($e->getMessage(), 'UNIQUE');
}

function appointments_route(string $method, string $path, array $user): void {
    $pdo = db();
    $today = date('Y-m-d');

    if ($method === 'GET' && $path === 'carwash/appointments') {
        $from = (string) ($_GET['from'] ?? $today);
        $to = (string) ($_GET['to'] ?? date('Y-m-d', strtotime('+6 days')));
        if (!cw_valid_date($from) || !cw_valid_date($to) || $to < $from) fail('Enter a valid date range', 422);
        if ((strtotime($to) - strtotime($from)) > 92 * 86400) fail('Choose a shorter period (up to 3 months)', 422);
        $st = $pdo->prepare('SELECT * FROM carwash_appointments WHERE appt_date >= ? AND appt_date <= ? ORDER BY appt_date, slot_hour, id');
        $st->execute([$from, $to]);
        json_out(['appointments' => array_map('appt_row', $st->fetchAll()), 'slots' => APPT_SLOTS, 'slot_hours' => APPT_HOURS, 'today' => $today, 'now_hour' => (int) date('G'), 'now_minute' => (int) date('i')]);
    }

    if ($method === 'POST' && $path === 'carwash/appointments') {
        [$date, $hour, $name, $mobile, $vehicle, $type, $model, $service, $notes] = appt_clean(body());
        appt_check_future($date, $hour);
        if ($vehicle !== '') {
            $st = $pdo->prepare("SELECT COUNT(*) FROM carwash_appointments WHERE vehicle_number = ? AND appt_date = ? AND status IN ('Booked','Confirmed','Arrived')");
            $st->execute([$vehicle, $date]);
            if ((int) $st->fetchColumn()) fail("$vehicle already has an appointment on that day", 409);
        }
        try {
            $pdo->prepare("INSERT INTO carwash_appointments (appt_date,slot_hour,name,mobile,vehicle_number,vehicle_type,model,service,notes,status,slot_key,created_by,created_by_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,'Booked',?,?,?,?)")
                ->execute([$date, $hour, $name, $mobile, $vehicle, $type, $model, $service, $notes, "$date#$hour", $user['id'], $user['name'], date('Y-m-d H:i:s')]);
        } catch (PDOException $e) {
            if (appt_is_dup($e)) fail('That time slot is already booked. Choose another slot.', 409);
            throw $e;
        }
        $GLOBALS['notify_text'] = 'booked an appointment: ' . implode(' · ', array_filter([appt_who(['name' => $name, 'vehicle_number' => $vehicle]), appt_label($date, $hour), $service]));
        json_out(['appointment' => appt_row(appt_one($pdo, (int) $pdo->lastInsertId()))], 201);
    }

    if (preg_match('#^carwash/appointments/(\d+)$#', $path, $m)) {
        $id = (int) $m[1];
        $cur = appt_one($pdo, $id);
        if ($method === 'PUT') { // change details or move to another slot: only while still Booked
            if (!in_array($cur['status'], ['Booked', 'Confirmed'], true)) fail('Only a booked appointment can be changed', 409);
            [$date, $hour, $name, $mobile, $vehicle, $type, $model, $service, $notes] = appt_clean(body());
            $moved = $date !== $cur['appt_date'] || $hour !== (int) $cur['slot_hour'];
            if ($moved) appt_check_future($date, $hour);
            if ($vehicle !== '' && ($moved || $vehicle !== $cur['vehicle_number'])) {
                $st = $pdo->prepare("SELECT COUNT(*) FROM carwash_appointments WHERE vehicle_number = ? AND appt_date = ? AND status IN ('Booked','Confirmed','Arrived') AND id <> ?");
                $st->execute([$vehicle, $date, $id]);
                if ((int) $st->fetchColumn()) fail("$vehicle already has an appointment on that day", 409);
            }
            try {
                $pdo->prepare('UPDATE carwash_appointments SET appt_date=?,slot_hour=?,name=?,mobile=?,vehicle_number=?,vehicle_type=?,model=?,service=?,notes=?,slot_key=?,status=? WHERE id=?')
                    ->execute([$date, $hour, $name, $mobile, $vehicle, $type, $model, $service, $notes, "$date#$hour", $moved ? 'Booked' : $cur['status'], $id]); // a moved appointment must be confirmed again
            } catch (PDOException $e) {
                if (appt_is_dup($e)) fail('That time slot is already booked. Choose another slot.', 409);
                throw $e;
            }
            $GLOBALS['notify_text'] = ($moved ? 'rescheduled an appointment to ' . appt_label($date, $hour) : 'changed an appointment') . ': ' . appt_who(['name' => $name, 'vehicle_number' => $vehicle]);
            json_out(['appointment' => appt_row(appt_one($pdo, $id))]);
        }
        if ($method === 'DELETE') {
            if ($user['role'] !== 'admin') fail('Only the owner can delete an appointment. Use Cancel instead.', 403);
            $pdo->prepare('DELETE FROM carwash_appointments WHERE id = ?')->execute([$id]);
            json_out(['ok' => true]);
        }
    }

    // status changes: arrived (checks the car in), no-show, cancelled, done
    if ($method === 'POST' && preg_match('#^carwash/appointments/(\d+)/(confirm|arrived|no-show|cancel|done)$#', $path, $m)) {
        $id = (int) $m[1];
        $act = $m[2];
        $cur = appt_one($pdo, $id);
        $who = appt_who($cur);
        if ($act === 'done') {
            if ($cur['status'] !== 'Arrived') fail('Only a car that has arrived can be marked done', 409);
            $pdo->prepare("UPDATE carwash_appointments SET status = 'Done' WHERE id = ?")->execute([$id]);
            $GLOBALS['notify_text'] = 'marked the appointment done: ' . $who;
            json_out(['appointment' => appt_row(appt_one($pdo, $id))]);
        }
        if ($act === 'confirm') {
            if ($cur['status'] !== 'Booked') fail('This appointment is already ' . strtolower($cur['status']), 409);
            $pdo->prepare("UPDATE carwash_appointments SET status = 'Confirmed' WHERE id = ?")->execute([$id]);
            $GLOBALS['notify_text'] = 'confirmed the appointment with the customer: ' . $who . ' · ' . appt_label($cur['appt_date'], (int) $cur['slot_hour']);
            json_out(['appointment' => appt_row(appt_one($pdo, $id))]);
        }
        if (!in_array($cur['status'], ['Booked', 'Confirmed'], true)) fail('This appointment is already ' . strtolower($cur['status']), 409);

        if ($act === 'cancel' || $act === 'no-show') {
            $new = $act === 'cancel' ? 'Cancelled' : 'No-show';
            $pdo->prepare('UPDATE carwash_appointments SET status = ?, slot_key = NULL WHERE id = ?')->execute([$new, $id]); // frees the slot
            $GLOBALS['notify_text'] = ($act === 'cancel' ? 'cancelled' : 'marked no-show') . ' the appointment: ' . $who . ' · ' . appt_label($cur['appt_date'], (int) $cur['slot_hour']);
            json_out(['appointment' => appt_row(appt_one($pdo, $id))]);
        }

        // arrived: only on the day itself. A pass holder is checked in without a new entry (their wash is recorded with USE A WASH);
        // anyone else gets today's car wash entry, with payment left blank to be filled in when they pay.
        if ($cur['appt_date'] !== $today) fail('This appointment is for ' . appt_label($cur['appt_date'], (int) $cur['slot_hour']) . '. Reschedule it to today first.', 409);
        $pass = null;
        if ($cur['vehicle_number'] !== '' && mem_blocked_reason($pdo, $today) === null) {
            foreach (mem_fetch($pdo) as $p) {
                if ($p['vehicle_number'] === $cur['vehicle_number'] && $p['status'] === 'Active' && $p['washes_left'] > 0 && $p['start_date'] <= $today && $p['payment_mode'] !== 'Credit' && !in_array($today, $p['wash_dates'], true)) { $pass = $p; break; }
            }
        }
        $entryId = null;
        if (!$pass) {
            [$date, $n, $mob, $addr, $mod, $veh, $typ, $svc, $paid, $due, $mode] = cw_clean([
                'entry_date' => $today, 'name' => $cur['name'], 'mobile' => $cur['mobile'], 'vehicle_number' => $cur['vehicle_number'],
                'vehicle_type' => $cur['vehicle_type'], 'model' => $cur['model'], 'service' => $cur['service'], 'paid' => 0, 'payment_mode' => '',
            ]);
            $pdo->prepare('INSERT INTO carwash_entries (entry_date,name,mobile,address,model,vehicle_number,vehicle_type,service,paid,payment_mode,due_on,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
                ->execute([$date, $n, $mob, $addr, $mod, $veh, $typ, $svc, $paid, $mode, $due, $user['id']]);
            $entryId = (int) $pdo->lastInsertId();
        }
        $pdo->prepare("UPDATE carwash_appointments SET status = 'Arrived', entry_id = ? WHERE id = ?")->execute([$entryId, $id]);
        $GLOBALS['notify_text'] = 'checked in the appointment: ' . $who . ($pass ? ' (pass ' . $pass['pass_no'] . ')' : ' (car wash entry created)');
        $out = ['appointment' => appt_row(appt_one($pdo, $id)), 'pass' => $pass ? ['id' => $pass['id'], 'pass_no' => $pass['pass_no'], 'washes_left' => $pass['washes_left']] : null];
        if ($entryId) { $st = $pdo->prepare('SELECT * FROM carwash_entries WHERE id = ?'); $st->execute([$entryId]); $out['entry'] = cw_row($st->fetch()); }
        json_out($out);
    }

    fail('Not found', 404);
}
