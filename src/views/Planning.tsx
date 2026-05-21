import { useState } from 'react';
import { useStore } from '../store';
import { PRIORITY_COLOR, type Priority } from '../types';
import MapView from '../map/MapView';
import LayerManager from '../components/LayerManager';
import Legend from '../components/Legend';
import AiAssistant from '../components/AiAssistant';

const PAGE = 8;

export default function Planning() {
  const taz = useStore((s) => s.dataset!.tazList.find((t) => t.id === s.planTazId));
  const sites = useStore((s) => s.dataset!.planSites.filter((p) => p.tazId === s.planTazId));
  const roi = useStore((s) => s.dataset!.roi.find((r) => r.tazId === s.planTazId));
  const selectedSiteId = useStore((s) => s.selectedSiteId);
  const selectSite = useStore((s) => s.selectSite);
  const selectedSiteIds = useStore((s) => s.selectedSiteIds);
  const toggleSite = useStore((s) => s.toggleSite);
  const back = useStore((s) => s.back);
  const [page, setPage] = useState(0);
  if (!taz) return null;

  const pages = Math.max(1, Math.ceil(sites.length / PAGE));
  const view = sites.slice(page * PAGE, page * PAGE + PAGE);

  // 按勾选站点聚合规划收益（移动规划部门视角：选哪些站、覆盖多大、收益多少）
  const chosen = sites.filter((s) => selectedSiteIds.includes(s.id));
  const sumUsers = chosen.reduce((a, s) => a + s.potentialUsers, 0);
  const aggNewUsers = Math.round(sumUsers * 0.42);
  const aggRevenue = Math.round(aggNewUsers * 0.0052 * 10) / 10; // 万/月
  const aggTraffic = Math.round(chosen.reduce((a, s) => a + s.potentialUsers * 0.8, 0));
  const avgCov = chosen.length ? (chosen.reduce((a, s) => a + s.coverage, 0) / chosen.length) : 0;
  const invest = chosen.reduce((a, s) => a + (s.name.includes('室分') ? 35 : s.name.includes('杆') ? 12 : 60), 0); // 万元
  const payback = aggRevenue > 0 ? Math.max(6, Math.round(invest / aggRevenue)) : 0;

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 shrink-0 flex items-center px-4 gap-3 border-b border-white/10 bg-[#0f0f0f]">
        <button onClick={back} className="flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <svg width="14" height="14" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" fill="none"><path d="M10 3l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          返回分析
        </button>
        <div className="h-5 w-px bg-white/10" />
        <b className="text-sm">TAZ 网络规划方案：{taz.name}</b>
        <span className="text-xs text-white/40">智能规划建议视图</span>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="w-[560px] shrink-0 border-r border-white/10 flex flex-col bg-[#0a0a0a]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* 站点列表 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">规划方案列表 <span className="text-blue-300 text-xs font-normal">已选 {chosen.length}/{sites.length}</span></span>
                <span className="text-xs text-white/40">勾选站点 → 地图联动覆盖</span>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-white/40 text-[10px] uppercase border-b border-white/10">
                    <th className="py-1.5 w-6"></th>
                    <th className="text-left py-1.5 font-medium">优先级</th>
                    <th className="text-left py-1.5 font-medium">站点名称</th>
                    <th className="text-right py-1.5 font-medium">打分</th>
                    <th className="text-right py-1.5 font-medium">覆盖率</th>
                    <th className="text-right py-1.5 font-medium">PRB</th>
                    <th className="text-right py-1.5 font-medium">CEI</th>
                    <th className="text-right py-1.5 font-medium">竞对</th>
                    <th className="text-right py-1.5 font-medium">潜客</th>
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
                      <td className="py-1.5 max-w-[130px] truncate text-white/80" title={s.name}>{s.name}</td>
                      <td className="py-1.5 text-right font-bold tabular-nums" style={{ color: '#3b82f6' }}>{s.score}</td>
                      <td className="py-1.5 text-right text-white/60 tabular-nums">{s.coverage}%</td>
                      <td className="py-1.5 text-right text-white/60 tabular-nums">{s.prb}%</td>
                      <td className="py-1.5 text-right text-white/60 tabular-nums">{s.cei}</td>
                      <td className="py-1.5 text-right text-white/50 tabular-nums">#{s.competitorRank}</td>
                      <td className="py-1.5 text-right text-white/70 tabular-nums">{s.potentialUsers}</td>
                    </tr>
                  ); })}
                </tbody>
              </table>
              {pages > 1 && (
                <div className="flex items-center justify-between mt-2 text-[10px] text-white/40">
                  <span>第 {page * PAGE + 1}-{Math.min((page + 1) * PAGE, sites.length)} 条 / 共 {sites.length}</span>
                  <div className="flex gap-1">
                    <button disabled={page === 0} onClick={() => setPage(page - 1)} className="px-2 py-0.5 rounded border border-white/10 disabled:opacity-30">‹</button>
                    {Array.from({ length: pages }, (_, i) => (
                      <button key={i} onClick={() => setPage(i)} className={`px-2 py-0.5 rounded border ${page === i ? 'border-blue-500/50 text-blue-300' : 'border-white/10'}`}>{i + 1}</button>
                    ))}
                    <button disabled={page === pages - 1} onClick={() => setPage(page + 1)} className="px-2 py-0.5 rounded border border-white/10 disabled:opacity-30">›</button>
                  </div>
                </div>
              )}
            </div>

            {/* 收益预估 */}
            <div>
              <div className="text-sm font-semibold mb-2">规划方案收益预估 <span className="text-white/40 text-xs font-normal">· 按已选 {chosen.length} 站测算</span></div>
              <div className="grid grid-cols-3 gap-2.5">
                <RoiCard label="新增发展用户" value={aggNewUsers.toLocaleString()} unit="人" color="#3b82f6" />
                <RoiCard label="收入增长" value={`${aggRevenue}`} unit="万/月" color="#10b981" />
                <RoiCard label="流量增长" value={aggTraffic.toLocaleString()} unit="GB/日" color="#eab308" />
                <RoiCard label="平均覆盖率" value={avgCov ? avgCov.toFixed(1) : '—'} unit="%" color="#22d3ee" />
                <RoiCard label="建设投资" value={`${invest}`} unit="万元" color="#a78bfa" />
                <RoiCard label="投资回报期" value={payback ? `${payback}` : '—'} unit="个月" color="#f97316" />
              </div>
            </div>

            {/* 规划能力模块 */}
            <div>
              <div className="text-sm font-semibold mb-2">规划能力模块 <span className="text-white/40 text-xs font-normal">网络评估·预测</span></div>
              <div className="grid grid-cols-2 gap-2.5">
                <Cap icon="📈" name="话务预测" desc="历史话统→未来N小时/天小区级上下行PRB利用率与激活用户" stat={`忙时PRB ${taz.metrics.highLoad.raw}%`} />
                <Cap icon="🚀" name="速率预测" desc="现网结构下新发放业务的栅格级速率满足度仿真" stat={`下行均速 ${(taz.weightedScore * 12 + 30).toFixed(0)}Mbps`} />
                <Cap icon="📶" name="覆盖预测" desc="规划/优化前后小区栅格级覆盖电平(RSRP)预测" stat={`覆盖率 ${(99 - Number(taz.metrics.weakCover.raw)).toFixed(0)}%`} />
                <Cap icon="🏆" name="价值排序" desc="覆盖/竞对/感知/用户多维业务价值选站打分排序" stat={`价值 ${taz.weightedScore.toFixed(1)}/5`} />
              </div>
            </div>
          </div>

          {/* 规划决策 Agent */}
          <div className="h-[300px] shrink-0 border-t border-white/10 flex flex-col">
            <AiAssistant taz={taz} mode="plan" />
          </div>
        </div>

        <div className="flex-1 relative">
          <MapView mode="planning" />
          <LayerManager mode="planning" />
          <Legend mode="planning" />
        </div>
      </div>
    </div>
  );
}

function RoiCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3">
      <div className="text-[11px] text-white/50">{label}</div>
      <div className="mt-1">
        <span className="text-2xl font-bold" style={{ color }}>{value}</span>
        <span className="text-[11px] text-white/40 ml-1">{unit}</span>
      </div>
    </div>
  );
}
function PriBadge({ p }: { p: Priority }) {
  const c = PRIORITY_COLOR[p];
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ color: c, background: `${c}22` }}>{p}</span>;
}
function Cap({ icon, name, desc, stat }: { icon: string; name: string; desc: string; stat: string }) {
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-2.5 hover:border-blue-500/40 transition-colors">
      <div className="flex items-center gap-1.5 mb-1"><span>{icon}</span><span className="text-xs font-semibold">{name}</span></div>
      <div className="text-[10px] text-white/45 leading-snug mb-1.5" style={{ minHeight: 26 }}>{desc}</div>
      <div className="text-[11px] font-bold text-blue-300">{stat}</div>
    </div>
  );
}
