import { useEffect, useState } from 'react';
export default function CallHealthPanel({ call }) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState('Not checked');
  const [micChoice, setMicChoice] = useState('');
  const [cameraChoice, setCameraChoice] = useState('');
  useEffect(() => { if (open) call.inspectRelays?.(); }, [open, call.inspectRelays]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const result = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setDevices(result);
      } catch (error) {
        if (!cancelled) setDeviceStatus(error.message);
      }
    };
    refresh();
    navigator.mediaDevices?.addEventListener?.('devicechange', refresh);
    return () => {
      cancelled = true;
      navigator.mediaDevices?.removeEventListener?.('devicechange', refresh);
    };
  }, [open]);
  const testDevices = async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      setDeviceStatus('Microphone and camera are accessible.');
    } catch (error) {
      setDeviceStatus(`Device test: ${error.message}`);
    } finally {
      stream?.getTracks().forEach(track => track.stop());
    }
  };
  const microphones = devices.filter(d => d.kind === 'audioinput');
  const cameras = devices.filter(d => d.kind === 'videoinput');
  return (
    <section className="mb-4 rounded-2xl border border-purple-400/25 bg-purple-950/30 p-4 text-slate-100">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="w-full text-left text-sm font-semibold text-purple-200"
      >
        {open ? '▼' : '▶'} Call Health & Reliability
      </button>
      {open && (
        <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-4">
            <h3 className="mb-3 font-semibold text-purple-200">
              Connection Status
            </h3>
            <p>Call phase: {call.phase}</p>
            <p>Line health: {call.line || 'Not connected'}</p>
            <p>Partner present: {call.partnerHere ? 'Yes' : 'No'}</p>
            <p className="mt-3 text-slate-400">
              SyncSpace already supports ICE restart and automatic
              connection rebuilding. Recovery must still be tested
              during a real two-participant call.
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <h3 className="mb-3 font-semibold text-purple-200">
              Device Preflight
            </h3>
            <button
              type="button"
              onClick={testDevices}
              className="rounded-lg bg-purple-600 px-3 py-2 text-white"
            >
              Test microphone and camera
            </button>
            <p className="mt-3">{deviceStatus}</p>
            <p className="mt-2">
              Microphones detected: {microphones.length}
            </p>
            <p>
              Cameras detected: {cameras.length}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-4 sm:col-span-2">
            <h3 className="mb-3 font-semibold text-purple-200">Call Quality 2.0</h3>
            <p className="mb-3 text-slate-400">Screen profile affects new shares and can be switched during a share. The browser and available bandwidth still determine actual delivered quality.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">Screen sharing profile
                <select className="mt-1 w-full rounded-lg bg-slate-900 p-2 text-white" value={call.shareProfile || 'detail'} onChange={e => call.changeShareProfile?.(e.target.value)}>
                  <option value="detail">Sharp Desktop · readable text</option>
                  <option value="motion">Smooth Motion · games and video</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-lg bg-black/20 p-3">
                <input type="checkbox" checked={Boolean(call.cleanMic)} onChange={e => call.changeCleanMic?.(e.target.checked)} />
                <span>Clean mic (disable SyncSpace gate, suppression and isolation)</span>
              </label>
            </div>
            <p className="mt-3 text-slate-400">Clean mic is for controlled headset tests; browser echo cancellation may still be active. Existing manual quality presets remain available in the call header.</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4 sm:col-span-2">
            <h3 className="mb-3 font-semibold text-purple-200">Live devices &amp; connection</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">Microphone
                <select className="mt-1 w-full rounded-lg bg-slate-900 p-2 text-white" value={micChoice} onChange={e => setMicChoice(e.target.value)}>
                  <option value="">System default</option>
                  {microphones.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>)}
                </select>
                <button type="button" disabled={call.deviceBusy} onClick={() => call.switchMicrophone(micChoice)} className="mt-2 rounded-lg bg-purple-600 px-3 py-2 disabled:opacity-50">Switch microphone</button>
              </label>
              <label className="block">Camera (turn camera on first)
                <select className="mt-1 w-full rounded-lg bg-slate-900 p-2 text-white" value={cameraChoice} onChange={e => setCameraChoice(e.target.value)}>
                  <option value="">System default</option>
                  {cameras.map((d, i) => <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
                </select>
                <button type="button" disabled={call.deviceBusy || !call.cam} onClick={() => call.switchCameraDevice(cameraChoice)} className="mt-2 rounded-lg bg-purple-600 px-3 py-2 disabled:opacity-50">Switch camera</button>
              </label>
            </div>
            {call.deviceMessage && <p className="mt-3 text-purple-200">{call.deviceMessage}</p>}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-black/20 p-3">
                <p>Call: {call.callStats?.connection || call.phase}</p>
                <p>ICE: {call.callStats?.ice || 'Not connected'}</p>
                <p>Latency: {call.callStats?.rtt == null ? 'Not available' : `${call.callStats.rtt} ms`}</p>
                <p>Packet loss: {call.callStats?.lossPct == null ? 'Not available' : `${call.callStats.lossPct}%`}</p>
                <p>Audio jitter: {call.callStats?.jitterMs == null ? 'Not available' : `${call.callStats.jitterMs} ms`}</p>
                <p>Sent video: {call.callStats?.video?.width && call.callStats?.video?.height ? `${call.callStats.video.width}×${call.callStats.video.height}` : 'Not available'}</p>
                <p>Video FPS: {call.callStats?.video?.fps ?? 'Not available'}</p>
                <p>Route: {call.callStats?.relay || 'Not available'}</p>
              </div>
              <div className="rounded-lg bg-black/20 p-3">
                <p>Configured STUN URLs: {call.relayInfo?.stun ?? 'Unknown'}</p>
                <p>Configured TURN URLs: {call.relayInfo?.turn ?? 'Unknown'}</p>
                <p className="mt-2 text-slate-400">A configured TURN URL does not guarantee a working relay. Credentials are never shown here.</p>
                <button type="button" onClick={() => call.inspectRelays?.()} className="mt-2 rounded-lg border border-white/20 px-3 py-2">Refresh relay check</button>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white/5 p-4 sm:col-span-2">
            <h3 className="mb-3 font-semibold text-purple-200">
              Network Reliability
            </h3>
            <p>
              WebRTC transport: Browser-managed encrypted connection
            </p>
            <p className="mt-2">
              TURN relays can improve connectivity between different
              networks, but require a configured server and credentials.
            </p>
            <p className="mt-2 text-slate-400">
              Statistics are read from the browser's active WebRTC connection. Some browsers do not expose every metric.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}