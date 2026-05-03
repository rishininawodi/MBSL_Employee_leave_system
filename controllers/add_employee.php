<?php
require_once __DIR__ . "/../config/db.php";

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

header("Content-Type: application/json; charset=UTF-8");

$employee_id = $_POST['employee_id'] ?? '';
$full_name = $_POST['full_name'] ?? '';
$email = $_POST['email'] ?? '';
$position = $_POST['position'] ?? '';
$department = $_POST['department'] ?? '';
$passwordRaw = $_POST['password'] ?? '';
$role = $_POST['role'] ?? 'employee';

$reporting_to_input = isset($_POST['reporting_to']) && $_POST['reporting_to'] !== '' ? $_POST['reporting_to'] : null;
$reporting_to = null;

if ($employee_id === '' || $full_name === '' || $email === '' || $passwordRaw === '') {
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

if ($reporting_to_input !== null) {
    $checkStmt = $conn->prepare("SELECT id FROM users WHERE employee_id = ?");
    if (!$checkStmt) {
        echo json_encode(["status" => "error", "message" => "Prepare failed: " . $conn->error]);
        exit;
    }

    $checkStmt->bind_param("s", $reporting_to_input);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();

    if ($checkResult->num_rows === 0) {
        echo json_encode(["status" => "error", "message" => "Reporting Person ID does not exist"]);
        exit;
    }

    $row = $checkResult->fetch_assoc();
    $reporting_to = (int)$row['id'];
    $checkStmt->close();
}

$password = password_hash($passwordRaw, PASSWORD_BCRYPT);

$sql = "INSERT INTO users
    (employee_id, full_name, email, password, department, position, reporting_to, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["status" => "error", "message" => "Prepare failed: " . $conn->error]);
    exit;
}

$stmt->bind_param(
    "ssssssis",
    $employee_id,
    $full_name,
    $email,
    $password,
    $department,
    $position,
    $reporting_to,
    $role
);

if (!$stmt->execute()) {
    echo json_encode(["status" => "error", "message" => "Execute failed: " . $stmt->error]);
    exit;
}

$newId = $conn->insert_id;
$actor = $_SESSION['user_id'] ?? null;

if ($actor) {
    $activityStmt = $conn->prepare("INSERT INTO activities (actor_id, action, target_type, target_id, message) VALUES (?, ?, ?, ?, ?)");
    if ($activityStmt) {
        $action = 'Added employee';
        $targetType = 'user';
        $message = "Added employee: " . $full_name;
        $activityStmt->bind_param("issis", $actor, $action, $targetType, $newId, $message);
        $activityStmt->execute();
    }
}

echo json_encode([
    "status" => "success",
    "message" => "Employee added successfully"
]);
exit;