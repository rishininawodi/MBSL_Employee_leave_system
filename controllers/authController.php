<?php
session_start();
require_once __DIR__ . "/../config/db.php";

function login() {
    global $conn;

    header("Content-Type: application/json; charset=UTF-8");

    $data = json_decode(file_get_contents("php://input"), true);

    if (!$data) {
        echo json_encode(["status" => "error", "message" => "Invalid request"]);
        return;
    }

    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    $stmt = $conn->prepare("SELECT * FROM users WHERE email=? AND is_active=1");
    if (!$stmt) {
        echo json_encode(["status" => "error", "message" => "Prepare failed"]);
        return;
    }

    $stmt->bind_param("s", $email);
    $stmt->execute();

    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if (!$user) {
        echo json_encode(["status" => "error", "message" => "User not found"]);
        return;
    }

    if (!password_verify($password, $user['password'])) {
        echo json_encode(["status" => "error", "message" => "Wrong password"]);
        return;
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['name'] = $user['full_name'];

    echo json_encode([
        "status" => "success",
        "role" => $user['role'],
        "full_name" => $user['full_name'],
        "user_id" => $user['id']
    ]);
}