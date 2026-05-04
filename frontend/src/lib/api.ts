// API client for the Enterprise Day News backend.
// In development with Vite, requests to /api and /uploads are proxied to the backend.
// For other environments, override the base URL by setting VITE_API_BASE_URL (e.g. in .env.local).

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
export const API_BASE = RAW_BASE.replace(/\/$/, "");
export const UPLOADS_BASE = `${API_BASE}/uploads`;

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
}

export interface ProjectorSettings {
  id: string;
  intervalSpeedSeconds: number;
  displayDurationSeconds: number;
  imageRefreshSeconds: number;
}

const headers = (role: "STUDENT" | "STAFF", user: string) => ({
  "X-User": user,
  "X-Role": role,
});

async function handle<T>(res: Response): Promise<T> {
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
      headers: headers("STUDENT", name),
      body: fd,
    });
    return handle<ApiSubmission>(res);
  },

  studentGetMyUploads(name: string) {
    return fetch(`${API_BASE}/api/student/uploads`, {
      headers: headers("STUDENT", name),
    }).then(handle<ApiSubmission[]>);
  },

  list(kind: "new" | "approved" | "rejected", staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/${kind}`, {
      headers: headers("STAFF", staffName),
    }).then(handle<ApiSubmission[]>);
  },

  approve(id: number, staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/approve/${id}`, {
      method: "POST",
      headers: headers("STAFF", staffName),
    }).then(handle<ApiSubmission>);
  },

  reject(id: number, staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/reject/${id}`, {
      method: "POST",
      headers: headers("STAFF", staffName),
    }).then(handle<ApiSubmission>);
  },

  toggleDisplay(id: number, display: boolean, staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/toggle-display/${id}?display=${display}`, {
      method: "POST",
      headers: headers("STAFF", staffName),
    }).then(handle<ApiSubmission>);
  },

  updateDisplayOrder(ids: number[], staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/order`, {
      method: "POST",
      headers: {
        ...headers("STAFF", staffName),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ids),
    }).then(handle<void>);
  },

  delete(id: number, staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/${id}`, {
      method: "DELETE",
      headers: headers("STAFF", staffName),
    }).then(handle<void>);
  },

  deleteAll(staffName = "staff") {
    return fetch(`${API_BASE}/api/staff/all`, {
      method: "DELETE",
      headers: headers("STAFF", staffName),
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
