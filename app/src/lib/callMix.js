// The shared screen's own sound is folded into the line your voice already uses.
// A film, a song or a game arrives with its picture, and nothing about the call
// has to be negotiated again.
export function mixShareSound(ctx, voice, soundTrack, sender) {
  if (!ctx || !voice || !soundTrack || !sender) return null;
  try {
    const dest = ctx.createMediaStreamDestination();
    const voiceSource = ctx.createMediaStreamSource(voice);
    const soundSource = ctx.createMediaStreamSource(new MediaStream([soundTrack]));
    voiceSource.connect(dest);
    soundSource.connect(dest);
    const [mixTrack] = dest.stream.getAudioTracks();
    if (!mixTrack) return null;
    return { dest, voiceSource, soundSource, mixTrack, sender };
  } catch (error) {
    return null;
  }
}

// The screen is put away: the line goes back to carrying your voice alone.
export async function unmixShareSound(mix, voiceTrack) {
  if (!mix) return;
  try {
    await mix.sender.replaceTrack(voiceTrack || null);
  } catch (error) {
    // the line is going away anyway
  }
  releaseMix(mix);
}

export function releaseMix(mix) {
  if (!mix) return;
  try {
    mix.voiceSource.disconnect();
    mix.soundSource.disconnect();
    mix.dest.stream.getTracks().forEach((track) => track.stop());
  } catch (error) {
    // the audio graph is going away anyway
  }
}