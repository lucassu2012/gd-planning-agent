import { useState } from 'react';
import { useStore } from '../store';
import type { Layers, Basemap, TazRender } from '../store';
import { GRID_CATALOG, GRID_BUSINESS, type GridField } from '../types';

function Row({ on, label, onClick, color }: { on: boolean; label: string; onClick: () => void; color?: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-xs" onClick={onClick}>
      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${on ? 'bg-blue-500 border-blue-500' : 'border-white/30'}`}>
        {on && <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M2 6l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
      {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
      <span className={on ? 'text-white/90' : 'text-white/55'}>{label}</span>
    </div>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="text-[10px] uppercase tracking-wider text-white/35 px-2 pt-1.5 pb-0.5 font-semibold">{title}</div>
      {children}
    </div>
  );
}
function Mini({ items, val, onSel }: { items: { v: string; l: string }[]; val: string; onSel: (v: string) => void }) {
  return (
    <select value={val} onChange={(e) => onSel(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/15 rounded px-2 py-1 text-[11px] text-white/85 outline-none focus:border-blue-500/50">
      {items.map((i) => <option key={i.v} value={i.v}>{i.l}</option>)}
    </select>
  );
}

export default function LayerManager({ mode }: { mode: 'global' | 'detail' | 'planning' }) {
  const layers = useStore((s) => s.layers);
  const toggleLayer = useStore((s) => s.toggleLayer);
  const basemap = useStore((s) => s.basemap);
  const setBasemap = useStore((s) => s.setBasemap);
  const tazRender = useStore((s) => s.tazRender);
  const setTazRender = useStore((s) => s.setTazRender);
  const gridBusiness = useStore((s) => s.gridBusiness);
  const gridCategory = useStore((s) => s.gridCategory);
  const gridField = useStore((s) => s.gridField);
  const setGridBusiness = useStore((s) => s.setGridBusiness);
  const setGridCategory = useStore((s) => s.setGridCategory);
  const setGridField = useStore((s) => s.setGridField);
  const [open, setOpen] = useState(true);
  const lk = (k: keyof Layers) => () => toggleLayer(k);

  const cat = GRID_CATALOG.find((c) => c.category === gridCategory) ?? GRID_CATALOG[0];

  return (
    <div className="absolute top-4 right-4 z-[1000] w-[212px] bg-[#141414]/92 backdrop-blur-md border border-white/10 rounded-lg text-white shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 cursor-pointer" onClick={() => setOpen(!open)}>
        <span className="text-xs font-semibold tracking-tight">图层管理器</span>
        <svg width="12" height="12" viewBox="0 0 12 12" stroke="#94a3b8" strokeWidth="1.6" fill="none" style={{ transform: open ? 'rotate(180deg)' : '' }}><path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" /></svg>
      </div>
      {open && (
        <div className="p-1.5 max-h-[66vh] overflow-y-auto">
          {mode === 'global' && (
            <>
              <Group title="环境">
                <Row on={layers.tazRegions} label="TAZ 地图（类型染色）" onClick={lk('tazRegions')} />
                {layers.tazRegions && (
                  <div className="flex gap-1 px-2 pb-1">
                    {(['priority', 'type'] as TazRender[]).map((r) => (
                      <button key={r} onClick={() => setTazRender(r)} className={`text-[10px] px-2 py-0.5 rounded ${tazRender === r ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' : 'text-white/50 border border-white/10'}`}>
                        {r === 'priority' ? '显示优先级ICON' : '仅地块'}
                      </button>
                    ))}
                  </div>
                )}
              </Group>
              <Group title="网络">
                <Row on={layers.poorMap} label="质差地图" onClick={lk('poorMap')} color="#eab308" />
                <Row on={layers.smartGrid} label="智能板栅格地图" onClick={lk('smartGrid')} color="#22c55e" />
                {layers.smartGrid && (
                  <div className="px-2 pb-1.5 space-y-1.5">
                    <div>
                      <div className="text-[9px] text-white/35 mb-0.5">业务场景</div>
                      <Mini items={GRID_BUSINESS.map((b) => ({ v: b, l: b }))} val={gridBusiness} onSel={setGridBusiness} />
                    </div>
                    <div>
                      <div className="text-[9px] text-white/35 mb-0.5">地图类别</div>
                      <Mini items={GRID_CATALOG.map((c) => ({ v: c.category, l: c.category }))} val={gridCategory} onSel={(v) => { setGridCategory(v); const nc = GRID_CATALOG.find((c) => c.category === v); if (nc) setGridField(nc.indicators[0].field); }} />
                    </div>
                    <div>
                      <div className="text-[9px] text-white/35 mb-0.5">具体指标</div>
                      <Mini items={cat.indicators.map((i) => ({ v: i.field, l: i.label }))} val={gridField} onSel={(v) => setGridField(v as GridField)} />
                    </div>
                    <Row on={layers.tazOutline} label="显示 TAZ 边界" onClick={lk('tazOutline')} color="#22d3ee" />
                  </div>
                )}
                <Row on={layers.complaints} label="离网用户地图" onClick={lk('complaints')} color="#ef4444" />
              </Group>
              <Group title="社会">
                <Row on={layers.social} label="事件/在建/楼盘" onClick={lk('social')} color="#a78bfa" />
              </Group>
              <Group title="规划">
                <Row on={layers.planSites} label="规划建站结果" onClick={lk('planSites')} color="#f97316" />
              </Group>
            </>
          )}
          {mode === 'detail' && (
            <Group title="基本图层">
              <div className="px-2 py-1 text-[11px] text-white/55">智能板栅格 · RSRP 覆盖</div>
              <div className="px-2 py-1 text-[11px] text-white/55">TAZ 轮廓 · 小区图层</div>
            </Group>
          )}
          <Group title="底图">
            <div className="flex gap-1 px-2 py-1">
              {(['dark', 'light', 'satellite'] as Basemap[]).map((b) => (
                <button key={b} onClick={() => setBasemap(b)} className={`text-[10px] px-2 py-1 rounded flex-1 ${basemap === b ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' : 'text-white/50 border border-white/10'}`}>
                  {b === 'dark' ? '深色' : b === 'light' ? '浅色' : '卫星'}
                </button>
              ))}
            </div>
          </Group>
        </div>
      )}
    </div>
  );
}
