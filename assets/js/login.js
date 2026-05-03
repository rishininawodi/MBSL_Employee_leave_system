document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    fetch("../routes/web.php?action=login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: document.getElementById("email").value,
            password: document.getElementById("password").value
        })
    })
    .then(res => res.json())   // ✅ VERY IMPORTANT
    .then(data => {

        console.log("LOGIN RESPONSE:", data);

        if (data.status === "success") {

            sessionStorage.setItem("user", JSON.stringify({
                role: data.role,
                full_name: data.full_name,
                user_id: data.user_id
            }));

            // ✅ ROLE BASED REDIRECT
            if (data.role === "admin") {
                window.location.href = "admin_dashboard.html";
            } 
            else if (data.role === "employee") {
                window.location.href = "employee_dashboard.html";
            } 
            else if (data.role === "reporting_person") {
                window.location.href = "reporting_dashboard.html";
            } 
            else {
                document.getElementById("msg").innerText = "Unknown role";
            }

        } else {
            document.getElementById("msg").innerText = data.message;
        }

    })
    .catch(err => {
        console.log(err);
        document.getElementById("msg").innerText = "Server error";
    });
});