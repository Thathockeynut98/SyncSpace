import { syncspaceApiBase } from "./syncspaceConnection";
import {clearSpaceKeys} from './spaceCrypto';
﻿const API = syncspaceApiBase;
const TOKEN_KEY = "syncspace21_session";
function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
function clearToken() {
  clearSpaceKeys();
  sessionStorage.removeItem(TOKEN_KEY);
}
async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? {
        "Content-Type": "application/json"
      } : {}),
      ...(token ? {
        Authorization: `Bearer ${token}`
      } : {}),
      ...options.headers
    }
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : {};
  if (!response.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : data.error?.message ||
          data.message ||
          `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
}
export const syncAuth = {
  async login(email, password) {
    const result = await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (!result.token) {
      throw new Error("Login response did not include a session token");
    }
    sessionStorage.setItem(TOKEN_KEY, result.token);
    return result;
  },
  me() {
    return request("/auth/me");
  },
  async logout() {
    try {
      if (getToken()) {
        await request("/auth/logout", {
          method: "POST"
        });
      }
    } finally {
      clearToken();
    }
  },
  getToken,
  clearToken
};
