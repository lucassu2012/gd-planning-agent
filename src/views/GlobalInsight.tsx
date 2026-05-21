import { useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useStore } from '../store';
import { ISSUE_COLOR, PRIORITY_COLOR, PRIORITY_ORDER, type Taz, type TypicalIssue, type Priority } from '../types';
import MapView from '../map/MapView';
import LayerManager from '../components/LayerManager';
import Legend from '../components/Legend';

export default function GlobalInsight() {
  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
      <Dashboard />
      <div className="flex-1 flex overflow-hidden relative">
        <TazTable />
        <div className="flex-1 relative">
          <MapView mode="global" />
          <LayerManager mode="global" />
          <Legend mode="global" />
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const kpi = useStore((s) => s.dataset!.kpi);
  const region = useStore((s) => s.dataset!.meta.region);
  const period = useStore((s) => s.dataset!.meta.period);
  const total = kpi.cell4g + kpi.cell5g;
  const pct5g = Math.round((kpi.cell5g / total) * 100);

  return (
    <div className="h-[300px] shrink-0 border-b border-white/10 bg-[#141414] px-5 py-4 flex flex-col">
      <div className="flex items-baseline gap-3 mb-3">
        <h1 className="text-base font-bold">全局洞察分析</h1>
        <span className="text-xs text-white/40">{period} · {region}</span>
      </div>
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* KPI 卡 */}
        <div className="col-span-4 grid grid-rows-2 gap-3">
          <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3 flex flex-col justify-center">
            <div className="text-[11px] text-white/50 mb-1.5">4/5G 小区比例</div>
            <div className="h-2 rounded-full overflow-hidden bg-white/10 flex">
              <div style={{ width: `${100 - pct5g}%`, background: '#64748b' }} />
              <div style={{ width: `${pct5g}%`, background: '#3b82f6' }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px]">
              <span className="text-white/60">4G <b className="text-white/90">{kpi.cell4g.toLocaleString()}</b></span>
              <span className="text-blue-400">5G <b>{kpi.cell5g.toLocaleString()}</b></span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="质差小区比例" value={`${kpi.poorCellRatio}%`} chg={kpi.poorCellChg} color="#eab308" />
            <Kpi label="高负荷小区" value={`${kpi.highLoadCellCount}`} sub={`占比 ${kpi.highLoadCellRatio}%`} chg={kpi.highLoadCellChg} color="#f97316" />
          </div>
        </div>
        {/* 24h 折线 */}
        <div className="col-span-4 bg-[#0f0f0f] border border-white/10 rounded-lg p-3 flex flex-col">
          <div className="text-[11px] text-white/50 mb-1">质差/高负荷小区 · 24小时</div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpi.hourly} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={2} tickFormatter={(h) => `${h}:00`} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={28} />
                <Tooltip contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, fontSize: 11 }} labelFormatter={(h) => `${h}:00`} />
                <Line type="monotone" dataKey="poor" name="质差" stroke="#eab308" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="load" name="高负荷" stroke="#f97316" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* 待新建小区分布 */}
        <div className="col-span-4 bg-[#0f0f0f] border border-white/10 rounded-lg p-3 flex flex-col">
          <div className="text-[11px] text-white/50 mb-1">待新建小区分布 · 各区</div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpi.newSiteByDistrict} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="district" tick={{ fontSize: 8, fill: '#94a3b8' }} interval={0} angle={-30} textAnchor="end" height={42} tickFormatter={(d: string) => d.replace('区', '')} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={28} />
                <Tooltip contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="count" name="待新建" radius={[3, 3, 0, 0]}>
                  {kpi.newSiteByDistrict.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#3b82f6' : '#1e5bb8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, chg, color }: { label: string; value: string; sub?: string; chg?: number; color: string }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3 flex flex-col justify-center">
      <div className="text-[11px] text-white/50">{label}</div>
      <div className="text-2xl font-bold mt-0.5" style={{ color }}>{value}</div>
      <div className="flex items-center gap-2 mt-0.5">
        {sub && <span className="text-[10px] text-white/40">{sub}</span>}
        {chg !== undefined && (
          <span className={`text-[10px] font-medium ${chg >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            较上月 {chg >= 0 ? '+' : ''}{chg}%
          </span>
        )}
      </div>
    </div>
  );
}

type SortKey = 'priority' | 'dailyTrafficGB' | 'population';

function TazTable() {
  const tazList = useStore((s) => s.dataset!.tazList);
  const openTaz = useStore((s) => s.openTaz);
  const selectedTazId = useStore((s) => s.selectedTazId);
  const [sort, setSort] = useState<SortKey>('priority');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    let r = tazList;
    if (q) r = r.filter((t) => t.name.includes(q) || t.type.includes(q));
    return [...r].sort((a, b) => {
      if (sort === 'priority') return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority] || b.weightedScore - a.weightedScore;
      if (sort === 'dailyTrafficGB') return b.dailyTrafficGB - a.dailyTrafficGB;
      return b.population - a.population;
    });
  }, [tazList, sort, q]);

  return (
    <div className="w-[430px] shrink-0 border-r border-white/10 flex flex-col bg-[#0a0a0a]">
      <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between">
        <span className="text-sm font-semibold">TAZ 列表 <span className="text-white/40 text-xs font-normal">{rows.length}</span></span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索名称/类型" className="bg-[#141414] border border-white/10 rounded px-2 py-1 text-xs w-32 outline-none focus:border-blue-500/50" />
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-[#141414] z-10">
            <tr className="text-white/40 text-[10px] uppercase">
              <th className="px-3 py-2 font-medium">名称</th>
              <th className="px-2 py-2 font-medium">类型</th>
              <Th label="流量(GB)" active={sort === 'dailyTrafficGB'} onClick={() => setSort('dailyTrafficGB')} />
              <th className="px-2 py-2 font-medium">典型质差</th>
              <Th label="优先级" active={sort === 'priority'} onClick={() => setSort('priority')} />
              <Th label="人口" active={sort === 'population'} onClick={() => setSort('population')} />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.id}
                onClick={() => openTaz(t.id)}
                className={`group cursor-pointer border-b border-white/5 hover:bg-white/5 ${selectedTazId === t.id ? 'bg-blue-500/10' : ''}`}
              >
                <td className="px-3 py-2 max-w-[120px] truncate text-white/80 group-hover:text-white" title={t.name}>{t.name}</td>
                <td className="px-2 py-2 text-white/50 whitespace-nowrap">{t.type.replace('机构区', '').replace('区', '')}</td>
                <td className="px-2 py-2 text-right text-white/70 tabular-nums">{t.dailyTrafficGB > 0 ? t.dailyTrafficGB.toLocaleString() : '—'}</td>
                <td className="px-2 py-2"><IssueBadge issue={t.typicalIssue} /></td>
                <td className="px-2 py-2"><PriBadge p={t.priority} /></td>
                <td className="px-2 py-2 text-right text-white/50 tabular-nums">{t.population.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th className="px-2 py-2 font-medium cursor-pointer select-none whitespace-nowrap text-right" onClick={onClick}>
      <span className={active ? 'text-blue-400' : ''}>{label}{active ? ' ↓' : ''}</span>
    </th>
  );
}
function IssueBadge({ issue }: { issue: TypicalIssue }) {
  const c = ISSUE_COLOR[issue];
  return <span className="px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap" style={{ color: c, background: `${c}22` }}>{issue}</span>;
}
function PriBadge({ p }: { p: Priority }) {
  const c = PRIORITY_COLOR[p];
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap" style={{ color: c, background: `${c}22` }}>{p}</span>;
}
