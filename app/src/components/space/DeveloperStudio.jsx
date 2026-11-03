import { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Database, RefreshCw, LockKeyhole } from 'lucide-react';
import { syncspaceApiBase } from '@/lib/syncspaceConnection';
import { syncAuth } from '@/lib/syncAuth';

export default function DeveloperStudio() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(syncspaceApiBase + '/developer/status', {
        headers: { Authorization: 'Bearer ' + syncAuth.getToken() },
        cache: 'no-store'
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Diagnostics unavailable');
      setData(result);
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally { setBusy(false); }
  }
  useEffect(() => { refresh(); }, []);
  return <section className="space-y-6 text-purple-50">
    <div className="rounded-3xl border border-violet-400/25 bg-gradient-to-br from-[#24113c]/95 to-[#0d1023]/95 p-7 shadow-2xl shadow-purple-950/40">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.24em] text-violet-300"><ShieldCheck size={16}/> Authorized developer</div>
          <h1 className="text-3xl font-semibold">Developer Studio</h1>
          <p className="mt-2 max-w-2xl text-sm text-purple-200/75">Private diagnostics for your two developer accounts. No message contents, encryption keys, or other members' data are exposed.</p>
        </div>
        <button type="button" onClick={refresh} disabled={busy} className="flex items-center gap-2 rounded-xl border border-violet-300/30 bg-violet-500/20 px-4 py-3 text-sm hover:bg-violet-500/30 disabled:opacity-50"><RefreshCw size={16} className={busy?'animate-spin':''}/> Refresh status</button>
      </div>
    </div>
    {error && <div role="alert" className="rounded-2xl border border-amber-400/30 bg-amber-950/30 p-5 text-amber-100">Diagnostics unavailable: {error}. The production API must be updated to enable this feature.</div>}
    {data && <div className="grid gap-4 sm:grid-cols-3">
      {[[Activity,'Production API',data.api],[Database,'Database',data.database],[LockKeyhole,'Testing Lab',data.testingLab]].map(([Icon,label,value])=><div key={label} className="rounded-2xl border border-violet-400/20 bg-[#171027]/85 p-5"><Icon className="mb-3 text-violet-300" size={24}/><div className="text-sm text-purple-200/70">{label}</div><div className="mt-1 text-lg font-semibold capitalize">{value}</div></div>)}
    </div>}
    <div className="rounded-2xl border border-violet-400/15 bg-[#130f24]/85 p-6"><h2 className="text-lg font-semibold">Security boundaries</h2><p className="mt-2 text-sm leading-7 text-purple-200/70">Developer tools operate within your existing account and shared-space permissions. They do not bypass end-to-end encryption or unlock private conversations. Administrative write operations are intentionally not enabled.</p></div>
  </section>;
}
