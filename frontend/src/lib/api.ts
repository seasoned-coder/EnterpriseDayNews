// API client for the Enterprise Day News backend.
// Override the base URL by setting VITE_API_BASE_URL (e.g. in .env.local) — defaults to http://localhost:8080.

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080";
export const API_BASE = RAW_BASE.replace(/\/$/, "");
export const UPLOADS_BASE = `${API_BASE}/uploads`;

export type SubmissionStatusApi = "PENDING" | "APPROVED" | "REJECTED";

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

  async studentUpload(name: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE}/api/student/upload`, {
      method: "POST",
      headers: headers("STUDENT", name),
      body: fd,
    });
    return handle<ApiSubmission>(res);
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
