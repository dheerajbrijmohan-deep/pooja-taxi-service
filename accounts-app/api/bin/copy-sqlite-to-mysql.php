<?php
// One-off: copy every row from the local SQLite database into MySQL (same table and column names, ids kept).
// Usage: php api/bin/copy-sqlite-to-mysql.php [path-to-sqlite]   (MySQL connection comes from api/config.php)
declare(strict_types=1);
$cfg = require __DIR__ . '/../config.php';
if (($cfg['driver'] ?? '') !== 'mysql') { fwrite(STDERR, "config.php must be set to the mysql driver first\n"); exit(1); }
$src = $argv[1] ?? __DIR__ . '/../data/thepoojagroup.sqlite';
$lite = new PDO('sqlite:' . $src, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$m = $cfg['mysql'];
$my = new PDO("mysql:host={$m['host']};port={$m['port']};dbname={$m['name']};charset=utf8mb4", $m['user'], $m['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);

$my->exec('SET FOREIGN_KEY_CHECKS = 0');
$total = 0;
foreach ($lite->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN) as $t) {
    $rows = $lite->query("SELECT * FROM \"$t\"")->fetchAll();
    $types = [];
    foreach ($my->query("SHOW COLUMNS FROM `$t`")->fetchAll() as $c) $types[$c['Field']] = strtolower($c['Type']);
    $my->exec("DELETE FROM `$t`");
    if (!$rows) { echo str_pad($t, 28) . "0 (empty)\n"; continue; }
    $cols = array_keys($rows[0]);
    $ins = $my->prepare("INSERT INTO `$t` (`" . implode('`,`', $cols) . '`) VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')');
    $my->beginTransaction();
    foreach ($rows as $r) {
        $vals = [];
        foreach ($cols as $c) {
            $v = $r[$c];
            if ($v === '' && preg_match('/^(date|datetime|timestamp)/', $types[$c] ?? '')) $v = null; // empty text is not a valid date in MySQL
            $vals[] = $v;
        }
        $ins->execute($vals);
    }
    $my->commit();
    $n = (int) $my->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
    echo str_pad($t, 28) . count($rows) . ($n === count($rows) ? '  ok' : "  MISMATCH (MySQL has $n)") . "\n";
    $total += $n;
}
$my->exec('SET FOREIGN_KEY_CHECKS = 1');
echo "copied $total rows\n";
