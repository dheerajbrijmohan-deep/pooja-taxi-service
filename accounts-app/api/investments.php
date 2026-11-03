<?php
declare(strict_types=1);

// Setup / capital investments (documentation fees, rent agreement, security deposit, interiors...) and loans with their
// disbursements, per business. Owner-only. The summary works out ROI and the break-even period from what each business
// earns and spends (operating income minus expenses) against the total invested.

const INV_MODES = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Cheque'];
const INV_FUNDED = ['Own funds', 'Loan'];

function inv_row(array $r): array {
    return [
        'id' => (int) $r['id'], 'business' => $r['business'], 'invest_date' => $r['invest_date'], 'category' => $r['category'], 'item' => $r['item'],
        'paid_to' => $r['paid_to'], 'amount' => (float) $r['amount'], 'payment_mode' => $r['payment_mode'], 'funded_by' => $r['funded_by'],
        'refundable' => (bool) $r['refundable'], 'notes' => $r['notes'],
    ];
}

function inv_money(mixed $v, string $label, bool $allowZero = false): float {
    if (!is_numeric($v) || ($allowZero ? $v < 0 : $v <= 0) || $v > 1000000000) fail("Enter a valid $label", 422);
    return round((float) $v, 2);
}

function inv_clean(array $in): array {
    $business = (string) ($in['business'] ?? '');
    $date = trim((string) ($in['invest_date'] ?? ''));
    $category = trim((string) ($in['category'] ?? ''));
    $item = trim((string) ($in['item'] ?? ''));
    $paidTo = trim((string) ($in['paid_to'] ?? ''));
    $mode = (string) ($in['payment_mode'] ?? 'Bank transfer');
    $funded = (string) ($in['funded_by'] ?? 'Own funds');
    $notes = trim((string) ($in['notes'] ?? ''));
    if (!in_array($business, EM_BUSINESSES, true)) fail('Choose the business', 422);
    if (!cw_valid_date($date)) fail('Enter a valid date', 422);
    if ($category === '' || mb_strlen($category) > 60) fail('Enter the category (up to 60 characters)', 422);
    if ($item === '' || mb_strlen($item) > 150) fail('Describe what was paid for (up to 150 characters)', 422);
    if (mb_strlen($paidTo) > 100) fail('"Paid to" is too long', 422);
    if (!in_array($mode, INV_MODES, true)) fail('Choose how it was paid', 422);
    if (!in_array($funded, INV_FUNDED, true)) fail('Choose Own funds or Loan', 422);
    if (mb_strlen($notes) > 500) fail('Notes are too long', 422);
    return [$business, $date, $category, $item, $paidTo, inv_money($in['amount'] ?? null, 'amount'), $mode, $funded, !empty($in['refundable']) ? 1 : 0, $notes];
}

function loan_clean(array $in): array {
    $business = (string) ($in['business'] ?? '');
    $lender = trim((string) ($in['lender'] ?? ''));
    $date = trim((string) ($in['sanction_date'] ?? ''));
    $notes = trim((string) ($in['notes'] ?? ''));
    $rate = $in['interest_rate'] ?? null;
    $tenure = $in['tenure_months'] ?? null;
    if ($business !== '' && !in_array($business, EM_BUSINESSES, true)) fail('Choose a valid business', 422);
    if ($lender === '' || mb_strlen($lender) > 100) fail('Enter the lender (bank / person)', 422);
    if (!cw_valid_date($date)) fail('Enter a valid date', 422);
    if (mb_strlen($notes) > 300) fail('Notes are too long', 422);
    if ($rate === '' || $rate === null) $rate = null;
    elseif (!is_numeric($rate) || $rate < 0 || $rate > 100) fail('Interest rate must be between 0 and 100', 422);
    else $rate = round((float) $rate, 2);
    if ($tenure === '' || $tenure === null) $tenure = null;
    elseif (!is_numeric($tenure) || (float) $tenure != (int) $tenure || $tenure < 1 || $tenure > 600) fail('Tenure must be 1 to 600 months', 422);
    else $tenure = (int) $tenure;
    return [$business, $lender, inv_money($in['sanctioned'] ?? null, 'sanctioned amount'), $rate, $tenure, $date, $notes];
}

function inv_loan_rows(PDO $pdo, string $business = ''): array {
    // a specific business: only its own loans; all businesses: every loan (including ones not tied to a business)
    if ($business === '') $st = $pdo->query('SELECT * FROM loans ORDER BY sanction_date DESC, id DESC');
    else { $st = $pdo->prepare('SELECT * FROM loans WHERE business = ? ORDER BY sanction_date DESC, id DESC'); $st->execute([$business]); }
    $loans = $st->fetchAll();
    $out = [];
    foreach ($loans as $l) {
        $d = $pdo->prepare('SELECT * FROM loan_disbursements WHERE loan_id = ? ORDER BY disb_date ASC, id ASC');
        $d->execute([$l['id']]);
        $disb = array_map(fn($x) => ['id' => (int) $x['id'], 'disb_date' => $x['disb_date'], 'amount' => (float) $x['amount'], 'note' => $x['note']], $d->fetchAll());
        $sum = array_sum(array_column($disb, 'amount'));
        $out[] = [
            'id' => (int) $l['id'], 'business' => $l['business'], 'lender' => $l['lender'], 'sanctioned' => (float) $l['sanctioned'],
            'interest_rate' => $l['interest_rate'] !== null ? (float) $l['interest_rate'] : null, 'tenure_months' => $l['tenure_months'] !== null ? (int) $l['tenure_months'] : null,
            'sanction_date' => $l['sanction_date'], 'notes' => $l['notes'],
            'disbursed' => round($sum, 2), 'pending' => round((float) $l['sanctioned'] - $sum, 2), 'disbursements' => $disb,
        ];
    }
    return $out;
}

// monthly money a business earns: [ 'YYYY-MM' => amount ]
function inv_income(PDO $pdo, string $business): array {
    $q = function (string $sql, array $args = []) use ($pdo): array {
        $st = $pdo->prepare($sql);
        $st->execute($args);
        return array_column($st->fetchAll(), 'v', 'm');
    };
    if ($business === 'AutoShine Premium Car Wash') return array_map('floatval', $q('SELECT SUBSTR(entry_date,1,7) AS m, SUM(paid) AS v FROM carwash_entries GROUP BY SUBSTR(entry_date,1,7)'));
    return taxi_income_by_month($pdo);
}

function inv_opex(PDO $pdo, string $business): array {
    $extra = $business === 'Pooja Taxi Services' ? taxi_opex_by_month($pdo) : []; // driver share, fuel and supplies come from the trip sheet
    $st = $pdo->prepare('SELECT SUBSTR(expense_date,1,7) AS m, SUM(qty * price) AS v FROM expenses WHERE business = ? GROUP BY SUBSTR(expense_date,1,7)');
    $st->execute([$business]);
    $out = array_map('floatval', array_column($st->fetchAll(), 'v', 'm'));
    foreach ($extra as $m => $v) $out[$m] = ($out[$m] ?? 0) + $v;
    return $out;
}

function inv_add_months(string $ym, int $n): string {
    return date('Y-m', strtotime($ym . '-01 +' . $n . ' months'));
}

function inv_summary(PDO $pdo, string $business, bool $excludeRefundable): array {
    $bizList = $business === '' ? EM_BUSINESSES : [$business];
    $in = implode(',', array_fill(0, count($bizList), '?'));
    $st = $pdo->prepare("SELECT * FROM investments WHERE business IN ($in)");
    $st->execute($bizList);
    $inv = $st->fetchAll();

    $total = $refundable = $own = $loanFunded = 0.0;
    $byCat = [];
    $byMonth = [];
    foreach ($inv as $r) {
        $a = (float) $r['amount'];
        $total += $a;
        if ($r['refundable']) $refundable += $a;
        if ($r['funded_by'] === 'Loan') $loanFunded += $a; else $own += $a;
        $byCat[$r['category']] = ($byCat[$r['category']] ?? 0) + $a;
        $m = substr($r['invest_date'], 0, 7);
        $byMonth[$m] = ($byMonth[$m] ?? 0) + $a;
    }
    arsort($byCat);
    $base = $excludeRefundable ? $total - $refundable : $total; // the amount that has to be earned back

    $income = $opex = [];
    foreach ($bizList as $b) {
        foreach (inv_income($pdo, $b) as $m => $v) $income[$m] = ($income[$m] ?? 0) + $v;
        foreach (inv_opex($pdo, $b) as $m => $v) $opex[$m] = ($opex[$m] ?? 0) + $v;
    }
    $thisMonth = date('Y-m');
    $all = array_merge(array_keys($income), array_keys($opex), array_keys($byMonth));
    $first = $all ? min($all) : $thisMonth;
    $months = [];
    $cum = 0.0;
    for ($m = $first; $m <= $thisMonth; $m = inv_add_months($m, 1)) {
        $i = round($income[$m] ?? 0, 2);
        $e = round($opex[$m] ?? 0, 2);
        $net = round($i - $e, 2);
        $cum = round($cum + $net, 2);
        $months[] = ['month' => $m, 'invested' => round($byMonth[$m] ?? 0, 2), 'income' => $i, 'expenses' => $e, 'net' => $net, 'cumulative' => $cum];
    }
    $netTotal = $cum;
    $incomeTotal = round(array_sum($income), 2);
    $opexTotal = round(array_sum($opex), 2);

    // launch = first month with any income. Averages use the months since launch; the current (unfinished) month is left out
    // once there is at least one finished month after launch.
    $launch = null;
    foreach ($months as $m) if ($m['income'] > 0) { $launch = $m['month']; break; }
    $roi = ['status' => 'not_launched', 'launch_month' => null, 'avg_monthly_net' => null, 'recent_monthly_net' => null, 'roi_to_date_pct' => null, 'roi_annual_pct' => null, 'months_to_breakeven' => null, 'breakeven_month' => null];
    if ($launch !== null) {
        $post = array_values(array_filter($months, fn($m) => $m['month'] >= $launch));
        $use = count($post) > 1 ? array_slice($post, 0, -1) : $post;
        $avg = array_sum(array_column($use, 'net')) / count($use);
        $recentSet = array_slice($use, -3);
        $recent = array_sum(array_column($recentSet, 'net')) / count($recentSet);
        $roi['launch_month'] = $launch;
        $roi['avg_monthly_net'] = round($avg, 2);
        $roi['recent_monthly_net'] = round($recent, 2);
        $roi['roi_to_date_pct'] = $base > 0 ? round($netTotal / $base * 100, 1) : null;
        $roi['roi_annual_pct'] = $base > 0 ? round($recent * 12 / $base * 100, 1) : null;
        if ($base <= 0) {
            $roi['status'] = 'no_investment';
        } elseif ($netTotal >= $base) {
            $roi['status'] = 'recovered';
            foreach ($months as $m) if ($m['cumulative'] >= $base) { $roi['breakeven_month'] = $m['month']; break; }
        } elseif ($recent > 0) {
            $left = (int) ceil(($base - $netTotal) / $recent);
            $roi['status'] = 'on_track';
            $roi['months_to_breakeven'] = $left;
            $roi['breakeven_month'] = inv_add_months($thisMonth, $left);
        } else {
            $roi['status'] = 'not_profitable';
        }
    }

    $loans = inv_loan_rows($pdo, $business);
    $sanctioned = round(array_sum(array_column($loans, 'sanctioned')), 2);
    $disbursed = round(array_sum(array_column($loans, 'disbursed')), 2);

    return [
        'business' => $business,
        'invested' => ['total' => round($total, 2), 'refundable' => round($refundable, 2), 'non_refundable' => round($total - $refundable, 2), 'base' => round($base, 2), 'own_funds' => round($own, 2), 'loan_funded' => round($loanFunded, 2), 'count' => count($inv),
                       'by_category' => array_map(fn($k, $v) => ['category' => $k, 'amount' => round($v, 2)], array_keys($byCat), array_values($byCat))],
        'loans' => ['count' => count($loans), 'sanctioned' => $sanctioned, 'disbursed' => $disbursed, 'pending' => round($sanctioned - $disbursed, 2)],
        'operating' => ['income' => $incomeTotal, 'expenses' => $opexTotal, 'net' => round($netTotal, 2), 'months' => $months],
        'roi' => $roi,
        'recovered_pct' => $base > 0 ? round($netTotal / $base * 100, 1) : null,
        'exclude_refundable' => $excludeRefundable,
    ];
}

function investments_route(string $method, string $path, array $user): void {
    $pdo = db();
    $biz = (string) ($_GET['business'] ?? '');
    if ($biz !== '' && !in_array($biz, EM_BUSINESSES, true)) fail('Choose a valid business', 422);

    // ---------------------------------------------------------------- investments
    if ($method === 'GET' && $path === 'investments') {
        $from = (string) ($_GET['from'] ?? '');
        $to = (string) ($_GET['to'] ?? '');
        if (($from !== '' && !cw_valid_date($from)) || ($to !== '' && !cw_valid_date($to))) fail('Enter a valid date range', 422);
        $sql = 'SELECT * FROM investments WHERE invest_date >= ? AND invest_date <= ?';
        $args = [$from !== '' ? $from : '1900-01-01', $to !== '' ? $to : '9999-12-31'];
        if ($biz !== '') { $sql .= ' AND business = ?'; $args[] = $biz; }
        $st = $pdo->prepare($sql . ' ORDER BY invest_date DESC, id DESC LIMIT 20000');
        $st->execute($args);
        json_out(['investments' => array_map('inv_row', $st->fetchAll())]);
    }
    if ($method === 'GET' && $path === 'investments/summary') {
        json_out(['summary' => inv_summary($pdo, $biz, (string) ($_GET['exclude_refundable'] ?? '') === '1')]);
    }
    if ($method === 'POST' && $path === 'investments') {
        $v = inv_clean(body());
        $pdo->prepare('INSERT INTO investments (business,invest_date,category,item,paid_to,amount,payment_mode,funded_by,refundable,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)')->execute([...$v, $user['id']]);
        $st = $pdo->prepare('SELECT * FROM investments WHERE id = ?');
        $st->execute([(int) $pdo->lastInsertId()]);
        json_out(['investment' => inv_row($st->fetch())], 201);
    }
    if (preg_match('#^investments/(\d+)$#', $path, $m)) {
        $id = (int) $m[1];
        $st = $pdo->prepare('SELECT * FROM investments WHERE id = ?');
        $st->execute([$id]);
        if (!$st->fetch()) fail('Investment not found', 404);
        if ($method === 'PUT') {
            $v = inv_clean(body());
            $pdo->prepare('UPDATE investments SET business=?,invest_date=?,category=?,item=?,paid_to=?,amount=?,payment_mode=?,funded_by=?,refundable=?,notes=? WHERE id=?')->execute([...$v, $id]);
            $st->execute([$id]);
            json_out(['investment' => inv_row($st->fetch())]);
        }
        if ($method === 'DELETE') {
            $pdo->prepare('DELETE FROM investments WHERE id = ?')->execute([$id]);
            json_out(['ok' => true]);
        }
    }

    // ---------------------------------------------------------------- loans
    if ($method === 'GET' && $path === 'loans') {
        json_out(['loans' => inv_loan_rows($pdo, $biz)]);
    }
    if ($method === 'POST' && $path === 'loans') {
        $v = loan_clean(body());
        $pdo->prepare('INSERT INTO loans (business,lender,sanctioned,interest_rate,tenure_months,sanction_date,notes,created_by) VALUES (?,?,?,?,?,?,?,?)')->execute([...$v, $user['id']]);
        $id = (int) $pdo->lastInsertId();
        json_out(['loan' => array_values(array_filter(inv_loan_rows($pdo), fn($l) => $l['id'] === $id))[0]], 201);
    }
    if (preg_match('#^loans/(\d+)$#', $path, $m)) {
        $id = (int) $m[1];
        $loan = array_values(array_filter(inv_loan_rows($pdo), fn($l) => $l['id'] === $id))[0] ?? null;
        if (!$loan) fail('Loan not found', 404);
        if ($method === 'PUT') {
            $v = loan_clean(body());
            if ($v[2] < $loan['disbursed']) fail('The sanctioned amount cannot be less than what is already disbursed (₹' . number_format($loan['disbursed']) . ')', 422);
            $pdo->prepare('UPDATE loans SET business=?,lender=?,sanctioned=?,interest_rate=?,tenure_months=?,sanction_date=?,notes=? WHERE id=?')->execute([...$v, $id]);
            json_out(['loan' => array_values(array_filter(inv_loan_rows($pdo), fn($l) => $l['id'] === $id))[0]]);
        }
        if ($method === 'DELETE') {
            $pdo->prepare('DELETE FROM loan_disbursements WHERE loan_id = ?')->execute([$id]);
            $pdo->prepare('DELETE FROM loans WHERE id = ?')->execute([$id]);
            json_out(['ok' => true]);
        }
    }
    if ($method === 'POST' && preg_match('#^loans/(\d+)/disbursements$#', $path, $m)) {
        $id = (int) $m[1];
        $loan = array_values(array_filter(inv_loan_rows($pdo), fn($l) => $l['id'] === $id))[0] ?? null;
        if (!$loan) fail('Loan not found', 404);
        $in = body();
        $date = trim((string) ($in['disb_date'] ?? ''));
        $note = trim((string) ($in['note'] ?? ''));
        if (!cw_valid_date($date)) fail('Enter a valid date', 422);
        if (mb_strlen($note) > 200) fail('Note is too long', 422);
        $amount = inv_money($in['amount'] ?? null, 'amount');
        if ($amount > $loan['pending'] + 0.001) fail('That is more than the amount still to be disbursed (₹' . number_format($loan['pending']) . ')', 422);
        $pdo->prepare('INSERT INTO loan_disbursements (loan_id,disb_date,amount,note,created_by) VALUES (?,?,?,?,?)')->execute([$id, $date, $amount, $note, $user['id']]);
        json_out(['loan' => array_values(array_filter(inv_loan_rows($pdo), fn($l) => $l['id'] === $id))[0]], 201);
    }
    if ($method === 'DELETE' && preg_match('#^loans/disbursements/(\d+)$#', $path, $m)) {
        $st = $pdo->prepare('SELECT COUNT(*) FROM loan_disbursements WHERE id = ?');
        $st->execute([(int) $m[1]]);
        if (!(int) $st->fetchColumn()) fail('Disbursement not found', 404);
        $pdo->prepare('DELETE FROM loan_disbursements WHERE id = ?')->execute([(int) $m[1]]);
        json_out(['ok' => true]);
    }

    fail('Not found', 404);
}
