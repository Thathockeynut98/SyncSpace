// The handshake pieces the call hands to the room, and the one sound engine the
// whole call shares.
//
// Browsers disagree on whether an SDP or an ICE candidate survives being turned
// into plain data: Safari and Firefox hand back an empty object. Both are copied
// out by hand here, so the handshake always arrives whole on the other side.
export function plainSdp(description) {
  if (!description) return null;
  return { type: description.type, sdp: description.sdp };
}

export function plainCandidate(candidate) {
  if (!candidate) return null;
  const source = typeof candidate.toJSON === 'function' ? candidate.toJSON() : candidate;
  const line = typeof source.candidate === 'string' ? source.candidate : '';
  if (!line) return null;
  return {
    candidate: line,
    sdpMid: source.sdpMid ?? null,
    sdpMLineIndex: source.sdpMLineIndex ?? null,
    usernameFragment: source.usernameFragment ?? null,
  };
}

// One sound engine for the whole call. iPhones start it asleep and only the tap
// that starts the call wakes it, so a fresh engine for each stream would send
// silence and play silence forever.
let callAudio = null;
export function audioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!callAudio || callAudio.state === 'closed') {
    callAudio = new AudioCtx({ sampleRate: 48000, latencyHint: 'interactive' });
  }
  if (callAudio.state === 'suspended') callAudio.resume().catch(() => {});
  return callAudio;
}