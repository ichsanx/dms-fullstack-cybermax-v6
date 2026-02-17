"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { me } from "@/lib/api";
import { getRole, getToken, setEmail, setRole } from "@/lib/auth";

export default function HomePage() {
  const r = useRouter();
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState(getRole());
  const [email, setEmailState] = useState("");

  useEffect(() => {
    const t = getToken();
    if (!t) return r.replace("/login");

    (async () => {
      try {
        const payload = await me();
        setRole(payload.role || "");
        setEmail(payload.email || "");
        setRoleState(payload.role || "");
        setEmailState(payload.email || "");
      } catch {
        r.replace("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [r]);

  return (
    <AppShell title="Dashboard">
      <div className="card" style={{ maxWidth: 980 }}>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <div><b>{email || "-"}</b></div>
                <div className="small">Role: {role || "-"}</div>
              </div>
              <span className="badge">Menu otomatis sesuai role</span>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 12, maxWidth: 720 }}>
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
                <div className="card">
                  <b>Approvals (Admin)</b>
                  <div className="small">Pending + approve/reject</div>
                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => r.push("/approvals")}>Buka</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
