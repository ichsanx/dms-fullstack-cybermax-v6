"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import {
  API_BASE_URL,
  listDocuments,
  uploadDocument,
  requestDelete,
  requestReplace,
  type DocumentItem,
} from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function DocumentsPage() {
  const r = useRouter();

  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("GENERAL");
  const [file, setFile] = useState<File | null>(null);

  const [replaceTargetId, setReplaceTargetId] = useState("");
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    if (!getToken()) return r.replace("/login");
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const res = await listDocuments();
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

      // biar enak test, langsung refresh list
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

  return (
    <AppShell title="Documents">
      <div style={{ display: "grid", gap: 14, maxWidth: 980 }}>
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <b>Upload Dokumen</b>
              <div className="small">Wajib: Title + DocumentType + File</div>
            </div>
            <button type="button" onClick={refresh}>Refresh</button>
          </div>

          <form onSubmit={onUpload} style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 520 }}>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />

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
          <b>Request Replace</b>
          <div className="small">Pilih target + file pengganti (butuh admin approve)</div>

          <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 520 }}>
            <select value={replaceTargetId} onChange={(e) => setReplaceTargetId(e.target.value)}>
              <option value="">-- pilih dokumen --</option>
              {items.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.status || "-"})
                </option>
              ))}
            </select>

            <input type="file" onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={onRequestReplace}>Request Replace</button>
          </div>
        </div>

        {err && <pre className="card" style={{ whiteSpace: "pre-wrap" }}>{err}</pre>}

        <div className="card">
          <b>Daftar Dokumen</b>

          {loading ? (
            <div style={{ marginTop: 12 }}>Loading...</div>
          ) : items.length === 0 ? (
            <div style={{ marginTop: 12 }} className="small">Belum ada dokumen.</div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {items.map((d) => {
                const fileHref = d.fileUrl?.startsWith("http")
                  ? d.fileUrl
                  : `${API_BASE_URL}${d.fileUrl}`;

                return (
                  <div key={d.id} className="card" style={{ padding: 14 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <b>{d.title}</b>
                      <span className="badge">{d.status || "-"}</span>
                    </div>

                    {/* ✅ ID tampil */}
                    <div className="small" style={{ marginTop: 6 }}>
                      ID: <b>{d.id}</b>{" "}
                      {copied === d.id && <span style={{ color: "var(--ok)" }}>Copied!</span>}
                    </div>

                    <div className="row" style={{ marginTop: 10 }}>
                      <a href={fileHref} target="_blank" rel="noreferrer">
                        Open file
                      </a>

                      {/* ✅ Copy ID button */}
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
