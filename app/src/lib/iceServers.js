// Public STUN only. Add a securely configured TURN server before remote calling.
export const ICE = [
 { urls: 'stun:stun.l.google.com:19302' },
 { urls: 'stun:stun.cloudflare.com:3478' },
];
