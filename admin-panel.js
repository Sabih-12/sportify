function getToken() {
  return localStorage.getItem('adminToken');
}

function setLoginMessage(text) {
  const el = document.getElementById('loginMsg');
  if (el) el.textContent = text || '';
}

async function api(path, options) {
  const token = getToken();
  return fetch(path, {
    ...(options || {}),
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      ...((options && options.headers) || {}),
    },
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRs(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString()}`;
}

function renderAnalyticsPanel({ salesByCategory = [], topProducts = [], generatedAt }) {
  const updated = generatedAt ? new Date(generatedAt).toLocaleString() : new Date().toLocaleString();

  const salesRows = salesByCategory.length
    ? salesByCategory.map((row) => `
        <tr>
          <td>${escapeHtml(row.category || 'Uncategorized')}</td>
          <td>${Number(row.totalQty || 0)}</td>
          <td>${formatRs(row.totalSales)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="3" class="empty-row">No sales recorded yet.</td></tr>';

  const topRows = topProducts.length
    ? topProducts.map((row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.productName || row.name || 'Unknown product')}</td>
          <td>${Number(row.soldQty || 0)}</td>
          <td>${formatRs(row.revenue)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" class="empty-row">No product sales yet.</td></tr>';

  return `
    <p class="status-text analytics-meta">Last updated · ${updated}</p>
    <div class="admin-analytics-grid">
      <div>
        <h3>Sales by category</h3>
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr><th>Category</th><th>Units sold</th><th>Revenue</th></tr>
            </thead>
            <tbody>${salesRows}</tbody>
          </table>
        </div>
      </div>
      <div>
        <h3>Top products</h3>
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr><th>#</th><th>Product</th><th>Qty sold</th><th>Revenue</th></tr>
            </thead>
            <tbody>${topRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    setLoginMessage(data.message || data.error || 'Invalid email or password.');
    return;
  }
  localStorage.setItem('adminToken', data.token);
  setLoginMessage('');
  await showDashboard();
}

function formatStatus(status) {
  if (!status) return 'Pending';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function renderOrdersTable(orders) {
  const tbody = document.querySelector('#orders tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-row">No orders yet. New storefront orders will appear here.</td></tr>';
    return;
  }

  for (const order of orders) {
    const tr = document.createElement('tr');
    const customer = order.customer?.fullName || order.customer?.email || 'Guest';
    const total = Number(order.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
    const shortId = String(order._id).slice(-8).toUpperCase();
    tr.innerHTML = `
      <td>#${shortId}</td>
      <td>${customer}</td>
      <td>Rs. ${total}</td>
      <td>${formatStatus(order.status)}</td>
      <td>
        <select data-id="${order._id}">
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="shipped">Shipped</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button class="btn-secondary mini-btn" data-update="${order._id}">Update</button>
      </td>
    `;
    tbody.appendChild(tr);
    tr.querySelector('select').value = order.status || 'pending';
  }

  document.querySelectorAll('[data-update]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-update');
      const sel = document.querySelector(`select[data-id="${id}"]`);
      const updateRes = await api(`/api/admin/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: sel.value }),
      });
      if (!updateRes.ok) {
        alert('Could not update this order. Please try again.');
        return;
      }
      await loadOrders();
      await loadAnalyticsDisplay();
    });
  });
}

async function loadOrders() {
  const res = await api('/api/admin/orders');
  if (!res.ok) {
    alert('Your session has expired. Please sign in again.');
    logout();
    return;
  }
  const orders = await res.json();
  renderOrdersTable(orders);
}

async function fetchAnalyticsData() {
  const panel = document.getElementById('analytics-display');
  if (!panel) return null;

  const authRes = await api('/api/admin/analytics');
  if (authRes.ok) {
    return authRes.json();
  }

  const displayRes = await api('/api/admin/analytics/display');
  if (displayRes.ok) {
    const html = await displayRes.text();
    panel.innerHTML = html;
    return null;
  }

  const [salesRes, topRes] = await Promise.all([
    fetch('/api/analytics/sales-by-category'),
    fetch('/api/analytics/top-products'),
  ]);

  if (salesRes.ok && topRes.ok) {
    const salesByCategory = await salesRes.json();
    const topProducts = await topRes.json();
    return {
      salesByCategory: salesByCategory.map((row) => ({
        ...row,
        category: row.category || 'Uncategorized',
      })),
      topProducts,
      generatedAt: new Date().toISOString(),
    };
  }

  const snapshotRes = await api('/api/analytics/snapshots/latest');
  if (snapshotRes.ok) {
    const snapshot = await snapshotRes.json();
    if (snapshot) {
      return {
        salesByCategory: snapshot.salesByCategory || [],
        topProducts: snapshot.topProducts || [],
        generatedAt: snapshot.createdAt,
      };
    }
  }

  return { salesByCategory: [], topProducts: [], generatedAt: new Date().toISOString() };
}

async function loadAnalyticsDisplay() {
  const panel = document.getElementById('analytics-display');
  if (!panel) return;

  panel.innerHTML = '<p class="status-text">Loading sales insights…</p>';

  try {
    const data = await fetchAnalyticsData();
    if (data === null) return;
    panel.innerHTML = renderAnalyticsPanel(data);
  } catch (err) {
    console.error(err);
    panel.innerHTML = '<p class="status-text">Could not load sales insights. Restart the server and try again.</p>';
  }
}

async function showDashboard() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('dashboard').style.display = 'grid';
  await loadOrders();
  await loadAnalyticsDisplay();
}

function logout() {
  localStorage.removeItem('adminToken');
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('login').style.display = 'block';
  const panel = document.getElementById('analytics-display');
  if (panel) {
    panel.innerHTML = '<p class="status-text">Sign in to view sales by category and top products.</p>';
  }
}

document.getElementById('btnLogin')?.addEventListener('click', login);
document.getElementById('btnLogout')?.addEventListener('click', logout);
document.getElementById('btnRefreshOrders')?.addEventListener('click', loadOrders);
document.getElementById('btnRefreshAnalytics')?.addEventListener('click', loadAnalyticsDisplay);

if (getToken()) {
  showDashboard();
}
