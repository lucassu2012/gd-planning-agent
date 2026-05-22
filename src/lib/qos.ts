import type { TazQos } from '../types';

/** 业务分档门限定义（默认值取自技术文档「典型业务分档网络需求」表） */
export interface QosTierDef {
  biz: string; // 业务类型
  flow: string; // 主要业务流向
  metric: string; // 管A栅格呈现指标
  unit: string;
  dir: 'high' | 'low'; // high: 值越大越好；low: 值越小越好
  tiers: [number, number, number, number]; // 极致 / 优秀 / 良好 / 入门
  field: keyof TazQos; // 对应 TAZ 体验指标字段
}

export const DEFAULT_QOS: QosTierDef[] = [
  { biz: '视频点播', flow: '下行', metric: '承载级下行吞吐率', unit: 'Mbps', dir: 'high', tiers: [20, 15, 10, 5], field: 'vodTput' },
  { biz: '视频通话', flow: '上下行', metric: '承载级上行吞吐率', unit: 'Mbps', dir: 'high', tiers: [5, 3, 1.5, 1], field: 'vcUl' },
  { biz: '视频会议', flow: '上下行', metric: '承载级上行吞吐率', unit: 'Mbps', dir: 'high', tiers: [8, 5, 3, 1], field: 'confUl' },
  { biz: '手游', flow: '上下行', metric: '空口包时延', unit: 'ms', dir: 'low', tiers: [20, 40, 70, 100], field: 'gameLat' },
];

export const TIER_NAMES = ['极致', '优秀', '良好', '入门', '质差'];
export const TIER_COLORS = ['#16a34a', '#22c55e', '#84cc16', '#eab308', '#ef4444'];

/** 指标值 → 档位下标 0(极致)~4(质差) */
export function tierIndex(val: number, def: QosTierDef): number {
  const [t0, t1, t2, t3] = def.tiers;
  if (def.dir === 'high') {
    if (val >= t0) return 0;
    if (val >= t1) return 1;
    if (val >= t2) return 2;
    if (val >= t3) return 3;
    return 4;
  }
  if (val <= t0) return 0;
  if (val <= t1) return 1;
  if (val <= t2) return 2;
  if (val <= t3) return 3;
  return 4;
}

export interface QosResult {
  perBiz: { biz: string; val: number; unit: string; tier: number; tierName: string }[];
  avgTier: number;
  worst: number;
  severity: '低' | '中' | '高';
  isPoor: boolean;
  worstBiz: string;
}

/** 按门限对 TAZ 做质差分档判定 */
export function classifyTaz(qos: TazQos, defs: QosTierDef[]): QosResult {
  const perBiz = defs.map((d) => {
    const val = qos[d.field];
    const tier = tierIndex(val, d);
    return { biz: d.biz, val, unit: d.unit, tier, tierName: TIER_NAMES[tier] };
  });
  const avgTier = perBiz.reduce((a, b) => a + b.tier, 0) / (perBiz.length || 1);
  const worst = Math.max(...perBiz.map((b) => b.tier));
  const severity: QosResult['severity'] = avgTier >= 2.4 || worst >= 4 ? '高' : avgTier >= 1.4 || worst >= 3 ? '中' : '低';
  const isPoor = avgTier >= 1.6 || worst >= 3; // 体验未达「良好」即判质差
  const worstBiz = perBiz.reduce((a, b) => (b.tier > a.tier ? b : a)).biz;
  return { perBiz, avgTier, worst, severity, isPoor, worstBiz };
}
