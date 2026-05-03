document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("employeeForm");
    const messageBox = document.getElementById("message");

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const employee_id = document.getElementById("employee_id").value.trim();
        const full_name = document.getElementById("full_name").value.trim();
        const email = document.getElementById("email").value.trim();
        const department = document.getElementById("department").value.trim();
        const position = document.getElementById("position").value.trim();
        const reporting_to = document.getElementById("reporting_to").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!employee_id || !full_name || !email || !department || !password) {
            messageBox.innerHTML = `<div class="alert alert-danger">Please fill required fields</div>`;
            return;
        }

        const data = new FormData();
        data.append("employee_id", employee_id);
        data.append("full_name", full_name);
        data.append("email", email);
        data.append("department", department);
        data.append("position", position);
        data.append("password", password);
        data.append("role", "employee");
        data.append("reporting_to", reporting_to || "");

        fetch("../controllers/add_employee.php", {
            method: "POST",
            body: data
        })
        .then(res => res.text())
        .then(text => {
            let res;
            try {
                res = JSON.parse(text);
            } catch (err) {
                throw new Error(text);
            }

            if (res.status === "success") {
                messageBox.innerHTML = `<div class="alert alert-success">${res.message}</div>`;
                form.reset();
            } else {
                messageBox.innerHTML = `<div class="alert alert-danger">${res.message}</div>`;
            }
        })
        .catch(err => {
            console.error(err);
            messageBox.innerHTML = `<div class="alert alert-danger">Server error</div>`;
        });
    });
});