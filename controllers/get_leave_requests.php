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

// Get filter parameter: pending, history, or all
$filter = $_GET['filter'] ?? 'pending';

// Fetch leave requests where this user is the reporting person
$query = "
    SELECT 
        lr.id,
        lr.employee_id,
        u.full_name as employee_name,
        u.email,
        lt.type_name as leave_type,
        lr.leave_type_id,
        GREATEST(
            COALESCE(
                lb.remaining_days,
                lt.max_days - IFNULL((
                    SELECT SUM(total_days) FROM leave_requests lr2
                    WHERE lr2.employee_id = lr.employee_id
                      AND lr2.leave_type_id = lr.leave_type_id
                      AND lr2.status = 'Approved'
                      AND YEAR(lr2.from_date) = YEAR(lr.from_date)
                ), 0)
            ),
            0
        ) AS remaining_days,
        lr.from_date,
        lr.to_date,
        lr.total_days,
        lr.reason,
        lr.status,
        lr.reporting_person_id,
        lr.admin_notes,
        lr.applied_date,
        lr.updated_date
    FROM leave_requests lr
    JOIN users u ON lr.employee_id = u.id
    JOIN leave_types lt ON lr.leave_type_id = lt.id
    LEFT JOIN leave_balances lb ON lb.user_id = lr.employee_id AND lb.leave_type_id = lr.leave_type_id AND lb.year = YEAR(lr.from_date)
    WHERE (lr.reporting_person_id = ? OR lr.reporting_person_id IS NULL)
";

if ($filter === 'pending') {
    $query .= " AND lr.status = 'Pending'";
} elseif ($filter === 'history') {
    $query .= " AND lr.status IN ('Approved', 'Rejected')";
}

$query .= " ORDER BY lr.applied_date DESC";

$stmt = $conn->prepare($query);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
    exit;
}

$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$requests = [];

while ($row = $result->fetch_assoc()) {
    $requests[] = $row;
}

// Get counts
$countQuery = "
    SELECT 
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected
    FROM leave_requests
    WHERE (reporting_person_id = ? OR reporting_person_id IS NULL)
";

$countStmt = $conn->prepare($countQuery);
if ($countStmt) {
    $countStmt->bind_param("i", $userId);
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $counts = $countResult->fetch_assoc() ?? ["pending" => 0, "approved" => 0, "rejected" => 0];
} else {
    $counts = ["pending" => 0, "approved" => 0, "rejected" => 0];
}

echo json_encode([
    "success" => true,
    "requests" => $requests,
    "counts" => $counts
]);
?>
