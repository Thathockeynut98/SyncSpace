import { useCallback, useEffect, useRef, useState } from 'react';
import { QUALITY_MODES, createQualityTuner } from './callQuality';
import { ICE } from './iceServers';
import { loadScreenMode, saveScreenMode, silenceLoopUrl, subscribeScreenMode } from './callScreen';
import { mixShareSound, releaseMix, unmixShareSound } from './callMix';
import { audioContext, plainCandidate, plainSdp } from './callLink';
import { DEFAULT_VOICE, VOICE_KEY, loadVoice } from './voiceSettings';
import {
  VOICE_PRESETS,
  applyMicSettings,
  buildVoiceChain,
  driveMic,
  shapeCompressor,
  shapeVoice,
} from './voiceChain';

// Voice and screen sharing, straight between your two devices. The room only
// carries the handshake, never the sound. One side always asks (the lower seat)
// and the other always answers, so the two of you can never talk over each other,
// and the call can be started, answered or resumed from any tab.
// How often a line that will not come up is chased from this side — said again,
// then given fresh routes, then rebuilt from nothing — and how long before it is
// said plainly, without ever stopping.
const LINE_KEEPALIVE_MS = 4000;
const LINE_LATE_MS = 30000;
// A live line that breaks up gets this long to come back on its own before it is
// rebuilt. Fresh routes are asked for the moment it wobbles, and a phone changing
// networks often takes a few seconds to settle — rebuilding sooner than this tore
// down lines that were about to heal themselves.
const LINE_HEAL_MS = 12000;
// A line warmed on the call tab is only held this long before its routes are
// allowed to go stale and a fresh one is made for the press.
const WARM_LINE_MS = 240000;

const VOICE_BITRATE = 128000;
const QUALITY_KEY = 'syncspace:quality';
// A shared screen is watched, not glanced at: the full 2560×1440 at a true 60 fps.
const SCREEN_WIDTH = 2560;
const SCREEN_HEIGHT = 1440;
const SCREEN_FPS = 60;

// A camera is watched as a face, so it gets a true 1080p at a smooth 30 fps.
const CAMERA_WIDTH = 1920;
const CAMERA_HEIGHT = 1080;
const CAMERA_FPS = 30;
// How often the line is read to see what it can actually carry.
const BANDWIDTH_POLL_MS = 4000;

export function useCall(room) {
  const { seat, peers, on, send, connected } = room;
  const partner = peers.find((item) => item.seat !== seat) || null;
  const partnerSeat = partner ? partner.seat : null;

  const [phase, setPhase] = useState('idle'); // idle | ringing | waiting | connecting | live
  const [incoming, setIncoming] = useState(false);
  // Bumped every time the line is rebuilt, so the attempt timers start again.
  const [attempt, setAttempt] = useState(0);
  const [muted, setMuted] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [cam, setCam] = useState(false);
  // Which way the camera looks: 'user' is the front one showing your face,
  // 'environment' the back one showing what is in front of you.
  const [facing, setFacing] = useState('user');
  const [hasVideo, setHasVideo] = useState(false);
  const [remote, setRemote] = useState(null);
  const [local, setLocal] = useState(null);
  const [self, setSelf] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // A word about the sound coming with a shared screen, when it is not coming.
  const [shareHint, setShareHint] = useState('');
  // How the line is actually holding up: steady, straining, or gone.
  const [line, setLine] = useState(null);
  // Whether the picture is left to adapt on its own or held by hand.
  const [quality, setQuality] = useState(() => {
    try {
      const saved = localStorage.getItem(QUALITY_KEY);
      return saved in QUALITY_MODES ? saved : 'auto';
    } catch (error) {
      return 'auto';
    }
  });
  const [voice, setVoice] = useState(loadVoice);
  const [level, setLevel] = useState(0);
  const [deafened, setDeafened] = useState(false);
  // Whether the screen is held lit through the call, or may go dark on its own.
  const [screenMode, setScreenMode] = useState(loadScreenMode);

  useEffect(
    () => subscribeScreenMode(() => setScreenMode(loadScreenMode())),
    []
  );

  const changeScreenMode = useCallback((mode) => {
    setScreenMode(saveScreenMode(mode));
  }, []);

  const seatRef = useRef(seat);
  const partnerRef = useRef(partnerSeat);
  const phaseRef = useRef(phase);
  const wantedRef = useRef(false);
  const pcRef = useRef(null);
  const localRef = useRef(null);
  const screenRef = useRef(null);
  const camRef = useRef(null);
  const facingRef = useRef('user');
  const remoteRef = useRef(null);
  const pendingRef = useRef(null);
  // Whether their side of the handshake ever arrived, so a failed call can say
  // whether they were never reached or the two networks refused to meet.
  const answeredRef = useRef(false);
  // How many times this one call has been rebuilt on its own before we admit it
  // will not come up. One silent second try rescues most mobile failures.
  const triesRef = useRef(0);
  const queuedRef = useRef([]);
  const makingOfferRef = useRef(false);
  const micRef = useRef(null);
  const outgoingRef = useRef(null);
  const deafenedRef = useRef(false);
  const remoteAudioRef = useRef(null);
  // The shared screen's sound, folded into the one line your voice already uses.
  const shareAudioRef = useRef(null);
  const voiceRef = useRef(voice);
  const lastVoiceRef = useRef(0);
  const reviveRef = useRef(null);
  // Rebuilds the call around a fresh microphone when the device takes the old
  // one away mid-call.
  const micReviveRef = useRef(null);
  // When the line on the call tab was warmed, so stale routes are never kept.
  const warmedAtRef = useRef(0);
  // Whether the call tab is still open, so a microphone the browser hands over
  // late is never left running behind a tab that has been left.
  const warmRef = useRef(false);
  const healRef = useRef(0);
  // The setting is read from the same place the tuner is built, so a call that
  // starts does so on the mode the two of you last chose.
  const qualityRef = useRef(quality);
  const tunerRef = useRef(null);
  if (!tunerRef.current) {
    tunerRef.current = createQualityTuner();
    tunerRef.current.setSetting(qualityRef.current);
  }
  voiceRef.current = voice;

  seatRef.current = seat;
  partnerRef.current = partnerSeat;
  phaseRef.current = phase;

  // The higher seat answers, the lower seat asks.
  const polite = useCallback(() => {
    const me = seatRef.current;
    const them = partnerRef.current;
    if (me == null || them == null) return true;
    return me > them;
  }, []);

  const sendSignal = useCallback(
    (data) => {
      const to = partnerRef.current;
      if (to == null) return false;
      try {
        send({ type: 'signal', to, data });
        return true;
      } catch (error) {
        // A socket caught mid-reconnect must never take the handshake down with it.
        return false;
      }
    },
    [send]
  );

  const refreshVideo = useCallback(() => {
    const stream = remoteRef.current;
    const live = stream
      ? stream.getVideoTracks().some((track) => !track.muted && track.readyState === 'live')
      : false;
    setHasVideo(live);
  }, []);

  const setMicEnabled = useCallback((enabled) => {
    const stream = localRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
    setMuted(!enabled);
  }, []);  // The browser's own suppression runs on the raw mic track, and it can be
  // switched without restarting the call: the graph above keeps listening.
  const applySuppression = useCallback((on) => {
    localRef.current?.getAudioTracks().forEach((track) => {
      track.applyConstraints({ noiseSuppression: on }).catch(() => {});
    });
  }, []);

  // Your voice runs through a loudness gain and a gate, so you decide how loud you
  // arrive and how quiet the room has to be before anything is sent.
  const buildMic = useCallback((raw) => {
    micRef.current = null;
    const ctx = audioContext();
    if (!ctx) return raw;
    try {
      const mic = buildVoiceChain(ctx, raw, voiceRef.current);
      micRef.current = mic;
      return mic.dest.stream;
    } catch (error) {
      micRef.current = null;
      return raw;
    }
  }, []);

  // Their voice comes through its own gain, so you can turn them down to a whisper
  // or lift them above the room, without touching their microphone.
  const releaseRemoteAudio = useCallback(() => {
    const node = remoteAudioRef.current;
    remoteAudioRef.current = null;
    if (!node) return;
    try {
      // The engine stays awake between calls: it is shared with the microphone,
      // and closing it would take the mic chain down with it.
      node.source.disconnect();
    } catch (error) {
      // the graph is going away anyway
    }
  }, []);

  const buildRemoteAudio = useCallback((stream) => {
    const ctx = audioContext();
    if (!ctx) return;
    try {
      const source = ctx.createMediaStreamSource(stream);
      const [body, clarity, soften] = shapeVoice(ctx, { warmth: 1.5, presence: 1.5, air: -1 });
      const comp = shapeCompressor(ctx, { threshold: -22, ratio: 1.6, release: 0.3 });
      const gain = ctx.createGain();

      // Their voice arrives sounding like a person, not a radio: natural body,
      // no sibilance, and the level control stays in your hands.
      gain.gain.value = deafenedRef.current ? 0 : voiceRef.current.their;
      source.connect(body);
      body.connect(clarity);
      clarity.connect(soften);
      soften.connect(comp);
      comp.connect(gain);
      gain.connect(ctx.destination);
      remoteAudioRef.current = { ctx, source, gain };
    } catch (error) {
      remoteAudioRef.current = null;
    }
  }, []);

  const dropPeer = useCallback(() => {
    window.clearTimeout(healRef.current);
    healRef.current = 0;
    if (tunerRef.current) tunerRef.current.reset();
    setLine(null);
    const pc = pcRef.current;
    pcRef.current = null;
    if (pc) {
      try {
        pc.close();
      } catch (err) {
        // the line is going away anyway
      }
    }
    pendingRef.current = null;
    queuedRef.current = [];
    makingOfferRef.current = false;
    answeredRef.current = false;
    remoteRef.current = null;
    setRemote(null);
    setHasVideo(false);
    setSharing(false);
    // A shared screen belongs to the line that just went away: its capture and its
    // sound are let go here so nothing keeps running behind a call that is gone.
    const mix = shareAudioRef.current;
    shareAudioRef.current = null;
    releaseMix(mix);
    if (screenRef.current) screenRef.current.getTracks().forEach((track) => track.stop());
    screenRef.current = null;
    releaseRemoteAudio();
  }, [releaseRemoteAudio]);

  const flushCandidates = useCallback(async (pc) => {
    const queued = queuedRef.current;
    queuedRef.current = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        // a candidate from a line that has already moved on
      }
    }
  }, []);

  // Opus at a call-friendly bitrate with silence suppression off, so quiet words
  // still travel: the clearest line two browsers can make of each other.
  const tuneLine = useCallback(async (pc) => {
    try {
      const caps = window.RTCRtpSender && window.RTCRtpSender.getCapabilities
        ? window.RTCRtpSender.getCapabilities('audio')
        : null;
      const opus = (caps?.codecs || []).filter((codec) => /opus/i.test(codec.mimeType));
      if (opus.length) {
        pc.getTransceivers().forEach((transceiver) => {
          if (transceiver.receiver?.track?.kind === 'audio' && transceiver.setCodecPreferences) {
            transceiver.setCodecPreferences(opus);
          }
        });
      }
    } catch (error) {
      // the browser keeps its own codec choice
    }
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind !== 'audio') continue;
      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
        params.encodings[0].maxBitrate = VOICE_BITRATE;
        params.encodings[0].dtx = false;
        params.encodings[0].networkPriority = 'high';
        await sender.setParameters(params);
      } catch (error) {
        // some browsers will not be tuned
      }
    }
  }, []);

  // What is sent down the line is given the rung of the ladder the line is on: a
  // healthy one holds full resolution and framerate, a thin one is thinner and
  // lighter, and told it may trade resolution for smoothness rather than stall.
  const tuneVideo = useCallback(async (pc, mode = 'screen') => {
    const slot = videoTransceiver(pc);
    if (!slot?.sender?.track) return;
    const screen = mode !== 'camera';
    const tier = tunerRef.current.tier;
    const preference = screen && tier.scale < 2 ? 'maintain-resolution' : 'balanced';
    try {
      slot.degradationPreference = preference;
    } catch (error) {
      // older browsers keep their own preference
    }
    try {
      const params = slot.sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
      params.encodings[0].maxBitrate = screen ? tier.screen : tier.camera;
      params.encodings[0].maxFramerate = tier.fps;
      params.encodings[0].scaleResolutionDownBy = tier.scale;
      params.encodings[0].networkPriority = 'high';
      params.degradationPreference = preference;
      await slot.sender.setParameters(params);
    } catch (error) {
      // some browsers will not be tuned
    }
  }, []);

  // Chosen by hand: the picture moves to that rung at once, and stays there until
  // it is put back on its own.
  const changeQuality = useCallback((next) => {
    qualityRef.current = next;
    setQuality(next);
    try {
      localStorage.setItem(QUALITY_KEY, next);
    } catch (error) {
      // a private window just will not remember it
    }
    tunerRef.current.setSetting(next);
    const mode = screenRef.current ? 'screen' : 'camera';
    const pc = pcRef.current;
    if (pc && pc.connectionState === 'connected') tuneVideo(pc, mode);
  }, [tuneVideo]);

  const makeOffer = useCallback(
    async (pc, force) => {
      // `force` lets the answering side ask too, when the ask that was meant to
      // reach it never did. Whoever is outranked still yields on a crossing offer.
      if (!pc || (!force && polite()) || partnerRef.current == null) return;
      if (makingOfferRef.current || pc.signalingState === 'have-local-offer') return;
      makingOfferRef.current = true;
      try {
        await tuneLine(pc);
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        // Straight out: every route is trickled the moment it is found, so waiting
        // for the last one would only add seconds of silence before the line opens.
        sendSignal({ kind: 'sdp', sdp: plainSdp(pc.localDescription) });
      } catch (err) {
        // the next negotiation carries it
      } finally {
        makingOfferRef.current = false;
      }
    },
    [polite, sendSignal, tuneLine]
  );

  // The video slot is negotiated once, up front, so sharing a screen later is a
  // swap and never a renegotiation.
  const videoTransceiver = (pc) =>
    Array.from(pc.getTransceivers()).find((item) => item.receiver?.track?.kind === 'video') || null;

  // A camera that is already on comes back with the line when it reconnects.
  const attachVideo = useCallback(async (pc) => {
    const stream = screenRef.current || camRef.current;
    const slot = pc ? videoTransceiver(pc) : null;
    if (!slot?.sender) return;
    try {
      await slot.sender.replaceTrack(stream ? stream.getVideoTracks()[0] || null : null);
      if (screenRef.current) await tuneVideo(pc, 'screen');
      else if (camRef.current) await tuneVideo(pc, 'camera');
    } catch (err) {
      // the next negotiation carries it
    }
  }, [tuneVideo]);

  const ensurePeer = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    // Everything on one transport, ready-made routes waiting: fewer ports to open,
    // which is what strict networks and weak phones stumble over.
    const pc = new RTCPeerConnection({
      iceServers: ICE,
      iceCandidatePoolSize: 4,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });
    const stream = new MediaStream();
    remoteRef.current = stream;
    setRemote(stream);

    pc.onicecandidate = (event) => {
      const candidate = plainCandidate(event.candidate);
      if (candidate) sendSignal({ kind: 'ice', candidate });
    };

    pc.ontrack = (event) => {
      // A deafened call stays silent even as new sound arrives.
      if (event.track.kind === 'audio') event.track.enabled = !deafenedRef.current;
      const incoming = remoteRef.current;
      if (incoming && !incoming.getTracks().includes(event.track)) incoming.addTrack(event.track);
      if (event.track.kind === 'audio' && incoming && !remoteAudioRef.current) {
        buildRemoteAudio(incoming);
      }
      event.track.onmute = refreshVideo;
      event.track.onunmute = refreshVideo;
      event.track.onended = refreshVideo;
      refreshVideo();
    };

    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      const state = pc.connectionState;
      if (state === 'connected') {
        window.clearTimeout(healRef.current);
        healRef.current = 0;
        setPhase('live');
        setError('');
        setNotice('');
        setLine('steady');
        tuneLine(pc);
      } else if (state === 'disconnected') {
        setNotice('The line is breaking up…');
        setLine('straining');
        // Fresh routes are asked for at once: on a weak line the old path is usually
        // what gave way, and replacing it costs far less than rebuilding the call.
        try {
          pc.restartIce();
          if (!polite()) makeOffer(pc);
        } catch (err) {
          // the rebuild below still stands
        }
        // It often comes back by itself; if it does not, a fresh line will.
        if (!healRef.current) {
          healRef.current = window.setTimeout(() => {
            healRef.current = 0;
            if (pcRef.current !== pc || !wantedRef.current) return;
            if (pc.connectionState === 'connected') return;
            reviveRef.current?.();
          }, LINE_HEAL_MS);
        }
      } else if (state === 'failed') {
        setNotice('The line dropped. Reconnecting…');
        setLine('lost');
        window.clearTimeout(healRef.current);
        healRef.current = 0;
        reviveRef.current?.();
      }
    };

    // The route fails a moment before the connection does: catching it here
    // replaces a dead path instead of waiting it out on "connecting".
    pc.oniceconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      if (pc.iceConnectionState === 'failed') reviveRef.current?.();
    };

    pc.onnegotiationneeded = () => {
      if (pcRef.current !== pc) return;
      makeOffer(pc);
    };

    pcRef.current = pc;
    return pc;
  }, [buildRemoteAudio, makeOffer, polite, refreshVideo, sendSignal, tuneLine]);

  // The microphone, asked for on its own so a blocked one reads as a blocked one
  // and never as a line that would not come up.
  const acquireMic = useCallback(async () => {
    if (localRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        },
      });
      localRef.current = stream;
      setLocal(stream);
      stream.getAudioTracks().forEach((track) => {
        // A device that takes the microphone back mid-call (a phone call, a
        // headset swap, a doze) ends this track: the call is rebuilt on a new one.
        track.onended = () => micReviveRef.current?.();
      });
      outgoingRef.current = buildMic(stream);
      setMicEnabled(!deafenedRef.current);
      applySuppression(voiceRef.current.suppressOn !== false);
      return true;
    } catch (error) {
      return false;
    }
  }, [applySuppression, buildMic]);

  // Called the moment the call tab is opened, before anyone presses call: the
  // routes to their device and the relay that carries them are found now, and the
  // microphone is taken up too when the browser has already been told yes, so the
  // line is open the instant either of you reaches for it.
  const prepare = useCallback(async () => {
    if (wantedRef.current) return;
    warmRef.current = true;
    // Older routes go stale: a warm line is only kept for a few minutes.
    if (pcRef.current && Date.now() - warmedAtRef.current > WARM_LINE_MS) dropPeer();
    if (!pcRef.current) {
      ensurePeer();
      warmedAtRef.current = Date.now();
    }
    if (localRef.current || !navigator.permissions?.query) return;
    try {
      const state = await navigator.permissions.query({ name: 'microphone' });
      // Asking is only ever done by the press itself.
      if (state.state === 'granted') await acquireMic();
      // The tab was left while the browser was answering: nothing is kept warm.
      if (!warmRef.current) releaseMic();
    } catch (error) {
      // the press asks for it instead
    }
  }, [acquireMic, dropPeer, ensurePeer]);

  const begin = useCallback(async (options) => {
    // Pressing call on this device is also saying "the call lives here now":
    // the other devices of yours let go of it, and the other person is told to
    // let the old line drop, so a move from a laptop to a phone is one tap.
    const takeOver = options?.takeOver === true;
    setError('');
    setNotice('');
    setIncoming(false);
    if (phaseRef.current === 'idle') triesRef.current = 0;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser will not let the call use a microphone. Try Chrome or Safari.');
      return;
    }

    wantedRef.current = true;
    answeredRef.current = false;

    if (takeOver) {
      try {
        send({ type: 'takeover' });
      } catch (error) {
        // a socket caught mid-reconnect still starts the call here
      }
      sendSignal({ kind: 'handoff' });
    }

    // The line is opened before the microphone: its routes are found while the
    // browser is still asking for the mic, so pressing call goes straight to live.
    ensurePeer();

    // The microphone and the line are asked for separately, so a blocked mic and a
    // line that will not come up never report as the same problem.
    if (!(await acquireMic())) {
      wantedRef.current = false;
      setPhase('idle');
      setError('Your microphone is blocked. Allow it in the browser and try again.');
      return;
    }
    if (!wantedRef.current) return;

    try {
      const pc = ensurePeer();
      const stream = outgoingRef.current || localRef.current;

      if (pendingRef.current) {
        // they called first — answer what they already sent
        const offer = pendingRef.current;
        pendingRef.current = null;
        setPhase('connecting');
        await pc.setRemoteDescription(offer);
        answeredRef.current = true;
        const slot = videoTransceiver(pc);
        if (slot) slot.direction = 'sendrecv';
        await attachVideo(pc);
        if (stream) {
          stream.getAudioTracks().forEach((track) => {
            if (!pc.getSenders().some((sender) => sender.track === track)) pc.addTrack(track, stream);
          });
        }
        await flushCandidates(pc);
        await tuneLine(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        // Answered at once; the routes follow on their own as they are found.
        sendSignal({ kind: 'sdp', sdp: plainSdp(pc.localDescription) });
        return;
      }

      if (stream) {
        stream.getAudioTracks().forEach((track) => {
          if (!pc.getSenders().some((sender) => sender.track === track)) pc.addTrack(track, stream);
        });
      }
      if (!pc.remoteDescription && !videoTransceiver(pc)) {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      }
      await attachVideo(pc);

      if (partnerRef.current == null) {
        setPhase('waiting');
        setNotice('They are not here yet. The call starts the moment they arrive.');
        return;
      }

      setPhase('connecting');
      if (polite()) sendSignal({ kind: 'join' });
      else await makeOffer(pc);
    } catch (err) {
      wantedRef.current = false;
      setPhase('idle');
      setError('The call could not start. Try again in a moment.');
    }
  }, [acquireMic, ensurePeer, flushCandidates, makeOffer, send, sendSignal, attachVideo]);

  // A phone call, a headset swap or a device dozing ends the microphone track the
  // browser handed over, and the call goes silent while the line still looks up.
  // A fresh microphone is asked for and the line is built again around it.
  micReviveRef.current = () => {
    if (!wantedRef.current || phaseRef.current === 'idle') return;
    // A fresh microphone means a fresh line on this end, so theirs is built again
    // as well rather than left answering a handshake that no longer exists.
    sendSignal({ kind: 'rebuild' });
    const mic = micRef.current;
    micRef.current = null;
    outgoingRef.current = null;
    if (mic) {
      try {
        mic.dest.stream.getTracks().forEach((track) => track.stop());
        mic.source.disconnect();
        mic.ctx.close();
      } catch (error) {
        // the graph is going away anyway
      }
    }
    if (localRef.current) {
      localRef.current.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
    }
    localRef.current = null;
    setLocal(null);
    dropPeer();
    begin();
  };

  // A line that will not come up is rebuilt from nothing on this side, and the
  // other side is told to do the same, so one working app is enough to fix it.
  reviveRef.current = () => {
    if (!wantedRef.current) return;
    // The line here is being built from nothing, so theirs has to be built again
    // too: an answer made for the old line would leave both sides waiting.
    sendSignal({ kind: 'rebuild' });
    dropPeer();
    setAttempt((count) => count + 1);
    begin();
  };

  useEffect(() => {
    if (phase !== 'connecting') return undefined;

    // Nothing here waits on the other person: the line is chased from this side
    // alone, and the other side is only ever told what to do — never asked to
    // press, reload or come back to anything.
    let step = 0;
    const chase = window.setInterval(() => {
      if (phaseRef.current !== 'connecting') return;
      step += 1;
      const pc = pcRef.current;

      // A message that never arrived is the usual reason for silence: the last
      // thing said is said again, and if nothing has been said, this side asks —
      // whichever of the two was meant to start, one of them must.
      if (step === 1) {
        if (pc?.currentLocalDescription) {
          sendSignal({ kind: 'sdp', sdp: plainSdp(pc.currentLocalDescription) });
        } else {
          sendSignal({ kind: 'join' });
          if (pc) makeOffer(pc, true);
        }
        return;
      }

      // The handshake landed and only the routes have not met: freshen them.
      if (step < 4 && pc?.remoteDescription) {
        setNotice('Still finding a way through — trying another route…');
        try {
          pc.restartIce();
          if (!polite()) makeOffer(pc, true);
        } catch (err) {
          // the line keeps trying on its own
        }
        return;
      }

      // Nothing is coming back: the line is built from nothing here and theirs
      // with it, then the whole ladder starts again from the top.
      setNotice('Reconnecting the line…');
      step = 0;
      reviveRef.current?.();
    }, LINE_KEEPALIVE_MS);

    // Said plainly once it has been silent for a while, but it never stops trying
    // and there is nothing for either of you to press.
    const late = window.setTimeout(() => {
      if (phaseRef.current !== 'connecting') return;
      setError(
        partnerRef.current == null
          ? 'They are not in the space right now. The call keeps trying and comes up on its own the moment they are back.'
          : 'The line is still trying on its own. It comes up the moment their side answers — no need to do anything.'
      );
    }, LINE_LATE_MS);

    return () => {
      window.clearInterval(chase);
      window.clearTimeout(late);
    };
  }, [phase, makeOffer, polite, sendSignal, attempt]);

  // You both press call at the same moment and the ask that was meant to reach
  // one of you is lost: without this, both sides wait and both are told the
  // other never picked up. After a moment, the waiting side asks too.
  // A slow line is watched while the call runs: what it can actually carry is read
  // from the connection itself, and the picture is stepped down or let back up to
  // suit it. The voices keep their own room throughout.
  useEffect(() => {
    if (phase !== 'live') return undefined;
    let stopped = false;

    const poll = async () => {
      const pc = pcRef.current;
      if (!pc || pc.connectionState !== 'connected') return;
      let available = 0;
      try {
        const stats = await pc.getStats();
        stats.forEach((report) => {
          if (
            report.type === 'candidate-pair' &&
            report.state === 'succeeded' &&
            report.availableOutgoingBitrate
          ) {
            available = Math.max(available, report.availableOutgoingBitrate);
          }
        });
      } catch (error) {
        return;
      }
      if (stopped || !available) return;
      // The picture is moved down at once when the line thins, and only brought
      // back one step at a time once the line has held its gain.
      const mode = screenRef.current ? 'screen' : 'camera';
      const result = tunerRef.current.read(available, mode);
      // Held by hand, the picture is not moved and the line is not called thin.
      if (tunerRef.current.setting === 'auto') setLine(result.index > 0 ? 'straining' : 'steady');
      if (result.changed) tuneVideo(pc, mode);
    };

    poll();
    const timer = window.setInterval(poll, BANDWIDTH_POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [phase, tuneVideo]);

  useEffect(() => {
    if (phase !== 'connecting' || !polite()) return undefined;
    const timer = window.setTimeout(() => {
      if (phaseRef.current !== 'connecting') return;
      const pc = pcRef.current;
      if (!pc || pc.remoteDescription) return;
      makeOffer(pc, true);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [phase, polite, makeOffer]);

  // A phone that slept, or a switch from Wi-Fi to mobile data, leaves the line
  // dead while the app still thinks the call is up. Coming back to the app picks
  // the call up again on its own, so it never sits there silently broken.
  useEffect(() => {
    const wake = () => {
      if (!wantedRef.current) return;
      if (document.visibilityState !== 'visible') return;
      const pc = pcRef.current;
      if (pc && pc.connectionState === 'connected') return;
      if (phaseRef.current !== 'connecting' && phaseRef.current !== 'live') return;
      if (pc && pc.remoteDescription) {
        try {
          pc.restartIce();
          if (!polite()) makeOffer(pc);
        } catch (err) {
          // the line keeps trying on its own
        }
        return;
      }
      reviveRef.current?.();
    };
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('online', wake);
    window.addEventListener('focus', wake);
    return () => {
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('focus', wake);
    };
  }, [makeOffer, polite]);

  // A call you are sitting in on your own is still a call: the sound engine is
  // nudged while you wait alone, and the screen is held lit unless you have said
  // it may sleep, so idling never lets the device doze off and drop the line.
  useEffect(() => {
    if (phase === 'idle') return undefined;
    let stopped = false;
    let sentinel = null;
    const lit = screenMode === 'awake';

    const hold = async () => {
      if (stopped || !lit || document.visibilityState !== 'visible') return;
      if (!navigator.wakeLock?.request) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch (error) {
        sentinel = null;
      }
    };

    const rehold = () => {
      if (document.visibilityState === 'visible') hold();
    };

    hold();
    document.addEventListener('visibilitychange', rehold);

    const keepWarm = window.setInterval(() => {
      if (!wantedRef.current) return;
      audioContext();
    }, 15000);

    return () => {
      stopped = true;
      window.clearInterval(keepWarm);
      document.removeEventListener('visibilitychange', rehold);
      try {
        sentinel?.release?.();
      } catch (error) {
        // it goes with the page anyway
      }
    };
  }, [phase, screenMode]);

  // Allowed to sleep, the call is carried by quiet sound instead of a lit screen:
  // the browser keeps a line that is still playing running in the background, so
  // their voice stays with you while the phone sits dark in your pocket.
  useEffect(() => {
    if (phase === 'idle' || screenMode !== 'free') return undefined;
    const audio = new Audio(silenceLoopUrl());
    audio.loop = true;
    audio.setAttribute('playsinline', '');
    audio.setAttribute('aria-hidden', 'true');

    const start = () => audio.play().catch(() => {});
    start();
    document.addEventListener('visibilitychange', start);
    document.addEventListener('pointerdown', start);

    return () => {
      document.removeEventListener('visibilitychange', start);
      document.removeEventListener('pointerdown', start);
      audio.pause();
      audio.src = '';
    };
  }, [phase, screenMode]);

  // Whatever the shared screen is playing travels down the line your voice already
  // uses: their side needs nothing new to hear it, and the call is never rebuilt.
  const mixShareAudio = useCallback(async (pc, soundTrack) => {
    if (shareAudioRef.current || !soundTrack || pc.connectionState === 'closed') return;
    const sender = pc.getSenders().find((item) => item.track?.kind === 'audio') || null;
    const mix = mixShareSound(audioContext(), outgoingRef.current || localRef.current, soundTrack, sender);
    if (!mix) return;
    try {
      await mix.sender.replaceTrack(mix.mixTrack);
      shareAudioRef.current = mix;
    } catch (error) {
      releaseMix(mix);
    }
  }, []);

  const unmixShareAudio = useCallback(async () => {
    const mix = shareAudioRef.current;
    shareAudioRef.current = null;
    const voice = (outgoingRef.current || localRef.current)?.getAudioTracks()[0] || null;
    await unmixShareSound(mix, voice);
  }, []);

  const releaseShareAudio = useCallback(() => {
    const mix = shareAudioRef.current;
    shareAudioRef.current = null;
    releaseMix(mix);
  }, []);

  const stopScreen = useCallback(async () => {
    const stream = screenRef.current;
    screenRef.current = null;
    setSharing(false);
    setShareHint('');
    setSelf(null);
    await unmixShareAudio();
    const pc = pcRef.current;
    const slot = pc ? videoTransceiver(pc) : null;
    if (slot?.sender) {
      try {
        await slot.sender.replaceTrack(null);
      } catch (err) {
        // nothing left to swap out
      }
    }
    if (stream) stream.getTracks().forEach((track) => track.stop());
  }, [unmixShareAudio]);

  // Your camera and your screen share the same picture slot, so only one of them
  // is on at a time: turning on the camera puts the screen away and the other way round.
  const stopCam = useCallback(async () => {
    const stream = camRef.current;
    camRef.current = null;
    setCam(false);
    setSelf(null);
    if (stream) stream.getTracks().forEach((track) => track.stop());
    const pc = pcRef.current;
    const slot = pc ? videoTransceiver(pc) : null;
    if (slot?.sender) {
      try {
        await slot.sender.replaceTrack(null);
      } catch (err) {
        // nothing left to swap out
      }
    }
  }, []);

  const toggleCam = useCallback(async () => {
    if (camRef.current) {
      await stopCam();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser will not let the call use a camera.');
      return;
    }
    const pc = pcRef.current;
    const slot = pc ? videoTransceiver(pc) : null;
    if (!slot?.sender) {
      setError('Start the call first, then turn on your camera.');
      return;
    }
    try {
      if (screenRef.current) await stopScreen();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CAMERA_WIDTH, max: CAMERA_WIDTH },
          height: { ideal: CAMERA_HEIGHT, max: CAMERA_HEIGHT },
          frameRate: { ideal: CAMERA_FPS, max: CAMERA_FPS },
          facingMode: facingRef.current,
        },
        audio: false,
      });
      const [track] = stream.getVideoTracks();
      // A face is motion: the picture stays smooth rather than frozen and sharp.
      track.contentHint = 'motion';
      await slot.sender.replaceTrack(track);
      camRef.current = stream;
      await tuneVideo(pc, 'camera');
      setCam(true);
      setSelf(stream);
      setError('');
      track.onended = () => stopCam();
    } catch (err) {
      setError('The camera was cancelled.');
    }
  }, [stopCam, stopScreen, tuneVideo]);

  // Picking the other camera swaps the picture without dropping the call: the
  // new stream takes the old one's slot, so the line never notices the change.
  const switchFacing = useCallback(
    async (next) => {
      const target =
        next === 'environment' || next === 'user'
          ? next
          : facingRef.current === 'user'
            ? 'environment'
            : 'user';
      if (target === facingRef.current) return;
      facingRef.current = target;
      setFacing(target);

      const stream = camRef.current;
      if (!stream || !navigator.mediaDevices?.getUserMedia) return;

      try {
        const fresh = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: CAMERA_WIDTH, max: CAMERA_WIDTH },
            height: { ideal: CAMERA_HEIGHT, max: CAMERA_HEIGHT },
            frameRate: { ideal: CAMERA_FPS, max: CAMERA_FPS },
            facingMode: target,
          },
          audio: false,
        });
        const [track] = fresh.getVideoTracks();
        track.contentHint = 'motion';
        const pc = pcRef.current;
        const slot = pc ? videoTransceiver(pc) : null;
        if (slot?.sender) await slot.sender.replaceTrack(track);
        if (camRef.current === stream) camRef.current = fresh;
        stream.getTracks().forEach((item) => item.stop());
        setSelf(fresh);
        setError('');
        track.onended = () => stopCam();
      } catch (err) {
        facingRef.current = facingRef.current === 'user' ? 'environment' : 'user';
        setFacing(facingRef.current);
        setError('That camera is not available on this device.');
      }
    },
    [stopCam]
  );

  const toggleShare = useCallback(async () => {
    if (screenRef.current) {
      await stopScreen();
      return;
    }
    if (camRef.current) await stopCam();
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError('This browser cannot share a screen.');
      return;
    }
    const pc = pcRef.current;
    const slot = pc ? videoTransceiver(pc) : null;
    if (!slot?.sender) {
      setError('Start the call first, then share your screen.');
      return;
    }
    const picture = {
      width: { ideal: SCREEN_WIDTH, max: SCREEN_WIDTH },
      height: { ideal: SCREEN_HEIGHT, max: SCREEN_HEIGHT },
      frameRate: { ideal: SCREEN_FPS, max: SCREEN_FPS },
    };
    try {
      // A tab is asked for first, and this app's own tab is left out of the list.
      // A tab carries nothing but its own sound, so the call can never loop back
      // into the share. Sound is taken as it plays: no echo cancelling or gating,
      // which would chew up music and films.
      const sound = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        suppressLocalAudioPlayback: false,
      };
      const capture = (options) => navigator.mediaDevices.getDisplayMedia(options);
      let stream;
      try {
        stream = await capture({
          video: { ...picture, displaySurface: 'browser' },
          audio: sound,
          selfBrowserSurface: 'exclude',
          surfaceSwitching: 'include',
        });
      } catch (err) {
        if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') throw err;
        try {
          stream = await capture({ video: picture, audio: sound });
        } catch (again) {
          if (again?.name === 'NotAllowedError' || again?.name === 'AbortError') throw again;
          stream = await capture({ video: picture, audio: false });
        }
      }
      const [track] = stream.getVideoTracks();
      // Sharp detail over motion, so text on the shared screen stays readable.
      track.contentHint = 'detail';
      await slot.sender.replaceTrack(track);
      screenRef.current = stream;
      await tuneVideo(pc, 'screen');
      setSharing(true);
      setSelf(stream);
      setError('');
      track.onended = () => stopScreen();
      const [screenSound] = stream.getAudioTracks();
      const source = track.getSettings?.().displaySurface;
      // Only a tab's sound is safe to pass on. A whole screen or a single window
      // carries everything the machine plays, the call included, so its sound
      // stays here and only the picture travels.
      if (screenSound && source !== 'window' && source !== 'monitor') {
        await mixShareAudio(pc, screenSound);
        setShareHint('');
      } else {
        if (screenSound) screenSound.stop();
        setShareHint(
          screenSound
            ? 'Sound only travels from a shared browser tab — a whole screen would send the call back to them.'
            : 'Share a browser tab to send its sound along with the picture.'
        );
      }
    } catch (err) {
      setError('Screen share was cancelled.');
    }
  }, [mixShareAudio, stopCam, stopScreen, tuneVideo]);

  const toggleMute = useCallback(() => {
    const stream = localRef.current;
    if (!stream) return;
    const goingMuted = !stream.getAudioTracks().every((track) => track.enabled === false);
    setMicEnabled(!goingMuted);
  }, [setMicEnabled]);

  // Deafen stops their sound reaching you and silences your own mic, so a call
  // can sit in the background without the room hearing anything.
  const toggleDeafen = useCallback(() => {
    const next = !deafenedRef.current;
    deafenedRef.current = next;
    setDeafened(next);
    remoteRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    if (remoteAudioRef.current) {
      remoteAudioRef.current.gain.gain.value = next ? 0 : voiceRef.current.their;
    }
    if (next) setMicEnabled(false);
  }, [setMicEnabled]);

  const changeVoice = useCallback((patch) => {
    setVoice((previous) => {
      const loudness = Math.min(3, Math.max(0.5, Number(patch.loudness ?? previous.loudness) || 1));
      const rawGate = Number(patch.gate ?? previous.gate);
      const gate = Math.min(-20, Math.max(-70, Number.isFinite(rawGate) ? rawGate : DEFAULT_VOICE.gate));
      const gateOn = typeof patch.gateOn === 'boolean' ? patch.gateOn : previous.gateOn !== false;
      const rawSensitivity = Number(patch.sensitivity ?? previous.sensitivity);
      const sensitivity = Math.min(
        200,
        Math.max(0, Number.isFinite(rawSensitivity) ? rawSensitivity : DEFAULT_VOICE.sensitivity)
      );
      const rawSuppress = Number(patch.suppress ?? previous.suppress);
      const suppress = Math.min(100, Math.max(0, Number.isFinite(rawSuppress) ? rawSuppress : DEFAULT_VOICE.suppress));
      const suppressOn =
        typeof patch.suppressOn === 'boolean' ? patch.suppressOn : previous.suppressOn !== false;
      const their = Math.min(2, Math.max(0, Number(patch.their ?? previous.their) || 0));
      const rawBass = Number(patch.bass ?? previous.bass);
      const bass = Math.min(12, Math.max(-12, Number.isFinite(rawBass) ? rawBass : 0));
      const rawClarity = Number(patch.clarity ?? previous.clarity);
      const clarity = Math.min(10, Math.max(-4, Number.isFinite(rawClarity) ? rawClarity : DEFAULT_VOICE.clarity));
      const rawAir = Number(patch.air ?? previous.air);
      const air = Math.min(6, Math.max(-8, Number.isFinite(rawAir) ? rawAir : DEFAULT_VOICE.air));
      const autoLevel = typeof patch.autoLevel === 'boolean' ? patch.autoLevel : previous.autoLevel !== false;
      const preset =
        typeof patch.preset === 'string' && patch.preset in VOICE_PRESETS ? patch.preset : previous.preset;
      const isolation =
        typeof patch.isolation === 'boolean' ? patch.isolation : previous.isolation !== false;
      const next = {
        gate,
        gateOn,
        sensitivity,
        suppress,
        suppressOn,
        loudness,
        their,
        bass,
        clarity,
        air,
        autoLevel,
        preset,
        isolation,
      };
      if (micRef.current) applyMicSettings(micRef.current, next);
      if (remoteAudioRef.current && !deafenedRef.current) {
        remoteAudioRef.current.gain.gain.value = their;
      }
      applySuppression(suppressOn);
      try {
        localStorage.setItem(VOICE_KEY, JSON.stringify(next));
      } catch (error) {
        // a private window just will not remember it
      }
      return next;
    });
  }, [applySuppression]);

  const releaseMic = useCallback(() => {
    const mic = micRef.current;
    micRef.current = null;
    outgoingRef.current = null;
    if (mic) {
      try {
        mic.dest.stream.getTracks().forEach((track) => track.stop());
        mic.source.disconnect();
        mic.ctx.close();
      } catch (error) {
        // the audio graph is going away anyway
      }
    }
    if (camRef.current) camRef.current.getTracks().forEach((track) => track.stop());
    camRef.current = null;
    setCam(false);
    setSelf(null);
    if (localRef.current) {
      localRef.current.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
    }
    localRef.current = null;
    setLocal(null);
    setMuted(false);
    setLevel(0);
  }, []);

  // Leaving the call tab with no call running lets the warm line and microphone go.
  const unprepare = useCallback(() => {
    warmRef.current = false;
    if (wantedRef.current) return;
    releaseMic();
    if (pcRef.current) dropPeer();
  }, [dropPeer, releaseMic]);

  const endCall = useCallback(() => {
    wantedRef.current = false;
    sendSignal({ kind: 'bye' });
    releaseShareAudio();
    if (screenRef.current) screenRef.current.getTracks().forEach((track) => track.stop());
    screenRef.current = null;
    dropPeer();
    releaseMic();
    setIncoming(false);
    setPhase('idle');
  }, [dropPeer, releaseMic, releaseShareAudio, sendSignal]);

  const retry = useCallback(() => {
    setError('');
    setNotice('');
    triesRef.current = 0;
    dropPeer();
    begin({ takeOver: true });
  }, [begin, dropPeer]);

  const dismiss = useCallback(() => {
    setIncoming(false);
    pendingRef.current = null;
    if (phaseRef.current === 'ringing') {
      setPhase('idle');
      sendSignal({ kind: 'decline' });
    }
  }, [sendSignal]);

  useEffect(
    () =>
      on('signal', async (message) => {
        const data = message?.data;
        if (!data || typeof data.kind !== 'string') return;
        try {
          // Their line is being built from nothing — either they picked the call
          // up on another device or their side had to rebuild it. Either way the
          // line held here belongs to a handshake that is gone: it is let go and
          // built again, so neither side waits on an answer nobody can use.
          if (data.kind === 'handoff' || data.kind === 'rebuild') {
            if (!wantedRef.current) return;
            releaseShareAudio();
            if (screenRef.current) screenRef.current.getTracks().forEach((track) => track.stop());
            dropPeer();
            setNotice(
              data.kind === 'handoff'
                ? 'Picking the call back up on their other device…'
                : 'Building the line back up…'
            );
            begin();
            return;
          }

          if (data.kind === 'join') {
            if (!wantedRef.current) {
              // Always show the ring, whatever the last call left behind: a
              // missed ring is a call that never connects.
              setIncoming(true);
              setPhase('ringing');
              return;
            }
            const pc = pcRef.current;
            if (!pc) return;
            // They are still ringing, so whatever we last said may never have
            // reached them: say it again instead of making them wait it out.
            if (pc.currentLocalDescription) {
              sendSignal({ kind: 'sdp', sdp: plainSdp(pc.currentLocalDescription) });
              return;
            }
            // Nothing has been said yet. Whoever should have started may be the
            // side that is stuck, so this side asks instead of waiting on it.
            await makeOffer(pc, true);
            return;
          }

          if (data.kind === 'sdp') {
            const sdp = data.sdp;
            if (!sdp || typeof sdp.type !== 'string') return;

            if (sdp.type === 'offer') {
              if (!wantedRef.current) {
                pendingRef.current = sdp;
                setIncoming(true);
                setPhase('ringing');
                return;
              }
              const pc = ensurePeer();
              // The same ask arriving again means our reply never reached them —
              // send it once more rather than starting the whole thing over.
              if (
                pc.signalingState === 'stable' &&
                pc.currentRemoteDescription?.type === 'offer' &&
                pc.currentRemoteDescription.sdp === (sdp.sdp || '') &&
                pc.currentLocalDescription?.type === 'answer'
              ) {
                sendSignal({ kind: 'sdp', sdp: plainSdp(pc.currentLocalDescription) });
                return;
              }
              // Two offers can cross when you both press call at once. The one
              // whose offer yields is fixed by seat, so both sides settle on the
              // same line instead of deadlocking on two half-made connections.
              if (pc.signalingState === 'have-local-offer') {
                if (!polite()) return;
                try {
                  await pc.setLocalDescription({ type: 'rollback' });
                } catch (err) {
                  return;
                }
              }
              if (pc.signalingState !== 'stable') return;
              await pc.setRemoteDescription(sdp);
              answeredRef.current = true;
              const slot = videoTransceiver(pc);
              if (slot) slot.direction = 'sendrecv';
              await attachVideo(pc);
              const stream = outgoingRef.current || localRef.current;
              if (stream) {
                stream.getAudioTracks().forEach((track) => {
                  if (!pc.getSenders().some((sender) => sender.track === track)) pc.addTrack(track, stream);
                });
              }
              await flushCandidates(pc);
              await tuneLine(pc);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              // Answered at once; the routes follow as they are found.
              sendSignal({ kind: 'sdp', sdp: plainSdp(pc.localDescription) });
              setPhase('connecting');
              return;
            }

            if (sdp.type === 'answer') {
              const pc = pcRef.current;
              if (!pc || pc.signalingState !== 'have-local-offer') return;
              await pc.setRemoteDescription(sdp);
              answeredRef.current = true;
              await flushCandidates(pc);
              setPhase('connecting');
              return;
            }
            return;
          }

          // The room could not reach the other side — a closed tab, a dropped
          // socket. Say so instead of leaving the call on "connecting".
          if (data.kind === 'gone') {
            if (!wantedRef.current) return;
            setNotice('They are not reachable right now. Ask them to come back to the space.');
            return;
          }

          if (data.kind === 'ice' && data.candidate && data.candidate.candidate) {
            const pc = pcRef.current;
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(data.candidate);
              } catch (err) {
                // a late candidate from an older line
              }
            } else {
              queuedRef.current.push(data.candidate);
            }
            return;
          }

          if (data.kind === 'decline') {
            if (!wantedRef.current) return;
            wantedRef.current = false;
            dropPeer();
            releaseMic();
            setPhase('idle');
            setNotice('They could not pick up. Try again in a moment.');
            return;
          }

          if (data.kind === 'bye') {
            setIncoming(false);
            pendingRef.current = null;
            if (!wantedRef.current) return;
            wantedRef.current = false;
            dropPeer();
            releaseMic();
            setPhase('idle');
            setNotice('They ended the call.');
          }
        } catch (err) {
          // A handshake that trips over itself is rebuilt from nothing once before
          // the two of you are told anything: most of these never reach either side.
          if (wantedRef.current && triesRef.current < 3) {
            triesRef.current += 1;
            setNotice('Reconnecting the line…');
            reviveRef.current?.();
            return;
          }
          // Even now nothing is asked of either of you: the line keeps rebuilding
          // itself until it comes up.
          setNotice('Reconnecting the line…');
        }
      }),
    [on, dropPeer, ensurePeer, flushCandidates, makeOffer, polite, releaseMic, sendSignal, tuneLine, attachVideo, begin]
  );

  // The call has been taken up on another device of yours: this one lets go of
  // the microphone and the line, so the two are never both holding the call.
  useEffect(
    () =>
      on('takeover', () => {
        if (!wantedRef.current) return;
        wantedRef.current = false;
        setIncoming(false);
        pendingRef.current = null;
        releaseShareAudio();
        if (screenRef.current) screenRef.current.getTracks().forEach((track) => track.stop());
        screenRef.current = null;
        dropPeer();
        releaseMic();
        setPhase('idle');
        setError('');
        setNotice('The call moved to your other device.');
      }),
    [on, dropPeer, releaseMic, releaseShareAudio]
  );

  // The room is told which device is carrying the call, so your other one can
  // offer to take it up instead of sitting on a call it cannot reach.
  const onCall = phase !== 'idle';
  useEffect(() => {
    try {
      send({ type: 'call', on: onCall });
    } catch (error) {
      // a socket caught mid-reconnect says it again on the next change
    }
    return () => {
      try {
        send({ type: 'call', on: false });
      } catch (error) {
        // the socket is already gone
      }
    };
  }, [onCall, send, connected]);

  // Some browsers are quiet about a screen share starting or stopping, so the
  // stage checks what is actually arriving while the line is live.
  useEffect(() => {
    if (phase !== 'live') return undefined;
    const interval = window.setInterval(refreshVideo, 2000);
    return () => window.clearInterval(interval);
  }, [phase, refreshVideo]);

  // Live mic level for the meter, and the noise gate that follows it.
  useEffect(() => {
    if (phase === 'idle') {
      setLevel(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      const mic = micRef.current;
      if (!mic) return;
      const rms = driveMic(mic, voiceRef.current, lastVoiceRef);
      setLevel(Math.min(1, rms * 5));
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Coming and going: wait for them instead of dropping the call, and pick the
  // line back up the moment they are back in the room.
  useEffect(() => {
    if (!wantedRef.current) return;

    if (partnerSeat == null) {
      // The room blips — a phone losing its socket for a few seconds, a tab waking
      // up. The sound never travels through the room, so a line that is still
      // carrying them is left exactly as it is and the call never flickers away.
      const held = pcRef.current;
      if (held && (held.connectionState === 'connected' || held.connectionState === 'connecting')) return;
      if (pcRef.current || phaseRef.current === 'live' || phaseRef.current === 'connecting') {
        dropPeer();
        setPhase('waiting');
        setNotice('Waiting for them to come back…');
      }
      return;
    }

    if (phaseRef.current !== 'waiting') return;

    setNotice('');
    const pc = pcRef.current;
    if (!pc) {
      begin();
      return;
    }
    setPhase('connecting');
    if (polite()) sendSignal({ kind: 'join' });
    else makeOffer(pc);
  }, [partnerSeat, begin, dropPeer, makeOffer, polite, sendSignal]);

  useEffect(
    () => () => {
      wantedRef.current = false;
      reviveRef.current = null;
      window.clearTimeout(healRef.current);
      const pc = pcRef.current;
      pcRef.current = null;
      if (pc) {
        try {
          pc.close();
        } catch (err) {
          // unloading
        }
      }
      [localRef, screenRef, camRef].forEach((ref) => {
        if (ref.current) ref.current.getTracks().forEach((track) => track.stop());
      });
      if (micRef.current) {
        try {
          micRef.current.ctx.close();
        } catch (err) {
          // unloading
        }
        micRef.current = null;
      }
      if (remoteAudioRef.current) {
        try {
          remoteAudioRef.current.ctx.close();
        } catch (err) {
          // unloading
        }
        remoteAudioRef.current = null;
      }
    },
    []
  );

  // Whether the call is running on another device of yours, waiting to be
  // brought here in one tap.
  const mine = peers.find((item) => item.seat === seat) || null;
  const elsewhere = phase === 'idle' && mine?.call === true;

  return {
    phase,
    incoming,
    elsewhere,
    muted,
    sharing,
    cam,
    hasVideo,
    remote,
    local,
    self,
    error,
    notice,
    shareHint,
    line,
    partnerName: partner?.name || 'Them',
    partnerHere: partnerSeat != null,
    startCall: () => begin({ takeOver: true }),
    joinCall: begin,
    prepare,
    unprepare,
    hangUp: endCall,
    retry,
    toggleMute,
    toggleShare,
    toggleCam,
    facing,
    switchFacing,
    dismiss,
    voice,
    changeVoice,
    level,
    deafened,
    toggleDeafen,
    quality,
    changeQuality,
    screenMode,
    changeScreenMode,
  };
}