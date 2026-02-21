"use client";

import React, { useEffect, useMemo, useState } from "react";
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

function shortId(id: string) {
  if (!id) return "";
  if (id.length <= 12) return id;
  return `${id.slice(0, 5)}...${id.slice(-4)}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function sanitizeFilename(name: string) {
  return (name || "document")
    .trim()
    .replace(/[\/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

export default function DocumentsPage() {
  const r = useRouter();

  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Upload
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("GENERAL");
  const [file, setFile] = useState<File | null>(null);

  // Replace
  const [replaceTargetId, setReplaceTargetId] = useState("");
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  // Search + Pagination
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState<number | undefined>(undefined);

  // UX
  const [copied, setCopied] = useState<string>("");
  const [onlyLatestByTitle, setOnlyLatestByTitle] = useState(true);

  useEffect(() => {
    if (!getToken()) return r.replace("/login");
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const shownItems = useMemo(() => {
    if (!onlyLatestByTitle) return items;

    // Ambil dokumen terbaru per title (berdasarkan version terbesar)
    const map = new Map<string, DocumentItem>();
    for (const d of items) {
      const key = d.title || d.id;
      const cur = map.get(key);
      const v = d.version ?? 0;
      const curV = cur?.version ?? 0;
      if (!cur || v > curV) map.set(key, d);
    }
    return Array.from(map.values());
  }, [items, onlyLatestByTitle]);

  async function refresh() {
    setErr("");
    setLoading(true);
    try {
      const res = await listDocuments({ q: q.trim() || undefined, page, limit });
      setItems(res.items ?? []);
      setTotal(res.total);
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

  async function onRequestDelete(d: DocumentItem) {
    if ((d.status || "").includes("PENDING"))
      return alert("Dokumen ini sedang pending. Tunggu approval selesai.");

    if (
      !confirm(
        `Request Delete?\n\n${d.title} (v${d.version ?? 1})\nID: ${d.id}`
      )
    )
      return;

    setErr("");
    try {
      await requestDelete(d.id);
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

  function onSearch() {
    setPage(1);
    refresh();
  }

  async function downloadDocument(d: DocumentItem) {
    setErr("");
    try {
      const token = getToken();
      if (!token) return r.replace("/login");

      // ✅ pakai API_BASE_URL yang sudah sesuai dengan env project kamu
      const url = `${API_BASE_URL}/documents/${d.id}/download`;

      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) return r.replace("/login");

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Download failed (${res.status})`);
      }

      const blob = await res.blob();

      // optional: coba tentukan ekstensi dari mime type (kalau backend tidak mengirim filename)
      const extFromType =
        blob.type === "application/pdf"
          ? ".pdf"
          : blob.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          ? ".docx"
          : "";

      const filename = `${sanitizeFilename(d.title)}_v${d.version ?? 1}${
        extFromType || ""
      }`;

      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      setErr(e?.message || "Gagal download");
    }
  }

  return (
    <AppShell title="Documents">
      <div style={{ display: "grid", gap: 14, maxWidth: 980 }}>
        {/* Upload */}
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

            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button type="submit">Upload</button>
          </form>
        </div>

        {/* Replace */}
        <div className="card">
          <b>Request Replace</b>
          <div className="small">
            Pilih target + file pengganti (butuh admin approve)
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 700 }}>
            <select
              value={replaceTargetId}
              onChange={(e) => setReplaceTargetId(e.target.value)}
            >
              <option value="">-- pilih dokumen --</option>
              {shownItems.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} | v{d.version ?? 1} | {d.documentType ?? "-"} |{" "}
                  {d.status ?? "-"} | {shortId(d.id)}
                </option>
              ))}
            </select>

            <input
              type="file"
              onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)}
            />
            <button type="button" onClick={onRequestReplace}>
              Request Replace
            </button>
          </div>
        </div>

        {/* Error */}
        {err && (
          <pre className="card" style={{ whiteSpace: "pre-wrap" }}>
            {err}
          </pre>
        )}

        {/* List */}
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <b>Daftar Dokumen</b>
              <div className="small">
                Page: {page} • Total: {total ?? "-"}{" "}
                <label style={{ marginLeft: 10 }}>
                  <input
                    type="checkbox"
                    checked={onlyLatestByTitle}
                    onChange={(e) => setOnlyLatestByTitle(e.target.checked)}
                    style={{ marginRight: 6 }}
                  />
                  Tampilkan latest per title
                </label>
              </div>
            </div>

            <div className="row" style={{ gap: 8 }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title..."
              />
              <button type="button" onClick={onSearch}>
                Search
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={!!total && page * limit >= total}
              >
                Next
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ marginTop: 12 }}>Loading...</div>
          ) : shownItems.length === 0 ? (
            <div style={{ marginTop: 12 }} className="small">
              Belum ada dokumen.
            </div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {shownItems.map((d) => {
                const disabledPending = (d.status || "").includes("PENDING");

                return (
                  <div key={d.id} className="card" style={{ padding: 14 }}>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                        <b>{d.title}</b>
                        <span className="badge">{`v${d.version ?? 1}`}</span>
                        <span className="badge">{d.documentType ?? "-"}</span>
                      </div>
                      <span className="badge">{d.status || "-"}</span>
                    </div>

                    <div className="small" style={{ marginTop: 6 }}>
                      ID: <b>{d.id}</b>{" "}
                      {copied === d.id && (
                        <span style={{ color: "var(--ok)" }}>Copied!</span>
                      )}
                      {" • "}
                      {fmtDate(d.createdAt)}
                    </div>

                    <div className="small" style={{ marginTop: 6, opacity: 0.9 }}>
                      FileUrl (server): {d.fileUrl || "-"}
                    </div>

                    <div className="row" style={{ marginTop: 10 }}>
                      <button type="button" onClick={() => downloadDocument(d)}>
                        Download (Secure)
                      </button>

                      <button type="button" onClick={() => copy(d.id)}>
                        Copy ID
                      </button>

                      <button
                        type="button"
                        onClick={() => onRequestDelete(d)}
                        disabled={disabledPending}
                        title={
                          disabledPending
                            ? "Status pending — tunggu approval selesai"
                            : ""
                        }
                      >
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