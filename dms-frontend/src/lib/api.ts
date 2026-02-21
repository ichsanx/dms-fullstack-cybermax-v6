// dms-frontend/src/lib/api.ts
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

type ApiFetchOptions = RequestInit & {
  /**
   * Kalau true, return Response mentah (dipakai untuk download file/blob).
   * Default: false (return parsed json/text).
   */
  rawResponse?: boolean;
};

async function apiFetch<T = any>(path: string, init?: ApiFetchOptions): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers || {});
  headers.set("Accept", "application/json");

  // Auto attach token (backend butuh Bearer)
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const { rawResponse, ...rest } = init || {};
  const res = await fetch(url, { ...rest, headers, cache: "no-store" });

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

  if (rawResponse) return res as unknown as T;

  return (await readBody(res)) as T;
}

function normalizePaginated<T>(data: any): Paginated<T> {
  // backend ideal: { items, total, page, limit }
  // fallback: kalau backend return array langsung
  if (Array.isArray(data)) return { items: data };
  if (data?.items && Array.isArray(data.items)) return data as Paginated<T>;
  return { items: [] };
}

/**
 * ⚠️ DEPRECATED
 * Dulu dipakai untuk open /uploads/... secara publik.
 * Sekarang file harus di-download lewat endpoint secure:
 * GET /documents/:id/download (JWT required).
 *
 * Aku biarkan function-nya supaya build tidak rusak kalau masih ada import lama,
 * tapi lebih baik jangan dipakai lagi.
 */
export function buildFileHref(_fileUrl?: string) {
  return "#";
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
 * USERS (ADMIN)
 * ====================== */
export type CreateUserPayload = {
  email: string;
  password: string;
  role?: "USER" | "ADMIN";
};

export async function createUser(payload: CreateUserPayload) {
  return apiFetch<any>("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** ======================
 * DOCUMENTS
 * ====================== */
export type User = { id: string; email: string; role?: string };

export type DocumentItem = {
  id: string;
  title: string;
  description?: string;
  documentType?: string;
  fileUrl: string;
  version?: number;
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

export async function listDocuments(opts?: {
  q?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  if (opts?.page) params.set("page", String(opts.page));
  if (opts?.limit) params.set("limit", String(opts.limit));

  const qs = params.toString();
  const path = qs ? `/documents?${qs}` : "/documents";

  const raw = await apiFetch<any>(path);
  return normalizePaginated<DocumentItem>(raw);
}

export async function uploadDocument(payload: {
  title: string;
  file: File;
  description?: string;
  documentType?: string;
}) {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("documentType", payload.documentType || "GENERAL");
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

/**
 * ✅ Secure download helper
 * Download file via JWT endpoint: GET /documents/:id/download
 *
 * Cara pakai:
 * await downloadDocumentFile(doc.id, `${doc.title}_v${doc.version}.pdf`)
 */
export async function downloadDocumentFile(docId: string) {
  // return Response mentah supaya caller bisa .blob()
  return apiFetch<Response>(`/documents/${docId}/download`, {
    method: "GET",
    rawResponse: true,
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

/** ======================
 * DASHBOARD SUMMARY
 * ====================== */
export type DashboardSummary = {
  documentsTotal?: number;
  unreadNotifications?: number;
  pendingApprovals?: number;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const summary: DashboardSummary = {};

  // 1) total documents (ambil dari paginated result)
  try {
    const docs = await listDocuments({ page: 1, limit: 1 });
    summary.documentsTotal = docs.total ?? (docs.items?.length ?? 0);
  } catch {
    // ignore
  }

  // 2) unread notifications (count dari list)
  try {
    const notifs = await listMyNotifications();
    summary.unreadNotifications = (notifs || []).filter((n) => !n.isRead).length;
  } catch {
    // ignore
  }

  // 3) pending approvals (admin only)
  try {
    const reqs = await listApprovalRequests();
    summary.pendingApprovals = (reqs || []).filter((r) => r.status === "PENDING").length;
  } catch (e: any) {
    // kalau user biasa, backend akan 403 -> ignore
    if (e?.status !== 403) {
      // ignore anyway
    }
  }

  return summary;
}