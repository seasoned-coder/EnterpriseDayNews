// Centralized API constants — single source of truth for endpoint paths,
// header names and role values used by all components.
const API_BASE = process.env.REACT_APP_API_BASE || '/api';

export const ENDPOINTS = {
  studentUpload: `${API_BASE}/student/upload`,
  staffByView: (view) => `${API_BASE}/staff/${view}`,
  staffApprove: (id) => `${API_BASE}/staff/approve/${id}`,
  staffReject: (id) => `${API_BASE}/staff/reject/${id}`,
  staffToggleDisplay: (id, display) =>
    `${API_BASE}/staff/toggle-display/${id}?display=${display}`,
  staffOrder: `${API_BASE}/staff/order`,
  staffUpload: `${API_BASE}/staff/upload`,
  projectorImages: `${API_BASE}/projector/images`,
  projectorSettings: `${API_BASE}/projector/settings`,
};

export const HEADERS = { USER: 'X-User', ROLE: 'X-Role' };
export const ROLES = { STUDENT: 'STUDENT', STAFF: 'STAFF' };

export function authHeaders(username, role) {
  return { [HEADERS.USER]: username, [HEADERS.ROLE]: role };
}
