<?php
// Creates tables on the configured database (local dev). On the server, import schema.mysql.sql via phpMyAdmin.
declare(strict_types=1);
require __DIR__ . '/../lib.php';
$file = config()['driver'] === 'sqlite' ? 'schema.sqlite.sql' : 'schema.mysql.sql';
db()->exec(file_get_contents(__DIR__ . "/../$file"));
echo "Schema applied from $file\n";
