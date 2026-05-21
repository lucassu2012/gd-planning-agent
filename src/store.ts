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
  layers: { tazRegions: true, district: false, smartGrid: false, poorMap: false, complaints: false, social: false, planSites: false },
  gridBusiness: '短视频',
  gridCategory: '体验',
  gridField: 'videoRtt',
  basemap: 'dark',
  tazRender: 'priority',
  selectedSiteId: null,
  selectedSiteIds: [],
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
