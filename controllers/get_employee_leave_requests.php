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

$filter = $_GET['filter'] ?? 'all';
$allowedFilters = ['all', 'pending', 'approved', 'rejected'];
if (!in_array($filter, $allowedFilters, true)) {
    $filter = 'all';
}

$sql = "
    SELECT
        lr.id,
        lr.leave_type_id,
        lt.type_name AS leave_type,
        lr.from_date,
        lr.to_date,
        lr.total_days,
        lr.reason,
        lr.status,
        lr.applied_date,
        lr.updated_date,
        lr.admin_notes,
        rp.full_name AS reporting_person_name
    FROM leave_requests lr
    LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
    LEFT JOIN users rp ON rp.id = lr.reporting_person_id
    WHERE lr.employee_id = ?
";

if ($filter !== 'all') {
    $sql .= " AND lr.status = ?";
}

$sql .= " ORDER BY lr.applied_date DESC, lr.id DESC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $conn->error]);
    exit;
}

if ($filter !== 'all') {
    $statusMap = [
        'pending' => 'Pending',
        'approved' => 'Approved',
        'rejected' => 'Rejected'
    ];
    $status = $statusMap[$filter];
    $stmt->bind_param('is', $userId, $status);
} else {
    $stmt->bind_param('i', $userId);
}

$stmt->execute();
$result = $stmt->get_result();
$requests = [];

while ($row = $result->fetch_assoc()) {
    $requests[] = $row;
}

$countStmt = $conn->prepare("SELECT
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) AS approved,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected,
        COUNT(*) AS total
    FROM leave_requests
    WHERE employee_id = ?");

$counts = ["pending" => 0, "approved" => 0, "rejected" => 0, "total" => 0];
if ($countStmt) {
    $countStmt->bind_param('i', $userId);
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $counts = $countResult->fetch_assoc() ?: $counts;
}

echo json_encode([
    "success" => true,
    "requests" => $requests,
    "counts" => $counts
]);
