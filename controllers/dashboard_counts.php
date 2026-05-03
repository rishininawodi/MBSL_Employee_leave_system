<?php
require_once "../config/db.php";

$counts = [
    "employees" => 0,
    "reporting_persons" => 0,
    "approved" => 0,
    "rejected" => 0,
    "accepted" => 0
];

$res = $conn->query("SELECT COUNT(*) as c FROM users WHERE role='employee'");
$counts["employees"] = $res->fetch_assoc()["c"];

$res = $conn->query("SELECT COUNT(*) as c FROM users WHERE role='reporting_person'");
$counts["reporting_persons"] = $res->fetch_assoc()["c"];

$res = $conn->query("SELECT COUNT(*) as c FROM leave_requests WHERE status='Approved'");
$counts["approved"] = $res->fetch_assoc()["c"];

$res = $conn->query("SELECT COUNT(*) as c FROM leave_requests WHERE status='Rejected'");
$counts["rejected"] = $res->fetch_assoc()["c"];

$res = $conn->query("SELECT COUNT(*) as c FROM leave_requests WHERE status='Accepted'");
$counts["accepted"] = $res->fetch_assoc()["c"];

echo json_encode($counts);
?>