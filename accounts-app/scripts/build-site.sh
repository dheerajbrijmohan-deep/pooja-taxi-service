#!/bin/bash
# Assembles the whole website in deploy/site/ :
#   /                the Pooja Taxi Services homepage (the prebuilt files of the website repo)
#   /manage/         this accounts app (login, Admin, Manager)
#   /manage/api/     the PHP API
# Usage:  scripts/build-site.sh local     keeps this Mac's database settings, to try the site locally
#         scripts/build-site.sh server    leaves the database settings out; add the server's own api/config.php after uploading
# Needs: Node + pnpm (for the app build). The homepage files come from $HOMEPAGE_DIST.
set -e
export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-server}"
HOMEPAGE_DIST="${HOMEPAGE_DIST:-$HOME/PoojaTaxiServices/src/frontend/dist}"
OUT="$ROOT/deploy/site"

[ -f "$HOMEPAGE_DIST/index.html" ] || { echo "Homepage files not found in $HOMEPAGE_DIST"; exit 1; }
rm -rf "$OUT"; mkdir -p "$OUT/manage/api"

echo "1/4 homepage"
cp -R "$HOMEPAGE_DIST/." "$OUT/"
# keep search engines out of the accounts app; the homepage rules stay as they are
python3 - "$OUT/robots.txt" <<'PY'
import sys
p=sys.argv[1]; s=open(p).read()
if "/manage/" not in s:
    s=s.replace("Allow: /\n","Allow: /\nDisallow: /manage/\n",1) if "Allow: /\n" in s else s.rstrip()+"\nDisallow: /manage/\n"
open(p,"w").write(s)
PY
cat > "$OUT/.htaccess" <<'HT'
# Always use the secure (https) address.
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteCond %{HTTP:X-Forwarded-Proto} !=https
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# Homepage: any address that is not a real file opens the homepage. The accounts app (/manage/) has its own rules.
RewriteCond %{REQUEST_URI} !^/manage/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
HT

echo "2/4 accounts app (this takes a few seconds)"
( cd "$ROOT/web" && APP_BASE=/manage/ pnpm build >/dev/null )
cp -R "$ROOT/web/dist/." "$OUT/manage/"

echo "3/4 API"
rsync -a --exclude data --exclude storage --exclude bin --exclude migrations --exclude 'schema.*.sql' \
      --exclude 'config*.php' --exclude '*.sqlite' --exclude '.DS_Store' "$ROOT/api/" "$OUT/manage/api/"
mkdir -p "$OUT/manage/api/storage"; cp "$ROOT/api/storage/.htaccess" "$OUT/manage/api/storage/.htaccess"
cp "$ROOT/api/config.example.php" "$OUT/manage/api/config.example.php"
if [ "$MODE" = "local" ]; then cp "$ROOT/api/config.php" "$OUT/manage/api/config.php"; echo "   (local database settings included: for trying the site on this Mac only)"; fi

echo "4/4 done"
echo "   $(find "$OUT" -type f | wc -l | tr -d ' ') files, $(du -sh "$OUT" | cut -f1) in $OUT"
