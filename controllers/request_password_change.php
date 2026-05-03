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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Check if there's a pending or approved request
    $stmt = $conn->prepare("SELECT id, status, approved_at FROM password_change_requests WHERE user_id = ? AND status IN ('Pending', 'Approved') ORDER BY created_at DESC LIMIT 1");
    if (!$stmt) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Database query failed", "error" => $conn->error]);
        exit;
    }
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $request = $result->fetch_assoc();
    
    echo json_encode([
        "success" => true,
        "request" => $request
    ]);
    exit;
}

// POST - Submit request
$reason = $_POST['reason'] ?? 'Need to change password';

// Check if there's already a pending request
$checkStmt = $conn->prepare("SELECT id FROM password_change_requests WHERE user_id = ? AND status = 'Pending'");
if (!$checkStmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database query failed", "error" => $conn->error]);
    exit;
}
$checkStmt->bind_param("i", $userId);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "You already have a pending password change request"]);
    exit;
}

$stmt = $conn->prepare("INSERT INTO password_change_requests (user_id, reason, status) VALUES (?, ?, 'Pending')");
if (!$stmt) {
    echo json_encode(["success" => false, "message" => $conn->error]);
    exit;
}

$stmt->bind_param("is", $userId, $reason);
if (!$stmt->execute()) {
    echo json_encode(["success" => false, "message" => "Failed to submit request"]);
    exit;
}

echo json_encode(["success" => true, "message" => "Request sent to admin for approval"]);
?>
