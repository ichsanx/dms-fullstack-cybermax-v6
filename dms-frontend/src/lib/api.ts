// src/lib/api.ts
import { clearAuth, getToken } from "@/lib/auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

type ApiError = Error & { status?: number; body?: any };

async function readBody(res: Response) {
  const ct = res.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) return await res.json();
  } catch {}
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers || {});
  headers.set("Accept", "application/json");

  // ✅ AUTO attach token (backend tetap butuh Bearer)
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers, cache: "no-store" });

  if (!res.ok) {
    const body = await readBody(res);

    // auto logout kalau 401
    if (res.status === 401 && typeof window !== "undefined") {
      clearAuth();
    }

    const err: ApiError = new Error(`API ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  const body = await readBody(res);
  return body as T;
}

/** ======================
 * AUTH
 * ====================== */
export type AuthLoginResponse = { access_token: string };

export async function login(email: string, password: string) {
  return apiFetch<AuthLoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function me() {
  return apiFetch<any>("/auth/me");
}

/** ======================
 * DOCUMENTS
 * ====================== */
export type User = { id: string; email: string; role?: string };

export type DocumentItem = {
  id: string;
  title: string;
  fileUrl: string;
  status?: string;
  createdAt?: string;
  createdBy?: User;
};

export type Paginated<T> = {
  items: T[];
  total?: number;
  page?: number;
  limit?: number;
};

export async function listDocuments(opts?: { q?: string; page?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.limit) params.set("limit", String(opts.limit));

  const qs = params.toString();
  const path = qs ? `/documents?${qs}` : "/documents";
  return apiFetch<Paginated<DocumentItem>>(path);
}

export async function uploadDocument(payload: {
  title: string;
  file: File;
  description?: string;
  documentType?: string; // required di backend kamu
}) {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("documentType", payload.documentType || "GENERAL"); // ✅ default aman
  if (payload.description) form.append("description", payload.description);
  form.append("file", payload.file);

  return apiFetch<DocumentItem>("/documents", {
    method: "POST",
    body: form,
  });
}

export async function requestDelete(docId: string) {
  return apiFetch<any>(`/documents/${docId}/request-delete`, { method: "POST" });
}

export async function requestReplace(docId: string, file: File) {
  const form = new FormData();
  form.append("file", file);

  return apiFetch<any>(`/documents/${docId}/request-replace`, {
    method: "POST",
    body: form,
  });
}

/** ======================
 * APPROVALS
 * ====================== */
export type ApprovalRequest = {
  id: string;
  type: "DELETE" | "REPLACE" | string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  documentId: string;
  createdAt?: string;
  createdBy?: User;
  document?: DocumentItem;
};

export async function listApprovalRequests() {
  return apiFetch<ApprovalRequest[]>("/approvals/requests");
}

export async function approveRequest(requestId: string) {
  return apiFetch<any>(`/approvals/requests/${requestId}/approve`, {
    method: "POST",
  });
}

export async function rejectRequest(requestId: string) {
  return apiFetch<any>(`/approvals/requests/${requestId}/reject`, {
    method: "POST",
  });
}

/** ======================
 * NOTIFICATIONS
 * ====================== */
export type NotificationItem = {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export async function listMyNotifications() {
  return apiFetch<NotificationItem[]>("/notifications/me");
}

export async function markNotificationRead(id: string) {
  return apiFetch<any>(`/notifications/${id}/read`, { method: "POST" });
}
