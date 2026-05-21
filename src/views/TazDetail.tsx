import { useMemo, useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip, Legend as RLegend, ResponsiveContainer } from 'recharts';
import { useStore } from '../store';
import { METRICS, type Taz, type MetricKey, type PoorRow } from '../types';
import { computeWeighted, valueLevel, type Weights } from '../lib/scoring';
import { diagnoseTaz } from '../lib/diagnose';
import MapView from '../map/MapView';
import LayerManager from '../components/LayerManager';
import Legend from '../components/Legend';
import AiAssistant from '../components/AiAssistant';

export default function TazDetail() {
  const taz = useStore((s) => s.dataset!.tazList.find((t) => t.id === s.selectedTazId));
  const back = useStore((s) => s.back);
  const openPlanning = useStore((s) => s.openPlanning);
  const [tab, setTab] = useState<'overview' | 'ai'>('overview');
  if (!taz) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 shrink-0 flex items-center px-4 gap-4 border-b border-white/10 bg-[#0f0f0f]">
        <button onClick={back} className="flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <svg width="14" height="14" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" fill="none"><path d="M10 3l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>返回
        </button>
        <div className="h-5 w-px bg-white/10" />
        <b className="text-sm">{taz.name}</b>
        <span className="text-xs text-white/45">承建方：{taz.contractor}</span>
        <span className="text-xs text-white/45">类别：{taz.type}</span>
        <span className="text-xs text-white/45">行政区划：{taz.district}</span>
        <span className="text-[10px] text-white/30">TAZ ID: {taz.code}</span>
        <button onClick={() => openPlanning(taz.id)} className="ml-auto text-xs px-3 py-1.5 rounded-md bg-blue-500/15 text-blue-300 hover:bg-blue-500/25">进入建站规划 →</button>
      </div>
      <div className="flex-1 flex overflow-hidden relative">
        <div className="w-[550px] shrink-0 border-r border-white/10 flex flex-col bg-[#0a0a0a]">
          <div className="flex border-b border-white/10 text-xs shrink-0">
            <Tab active={tab === 'overview'} onClick={() => setTab('overview')}>TAZ 环境概览</Tab>
            <Tab active={tab === 'ai'} onClick={() => setTab('ai')}>AI 助手</Tab>
          </div>
          {tab === 'overview' ? <Overview taz={taz} /> : <AiAssistant taz={taz} mode="score" />}
        </div>
        <div className="flex-1 relative">
          <MapView mode="detail" />
          <LayerManager mode="detail" />
          <Legend mode="detail" />
        </div>
      </div>
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`px-4 py-2.5 font-medium transition-colors ${active ? 'text-blue-300 border-b-2 border-blue-500 bg-blue-500/10' : 'text-white/50 hover:text-white'}`}>{children}</button>;
}

function Overview({ taz }: { taz: Taz }) {
  const weights = useStore((s) => s.weights);
  const setWeights = useStore((s) => s.setWeights);
  const resetWeights = useStore((s) => s.resetWeights);
  const grids = useStore((s) => s.dataset!.grids);
  const rank = useStore((s) => s.dataset!.tazList.filter((t) => t.weightedScore > taz.weightedScore).length + 1);
  const [editW, setEditW] = useState(false);
  const [sortByScore, setSortByScore] = useState(false);
  const [disabled, setDisabled] = useState<Set<MetricKey>>(new Set());

  const effWeights = useMemo(() => {
    const w = { ...weights } as Weights;
    for (const k of disabled) w[k] = 0;
    return w;
  }, [weights, disabled]);
  const liveScore = useMemo(() => computeWeighted(taz, effWeights), [taz, effWeights]);
  const liveLevel = valueLevel(liveScore);
  const diag = useMemo(() => diagnoseTaz(taz, grids), [taz, grids]);

  const radarData = METRICS.filter((m) => !disabled.has(m.key)).map((m) => ({ metric: m.label, score: taz.metrics[m.key].score }));
  const metricRows = useMemo(() => {
    const rows = METRICS.map((m) => ({ ...m, score: taz.metrics[m.key].score, raw: taz.metrics[m.key].raw, w: weights[m.key] }));
    return sortByScore ? [...rows].sort((a, b) => b.score - a.score) : rows;
  }, [taz, weights, sortByScore]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/60">TAZ 排序 #{rank}</span>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: '#3b82f622', color: '#93c5fd' }}>活跃指数：{taz.activeIndex}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/60">{taz.poiCategory}</span>
        </div>
        <h2 className="text-base font-bold">{taz.name}</h2>
        <p className="text-xs text-white/55 leading-relaxed mt-1.5">{taz.description}</p>
      </div>

      {/* 主要业务体验指标（栅格联动） */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3">
        <div className="text-xs font-semibold mb-2">主要业务与体验指标 <span className="text-white/40 font-normal">· 智能板栅格联动</span></div>
        <div className="grid grid-cols-3 gap-2">
          {diag.topBiz.map((b) => (
            <div key={b.label} className="bg-white/5 rounded px-2 py-1.5 text-center">
              <div className="text-base font-bold text-blue-300">{b.value}</div>
              <div className="text-[9px] text-white/45">{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 雷达 + 综合得分 */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold">网络多维画像</span>
          <div className="text-right">
            <div className="text-[10px] text-white/40">综合得分</div>
            <div className="text-2xl font-bold text-blue-400 leading-none">{liveScore.toFixed(2)}</div>
            <div className="text-[10px]" style={{ color: liveLevel === '高价值区域' ? '#ef4444' : liveLevel === '中价值区域' ? '#f97316' : '#10b981' }}>{liveLevel}</div>
          </div>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="rgba(255,255,255,0.12)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 8, fill: '#475569' }} axisLine={false} />
              <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 指标详情（勾选 + 权重） */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold">指标详情 <span className="text-white/40 font-normal">· 勾选纳入打分</span></span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSortByScore(!sortByScore)} className={`text-[10px] px-2 py-0.5 rounded border ${sortByScore ? 'border-blue-500/50 text-blue-300' : 'border-white/15 text-white/50'}`}>按得分排序</button>
            <button onClick={() => setEditW(!editW)} className={`text-[10px] px-2 py-0.5 rounded border ${editW ? 'border-blue-500/50 text-blue-300' : 'border-white/15 text-white/50'}`}>编辑权重</button>
            {editW && <button onClick={resetWeights} className="text-[10px] px-2 py-0.5 rounded border border-white/15 text-white/50">重置</button>}
          </div>
        </div>
        <table className="w-full text-xs">
          <thead><tr className="text-white/40 text-[10px] uppercase border-b border-white/10">
            <th className="text-left py-1.5 font-medium">指标</th><th className="text-right py-1.5 font-medium">原始值</th><th className="text-right py-1.5 font-medium">权重</th><th className="text-right py-1.5 font-medium">得分</th>
          </tr></thead>
          <tbody>
            {metricRows.map((m) => {
              const off = disabled.has(m.key);
              return (
                <tr key={m.key} className={`border-b border-white/5 ${off ? 'opacity-40' : ''}`}>
                  <td className="py-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={!off} onChange={() => setDisabled((s) => { const n = new Set(s); n.has(m.key) ? n.delete(m.key) : n.add(m.key); return n; })} className="accent-blue-500 w-3 h-3" />
                      <span className="text-white/75">{m.label}</span>
                    </label>
                  </td>
                  <td className="py-1.5 text-right text-white/50 tabular-nums">{typeof m.raw === 'number' ? m.raw.toLocaleString() : m.raw}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {editW ? <input type="number" min={0} max={100} value={Math.round(m.w * 100)} onChange={(e) => setWeights({ ...weights, [m.key]: Math.max(0, Number(e.target.value)) / 100 })} className="w-12 bg-[#1a1a1a] border border-white/15 rounded px-1 py-0.5 text-right text-white/80 outline-none focus:border-blue-500/50" /> : <span className="text-white/50">{(m.w * 100).toFixed(0)}%</span>}
                  </td>
                  <td className="py-1.5 text-right"><span className="inline-block w-6 text-center font-bold tabular-nums" style={{ color: scoreColor(m.score) }}>{m.score}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 体验质差栅格识别 + 根因推理 */}
      <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3" style={{ borderColor: diag.poorCount > 0 ? 'rgba(239,68,68,.35)' : undefined }}>
        <div className="text-xs font-semibold mb-2">体验质差栅格识别 · 根因推理引擎</div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Mini v={`${diag.poorCount}/${diag.total}`} l="质差/总栅格" c="#ef4444" />
          <Mini v={`${diag.poorRatio}%`} l="质差栅格占比" c="#f97316" />
          <Mini v={diag.needNewSite ? '建议新建' : '优化为主'} l="处置建议" c={diag.needNewSite ? '#ef4444' : '#10b981'} />
        </div>
        <div className="space-y-1 text-[11px]">
          <RowKV k="主根因" v={<span className="text-orange-300 font-medium">{diag.causeLabel}</span>} />
          <RowKV k="推理依据" v={diag.evidence} />
          <RowKV k="优化建议" v={diag.optimize} />
          <RowKV k="新建建议" v={diag.build} />
        </div>
      </div>

      <DeepDive taz={taz} />
    </div>
  );
}

function scoreColor(s: number) { return ['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444'][Math.max(0, Math.min(4, s - 1))]; }
function Mini({ v, l, c }: { v: string; l: string; c?: string }) { return <div className="bg-white/5 rounded px-2 py-1.5 text-center"><div className="text-sm font-bold" style={{ color: c ?? '#fff' }}>{v}</div><div className="text-[9px] text-white/45 mt-0.5">{l}</div></div>; }
function RowKV({ k, v }: { k: string; v: React.ReactNode }) { return <div><span className="text-white/40">{k}：</span><span className="text-white/80">{v}</span></div>; }

function DeepDive({ taz }: { taz: Taz }) {
  const [tab, setTab] = useState<'env' | 'social' | 'net'>('env');
  const [netTab, setNetTab] = useState<'metric' | 'biz' | 'compete'>('metric');
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3">
      <div className="text-xs font-semibold mb-2">区域特征深度解读</div>
      <div className="flex gap-1 mb-3">
        {([['env', '环境'], ['social', '社会'], ['net', '网络']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`text-[11px] px-3 py-1 rounded ${tab === k ? 'bg-blue-500/20 text-blue-300' : 'text-white/50 bg-white/5'}`}>{l}</button>
        ))}
      </div>
      {tab === 'env' && (
        <div className="space-y-2.5">
          {taz.buildings.map((b, i) => (
            <div key={i} className="border-l-2 border-blue-500/40 pl-2.5">
              <div className="text-xs font-medium text-white/85">{b.name}</div>
              <div className="text-[11px] text-white/50 mt-0.5"><span className="text-white/35">功能定位：</span>{b.role}</div>
              <div className="text-[11px] text-white/50"><span className="text-white/35">面积：</span>{b.area}</div>
              <div className="text-[11px] text-white/50"><span className="text-white/35">主要活动：</span>{b.activity}</div>
            </div>
          ))}
        </div>
      )}
      {tab === 'social' && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Mini v={taz.population.toLocaleString()} l="常住人口" />
          <Mini v={`${taz.dailyTrafficGB.toLocaleString()} GB`} l="日均流量" />
          <Mini v={`${taz.complaintCount}`} l="投诉数" c="#ef4444" />
          <Mini v={`${taz.gridCount}`} l="关联栅格" />
          <Mini v={`${taz.metrics.valueBusiness.raw}%`} l="高价值商业比" c="#eab308" />
          <Mini v={`${Number(taz.metrics.popDensity.raw).toLocaleString()}`} l="人口密度(人/km²)" />
        </div>
      )}
      {tab === 'net' && (
        <div>
          <div className="flex gap-1 mb-2">
            {([['metric', '指标质差'], ['biz', '业务质差'], ['compete', '竞对分析']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setNetTab(k)} className={`text-[10px] px-2.5 py-0.5 rounded ${netTab === k ? 'bg-white/15 text-white' : 'text-white/45 bg-white/5'}`}>{l}</button>
            ))}
          </div>
          {netTab === 'compete' ? <Compete taz={taz} /> : <PoorTable rows={netTab === 'metric' ? taz.poorRows : taz.bizPoorRows} />}
        </div>
      )}
    </div>
  );
}

function Compete({ taz }: { taz: Taz }) {
  const { cmcc, telecom, unicom } = taz.competitors;
  const data = [
    { dim: '覆盖', 移动: cmcc.coverage, 电信: telecom.coverage, 联通: unicom.coverage },
    { dim: '质量', 移动: cmcc.quality, 电信: telecom.quality, 联通: unicom.quality },
    { dim: '体验', 移动: cmcc.experience, 电信: telecom.experience, 联通: unicom.experience },
  ];
  const cmccAvg = (cmcc.coverage + cmcc.quality + cmcc.experience) / 3;
  const bestComp = Math.max((telecom.coverage + telecom.quality + telecom.experience) / 3, (unicom.coverage + unicom.quality + unicom.experience) / 3);
  const lead = cmccAvg - bestComp;
  const weakDim = data.reduce((a, b) => (b['移动'] - Math.max(b['电信'], b['联通']) < a['移动'] - Math.max(a['电信'], a['联通']) ? b : a));
  return (
    <div>
      <div className="text-[10px] text-white/45 mb-1">三家运营商 覆盖/质量/体验 对比（0~100）</div>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
            <XAxis dataKey="dim" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} width={28} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,.12)', borderRadius: 6, fontSize: 11 }} />
            <RLegend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="移动" fill="#3b82f6" radius={[2, 2, 0, 0]} />
            <Bar dataKey="电信" fill="#22c55e" radius={[2, 2, 0, 0]} />
            <Bar dataKey="联通" fill="#ef4444" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* 三家原始指标对比（栅格级OTT竞对：RSRP/SINR/采样数） */}
      <table className="w-full text-[10.5px] mt-2">
        <thead>
          <tr className="text-white/40 text-[9px] border-b border-white/10">
            <th className="text-left py-1">运营商</th>
            <th className="text-right py-1">RSRP(dBm)</th>
            <th className="text-right py-1">SINR(dB)</th>
            <th className="text-right py-1">采样数</th>
          </tr>
        </thead>
        <tbody>
          {([['移动', cmcc, '#3b82f6'], ['电信', telecom, '#22c55e'], ['联通', unicom, '#ef4444']] as const).map(([n, o, col]) => (
            <tr key={n} className="border-b border-white/5">
              <td className="py-1" style={{ color: col, fontWeight: 600 }}>{n}</td>
              <td className="py-1 text-right tabular-nums" style={{ color: o.rsrp <= -100 ? '#ef4444' : '#e5e7eb' }}>{o.rsrp}</td>
              <td className="py-1 text-right tabular-nums" style={{ color: o.sinr < 3 ? '#ef4444' : '#e5e7eb' }}>{o.sinr}</td>
              <td className="py-1 text-right text-white/55 tabular-nums">{o.samples}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-[11px] bg-white/5 rounded p-2 leading-relaxed">
        <b className="text-blue-300">总结建议：</b>
        移动综合 {cmccAvg.toFixed(0)} 分（RSRP {cmcc.rsrp}dBm / SINR {cmcc.sinr}dB），{lead >= 3 ? `领先竞对约 ${lead.toFixed(0)} 分，整体占优` : lead >= -3 ? '与竞对基本持平' : `落后竞对约 ${(-lead).toFixed(0)} 分`}。
        其中「{weakDim.dim}」相对最弱（移动 {weakDim['移动']} vs 竞对最高 {Math.max(weakDim['电信'], weakDim['联通'])}）。
        {lead < -3 || cmcc.coverage < 60
          ? `建议优先${weakDim.dim === '覆盖' ? '补盲补强覆盖、新增宏站/室分站点' : weakDim.dim === '质量' ? '开展干扰治理与参数优化' : '扩容与体验专项优化'}夺回竞争力；该区移动覆盖偏弱，建议纳入新建/补点计划。`
          : `建议${weakDim.dim === '覆盖' ? '局部补盲优化' : weakDim.dim === '质量' ? '干扰治理与参数优化' : '体验专项优化'}巩固优势，暂无需新建。`}
      </div>
    </div>
  );
}

function PoorTable({ rows }: { rows: PoorRow[] }) {
  return (
    <table className="w-full text-[11px]">
      <thead><tr className="text-white/40 text-[10px] border-b border-white/10">
        <th className="text-left py-1 font-medium">维度</th><th className="text-left py-1 font-medium">指标项</th><th className="text-right py-1 font-medium">质差话单</th><th className="text-right py-1 font-medium">话单总数</th><th className="text-right py-1 font-medium">质差比例</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-white/5">
            <td className="py-1 text-white/45">{r.dim}</td><td className="py-1 text-white/75">{r.item}</td>
            <td className="py-1 text-right text-white/55 tabular-nums">{r.poorCount.toLocaleString()}</td>
            <td className="py-1 text-right text-white/45 tabular-nums">{r.total.toLocaleString()}</td>
            <td className="py-1 text-right tabular-nums font-medium" style={{ color: r.ratio > 25 ? '#ef4444' : r.ratio > 12 ? '#f97316' : '#eab308' }}>{r.ratio}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
