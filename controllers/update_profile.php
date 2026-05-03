<?php
require_once __DIR__ . "/../config/db.php";
header("Content-Type: application/json; charset=UTF-8");

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
$userId = $_SESSION['user_id'] ?? null;

if (!$userId) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized"]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Invalid request"]);
    exit;
}

$full_name = $_POST['full_name'] ?? null;
$email = $_POST['email'] ?? null;
$department = $_POST['department'] ?? null;
$position = $_POST['position'] ?? null;

if (!$full_name || !$email) {
    echo json_encode(["success" => false, "message" => "Name and email are required"]);
    exit;
}

$stmt = $conn->prepare("UPDATE users SET full_name = ?, email = ?, department = ?, position = ? WHERE id = ?");
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
    exit;
}

$stmt->bind_param("ssssi", $full_name, $email, $department, $position, $userId);
if (!$stmt->execute()) {
    echo json_encode(["success" => false, "message" => "Execute failed: " . $stmt->error]);
    exit;
}

echo json_encode(["success" => true, "message" => "Profile updated successfully"]);
?>