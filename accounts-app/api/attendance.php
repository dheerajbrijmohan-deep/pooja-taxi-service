<?php
declare(strict_types=1);

// Attendance (owner + manager) and salary sheets / slips (owner only).
// Rules: daily rate = monthly salary / calendar days in that month (so full attendance = full salary); no weekly off;
// half day = 0.5; paid leave = 1; no overtime; one bonus per month.

const ATT_STATUSES = ['Present', 'Half day', 'Absent', 'Leave'];

function att_month_ok(string $m): bool {
    return (bool) preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $m);
}

// Days (1-based) of $month on which an employee can be marked / is paid for, or null. Never includes future days.
function att_window(array $e, string $month): ?array {
    if ($e['status'] === 'Left' && !$e['leave_date']) return null; // left, but no leaving date recorded
    $first = $month . '-01';
    $last = $month . '-' . date('t', strtotime($first));
    $from = ($e['join_date'] && $e['join_date'] > $first) ? $e['join_date'] : $first;
    $to = min($last, date('Y-m-d'));
    if ($e['leave_date'] && $e['leave_date'] < $to) $to = $e['leave_date'];
    if ($from > $to) return null;
    return [(int) substr($from, 8, 2), (int) substr($to, 8, 2)];
}

function att_employees(PDO $pdo): array {
    $biz = em_scope_business(); // each business has its own attendance and salary sheet
    $st = $pdo->prepare("SELECT id, full_name, designation, business, join_date, leave_date, status, monthly_salary, bank_name, bank_account, ifsc, phone FROM employees WHERE (? = '' OR business = ?) ORDER BY full_name");
    $st->execute([$biz, $biz]);
    return $st->fetchAll();
}

function att_find_employee(PDO $pdo, int $id): array {
    $st = $pdo->prepare('SELECT * FROM employees WHERE id = ?');
    $st->execute([$id]);
    $e = $st->fetch();
    if (!$e) fail('Employee not found', 404);
    return $e;
}

function att_sheet(PDO $pdo, int $empId, string $month): ?array {
    $st = $pdo->prepare('SELECT * FROM salary_sheets WHERE employee_id = ? AND month = ?');
    $st->execute([$empId, $month]);
    return $st->fetch() ?: null;
}

function att_is_paid(PDO $pdo, int $empId, string $month): bool {
    $s = att_sheet($pdo, $empId, $month);
    return $s !== null && $s['status'] === 'Paid';
}

// marks for a month: [employee_id => [day => status]]
function att_month_marks(PDO $pdo, string $month): array {
    $st = $pdo->prepare('SELECT employee_id, att_date, status FROM attendance WHERE att_date >= ? AND att_date <= ?');
    $st->execute([$month . '-01', $month . '-31']);
    $out = [];
    foreach ($st->fetchAll() as $r) $out[(int) $r['employee_id']][(int) substr($r['att_date'], 8, 2)] = $r['status'];
    return $out;
}

// Salary is always worked out on a 30-day month (daily rate = monthly salary / 30), whatever the calendar month has.
function att_days_in(string $month): int {
    return 30;
}

function sal_compute(array $e, string $month, array $marks, ?array $sheet): array {
    $w = att_window($e, $month);
    $c = ['Present' => 0, 'Half day' => 0, 'Leave' => 0, 'Absent' => 0];
    $marked = 0;
    foreach ($marks as $day => $status) {
        if ($w && $day >= $w[0] && $day <= $w[1] && isset($c[$status])) { $c[$status]++; $marked++; }
    }
    $windowDays = $w ? $w[1] - $w[0] + 1 : 0;
    $paid = $sheet !== null && $sheet['status'] === 'Paid';
    $payable = $paid ? (float) $sheet['snap_days'] : $c['Present'] + 0.5 * $c['Half day'] + $c['Leave'];
    $salary = $paid ? (float) $sheet['snap_salary'] : (float) $e['monthly_salary'];
    $earned = $paid ? (float) $sheet['snap_earned'] : (float) round($salary * $payable / att_days_in($month));
    $bonus = $sheet ? (float) $sheet['bonus'] : 0.0;
    return [
        'employee_id' => (int) $e['id'], 'name' => $e['full_name'], 'designation' => $e['designation'], 'business' => $e['business'],
        'monthly_salary' => $salary, 'present' => $c['Present'], 'half_days' => $c['Half day'], 'leave' => $c['Leave'], 'absent' => $c['Absent'],
        'unmarked' => $windowDays - $marked, 'payable_days' => $payable, 'earned' => $earned,
        'bonus' => $bonus, 'bonus_note' => $sheet['bonus_note'] ?? '', 'net' => $earned + $bonus,
        'status' => $paid ? 'Paid' : 'Open', 'paid_on' => $paid ? $sheet['paid_on'] : null,
    ];
}

function attendance_route(string $method, string $path, array $user): void {
    $pdo = db();
    $today = date('Y-m-d');

    if ($method === 'GET' && $path === 'attendance/day') {
        $date = (string) ($_GET['date'] ?? $today);
        if (!cw_valid_date($date)) fail('Enter a valid date', 422);
        $month = substr($date, 0, 7);
        $day = (int) substr($date, 8, 2);
        $st = $pdo->prepare('SELECT employee_id, status FROM attendance WHERE att_date = ?');
        $st->execute([$date]);
        $marks = array_column($st->fetchAll(), 'status', 'employee_id');
        $st = $pdo->prepare("SELECT employee_id FROM salary_sheets WHERE month = ? AND status = 'Paid'");
        $st->execute([$month]);
        $locked = array_flip(array_column($st->fetchAll(), 'employee_id'));
        $out = [];
        foreach (att_employees($pdo) as $e) {
            $w = att_window($e, $month);
            if (!$w || $day < $w[0] || $day > $w[1]) continue;
            $out[] = ['id' => (int) $e['id'], 'name' => $e['full_name'], 'designation' => $e['designation'], 'business' => $e['business'],
                'status' => $marks[$e['id']] ?? null, 'locked' => isset($locked[$e['id']])];
        }
        json_out(['date' => $date, 'today' => $today, 'employees' => $out, 'businesses' => EM_BUSINESSES]);
    }

    if ($method === 'PUT' && $path === 'attendance') {
        $in = body();
        $e = att_find_employee($pdo, (int) ($in['employee_id'] ?? 0));
        $date = (string) ($in['date'] ?? '');
        $status = $in['status'] ?? null;
        if (!cw_valid_date($date)) fail('Enter a valid date', 422);
        if ($date > $today) fail('You cannot mark attendance for a future date', 422);
        if ($status !== null && !in_array($status, ATT_STATUSES, true)) fail('Choose Present, Half day, Absent or Leave', 422);
        $w = att_window($e, substr($date, 0, 7));
        $day = (int) substr($date, 8, 2);
        if (!$w || $day < $w[0] || $day > $w[1]) fail('This employee was not working on that date', 422);
        if (att_is_paid($pdo, (int) $e['id'], substr($date, 0, 7))) fail('Salary for this month is already paid. The owner must undo it before changing attendance.', 409);

        $pdo->prepare('DELETE FROM attendance WHERE employee_id = ? AND att_date = ?')->execute([$e['id'], $date]);
        if ($status !== null) {
            $pdo->prepare('INSERT INTO attendance (employee_id, att_date, status, marked_by, marked_at) VALUES (?,?,?,?,?)')
                ->execute([$e['id'], $date, $status, $user['id'], date('Y-m-d H:i:s')]);
        }
        json_out(['ok' => true]);
    }

    // mark every unmarked, eligible employee in the list as Present
    if ($method === 'POST' && $path === 'attendance/fill') {
        $in = body();
        $date = (string) ($in['date'] ?? '');
        if (!cw_valid_date($date) || $date > $today) fail('Enter a valid date', 422);
        $month = substr($date, 0, 7);
        $day = (int) substr($date, 8, 2);
        $ids = array_map('intval', (array) ($in['employee_ids'] ?? []));
        $n = 0;
        foreach (att_employees($pdo) as $e) {
            if (!in_array((int) $e['id'], $ids, true)) continue;
            $w = att_window($e, $month);
            if (!$w || $day < $w[0] || $day > $w[1] || att_is_paid($pdo, (int) $e['id'], $month)) continue;
            $st = $pdo->prepare('SELECT COUNT(*) FROM attendance WHERE employee_id = ? AND att_date = ?');
            $st->execute([$e['id'], $date]);
            if ((int) $st->fetchColumn()) continue;
            $pdo->prepare('INSERT INTO attendance (employee_id, att_date, status, marked_by, marked_at) VALUES (?,?,?,?,?)')
                ->execute([$e['id'], $date, 'Present', $user['id'], date('Y-m-d H:i:s')]);
            $n++;
        }
        json_out(['marked' => $n]);
    }

    if ($method === 'GET' && $path === 'attendance/month') {
        $month = (string) ($_GET['month'] ?? substr($today, 0, 7));
        if (!att_month_ok($month)) fail('Enter a valid month', 422);
        $marks = att_month_marks($pdo, $month);
        $st = $pdo->prepare("SELECT employee_id FROM salary_sheets WHERE month = ? AND status = 'Paid'");
        $st->execute([$month]);
        $locked = array_flip(array_column($st->fetchAll(), 'employee_id'));
        $out = [];
        foreach (att_employees($pdo) as $e) {
            $w = att_window($e, $month);
            if (!$w) continue;
            $out[] = ['id' => (int) $e['id'], 'name' => $e['full_name'], 'designation' => $e['designation'], 'business' => $e['business'],
                'from_day' => $w[0], 'to_day' => $w[1], 'locked' => isset($locked[$e['id']]), 'marks' => (object) ($marks[(int) $e['id']] ?? [])];
        }
        json_out(['month' => $month, 'days' => (int) date('t', strtotime($month . '-01')), 'today' => $today, 'employees' => $out, 'businesses' => EM_BUSINESSES]);
    }

    fail('Not found', 404);
}

function salary_route(string $method, string $path, array $user): void {
    $pdo = db();
    $today = date('Y-m-d');
    $monthOf = function (array $src) use ($today): string {
        $m = (string) ($src['month'] ?? substr($today, 0, 7));
        if (!att_month_ok($m)) fail('Enter a valid month', 422);
        return $m;
    };

    if ($method === 'GET' && $path === 'salary/sheet') {
        $month = $monthOf($_GET);
        $marks = att_month_marks($pdo, $month);
        $st = $pdo->prepare('SELECT * FROM salary_sheets WHERE month = ?');
        $st->execute([$month]);
        $sheets = [];
        foreach ($st->fetchAll() as $s) $sheets[(int) $s['employee_id']] = $s;
        $rows = [];
        foreach (att_employees($pdo) as $e) {
            $id = (int) $e['id'];
            if (!att_window($e, $month) && !isset($sheets[$id])) continue;
            $rows[] = sal_compute($e, $month, $marks[$id] ?? [], $sheets[$id] ?? null);
        }
        json_out(['month' => $month, 'day_basis' => att_days_in($month), 'rows' => $rows]);
    }

    if ($method === 'PUT' && $path === 'salary/bonus') {
        $in = body();
        $month = $monthOf($in);
        $e = att_find_employee($pdo, (int) ($in['employee_id'] ?? 0));
        $bonus = $in['bonus'] ?? 0;
        $note = trim((string) ($in['note'] ?? ''));
        if (!is_numeric($bonus) || $bonus < 0 || $bonus > 10000000) fail('Enter a valid bonus amount', 422);
        if (mb_strlen($note) > 200) fail('Bonus note is too long', 422);
        $sheet = att_sheet($pdo, (int) $e['id'], $month);
        if ($sheet && $sheet['status'] === 'Paid') fail('Salary is already paid. Undo it first to change the bonus.', 409);
        if ($sheet) {
            $pdo->prepare('UPDATE salary_sheets SET bonus=?, bonus_note=?, updated_by=?, updated_at=? WHERE id=?')
                ->execute([round((float) $bonus, 2), $note, $user['id'], date('Y-m-d H:i:s'), $sheet['id']]);
        } else {
            $pdo->prepare('INSERT INTO salary_sheets (employee_id, month, bonus, bonus_note, updated_by, updated_at) VALUES (?,?,?,?,?,?)')
                ->execute([$e['id'], $month, round((float) $bonus, 2), $note, $user['id'], date('Y-m-d H:i:s')]);
        }
        json_out(['ok' => true]);
    }

    if ($method === 'POST' && $path === 'salary/pay') {
        $in = body();
        $month = $monthOf($in);
        if ($month > substr($today, 0, 7)) fail('You cannot pay salary for a future month', 422);
        $e = att_find_employee($pdo, (int) ($in['employee_id'] ?? 0));
        $sheet = att_sheet($pdo, (int) $e['id'], $month);
        if ($sheet && $sheet['status'] === 'Paid') fail('Already marked as paid', 409);
        $marks = att_month_marks($pdo, $month)[(int) $e['id']] ?? [];
        $r = sal_compute($e, $month, $marks, $sheet);

        // the paid amount is also recorded as a Salary expense under the business the employee belongs to
        $expenseId = null;
        if (in_array($e['business'], EM_BUSINESSES, true) && $r['net'] > 0) {
            $item = 'Salary - ' . $e['full_name'] . ' (' . date('M Y', strtotime($month . '-01')) . ')';
            $pdo->prepare('INSERT INTO expenses (business,expense_date,category,item,qty,price,created_by) VALUES (?,?,?,?,?,?,?)')
                ->execute([$e['business'], $today, 'Salary', mb_substr($item, 0, 100), 1, $r['net'], $user['id']]);
            $expenseId = (int) $pdo->lastInsertId();
        }
        $vals = [$r['monthly_salary'], $r['payable_days'], $r['earned'], $today, $expenseId, $user['id'], date('Y-m-d H:i:s')];
        if ($sheet) {
            $pdo->prepare("UPDATE salary_sheets SET status='Paid', snap_salary=?, snap_days=?, snap_earned=?, paid_on=?, expense_id=?, updated_by=?, updated_at=? WHERE id=?")
                ->execute([...$vals, $sheet['id']]);
        } else {
            $pdo->prepare("INSERT INTO salary_sheets (snap_salary, snap_days, snap_earned, paid_on, expense_id, updated_by, updated_at, employee_id, month, status) VALUES (?,?,?,?,?,?,?,?,?,'Paid')")
                ->execute([...$vals, $e['id'], $month]);
        }
        json_out(['ok' => true, 'expense_added' => $expenseId !== null, 'expense_business' => $expenseId !== null ? $e['business'] : null]);
    }

    if ($method === 'POST' && $path === 'salary/unpay') {
        $in = body();
        $month = $monthOf($in);
        $sheet = att_sheet($pdo, (int) ($in['employee_id'] ?? 0), $month);
        if (!$sheet || $sheet['status'] !== 'Paid') fail('This salary is not marked as paid', 409);
        if ($sheet['expense_id']) $pdo->prepare('DELETE FROM expenses WHERE id = ?')->execute([$sheet['expense_id']]);
        $pdo->prepare("UPDATE salary_sheets SET status='Open', snap_salary=NULL, snap_days=NULL, snap_earned=NULL, paid_on=NULL, expense_id=NULL, updated_by=?, updated_at=? WHERE id=?")
            ->execute([$user['id'], date('Y-m-d H:i:s'), $sheet['id']]);
        json_out(['ok' => true]);
    }

    if ($method === 'GET' && $path === 'salary/slip') {
        $month = $monthOf($_GET);
        $e = att_find_employee($pdo, (int) ($_GET['employee_id'] ?? 0));
        $sheet = att_sheet($pdo, (int) $e['id'], $month);
        $r = sal_compute($e, $month, att_month_marks($pdo, $month)[(int) $e['id']] ?? [], $sheet);
        $acct = $e['bank_account'];
        json_out(['slip' => $r + [
            'month' => $month, 'day_basis' => att_days_in($month), 'slip_no' => 'SLP-' . str_replace('-', '', $month) . '-' . str_pad((string) $e['id'], 3, '0', STR_PAD_LEFT),
            'father_name' => $e['father_name'], 'phone' => $e['phone'], 'join_date' => $e['join_date'],
            'bank_name' => $e['bank_name'], 'bank_last4' => $acct !== '' ? substr($acct, -4) : '', 'ifsc' => $e['ifsc'],
        ]]);
    }

    fail('Not found', 404);
}
