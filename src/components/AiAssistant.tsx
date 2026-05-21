import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { METRICS, type Taz } from '../types';
import { diagnoseTaz } from '../lib/diagnose';

interface Step {
  icon: string;
  title: string;
  body: string;
  tag?: string;
}

function topMetrics(taz: Taz, n = 3) {
  return [...METRICS].sort((a, b) => taz.metrics[b.key].score - taz.metrics[a.key].score).slice(0, n);
}

export default function AiAssistant({ taz, mode }: { taz: Taz; mode: 'score' | 'plan' }) {
  const grids = useStore((s) => s.dataset!.grids);
  const roi = useStore((s) => s.dataset!.roi.find((r) => r.tazId === taz.id));
  const sites = useStore((s) => s.dataset!.planSites.filter((p) => p.tazId === taz.id));
  const rank = useStore((s) => s.dataset!.tazList.filter((t) => t.weightedScore > taz.weightedScore).length + 1);

  const steps: Step[] = useMemo(() => {
    if (mode === 'score') {
      const diag = diagnoseTaz(taz, grids);
      const tops = topMetrics(taz).map((m) => `${m.label}(${taz.metrics[m.key].score}分)`).join('、');
      return [
        { icon: '🎯', title: '意图识别', tag: '自然语言→分析流水线', body: `已识别指令意图：对「${taz.name}」开展 TAZ 价值打分与质差根因解读。正在调度统一时空张量底座与多维价值评估能力…` },
        { icon: '🗄️', title: '多维数据读取', tag: '统一时空张量', body: `读取六维感知数据（覆盖/干扰/话务/体验/用户/环境）：关联 ${taz.gridCount} 个智能板 50m 栅格、${taz.complaintCount} 条投诉工单、人口 ${taz.population.toLocaleString()}、日均流量 ${taz.dailyTrafficGB} GB，并对齐三家运营商竞对数据。` },
        { icon: '🔬', title: '栅格下钻与质差归因', tag: '根因推理引擎', body: `下钻至栅格级：识别 ${diag.poorCount}/${diag.total} 个体验质差栅格（占比 ${diag.poorRatio}%）。根因推理结论：${diag.causeLabel}；依据：${diag.evidence}。` },
        { icon: '📊', title: '多维价值打分', tag: '场景-用户-业务-话务', body: `加权综合得分 ${taz.weightedScore.toFixed(1)} 分（满分5），价值等级「${taz.valueLevel}」，全域 TAZ 价值排序 #${rank}。Top 短板：${tops}。典型质差：${taz.typicalIssue}。` },
        { icon: '✅', title: '洞察结论与报告', tag: '报告生成', body: `${diag.needNewSite ? '⭐ 建议优先安排网络建设资源' : '建议以参数优化为主、持续监测'}：${diag.optimize}；${diag.build}。结构化洞察报告已生成：/result/report-${taz.code}.html` },
      ];
    }
    const top = sites[0];
    return [
      { icon: '🎯', title: '规划目标理解', tag: '意图识别', body: `理解规划目标：面向「${taz.name}」（${taz.valueLevel}，加权 ${taz.weightedScore.toFixed(1)}）开展业务价值驱动的建站规划与收益预测。` },
      { icon: '🛰️', title: '候选站址寻优', tag: '智能站址预测', body: `基于覆盖/竞对/感知/用户多维评估，在区域内寻优生成 ${sites.length} 个候选站点（含宏站/室分/杆站/小站），并按业务价值打分排序。` },
      { icon: '🏅', title: '业务价值选站', tag: '多维选站打分', body: top ? `首选「${top.name}」：打分 ${top.score}、覆盖率 ${top.coverage}%、PRB ${top.prb}%、CEI ${top.cei}、潜客 ${top.potentialUsers}（竞对排名#${top.competitorRank}）。` : '暂无候选站点。' },
      { icon: '📈', title: '收益与投资回报预测', tag: '话务/速率/覆盖预测', body: roi ? `预测该方案投运后：新增发展用户 ${roi.newUsers.toLocaleString()} 人，收入增长 ${roi.revenueWan} 万/月，流量增长 ${roi.trafficGB.toLocaleString()} GB/日，投资回报期 ${roi.paybackMonths} 个月。` : '暂无收益数据。' },
      { icon: '✅', title: '规划决策建议', tag: '决策', body: `综合价值与 ROI，建议${roi && roi.paybackMonths <= 18 ? '优先纳入近期建设计划，立即启动选址与建设资源调度' : '纳入储备并结合话务增长趋势择机建设'}；首月预计带来约 ${Math.round((roi?.newUsers ?? 1000) * 0.35)} 名新增用户，回报期优于区域平均约 15%。` },
    ];
  }, [taz, mode, grids, roi, sites, rank]);

  const [revealed, setRevealed] = useState(1); // 已展示步数
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setRevealed(1); setThinking(false); }, [taz.id, mode]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [revealed, thinking]);

  function next() {
    if (revealed >= steps.length || thinking) return;
    setThinking(true);
    setTimeout(() => { setThinking(false); setRevealed((r) => r + 1); }, 900);
  }
  const done = revealed >= steps.length && !thinking;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2 text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
        <b>{mode === 'score' ? 'TAZ 智能助手' : '规划决策 Agent'}</b>
        <span className="text-white/40">在线 · 已连接</span>
        <span className="ml-auto text-white/30">{Math.min(revealed, steps.length)}/{steps.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="self-end ml-auto max-w-[90%] rounded-lg px-3 py-2 text-[12.5px] bg-blue-600 text-white">
          {mode === 'score' ? `请对「${taz.name}」进行价值打分与质差根因分析。` : `请对「${taz.name}」的规划方案进行收益预测与决策建议。`}
        </div>

        {steps.slice(0, revealed).map((s, i) => (
          <div key={i} className="max-w-[96%] rounded-lg border border-white/10 bg-[#161616] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border-b border-white/5">
              <span>{s.icon}</span>
              <span className="text-xs font-semibold text-blue-200">{s.title}</span>
              {s.tag && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300">{s.tag}</span>}
            </div>
            <div className="px-3 py-2 text-[12px] leading-relaxed text-white/80 whitespace-pre-wrap">{s.body}</div>
          </div>
        ))}

        {thinking && (
          <div className="max-w-[60%] rounded-lg border border-white/10 bg-[#161616] px-3 py-2.5 flex items-center gap-2">
            <span className="text-xs text-white/50">AI 思考中</span>
            <span className="think-dots"><i></i><i></i><i></i></span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-3 border-t border-white/10">
        {!done ? (
          <button onClick={next} disabled={thinking} className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium flex items-center justify-center gap-1.5">
            {thinking ? '思考中…' : <>下一步 <svg width="14" height="14" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.8" fill="none"><path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" /></svg></>}
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-400">✓ 分析完成，已生成洞察结论</span>
            <button onClick={() => setRevealed(1)} className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/70 hover:border-blue-500/50">重新分析</button>
          </div>
        )}
      </div>
    </div>
  );
}
