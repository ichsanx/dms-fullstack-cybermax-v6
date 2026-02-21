"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getDashboardSummary, me, type DashboardSummary } from "@/lib/api";
import { getRole, getToken, setEmail, setRole } from "@/lib/auth";

export default function HomePage() {
  const r = useRouter();
  const [loading, setLoading] = useState(true);

  const [role, setRoleState] = useState(getRole());
  const [email, setEmailState] = useState("");

  const [summary, setSummary] = useState<DashboardSummary>({
    documentsTotal: undefined,
    unreadNotifications: undefined,
    pendingApprovals: undefined,
  });

  useEffect(() => {
    const t = getToken();
    if (!t) return r.replace("/login");

    (async () => {
      try {
        // refresh identity
        const payload = await me();
        setRole(payload.role || "");
        setEmail(payload.email || "");
        setRoleState(payload.role || "");
        setEmailState(payload.email || "");

        // load summary
        const s = await getDashboardSummary();
        setSummary(s);
      } catch {
        r.replace("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [r]);

  return (
    <AppShell title="Dashboard">
      <div style={{ display: "grid", gap: 14, maxWidth: 980 }}>
        <div className="card">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div>
                  <b>{email || "-"}</b>
                </div>
                <div className="small">Role: {role || "-"}</div>
              </div>
              <span className="badge">Menu otomatis sesuai role</span>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="card">
          <b>Summary</b>
          <div className="small" style={{ marginTop: 6 }}>
            Ringkasan data dari API.
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            <div className="card" style={{ padding: 14 }}>
              <div className="small">Total Documents</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
                {loading ? "-" : summary.documentsTotal ?? "-"}
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="small">Unread Notifications</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
                {loading ? "-" : summary.unreadNotifications ?? "-"}
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="small">Pending Approvals</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>
                {loading ? "-" : role === "ADMIN" ? summary.pendingApprovals ?? "-" : "-"}
              </div>
              <div className="small" style={{ marginTop: 6, opacity: 0.8 }}>
                {role === "ADMIN" ? "Khusus admin" : "Admin only"}
              </div>
            </div>
          </div>
        </div>

        {/* Shortcuts */}
        <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
          <div className="card">
            <b>Documents</b>
            <div className="small">Upload + Request Delete/Replace</div>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => r.push("/documents")}>Buka</button>
            </div>
          </div>

          <div className="card">
            <b>Notifications</b>
            <div className="small">Lihat notifikasi hasil approval</div>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => r.push("/notifications")}>Buka</button>
            </div>
          </div>

          {role === "ADMIN" && (
            <>
              <div className="card">
                <b>Users (Admin)</b>
                <div className="small">Create user (admin-only)</div>
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => r.push("/users")}>Buka</button>
                </div>
              </div>

              <div className="card">
                <b>Approvals (Admin)</b>
                <div className="small">Pending + approve/reject</div>
                <div style={{ marginTop: 10 }}>
                  <button onClick={() => r.push("/approvals")}>Buka</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}