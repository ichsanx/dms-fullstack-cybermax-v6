// src/lib/auth.ts
export function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("dms_token") || "";
}

export function setToken(token: string) {
  localStorage.setItem("dms_token", token);
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("dms_token");
  localStorage.removeItem("dms_role");
  localStorage.removeItem("dms_email");
}

export function getRole() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("dms_role") || "";
}

export function setRole(role: string) {
  localStorage.setItem("dms_role", role);
}

export function getEmail() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("dms_email") || "";
}

export function setEmail(email: string) {
  localStorage.setItem("dms_email", email);
}
