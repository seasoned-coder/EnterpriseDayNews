// API client for the BT Enterprise Day News backend.
// In development with Vite, requests to /api and /uploads are proxied to the backend.
// For other environments, override the base URL by setting VITE_API_BASE_URL (e.g. in .env.local).

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
export const API_BASE = RAW_BASE.replace(/\/$/, "");
export const UPLOADS_BASE = `${API_BASE}/uploads`;

interface HandleOptions {
  redirectOnAuthFailure?: boolean;
}

export type SubmissionStatusApi = "NEW" | "APPROVED" | "REJECTED";

export interface ApiSubmission {
  id: number;
  filePath: string;
  originalFileName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: SubmissionStatusApi;
  vettedBy: string | null;
  vettedAt: string | null;
  display: boolean;
  displayOrder: number;
  priority: number;
  durationSeconds: number;
  totalCost: number;
  isInfoMessage: boolean;
  isFlashMode: boolean;
  messageText: string | null;
}

export interface ProjectorSettings {
  id: string;
  intervalSpeedSeconds: number;
  displayDurationSeconds: number;
  imageRefreshSeconds: number;
}

export interface ApiUser {
  username: string;
  role: "STUDENT" | "STAFF";
}

export interface ApiStudentAccount {
  id: number;
  username: string;
  locked: boolean;
  manuallyLocked: boolean;
  failedLoginAttempts: number;
  temporaryLockUntil: string | null;
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  updatedAt: string;
}

const headers = () => {
  const token = localStorage.getItem("token");
  return {
    "Authorization": `Bearer ${token}`
  };
};

async function handle<T>(res: Response, options: HandleOptions = {}): Promise<T> {
  const { redirectOnAuthFailure = true } = options;

  if (redirectOnAuthFailure && (res.status === 401 || res.status === 403)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed [${res.status}]: ${text || res.statusText}`);
  }
  // Some endpoints return no body
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return undefined as T;
}

export const api = {
  async login(username: string, role: "STUDENT" | "STAFF", password?: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, role, password }),
    });
    const data = await handle<{ token: string; username: string; role: "STUDENT" | "STAFF" }>(res, {
      redirectOnAuthFailure: false,
    });
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify({ username: data.username, role: data.role }));
    return data;
  },

  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  },

  getCurrentUser() {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) as ApiUser : null;
  },

  imageUrl(filePath: string) {
    return `${UPLOADS_BASE}/${filePath}`;
  },

  async studentUpload(name: string, file: File, priority: number = 1, durationSeconds: number = 10) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("priority", priority.toString());
    fd.append("durationSeconds", durationSeconds.toString());
    const res = await fetch(`${API_BASE}/api/student/upload`, {
      method: "POST",
      headers: headers(),
      body: fd,
    });
    return handle<ApiSubmission>(res);
  },

  studentGetMyUploads(_name: string) {
    return fetch(`${API_BASE}/api/student/uploads`, {
      headers: headers(),
    }).then(handle<ApiSubmission[]>);
  },

  studentDeleteMyUpload(id: number, _name: string) {
    return fetch(`${API_BASE}/api/student/uploads/${id}`, {
      method: "DELETE",
      headers: headers(),
    }).then(handle<void>);
  },

  list(kind: "new" | "approved" | "rejected", _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/${kind}`, {
      headers: headers(),
    }).then(handle<ApiSubmission[]>);
  },

  approve(id: number, _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/approve/${id}`, {
      method: "POST",
      headers: headers(),
    }).then(handle<ApiSubmission>);
  },

  reject(id: number, _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/reject/${id}`, {
      method: "POST",
      headers: headers(),
    }).then(handle<ApiSubmission>);
  },

  toggleDisplay(id: number, display: boolean, _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/toggle-display/${id}?display=${display}`, {
      method: "POST",
      headers: headers(),
    }).then(handle<ApiSubmission>);
  },

  updateDisplayOrder(ids: number[], _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/order`, {
      method: "POST",
      headers: {
        ...headers(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ids),
    }).then(handle<void>);
  },

  delete(id: number, _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/${id}`, {
      method: "DELETE",
      headers: headers(),
    }).then(handle<void>);
  },

  deleteAll(_staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/all`, {
      method: "DELETE",
      headers: headers(),
    }).then(handle<void>);
  },

  listInfo(_staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/info`, {
      headers: headers(),
    }).then(handle<ApiSubmission[]>);
  },

  uploadInfo(file: File, flash: boolean, _staffName = "staff") {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("flash", flash.toString());
    return fetch(`${API_BASE}/api/staff/info/upload`, {
      method: "POST",
      headers: headers(),
      body: fd,
    }).then(handle<ApiSubmission>);
  },

  postFreeText(text: string, flash: boolean, _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/info/free-text?flash=${flash}`, {
      method: "POST",
      headers: {
        ...headers(),
        "Content-Type": "text/plain",
      },
      body: text,
    }).then(handle<ApiSubmission>);
  },

  toggleFlash(id: number, flash: boolean, _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/toggle-flash/${id}?flash=${flash}`, {
      method: "POST",
      headers: headers(),
    }).then(handle<ApiSubmission>);
  },

  listStudentAccounts(_staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/students`, {
      headers: headers(),
    }).then(handle<ApiStudentAccount[]>);
  },

  createStudentAccount(username: string, password: string, _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/students`, {
      method: "POST",
      headers: {
        ...headers(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    }).then(handle<ApiStudentAccount>);
  },

  setStudentAccountLocked(id: number, locked: boolean, _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/students/${id}/lock?locked=${locked}`, {
      method: "POST",
      headers: headers(),
    }).then(handle<ApiStudentAccount>);
  },

  changeStudentAccountPassword(id: number, password: string, _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/students/${id}/password`, {
      method: "PUT",
      headers: {
        ...headers(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    }).then(handle<ApiStudentAccount>);
  },

  deleteStudentAccount(id: number, _staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/students/${id}`, {
      method: "DELETE",
      headers: headers(),
    }).then(handle<void>);
  },

  projectorImages() {
    return fetch(`${API_BASE}/api/projector/images`).then(handle<ApiSubmission[]>);
  },

  projectorSettings() {
    return fetch(`${API_BASE}/api/projector/settings`).then(handle<ProjectorSettings>);
  },
};

// Format a backend ISO timestamp into a friendly relative string.
export function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr${hr === 1 ? "" : "s"} ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

