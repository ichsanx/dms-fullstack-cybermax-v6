"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getEmail, getRole, getToken } from "@/lib/auth";

type NavItem = { label: string; href: string; adminOnly?: boolean };

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

  useEffect(() => {
    setTokenState(getToken());
    setRoleState(getRole());
    setEmailState(getEmail());
  }, [pathname]);

  const nav: NavItem[] = useMemo(
    () => [
      { label: "Dashboard", href: "/" },
      { label: "Documents", href: "/documents" },
      { label: "Notifications", href: "/notifications" },
      { label: "Approvals (Admin)", href: "/approvals", adminOnly: true },
      { label: "Test API", href: "/test-api" },
    ],
    []
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
              <div><b>{email || "-"}</b></div>
              <div>Role: {role || "-"}</div>
            </>
          ) : (
            <div>Not logged in</div>
          )}
        </div>

        {visible.map((x) => (
          <button
            key={x.href}
            className={`navbtn ${pathname === x.href ? "active" : ""}`}
            onClick={() => r.push(x.href)}
            type="button"
          >
            {x.label}
          </button>
        ))}

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
