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
1. `cp api/config.example.php api/config.php` and fill in the database (SQLite for local use, MySQL on the server).
2. `php api/bin/init-db.php` creates the tables on a local SQLite database; on MySQL import `api/schema.mysql.sql`.
3. Older databases: run `api/migrations/*.sql` once.
