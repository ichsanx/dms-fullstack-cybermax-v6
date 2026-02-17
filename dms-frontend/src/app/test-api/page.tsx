"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { API_BASE_URL, me } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function TestApiPage() {
  const r = useRouter();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!getToken()) return r.replace("/login");
    (async () => {
      try {
        const res = await me();
        setData(res);
      } catch (e: any) {
        setErr(e?.body || e?.message || "Error");
      }
    })();
  }, [r]);

  return (
    <AppShell title="Test API">
      <div className="card" style={{ maxWidth: 980 }}>
        <div className="small">API_BASE_URL: {API_BASE_URL}</div>
        {err && <pre style={{ whiteSpace: "pre-wrap" }}>{err}</pre>}
        <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </AppShell>
  );
}
