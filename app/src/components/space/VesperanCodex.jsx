import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import VesperanPartyGame from '@/components/space/vesperan/VesperanPartyGame';
import CodexGrammar from '@/components/space/vesperan/CodexGrammar';
import CodexSectionNav from '@/components/space/vesperan/CodexSectionNav';
import CodexEntryList from '@/components/space/vesperan/CodexEntryList';

const PAGE = 60;

function buildFilter(needle, section) {
  const filter = {};
  if (needle) {
    filter.$or = [{ english_lc: { $regex: needle } }, { vesperan_lc: { $regex: needle } }];
  }
  if (section !== 'all') filter.section = section;
  return filter;
}

export default function VesperanCodex() {
  const [sections, setSections] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [needle, setNeedle] = useState('');
  const [section, setSection] = useState('all');
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [matches, setMatches] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  // The parts of the codex, in the order they were written.
  useEffect(() => {
    let cancelled = false;
    base44.entities.CodexEntry.aggregate({ groupBy: 'section', min: ['section_order'] }).then((result) => {
      if (cancelled) return;
      const rows = result?.rows || [];
      const list = rows
        .map((row) => ({
          section: row.section,
          count: row.count,
          order: row.min_section_order ?? row.min?.section_order ?? 0,
        }))
        .sort((a, b) => a.order - b.order);
      setSections(list);
      setTotal(list.reduce((sum, row) => sum + row.count, 0));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setNeedle(query.trim().toLowerCase()), 200);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const filter = buildFilter(needle, section);
    setLoading(true);
    Promise.all([
      base44.entities.CodexEntry.filter(filter, { sort: 'order', limit: PAGE }),
      base44.entities.CodexEntry.count(filter),
    ])
      .then(([page, count]) => {
        if (cancelled) return;
        setItems(page.items || []);
        setCursor(page.next_cursor || null);
        setHasMore(Boolean(page.has_more));
        setMatches(count);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needle, section]);

  const loadMore = async () => {
    if (!cursor || more) return;
    setMore(true);
    const page = await base44.entities.CodexEntry.filter(buildFilter(needle, section), {
      sort: 'order',
      limit: PAGE,
      cursor,
    });
    setItems((prev) => [...prev, ...(page.items || [])]);
    setCursor(page.next_cursor || null);
    setHasMore(Boolean(page.has_more));
    setMore(false);
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-3xl border border-white/8 p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-300/80">The tongue of the two of us</p>
            <h2 className="font-heading text-2xl font-semibold text-white">Vesperan Codex</h2>
            <p className="mt-1 text-sm text-slate-400">
              {total || 772} entries across {sections.length || 29} parts — search in English or Vesperan.
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="love, luma, dog…"
              className="border-white/10 bg-white/5 pl-9 text-white placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      <VesperanPartyGame />

      <CodexGrammar />

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <CodexSectionNav sections={sections} total={total} active={section} onSelect={setSection} />

        <section className="glass-panel rounded-3xl border border-white/8 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-white/8 pb-3 text-xs text-slate-500">
            <span className="capitalize">{section === 'all' ? 'Every part of the codex' : section}</span>
            <span>
              {matches} {needle ? (matches === 1 ? 'match' : 'matches') : 'entries'}
            </span>
          </div>
          <CodexEntryList
            items={items}
            loading={loading}
            showSection={section === 'all'}
            hasMore={hasMore}
            more={more}
            onMore={loadMore}
          />
        </section>
      </div>
    </div>
  );
}