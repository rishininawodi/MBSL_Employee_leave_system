document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('applyLeaveForm');
  const fromDate = document.getElementById('fromDate');
  const toDate = document.getElementById('toDate');
  const totalDays = document.getElementById('totalDays');
  const leaveMessage = document.getElementById('leaveMessage');
  const submitBtn = document.getElementById('submitBtn');
  const submitLabel = document.getElementById('submitLabel');

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
