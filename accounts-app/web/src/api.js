import { API_BASE } from "./base.js";
// Thin fetch wrapper for the PHP API. Same origin, cookie session.
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      "X-Requested-With": "fetch",
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
    body: !body ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    // signed out by the server (8-hour limit reached): tell the app, except for the sign-in check itself
    if (res.status === 401 && path !== "login" && path !== "me") window.dispatchEvent(new Event("session-expired"));
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}
