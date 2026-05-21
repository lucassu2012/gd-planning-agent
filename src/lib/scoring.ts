import { METRICS, type MetricKey, type Taz } from '../types';

export type Weights = Record<MetricKey, number>;

export const DEFAULT_WEIGHTS: Weights = METRICS.reduce((acc, m) => {
  acc[m.key] = m.weight;
  return acc;
}, {} as Weights);

/** 加权综合得分（权重自动归一化）→ 0~5 */
export function computeWeighted(taz: Taz, weights: Weights): number {
  let sum = 0;
  let wsum = 0;
  for (const m of METRICS) {
    const w = weights[m.key] ?? 0;
    sum += (taz.metrics[m.key]?.score ?? 0) * w;
    wsum += w;
  }
  const v = wsum > 0 ? sum / wsum : 0;
  return Math.round(v * 100) / 100;
}

export function valueLevel(score: number): Taz['valueLevel'] {
  return score >= 4 ? '高价值区域' : score >= 3 ? '中价值区域' : '低价值区域';
}
