# Accounts subdomain (manage.thepoojagroup.in)

Internal accounts app for Pooja Taxi Services (separate from the public website that lives in `src/`).

- `web/`  React + Vite + Tailwind (theme copied from the public site in `web/src/index.css`)
- `api/`  PHP 8.3 API (PDO). SQLite locally, MySQL on the server.

## Run locally
Needs Node 24 + pnpm and PHP 8.3.

    cd api && php -S localhost:8080 index.php     # API
    cd web && pnpm dev                            # site on http://localhost:5173

Create your own local users first (see below). No data, database files or credentials are kept in this repository.

## Create real users
    php api/bin/create-user.php <username> "<Full Name>" <admin|manager> [--sql]
`--sql` prints an INSERT you can paste into phpMyAdmin on the server.

## Design tokens
Plus Jakarta Sans (body), Playfair Display (headings); orange #C87412, charcoal #2F2F2F, cream #F3E9D7, gray #6B6B6B.

## Setup
1. `cp api/config.example.php api/config.php` and fill in the database. The live site and the local copy both use **MySQL**; SQLite still works for quick experiments.
2. MySQL: import `api/schema.mysql.sql` (all tables). `php api/bin/copy-sqlite-to-mysql.php` copies an old SQLite database into MySQL.
3. Older databases: run `api/migrations/*.sql` once.
4. Create the first logins with `php api/bin/create-user.php <username> "<Name>" <admin|manager> [--sql]` (`--sql` prints an INSERT to paste into phpMyAdmin).

## Site layout (what is deployed)
`scripts/build-site.sh local|server` assembles `deploy/site/`:
- `/` the Pooja Taxi Services homepage (the prebuilt files of the website in `src/frontend/dist`)
- `/manage/` this app (built with `APP_BASE=/manage/`), `/manage/api/` the PHP API

`local` keeps this Mac's database settings; `server` leaves them out (put the server's own `api/config.php` there after uploading). `scripts/local-router.php` lets `php -S localhost:8090 -t deploy/site scripts/local-router.php` behave like the Apache site, to review before deploying.

## Deploying to DirectAdmin (outline)
1. Build the `server` package and zip `deploy/site`.
2. Create a MySQL database and user (DirectAdmin > MySQL Management); import the schema and data with phpMyAdmin.
3. Upload and extract the zip into `public_html`; add `manage/api/config.php` with the server's database details and `'secure_cookie' => true`.
4. Create the logins (see above). Never keep passwords, database files or uploads in this repository.
