(() => {
  const API = '../controllers/manage_users.php';
  const tbody = document.getElementById('usersTableBody');
  const pageSize = 10;
  let users = [];
  let filtered = [];
  let currentPage = 1;

  // Utility
  const el = (tag, attrs = {}, children = []) => {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else e.setAttribute(k, v);
    });
    children.forEach(c => e.append(typeof c === 'string' ? document.createTextNode(c) : c));
    return e;
  };

  // Fetch list
  async function loadUsers() {
    try {
      const res = await fetch(`${API}?action=list`, { cache: 'no-store' });
      const json = await res.json();
      users = Array.isArray(json) ? json : (json.data || []);
      filtered = [...users];
      currentPage = 1;
      renderTable();
    } catch (err) {
      console.error('Load users error', err);
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Failed to load users.</td></tr>`;
    }
  }

  // Render table rows (with pagination)
  function renderTable() {
    tbody.innerHTML = '';
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-muted">No users found.</td></tr>`;
      return;
    }
    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);
    pageItems.forEach((u, idx) => {
      const row = document.createElement('tr');

      // columns
      row.append(el('td', {}, [ (start + idx + 1).toString() ]));
      row.append(el('td', {}, [ u.name || u.full_name || '-' ]));
      row.append(el('td', {}, [ u.email || '-' ]));
      row.append(el('td', {}, [ u.role || '-' ]));
      const statusBadge = el('span', {
        class: `badge ${u.is_active == 1 || u.is_active === true ? 'badge-active' : 'badge-inactive'}`
      }, [ (u.is_active == 1 || u.is_active === true) ? 'Active' : 'Inactive' ]);
      row.append(el('td', {}, [ statusBadge ]));

      // actions
      const actionTd = el('td');
      const editBtn = el('button', { class: 'action-btn', title: 'Edit', 'data-id': u.id });
      editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
      editBtn.addEventListener('click', () => openEditModal(u.id));

      const viewBtn = el('button', { class: 'action-btn', title: 'View Details', 'data-id': u.id });
      viewBtn.innerHTML = '<i class="bi bi-eye"></i>';
      viewBtn.addEventListener('click', () => openDetailsModal(u));

      const toggleBtn = el('button', { class: 'action-btn', title: 'Toggle Status', 'data-id': u.id });
      toggleBtn.innerHTML = u.is_active == 1 || u.is_active === true ? '<i class="bi bi-person-check"></i>' : '<i class="bi bi-person-x"></i>';

      
    //confirmation bocx of deactivate or activate user  
      toggleBtn.addEventListener('click', () => {
    const isActive = (u.is_active == 1 || u.is_active === true);
    const title = isActive ? 'Confirm Deactivate' : 'Confirm Activate';
    const msg = isActive ? 'Deactivate this user?' : 'Activate this user?';
    openConfirmModal(title, msg, () => {
    toggleStatus(u.id, !isActive);
  });
});

      actionTd.append(editBtn, viewBtn, toggleBtn);
      row.append(actionTd);

      tbody.appendChild(row);
    });

    renderPagination();
  }
  

  // Toggle status
  async function toggleStatus(id, makeActive) {
    try {
      const form = new FormData();
      form.append('action', 'toggle');
      form.append('id', id);
      form.append('is_active', makeActive ? '1' : '0');

      const res = await fetch(API, { method: 'POST', body: form });
      const json = await res.json();
      if (json.success === false) throw new Error(json.message || 'Failed');

      // update locally
      const u = users.find(x => String(x.id) === String(id));
      if (u) u.is_active = makeActive ? 1 : 0;
      filtered = [...users];
      renderTable();
    } catch (err) {
      console.error('Toggle error', err);
      alert('Could not update status.');
    }
  }

  function openConfirmModal(title, message, onConfirm) {
  let modal = document.getElementById('mu-confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'mu-confirm-modal';
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-sm modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header border-0" style="background:linear-gradient(90deg,var(--brand-700),var(--brand-500));color:#fff;">
            <h5 class="modal-title" id="mu-confirm-title"></h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4" id="mu-confirm-msg"></div>
          <div class="modal-footer border-0">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="mu-confirm-yes">Confirm</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  document.getElementById('mu-confirm-title').textContent = title;
  document.getElementById('mu-confirm-msg').textContent = message;

  document.getElementById('mu-confirm-yes').onclick = () => {
    onConfirm();
    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      modalInstance?.hide();
    }
  };

  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    new bootstrap.Modal(modal).show();
  } else {
    modal.style.display = 'block';
  }
}
  // Replace the existing openDetailsModal function with this
async function openDetailsModal(userOrId) {
  let user = null;
  const id = (typeof userOrId === 'object' && userOrId && userOrId.id) ? userOrId.id : userOrId;

  // If supplied a user object with many fields, use it; otherwise fetch full details
  if (typeof userOrId === 'object' && userOrId && Object.keys(userOrId).length > 6) {
    user = userOrId;
  } else {
    try {
      const res = await fetch(`${API}?action=get&id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const j = await res.json();
      if (j && j.success && j.data) user = j.data;
      else throw new Error(j.message || 'No data');
    } catch (err) {
      console.error('Failed to load user details', err);
      alert('Unable to load user details.');
      return;
    }
  }

  // normalize fields
  const name = user.full_name || user.name || '-';
  const empId = user.employee_id || '-';
  const email = user.email || '-';
  const role = user.role || '-';
  const department = user.department || '-';
  const position = user.position || '-';
  const reportingTo = user.reporting_to_name || user.reporting_to || '-';
  const phone = user.phone || '-';
  const created = user.created_at || user.created || '-';
  const status = (user.is_active == 1 || user.is_active === true) ? 'Active' : 'Inactive';

  // create modal container if missing
  let modal = document.getElementById('mu-details-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'mu-details-modal';
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header border-0" style="background:linear-gradient(90deg,var(--brand-700),var(--brand-500));color:#fff;">
            <h5 class="modal-title">User Details</h5>
            <button type="button" class="btn btn-outline-light btn-sm" id="mu-copy-btn" title="Copy details"><i class="bi bi-clipboard"></i></button>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4" id="mu-details-body"></div>
          <div class="modal-footer border-0">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="mu-edit-btn">Edit</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  const body = modal.querySelector('#mu-details-body');
  body.innerHTML = `
    <div class="row gx-4">
      <div class="col-md-4">
        <div class="profile-card p-4 text-center">
          <div class="avatar mb-3">${(name.split(' ').map(s=>s[0]||'').slice(0,2).join('')).toUpperCase()}</div>
          <h5 class="mb-1">${name}</h5>
          <div class="text-muted mb-2">${role} • ${position}</div>
          <div class="emp-badge mb-3">Employee ID: <strong>${empId}</strong></div>
          <div class="status-pill ${status === 'Active' ? 'status-active' : 'status-inactive'}">${status}</div>
          <div class="mt-3 small text-muted">Joined: ${created}</div>
        </div>
      </div>
      <div class="col-md-8">
        <div class="details-grid">
          <div class="d-flex justify-content-between"><strong>Email</strong><span>${email}</span></div>
          
          <div class="d-flex justify-content-between"><strong>Department</strong><span>${department}</span></div>
          <div class="d-flex justify-content-between"><strong>Position</strong><span>${position}</span></div>
          ${user.reporting_to ? `
        <div class="d-flex justify-content-between"><strong>Reporting To</strong><span>${reportingTo}</span></div>
        ` : ''}
          <div class="d-flex justify-content-between"><strong>Role</strong><span>${role}</span></div>
        </div>
      </div>
    </div>`;

  // edit button behavior (navigate to edit form)
  modal.querySelector('#mu-edit-btn').onclick = () => {
    window.location.href = `add_employee.html?id=${encodeURIComponent(user.id)}`;
  };

  // copy button
  const copyBtn = modal.querySelector('#mu-copy-btn');
  copyBtn.onclick = () => {
    const text = `Name: ${name}\nEmployee ID: ${empId}\nEmail: ${email}\nRole: ${role}\nDepartment: ${department}\nPosition: ${position}\nReporting To: ${reportingTo}\nPhone: ${phone}`;
    navigator.clipboard?.writeText(text).then(()=> {
      copyBtn.classList.add('btn-success');
      setTimeout(()=>copyBtn.classList.remove('btn-success'), 900);
    }).catch(()=> alert('Copy failed'));
  };

  // show modal with Bootstrap if available
  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    const bs = new bootstrap.Modal(modal);
    bs.show();
  } else {
    modal.style.display = 'block';
  }
}
function applySearch(q) {
  q = (q || '').trim().toLowerCase();
  if (!q) filtered = [...users];
  else filtered = users.filter(u => {
    const name = (u.name || u.full_name || '').toString().toLowerCase();
    const email = (u.email || '').toString().toLowerCase();
    const role = (u.role || '').toString().toLowerCase();
    return name.includes(q) || email.includes(q) || role.includes(q);
  });
  currentPage = 1;
  renderTable();
}

async function openEditModal(userId) {
  const res = await fetch(`${API}?action=get&id=${encodeURIComponent(userId)}`, { cache: 'no-store' });
  const json = await res.json();

  if (!json.success || !json.data) {
    alert('Unable to load user data.');
    return;
  }

  const user = json.data;

  let modal = document.getElementById('mu-edit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'mu-edit-modal';
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header border-0" style="background:linear-gradient(90deg,var(--brand-700),var(--brand-500));color:#fff;">
            <h5 class="modal-title">Edit User</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4">
            <form id="mu-edit-form" class="row g-3">
              <input type="hidden" name="id" id="edit_id">

              <div class="col-md-6">
                <label class="form-label">Employee ID</label>
                <input type="text" class="form-control" name="employee_id" id="edit_employee_id" required>
              </div>

              <div class="col-md-6">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-control" name="full_name" id="edit_full_name" required>
              </div>

              <div class="col-md-6">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" name="email" id="edit_email" required>
              </div>

              <div class="col-md-6">
                <label class="form-label">Role</label>
                <input type="text" class="form-control" name="role" id="edit_role" required>
              </div>

              <div class="col-md-6">
                <label class="form-label">Department</label>
                <input type="text" class="form-control" name="department" id="edit_department">
              </div>

              <div class="col-md-6">
                <label class="form-label">Position</label>
                <input type="text" class="form-control" name="position" id="edit_position">
              </div>

              <div class="col-md-6">
                <label class="form-label">Reporting To</label>
                <input type="text" class="form-control" name="reporting_to" id="edit_reporting_to">
              </div>

              <div class="col-md-6">
                <label class="form-label">Status</label>
                <select class="form-select" name="is_active" id="edit_is_active">
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>

              <div class="col-md-12">
                <label class="form-label">Joined Date</label>
                <input type="text" class="form-control" id="edit_created_at" readonly>
              </div>
            </form>
          </div>
          <div class="modal-footer border-0">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="mu-save-btn">Save Changes</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  document.getElementById('edit_id').value = user.id || '';
  document.getElementById('edit_employee_id').value = user.employee_id || '';
  document.getElementById('edit_full_name').value = user.full_name || '';
  document.getElementById('edit_email').value = user.email || '';
  document.getElementById('edit_role').value = user.role || '';
  document.getElementById('edit_department').value = user.department || '';
  document.getElementById('edit_position').value = user.position || '';
  document.getElementById('edit_reporting_to').value = user.reporting_to || '';
  document.getElementById('edit_is_active').value = String(user.is_active ?? 1);
  document.getElementById('edit_created_at').value = user.created_at || '-';

  document.getElementById('mu-save-btn').onclick = async () => {
    const formData = new FormData(document.getElementById('mu-edit-form'));
    formData.append('action', 'update');

    const saveRes = await fetch(API, { method: 'POST', body: formData });
    const saveJson = await saveRes.json();

    if (!saveJson.success) {
      alert(saveJson.message || 'Update failed');
      return;
    }

    alert('User updated successfully');
    loadUsers();

    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      modalInstance?.hide();
    }
  };

  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    new bootstrap.Modal(modal).show();
  } else {
    modal.style.display = 'block';
  }
}
  // Pagination render (simple)
  function renderPagination() {
    // replace with minimal UI by updating a small pager row if needed
    // If you want full pagination UI, implement here.
    // For now, show simple next/prev controls appended below table.
    let pager = document.getElementById('mu-pager');
    if (!pager) {
      pager = el('div', { id: 'mu-pager', class: 'd-flex justify-content-between align-items-center mt-3' });
      tbody.closest('.table-responsive').after(pager);
    }
    const total = Math.ceil(filtered.length / pageSize) || 1;
    pager.innerHTML = `
      <div>Showing page ${currentPage} of ${total} (${filtered.length} users)</div>
      <div>
        <button id="mu-prev" class="btn btn-sm btn-outline-secondary me-2" ${currentPage===1?'disabled':''}>Prev</button>
        <button id="mu-next" class="btn btn-sm btn-outline-secondary" ${currentPage===total?'disabled':''}>Next</button>
      </div>`;
    pager.querySelector('#mu-prev').addEventListener('click', () => { if (currentPage>1) { currentPage--; renderTable(); }});
    pager.querySelector('#mu-next').addEventListener('click', () => { if (currentPage<total) { currentPage++; renderTable(); }});
  }

  // Hook search input if present
  function wireSearch() {
    const search = document.getElementById('searchInput') || document.querySelector('input[type="search"]');
    if (search) {
      let t;
      search.addEventListener('input', (e) => {
        clearTimeout(t);
        t = setTimeout(() => applySearch(e.target.value), 220);
      });
    }
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    wireSearch();
    loadUsers();
  });

  // Expose for debugging
  window.MU = { loadUsers, applySearch, get users() { return users; } };
})();