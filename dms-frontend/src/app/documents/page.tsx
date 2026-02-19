"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  listDocuments,
  uploadDocument,
  requestDelete,
  requestReplace,
  buildFileHref,
  type DocumentItem,
} from "@/lib/api";
import { getToken } from "@/lib/auth";

function fmtDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
}

function shortId(id?: string) {
  if (!id) return "";
  return id.length <= 10 ? id : `${id.slice(0, 8)}…`;
}

export default function DocumentsPage() {
  const r = useRouter();

  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Search & view options
  const [q, setQ] = useState("");
  const [onlyLatestByTitle, setOnlyLatestByTitle] = useState(false);

  // Upload
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("GENERAL");
  const [file, setFile] = useState<File | null>(null);

  // Replace
  const [replaceTargetId, setReplaceTargetId] = useState("");
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    if (!getToken()) return r.replace("/login");
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });

    if (!onlyLatestByTitle) return sorted;

    // group by title -> pick latest by (version desc, createdAt desc)
    const map = new Map<string, DocumentItem>();
    for (const d of sorted) {
      const key = (d.title || "").trim() || d.id;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, d);
        continue;
      }
      const dv = d.version ?? 1;
      const pv = prev.version ?? 1;
      if (dv > pv) {
        map.set(key, d);
        continue;
      }
      if (dv === pv) {
        const dt = new Date(d.createdAt || 0).getTime();
        const pt = new Date(prev.createdAt || 0).getTime();
        if (dt > pt) map.set(key, d);
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [items, onlyLatestByTitle]);

  const replaceTargets = useMemo(() => {
    // biasanya target replace itu yang ACTIVE
    return viewItems.filter((d) => (d.status || "ACTIVE") === "ACTIVE");
  }, [viewItems]);

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const res = await listDocuments({ q: q.trim() || undefined });
      setItems(res.items ?? []);
    } catch (e: any) {
      if (e?.status === 401) return r.replace("/login");
      setErr(
        e?.body?.message ||
          (typeof e?.body === "string" ? e.body : "") ||
          e?.message ||
          "Gagal load documents"
      );
    } finally {
      setLoading(false);
    }
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return alert("Pilih file dulu");
    if (!title.trim()) return alert("Title wajib");

    setErr("");
    try {
      await uploadDocument({ title: title.trim(), file, documentType: docType });
      alert("Upload OK");
      setTitle("");
      setFile(null);
      await refresh();
    } catch (e: any) {
      setErr(
        e?.body?.message ||
          (typeof e?.body === "string" ? e.body : "") ||
          e?.message ||
          "Upload gagal"
      );
    }
  }

  async function onRequestDelete(docId: string) {
    if (!confirm("Request Delete? (butuh admin approve)")) return;

    setErr("");
    try {
      await requestDelete(docId);
      alert("Request delete terkirim. Tunggu admin approve.");
      await refresh();
    } catch (e: any) {
      setErr(
        e?.body?.message ||
          (typeof e?.body === "string" ? e.body : "") ||
          e?.message ||
          "Request delete gagal"
      );
    }
  }

  async function onRequestReplace() {
    if (!replaceTargetId) return alert("Pilih dokumen target replace dulu");
    if (!replaceFile) return alert("Pilih file pengganti dulu");

    setErr("");
    try {
      await requestReplace(replaceTargetId, replaceFile);
      alert("Request replace terkirim. Tunggu admin approve.");
      setReplaceTargetId("");
      setReplaceFile(null);
      await refresh();
    } catch (e: any) {
      setErr(
        e?.body?.message ||
          (typeof e?.body === "string" ? e.body : "") ||
          e?.message ||
          "Request replace gagal"
      );
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(""), 1200);
    } catch {
      alert("Gagal copy. Coba HTTPS atau permission clipboard.");
    }
  }

  const Badge = ({ children }: { children: React.ReactNode }) => (
    <span
      className="badge"
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,.12)",
        fontSize: 12,
        opacity: 0.95,
      }}
    >
      {children}
    </span>
  );

  return (
    <AppShell title="Documents">
      <div style={{ display: "grid", gap: 14, maxWidth: 980 }}>
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <b>Upload Dokumen</b>
              <div className="small">Wajib: Title + DocumentType + File</div>
            </div>
            <button type="button" onClick={refresh}>
              Refresh
            </button>
          </div>

          <form
            onSubmit={onUpload}
            style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 520 }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
            />

            <select value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="GENERAL">GENERAL</option>
              <option value="CONFIDENTIAL">CONFIDENTIAL</option>
              <option value="PUBLIC">PUBLIC</option>
            </select>

            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button type="submit">Upload</button>
          </form>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <b>Request Replace</b>
              <div className="small">Pilih target + file pengganti (butuh admin approve)</div>
            </div>

            <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={onlyLatestByTitle}
                onChange={(e) => setOnlyLatestByTitle(e.target.checked)}
              />
              Tampilkan latest per title
            </label>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 520 }}>
            <select value={replaceTargetId} onChange={(e) => setReplaceTargetId(e.target.value)}>
              <option value="">-- pilih dokumen --</option>
              {replaceTargets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} v{d.version ?? 1} • {shortId(d.id)} • {d.documentType || "-"}
                </option>
              ))}
            </select>

            <input type="file" onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={onRequestReplace}>
              Request Replace
            </button>
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <b>Search</b>
              <div className="small">Cari by q (backend: /documents?q=...)</div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 520 }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ketik kata kunci, contoh: replace_demo"
            />
            <button type="button" onClick={refresh}>
              Cari / Refresh
            </button>
          </div>
        </div>

        {err && (
          <pre className="card" style={{ whiteSpace: "pre-wrap" }}>
            {err}
          </pre>
        )}

        <div className="card">
          <b>Daftar Dokumen</b>

          {loading ? (
            <div style={{ marginTop: 12 }}>Loading...</div>
          ) : viewItems.length === 0 ? (
            <div style={{ marginTop: 12 }} className="small">
              Belum ada dokumen.
            </div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {viewItems.map((d) => {
                const fileHref = buildFileHref(d.fileUrl);

                return (
                  <div key={d.id} className="card" style={{ padding: 14 }}>
                    <div className="row" style={{ justifyContent: "space-between", gap: 10 }}>
                      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                        <b>{d.title}</b>
                        <Badge>v{d.version ?? 1}</Badge>
                        <Badge>{d.documentType || "GENERAL"}</Badge>
                      </div>
                      <Badge>{d.status || "-"}</Badge>
                    </div>

                    <div className="small" style={{ marginTop: 6, opacity: 0.95 }}>
                      ID: <b>{d.id}</b>{" "}
                      {copied === d.id && <span style={{ color: "var(--ok)" }}>Copied!</span>}
                      {"  "}•{"  "}
                      CreatedAt: {fmtDate(d.createdAt)}
                    </div>

                    <div className="small" style={{ marginTop: 6, opacity: 0.9 }}>
                      FileUrl: {d.fileUrl || "-"}
                    </div>

                    <div className="row" style={{ marginTop: 10, gap: 10, flexWrap: "wrap" }}>
                      <a href={fileHref} target="_blank" rel="noreferrer">
                        Open file
                      </a>

                      <button type="button" onClick={() => copy(d.id)}>
                        Copy ID
                      </button>

                      <button type="button" onClick={() => onRequestDelete(d.id)}>
                        Request Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
