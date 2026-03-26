const API_BASE = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

// Token getter function — set by App.js, calls Clerk's getToken() which handles caching/refresh
let _getToken = null;
export function setTokenGetter(fn) { _getToken = fn; }

async function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (_getToken) {
    try {
      const token = await _getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch (e) {
      // Token fetch failed — request will go without auth
    }
  }
  return headers;
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = await getHeaders();
  const res = await fetch(url, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return res.blob();
  }
  return res.json();
}

// Auth — handled by Clerk now, sync endpoint only
export const syncUser = (token, data) => {
  return fetch(`${API_BASE}/auth/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(data),
  }).then(r => { if (!r.ok) throw new Error('Sync failed'); return r.json(); });
};

// Supplements
export const getSupplements = (search = '', activeOnly = true) =>
  request(`/supplements?search=${encodeURIComponent(search)}&active_only=${activeOnly}&limit=200`);

export const createSupplement = (data) =>
  request('/supplements', { method: 'POST', body: JSON.stringify(data) });

export const updateSupplement = (id, data) =>
  request(`/supplements/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteSupplement = (id) =>
  request(`/supplements/${id}`, { method: 'DELETE' });

// Templates
export const getTemplates = (programName = '') =>
  request(`/templates?program_name=${encodeURIComponent(programName)}`);

export const getTemplate = (id) =>
  request(`/templates/${id}`);

export const updateTemplate = (id, data) =>
  request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const createTemplate = (data) =>
  request('/templates', { method: 'POST', body: JSON.stringify(data) });

export const deleteTemplate = (id) =>
  request(`/templates/${id}`, { method: 'DELETE' });


// Plans
export const getPlans = (search = '', program = '', status = '') =>
  request(`/plans?search=${encodeURIComponent(search)}&program=${encodeURIComponent(program)}&status=${encodeURIComponent(status)}`);

export const getPlan = (id) =>
  request(`/plans/${id}`);

export const createPlan = (data) =>
  request('/plans', { method: 'POST', body: JSON.stringify(data) });

export const updatePlan = (id, data) =>
  request(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deletePlan = (id) =>
  request(`/plans/${id}`, { method: 'DELETE' });

export const duplicatePlan = (id, body = {}) =>
  request(`/plans/${id}/duplicate`, { method: 'POST', body: JSON.stringify(body) });

export const finalizePlan = (id) =>
  request(`/plans/${id}/finalize`, { method: 'POST' });

export const reopenPlan = (id) =>
  request(`/plans/${id}/reopen`, { method: 'POST' });

// PDF Export
export const exportPatientPDF = async (planId) => {
  const url = `${API_BASE}/plans/${planId}/export/patient`;
  const headers = await getHeaders();
  return fetch(url, { headers }).then(r => {
    if (!r.ok) throw new Error('Export failed');
    return r.blob();
  });
};

export const exportHCPDF = async (planId) => {
  const url = `${API_BASE}/plans/${planId}/export/hc`;
  const headers = await getHeaders();
  return fetch(url, { headers }).then(r => {
    if (!r.ok) throw new Error('Export failed');
    return r.blob();
  });
};

// Google Drive
export const saveToDrive = (planId) =>
  request(`/plans/${planId}/save-to-drive`, { method: 'POST' });


// Users (admin)
export const getUsers = (search = '', role = '') =>
  request(`/users?search=${encodeURIComponent(search)}&role=${encodeURIComponent(role)}`);

export const createUser = (data) =>
  request('/users', { method: 'POST', body: JSON.stringify(data) });

export const updateUser = (id, data) =>
  request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteUser = (id) =>
  request(`/users/${id}`, { method: 'DELETE' });

// Patients
export const getPatients = (search = '') =>
  request(`/patients?search=${encodeURIComponent(search)}`);

export const getPatient = (id) =>
  request(`/patients/${id}`);

export const createPatient = (data) =>
  request('/patients', { method: 'POST', body: JSON.stringify(data) });

export const updatePatient = (id, data) =>
  request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deletePatient = (id) =>
  request(`/patients/${id}`, { method: 'DELETE' });

export const saveAllPlansToDrive = (patientId) =>
  request(`/patients/${patientId}/save-all-to-drive`, { method: 'POST' });


// Companies
export const getSuppliers = () =>
  request('/suppliers');

export const createSupplier = (data) =>
  request('/suppliers', { method: 'POST', body: JSON.stringify(data) });

export const updateSupplier = (id, data) =>
  request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteSupplier = (id) =>
  request(`/suppliers/${id}`, { method: 'DELETE' });



// Seed
export const seedData = () =>
  request('/seed', { method: 'POST' });
