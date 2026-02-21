"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  approveRequest,
  listApprovalRequests,
  rejectRequest,
  type ApprovalRequest,
} from "@/lib/api";
import { getRole, getToken } from "@/lib/auth";

export default function ApprovalsPage() {
  const r = useRouter();
  const pathname = usePathname();

  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    const t = getToken();
    const role = getRole();
    if (!t) return r.replace("/login");
    if (role !== "ADMIN") return r.replace("/");
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const res = await listApprovalRequests();
      setItems(res || []);
    } catch (e: any) {
      if (e?.status === 401) return r.replace("/login");
      setErr(
        e?.body?.message ||
          (typeof e?.body === "string" ? e.body : "") ||
          e?.message ||
          "Gagal load approvals"
      );
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(""), 1200);
  }

  async function onApprove(id: string) {
    if (!confirm("Approve request ini?")) return;
    setErr("");
    try {
      await approveRequest(id);
      await refresh();

      // ✅ trigger AppShell badge refresh
      r.replace(pathname);
    } catch (e: any) {
      setErr(e?.body || e?.message || "Approve gagal");
    }
  }

  async function onReject(id: string) {
    if (!confirm("Reject request ini?")) return;
    setErr("");
    try {
      await rejectRequest(id);
      await refresh();

      // ✅ trigger AppShell badge refresh
      r.replace(pathname);
    } catch (e: any) {
      setErr(e?.body || e?.message || "Reject gagal");
    }
  }

  const pending = items.filter((x) => x.status === "PENDING");

  return (
    <AppShell title="Approvals (Admin)">
      <div className="card" style={{ maxWidth: 980 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <b>Pending Requests</b>
          <button onClick={refresh}>Refresh</button>
        </div>

        {err && <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre>}

        {loading ? (
          <div style={{ marginTop: 12 }}>Loading...</div>
        ) : pending.length === 0 ? (
          <div style={{ marginTop: 12 }} className="small">
            Tidak ada pending.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {pending.map((x) => (
              <div key={x.id} className="card" style={{ padding: 14 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <b>{x.type}</b>
                  <span className="badge">{x.status}</span>
                </div>

                <div className="small" style={{ marginTop: 6 }}>
                  Request ID: <b>{x.id}</b>{" "}
                  {copied === x.id && (
                    <span style={{ color: "var(--ok)" }}>Copied!</span>
                  )}
                </div>

                <div className="small" style={{ marginTop: 6 }}>
                  Doc ID: <b>{x.documentId}</b>{" "}
                  {copied === x.documentId && (
                    <span style={{ color: "var(--ok)" }}>Copied!</span>
                  )}
                </div>

                <div className="row" style={{ marginTop: 10 }}>
                  <button onClick={() => copy(x.id)}>Copy Request ID</button>
                  <button onClick={() => copy(x.documentId)}>Copy Doc ID</button>
                  <button onClick={() => onApprove(x.id)}>Approve</button>
                  <button onClick={() => onReject(x.id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}