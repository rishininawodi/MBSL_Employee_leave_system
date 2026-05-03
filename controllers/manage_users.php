<?php
require_once __DIR__ . "/../config/db.php";

header("Content-Type: application/json; charset=UTF-8");
session_start();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_REQUEST['action'] ?? '';

function send($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function logActivity($conn, $actorId, $action, $targetType, $targetId, $message) {
    $stmt = $conn->prepare("INSERT INTO activities (actor_id, action, target_type, target_id, message) VALUES (?, ?, ?, ?, ?)");
    if (!$stmt) {
        return false;
    }
    $stmt->bind_param("issis", $actorId, $action, $targetType, $targetId, $message);
    return $stmt->execute();
}

// GET all users
if ($method === 'GET' && $action === 'list') {
    $sql = "SELECT id, employee_id, full_name, email, role, is_active, department, position, reporting_to, created_at
            FROM users
            ORDER BY id DESC";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        send(["success" => false, "message" => "Prepare failed: " . $conn->error], 500);
    }

    $stmt->execute();
    $res = $stmt->get_result();

    $rows = [];
    while ($r = $res->fetch_assoc()) {
        $rows[] = [
            "id" => $r['id'],
            "employee_id" => $r['employee_id'],
            "name" => $r['full_name'],
            "full_name" => $r['full_name'],
            "email" => $r['email'],
            "role" => $r['role'],
            "is_active" => (int)$r['is_active'],
            "department" => $r['department'],
            "position" => $r['position'],
            "reporting_to" => $r['reporting_to'],
            "created_at" => $r['created_at']
        ];
    }

    send($rows);
}

// POST toggle status
if ($method === 'POST' && ($action === 'toggle' || $action === 'status')) {
    $id = (int)($_POST['id'] ?? 0);
    $is_active = $_POST['is_active'] ?? null;

    if ($id <= 0 || $is_active === null) {
        send(["success" => false, "message" => "Missing id or is_active"], 400);
    }

    $is_active = ($is_active === '1' || $is_active === 1 || $is_active === true) ? 1 : 0;

    $stmt = $conn->prepare("UPDATE users SET is_active = ? WHERE id = ?");
    if (!$stmt) {
        send(["success" => false, "message" => "Prepare failed: " . $conn->error], 500);
    }

    $stmt->bind_param("ii", $is_active, $id);

    if ($stmt->execute()) {
        $actor = $_SESSION['user_id'] ?? null;
        $activityAction = $is_active ? 'Activated user' : 'Deactivated user';
        $message = $activityAction . " id:$id";

        if ($actor) {
            logActivity($conn, (int)$actor, $activityAction, 'user', $id, $message);
        }

        send(["success" => true, "message" => "Status updated"]);
    }

    send(["success" => false, "message" => "Execute failed: " . $stmt->error], 500);
}

// POST update user
if ($method === 'POST' && $action === 'update') {
    $id = (int)($_POST['id'] ?? 0);
    $employee_id = $_POST['employee_id'] ?? '';
    $full_name = $_POST['full_name'] ?? '';
    $email = $_POST['email'] ?? '';
    $role = $_POST['role'] ?? '';
    $department = $_POST['department'] ?? '';
    $position = $_POST['position'] ?? '';
    $reporting_to = $_POST['reporting_to'] ?? null;
    $is_active = (int)($_POST['is_active'] ?? 1);

    if ($id <= 0 || $employee_id === '' || $full_name === '' || $email === '' || $role === '') {
        send(["success" => false, "message" => "Missing required fields"], 400);
    }

    $stmt = $conn->prepare("UPDATE users SET employee_id = ?, full_name = ?, email = ?, role = ?, department = ?, position = ?, reporting_to = ?, is_active = ? WHERE id = ?");
    if (!$stmt) {
        send(["success" => false, "message" => "Prepare failed: " . $conn->error], 500);
    }

    $stmt->bind_param("ssssssiii", $employee_id, $full_name, $email, $role, $department, $position, $reporting_to, $is_active, $id);

    if ($stmt->execute()) {
        $actor = $_SESSION['user_id'] ?? null;
        if ($actor) {
            logActivity($conn, (int)$actor, 'Updated user', 'user', $id, "Updated user id:$id");
        }

        send(["success" => true, "message" => "User updated"]);
    }

    send(["success" => false, "message" => "Execute failed: " . $stmt->error], 500);
}

// GET one user
if ($method === 'GET' && $action === 'get' && isset($_GET['id'])) {
    $id = (int)$_GET['id'];

    $stmt = $conn->prepare("SELECT id, employee_id, full_name, email, role, is_active, department, position, reporting_to, created_at FROM users WHERE id = ?");
    if (!$stmt) {
        send(["success" => false, "message" => "Prepare failed: " . $conn->error], 500);
    }

    $stmt->bind_param("i", $id);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res->fetch_assoc();

    if (!$user) {
        send(["success" => false, "message" => "User not found"], 404);
    }

    $user['name'] = $user['full_name'];
    $user['is_active'] = (int)$user['is_active'];

    send(["success" => true, "data" => $user]);
}

send(["success" => false, "message" => "Invalid request"], 400);