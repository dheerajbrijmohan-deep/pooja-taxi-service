<?php
// One-off / safe to repeat: rewrites car wash vehicle numbers as MH-31 FM-7700 (entries and call comments).
// Usage: php api/bin/normalize-vehicle-numbers.php
require __DIR__ . '/../lib.php';
require __DIR__ . '/../carwash.php';
$pdo = db();
$n = 0;
foreach (['carwash_entries', 'carwash_calls'] as $t) {
    $upd = $pdo->prepare("UPDATE $t SET vehicle_number = ? WHERE vehicle_number = ?");
    foreach ($pdo->query("SELECT DISTINCT vehicle_number FROM $t")->fetchAll(PDO::FETCH_COLUMN) as $v) {
        $new = cw_vehicle((string) $v);
        if ($new !== $v) { $upd->execute([$new, $v]); $n += $upd->rowCount(); }
    }
}
echo "updated $n rows\n";
