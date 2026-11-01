const configuredApi = import.meta.env.VITE_SYNCSPACE_API_URL?.trim();
const apiOrigin = configuredApi
  ? configuredApi.replace(/\/+$/, "")
  : "";
export const syncspaceApiBase = apiOrigin
  ? `${apiOrigin}/api`
  : "/api";
export const syncspaceWsBase =
  import.meta.env.VITE_SYNCSPACE_WS_URL?.trim() ||
  `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/rt`;
