<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once __DIR__ . "/../config/db.php";

$action = $_GET['action'] ?? '';

if ($action === 'login') {
    require_once __DIR__ . "/../controllers/authController.php";
    login();
    exit;
}

if ($action === 'add_employee') {
    require_once __DIR__ . "/../controllers/add_employee.php";
    addEmployee();
    exit;
}

if ($action === 'add_rp') {
    require_once __DIR__ . "/../controllers/add_rp.php";
    require_once __DIR__ . "/../controllers/adminController.php";
    addReportingPerson();
    exit;
}
// routes/web.php
if ($action === 'recent_activities') {
    require_once __DIR__ . "/../controllers/recent_activities.php";
    exit; // ✅ MUST ADD THIS
}