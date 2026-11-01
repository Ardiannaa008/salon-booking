const REFRESH_MS = 5000;
const STORAGE_KEY = 'salon-admin-password';

const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const dashboard = document.getElementById('dashboard');

let refreshTimer = null;

function readPassword() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function savePassword(password) {
  try {
    sessionStorage.setItem(STORAGE_KEY, password);
  } catch {
    // Without storage, the admin just signs in again after a reload.
  }
}

function clearPassword() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was stored.
  }
}

let password = readPassword();

async function adminFetch(url) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${password}` } });
  if (response.status === 401 || response.status === 429) {
    const error = new Error(response.status === 429 ? 'Too many attempts. Try again later.' : 'Wrong password.');
    error.authFailed = true;
    throw error;
  }
  if (!response.ok) throw new Error('Could not load data.');
  return response.json();
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function statusCell(status) {
  const td = document.createElement('td');
  const pill = document.createElement('span');
  pill.className = `pill pill-${status}`;
  pill.textContent = status;
  td.append(pill);
  return td;
}

function emptyRow(columns, text) {
  const tr = document.createElement('tr');
  const td = cell(text);
  td.colSpan = columns;
  td.className = 'muted';
  tr.append(td);
  return tr;
}

function renderJobs(jobs) {
  const rows = jobs.map((job) => {
    const tr = document.createElement('tr');
    tr.append(
      cell(`#${job.id}`),
      cell(job.to),
      statusCell(job.status),
      cell(`${job.attempts} / ${job.maxAttempts}`),
      cell(job.lastError ?? '–'),
      cell(new Date(job.createdAt).toLocaleString()),
    );
    return tr;
  });
  document.getElementById('jobs-body').replaceChildren(...(rows.length ? rows : [emptyRow(6, 'No emails yet.')]));
}

function renderAppointments(appointments) {
  const rows = appointments.map((appointment) => {
    const tr = document.createElement('tr');
    tr.append(
      cell(appointment.date),
      cell(`${String(appointment.startHour).padStart(2, '0')}:00`),
      cell(appointment.serviceName),
      cell(appointment.customerName),
      cell(appointment.customerEmail),
    );
    return tr;
  });
  document.getElementById('appointments-body')
    .replaceChildren(...(rows.length ? rows : [emptyRow(5, 'No appointments yet.')]));
}

async function refresh() {
  const [{ emailJobs }, { appointments }, health] = await Promise.all([
    adminFetch('/email-jobs?limit=100'),
    adminFetch('/appointments?limit=100'),
    fetch('/health').then((response) => response.json()),
  ]);
  renderJobs(emailJobs);
  renderAppointments(appointments);
  for (const status of ['pending', 'sent', 'failed']) {
    document.getElementById(`count-${status}`).textContent = health.emailQueue?.[status] ?? '–';
  }
}

function signOut(message = '') {
  clearInterval(refreshTimer);
  clearPassword();
  password = null;
  dashboard.hidden = true;
  loginForm.hidden = false;
  loginError.textContent = message;
  loginError.hidden = !message;
}

async function openDashboard() {
  try {
    await refresh();
  } catch (error) {
    signOut(error.message);
    return;
  }
  savePassword(password);
  loginForm.hidden = true;
  loginError.hidden = true;
  dashboard.hidden = false;
  document.getElementById('password').value = '';

  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    refresh().catch((error) => {
      if (error.authFailed) signOut(error.message);
      // Other errors are temporary, so the next refresh tries again.
    });
  }, REFRESH_MS);
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  password = document.getElementById('password').value;
  openDashboard();
});

document.getElementById('sign-out').addEventListener('click', () => signOut());

if (password) openDashboard();
