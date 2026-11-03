<?php
declare(strict_types=1);

// Pooja Taxi Services drivers: the taxi counterpart of employees. Personal details, licence, emergency contact, bank details and
// uploaded documents, with a zip of all documents. Owner only. A driver's pay (a share of earnings) is worked out in taxi.php.

const TD_DOC_TYPES = ['Photo', 'Driving licence', 'Aadhaar', 'PAN', 'Police verification', 'Badge', 'Address proof', 'Medical certificate', 'Other'];
const TD_BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const TD_MAX_BYTES = 5 * 1024 * 1024;

function td_dir(): string {
    $d = __DIR__ . '/storage/drivers';
    if (!is_dir($d)) mkdir($d, 0750, true);
    $ht = __DIR__ . '/storage/.htaccess';
    if (!is_file($ht)) file_put_contents($ht, "Require all denied\n");
    return $d;
}

function td_row(array $r): array {
    return ['id' => (int) $r['id'], 'name' => $r['name'], 'father_name' => $r['father_name'], 'mobile' => $r['mobile'], 'alt_phone' => $r['alt_phone'], 'dob' => $r['dob'],
        'gender' => $r['gender'], 'blood_group' => $r['blood_group'], 'address' => $r['address'], 'join_date' => $r['join_date'], 'leave_date' => $r['leave_date'],
        'status' => (int) $r['active'] ? 'Active' : 'Left', 'active' => (bool) $r['active'], 'share_pct' => (float) $r['share_pct'],
        'licence_no' => $r['licence_no'], 'licence_expiry' => $r['licence_expiry'], 'badge_no' => $r['badge_no'], 'aadhaar_no' => (string) ($r['aadhaar_no'] ?? ''),
        'bank_name' => $r['bank_name'], 'bank_account' => $r['bank_account'], 'ifsc' => $r['ifsc'], 'emergency_name' => $r['emergency_name'],
        'emergency_phone' => $r['emergency_phone'], 'emergency_relation' => $r['emergency_relation'], 'notes' => $r['notes'], 'employee_id' => (string) ($r['employee_id'] ?? '')] + address_row($r)
        + (array_key_exists('photo_id', $r) ? ['photo_id' => $r['photo_id'] !== null ? (int) $r['photo_id'] : null, 'doc_count' => (int) $r['doc_count']] : []);
}

function td_doc_row(array $r): array {
    return ['id' => (int) $r['id'], 'doc_type' => $r['doc_type'], 'original_name' => $r['original_name'], 'mime' => $r['mime'], 'size' => (int) $r['size'], 'uploaded_at' => $r['uploaded_at']];
}

function td_clean(array $in): array {
    $name = em_text($in, 'name', 100, 'Name');
    if ($name === '') fail('Enter the driver name', 422);
    $gender = (string) ($in['gender'] ?? '');
    if (!in_array($gender, ['', 'Male', 'Female', 'Other'], true)) fail('Choose a valid gender', 422);
    $blood = (string) ($in['blood_group'] ?? '');
    if ($blood !== '' && !in_array($blood, TD_BLOOD, true)) fail('Choose a valid blood group', 422);
    $status = (string) ($in['status'] ?? 'Active');
    if (!in_array($status, ['Active', 'Left'], true)) fail('Choose Active or Left', 422);
    $joined = em_opt_date($in['join_date'] ?? '', 'joining date');
    $left = em_opt_date($in['leave_date'] ?? '', 'leaving date');
    if ($joined === null) fail('Enter the joining date', 422);
    if ($status === 'Left' && $left === null) fail('Enter the last working day for a driver who has left', 422);
    if ($status === 'Active' && $left !== null) fail('Set the status to Left, or clear the leaving date', 422);
    if ($left !== null && $left < $joined) fail('The leaving date cannot be before the joining date', 422);
    $dob = em_opt_date($in['dob'] ?? '', 'date of birth');
    if ($dob !== null && $dob > date('Y-m-d')) fail('Date of birth cannot be in the future', 422);
    $pct = $in['share_pct'] ?? 30;
    if ($pct === '' || $pct === null) $pct = 30;
    if (!is_numeric($pct) || $pct < 0 || $pct > 100) fail('Share must be between 0 and 100', 422);
    $aadhaar = preg_replace('/\D/', '', (string) ($in['aadhaar_no'] ?? '')); // stored as 12 digits, shown as 1234-5678-9012
    if ($aadhaar !== '' && strlen($aadhaar) !== 12) fail('Enter the full 12-digit Aadhaar number', 422);
    $ifsc = strtoupper(trim((string) ($in['ifsc'] ?? '')));
    if ($ifsc !== '' && !preg_match('/^[A-Z]{4}0[A-Z0-9]{6}$/', $ifsc)) fail('Enter a valid IFSC code', 422);
    $account = preg_replace('/\s+/', '', (string) ($in['bank_account'] ?? ''));
    if ($account !== '' && !preg_match('/^[0-9]{6,20}$/', $account)) fail('Enter a valid bank account number', 422);
    return [$name, em_text($in, 'father_name', 100, "Father's name"), em_phone($in['mobile'] ?? '', 'mobile number', true), em_phone($in['alt_phone'] ?? '', 'alternate number', false),
        $dob, $gender, $blood, em_text($in, 'address', 255, 'Address'), $joined, $left, $status === 'Active' ? 1 : 0, round((float) $pct, 2),
        strtoupper(em_text($in, 'licence_no', 40, 'Licence number')), em_opt_date($in['licence_expiry'] ?? '', 'licence expiry date'), em_text($in, 'badge_no', 40, 'Badge number'), $aadhaar,
        em_text($in, 'bank_name', 100, 'Bank name'), $account, $ifsc, em_text($in, 'emergency_name', 100, 'Emergency contact'),
        em_phone($in['emergency_phone'] ?? '', 'emergency number', false), em_text($in, 'emergency_relation', 50, 'Relation'), em_text($in, 'notes', 1000, 'Notes'),
        em_text($in, 'employee_id', 40, 'Employee ID'), ...address_fields($in)];
}

const TD_COLS = 'name,father_name,mobile,alt_phone,dob,gender,blood_group,address,join_date,leave_date,active,share_pct,licence_no,licence_expiry,badge_no,aadhaar_no,bank_name,bank_account,ifsc,emergency_name,emergency_phone,emergency_relation,notes,employee_id,' . ADDRESS_COLS;

function td_delete_files(array $docs): void {
    foreach ($docs as $d) { $f = td_dir() . '/' . basename($d['stored_name']); if (is_file($f)) @unlink($f); }
}

// Removes a driver for good (used when the driver has no entries or payments): their documents and files go too.
function td_purge(PDO $pdo, int $id): void {
    $st = $pdo->prepare('SELECT * FROM taxi_driver_documents WHERE driver_id = ?'); $st->execute([$id]);
    td_delete_files($st->fetchAll());
    $pdo->prepare('DELETE FROM taxi_driver_documents WHERE driver_id = ?')->execute([$id]);
}

// Owner-only driver profile paths. Returns without output when the path is not one of them.
function taxi_driver_records_route(string $method, string $path, array $user): void {
    $pdo = db();
    $isDoc = preg_match('#^taxi/driver-documents/(\d+)$#', $path, $dm);
    $isProfile = $path === 'taxi/driver-profiles' || preg_match('#^taxi/driver-profiles/(\d+)(/documents(\.zip)?)?$#', $path, $pm);
    if (!$isDoc && !$isProfile) return;
    if ($user['role'] !== 'admin') fail('Not allowed', 403);

    // ---- one file
    if ($isDoc) {
        $st = $pdo->prepare('SELECT * FROM taxi_driver_documents WHERE id = ?'); $st->execute([(int) $dm[1]]);
        $d = $st->fetch();
        if (!$d) fail('Document not found', 404);
        if ($method === 'GET') {
            $file = td_dir() . '/' . basename($d['stored_name']);
            if (!is_file($file)) fail('File is missing', 404);
            $safe = preg_replace('/[^A-Za-z0-9._-]/', '_', $d['original_name']);
            header('Content-Type: ' . $d['mime']); header('Content-Length: ' . filesize($file)); header('X-Content-Type-Options: nosniff'); header('Cache-Control: private, max-age=300');
            header('Content-Disposition: ' . (($_GET['download'] ?? '') === '1' ? 'attachment' : 'inline') . '; filename="' . $safe . '"');
            readfile($file); exit;
        }
        if ($method === 'DELETE') { td_delete_files([$d]); $pdo->prepare('DELETE FROM taxi_driver_documents WHERE id = ?')->execute([$d['id']]); json_out(['ok' => true]); }
        fail('Not found', 404);
    }

    // ---- list / create
    if ($path === 'taxi/driver-profiles') {
        if ($method === 'GET') {
            $rows = $pdo->query("SELECT d.*,
                (SELECT x.id FROM taxi_driver_documents x WHERE x.driver_id = d.id AND x.doc_type = 'Photo' ORDER BY x.id DESC LIMIT 1) AS photo_id,
                (SELECT COUNT(*) FROM taxi_driver_documents x WHERE x.driver_id = d.id) AS doc_count
              FROM taxi_drivers d ORDER BY d.active DESC, d.name")->fetchAll();
            json_out(['drivers' => array_map('td_row', $rows), 'doc_types' => TD_DOC_TYPES]);
        }
        if ($method === 'POST') {
            $v = td_clean(body());
            $pdo->prepare('INSERT INTO taxi_drivers (' . TD_COLS . ') VALUES (' . implode(',', array_fill(0, count($v), '?')) . ')')->execute($v);
            json_out(['id' => (int) $pdo->lastInsertId()], 201);
        }
        fail('Not found', 404);
    }

    $id = (int) $pm[1];
    $st = $pdo->prepare('SELECT * FROM taxi_drivers WHERE id = ?'); $st->execute([$id]);
    $drv = $st->fetch();
    if (!$drv) fail('Driver not found', 404);

    // ---- upload
    if (isset($pm[2]) && $pm[2] === '/documents' && $method === 'POST') {
        $type = (string) ($_POST['doc_type'] ?? '');
        if (!in_array($type, TD_DOC_TYPES, true)) fail('Choose a document type', 422);
        $f = $_FILES['file'] ?? null;
        if (!$f) fail('Choose a file to upload', 422);
        if (in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) fail('That file is too large for the server. Try a smaller one.', 413);
        if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) fail('Upload failed. Please try again.', 400);
        if ($f['size'] > TD_MAX_BYTES) fail('File is too large (max 5 MB)', 413);
        $kind = em_sniff($f['tmp_name']);
        if (!$kind) fail('Only JPG, PNG, WEBP or PDF files are allowed', 415);
        if ($type === 'Photo' && $kind[0] === 'application/pdf') fail('A photo must be an image, not a PDF', 415);
        $stored = bin2hex(random_bytes(16)) . '.' . $kind[1];
        if (!move_uploaded_file($f['tmp_name'], td_dir() . '/' . $stored)) fail('Could not save the file', 500);
        chmod(td_dir() . '/' . $stored, 0640);
        if ($type === 'Photo') { // one profile photo: a new one replaces the old
            $o = $pdo->prepare("SELECT * FROM taxi_driver_documents WHERE driver_id = ? AND doc_type = 'Photo'"); $o->execute([$id]);
            td_delete_files($o->fetchAll());
            $pdo->prepare("DELETE FROM taxi_driver_documents WHERE driver_id = ? AND doc_type = 'Photo'")->execute([$id]);
        }
        $orig = mb_substr(preg_replace('/[^\p{L}\p{N}._ -]/u', '_', basename((string) $f['name'])), 0, 200) ?: 'file';
        $pdo->prepare('INSERT INTO taxi_driver_documents (driver_id,doc_type,original_name,stored_name,mime,size,uploaded_by,uploaded_at) VALUES (?,?,?,?,?,?,?,?)')
            ->execute([$id, $type, $orig, $stored, $kind[0], (int) $f['size'], $user['id'], date('Y-m-d H:i:s')]);
        $o = $pdo->prepare('SELECT * FROM taxi_driver_documents WHERE id = ?'); $o->execute([(int) $pdo->lastInsertId()]);
        json_out(['document' => td_doc_row($o->fetch())], 201);
    }

    // ---- every document in one zip
    if (isset($pm[3]) && $method === 'GET') {
        $st = $pdo->prepare('SELECT * FROM taxi_driver_documents WHERE driver_id = ? ORDER BY doc_type, id'); $st->execute([$id]);
        $docs = $st->fetchAll();
        if (!$docs) fail('This driver has no documents yet', 404);
        if (!class_exists('ZipArchive')) fail('Zip is not available on this server. Download the documents one by one.', 501);
        $tmp = tempnam(sys_get_temp_dir(), 'drv');
        $zip = new ZipArchive();
        if ($zip->open($tmp, ZipArchive::OVERWRITE) !== true) fail('Could not prepare the zip', 500);
        $used = [];
        foreach ($docs as $d) {
            $file = td_dir() . '/' . basename($d['stored_name']);
            if (!is_file($file)) continue;
            $ext = pathinfo($d['original_name'], PATHINFO_EXTENSION) ?: pathinfo($d['stored_name'], PATHINFO_EXTENSION);
            $base = preg_replace('/[^A-Za-z0-9 _-]/', '', $d['doc_type']) ?: 'document';
            $n = 1; $name = "$base.$ext";
            while (isset($used[strtolower($name)])) $name = $base . ' ' . (++$n) . ".$ext";
            $used[strtolower($name)] = 1;
            $zip->addFile($file, $name);
        }
        $zip->close();
        $label = preg_replace('/[^A-Za-z0-9_-]+/', '_', $drv['name']);
        header('Content-Type: application/zip'); header('Content-Length: ' . filesize($tmp)); header('Cache-Control: no-store');
        header('Content-Disposition: attachment; filename="' . $label . '_documents.zip"');
        readfile($tmp); @unlink($tmp); exit;
    }

    // ---- one driver
    if ($method === 'GET') {
        $st = $pdo->prepare('SELECT * FROM taxi_driver_documents WHERE driver_id = ? ORDER BY doc_type, id DESC'); $st->execute([$id]);
        $docs = array_map('td_doc_row', $st->fetchAll());
        $cars = $pdo->prepare('SELECT id, code, model FROM taxi_vehicles WHERE driver_id = ? ORDER BY code'); $cars->execute([$id]);
        $money = null;
        foreach (taxi_summary($pdo, date('Y-m'))['drivers'] as $x) if ($x['id'] === $id) $money = ['balance' => $x['balance'], 'month_earning' => $x['earning'], 'month_share' => $x['share'], 'month_days' => $x['days_worked']];
        json_out(['driver' => td_row($drv), 'documents' => $docs, 'cars' => $cars->fetchAll(), 'money' => $money, 'doc_types' => TD_DOC_TYPES]);
    }
    if ($method === 'PUT') {
        $v = td_clean(body());
        $set = implode(',', array_map(fn($c) => "$c=?", explode(',', TD_COLS)));
        $pdo->prepare("UPDATE taxi_drivers SET $set WHERE id=?")->execute([...$v, $id]);
        if (!$v[10]) $pdo->prepare('UPDATE taxi_vehicles SET driver_id = NULL WHERE driver_id = ?')->execute([$id]); // a driver who has left no longer drives a car
        json_out(['ok' => true]);
    }
    fail('Not found', 404);
}
