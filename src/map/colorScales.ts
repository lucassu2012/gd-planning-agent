import type { GridIndicator } from '../types';

// 5 段 绿→黄→红（低/中/高 通用色阶，对齐实拍图例）
const STOPS: [number, number, number][] = [
  [34, 197, 94], // green 低
  [132, 204, 22], // lime
  [234, 179, 8], // yellow 中
  [249, 115, 22], // orange
  [239, 68, 68], // red 高
];
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function scale(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const seg = t * 4;
  const i = Math.min(3, Math.floor(seg));
  const f = seg - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)];
}
export function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}
function rgba(c: [number, number, number], a: number) { return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`; }

/** 按指标值上色：dir=high 值越高越好(高→绿)；dir=low 值越低越好(低→绿) */
export function indicatorColor(v: number, ind: GridIndicator): string {
  const [lo, hi] = ind.domain;
  let t = (v - lo) / (hi - lo); // 0..1 (越大越“高”)
  t = Math.max(0, Math.min(1, t));
  // “差”的程度 = 红端。dir high: 低值差(红)→ severity = 1-t；dir low: 高值差(红)→ severity = t
  const sev = ind.dir === 'high' ? 1 - t : t;
  return rgba(scale(sev), 0.72);
}

/** 质差程度色 */
export const SEVERITY_COLOR: Record<string, string> = { 低: '#22c55e', 中: '#eab308', 高: '#ef4444' };

/** 通用 低/中/高 图例 */
export const LMH_LEGEND = [
  { label: '低', color: '#22c55e' },
  { label: '中', color: '#eab308' },
  { label: '高', color: '#ef4444' },
];

/** RSRP 分档（用于 TAZ 详情 RSRP 图例，对齐 ≤-115~-70） */
export const RSRP_BANDS = [
  { label: '≤-115', max: -115, color: '#7f1d1d' },
  { label: '-115~-105', max: -105, color: '#ef4444' },
  { label: '-105~-95', max: -95, color: '#f97316' },
  { label: '-95~-85', max: -85, color: '#eab308' },
  { label: '-85~-70', max: -70, color: '#84cc16' },
  { label: '>-70', max: 0, color: '#22c55e' },
];
export function rsrpBandColor(v: number): string {
  for (const b of RSRP_BANDS) if (v <= b.max) return b.color;
  return '#22c55e';
}
