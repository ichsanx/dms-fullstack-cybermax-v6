"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

type LinkItem = { label: string; href: string };

export default function TopNav({
  title,
  onRefresh,
  links,
}: {
  title: string;
  onRefresh?: () => void;
  links?: LinkItem[];
}) {
  const r = useRouter();
  const pathname = usePathname();

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("dms_token") || "";
  }, []);

  const defaultLinks: LinkItem[] = [
    { label: "Home", href: "/" },
    { label: "Documents", href: "/documents" },
    { label: "Approvals", href: "/approvals" },
    { label: "Notifications", href: "/notifications" },
    { label: "Test API", href: "/test-api" },
  ];

  function logout() {
    localStorage.removeItem("dms_token");
    r.replace("/login");
  }

  const items = links?.length ? links : defaultLinks;

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: "1px solid #333",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
        <b style={{ fontSize: 18 }}>{title}</b>
        <small style={{ opacity: 0.8 }}>
          {token ? "Logged in" : "No token"}
        </small>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {items.map((x) => (
          <button
            key={x.href}
            type="button"
            onClick={() => r.push(x.href)}
            style={{
              opacity: pathname === x.href ? 1 : 0.85,
              border: "1px solid #444",
            }}
          >
            {x.label}
          </button>
        ))}

        {onRefresh && (
          <button type="button" onClick={onRefresh}>
            Refresh
          </button>
        )}

        <button type="button" onClick={logout}>
          Logout
        </button>
      </div>
    </div>
  );
}
