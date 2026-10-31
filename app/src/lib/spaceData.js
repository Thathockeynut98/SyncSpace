import { base44, setActiveSpace } from '@/api/base44Client';
import { syncAuth } from '@/lib/syncAuth';
const API = '/api';
async function spaceRequest(path, options = {}) {
  const token = syncAuth.getToken();
  if (!token) {
    throw new Error('Please sign in before opening a space.');
  }
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Cannot reach the SyncSpace server. Check that the API is running.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data.error === 'string'
      ? data.error
      : data.error?.message || data.message ||
        `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}
export function displayName(user) {
  if (!user) return 'Someone';
  if (user.display_name) return user.display_name;
  if (user.full_name) return user.full_name.split(' ')[0];
  return (user.email || 'someone').split('@')[0];
}
export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  const pad = (value) => String(value).padStart(2, '0');
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(rest)}`
    : `${minutes}:${pad(rest)}`;
}
export function makeInviteCode() {
  // Invite codes are now generated securely by the server.
  // Retained for compatibility with existing imports.
  return '';
}
export async function findMySpace(email) {
  if (!email) return null;
  const result = await spaceRequest('/spaces');
  // The server authenticates the account and filters spaces by membership.
  // No second membership check is needed in the frontend.
  if (!Array.isArray(result.spaces)) return null;
  const originalRoom = result.spaces.find(
    (space) => space.id === '6adfebfcdb85ad6a8cbb4823'
  );
  const selected=originalRoom || result.spaces[0] || null;
  setActiveSpace(selected?.id||null);
  return selected;
}
export async function createSpace({ name, user: _user }) {
  const result = await spaceRequest('/spaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  setActiveSpace(result.space.id);
  return result.space;
}
export async function joinSpace({ code, user: _user }) {
  const result = await spaceRequest('/spaces/join', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  setActiveSpace(result.space.id);
  return result.space;
}
export async function renameSelf({ space, user, name }) {
  const clean = (name || '').trim().slice(0, 30);
  if (!clean) {
    throw new Error('Give yourself a name first.');
  }
  // Display-name persistence will be integrated in the next update.
  return {
    me: { ...user, display_name: clean },
    space,
  };
}
export async function signFile(file_uri) {
  if (!file_uri) return null;
  const { signed_url } =
    await base44.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 3600,
    });
  return signed_url;
}
export function readVideoDuration(file) {
  return new Promise((resolve) => {
    const element = document.createElement('video');
    const url = URL.createObjectURL(file);
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      const duration = element.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : 0);
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    element.src = url;
  });
}
