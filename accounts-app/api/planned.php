<?php
declare(strict_types=1);

// Businesses that are being planned but are not running: no dashboard, no operations. Only what has been spent so far is shown
// (expenses already recorded against them, kept as they were entered).

const PLANNED_BUSINESSES = [
    ['name' => 'Tiny Tumbles', 'about' => 'Kids play zone'],
];

function planned_route(string $method, array $user): void {
    if ($method !== 'GET') fail('Not found', 404);
    $pdo = db();
    $out = [];
    foreach (PLANNED_BUSINESSES as $b) {
        $st = $pdo->prepare('SELECT expense_date, category, item, qty, price FROM expenses WHERE business = ? ORDER BY expense_date DESC, id DESC');
        $st->execute([$b['name']]);
        $rows = array_map(fn($r) => ['expense_date' => $r['expense_date'], 'category' => $r['category'], 'item' => $r['item'], 'qty' => (float) $r['qty'], 'price' => (float) $r['price'], 'total' => round((float) $r['qty'] * (float) $r['price'], 2)], $st->fetchAll());
        $out[] = ['name' => $b['name'], 'about' => $b['about'], 'spend_total' => round(array_sum(array_column($rows, 'total')), 2), 'spend' => $rows];
    }
    json_out(['planned' => $out]);
}
