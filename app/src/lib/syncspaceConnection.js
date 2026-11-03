const configuredApi = import.meta.env.VITE_SYNCSPACE_API_URL?.trim();
const configuredWs = import.meta.env.VITE_SYNCSPACE_WS_URL?.trim();
const apiOrigin = configuredApi ? configuredApi.replace(/\/+$/, "") : "";

export const syncspaceApiBase = apiOrigin || "/api";

// When an HTTPS API endpoint is configured, use the same host for secure
// real-time signaling unless a separate WebSocket endpoint is specified.
function websocketEndpoint() {
  if (configuredWs) return configuredWs;
  if (apiOrigin) {
    try {
      const url = new URL(apiOrigin, location.origin);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      url.pathname = url.pathname.replace(/\/+$/, "") + "/rt";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      // Fall back to the same-origin endpoint below.
    }
  }
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/rt`;
}

export const syncspaceWsBase = websocketEndpoint();
