<?php
declare(strict_types=1);

// Employee records and their uploaded documents. Owner (admin) only; enforced by the caller in index.php.

const EM_BUSINESSES = ['Pooja Taxi Services', 'AutoShine Premium Car Wash'];
const EM_DOC_TYPES = ['Photo', 'Aadhaar', 'Electricity bill', 'PAN', 'Driving licence', 'Address proof', 'Other'];
const EM_MAX_BYTES = 5 * 1024 * 1024;
const EM_BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// ?business= narrows a list to one business (each business is managed on its own); empty = no narrowing
function em_scope_business(): string {
    $b = (string) ($_GET['business'] ?? '');
    if ($b !== '' && !in_array($b, EM_BUSINESSES, true)) fail('Choose a valid business', 422);
    return $b;
}

function em_dir(): string {
    $d = __DIR__ . '/storage/employees';
    if (!is_dir($d)) mkdir($d, 0750, true);
    $ht = __DIR__ . '/storage/.htaccess';
    if (!is_file($ht)) file_put_contents($ht, "Require all denied\n");
    return $d;
}

function em_row(array $r): array {
    $out = [
        'id' => (int) $r['id'],
        'full_name' => $r['full_name'], 'father_name' => $r['father_name'],
        'phone' => $r['phone'], 'alt_phone' => $r['alt_phone'],
        'dob' => $r['dob'], 'gender' => $r['gender'], 'blood_group' => $r['blood_group'], 'address' => $r['address'],
        'business' => $r['business'], 'designation' => $r['designation'],
        'join_date' => $r['join_date'], 'leave_date' => $r['leave_date'], 'status' => $r['status'],
        'monthly_salary' => (float) $r['monthly_salary'],
        'bank_name' => $r['bank_name'], 'bank_account' => $r['bank_account'], 'ifsc' => $r['ifsc'],
        'emergency_name' => $r['emergency_name'], 'emergency_phone' => $r['emergency_phone'], 'emergency_relation' => $r['emergency_relation'],
        'aadhaar_no' => (string) ($r['aadhaar_no'] ?? ''), 'notes' => $r['notes'], ...address_row($r),
    ];
    if (array_key_exists('photo_id', $r)) {
        $out['photo_id'] = $r['photo_id'] !== null ? (int) $r['photo_id'] : null;
        $out['doc_count'] = (int) $r['doc_count'];
    }
    return $out;
}

function em_doc_row(array $r): array {
    return ['id' => (int) $r['id'], 'doc_type' => $r['doc_type'], 'original_name' => $r['original_name'], 'mime' => $r['mime'], 'size' => (int) $r['size'], 'uploaded_at' => $r['uploaded_at']];
}

function em_opt_date(mixed $v, string $label): ?string {
    $v = trim((string) ($v ?? ''));
    if ($v === '') return null;
    if (!cw_valid_date($v)) fail("Enter a valid $label", 422);
    return $v;
}

function em_text(array $in, string $k, int $max, string $label): string {
    $v = trim((string) ($in[$k] ?? ''));
    if (mb_strlen($v) > $max) fail("$label is too long", 422);
    return $v;
}

function em_phone(mixed $v, string $label, bool $required): string {
    $p = preg_replace('/[^0-9+]/', '', (string) ($v ?? ''));
    if ($p === '' && !$required) return '';
    if (!preg_match('/^(\+91)?[0-9]{10}$/', $p)) fail("Enter a valid 10-digit $label", 422);
    return $p;
}

function em_clean(array $in): array {
    $name = em_text($in, 'full_name', 100, 'Name');
    if ($name === '') fail('Enter the employee name', 422);
    $gender = (string) ($in['gender'] ?? '');
    if (!in_array($gender, ['', 'Male', 'Female', 'Other'], true)) fail('Choose a valid gender', 422);
    $blood = (string) ($in['blood_group'] ?? '');
    if ($blood !== '' && !in_array($blood, EM_BLOOD, true)) fail('Choose a valid blood group', 422);
    $business = (string) ($in['business'] ?? '');
    if (!in_array($business, EM_BUSINESSES, true)) fail('Choose the business this employee works for', 422);
    $status = (string) ($in['status'] ?? 'Active');
    if (!in_array($status, ['Active', 'Left'], true)) fail('Choose Active or Left', 422);
    $joined = em_opt_date($in['join_date'] ?? '', 'joining date');
    $left = em_opt_date($in['leave_date'] ?? '', 'leaving date');
    if ($joined === null) fail('Enter the joining date (salary and attendance are counted from it)', 422);
    if ($status === 'Left' && $left === null) fail('Enter the last working day for an employee who has left', 422);
    if ($status === 'Active' && $left !== null) fail('Set the status to Left, or clear the leaving date', 422);
    if ($left !== null && $left < $joined) fail('The leaving date cannot be before the joining date', 422);
    $salary = $in['monthly_salary'] ?? 0;
    if ($salary === '' || $salary === null) $salary = 0;
    if (!is_numeric($salary) || $salary < 0 || $salary > 10000000) fail('Enter a valid salary', 422);
    $aadhaar = preg_replace('/\D/', '', (string) ($in['aadhaar_no'] ?? '')); // stored as 12 digits, shown as 1234-5678-9012
    if ($aadhaar !== '' && strlen($aadhaar) !== 12) fail('Enter the full 12-digit Aadhaar number', 422);
    $ifsc = strtoupper(trim((string) ($in['ifsc'] ?? '')));
    if ($ifsc !== '' && !preg_match('/^[A-Z]{4}0[A-Z0-9]{6}$/', $ifsc)) fail('Enter a valid IFSC code', 422);
    $account = preg_replace('/\s+/', '', (string) ($in['bank_account'] ?? ''));
    if ($account !== '' && !preg_match('/^[0-9]{6,20}$/', $account)) fail('Enter a valid bank account number', 422);

    return [
        $name, em_text($in, 'father_name', 100, "Father's name"),
        em_phone($in['phone'] ?? '', 'mobile number', true), em_phone($in['alt_phone'] ?? '', 'alternate number', false),
        em_opt_date($in['dob'] ?? '', 'date of birth'), $gender, $blood, em_text($in, 'address', 255, 'Address'),
        $business, em_text($in, 'designation', 100, 'Designation'),
        $joined, $left, $status,
        round((float) $salary, 2), em_text($in, 'bank_name', 100, 'Bank name'), $account, $ifsc,
        em_text($in, 'emergency_name', 100, 'Emergency contact'), em_phone($in['emergency_phone'] ?? '', 'emergency number', false),
        em_text($in, 'emergency_relation', 50, 'Relation'), $aadhaar, em_text($in, 'notes', 1000, 'Notes'),
        ...address_fields($in),
    ];
}

const EM_COLS = 'full_name,father_name,phone,alt_phone,dob,gender,blood_group,address,business,designation,join_date,leave_date,status,monthly_salary,bank_name,bank_account,ifsc,emergency_name,emergency_phone,emergency_relation,aadhaar_no,notes,' . ADDRESS_COLS;

// Identify the real file type from its first bytes (never trust the browser-supplied type or extension).
function em_sniff(string $path): ?array {
    $h = (string) file_get_contents($path, false, null, 0, 16);
    if (str_starts_with($h, "\xFF\xD8\xFF")) return ['image/jpeg', 'jpg'];
    if (str_starts_with($h, "\x89PNG\r\n\x1a\n")) return ['image/png', 'png'];
    if (str_starts_with($h, 'RIFF') && substr($h, 8, 4) === 'WEBP') return ['image/webp', 'webp'];
    if (str_starts_with($h, '%PDF-')) return ['application/pdf', 'pdf'];
    return null;
}

function em_delete_doc_files(PDO $pdo, array $docs): void {
    foreach ($docs as $d) {
        $f = em_dir() . '/' . basename($d['stored_name']);
        if (is_file($f)) unlink($f);
    }
}

function employees_route(string $method, string $path, array $user): void {
    $pdo = db();

    // ---- files ----
    if (preg_match('#^employees/documents/(\d+)$#', $path, $m)) {
        $st = $pdo->prepare('SELECT * FROM employee_documents WHERE id = ?');
        $st->execute([(int) $m[1]]);
        $d = $st->fetch();
        if (!$d) fail('Document not found', 404);

        if ($method === 'GET') {
            $file = em_dir() . '/' . basename($d['stored_name']);
            if (!is_file($file)) fail('File is missing', 404);
            header('Content-Type: ' . $d['mime']);
            header('Content-Length: ' . filesize($file));
            header('X-Content-Type-Options: nosniff');
            header('Cache-Control: private, max-age=300');
            header('Content-Disposition: inline; filename="' . preg_replace('/[^A-Za-z0-9._-]/', '_', $d['original_name']) . '"');
            readfile($file);
            exit;
        }
        if ($method === 'DELETE') {
            em_delete_doc_files($pdo, [$d]);
            $pdo->prepare('DELETE FROM employee_documents WHERE id = ?')->execute([$d['id']]);
            json_out(['ok' => true]);
        }
        fail('Not found', 404);
    }

    if (preg_match('#^employees/(\d+)/documents$#', $path, $m) && $method === 'POST') {
        $empId = (int) $m[1];
        $st = $pdo->prepare('SELECT COUNT(*) FROM employees WHERE id = ?');
        $st->execute([$empId]);
        if (!(int) $st->fetchColumn()) fail('Employee not found', 404);

        $type = (string) ($_POST['doc_type'] ?? '');
        if (!in_array($type, EM_DOC_TYPES, true)) fail('Choose a document type', 422);
        $f = $_FILES['file'] ?? null;
        if (!$f) fail('Choose a file to upload', 422);
        if (in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) fail('That file is too large for the server. Try a smaller one.', 413);
        if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) fail('Upload failed. Please try again.', 400);
        if ($f['size'] > EM_MAX_BYTES) fail('File is too large (max 5 MB)', 413);
        $kind = em_sniff($f['tmp_name']);
        if (!$kind) fail('Only JPG, PNG, WEBP or PDF files are allowed', 415);
        if ($type === 'Photo' && $kind[0] === 'application/pdf') fail('A photo must be an image, not a PDF', 415);

        $stored = bin2hex(random_bytes(16)) . '.' . $kind[1];
        if (!move_uploaded_file($f['tmp_name'], em_dir() . '/' . $stored)) fail('Could not save the file', 500);
        chmod(em_dir() . '/' . $stored, 0640);

        // one profile photo per employee: a new one replaces the old
        if ($type === 'Photo') {
            $st = $pdo->prepare("SELECT * FROM employee_documents WHERE employee_id = ? AND doc_type = 'Photo'");
            $st->execute([$empId]);
            $old = $st->fetchAll();
            em_delete_doc_files($pdo, $old);
            $pdo->prepare("DELETE FROM employee_documents WHERE employee_id = ? AND doc_type = 'Photo'")->execute([$empId]);
        }
        $orig = mb_substr(preg_replace('/[^\p{L}\p{N}._ -]/u', '_', basename((string) $f['name'])), 0, 200) ?: 'file';
        $pdo->prepare('INSERT INTO employee_documents (employee_id,doc_type,original_name,stored_name,mime,size,uploaded_by,uploaded_at) VALUES (?,?,?,?,?,?,?,?)')
            ->execute([$empId, $type, $orig, $stored, $kind[0], (int) $f['size'], $user['id'], date('Y-m-d H:i:s')]);
        $st = $pdo->prepare('SELECT * FROM employee_documents WHERE id = ?');
        $st->execute([(int) $pdo->lastInsertId()]);
        json_out(['document' => em_doc_row($st->fetch())], 201);
    }

    // ---- employees ----
    if ($method === 'GET' && $path === 'employees') {
        $biz = em_scope_business();
        $rows = $pdo->prepare("SELECT e.*,
              (SELECT d.id FROM employee_documents d WHERE d.employee_id = e.id AND d.doc_type = 'Photo' ORDER BY d.id DESC LIMIT 1) AS photo_id,
              (SELECT COUNT(*) FROM employee_documents d WHERE d.employee_id = e.id) AS doc_count
            FROM employees e WHERE (? = '' OR e.business = ?) ORDER BY CASE e.status WHEN 'Active' THEN 0 ELSE 1 END, e.full_name");
        $rows->execute([$biz, $biz]);
        $rows = $rows->fetchAll();
        json_out(['employees' => array_map('em_row', $rows), 'businesses' => EM_BUSINESSES, 'doc_types' => EM_DOC_TYPES]);
    }

    if ($method === 'POST' && $path === 'employees') {
        $v = em_clean(body());
        $cols = EM_COLS . ',created_by';
        $pdo->prepare("INSERT INTO employees ($cols) VALUES (" . implode(',', array_fill(0, count($v) + 1, '?')) . ')')->execute([...$v, $user['id']]);
        $id = (int) $pdo->lastInsertId();
        json_out(['id' => $id], 201);
    }

    if (preg_match('#^employees/(\d+)$#', $path, $m)) {
        $id = (int) $m[1];
        $st = $pdo->prepare('SELECT * FROM employees WHERE id = ?');
        $st->execute([$id]);
        $e = $st->fetch();
        if (!$e) fail('Employee not found', 404);

        if ($method === 'GET') {
            $st = $pdo->prepare('SELECT * FROM employee_documents WHERE employee_id = ? ORDER BY doc_type, id DESC');
            $st->execute([$id]);
            json_out(['employee' => em_row($e), 'documents' => array_map('em_doc_row', $st->fetchAll()), 'businesses' => EM_BUSINESSES, 'doc_types' => EM_DOC_TYPES]);
        }
        if ($method === 'PUT') {
            $v = em_clean(body());
            $set = implode(',', array_map(fn($c) => "$c=?", explode(',', EM_COLS)));
            $pdo->prepare("UPDATE employees SET $set WHERE id = ?")->execute([...$v, $id]);
            json_out(['ok' => true]);
        }
        if ($method === 'DELETE') {
            $st = $pdo->prepare('SELECT * FROM employee_documents WHERE employee_id = ?');
            $st->execute([$id]);
            em_delete_doc_files($pdo, $st->fetchAll());
            $pdo->prepare('DELETE FROM employee_documents WHERE employee_id = ?')->execute([$id]);
            $pdo->prepare('DELETE FROM attendance WHERE employee_id = ?')->execute([$id]);
            $pdo->prepare('DELETE FROM salary_sheets WHERE employee_id = ?')->execute([$id]);
            $pdo->prepare('DELETE FROM employees WHERE id = ?')->execute([$id]);
            json_out(['ok' => true]);
        }
    }

    fail('Not found', 404);
}
