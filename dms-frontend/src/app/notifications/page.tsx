"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  listMyNotifications,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function NotificationsPage() {
  const r = useRouter();
  const pathname = usePathname();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!getToken()) return r.replace("/login");
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const res = await listMyNotifications();
      setItems(res || []);
    } catch (e: any) {
      if (e?.status === 401) return r.replace("/login");
      setErr(
        e?.body?.message ||
          (typeof e?.body === "string" ? e.body : "") ||
          e?.message ||
          "Gagal load notifications"
      );
    } finally {
      setLoading(false);
    }
  }

  async function onRead(id: string) {
    setErr("");
    try {
      await markNotificationRead(id);
      await refresh();

      // ✅ trigger AppShell badge refresh (pathname effect)
      r.replace(pathname);
    } catch (e: any) {
      setErr(e?.body || e?.message || "Gagal mark read");
    }
  }

  return (
    <AppShell title="Notifications">
      <div className="card" style={{ maxWidth: 980 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <b>My Notifications</b>
          <button onClick={refresh}>Refresh</button>
        </div>

        {err && <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre>}

        {loading ? (
          <div style={{ marginTop: 12 }}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={{ marginTop: 12 }} className="small">
            Belum ada notifikasi.
          </div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {items.map((n) => (
              <div
                key={n.id}
                className="card"
                style={{ padding: 14, opacity: n.isRead ? 0.75 : 1 }}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <b>{n.isRead ? "READ" : "UNREAD"}</b>
                  <span className="small">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ marginTop: 8 }}>{n.message}</div>
                {!n.isRead && (
                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => onRead(n.id)}>Mark as read</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}