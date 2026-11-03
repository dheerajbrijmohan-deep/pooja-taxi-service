<?php
// Usage: php api/bin/create-user.php <username> "<Full Name>" <admin|manager> [--sql]
// Prompts for the password (not echoed). With --sql it prints an INSERT for phpMyAdmin
// instead of writing to the configured database.
declare(strict_types=1);
require __DIR__ . '/../lib.php';

[$self, $username, $name, $role] = array_pad($argv, 4, null);
if (!$username || !$name || !in_array($role, ['admin', 'manager'], true)) {
    fwrite(STDERR, "Usage: php create-user.php <username> \"<Full Name>\" <admin|manager> [--sql]\n");
    exit(1);
}
fwrite(STDERR, 'Password (min 10 chars): ');
system('stty -echo');
$pw = trim((string) fgets(STDIN));
system('stty echo');
fwrite(STDERR, "\n");
if (strlen($pw) < 10) { fwrite(STDERR, "Password too short.\n"); exit(1); }

$username = strtolower($username);
$hash = password_hash($pw, PASSWORD_DEFAULT);

if (in_array('--sql', $argv, true)) {
    $q = fn(string $s) => "'" . str_replace("'", "''", $s) . "'";
    echo "INSERT INTO users (username, name, password_hash, role) VALUES ({$q($username)}, {$q($name)}, {$q($hash)}, {$q($role)});\n";
    exit(0);
}
db()->prepare('INSERT INTO users (username, name, password_hash, role) VALUES (?,?,?,?)')
    ->execute([$username, $name, $hash, $role]);
echo "User '$username' ($role) created.\n";
