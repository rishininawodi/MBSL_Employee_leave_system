document.addEventListener('DOMContentLoaded', async () => {
  const requestsList = document.getElementById('requestsList');
  const totalCount = document.getElementById('totalCount');
  const pendingCount = document.getElementById('pendingCount');
  const approvedCount = document.getElementById('approvedCount');
  const rejectedCount = document.getElementById('rejectedCount');
  const empName = document.getElementById('empName');
  const empAvatar = document.getElementById('empAvatar');
  const filterButtons = document.querySelectorAll('[data-filter]');

  let activeFilter = 'all';
  let cachedRequests = [];

  function statusClass(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return 'status-approved';
    if (normalized === 'rejected') return 'status-rejected';
    return 'status-pending';
  }

  function statusLabel(status) {
    const value = String(status || 'Pending');
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  function renderCards(counts) {
    if (totalCount) totalCount.textContent = counts.total ?? cachedRequests.length;
    if (pendingCount) pendingCount.textContent = counts.pending ?? 0;
    if (approvedCount) approvedCount.textContent = counts.approved ?? 0;
    if (rejectedCount) rejectedCount.textContent = counts.rejected ?? 0;
  }

  function renderRequests(requests) {
    if (!requests.length) {
      requestsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="bi bi-inbox"></i></div>
          <h4 style="color: var(--text-main); font-weight: 700;">No leave requests found</h4>
          <p style="margin: 0;">You have not submitted any leave requests yet.</p>
        </div>
      `;
      return;
    }

    requestsList.innerHTML = requests.map((request) => {
      const appliedDate = request.applied_date ? new Date(request.applied_date).toLocaleString() : '—';
      const updatedDate = request.updated_date ? new Date(request.updated_date).toLocaleString() : '—';
      const notes = request.admin_notes ? request.admin_notes : 'No admin notes yet';

      return `
        <div class="request-item">
          <div class="request-info">
            <div class="request-topline">
              <div>
                <div class="request-emp-name">${request.leave_type || 'Leave Request'}</div>
                <div class="request-dates">${request.from_date} to ${request.to_date} • ${request.total_days} day(s)</div>
              </div>
              <span class="request-status ${statusClass(request.status)}">${statusLabel(request.status)}</span>
            </div>
            <div class="request-reason">${request.reason || 'No reason provided'}</div>
            <div class="request-footer">
              <div class="request-meta">
                <span>Applied: ${appliedDate}</span>
                <span>Updated: ${updatedDate}</span>
                <span>Reporting Person: ${request.reporting_person_name || 'N/A'}</span>
              </div>
            </div>
            <div class="request-reason" style="margin-top: 10px; background: rgba(17,138,178,0.06);">
              <strong>Admin Notes:</strong> ${notes}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function loadRequests(filter = 'all') {
    requestsList.innerHTML = '<div class="empty-state"><p>Loading requests...</p></div>';
    const res = await fetch(`/MBSL_Employee_leave_system/controllers/get_employee_leave_requests.php?filter=${encodeURIComponent(filter)}`, {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const payload = await res.json();
    if (!payload.success) throw new Error(payload.message || 'Failed to load requests');

    cachedRequests = payload.requests || [];
    renderCards(payload.counts || {});
    renderRequests(cachedRequests);
  }

  function applyFilter(filter) {
    activeFilter = filter;
    filterButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });

    const filtered = filter === 'all'
      ? cachedRequests
      : cachedRequests.filter((request) => String(request.status || '').toLowerCase() === filter);
    renderRequests(filtered);
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
  });

  try {
    const infoRes = await fetch('/MBSL_Employee_leave_system/controllers/employee_info.php', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (infoRes.ok) {
      const info = await infoRes.json();
      if (info.success && info.user) {
        if (empName) {
          empName.textContent = info.user.full_name || 'Employee';
        }
        if (empAvatar) {
          const initials = (info.user.full_name || 'E').split(' ').map((part) => part[0]).join('').toUpperCase();
          empAvatar.textContent = initials || 'E';
        }
      }
    }

    await loadRequests('all');
  } catch (err) {
    console.error(err);
    requestsList.innerHTML = `<div class="empty-state"><h4 style="color:#ef476f;">${err.message || 'Failed to load leave requests'}</h4></div>`;
  }
});
