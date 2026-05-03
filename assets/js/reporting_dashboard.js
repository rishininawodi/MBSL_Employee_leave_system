document.addEventListener('DOMContentLoaded', () => {
  const requestsList = document.getElementById('requestsList');
  const pendingCount = document.getElementById('pendingCount');
  const approvedCount = document.getElementById('approvedCount');
  const rejectedCount = document.getElementById('rejectedCount');
  const filterBtns = document.querySelectorAll('[data-filter]');
  const approvalModal = document.getElementById('approvalModal');
  const closeModal = document.getElementById('closeModal');
  const approveBtn = document.getElementById('approveBtn');
  const rejectBtn = document.getElementById('rejectBtn');
  const modalContent = document.getElementById('modalContent');
  const pendingRequestsLink = document.getElementById('pendingRequestsLink');
  const pendingRequestsSection = document.getElementById('pending-requests');

  const profileModal = document.getElementById('profileModal');
  const closeProfileModal = document.getElementById('closeProfileModal');
  const profileContent = document.getElementById('profileContent');
  const rpAvatar = document.getElementById('rpAvatar');

  let currentFilter = 'pending';
  let allRequests = [];
  let selectedRequest = null;
  let leaveTypeChart = null;
  let statusChart = null;

  // Load requests on page load
  loadRequests();
  loadProfile();

  // Profile modal close
  if (closeProfileModal) {
    closeProfileModal.addEventListener('click', () => {
      profileModal.style.display = 'none';
    });
  }

  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) {
        profileModal.style.display = 'none';
      }
    });
  }

  // Profile avatar click
  if (rpAvatar) {
    rpAvatar.addEventListener('click', () => {
      showProfile();
      if (profileModal) profileModal.style.display = 'block';
    });
    rpAvatar.style.cursor = 'pointer';
  }

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter === 'all' ? '' : btn.dataset.filter;
      renderRequests();
    });
  });

  // Modal close
  closeModal.addEventListener('click', () => {
    approvalModal.style.display = 'none';
    selectedRequest = null;
  });

  approvalModal.addEventListener('click', (e) => {
    if (e.target === approvalModal) {
      approvalModal.style.display = 'none';
      selectedRequest = null;
    }
  });

  if (pendingRequestsLink) {
    pendingRequestsLink.addEventListener('click', (e) => {
      e.preventDefault();
      currentFilter = 'pending';
      filterBtns.forEach(b => b.classList.remove('active'));
      const pendingBtn = document.querySelector('[data-filter="pending"]');
      if (pendingBtn) pendingBtn.classList.add('active');
      renderRequests();
      if (pendingRequestsSection) {
        pendingRequestsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  async function loadRequests() {
    try {
      const res = await fetch('/MBSL_Employee_leave_system/controllers/get_leave_requests.php?filter=all', {
        credentials: 'same-origin'
      });
      const data = await res.json();
      
      if (!data.success) {
        requestsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="bi bi-inbox"></i></div>Failed to load requests</div>';
        return;
      }

      allRequests = data.requests;
      
      // Update counts
      const counts = data.counts;
      pendingCount.textContent = counts.pending || 0;
      approvedCount.textContent = counts.approved || 0;
      rejectedCount.textContent = counts.rejected || 0;

      renderRequests();
      renderCharts();
    } catch (err) {
      console.error(err);
      requestsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="bi bi-exclamation-circle"></i></div>Error loading requests</div>';
    }
  }

  async function showProfile() {
    try {
      const res = await fetch('/MBSL_Employee_leave_system/controllers/employee_info.php', {
        credentials: 'same-origin'
      });
      const data = await res.json();
      
      if (!data.success || !data.user) {
        profileContent.innerHTML = '<p style="color: #e74c3c;">Unable to load profile</p>';
        return;
      }

      const user = data.user;

      profileContent.innerHTML = `
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
          <div id="profileInitial" style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #118ab2, #06d6a0); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 24px;">${user.full_name.charAt(0)}</div>
          <div>
            <div id="profileName" style="font-weight: 700; font-size: 1.1rem; color: #12313d;">${user.full_name}</div>
            <div id="profileEmail" style="color: #6a858d; font-size: 0.9rem;">${user.email}</div>
            <div id="profileEmpId" style="color: #6a858d; font-size: 0.85rem;">Employee ID: ${user.employee_id || 'N/A'}</div>
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-bottom:12px;">
          <button id="editProfileBtn" class="btn btn-sm btn-primary" style="flex:1;">Edit Profile</button>
          <button id="changePasswordBtn" class="btn btn-sm btn-warning" style="flex:1;">Change Password</button>
          <button id="closeProfileModal2" class="btn btn-sm btn-secondary" style="flex:1;">Close</button>
        </div>

        <div id="editFormContent" style="display:none; color: var(--text-main); margin-bottom:12px;">
          <form id="editProfileForm">
            <div style="margin-bottom: 8px;">
              <label style="font-size: 12px; color: #56717a; font-weight: 600; display: block; margin-bottom: 4px;">Full Name</label>
              <input id="editFullName" type="text" class="form-control" value="${user.full_name}" />
            </div>
            <div style="margin-bottom: 8px;">
              <label style="font-size: 12px; color: #56717a; font-weight: 600; display: block; margin-bottom: 4px;">Email</label>
              <input id="editEmail" type="email" class="form-control" value="${user.email}" />
            </div>
            <div style="margin-bottom: 8px;">
              <label style="font-size: 12px; color: #56717a; font-weight: 600; display: block; margin-bottom: 4px;">Department</label>
              <input id="editDept" type="text" class="form-control" value="${user.department || ''}" />
            </div>
            <div style="margin-bottom: 8px;">
              <label style="font-size: 12px; color: #56717a; font-weight: 600; display: block; margin-bottom: 4px;">Position</label>
              <input id="editPos" type="text" class="form-control" value="${user.position || ''}" />
            </div>
            <div id="editMessage" style="margin-bottom: 8px; font-size: 13px; color: #999;"></div>
            <div style="display:flex; gap:8px;">
              <button type="submit" class="btn btn-sm btn-success" style="flex:1;">Save Changes</button>
              <button type="button" id="cancelEditBtn" class="btn btn-sm btn-secondary" style="flex:1;">Cancel</button>
            </div>
          </form>
        </div>

        <div id="changePasswordContent" style="display:none; color: var(--text-main); margin-bottom:12px;">
          <div id="pwdStatus" style="background:#f6fafc; padding:10px; border-radius:8px; margin-bottom:10px; color:#56717a;"></div>
          <div id="requestPwdForm">
            <form id="pwdRequestForm">
              <div style="margin-bottom:8px;">
                <label style="font-size:12px; color:#56717a; font-weight:600; display:block; margin-bottom:4px;">Reason (optional)</label>
                <textarea id="pwdReason" class="form-control" rows="2"></textarea>
              </div>
              <div id="requestMessage" style="margin-bottom:8px; font-size:13px; color:#999;"></div>
              <div style="display:flex; gap:8px;">
                <button type="submit" class="btn btn-sm btn-info" style="flex:1;">Request from Admin</button>
                <button type="button" id="cancelPwdBtn" class="btn btn-sm btn-secondary" style="flex:1;">Back</button>
              </div>
            </form>
          </div>
          <div id="setNewPwdForm" style="display:none; margin-top:8px;">
            <form id="newPwdForm">
              <div style="margin-bottom:8px;">
                <label style="font-size:12px; color:#56717a; font-weight:600; display:block; margin-bottom:4px;">New Password</label>
                <input id="newPassword" type="password" class="form-control" />
              </div>
              <div style="margin-bottom:8px;">
                <label style="font-size:12px; color:#56717a; font-weight:600; display:block; margin-bottom:4px;">Confirm Password</label>
                <input id="confirmPassword" type="password" class="form-control" />
              </div>
              <div id="setPwdMessage" style="margin-bottom:8px; font-size:13px; color:#999;"></div>
              <div style="display:flex; gap:8px;">
                <button type="submit" class="btn btn-sm btn-success" style="flex:1;">Change Password</button>
                <button type="button" id="cancelSetPwdBtn" class="btn btn-sm btn-secondary" style="flex:1;">Back</button>
              </div>
            </form>
          </div>
        </div>

      `;

      // Wire up edit and password handlers
      const editProfileBtn = document.getElementById('editProfileBtn');
      const changePasswordBtn = document.getElementById('changePasswordBtn');
      const closeProfileModal2 = document.getElementById('closeProfileModal2');
      const editFormContent = document.getElementById('editFormContent');
      const editProfileForm = document.getElementById('editProfileForm');
      const cancelEditBtn = document.getElementById('cancelEditBtn');
      const pwdRequestForm = document.getElementById('pwdRequestForm');
      const requestMessage = document.getElementById('requestMessage');
      const pwdStatus = document.getElementById('pwdStatus');
      const requestPwdForm = document.getElementById('requestPwdForm');
      const setNewPwdForm = document.getElementById('setNewPwdForm');
      const newPwdForm = document.getElementById('newPwdForm');
      const cancelPwdBtn = document.getElementById('cancelPwdBtn');
      const cancelSetPwdBtn = document.getElementById('cancelSetPwdBtn');

      if (closeProfileModal2) closeProfileModal2.addEventListener('click', () => { if (profileModal) profileModal.style.display = 'none'; });

      if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
          editFormContent.style.display = 'block';
        });
      }

      if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
          editFormContent.style.display = 'none';
        });
      }

      if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.append('full_name', document.getElementById('editFullName').value);
          fd.append('email', document.getElementById('editEmail').value);
          fd.append('department', document.getElementById('editDept').value);
          fd.append('position', document.getElementById('editPos').value);

          try {
            const res = await fetch('/MBSL_Employee_leave_system/controllers/update_profile.php', { method: 'POST', body: fd, credentials: 'same-origin' });
            const data = await res.json();
            const editMessage = document.getElementById('editMessage');
            if (!data.success) {
              if (editMessage) editMessage.textContent = data.message || 'Failed to update';
              return;
            }
            if (editMessage) editMessage.textContent = 'Profile updated';
            // Refresh displayed name/email
            document.getElementById('profileName').textContent = document.getElementById('editFullName').value;
            document.getElementById('profileEmail').textContent = document.getElementById('editEmail').value;
            editFormContent.style.display = 'none';
          } catch (err) {
            console.error(err);
          }
        });
      }

      if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', async () => {
          // Check existing request status
          try {
            const res = await fetch('/MBSL_Employee_leave_system/controllers/request_password_change.php', { credentials: 'same-origin' });
            const info = await res.json();
            // info.request may be null or have status
            if (info && info.request && info.request.status === 'Approved') {
              pwdStatus.textContent = 'Admin approved - set new password below';
              requestPwdForm.style.display = 'none';
              setNewPwdForm.style.display = 'block';
            } else if (info && info.request && info.request.status === 'Pending') {
              pwdStatus.textContent = 'Password change request pending approval';
              requestPwdForm.style.display = 'none';
              setNewPwdForm.style.display = 'none';
            } else {
              pwdStatus.textContent = '';
              requestPwdForm.style.display = 'block';
              setNewPwdForm.style.display = 'none';
            }
            document.getElementById('changePasswordContent').style.display = 'block';
          } catch (err) {
            console.error(err);
          }
        });
      }

      if (cancelPwdBtn) cancelPwdBtn.addEventListener('click', () => { document.getElementById('changePasswordContent').style.display = 'none'; });
      if (cancelSetPwdBtn) cancelSetPwdBtn.addEventListener('click', () => { document.getElementById('changePasswordContent').style.display = 'none'; });

      if (pwdRequestForm) {
        pwdRequestForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const fd = new FormData();
          fd.append('reason', document.getElementById('pwdReason').value || '');
          try {
            const res = await fetch('/MBSL_Employee_leave_system/controllers/request_password_change.php', { method: 'POST', body: fd, credentials: 'same-origin' });
            const data = await res.json();
            if (!data.success) {
              requestMessage.textContent = data.message || 'Failed to request';
              return;
            }
            requestMessage.textContent = data.message || 'Requested';
            pwdStatus.textContent = 'Password change request pending approval';
            requestPwdForm.style.display = 'none';
          } catch (err) {
            console.error(err);
          }
        });
      }

      if (newPwdForm) {
        newPwdForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const p1 = document.getElementById('newPassword').value;
          const p2 = document.getElementById('confirmPassword').value;
          const setPwdMessage = document.getElementById('setPwdMessage');
          if (!p1 || p1 !== p2) {
            if (setPwdMessage) setPwdMessage.textContent = 'Passwords do not match';
            return;
          }
          const fd = new FormData();
          fd.append('new_password', p1);
          try {
            const res = await fetch('/MBSL_Employee_leave_system/controllers/set_new_password.php', { method: 'POST', body: fd, credentials: 'same-origin' });
            const data = await res.json();
            if (!data.success) {
              if (setPwdMessage) setPwdMessage.textContent = data.message || 'Failed to change password';
              return;
            }
            if (setPwdMessage) setPwdMessage.textContent = data.message || 'Password changed';
            setNewPwdForm.style.display = 'none';
            document.getElementById('changePasswordContent').style.display = 'none';
          } catch (err) {
            console.error(err);
            if (setPwdMessage) setPwdMessage.textContent = 'Error';
          }
        });
      }
    } catch (err) {
      console.error('Error showing profile:', err);
      profileContent.innerHTML = '<p style="color: #e74c3c;">Error loading profile</p>';
    }
  }

  async function loadProfile() {
    try {
      const res = await fetch('/MBSL_Employee_leave_system/controllers/employee_info.php', {
        credentials: 'same-origin'
      });
      const data = await res.json();
      
      if (data.success && data.user) {
        const user = data.user;
        if (rpAvatar) {
          rpAvatar.textContent = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'RP';
        }
      }
    } catch (err) {
      console.error('Profile load error:', err);
    }
  }

  function renderCharts() {
    // Leave Type Chart
    const leaveTypeData = {};
    allRequests.forEach(req => {
      leaveTypeData[req.leave_type] = (leaveTypeData[req.leave_type] || 0) + 1;
    });

    const typeCtx = document.getElementById('leaveTypeChart');
    if (leaveTypeChart) leaveTypeChart.destroy();
    leaveTypeChart = new Chart(typeCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(leaveTypeData),
        datasets: [{
          label: 'Requests',
          data: Object.values(leaveTypeData),
          backgroundColor: ['#118ab2', '#06d6a0', '#ffd166'],
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });

    // Status Chart
    const statusData = {
      'Pending': allRequests.filter(r => r.status === 'Pending').length,
      'Approved': allRequests.filter(r => r.status === 'Approved').length,
      'Rejected': allRequests.filter(r => r.status === 'Rejected').length
    };

    const statusCtx = document.getElementById('statusChart');
    if (statusChart) statusChart.destroy();
    statusChart = new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusData),
        datasets: [{
          data: Object.values(statusData),
          backgroundColor: ['#ffd166', '#06d6a0', '#ef476f'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  function renderRequests() {
    let filtered = allRequests;
    if (currentFilter) {
      filtered = allRequests.filter(r => r.status.toLowerCase() === currentFilter);
    }

    if (filtered.length === 0) {
      requestsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="bi bi-inbox"></i></div><p>No ' + (currentFilter ? currentFilter : 'pending') + ' requests found</p></div>';
      return;
    }

    requestsList.innerHTML = filtered.map(req => `
      <div class="request-item ${req.status.toLowerCase()}">
        <div class="request-info">
          <div class="request-topline">
            <div>
              <div class="request-emp-name"><i class="bi bi-person-circle me-2"></i>${req.employee_name}</div>
              <div class="request-dates"><i class="bi bi-calendar3 me-1"></i>${formatDate(req.from_date)} → ${formatDate(req.to_date)} • ${req.total_days} days</div>
            </div>
            <span class="request-status status-${req.status.toLowerCase()}">${req.status}</span>
          </div>
          <div class="request-reason"><strong>${req.leave_type}:</strong> ${req.reason}</div>
          <div class="request-footer">
            <div class="request-meta">
              <span><i class="bi bi-briefcase me-1"></i>${req.leave_type}</span>
              <span><i class="bi bi-clock me-1"></i>${formatDate(req.applied_date)}</span>
              <span><i class="bi bi-hash me-1"></i>Request #${req.id}</span>
            </div>
            <div class="request-actions">
              ${req.status === 'Pending' ? `
                <button class="btn-approve" onclick="approveRequest(${req.id})" title="Approve"><i class="bi bi-check-lg"></i></button>
                <button class="btn-reject" onclick="rejectRequest(${req.id})" title="Reject"><i class="bi bi-x-lg"></i></button>
              ` : ''}
              <button class="btn-view" onclick="viewDetails(${req.id})" title="View details"><i class="bi bi-eye"></i></button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.viewDetails = (requestId) => {
    const req = allRequests.find(r => r.id === requestId);
    if (!req) return;

    selectedRequest = req;
    modalContent.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #118ab2, #06d6a0); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 20px;">${req.employee_name.charAt(0)}</div>
          <div>
            <div style="font-weight: 700; font-size: 1.1rem;">${req.employee_name}</div>
            <div style="color: #6a858d; font-size: 0.9rem;">${req.email}</div>
          </div>
        </div>

        <div style="background: #f9fafb; padding: 12px; border-radius: 10px; margin-bottom: 12px;">
          <div style="font-weight: 700; color: #0b647f; margin-bottom: 8px;">${req.leave_type}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.9rem;">
            <div><span style="color: #6a858d;">From:</span> <strong>${formatDate(req.from_date)}</strong></div>
            <div><span style="color: #6a858d;">To:</span> <strong>${formatDate(req.to_date)}</strong></div>
            <div><span style="color: #6a858d;">Days:</span> <strong>${req.total_days}</strong></div>
            <div><span style="color: #6a858d;">Status:</span> <strong>${req.status}</strong></div>
          </div>
        </div>

        <div style="background: #f9fafb; padding: 12px; border-radius: 10px;">
          <div style="font-weight: 700; color: #0b647f; margin-bottom: 8px;">Reason</div>
          <div style="color: #56717a; line-height: 1.5;">${req.reason}</div>
        </div>
      </div>
    `;

    approveBtn.style.display = req.status === 'Pending' ? 'block' : 'none';
    rejectBtn.style.display = req.status === 'Pending' ? 'block' : 'none';

    approvalModal.style.display = 'block';
  };

  window.approveRequest = (requestId) => {
    viewDetails(requestId);
    approveBtn.click();
  };

  window.rejectRequest = (requestId) => {
    viewDetails(requestId);
    rejectBtn.click();
  };

  approveBtn.addEventListener('click', async () => {
    if (!selectedRequest) return;
    await submitAction(selectedRequest.id, 'approve');
  });

  rejectBtn.addEventListener('click', async () => {
    if (!selectedRequest) return;
    await submitAction(selectedRequest.id, 'reject');
  });

  async function submitAction(requestId, action) {
    try {
      const fd = new FormData();
      fd.append('request_id', requestId);
      fd.append('action', action);

      const res = await fetch('/MBSL_Employee_leave_system/controllers/respond_leave_request.php', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });

      const data = await res.json();
      if (!data.success) {
        alert('Error: ' + data.message);
        return;
      }

      // Update local data
      const req = allRequests.find(r => r.id === requestId);
      if (req) {
        req.status = data.new_status;
      }

      // Close modal and reload
      approvalModal.style.display = 'none';
      loadRequests();
    } catch (err) {
      console.error(err);
      alert('Error submitting action');
    }
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
});
