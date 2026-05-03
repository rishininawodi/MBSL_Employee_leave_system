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

$stmt = $conn->prepare("\n    SELECT\n        p.id,\n        p.user_id,\n        p.reason,\n        p.status,\n        p.admin_notes,\n        p.created_at,\n        p.approved_at,\n        u.full_name,\n        u.employee_id,\n        u.department,\n        u.position\n    FROM password_change_requests p\n    INNER JOIN users u ON u.id = p.user_id\n    WHERE p.status = 'Pending'\n    ORDER BY p.created_at DESC\n");

if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database query failed", "error" => $conn->error]);
    exit;
}

$stmt->execute();
$result = $stmt->get_result();
$requests = [];

while ($row = $result->fetch_assoc()) {
    $requests[] = $row;
}

echo json_encode([
    "success" => true,
    "count" => count($requests),
    "requests" => $requests
]);
?>