<?php
// Lets PHP's built-in server behave like the DirectAdmin (Apache) site. Local use only.
//   php -S localhost:8090 -t deploy/site scripts/local-router.php
$root = realpath(__DIR__ . '/../deploy/site');
$uri = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (preg_match('#^/manage/api(/|$)#', $uri)) { // the PHP API
    require $root . '/manage/api/index.php';
    return true;
}
$file = $root . $uri;
if ($uri !== '/' && is_file($file) && !str_ends_with($file, '.htaccess') && !str_contains($uri, '..')) return false; // a real file: served as it is
header('Content-Type: text/html; charset=utf-8');
readfile($root . (str_starts_with($uri, '/manage') ? '/manage/index.html' : '/index.html')); // the pages are single-page apps
return true;
