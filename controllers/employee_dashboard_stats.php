<?php
require_once __DIR__ . "/../config/db.php";
header("Content-Type: application/json; charset=UTF-8");

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

$userId = $_SESSION['user_id'] ?? null;
if (!$userId) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized"]);
    exit;
}

$statusCounts = [
    'pending' => 0,
    'approved' => 0,
    'rejected' => 0,
    'total' => 0,
];

$statusStmt = $conn->prepare("\n    SELECT\n        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,\n        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,\n        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,\n        COUNT(*) AS total\n    FROM leave_requests\n    WHERE employee_id = ?\n");

if ($statusStmt) {
    $statusStmt->bind_param('i', $userId);
    $statusStmt->execute();
    $statusResult = $statusStmt->get_result();
    $statusCounts = $statusResult->fetch_assoc() ?: $statusCounts;
}

$typeData = [];
$typeStmt = $conn->prepare("\n    SELECT\n        lt.type_name AS leave_type,\n        SUM(lr.total_days) AS days_used,\n        COUNT(*) AS request_count\n    FROM leave_requests lr\n    LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id\n    WHERE lr.employee_id = ?\n    GROUP BY lr.leave_type_id, lt.type_name\n    ORDER BY request_count DESC, days_used DESC\n");

if ($typeStmt) {
    $typeStmt->bind_param('i', $userId);
    $typeStmt->execute();
    $typeResult = $typeStmt->get_result();
    while ($row = $typeResult->fetch_assoc()) {
        $typeData[] = $row;
    }
}

$recentRequests = [];
$recentStmt = $conn->prepare("\n    SELECT\n        lr.id,\n        lt.type_name AS leave_type,\n        lr.from_date,\n        lr.to_date,\n        lr.total_days,\n        lr.status,\n        lr.applied_date,\n        lr.updated_date\n    FROM leave_requests lr\n    LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id\n    WHERE lr.employee_id = ?\n    ORDER BY COALESCE(lr.updated_date, lr.applied_date) DESC, lr.id DESC\n    LIMIT 6\n");

if ($recentStmt) {
    $recentStmt->bind_param('i', $userId);
    $recentStmt->execute();
    $recentResult = $recentStmt->get_result();
    while ($row = $recentResult->fetch_assoc()) {
        $recentRequests[] = $row;
    }
}

echo json_encode([
    'success' => true,
    'status_counts' => $statusCounts,
    'type_data' => $typeData,
    'recent_requests' => $recentRequests,
]);
