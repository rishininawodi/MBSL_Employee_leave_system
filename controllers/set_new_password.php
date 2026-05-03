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

$new_password = $_POST['new_password'] ?? null;

if (!$new_password) {
    echo json_encode(["success" => false, "message" => "Password required"]);
    exit;
}

// Check if request is approved
$stmt = $conn->prepare("SELECT id, status FROM password_change_requests WHERE user_id = ? AND status = 'Approved' ORDER BY approved_at DESC LIMIT 1");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database query failed", "error" => $conn->error]);
    exit;
}
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$request = $result->fetch_assoc();

if (!$request) {
    echo json_encode(["success" => false, "message" => "No approved password change request found"]);
    exit;
}

// Update password
$hash = password_hash($new_password, PASSWORD_BCRYPT);
$updateStmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
$updateStmt->bind_param("si", $hash, $userId);

if (!$updateStmt->execute()) {
    echo json_encode(["success" => false, "message" => "Failed to update password"]);
    exit;
}

// Mark request as completed
$completeStmt = $conn->prepare("UPDATE password_change_requests SET status = 'Completed' WHERE id = ?");
$completeStmt->bind_param("i", $request['id']);
$completeStmt->execute();

echo json_encode(["success" => true, "message" => "Password changed successfully"]);
?>
