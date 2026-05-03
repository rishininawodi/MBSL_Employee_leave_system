<?php
require_once __DIR__ . "/../config/db.php";
header("Content-Type: application/json; charset=UTF-8");

if (session_status() !== PHP_SESSION_ACTIVE) session_start();
$userId = $_SESSION['user_id'] ?? null;

if (!$userId) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Unauthorized - no session"]);
    exit;
}

// Get POST data
$leaveTypeId = (int)($_POST['leave_type_id'] ?? 0);
$fromDate = $_POST['from_date'] ?? '';
$toDate = $_POST['to_date'] ?? '';
$totalDays = (float)($_POST['total_days'] ?? 0);
$reason = $_POST['reason'] ?? '';

if (!$leaveTypeId || !$fromDate || !$toDate || !$totalDays || !$reason) {
    echo json_encode(["success" => false, "message" => "Missing required fields", "debug" => "type=$leaveTypeId, from=$fromDate, to=$toDate, days=$totalDays, reason=".strlen($reason)]);
    exit;
}

// Validate dates
$from = strtotime($fromDate);
$to = strtotime($toDate);

if ($from === false || $to === false || $to < $from) {
    echo json_encode(["success" => false, "message" => "Invalid date range"]);
    exit;
}

// Check leave balance and balance limits
$balStmt = $conn->prepare("SELECT remaining_days FROM leave_balances WHERE user_id = ? AND leave_type_id = ? AND year = ?");
if (!$balStmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error"]);
    exit;
}

$year = date('Y');
$balStmt->bind_param("iii", $userId, $leaveTypeId, $year);
$balStmt->execute();
$balResult = $balStmt->get_result();
$balance = $balResult->fetch_assoc();

$remainingDays = 0;

if ($balance) {
    // If balance record exists, use it
    $remainingDays = (int)$balance['remaining_days'];
} else {
    // Otherwise fetch max_days from leave_types table and initialize leave_balances
    $typeStmt = $conn->prepare("SELECT max_days FROM leave_types WHERE id = ?");
    if (!$typeStmt) {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Database error: leave_types prepare failed", "error" => $conn->error]);
        exit;
    }
    $typeStmt->bind_param("i", $leaveTypeId);
    $typeStmt->execute();
    $typeResult = $typeStmt->get_result();
    $typeRow = $typeResult->fetch_assoc();
    if ($typeRow) {
        $remainingDays = (int)$typeRow['max_days'];
        
        // Initialize leave_balances for this employee/leave_type/year
        $initStmt = $conn->prepare("INSERT IGNORE INTO leave_balances (user_id, leave_type_id, year, remaining_days) VALUES (?, ?, ?, ?)");
        if ($initStmt) {
            $initStmt->bind_param("iiii", $userId, $leaveTypeId, $year, $remainingDays);
            $initStmt->execute();
        }
    } else {
        // If leave_types record not found, default to 10
        $remainingDays = 10;
    }
}

if ($remainingDays < $totalDays) {
    echo json_encode([
        "success" => false, 
        "message" => "Insufficient leave balance. Available: " . $remainingDays . " days, Requested: " . $totalDays . " days"
    ]);
    exit;
}

// Insert leave request
$stmt = $conn->prepare("
    INSERT INTO leave_requests 
    (employee_id, leave_type_id, from_date, to_date, total_days, reason, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Pending')
");

if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: prepare failed", "error" => $conn->error]);
    exit;
}

$stmt->bind_param("iissds", $userId, $leaveTypeId, $fromDate, $toDate, $totalDays, $reason);

if (!$stmt->execute()) {
    http_response_code(500);
    $error = $stmt->error ?: "Unknown error";
    // Log to file for debugging
    error_log("Leave request INSERT failed: " . $error . " | user_id: $userId, type_id: $leaveTypeId, from: $fromDate, to: $toDate, days: $totalDays, reason: $reason");
    echo json_encode(["success" => false, "message" => "Failed to submit leave request: " . $error, "debug" => "user_id: $userId, type_id: $leaveTypeId, from: $fromDate, to: $toDate, days: $totalDays"]);
    exit;
}

// Log activity
$actor = $_SESSION['user_id'] ?? null;
if ($actor) {
    $activityStmt = $conn->prepare("INSERT INTO activities (actor_id, action, target_type, target_id, message) VALUES (?, ?, ?, ?, ?)");
    if ($activityStmt) {
        $action = 'Applied for leave';
        $targetType = 'leave_request';
        $message = "Applied for leave from " . $fromDate . " to " . $toDate;
        $activityStmt->bind_param("issis", $actor, $action, $targetType, $conn->insert_id, $message);
        $activityStmt->execute();
    }
}

echo json_encode([
    "success" => true,
    "message" => "Leave request submitted successfully and is pending approval",
    "request_id" => $conn->insert_id
]);
?>
