

document.addEventListener("DOMContentLoaded", () => {
    let usersChart = null;
    let leaveChart = null;
    let passwordRequestRequests = [];

    const passwordRequestBell = document.getElementById('passwordRequestBell');
    const passwordRequestDropdown = document.getElementById('passwordRequestDropdown');
    const passwordRequestCount = document.getElementById('passwordRequestCount');
    const passwordRequestList = document.getElementById('passwordRequestList');
    const passwordRequestSummary = document.getElementById('passwordRequestSummary');
    const refreshPasswordRequests = document.getElementById('refreshPasswordRequests');

    function closePasswordRequestPanel() {
        if (!passwordRequestDropdown) return;
        passwordRequestDropdown.classList.remove('show');
        passwordRequestDropdown.setAttribute('aria-hidden', 'true');
    }

    function openPasswordRequestPanel() {
        if (!passwordRequestDropdown) return;
        passwordRequestDropdown.classList.add('show');
        passwordRequestDropdown.setAttribute('aria-hidden', 'false');
    }

    function renderPasswordRequests(requests) {
        if (!passwordRequestList || !passwordRequestCount || !passwordRequestSummary) return;

        passwordRequestRequests = Array.isArray(requests) ? requests : [];
        const count = passwordRequestRequests.length;

        if (count > 0) {
            passwordRequestCount.textContent = String(count);
            passwordRequestCount.style.display = 'flex';
        } else {
            passwordRequestCount.textContent = '0';
            passwordRequestCount.style.display = 'none';
        }

        passwordRequestSummary.textContent = count > 0 ? `${count} pending request${count === 1 ? '' : 's'}` : 'No pending password requests';

        if (count === 0) {
            passwordRequestList.innerHTML = '<div class="notification-empty">No password change requests right now.</div>';
            return;
        }

        passwordRequestList.innerHTML = passwordRequestRequests.map((request) => {
            const submittedAt = request.created_at ? new Date(request.created_at).toLocaleString() : 'Unknown';
            return `
                <div class="password-request-item" data-request-id="${request.id}">
                    <div class="request-title">${request.full_name || 'Employee'}</div>
                    <div class="request-meta">${request.employee_id || '-'} | ${request.department || '-'} | ${request.position || '-'}</div>
                    <div class="request-meta mt-1">Submitted: ${submittedAt}</div>
                    <div class="request-reason">${request.reason || 'No reason provided'}</div>
                    <div class="password-request-actions">
                        <button class="btn btn-success btn-sm" data-action="approve" data-request-id="${request.id}">Approve</button>
                        <button class="btn btn-outline-danger btn-sm" data-action="reject" data-request-id="${request.id}">Reject</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async function loadPasswordRequests() {
        if (!passwordRequestList) return;

        try {
            const res = await fetch('/MBSL_Employee_leave_system/controllers/admin_password_requests.php', {
                cache: 'no-store',
                credentials: 'same-origin'
            });

            const text = await res.text();

            // Try parse JSON but preserve raw text for debugging
            let data = null;
            try {
                data = JSON.parse(text);
            } catch (parseErr) {
                console.error('Failed to parse JSON from admin_password_requests.php', { status: res.status, text });
                throw new Error('Invalid JSON response from server');
            }

            if (!res.ok || !data.success) {
                console.error('Server returned error for password requests', { status: res.status, data });
                throw new Error(data.message || `HTTP ${res.status}`);
            }

            renderPasswordRequests(data.requests || []);
        } catch (err) {
            console.error('Password request load failed', err);
            if (passwordRequestList) {
                passwordRequestList.innerHTML = `<div class="notification-error">Unable to load password requests.<br>${err.message}</div>`;
            }
            if (passwordRequestSummary) {
                passwordRequestSummary.textContent = 'Failed to load requests';
            }
        }
    }

    async function respondToPasswordRequest(requestId, action) {
        const adminNotes = window.prompt(`Enter admin notes for this ${action}:`, '') || '';

        try {
            const formData = new FormData();
            formData.append('request_id', String(requestId));
            formData.append('action', action);
            formData.append('admin_notes', adminNotes);

            const response = await fetch('/MBSL_Employee_leave_system/controllers/respond_password_request.php', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || `HTTP ${response.status}`);
            }

            await loadPasswordRequests();
        } catch (err) {
            console.error('Password request action failed', err);
            window.alert(err.message || 'Failed to update request');
        }
    }

    // ==============================
    // LOAD ADMIN INFO
    // ==============================
    async function loadAdminInfo() {
        try {
            const response = await fetch(
                '/MBSL_Employee_leave_system/controllers/get_admin_info.php',
                { cache: 'no-store', credentials: 'same-origin' }
            );

            const data = await response.json();

            if (data.success && data.name) {
                const fullName = data.name;
                const firstName = fullName.split(' ')[0];

                const initials = fullName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                const adminName = document.getElementById('adminName');
                const adminAvatar = document.getElementById('adminAvatar');

                if (adminName) adminName.textContent = firstName;
                if (adminAvatar) adminAvatar.textContent = initials;
            }

        } catch (err) {
            console.log('Could not load admin info', err);
        }
    }

    if (passwordRequestBell) {
        passwordRequestBell.addEventListener('click', (event) => {
            event.stopPropagation();
            if (passwordRequestDropdown && passwordRequestDropdown.classList.contains('show')) {
                closePasswordRequestPanel();
            } else {
                openPasswordRequestPanel();
                loadPasswordRequests();
            }
        });
    }

    if (refreshPasswordRequests) {
        refreshPasswordRequests.addEventListener('click', (event) => {
            event.stopPropagation();
            loadPasswordRequests();
        });
    }

    if (passwordRequestList) {
        passwordRequestList.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action][data-request-id]');
            if (!button) return;

            const requestId = parseInt(button.dataset.requestId, 10);
            const action = button.dataset.action;
            if (!requestId || !action) return;

            respondToPasswordRequest(requestId, action);
        });
    }

    document.addEventListener('click', (event) => {
        if (!passwordRequestDropdown || !passwordRequestBell) return;
        const clickedInsidePanel = passwordRequestDropdown.contains(event.target);
        const clickedBell = passwordRequestBell.contains(event.target);

        if (!clickedInsidePanel && !clickedBell) {
            closePasswordRequestPanel();
        }
    });


    // ==============================
    // LOAD RECENT ACTIVITIES
    // ==============================
    async function loadRecentActivities() {
        try {
            const endpoints = [
                '../routes/web.php?action=recent_activities',
                '/MBSL_Employee_leave_system/controllers/recent_activities.php'
            ];

            let j = null;
            let lastError = null;

            for (const endpoint of endpoints) {
                try {
                    const res = await fetch(endpoint, { cache: 'no-store', credentials: 'same-origin' });
                    const text = await res.text();

                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
                    }

                    j = JSON.parse(text);
                    if (j && (j.success === true || Array.isArray(j.data))) {
                        break;
                    }
                } catch (err) {
                    lastError = err;
                }
            }

            if (!j) {
                throw lastError || new Error('Unable to load recent activities');
            }

            const list = document.getElementById('recentActivitiesList');
            const count = document.getElementById('ra-count');

            if (!list || !count) return;

            const getRelativeTime = (timeValue) => {
                if (!timeValue) return 'Unknown time';
                const then = new Date(timeValue).getTime();
                if (Number.isNaN(then)) return 'Unknown time';

                const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
                if (diffSec < 60) return `${diffSec}s ago`;
                if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
                if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
                return `${Math.floor(diffSec / 86400)}d ago`;
            };

            const getType = (label = '') => {
                const text = String(label).toLowerCase();
                if (text.includes('deactivate') || text.includes('reject') || text.includes('delete')) return 'alert';
                if (text.includes('update') || text.includes('edit')) return 'update';
                return 'new';
            };

            if (!j.success) {
                list.classList.add('is-empty');
                list.innerHTML = '<li class="activity-empty">No activities found.</li>';
                count.textContent = '0 recent';
                return;
            }

            const items = (Array.isArray(j.data) ? j.data : []).slice(0, 6);

            list.innerHTML = '';
            count.textContent = `${items.length} recent`;

            if (items.length === 0) {
                list.classList.add('is-empty');
                list.innerHTML = '<li class="activity-empty">No activities yet.</li>';
                return;
            }

            list.classList.remove('is-empty');

            items.forEach((it, idx) => {
                const li = document.createElement('li');
                li.className = 'activity-item d-flex justify-content-between align-items-start';
                li.style.animationDelay = `${Math.min(idx * 0.06, 0.3)}s`;

                const when = it.time ? new Date(it.time).toLocaleString() : '';
                const relative = getRelativeTime(it.time);
                const tag = getType(it.label);
                const tagText = tag === 'alert' ? 'Alert' : tag === 'update' ? 'Update' : 'New';

                li.innerHTML = `
                    <span class="activity-dot activity-dot-${tag}" aria-hidden="true"></span>
                    <div>
                        <div class="small text-muted">Admin Activity</div>
                        <div class="activity-title">${it.label || '-'}</div>
                        <div class="activity-meta">
                            ${it.meta || '-'}
                        </div>
                    </div>
                    <div class="text-end activity-time">
                        <div><span class="badge text-bg-light">${tagText}</span></div>
                        <div class="mt-1">${relative}</div>
                        <div class="small text-muted">${when}</div>
                    </div>
                `;

                list.appendChild(li);
            });

            // position the vertical line between first and last items
            (function updateActivityLine() {
                try {
                    const line = document.getElementById('activity-line');
                    if (!line) return;

                    const first = list.querySelector('.activity-item');
                    const last = list.querySelector('.activity-item:last-of-type');

                    if (!first || !last) {
                        line.style.opacity = '0';
                        return;
                    }

                    const dotFirst = first.querySelector('.activity-dot');
                    const dotLast = last.querySelector('.activity-dot');
                    if (!dotFirst || !dotLast) {
                        line.style.opacity = '0';
                        return;
                    }

                    // compute center y positions relative to the list container
                    const listRect = list.getBoundingClientRect();
                    const firstRect = dotFirst.getBoundingClientRect();
                    const lastRect = dotLast.getBoundingClientRect();

                    const firstCenter = firstRect.top - listRect.top + (firstRect.height / 2);
                    const lastCenter = lastRect.top - listRect.top + (lastRect.height / 2);

                    const top = Math.min(firstCenter, lastCenter);
                    const height = Math.max(4, Math.abs(lastCenter - firstCenter));

                    line.style.top = `${top}px`;
                    line.style.height = `${height}px`;
                    line.style.opacity = '1';
                } catch (err) {
                    // fail silently
                }
            })();

        } catch (err) {
            console.error('Recent activities load failed', err);
        }
    }

    // Soft shadow for bars/arcs
const chartShadowPlugin = {
    id: 'chartShadow',
    beforeDatasetsDraw(chart) {
        const { ctx } = chart;
        ctx.save();
        ctx.shadowColor = 'rgba(7, 59, 76, 0.18)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;
    },
    afterDatasetsDraw(chart) {
        chart.ctx.restore();
    }
};

    // subtle circular track behind doughnut segments
    const doughnutTrackPlugin = {
        id: 'doughnutTrack',
        beforeDatasetsDraw(chart) {
            if (chart.config.type !== 'doughnut') return;
            const meta = chart.getDatasetMeta(0);
            const arc = meta?.data?.[0];
            if (!arc) return;

            const { ctx } = chart;
            const { x, y, innerRadius, outerRadius } = arc;

            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(18, 49, 61, 0.08)';
            ctx.lineWidth = outerRadius - innerRadius;
            ctx.arc(x, y, (innerRadius + outerRadius) / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    };

    // Center text for doughnut
    const centerTextPlugin = {
        id: 'centerText',
        afterDraw(chart, args, pluginOptions) {
            if (chart.config.type !== 'doughnut') return;

            const { ctx, chartArea: { left, right, top, bottom } } = chart;
            const x = (left + right) / 2;
            const y = (top + bottom) / 2;

            const total = pluginOptions?.total ?? 0;
            const label = pluginOptions?.label ?? 'Total';
            const subLabel = pluginOptions?.subLabel ?? '';

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillStyle = '#12313d';
            ctx.font = '700 30px Manrope, sans-serif';
            ctx.fillText(String(total), x, y - 10);

            ctx.fillStyle = '#607b84';
            ctx.font = '600 12px Manrope, sans-serif';
            ctx.fillText(label, x, y + 14);

            if (subLabel) {
                ctx.fillStyle = '#0b647f';
                ctx.font = '700 11px Manrope, sans-serif';
                ctx.fillText(subLabel, x, y + 30);
            }
            ctx.restore();
        }
    };


    // ==============================
    // LOAD DASHBOARD COUNTS + CHARTS
    // ==============================
    function loadDashboardCounts() {
        fetch("/MBSL_Employee_leave_system/controllers/dashboard_counts.php", { credentials: 'same-origin', cache: 'no-store' })
            .then(res => res.json())
            .then(data => {

                const empCount = document.getElementById("empCount");
                const rpCount = document.getElementById("rpCount");
                const approvedCount = document.getElementById("approvedCount");
                const rejectedCount = document.getElementById("rejectedCount");
                const totalLeaves = document.getElementById("totalLeaves");

                if (empCount) empCount.innerText = data.employees ?? 0;
                if (rpCount) rpCount.innerText = data.reporting_persons ?? 0;
                if (approvedCount) approvedCount.innerText = data.approved ?? 0;
                if (rejectedCount) rejectedCount.innerText = data.rejected ?? 0;

                const approved = parseInt(data.approved ?? 0, 10);
                const rejected = parseInt(data.rejected ?? 0, 10);
                const accepted = parseInt(data.accepted ?? 0, 10);

                if (totalLeaves) totalLeaves.innerText = approved + rejected + accepted;


                // BAR CHART (advanced)
const barCanvas = document.getElementById('barChart');
if (barCanvas) {
    const ctxBar = barCanvas.getContext('2d');

    const g1 = ctxBar.createLinearGradient(0, 0, 0, 220);
    g1.addColorStop(0, '#118ab2');
    g1.addColorStop(1, '#0b647f');

    const g2 = ctxBar.createLinearGradient(0, 0, 0, 220);
    g2.addColorStop(0, '#06d6a0');
    g2.addColorStop(1, '#10ac84');

    if (usersChart) usersChart.destroy();

    usersChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Employees', 'Reporting Persons'],
            datasets: [{
                label: 'Total Users',
                data: [data.employees ?? 0, data.reporting_persons ?? 0],
                backgroundColor: [g1, g2],
                borderRadius: 14,
                borderSkipped: false,
                barThickness: 42
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            animation: { duration: 1200, easing: 'easeOutQuart' },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#12313d',
                    titleColor: '#fff',
                    bodyColor: '#eaf4f8',
                    padding: 10,
                    cornerRadius: 10
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#56717a', font: { weight: '600' } }
                },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: '#56717a' },
                    grid: { color: 'rgba(18,49,61,0.08)' }
                }
            }
        },
        plugins: [chartShadowPlugin]
    });
}

                // LEAVE CHART (advanced doughnut)
                const donutCanvas = document.getElementById('donutChart');
                if (donutCanvas) {
                    const ctxDonut = donutCanvas.getContext('2d');

                    const totalLeave = approved + rejected + accepted;
                    const chartValues = totalLeave > 0 ? [approved, rejected, accepted] : [1, 0, 0];
                    const approvedRate = totalLeave > 0 ? Math.round((approved / totalLeave) * 100) : 0;

                    if (leaveChart) leaveChart.destroy();

                    leaveChart = new Chart(ctxDonut, {
                        type: 'doughnut',
                        data: {
                            labels: ['Approved', 'Rejected', 'Accepted'],
                            datasets: [{
                                data: chartValues,
                                backgroundColor: ['#06d6a0', '#ef476f', '#ffd166'],
                                borderColor: '#ffffff',
                                borderWidth: 3,
                                hoverOffset: 10,
                                spacing: 3
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            cutout: '72%',
                            rotation: -90,
                            circumference: 360,
                            layout: {
                                padding: 6
                            },
                            animation: { duration: 1400, easing: 'easeOutExpo' },
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: {
                                        usePointStyle: true,
                                        pointStyle: 'circle',
                                        padding: 16,
                                        boxWidth: 10,
                                        color: '#45636d',
                                        font: { size: 12, weight: '600' },
                                        filter: (_item, legendData) => {
                                            if (totalLeave > 0) return true;
                                            return legendData.index === 0;
                                        },
                                        generateLabels: (chart) => {
                                            const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                            if (totalLeave > 0) return defaultLabels;
                                            return defaultLabels.map((l) => ({ ...l, text: l.text === 'Approved' ? 'No leave data yet' : l.text }));
                                        }
                                    }
                                },
                                tooltip: {
                                    backgroundColor: '#12313d',
                                    titleColor: '#fff',
                                    bodyColor: '#eaf4f8',
                                    cornerRadius: 10,
                                    callbacks: {
                                        label(context) {
                                            if (totalLeave === 0) return 'No leave data yet';
                                            const v = context.parsed || 0;
                                            const pct = ((v / totalLeave) * 100).toFixed(1);
                                            return `${context.label}: ${v} (${pct}%)`;
                                        }
                                    }
                                },
                                centerText: {
                                    total: totalLeave,
                                    label: 'Leave Requests',
                                    subLabel: totalLeave > 0 ? `${approvedRate}% approved` : 'Awaiting data'
                                }
                            }
                        },
                        plugins: [doughnutTrackPlugin, chartShadowPlugin, centerTextPlugin]
                    });
                }

            })
            .catch(err => console.log("Error loading dashboard:", err));
    }


    // ==============================
    // INIT ALL
    // ==============================
    loadAdminInfo();
    loadRecentActivities();
    loadDashboardCounts();
    loadPasswordRequests();

    setInterval(loadPasswordRequests, 45000);

    window.addEventListener('focus', () => {
        loadPasswordRequests();
    });

});