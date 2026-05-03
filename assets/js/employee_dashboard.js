document.addEventListener('DOMContentLoaded', async () => {
  const empName = document.getElementById('empName');
  const empAvatar = document.getElementById('empAvatar');
  const container = document.getElementById('leaveBalancesContainer');
  const profileModal = document.getElementById('profileModal');
  const closeProfileModal = document.getElementById('closeProfileModal');
  const closeProfileModal2 = document.getElementById('closeProfileModal2');

  let currentUser = null;

  // Make avatar clickable to show profile
  empAvatar.style.cursor = 'pointer';
  empAvatar.addEventListener('click', showProfileModal);

  function showProfileModal() {
    if (!currentUser) return;
    
    document.getElementById('profileFullName').textContent = currentUser.full_name || '—';
    document.getElementById('profileEmail').textContent = currentUser.email || '—';
    document.getElementById('profileEmpId').textContent = currentUser.employee_id || '—';
    document.getElementById('profileDept').textContent = currentUser.department || '—';
    document.getElementById('profilePos').textContent = currentUser.position || '—';
    
    const initials = currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    document.getElementById('profileAvatar').textContent = initials || 'E';
    
    profileModal.style.display = 'block';
  }

  function closeModal() {
    profileModal.style.display = 'none';
  }

  closeProfileModal.addEventListener('click', closeModal);
  closeProfileModal2.addEventListener('click', closeModal);
  
  // Close modal on backdrop click
  profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) closeModal();
  });

  // Handle Edit Profile button
  const editProfileBtn = document.getElementById('editProfileBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const profileContent = document.getElementById('profileContent');
  const editFormContent = document.getElementById('editFormContent');
  const editProfileForm = document.getElementById('editProfileForm');
  const editMessage = document.getElementById('editMessage');

  editProfileBtn.addEventListener('click', () => {
    document.getElementById('editFullName').value = currentUser.full_name || '';
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('editDept').value = currentUser.department || '';
    document.getElementById('editPos').value = currentUser.position || '';
    editMessage.textContent = '';
    profileContent.style.display = 'none';
    editFormContent.style.display = 'block';
  });

  cancelEditBtn.addEventListener('click', () => {
    profileContent.style.display = 'block';
    editFormContent.style.display = 'none';
  });

  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editMessage.textContent = 'Saving...';
    editMessage.style.color = '#118ab2';

    const fd = new FormData();
    fd.append('full_name', document.getElementById('editFullName').value);
    fd.append('email', document.getElementById('editEmail').value);
    fd.append('department', document.getElementById('editDept').value);
    fd.append('position', document.getElementById('editPos').value);

    try {
      const res = await fetch('/MBSL_Employee_leave_system/controllers/update_profile.php', {
        method: 'POST',
        body: fd
      });
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message || 'Update failed');
      
      editMessage.textContent = payload.message || 'Profile updated!';
      editMessage.style.color = '#06d6a0';
      
      // Update current user
      currentUser.full_name = document.getElementById('editFullName').value;
      currentUser.email = document.getElementById('editEmail').value;
      currentUser.department = document.getElementById('editDept').value;
      currentUser.position = document.getElementById('editPos').value;
      
      // Update header
      empName.textContent = currentUser.full_name;
      
      setTimeout(() => {
        profileContent.style.display = 'block';
        editFormContent.style.display = 'none';
        showProfileModal();
      }, 1000);
    } catch (err) {
      editMessage.textContent = err.message || 'Error saving profile';
      editMessage.style.color = '#ef476f';
    }
  });

  // Handle Change Password button
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  
  if (changePasswordBtn) {
    console.log('✓ changePasswordBtn found');
    changePasswordBtn.addEventListener('click', function() {
      console.log('✓ Change password button clicked');
      
      const changePasswordContent = document.getElementById('changePasswordContent');
      const profileContent = document.getElementById('profileContent');
      const editFormContent = document.getElementById('editFormContent');
      const pwdStatus = document.getElementById('pwdStatus');
      const requestPwdForm = document.getElementById('requestPwdForm');
      const setNewPwdForm = document.getElementById('setNewPwdForm');
      
      // Hide other content
      profileContent.style.display = 'none';
      editFormContent.style.display = 'none';
      
      // Show password change content
      changePasswordContent.style.display = 'block';
      console.log('✓ Password change content visible');
      
      // Default state: show request form
      requestPwdForm.style.display = 'block';
      setNewPwdForm.style.display = 'none';
      pwdStatus.innerHTML = '<strong style="color: #118ab2;">Request new password change from admin</strong><br><small>Admin needs to approve before you can change your password</small>';
      
      // Check if there's a pending or approved request
      fetch('/MBSL_Employee_leave_system/controllers/request_password_change.php', { credentials: 'same-origin' })
        .then(res => res.json())
        .then(payload => {
          console.log('✓ Status check response:', payload);
          if (payload.request) {
            if (payload.request.status === 'Approved') {
              pwdStatus.innerHTML = '<strong style="color: #06d6a0;">✓ Your request is approved by admin</strong><br><small>You can now set your new password</small>';
              requestPwdForm.style.display = 'none';
              setNewPwdForm.style.display = 'block';
            } else if (payload.request.status === 'Pending') {
              pwdStatus.innerHTML = '<strong style="color: #ffc107;">⏳ Request Pending</strong><br><small>Waiting for admin approval...</small>';
              requestPwdForm.style.display = 'none';
              setNewPwdForm.style.display = 'none';
            }
          }
        })
        .catch(err => {
          console.error('✗ Error checking status:', err);
        });
    });
  } else {
    console.error('✗ changePasswordBtn NOT found');
  }

  const cancelPwdBtn = document.getElementById('cancelPwdBtn');
  if (cancelPwdBtn) {
    cancelPwdBtn.addEventListener('click', function() {
      console.log('✓ Cancel pwd button clicked');
      const changePasswordContent = document.getElementById('changePasswordContent');
      const profileContent = document.getElementById('profileContent');
      changePasswordContent.style.display = 'none';
      profileContent.style.display = 'block';
    });
  }

  const cancelSetPwdBtn = document.getElementById('cancelSetPwdBtn');
  if (cancelSetPwdBtn) {
    cancelSetPwdBtn.addEventListener('click', function() {
      console.log('✓ Cancel set pwd button clicked');
      const changePasswordContent = document.getElementById('changePasswordContent');
      const profileContent = document.getElementById('profileContent');
      changePasswordContent.style.display = 'none';
      profileContent.style.display = 'block';
    });
  }

  // Submit password change request
  const pwdRequestForm = document.getElementById('pwdRequestForm');
  if (pwdRequestForm) {
    pwdRequestForm.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('✓ Password request form submitted');
      const requestMessage = document.getElementById('requestMessage');
      const reason = document.getElementById('pwdReason').value;

      requestMessage.textContent = 'Sending request...';
      requestMessage.style.color = '#118ab2';

      const fd = new FormData();
      fd.append('reason', reason);

      fetch('/MBSL_Employee_leave_system/controllers/request_password_change.php', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      })
      .then(res => res.json())
      .then(payload => {
        console.log('✓ Request sent, response:', payload);
        if (!payload.success) throw new Error(payload.message || 'Request failed');

        requestMessage.textContent = payload.message || 'Request sent!';
        requestMessage.style.color = '#06d6a0';
        
        setTimeout(() => {
          requestMessage.textContent = '';
          const requestPwdForm = document.getElementById('requestPwdForm');
          const pwdStatus = document.getElementById('pwdStatus');
          requestPwdForm.style.display = 'none';
          pwdStatus.innerHTML = '<strong style="color: #ffc107;">⏳ Request Pending</strong><br><small>Waiting for admin approval...</small>';
        }, 1500);
      })
      .catch(err => {
        console.error('✗ Request error:', err);
        requestMessage.textContent = err.message || 'Error sending request';
        requestMessage.style.color = '#ef476f';
      });
    });
  }

  // Submit new password
  const newPwdForm = document.getElementById('newPwdForm');
  if (newPwdForm) {
    newPwdForm.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('✓ New password form submitted');
      const setPwdMessage = document.getElementById('setPwdMessage');
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (!newPassword || !confirmPassword) {
        setPwdMessage.textContent = 'Both password fields are required';
        setPwdMessage.style.color = '#ef476f';
        return;
      }

      if (newPassword !== confirmPassword) {
        setPwdMessage.textContent = 'Passwords do not match';
        setPwdMessage.style.color = '#ef476f';
        return;
      }

      if (newPassword.length < 6) {
        setPwdMessage.textContent = 'Password must be at least 6 characters';
        setPwdMessage.style.color = '#ef476f';
        return;
      }

      setPwdMessage.textContent = 'Changing password...';
      setPwdMessage.style.color = '#118ab2';

      const fd = new FormData();
      fd.append('new_password', newPassword);

      fetch('/MBSL_Employee_leave_system/controllers/set_new_password.php', {
        method: 'POST',
        body: fd
      })
      .then(res => res.json())
      .then(payload => {
        console.log('✓ Password changed, response:', payload);
        if (!payload.success) throw new Error(payload.message || 'Failed');

        setPwdMessage.textContent = payload.message || 'Password changed!';
        setPwdMessage.style.color = '#06d6a0';
        
        setTimeout(() => {
          const profileContent = document.getElementById('profileContent');
          const changePasswordContent = document.getElementById('changePasswordContent');
          const newPwdForm = document.getElementById('newPwdForm');
          profileContent.style.display = 'block';
          changePasswordContent.style.display = 'none';
          newPwdForm.reset();
          showProfileModal();
        }, 1500);
      })
      .catch(err => {
        console.error('✗ Password change error:', err);
        setPwdMessage.textContent = err.message || 'Error changing password';
        setPwdMessage.style.color = '#ef476f';
      });
    });
  }

  // ===== APPLY LEAVE FORM HANDLER =====
  const applyLeaveModal = document.getElementById('applyLeaveModal');
  const applyLeaveForm = document.getElementById('applyLeaveForm');
  const closeLeaveModal = document.getElementById('closeLeaveModal');
  const cancelLeaveBtn = document.getElementById('cancelLeaveBtn');
  const fromDateInput = document.getElementById('fromDate');
  const toDateInput = document.getElementById('toDate');
  const totalDaysInput = document.getElementById('totalDays');
  const leaveMessage = document.getElementById('leaveMessage');

  // Verify all elements exist
  if (!applyLeaveModal || !applyLeaveForm) {
    console.error('✗ Leave form elements not found');
  } else {
    console.log('✓ Leave form elements found');
  }

  // Open leave form from sidebar link (prefer id, fallback to href selector)
  const applyLink = document.getElementById('applyLeaveLink');
  if (applyLink) {
    const href = applyLink.getAttribute('href') || '';
    // Only intercept clicks for in-page anchors; allow navigation for real pages
    if (href.startsWith('#')) {
      applyLink.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('✓ Apply leave (id anchor) clicked');
        if (applyLeaveModal) {
          applyLeaveModal.style.display = 'block';
          if (applyLeaveForm) applyLeaveForm.reset();
          if (leaveMessage) leaveMessage.textContent = '';
          if (totalDaysInput) totalDaysInput.value = '';
        }
      });
    } else {
      console.log('✓ Apply leave link points to', href, '- allowing navigation');
    }
  } else {
    const leaveLinks = document.querySelectorAll('a[href="#apply-leave"]');
    console.log('✓ Found ' + leaveLinks.length + ' apply leave links (fallback)');
    leaveLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('✓ Apply leave (href) clicked');
        if (applyLeaveModal) {
          applyLeaveModal.style.display = 'block';
          if (applyLeaveForm) applyLeaveForm.reset();
          if (leaveMessage) leaveMessage.textContent = '';
          if (totalDaysInput) totalDaysInput.value = '';
        }
      });
    });
  }

  // Close leave modal
  function closeLeaveForm() {
    if (applyLeaveModal) {
      applyLeaveModal.style.display = 'none';
    }
  }

  if (closeLeaveModal) {
    closeLeaveModal.addEventListener('click', closeLeaveForm);
  }
  if (cancelLeaveBtn) {
    cancelLeaveBtn.addEventListener('click', closeLeaveForm);
  }
  if (applyLeaveModal) {
    applyLeaveModal.addEventListener('click', (e) => {
      if (e.target === applyLeaveModal) closeLeaveForm();
    });
  }

  // Calculate total days when dates change
  function calculateDays() {
    if (fromDateInput && toDateInput && fromDateInput.value && toDateInput.value) {
      const from = new Date(fromDateInput.value);
      const to = new Date(toDateInput.value);
      
      if (to < from) {
        if (leaveMessage) leaveMessage.textContent = 'To date must be after from date';
        if (leaveMessage) leaveMessage.style.color = '#ef476f';
        if (totalDaysInput) totalDaysInput.value = '';
        return;
      }
      
      const diffTime = to - from;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (totalDaysInput) totalDaysInput.value = diffDays;
      if (leaveMessage) leaveMessage.textContent = '';
    }
  }

  if (fromDateInput) {
    fromDateInput.addEventListener('change', calculateDays);
  }
  if (toDateInput) {
    toDateInput.addEventListener('change', calculateDays);
  }

  // Submit leave form
  if (applyLeaveForm) {
    applyLeaveForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const leaveType = document.getElementById('leaveType').value;
      const fromDate = fromDateInput.value;
      const toDate = toDateInput.value;
      const reason = document.getElementById('reason').value;
      const totalDays = totalDaysInput.value;

      if (!leaveType || !fromDate || !toDate || !reason) {
        if (leaveMessage) {
          leaveMessage.textContent = 'Please fill all required fields';
          leaveMessage.style.color = '#ef476f';
        }
        return;
      }

      if (leaveMessage) {
        leaveMessage.textContent = 'Submitting request...';
        leaveMessage.style.color = '#118ab2';
      }

      const fd = new FormData();
      fd.append('leave_type_id', leaveType);
      fd.append('from_date', fromDate);
      fd.append('to_date', toDate);
      fd.append('total_days', totalDays);
      fd.append('reason', reason);

      try {
        const res = await fetch('/MBSL_Employee_leave_system/controllers/apply_leave.php', {
          method: 'POST',
          body: fd,
          credentials: 'same-origin'
        });

        const payload = await res.json();
        
        if (!payload.success) {
          throw new Error(payload.message || 'Failed to submit request');
        }

        if (leaveMessage) {
          leaveMessage.textContent = payload.message || 'Leave request submitted successfully!';
          leaveMessage.style.color = '#06d6a0';
        }

        setTimeout(() => {
          closeLeaveForm();
          if (applyLeaveForm) applyLeaveForm.reset();
        }, 1500);

      } catch (err) {
        console.error('Error:', err);
        if (leaveMessage) {
          leaveMessage.textContent = err.message || 'Error submitting request';
          leaveMessage.style.color = '#ef476f';
        }
      }
    });
  }

  try {
    // Fetch employee info and leave balances
    const res = await fetch('/MBSL_Employee_leave_system/controllers/employee_info.php', {
      credentials: 'same-origin'
    });
    if (!res.ok) {
      console.error('Network error');
      container.innerHTML = '<p style="color: red;">Failed to load leave balances</p>';
      return;
    }

    const payload = await res.json();
    if (!payload.success) {
      console.error('Error:', payload.message);
      container.innerHTML = '<p style="color: red;">' + payload.message + '</p>';
      return;
    }

    const { user, balances } = payload;
    currentUser = user;

    // Update header
    if (user && user.full_name) {
      empName.textContent = user.full_name;
      const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
      empAvatar.textContent = initials || 'E';
    }

    // Clear and populate leave balance cards
    container.innerHTML = '';

    if (!Array.isArray(balances) || balances.length === 0) {
      container.innerHTML = `
        <div class="metric-card" style="background: linear-gradient(135deg, #118ab2 0%, #073b4c 100%);">
          <div class="metric-header">
            <div class="metric-label">Leave Balances</div>
            <div class="metric-icon"><i class="bi bi-calendar2-check"></i></div>
          </div>
          <div>
            <h2 class="metric-value">0</h2>
            <div style="color: rgba(255,255,255,0.85); font-size: 0.95rem;">
              No leave balance records found yet.
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Color schemes for cards
    const colors = [
      { bg: 'linear-gradient(135deg, #06d6a0 0%, #1dd1a1 50%, #10ac84 100%)', label: 'Casual Leave' },
      { bg: 'linear-gradient(135deg, #0ea5a4 0%, #0d9488 50%, #0f766e 100%)', label: 'Medical Leave' },
      { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1e40af 100%)', label: 'Annual Leave' }
    ];

    balances.forEach((balance, idx) => {
      const colorScheme = colors[idx % colors.length];
      const percent = balance.total > 0 ? (balance.remaining / balance.total) * 100 : 0;

      const card = document.createElement('div');
      card.className = 'metric-card';
      card.style.background = colorScheme.bg;
      card.innerHTML = `
        <div class="metric-header">
          <div class="metric-label">${balance.type_name}</div>
          <div class="metric-icon"><i class="bi bi-calendar2-check"></i></div>
        </div>
        <div>
          <h2 class="metric-value">${balance.remaining}</h2>
          <div style="color: rgba(255,255,255,0.85); font-size: 0.9rem; margin-bottom: 8px;">
            <div>Total: <strong>${balance.total}</strong></div>
            <div>Used: <strong>${balance.used}</strong></div>
          </div>
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden; margin-top: 8px;">
            <div style="width: ${percent}%; height: 100%; background: rgba(255,255,255,0.8); border-radius: 3px; transition: width 0.4s ease;"></div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error('Exception:', err);
    container.innerHTML = '<p style="color: red;">Error loading dashboard</p>';
  }
});
