document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('applyLeaveForm');
  const fromDate = document.getElementById('fromDate');
  const toDate = document.getElementById('toDate');
  const totalDays = document.getElementById('totalDays');
  const leaveMessage = document.getElementById('leaveMessage');
  const submitBtn = document.getElementById('submitBtn');
  const submitLabel = document.getElementById('submitLabel');

  // Profile Modal Variables
  const profileModal = document.getElementById('profileModal');
  const closeProfileModal = document.getElementById('closeProfileModal');
  const closeProfileModal2 = document.getElementById('closeProfileModal2');
  const sidebarProfileLink = document.getElementById('sidebarProfileLink');
  let currentUser = null;

  // Profile modal functions (defined at start - outside async)
  function showProfileModal() {
    document.getElementById('profileFullName').textContent = currentUser.full_name || '—';
    document.getElementById('profileEmail').textContent = currentUser.email || '—';
    document.getElementById('profileEmpId').textContent = currentUser.employee_id || '—';
    document.getElementById('profileDept').textContent = currentUser.department || '—';
    document.getElementById('profilePos').textContent = currentUser.position || '—';
    
    const initials = (currentUser && currentUser.full_name) ? currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'E';
    document.getElementById('profileAvatar').textContent = initials || 'E';
    
    profileModal.style.display = 'block';
  }

  function closeModal() {
    profileModal.style.display = 'none';
  }

  // Attach close handlers immediately
  closeProfileModal.addEventListener('click', closeModal);
  closeProfileModal2.addEventListener('click', closeModal);
  
  // Close modal on backdrop click
  profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) closeModal();
  });

  // Wire sidebar profile link IMMEDIATELY (before async fetch)
  if (sidebarProfileLink) {
    // Use capture phase and preventDefault to stop hash navigation
    sidebarProfileLink.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      showProfileModal();
    }, true);
  }

  // Fetch employee info on page load (async - doesn't block handlers)
  try {
    const res = await fetch('/MBSL_Employee_leave_system/controllers/employee_info.php', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (res.ok) {
      const payload = await res.json();
      if (payload.success && payload.user) {
        currentUser = payload.user;
      }
    }
  } catch (err) {
    console.error('Failed to load employee info:', err);
  }

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
    profileContent.style.display = 'none';
    editFormContent.style.display = 'block';
  });

  cancelEditBtn.addEventListener('click', () => {
    profileContent.style.display = 'block';
    editFormContent.style.display = 'none';
    editMessage.textContent = '';
  });

  editProfileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('full_name', document.getElementById('editFullName').value);
    fd.append('email', document.getElementById('editEmail').value);
    fd.append('department', document.getElementById('editDept').value);
    fd.append('position', document.getElementById('editPos').value);

    try {
      const res = await fetch('/MBSL_Employee_leave_system/controllers/update_profile.php', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });
      const payload = await res.json();
      if (!payload.success) throw new Error(payload.message);
      
      currentUser.full_name = document.getElementById('editFullName').value;
      currentUser.email = document.getElementById('editEmail').value;
      currentUser.department = document.getElementById('editDept').value;
      currentUser.position = document.getElementById('editPos').value;
      
      editMessage.textContent = 'Profile updated successfully!';
      editMessage.style.color = '#06d6a0';
      setTimeout(() => {
        profileContent.style.display = 'block';
        editFormContent.style.display = 'none';
        editMessage.textContent = '';
        showProfileModal();
      }, 1500);
    } catch (err) {
      editMessage.textContent = err.message || 'Error updating profile';
      editMessage.style.color = '#ef476f';
    }
  });

  // Handle Change Password button
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const changePasswordContent = document.getElementById('changePasswordContent');

  changePasswordBtn.addEventListener('click', function() {
    profileContent.style.display = 'none';
    changePasswordContent.style.display = 'block';
    
    fetch('/MBSL_Employee_leave_system/controllers/request_password_change.php', {
      method: 'GET',
      credentials: 'same-origin'
    }).then(r => r.json())
      .then(payload => {
        const pwdStatus = document.getElementById('pwdStatus');
        const requestPwdForm = document.getElementById('requestPwdForm');
        const setNewPwdForm = document.getElementById('setNewPwdForm');
        
        if (payload.request_exists) {
          if (payload.status === 'pending') {
            pwdStatus.innerHTML = '<strong>⏳ Request Pending</strong><br>Waiting for admin approval...';
            requestPwdForm.style.display = 'none';
            setNewPwdForm.style.display = 'none';
          } else if (payload.status === 'approved') {
            pwdStatus.innerHTML = '<strong style="color: #06d6a0;">✓ Admin Approved</strong>';
            requestPwdForm.style.display = 'none';
            setNewPwdForm.style.display = 'block';
          }
        } else {
          pwdStatus.innerHTML = '';
          requestPwdForm.style.display = 'block';
          setNewPwdForm.style.display = 'none';
        }
      });
  });

  const cancelPwdBtn = document.getElementById('cancelPwdBtn');
  cancelPwdBtn.addEventListener('click', function() {
    profileContent.style.display = 'block';
    changePasswordContent.style.display = 'none';
  });

  const cancelSetPwdBtn = document.getElementById('cancelSetPwdBtn');
  cancelSetPwdBtn.addEventListener('click', function() {
    profileContent.style.display = 'block';
    changePasswordContent.style.display = 'none';
  });

  const pwdRequestForm = document.getElementById('pwdRequestForm');
  const requestMessage = document.getElementById('requestMessage');

  pwdRequestForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('reason', document.getElementById('pwdReason').value);
    
    fetch('/MBSL_Employee_leave_system/controllers/request_password_change.php', {
      method: 'POST',
      body: fd,
      credentials: 'same-origin'
    }).then(r => r.json())
      .then(payload => {
        if (payload.success) {
          requestMessage.textContent = 'Request sent to admin!';
          requestMessage.style.color = '#06d6a0';
          setTimeout(() => {
            showProfileModal();
          }, 1500);
        } else {
          requestMessage.textContent = payload.message || 'Error';
          requestMessage.style.color = '#ef476f';
        }
      }).catch(err => {
        requestMessage.textContent = 'Error: ' + err.message;
        requestMessage.style.color = '#ef476f';
      });
  });

  const newPwdForm = document.getElementById('newPwdForm');
  const setPwdMessage = document.getElementById('setPwdMessage');

  newPwdForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;
    
    if (newPwd !== confirmPwd) {
      setPwdMessage.textContent = 'Passwords do not match!';
      setPwdMessage.style.color = '#ef476f';
      return;
    }

    const fd = new FormData();
    fd.append('new_password', newPwd);

    fetch('/MBSL_Employee_leave_system/controllers/set_new_password.php', {
      method: 'POST',
      body: fd,
      credentials: 'same-origin'
    }).then(r => r.json())
      .then(payload => {
        if (payload.success) {
          setPwdMessage.textContent = 'Password changed successfully!';
          setPwdMessage.style.color = '#06d6a0';
          setTimeout(() => {
            showProfileModal();
          }, 1500);
        } else {
          setPwdMessage.textContent = payload.message || 'Error';
          setPwdMessage.style.color = '#ef476f';
        }
      }).catch(err => {
        setPwdMessage.textContent = 'Error: ' + err.message;
        setPwdMessage.style.color = '#ef476f';
      });
  });

  // Apply Leave Form Logic


  function calc() {
    if (!fromDate.value || !toDate.value) return;
    const a = new Date(fromDate.value);
    const b = new Date(toDate.value);
    if (b < a) {
      leaveMessage.textContent = 'To date must be after from date';
      leaveMessage.style.color = '#ef476f';
      totalDays.value = '';
      return;
    }
    const diff = Math.floor((b - a) / (1000*60*60*24)) + 1;
    totalDays.value = diff;
    leaveMessage.textContent = '';
  }

  fromDate.addEventListener('change', calc);
  toDate.addEventListener('change', calc);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const lt = document.getElementById('leaveType').value;
    const reason = document.getElementById('reason').value.trim();

    if (!lt || !fromDate.value || !toDate.value || !reason) {
      leaveMessage.textContent = 'Please fill all required fields';
      leaveMessage.style.color = '#ef476f';
      return;
    }

    // disable button and show spinner
    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');
    submitLabel.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Sending...';
    leaveMessage.textContent = 'Submitting...';
    leaveMessage.style.color = '#118ab2';

    const fd = new FormData();
    fd.append('leave_type_id', lt);
    fd.append('from_date', fromDate.value);
    fd.append('to_date', toDate.value);
    fd.append('total_days', totalDays.value || 0);
    fd.append('reason', reason);

    try {
      const res = await fetch('/MBSL_Employee_leave_system/controllers/apply_leave.php', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin'
      });
      let payload;
      try {
        payload = await res.json();
      } catch (jsonErr) {
        throw new Error('Invalid server response');
      }
      if (!payload.success) throw new Error(payload.message || 'Failed');
      leaveMessage.textContent = payload.message || 'Submitted';
      leaveMessage.style.color = '#06d6a0';
      // success animation
      form.classList.add('success-anim');
      submitLabel.textContent = 'Sent';
      setTimeout(() => { window.location.href = 'employee_dashboard.html'; }, 1000);
    } catch (err) {
      console.error(err);
      leaveMessage.textContent = err.message || 'Server error';
      leaveMessage.style.color = '#ef476f';
      submitBtn.disabled = false;
      submitLabel.textContent = 'Submit Request';
    }
  });
});
