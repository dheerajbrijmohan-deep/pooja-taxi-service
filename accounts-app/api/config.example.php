<?php
// Copy to config.php and fill in. config.php is never committed.
return [
    // 'sqlite' for local development, 'mysql' on the server
    'driver' => 'mysql',
    'mysql' => [
        'host' => 'localhost',
        'name' => 'youracct_thepoojagroup',
        'user' => 'youracct_app',
        'pass' => 'CHANGE_ME',
    ],
    'sqlite_path' => __DIR__ . '/data/thepoojagroup.sqlite',
    'secure_cookie' => true, // false only for local http
];
