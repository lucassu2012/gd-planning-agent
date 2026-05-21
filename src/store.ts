import { create } from 'zustand';
import type { Dataset, SmartGrid, ChurnGrid, SocialEvent, GridField } from './types';
import { loadDefaultDataset } from './data/load';
import { DEFAULT_WEIGHTS, type Weights } from './lib/scoring';

export type View = 'global' | 'detail' | 'planning' | 'import';
export type Basemap = 'dark' | 'light' | 'satellite';
export type TazRender = 'priority' | 'type';

export interface Layers {
  tazRegions: boolean; // TAZ地图（区域染色+优先级ICON）
  district: boolean;
  smartGrid: boolean; // 智能板栅格
  poorMap: boolean; // 质差地图
  complaints: boolean; // 投诉地图
  social: boolean; // 事件/在建/楼盘
  planSites: boolean; // 规划建站结果
  tazOutline: boolean; // TAZ 边界轮廓（叠加在栅格上）
}

interface AppState {
  status: 'loading' | 'ready' | 'error';
  error?: string;
  dataset: Dataset | null;

  view: View;
  selectedTazId: string | null;
  planTazId: string | null;
  weights: Weights;

  layers: Layers;
  gridBusiness: string; // 业务场景
  gridCategory: string; // 地图类别
  gridField: GridField; // 具体指标字段
  basemap: Basemap;
  tazRender: TazRender;
  selectedSiteId: string | null;
  selectedSiteIds: string[]; // 建站规划：已勾选站点（地图联动）

  flyTo: { center: [number, number]; zoom?: number; token: number } | null;
  importedFlags: { smartboard: boolean; churn: boolean; tensor: boolean };

  init: () => Promise<void>;
  setView: (v: View) => void;
  openTaz: (id: string) => void;
  openPlanning: (tazId: string) => void;
  back: () => void;
  setWeights: (w: Weights) => void;
  resetWeights: () => void;
  toggleLayer: (k: keyof Layers) => void;
  setGridBusiness: (b: string) => void;
  setGridCategory: (c: string) => void;
  setGridField: (f: GridField) => void;
  setBasemap: (b: Basemap) => void;
  setTazRender: (r: TazRender) => void;
  selectSite: (id: string | null) => void;
  toggleSite: (id: string) => void;
  setSites: (ids: string[]) => void;
  demoStory: { title: string; text: string; tab: string } | null;
  loadDemo: (id: 1 | 2 | 3) => void;
  clearDemo: () => void;
  fly: (center: [number, number], zoom?: number) => void;

  importSmartBoard: (grids: SmartGrid[]) => void;
  importChurn: (churn: ChurnGrid[]) => void;
  importTensor: (events: SocialEvent[]) => void;
}

let flyTok = 0;

export const useStore = create<AppState>((set, get) => ({
  status: 'loading',
  dataset: null,
  view: 'global',
  selectedTazId: null,
  planTazId: null,
  weights: { ...DEFAULT_WEIGHTS },
  layers: { tazRegions: true, district: false, smartGrid: false, poorMap: false, complaints: false, social: false, planSites: false, tazOutline: false },
  gridBusiness: '短视频',
  gridCategory: '体验',
  gridField: 'videoRtt',
  basemap: 'dark',
  tazRender: 'priority',
  selectedSiteId: null,
  selectedSiteIds: [],
  demoStory: null,
  flyTo: null,
  importedFlags: { smartboard: false, churn: false, tensor: false },

  init: async () => {
    try {
      const ds = await loadDefaultDataset();
      set({ dataset: ds, status: 'ready' });
    } catch (e: any) {
      set({ status: 'error', error: e?.message ?? String(e) });
    }
  },

  setView: (v) => set({ view: v }),
  openTaz: (id) => {
    const ds = get().dataset;
    const t = ds?.tazList.find((x) => x.id === id);
    set({ selectedTazId: id, view: 'detail', flyTo: t ? { center: [t.lat, t.lng], zoom: 16, token: ++flyTok } : null });
  },
  openPlanning: (tazId) => {
    const ds = get().dataset;
    const t = ds?.tazList.find((x) => x.id === tazId);
    const sites = ds?.planSites.filter((p) => p.tazId === tazId) ?? [];
    const sel = sites.filter((s) => s.priority === '极高' || s.priority === '高').map((s) => s.id);
    set({ planTazId: tazId, view: 'planning', selectedSiteId: null, selectedSiteIds: sel.length ? sel : sites.slice(0, 3).map((s) => s.id), flyTo: t ? { center: [t.lat, t.lng], zoom: 16, token: ++flyTok } : null });
  },
  back: () => set({ view: 'global', selectedTazId: null }),
  setWeights: (w) => set({ weights: w }),
  resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS } }),
  toggleLayer: (k) => set((s) => ({ layers: { ...s.layers, [k]: !s.layers[k] } })),
  setGridBusiness: (b) => set({ gridBusiness: b }),
  setGridCategory: (c) => set({ gridCategory: c }),
  setGridField: (f) => set({ gridField: f }),
  setBasemap: (b) => set({ basemap: b }),
  setTazRender: (r) => set({ tazRender: r }),
  selectSite: (id) => set({ selectedSiteId: id }),
  toggleSite: (id) => set((s) => ({ selectedSiteIds: s.selectedSiteIds.includes(id) ? s.selectedSiteIds.filter((x) => x !== id) : [...s.selectedSiteIds, id] })),
  setSites: (ids) => set({ selectedSiteIds: ids }),
  clearDemo: () => set({ demoStory: null }),
  loadDemo: (id) => {
    const off = { tazRegions: false, district: false, smartGrid: false, poorMap: false, complaints: false, social: false, planSites: false, tazOutline: false };
    if (id === 1) {
      set({ view: 'global', layers: { ...off, smartGrid: true, tazOutline: true }, gridBusiness: '短视频', gridCategory: '干扰', gridField: 'highInterfRatio', demoStory: { tab: '全局洞察 · 智能板栅格地图', title: '演示① 智能板六维感知 · 高校竞技手游干扰场景', text: '已载入智能板六维感知数据包，地图切换至「干扰·高干扰比例」指标并叠加 TAZ 边界。可见高校片区"信号强但 SINR 低"的同频干扰栅格成片（红/橙）——夜间竞技手游对时延极敏感，建议下倾角/功率/PCI 邻区优化降干扰。切换「业务场景/地图类别/具体指标」可查看覆盖/话务/体验各维度。' } });
    } else if (id === 2) {
      set({ view: 'global', layers: { ...off, complaints: true, tazRegions: true }, demoStory: { tab: '全局洞察 · 离网用户地图', title: '演示② 离网用户经营 · 网络侧可治理离网场景', text: '已载入离网数据包，地图叠加「离网用户地图」。按离网原因着色（网络质差/弱覆盖/高负荷=网络可治理，资费/竞对/合约=市场维系）。点击离网点查看离网工单（原因/根因/挽留建议/关联治理站点）。网络侧离网应纳入覆盖/容量治理优先挽留。' } });
    } else {
      set({ view: 'global', layers: { ...off, social: true, tazRegions: true }, demoStory: { tab: '全局洞察 · 事件/在建/楼盘', title: '演示③ 时空张量 · 事件话务激增与未来发展', text: '已载入时空张量数据包，地图叠加「事件/在建/楼盘」。演唱会/节庆带来话务脉冲、新建写字楼/楼盘带来话务增长、施工改变传播环境。点击事件查看影响，并据此在「建站规划→网络仿真优化/综合价值测算」做容量储备与收益测算。' } });
    }
  },
  fly: (center, zoom) => set({ flyTo: { center, zoom, token: ++flyTok } }),

  importSmartBoard: (grids) => {
    const ds = get().dataset;
    if (!ds) return;
    set({
      dataset: { ...ds, grids, meta: { ...ds.meta, gridTotal: grids.length } },
      layers: { ...get().layers, smartGrid: true },
      importedFlags: { ...get().importedFlags, smartboard: true },
    });
    // 自动定位到栅格范围
    if (grids.length) {
      const lat = grids.reduce((s, g) => s + g.lat, 0) / grids.length;
      const lng = grids.reduce((s, g) => s + g.lng, 0) / grids.length;
      set({ flyTo: { center: [lat, lng], zoom: 15, token: ++flyTok }, view: 'global' });
    }
  },
  importChurn: (churn) => {
    const ds = get().dataset;
    if (!ds) return;
    set({ dataset: { ...ds, churn }, importedFlags: { ...get().importedFlags, churn: true } });
  },
  importTensor: (events) => {
    const ds = get().dataset;
    if (!ds) return;
    set({ dataset: { ...ds, social: events }, layers: { ...get().layers, social: true }, importedFlags: { ...get().importedFlags, tensor: true } });
  },
}));
