<?php
require_once __DIR__ . "/../config/db.php";

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

header("Content-Type: application/json; charset=UTF-8");

$employee_id = $_POST['employee_id'] ?? '';
$full_name = $_POST['full_name'] ?? '';
$email = $_POST['email'] ?? '';
$department = $_POST['department'] ?? '';
$position = $_POST['position'] ?? '';
$passwordRaw = $_POST['password'] ?? '';
$reporting_to = isset($_POST['reporting_to']) && $_POST['reporting_to'] !== '' ? $_POST['reporting_to'] : null;
$role = $_POST['role'] ?? 'reporting_person';

if ($employee_id === '' || $full_name === '' || $email === '' || $department === '' || $passwordRaw === '') {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

$password = password_hash($passwordRaw, PASSWORD_BCRYPT);

$stmt = $conn->prepare("
    INSERT INTO users
    (employee_id, full_name, email, password, department, position, reporting_to, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
");

if (!$stmt) {
    echo json_encode(["status" => "error", "message" => "Prepare failed: " . $conn->error]);
    exit;
}

$stmt->bind_param("ssssssis", $employee_id, $full_name, $email, $password, $department, $position, $reporting_to, $role);

if (!$stmt->execute()) {
    echo json_encode(["status" => "error", "message" => "Execute failed: " . $stmt->error]);
    exit;
}

$newId = $conn->insert_id;
$actor = $_SESSION['user_id'] ?? null;

if ($actor) {
    $activityStmt = $conn->prepare("INSERT INTO activities (actor_id, action, target_type, target_id, message) VALUES (?, ?, ?, ?, ?)");
    if ($activityStmt) {
        $action = 'Added reporting person';
        $targetType = 'user';
        $message = "Added reporting person: " . $full_name;
        $activityStmt->bind_param("issis", $actor, $action, $targetType, $newId, $message);
        $activityStmt->execute();
    }
}

echo json_encode([
    "status" => "success",
    "message" => "Reporting person added successfully"
]);
exit;