<?php

header("Content-Type: application/json; charset=UTF-8");

// Keep connection failures from emitting HTML warning output into JSON responses.
mysqli_report(MYSQLI_REPORT_OFF);

$dbHost = getenv('DB_HOST') ?: '127.0.0.1';
$dbPort = (int)(getenv('DB_PORT') ?: 3306);
$dbName = getenv('DB_NAME') ?: 'mbsl_leave_system';

$conn = @new mysqli($dbHost, "root", "", $dbName, $dbPort);

// ✅ Check connection
if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode([
        "status" => "error",
        "message" => "Database connection failed",
        "error" => $conn->connect_error
    ]));
}

// ✅ Set proper encoding (IMPORTANT for clean data)
$conn->set_charset("utf8mb4");

?>