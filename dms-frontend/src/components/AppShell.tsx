"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getEmail, getRole, getToken } from "@/lib/auth";
import { listApprovalRequests, listMyNotifications } from "@/lib/api";

type NavItem = {
  label: string;
  href: string;
  adminOnly?: boolean;
  badge?: number;
};

export default function AppShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const r = useRouter();
  const pathname = usePathname();

  const [token, setTokenState] = useState("");
  const [role, setRoleState] = useState("");
  const [email, setEmailState] = useState("");

  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);

  useEffect(() => {
    setTokenState(getToken());
    setRoleState(getRole());
    setEmailState(getEmail());
  }, [pathname]);

  // Fetch sidebar badges (unread notif + pending approvals)
  useEffect(() => {
    const t = getToken();
    const currentRole = getRole();

    if (!t) {
      setUnreadNotifCount(0);
      setPendingApprovalCount(0);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // notifications count
        const notifs = await listMyNotifications();
        const unread = (notifs || []).filter((n) => !n.isRead).length;
        if (!cancelled) setUnreadNotifCount(unread);
      } catch {
        if (!cancelled) setUnreadNotifCount(0);
      }

      if (currentRole === "ADMIN") {
        try {
          const reqs = await listApprovalRequests();
          const pending = (reqs || []).filter((x) => x.status === "PENDING").length;
          if (!cancelled) setPendingApprovalCount(pending);
        } catch {
          if (!cancelled) setPendingApprovalCount(0);
        }
      } else {
        if (!cancelled) setPendingApprovalCount(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const nav: NavItem[] = useMemo(
    () => [
      { label: "Dashboard", href: "/" },
      { label: "Documents", href: "/documents" },
      {
        label: "Notifications",
        href: "/notifications",
        badge: unreadNotifCount,
      },

      // ✅ ADMIN area
      { label: "Users (Admin)", href: "/users", adminOnly: true },
      {
        label: "Approvals (Admin)",
        href: "/approvals",
        adminOnly: true,
        badge: pendingApprovalCount,
      },

      { label: "Test API", href: "/test-api" },
    ],
    [unreadNotifCount, pendingApprovalCount]
  );

  const visible = nav.filter((x) => (x.adminOnly ? role === "ADMIN" : true));

  function logout() {
    clearAuth();
    r.replace("/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">DMS</div>

        <div className="small" style={{ marginBottom: 14 }}>
          {token ? (
            <>
              <div>
                <b>{email || "-"}</b>
              </div>
              <div>Role: {role || "-"}</div>
            </>
          ) : (
            <div>Not logged in</div>
          )}
        </div>

        {visible.map((x) => {
          const isActive = pathname === x.href;
          const badge = x.badge ?? 0;

          return (
            <button
              key={x.href}
              className={`navbtn ${isActive ? "active" : ""}`}
              onClick={() => r.push(x.href)}
              type="button"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
            >
              <span>{x.label}</span>

              {badge > 0 && (
                <span
                  className="badge"
                  title="Count"
                  style={{
                    minWidth: 28,
                    textAlign: "center",
                    fontWeight: 900,
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}

        <div style={{ marginTop: 16 }}>
          {token && (
            <button type="button" onClick={logout} style={{ width: "100%" }}>
              Logout
            </button>
          )}
        </div>
      </aside>

      <div className="content">
        <div className="topbar">
          <div style={{ fontSize: 18, fontWeight: 900 }}>{title}</div>
        </div>
        {children}
      </div>
    </div>
  );
}