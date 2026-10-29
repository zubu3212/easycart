// In production set VITE_API_URL to your backend, e.g. https://easycart-api.vercel.app/api
// (Vite bakes this in at BUILD time, so redeploy the frontend after changing it.)
const BASE = import.meta.env.VITE_API_URL || "/api";

// Small fetch wrapper. Token is read from localStorage on every call.
export async function api(path, { method = "GET", body, signal } = {}) {
  let token = null;
  try { token = JSON.parse(localStorage.getItem("ec_user"))?.token; } catch {}

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e.name === "AbortError") throw e; // caller cancelled on purpose
    throw new Error("Cannot reach the server. Check your internet connection and that the API address is correct.");
  }

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  // Logged-in user with a dead/expired token -> log out everywhere (AuthContext listens for this)
  if (res.status === 401 && token && !path.startsWith("/auth/login")) window.dispatchEvent(new Event("ec:logout"));

  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  if (data === null) throw new Error("The server sent an unexpected reply. Check that VITE_API_URL points to your backend API.");
  return data;
}

export const money = (n) => "৳" + Number(n || 0).toLocaleString("en-US");

// Shown if a product picture fails to load
export const NO_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#e8ecf4"/><g fill="none" stroke="#9aa3b5" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"><rect x="170" y="200" width="260" height="200" rx="22"/><circle cx="240" cy="270" r="22"/><path d="M180 380 L270 310 L330 360 L380 320 L420 360"/></g></svg>`
  );
export const onImgError = (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = NO_IMAGE;
};
