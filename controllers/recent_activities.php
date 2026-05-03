<?php
require_once __DIR__ . "/../config/db.php";
header("Content-Type: application/json; charset=UTF-8");

$sql = "SELECT a.id, a.action, a.target_type, a.target_id, a.message, a.created_at, u.full_name AS actor_name
        FROM activities a
        LEFT JOIN users u ON u.id = a.actor_id
        ORDER BY a.created_at DESC
        LIMIT 8";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => $conn->error]);
    exit;
}

$stmt->execute();
$res = $stmt->get_result();

$data = [];
while ($r = $res->fetch_assoc()) {
    $data[] = [
        "type" => "activity",
        "label" => $r["message"] ?: $r["action"],
        "meta" => $r["actor_name"] ?: "System",
        "time" => $r["created_at"]
    ];
}

echo json_encode(["success" => true, "data" => $data]);