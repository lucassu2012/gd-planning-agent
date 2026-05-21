import type { Taz, SmartGrid } from '../types';

export interface GridDiagnosis {
  total: number;
  poorGrids: SmartGrid[];
  poorCount: number;
  poorRatio: number; // 质差栅格占比 %
  mainCause: 'weak' | 'interf' | 'capacity' | 'mixed';
  causeLabel: string;
  evidence: string;
  optimize: string;
  build: string;
  needNewSite: boolean;
  topBiz: { label: string; value: number }[]; // 主要业务体验指标
}

/** 根因推理引擎：基于 TAZ 关联的智能板栅格识别质差并归因 */
export function diagnoseTaz(taz: Taz, grids: SmartGrid[]): GridDiagnosis {
  const cells = grids.filter((g) => g.tazId === taz.id);
  const total = cells.length;
  // 质差栅格：RTT高 / 弱覆盖 / 高质差比例
  const poorGrids = cells.filter((g) => g.poorRatio > 28 || g.rsrp < -105 || g.highLatRatio > 32 || g.loadPct > 85);
  const poorCount = poorGrids.length;
  const avg = (f: (g: SmartGrid) => number) => (poorGrids.length ? poorGrids.reduce((s, g) => s + f(g), 0) / poorGrids.length : 0);
  const weak = avg((g) => g.weakCoverRatio);
  const interf = avg((g) => g.highInterfRatio);
  const load = avg((g) => g.loadPct);

  // 归因：比较弱覆盖/干扰/容量
  const scores = { weak: weak / 40, interf: interf / 50, capacity: (load - 50) / 50 };
  let mainCause: GridDiagnosis['mainCause'] = 'mixed';
  const ent = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ent[0][1] > ent[1][1] * 1.4 && ent[0][1] > 0.25) mainCause = ent[0][0] as any;

  const M = {
    weak: { label: '弱覆盖主导', ev: `质差栅格平均弱覆盖占比 ${weak.toFixed(0)}%、RSRP 偏低`, opt: '优化主服小区下倾角与功率、补强邻区，控制过覆盖', build: '建议新增室分/微站补盲，提升深度覆盖', need: true },
    interf: { label: '高干扰(信号强质差)主导', ev: `质差栅格高干扰占比 ${interf.toFixed(0)}%，信号强但 SINR 低`, opt: 'PCI/邻区与频率优化、下压下倾角、干扰协调', build: '一般无需新建，优先参数与干扰治理', need: false },
    capacity: { label: '容量/高负荷主导', ev: `质差栅格平均负荷 ${load.toFixed(0)}%，忙时 PRB 受限`, opt: '载波聚合扩容、小区分裂、忙时负载均衡', build: '高话务区建议扩容/新建小区', need: true },
    mixed: { label: '覆盖+干扰+容量综合', ev: `弱覆盖 ${weak.toFixed(0)}% / 干扰 ${interf.toFixed(0)}% / 负荷 ${load.toFixed(0)}% 共同作用`, opt: '覆盖补强 + 干扰协调 + 容量扩容 综合治理', build: '结合价值评估择优新建', need: poorCount > total * 0.3 },
  }[mainCause];

  return {
    total,
    poorGrids,
    poorCount,
    poorRatio: total ? Math.round((poorCount / total) * 100) : 0,
    mainCause,
    causeLabel: M.label,
    evidence: M.ev,
    optimize: M.opt,
    build: M.build,
    needNewSite: M.need && poorCount >= 3,
    topBiz: [
      { label: '短视频RTT(ms)', value: Math.round(avg((g) => g.videoRtt)) },
      { label: '高时延占比(%)', value: Math.round(avg((g) => g.highLatRatio)) },
      { label: '下行吞吐(Mbps)', value: Math.round(avg((g) => g.videoTputMbps)) },
    ],
  };
}
