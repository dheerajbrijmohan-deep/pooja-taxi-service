<?php
declare(strict_types=1);

// Expenses for every business (supplies, rent and salaries). Each row belongs to one business. Salary rows are owner-only.

function ce_row(array $r): array {
    return [
        'id' => (int) $r['id'],
        'business' => $r['business'],
        'expense_date' => $r['expense_date'],
        'category' => $r['category'],
        'item' => $r['item'],
        'qty' => (float) $r['qty'],
        'price' => (float) $r['price'], // per unit
    ];
}

function ce_clean(array $in, array $user): array {
    $business = (string) ($in['business'] ?? '');
    $date = trim((string) ($in['expense_date'] ?? ''));
    $category = (string) ($in['category'] ?? 'Supplies');
    $item = trim(preg_replace('/\s+/', ' ', (string) ($in['item'] ?? '')));
    $qty = $in['qty'] ?? 1;
    $price = $in['price'] ?? 0;

    if (!in_array($business, EM_BUSINESSES, true)) fail('Choose a valid business', 422);
    if (!cw_valid_date($date)) fail('Enter a valid date', 422);
    if (!in_array($category, ['Supplies', 'Rent', 'Salary'], true)) fail('Choose Supplies, Rent or Salary', 422);
    if ($category === 'Salary' && $user['role'] !== 'admin') fail('Only the owner can enter salaries', 403);
    if ($item === '' || mb_strlen($item) > 100) fail('Enter the item name', 422);
    if (!is_numeric($qty) || $qty <= 0 || $qty > 1000000) fail('Enter a valid quantity', 422);
    if (!is_numeric($price) || $price < 0 || $price > 10000000) fail('Enter a valid price', 422);
    return [$business, $date, $category, $item, round((float) $qty, 2), round((float) $price, 2)];
}

function expenses_route(string $method, string $path, array $user): void {
    $pdo = db();

    if ($method === 'GET' && $path === 'expenses') {
        $business = (string) ($_GET['business'] ?? '');
        if (!in_array($business, EM_BUSINESSES, true)) fail('Choose a valid business', 422);
        $salary = $user['role'] === 'admin' ? '' : " AND category <> 'Salary'";
        $from = (string) ($_GET['from'] ?? '');
        $to = (string) ($_GET['to'] ?? '');
        if (($from !== '' && !cw_valid_date($from)) || ($to !== '' && !cw_valid_date($to))) fail('Enter a valid date range', 422);
        // everyday list: latest 3,000; with a date range (reports): up to 50,000 inside that range
        $ranged = $from !== '' || $to !== '';
        $st = $pdo->prepare("SELECT * FROM expenses WHERE business = ? AND expense_date >= ? AND expense_date <= ?$salary ORDER BY expense_date DESC, id DESC LIMIT " . ($ranged ? 50000 : 3000));
        $st->execute([$business, $from !== '' ? $from : '0000-01-01', $to !== '' ? $to : '9999-12-31']);
        json_out(['expenses' => array_map('ce_row', $st->fetchAll())]);
    }

    if ($method === 'POST' && $path === 'expenses') {
        [$business, $date, $category, $item, $qty, $price] = ce_clean(body(), $user);
        $pdo->prepare('INSERT INTO expenses (business,expense_date,category,item,qty,price,created_by) VALUES (?,?,?,?,?,?,?)')
            ->execute([$business, $date, $category, $item, $qty, $price, $user['id']]);
        $st = $pdo->prepare('SELECT * FROM expenses WHERE id = ?');
        $st->execute([(int) $pdo->lastInsertId()]);
        json_out(['expense' => ce_row($st->fetch())], 201);
    }

    if (preg_match('#^expenses/(\d+)$#', $path, $m)) {
        $id = (int) $m[1];
        if ($method === 'DELETE' && $user['role'] !== 'admin') fail('Only the owner can delete entries', 403); // check before looking the row up
        $st = $pdo->prepare('SELECT * FROM expenses WHERE id = ?');
        $st->execute([$id]);
        $existing = $st->fetch();
        if (!$existing) fail('Expense not found', 404);
        if ($existing['category'] === 'Salary' && $user['role'] !== 'admin') fail('Not allowed', 403);

        if ($method === 'PUT') {
            [$business, $date, $category, $item, $qty, $price] = ce_clean(body(), $user);
            $pdo->prepare('UPDATE expenses SET business=?,expense_date=?,category=?,item=?,qty=?,price=? WHERE id=?')
                ->execute([$business, $date, $category, $item, $qty, $price, $id]);
            $st->execute([$id]);
            json_out(['expense' => ce_row($st->fetch())]);
        }
        if ($method === 'DELETE') {
            if ($user['role'] !== 'admin') fail('Only the owner can delete entries', 403);
            $pdo->prepare('DELETE FROM expenses WHERE id = ?')->execute([$id]);
            json_out(['ok' => true]);
        }
    }

    fail('Not found', 404);
}
