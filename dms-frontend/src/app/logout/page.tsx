"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const r = useRouter();

  useEffect(() => {
    // hapus token login
    localStorage.removeItem("dms_token");

    // optional: kalau kamu simpan data lain, hapus juga di sini
    // localStorage.removeItem("dms_user");

    // balik ke login (replace biar tombol back ga balik ke page sebelumnya)
    r.replace("/login");
  }, [r]);

  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      Logging out...
    </main>
  );
}
