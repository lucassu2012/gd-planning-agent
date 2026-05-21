import { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../store';
import { PRIORITY_COLOR, type Priority, type PlanSite, type Taz } from '../types';
import MapView from '../map/MapView';
import LayerManager from '../components/LayerManager';
import Legend from '../components/Legend';
import AiAssistant from '../components/AiAssistant';

type SubTab = 'plan' | 'sim' | 'value';
const siteCost = (s: PlanSite) => (s.name.includes('室分') ? 35 : s.name.includes('杆') ? 12 : 60);

interface Scenario {
  key: 'aggressive' | 'balanced' | 'steady';
  label: string;
  n: number;
  sites: PlanSite[];
  users: number;
  invest: number;
  revenueY: number;
  coverage: number;
  roiYears: number;
  trafficGrowth: number;
}
function buildScenarios(sites: PlanSite[]): Scenario[] {
  const sorted = [...sites].sort((a, b) => b.score - a.score);
  const mk = (key: Scenario['key'], label: string, n: number): Scenario => {
    const sel = sorted.slice(0, Math.min(n, sorted.length));
    const users = Math.round(sel.reduce((a, s) => a + s.potentialUsers, 0) * 0.42);
    const invest = sel.reduce((a, s) => a + siteCost(s), 0);
    const revenueY = Math.round(users * 0.0052 * 12 * 10) / 10;
    const coverage = Math.round(Math.min(99, 89 + sel.length * 1.9) * 10) / 10;
    const roiYears = revenueY > 0 ? Math.round((invest / revenueY) * 10) / 10 : 0;
    return { key, label, n: sel.length, sites: sel, users, invest, revenueY, coverage, roiYears, trafficGrowth: 70 + sel.length * 30 };
  };
  return [mk('aggressive', '激进扩张', 5), mk('balanced', '平衡发展', 3), mk('steady', '稳健优化', 2)];
}

export default function Planning() {
  const taz = useStore((s) => s.dataset!.tazList.find((t) => t.id === s.planTazId));
  const sites = useStore((s) => s.dataset!.planSites.filter((p) => p.tazId === s.planTazId));
  const back = useStore((s) => s.back);
  const [sub, setSub] = useState<SubTab>('plan');
  if (!taz) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 shrink-0 flex items-center px-4 gap-3 border-b border-white/10 bg-[#0f0f0f]">
        <button onClick={back} className="flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <svg width="14" height="14" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" fill="none"><path d="M10 3l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          返回分析
        </button>
        <div className="h-5 w-px bg-white/10" />
        <b className="text-sm">建站规划：{taz.name}</b>
        <div className="ml-3 flex gap-1">
          {([['plan', '智能规划建议'], ['sim', '网络仿真优化'], ['value', '综合价值测算']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSub(k)} className={`px-3 py-1.5 rounded-md text-xs font-medium ${sub === k ? 'bg-blue-500/15 text-blue-300' : 'text-white/55 hover:text-white hover:bg-white/5'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 min-w-0 flex overflow-hidden">
          {sub === 'plan' && <PlanTab taz={taz} sites={sites} />}
          {sub === 'sim' && <SimTab taz={taz} sites={sites} />}
          {sub === 'value' && <ValueTab sites={sites} />}
        </div>
        {/* 规划决策 Agent（右侧，对齐需求） */}
        <div className="w-[360px] shrink-0 border-l border-white/10 flex flex-col bg-[#0a0a0a]">
          <AiAssistant taz={taz} mode="plan" />
        </div>
      </div>
    </div>
  );
}

/* ───────── 智能规划建议 ───────── */
const PAGE = 8;
function PlanTab({ taz, sites }: { taz: Taz; sites: PlanSite[] }) {
  const selectedSiteId = useStore((s) => s.selectedSiteId);
  const selectSite = useStore((s) => s.selectSite);
  const selectedSiteIds = useStore((s) => s.selectedSiteIds);
  const toggleSite = useStore((s) => s.toggleSite);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(sites.length / PAGE));
  const view = sites.slice(page * PAGE, page * PAGE + PAGE);
  const chosen = sites.filter((s) => selectedSiteIds.includes(s.id));
  const aggNewUsers = Math.round(chosen.reduce((a, s) => a + s.potentialUsers, 0) * 0.42);
  const aggRevenue = Math.round(aggNewUsers * 0.0052 * 10) / 10;
  const aggTraffic = Math.round(chosen.reduce((a, s) => a + s.potentialUsers * 0.8, 0));
  const avgCov = chosen.length ? chosen.reduce((a, s) => a + s.coverage, 0) / chosen.length : 0;
  const invest = chosen.reduce((a, s) => a + siteCost(s), 0);
  const payback = aggRevenue > 0 ? Math.max(6, Math.round(invest / aggRevenue)) : 0;

  return (
    <>
      <div className="w-[440px] shrink-0 border-r border-white/10 overflow-y-auto p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">规划方案列表 <span className="text-blue-300 text-xs font-normal">已选 {chosen.length}/{sites.length}</span></span>
            <span className="text-xs text-white/40">勾选站点 → 地图覆盖联动</span>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase border-b border-white/10">
                <th className="py-1.5 w-6"></th><th className="text-left py-1.5">优先级</th><th className="text-left py-1.5">站点名称</th>
                <th className="text-right py-1.5">打分</th><th className="text-right py-1.5">覆盖率</th><th className="text-right py-1.5">PRB</th><th className="text-right py-1.5">潜客</th>
              </tr>
            </thead>
            <tbody>
              {view.map((s) => {
                const on = selectedSiteIds.includes(s.id);
                return (
                  <tr key={s.id} onClick={() => selectSite(s.id)} className={`cursor-pointer border-b border-white/5 hover:bg-white/5 ${selectedSiteId === s.id ? 'bg-blue-500/10' : ''}`}>
                    <td className="py-1.5" onClick={(e) => { e.stopPropagation(); toggleSite(s.id); }}>
                      <span className={`inline-flex w-3.5 h-3.5 rounded-sm border items-center justify-center ${on ? 'bg-blue-500 border-blue-500' : 'border-white/30'}`}>
                        {on && <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </span>
                    </td>
                    <td className="py-1.5"><PriBadge p={s.priority} /></td>
                    <td className="py-1.5 max-w-[150px] truncate text-white/80" title={s.name}>{s.name}</td>
                    <td className="py-1.5 text-right font-bold tabular-nums text-blue-400">{s.score}</td>
                    <td className="py-1.5 text-right text-white/60 tabular-nums">{s.coverage}%</td>
                    <td className="py-1.5 text-right text-white/60 tabular-nums">{s.prb}%</td>
                    <td className="py-1.5 text-right text-white/70 tabular-nums">{s.potentialUsers}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-white/40">
              <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-2 py-0.5 rounded border border-white/10 disabled:opacity-30">‹</button>
              {Array.from({ length: pages }, (_, i) => <button key={i} onClick={() => setPage(i)} className={`px-2 py-0.5 rounded border ${page === i ? 'border-blue-500/50 text-blue-300' : 'border-white/10'}`}>{i + 1}</button>)}
              <button disabled={page === pages - 1} onClick={() => setPage(page + 1)} className="px-2 py-0.5 rounded border border-white/10 disabled:opacity-30">›</button>
            </div>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold mb-2">收益预估 <span className="text-white/40 text-xs font-normal">· 按已选 {chosen.length} 站</span></div>
          <div className="grid grid-cols-3 gap-2.5">
            <RoiCard label="新增用户" value={aggNewUsers.toLocaleString()} unit="人" color="#3b82f6" />
            <RoiCard label="收入增长" value={`${aggRevenue}`} unit="万/月" color="#10b981" />
            <RoiCard label="流量增长" value={aggTraffic.toLocaleString()} unit="GB/日" color="#eab308" />
            <RoiCard label="平均覆盖率" value={avgCov ? avgCov.toFixed(1) : '—'} unit="%" color="#22d3ee" />
            <RoiCard label="建设投资" value={`${invest}`} unit="万元" color="#a78bfa" />
            <RoiCard label="投资回报期" value={payback ? `${payback}` : '—'} unit="个月" color="#f97316" />
          </div>
        </div>
      </div>
      <div className="flex-1 relative min-w-0">
        <MapView mode="planning" />
        <LayerManager mode="planning" />
        <Legend mode="planning" />
      </div>
    </>
  );
}

/* ───────── 网络仿真优化（仿真方案对比 + 站点价值排序）───────── */
function SimTab({ taz, sites }: { taz: Taz; sites: PlanSite[] }) {
  const scenarios = useMemo(() => buildScenarios(sites), [sites]);
  const setSites = useStore((s) => s.setSites);
  const [sel, setSel] = useState<Scenario['key']>('balanced');
  const cur = scenarios.find((s) => s.key === sel)!;
  // 选定方案 → 联动地图覆盖（仅当站点集合变化时设置，避免无限循环）
  const idsKey = cur.sites.map((s) => s.id).join(',');
  useEffect(() => { setSites(idsKey ? idsKey.split(',') : []); }, [idsKey, setSites]);
  const ranked = [...sites].sort((a, b) => b.score - a.score).slice(0, 6);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 方案对比卡 */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold flex items-center gap-2"><span className="text-blue-400">▣</span>仿真方案对比</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300">当前：{cur.label}</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {scenarios.map((s) => (
            <div key={s.key} onClick={() => setSel(s.key)} className={`rounded-lg p-3 cursor-pointer border ${sel === s.key ? 'border-blue-500/70 bg-blue-500/10' : 'border-white/10 bg-[#0f0f0f] hover:border-white/25'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold">{s.label}{sel === s.key && <span className="text-blue-300 ml-1">★</span>}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center">
                <SimStat l="站点" v={`${s.n}个`} />
                <SimStat l="覆盖" v={`${s.coverage}%`} c="#22c55e" />
                <SimStat l="投资" v={`¥${s.invest}万`} c="#a78bfa" />
                <SimStat l="ROI" v={`${s.roiYears}年`} c="#f97316" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        {/* 站点价值排序 */}
        <div className="w-[290px] shrink-0 border-r border-white/10 overflow-y-auto p-3">
          <div className="text-xs font-semibold mb-2 flex items-center gap-1.5"><span className="text-blue-400">↗</span>站点价值排序</div>
          <div className="space-y-2">
            {ranked.map((s, i) => {
              const market = Math.round((s.potentialUsers / 600) * 40);
              const cov = Math.round(s.coverage * 0.34);
              const eff = Math.round((s.score / siteCost(s)) * 14);
              const inSc = cur.sites.some((x) => x.id === s.id);
              return (
                <div key={s.id} className={`rounded-lg p-2.5 border ${inSc ? 'border-blue-500/50 bg-blue-500/[0.06]' : 'border-white/10 bg-[#0f0f0f]'}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-xs font-semibold truncate flex-1" title={s.name}>{s.name}</span>
                    <span className="text-sm font-bold text-blue-400">{s.score}分</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center">
                    <ValSub l="市场价值" v={market} />
                    <ValSub l="覆盖价值" v={cov} />
                    <ValSub l="投资效率" v={eff} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* 多维图层可视化（地图 + 覆盖仿真）*/}
        <div className="flex-1 relative min-w-0">
          <MapView mode="planning" />
          <LayerManager mode="planning" />
          <Legend mode="planning" />
        </div>
      </div>
    </div>
  );
}

/* ───────── 综合价值测算 ───────── */
function ValueTab({ sites }: { sites: PlanSite[] }) {
  const scenarios = useMemo(() => buildScenarios(sites), [sites]);
  const [sel, setSel] = useState<Scenario['key']>('balanced');
  const sc = scenarios.find((s) => s.key === sel)!;

  const monthly = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const t = (i + 1) / 12;
    return { m: `${i + 1}月`, 用户数: Math.round(sc.users * Math.pow(t, 0.85)), 收入: Math.round(sc.revenueY * Math.pow(t, 0.9) * 10) / 10, 流量: Math.round(sc.trafficGrowth * t) };
  }), [sc]);

  const radar = [
    { dim: '覆盖率', v: Math.round(sc.coverage) },
    { dim: '用户增长', v: Math.min(100, Math.round(sc.users / 28)) },
    { dim: '收入增长', v: Math.min(100, Math.round(sc.revenueY / 13)) },
    { dim: '投资效率', v: Math.min(100, Math.round((sc.users / Math.max(1, sc.invest)) * 8)) },
    { dim: 'ROI表现', v: Math.min(100, Math.round(100 - sc.roiYears * 22)) },
  ];
  const overall = Math.round((radar.reduce((a, b) => a + b.v, 0) / radar.length) * 10) / 10;
  const bestDim = radar.reduce((a, b) => (b.v > a.v ? b : a)).dim;
  const equip = Math.round(sc.invest * 0.6), eng = Math.round(sc.invest * 0.3), other = sc.invest - equip - eng;
  const pkg = Math.round(sc.revenueY * 0.7), flow = Math.round(sc.revenueY * 0.2), vas = Math.round((sc.revenueY - pkg - flow) * 10) / 10;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {/* 方案切换 */}
      <div className="flex justify-center gap-1 bg-[#0f0f0f] border border-white/10 rounded-lg p-1 w-fit mx-auto">
        {scenarios.map((s) => (
          <button key={s.key} onClick={() => setSel(s.key)} className={`px-4 py-1.5 rounded-md text-xs ${sel === s.key ? 'bg-blue-500/20 text-blue-300' : 'text-white/55'}`}>
            {s.label}<span className="text-white/35 ml-1.5">{s.n}站点 / ROI {s.roiYears}年</span>
          </button>
        ))}
      </div>
      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        <KpiBig label="发展用户数" value={sc.users.toLocaleString()} sub="预计净增" color="#3b82f6" />
        <KpiBig label="收入增长" value={`¥${sc.revenueY}万`} sub="12个月累计" color="#10b981" />
        <KpiBig label="流量增长" value={`${sc.trafficGrowth}%`} sub="月均增长" color="#22d3ee" />
        <KpiBig label="投资回报期" value={`${sc.roiYears}年`} sub="预计ROI" color="#a78bfa" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* 月度趋势 */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3">
          <div className="text-xs font-semibold mb-1">月度发展趋势 <span className="text-white/40 font-normal">12个月预测</span></div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="m" tick={{ fontSize: 9, fill: '#94a3b8' }} interval={1} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={30} />
                <Tooltip contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,.12)', borderRadius: 6, fontSize: 11 }} />
                <Line type="monotone" dataKey="用户数" stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* 雷达 */}
        <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold">综合评估雷达图</span>
            <div className="text-right"><span className="text-[10px] text-white/40">综合得分 </span><b className="text-blue-400">{overall}</b></div>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="70%">
                <PolarGrid stroke="rgba(255,255,255,0.12)" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#475569' }} axisLine={false} />
                <Radar dataKey="v" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.32} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-white/45 text-center">优势维度：<b className="text-blue-300">{bestDim}</b></div>
        </div>
      </div>
      {/* 投资与回报 */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3">
        <div className="text-xs font-semibold mb-2">投资与回报分析</div>
        <div className="grid grid-cols-3 gap-4 text-[11px]">
          <div>
            <div className="text-white/45 mb-1">总投资 <b className="text-purple-300">¥{sc.invest}万</b></div>
            <Bd l="设备投资" v={equip} c="#3b82f6" max={sc.invest} />
            <Bd l="工程建设" v={eng} c="#22d3ee" max={sc.invest} />
            <Bd l="其他费用" v={other} c="#64748b" max={sc.invest} />
          </div>
          <div>
            <div className="text-white/45 mb-1">预期收益 <b className="text-emerald-300">¥{sc.revenueY}万/年</b></div>
            <Bd l="套餐收入" v={pkg} c="#10b981" max={sc.revenueY} />
            <Bd l="流量收入" v={flow} c="#22c55e" max={sc.revenueY} />
            <Bd l="增值服务" v={vas} c="#84cc16" max={sc.revenueY} />
          </div>
          <div>
            <div className="text-white/45 mb-1">投资回报 <b className="text-orange-300">{sc.roiYears}年</b></div>
            <div className="text-[10px] text-white/50 leading-relaxed mt-1">建 {sc.n} 站、覆盖 {sc.coverage}%；预计净增 {sc.users.toLocaleString()} 用户，年收益 ¥{sc.revenueY}万，{sc.roiYears <= 2.2 ? '回报周期优、建议优先实施' : sc.roiYears <= 2.6 ? '回报周期合理、可纳入计划' : '回报偏慢、建议精选高价值站'}。</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── 小组件 ───────── */
function RoiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-2.5">
      <div className="text-[11px] text-white/50">{label}</div>
      <div className="mt-0.5"><span className="text-xl font-bold" style={{ color }}>{value}</span><span className="text-[11px] text-white/40 ml-1">{unit}</span></div>
    </div>
  );
}
function SimStat({ l, v, c }: { l: string; v: string; c?: string }) {
  return <div><div className="text-[8px] text-white/40">{l}</div><div className="text-[11px] font-bold" style={{ color: c ?? '#e5e7eb' }}>{v}</div></div>;
}
function ValSub({ l, v }: { l: string; v: number }) {
  return <div><div className="text-[8px] text-white/40">{l}</div><div className="text-xs font-bold text-white/85">{v}</div></div>;
}
function KpiBig({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3">
      <div className="text-[11px] text-white/50">{label}</div>
      <div className="text-2xl font-bold mt-0.5" style={{ color }}>{value}</div>
      <div className="text-[10px] text-white/40 mt-0.5">{sub}</div>
    </div>
  );
}
function Bd({ l, v, c, max }: { l: string; v: number; c: string; max: number }) {
  return (
    <div className="mb-1">
      <div className="flex justify-between text-[10px]"><span className="text-white/55">{l}</span><span className="text-white/75 tabular-nums">¥{v}万</span></div>
      <div className="h-1.5 rounded bg-white/10 mt-0.5"><div className="h-full rounded" style={{ width: `${Math.min(100, (v / Math.max(1, max)) * 100)}%`, background: c }} /></div>
    </div>
  );
}
function PriBadge({ p }: { p: Priority }) {
  const c = PRIORITY_COLOR[p];
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ color: c, background: `${c}22` }}>{p}</span>;
}
