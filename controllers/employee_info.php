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

// Fetch user profile
$stmt = $conn->prepare("SELECT id, employee_id, full_name, email, department, position, role FROM users WHERE id = ?");
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database query failed", "error" => $conn->error]);
    exit;
}
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();

if (!$user) {
    echo json_encode(["success" => false, "message" => "User not found"]);
    exit;
}

// Fetch leave balances for all leave types.
// Fall back to a default set when the database has not been seeded yet.
$year = date('Y');
$balances = [];
$defaultTypes = [
    ["id" => 1, "type_name" => "Casual Leave", "max_days" => 10],
    ["id" => 2, "type_name" => "Medical Leave", "max_days" => 10],
    ["id" => 3, "type_name" => "Annual Leave", "max_days" => 10],
];

$types = [];
$typesRes = $conn->query("SELECT id, type_name, max_days FROM leave_types ORDER BY id ASC");
if ($typesRes instanceof mysqli_result) {
    while ($type = $typesRes->fetch_assoc()) {
        $types[] = $type;
    }
}

if (empty($types)) {
    $types = $defaultTypes;
}

foreach ($types as $type) {
    $typeId = (int)$type['id'];
    $maxDays = (int)$type['max_days'];
    $typeName = $type['type_name'];

    $remaining = $maxDays;
    $balanceStmt = $conn->prepare("SELECT remaining_days FROM leave_balances WHERE user_id = ? AND leave_type_id = ? AND year = ?");
    if ($balanceStmt) {
        $balanceStmt->bind_param("iii", $userId, $typeId, $year);
        $balanceStmt->execute();
        $balResult = $balanceStmt->get_result();
        if ($balResult instanceof mysqli_result) {
            $balance = $balResult->fetch_assoc();
            if ($balance && isset($balance['remaining_days'])) {
                $remaining = (int)$balance['remaining_days'];
            }
        }
    }

    $used = 0;
    $usedStmt = $conn->prepare("SELECT SUM(total_days) as used FROM leave_requests WHERE employee_id = ? AND leave_type_id = ? AND status IN ('Approved', 'Pending') AND YEAR(from_date) = ?");
    if ($usedStmt) {
        $usedStmt->bind_param("iii", $userId, $typeId, $year);
        $usedStmt->execute();
        $usedResult = $usedStmt->get_result();
        if ($usedResult instanceof mysqli_result) {
            $usedData = $usedResult->fetch_assoc();
            $used = (int)($usedData['used'] ?? 0);
        }
    }

    $balances[] = [
        "type_id" => $typeId,
        "type_name" => $typeName,
        "total" => $maxDays,
        "used" => $used,
        "remaining" => $remaining
    ];
}

echo json_encode([
    "success" => true,
    "user" => $user,
    "balances" => $balances
]);
