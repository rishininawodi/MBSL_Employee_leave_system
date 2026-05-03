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

$roleStmt = $conn->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
if (!$roleStmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database query failed", "error" => $conn->error]);
    exit;
}

$roleStmt->bind_param("i", $userId);
$roleStmt->execute();
$roleResult = $roleStmt->get_result();
$currentUser = $roleResult->fetch_assoc();

if (!$currentUser || strtolower((string)$currentUser['role']) !== 'admin') {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Forbidden"]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method not allowed"]);
    exit;
}

$requestId = (int)($_POST['request_id'] ?? 0);
$action = trim((string)($_POST['action'] ?? ''));
$adminNotes = trim((string)($_POST['admin_notes'] ?? ''));

if ($requestId <= 0 || !in_array($action, ['approve', 'reject'], true)) {
    http_response_code(422);
    echo json_encode(["success" => false, "message" => "Invalid request data"]);
    exit;
}

$lookupStmt = $conn->prepare("SELECT id, status FROM password_change_requests WHERE id = ? LIMIT 1");
if (!$lookupStmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database query failed", "error" => $conn->error]);
    exit;
}

$lookupStmt->bind_param("i", $requestId);
$lookupStmt->execute();
$lookupResult = $lookupStmt->get_result();
$request = $lookupResult->fetch_assoc();

if (!$request) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "Password request not found"]);
    exit;
}

if ($request['status'] !== 'Pending') {
    http_response_code(409);
    echo json_encode(["success" => false, "message" => "This request has already been processed"]);
    exit;
}

$newStatus = $action === 'approve' ? 'Approved' : 'Rejected';
$updateStmt = $conn->prepare("UPDATE password_change_requests SET status = ?, admin_id = ?, admin_notes = ?, approved_at = NOW() WHERE id = ?");
if (!$updateStmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database query failed", "error" => $conn->error]);
    exit;
}

$updateStmt->bind_param("sisi", $newStatus, $userId, $adminNotes, $requestId);

if (!$updateStmt->execute()) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to update request"]);
    exit;
}

echo json_encode([
    "success" => true,
    "message" => $action === 'approve' ? 'Request approved' : 'Request rejected',
    "status" => $newStatus
]);
?>