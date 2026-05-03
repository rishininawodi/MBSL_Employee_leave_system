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

$requestId = (int)($_POST['request_id'] ?? 0);
$action = $_POST['action'] ?? ''; // 'approve' or 'reject'
$notes = $_POST['notes'] ?? '';

if (!$requestId || !in_array($action, ['approve', 'reject'])) {
    echo json_encode(["success" => false, "message" => "Invalid request"]);
    exit;
}

// Verify the request exists and is either unassigned or assigned to this reporting person
$checkStmt = $conn->prepare("SELECT reporting_person_id FROM leave_requests WHERE id = ?");
if (!$checkStmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error"]);
    exit;
}

$checkStmt->bind_param("i", $requestId);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "Request not found"]);
    exit;
}

$row = $checkResult->fetch_assoc();
$assignedRp = $row['reporting_person_id'];

if (!is_null($assignedRp) && (int)$assignedRp !== (int)$userId) {
    http_response_code(403);
    echo json_encode(["success" => false, "message" => "Not authorized to approve this request"]);
    exit;
}

// Get request details before updating (for balance deduction on approval)
$detailStmt = $conn->prepare("SELECT employee_id, leave_type_id, total_days, from_date FROM leave_requests WHERE id = ?");
if ($detailStmt) {
    $detailStmt->bind_param("i", $requestId);
    $detailStmt->execute();
    $detailResult = $detailStmt->get_result();
    $requestDetails = $detailResult->fetch_assoc();
} else {
    $requestDetails = null;
}

// Update request status
$newStatus = $action === 'approve' ? 'Approved' : 'Rejected';

// When a reporting person acts on an unassigned request, claim it by setting reporting_person_id
$updateStmt = $conn->prepare(
    "UPDATE leave_requests \n" .
    "SET status = ?, admin_notes = ?, reporting_person_id = COALESCE(reporting_person_id, ?), updated_date = NOW() \n" .
    "WHERE id = ?"
);

if (!$updateStmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
    exit;
}

$updateStmt->bind_param("ssii", $newStatus, $notes, $userId, $requestId);

if (!$updateStmt->execute()) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Failed to update request", "error" => $updateStmt->error]);
    exit;
}

// If approving, deduct leave days from leave_balances
if ($action === 'approve' && $requestDetails) {
    $empId = (int)$requestDetails['employee_id'];
    $leaveTypeId = (int)$requestDetails['leave_type_id'];
    $totalDays = (float)$requestDetails['total_days'];
    $requestYear = (int)date('Y', strtotime($requestDetails['from_date']));
    
    // First ensure leave_balances row exists for this employee/leave_type/year
    $initStmt = $conn->prepare(
        "INSERT INTO leave_balances (user_id, leave_type_id, year, remaining_days) \n" .
        "SELECT ?, ?, ?, lt.max_days FROM leave_types lt WHERE lt.id = ? \n" .
        "ON DUPLICATE KEY UPDATE remaining_days = remaining_days"
    );
    if ($initStmt) {
        $initStmt->bind_param("iiii", $empId, $leaveTypeId, $requestYear, $leaveTypeId);
        $initStmt->execute();
    }
    
    // Deduct the days from leave_balances
    $deductStmt = $conn->prepare(
        "UPDATE leave_balances \n" .
        "SET remaining_days = GREATEST(0, remaining_days - ?) \n" .
        "WHERE user_id = ? AND leave_type_id = ? AND year = ?"
    );
    if ($deductStmt) {
        $deductStmt->bind_param("diii", $totalDays, $empId, $leaveTypeId, $requestYear);
        $deductStmt->execute();
    }
}

// Log activity
$activityStmt = $conn->prepare("INSERT INTO activities (actor_id, action, target_type, target_id, message) VALUES (?, ?, ?, ?, ?)");
if ($activityStmt) {
    $actionText = $action === 'approve' ? 'Approved' : 'Rejected';
    $message = "Leave request $actionText by reporting person";
    $targetType = 'leave_request';
    $activityStmt->bind_param("issis", $userId, $actionText, $targetType, $requestId, $message);
    $activityStmt->execute();
}

echo json_encode([
    "success" => true,
    "message" => $newStatus . " successfully",
    "new_status" => $newStatus
]);
?>
