import { useStore } from '../store';
import { POI_CATEGORIES, POI_COLOR, GRID_CATALOG } from '../types';
import { LMH_LEGEND, RSRP_BANDS } from '../map/colorScales';

export default function Legend({ mode }: { mode: 'global' | 'detail' | 'planning' }) {
  const layers = useStore((s) => s.layers);
  const gridCategory = useStore((s) => s.gridCategory);
  const gridField = useStore((s) => s.gridField);

  let title = '';
  let body: React.ReactNode = null;

  if (mode === 'detail') {
    title = 'RSRP (dBm)';
    body = RSRP_BANDS.map((b) => <Item key={b.label} c={b.color} l={b.label} />);
  } else if (layers.smartGrid) {
    const ind = GRID_CATALOG.find((c) => c.category === gridCategory)?.indicators.find((i) => i.field === gridField);
    title = ind ? `${ind.label}${ind.unit ? `(${ind.unit})` : ''}` : '智能板指标';
    body = LMH_LEGEND.map((b) => <Item key={b.label} c={b.color} l={b.label} />);
  } else if (layers.poorMap) {
    title = '质差程度';
    body = LMH_LEGEND.map((b) => <Item key={b.label} c={b.color} l={b.label} />);
  } else if (mode === 'planning') {
    title = '规划覆盖增强 (RSRP)';
    body = [
      { l: '优 ≥-90', c: '#22c55e' },
      { l: '良 -90~-98', c: '#84cc16' },
      { l: '中 -98~-106', c: '#f59e0b' },
      { l: '弱 -106~-114', c: '#ef4444' },
      { l: '盲区', c: '#6e6e78' },
    ].map((b) => <Item key={b.l} c={b.c} l={b.l} />);
  } else if (layers.tazRegions) {
    title = 'TAZ 类型图例';
    body = (
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {POI_CATEGORIES.map((p) => <Item key={p} c={POI_COLOR[p]} l={p} dot />)}
      </div>
    );
  } else {
    return null;
  }

  return (
    <div className="absolute bottom-6 left-4 z-[1000] bg-[#141414]/95 backdrop-blur-md border border-white/10 rounded-lg text-white px-3 py-2.5 shadow-xl min-w-[140px]">
      <div className="text-[10px] font-semibold text-white/80 mb-1.5">{title}</div>
      {Array.isArray(body) ? <div className="space-y-1">{body}</div> : body}
    </div>
  );
}

function Item({ c, l, dot }: { c: string; l: string; dot?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-white/60">
      <span className={dot ? 'w-2.5 h-2.5 rounded-full' : 'w-3 h-3 rounded-sm'} style={{ background: c }} />
      {l}
    </div>
  );
}
