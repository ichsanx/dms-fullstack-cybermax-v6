"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, login, me } from "@/lib/api";
import { clearAuth, setEmail, setRole, setToken } from "@/lib/auth";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmailState] = useState("");
  const [password, setPasswordState] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      clearAuth();
      const res = await login(email, password);
      setToken(res.access_token);

      const payload = await me();
      setRole(payload.role || "");
      setEmail(payload.email || "");

      r.replace("/");
    } catch (e: any) {
      const msg =
        e?.body?.message ||
        (typeof e?.body === "string" ? e.body : "") ||
        e?.message ||
        "Login gagal";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="card" style={{ width: 420 }}>
        <h1 style={{ marginTop: 0 }}>Login</h1>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmailState(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPasswordState(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {err && <pre style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{err}</pre>}

        <p className="small" style={{ marginTop: 14 }}>
          Buat user via Swagger: <code>{API_BASE_URL}/docs</code> → <b>POST /auth/register</b>
        </p>
      </div>
    </main>
  );
}
