"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { clearAuth, getEmail, getRole, getToken } from "@/lib/auth";

export default function DashboardPage() {
  const r = useRouter();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return r.replace("/login");

    setEmail(getEmail());
    setRole(getRole());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shortcuts = useMemo(() => {
    const base = [
      { label: "Go to Documents", href: "/documents" },
      { label: "Go to Notifications", href: "/notifications" },
    ];

    if (role === "ADMIN") {
      base.push(
        { label: "Admin: Create User", href: "/users" },
        { label: "Admin: Approvals", href: "/approvals" }
      );
    }

    base.push({ label: "Test API", href: "/test-api" });

    return base;
  }, [role]);

  function logout() {
    clearAuth();
    r.replace("/login");
  }

  return (
    <AppShell title="Dashboard">
      <div style={{ display: "grid", gap: 14, maxWidth: 860 }}>
        <div className="card">
          <b>Welcome</b>
          <div className="small" style={{ marginTop: 6 }}>
            Logged in as: <b>{email || "-"}</b> • Role: <b>{role || "-"}</b>
          </div>
        </div>

        <div className="card">
          <b>Shortcuts</b>
          <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 420 }}>
            {shortcuts.map((s) => (
              <button key={s.href} type="button" onClick={() => r.push(s.href)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <b>Session</b>
          <div className="small" style={{ marginTop: 8 }}>
            Kalau kamu mengalami error 401/403 yang aneh, coba logout lalu login lagi.
          </div>
          <div style={{ marginTop: 10, maxWidth: 220 }}>
            <button type="button" onClick={logout} style={{ width: "100%" }}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}