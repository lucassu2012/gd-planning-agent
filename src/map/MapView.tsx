import { Fragment, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Marker, Polygon, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store';
import {
  PRIORITY_COLOR, POI_COLOR, COMPLAINT_COLOR, GRID_CATALOG,
  type Taz, type SmartGrid, type GridIndicator, type Complaint, type PoorTicket,
} from '../types';
import GridCanvasLayer from './GridCanvasLayer';
import { indicatorColor, hexToRgba, rsrpBandColor, SEVERITY_COLOR } from './colorScales';
import { classifyTaz, TIER_NAMES, TIER_COLORS, type QosResult } from '../lib/qos';

const BASEMAP_URL: Record<string, string> = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

function FlyController() {
  const map = useMap();
  const flyTo = useStore((s) => s.flyTo);
  useEffect(() => {
    if (flyTo) map.flyTo(flyTo.center, flyTo.zoom ?? map.getZoom(), { duration: 0.7 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyTo?.token]);
  return null;
}

// 视图切换/布局后地图容器尺寸可能为0，强制 invalidateSize 触发栅格层重算
function SizeFix() {
  const map = useMap();
  useEffect(() => {
    const ts = [60, 250, 600].map((d) => setTimeout(() => map.invalidateSize(), d));
    return () => ts.forEach(clearTimeout);
  }, [map]);
  return null;
}

function priorityIcon(p: string) {
  const c = PRIORITY_COLOR[p as keyof typeof PRIORITY_COLOR];
  return L.divIcon({ className: '', html: `<div style="width:18px;height:18px;border-radius:4px;background:${c};border:1.5px solid rgba(255,255,255,.85);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;box-shadow:0 1px 3px rgba(0,0,0,.5)">${p[0]}</div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
}
function poorLabelIcon(text: string, sev: string) {
  const c = SEVERITY_COLOR[sev];
  return L.divIcon({ className: '', html: `<div style="padding:1px 5px;border-radius:3px;background:rgba(10,10,10,.55);border:1px solid ${c};font-size:9px;font-weight:600;color:${c};white-space:nowrap">${text}</div>`, iconSize: [0, 0], iconAnchor: [0, 8] });
}

export default function MapView({ mode }: { mode: 'global' | 'detail' | 'planning' }) {
  const dataset = useStore((s) => s.dataset)!;
  const layers = useStore((s) => s.layers);
  const gridCategory = useStore((s) => s.gridCategory);
  const gridField = useStore((s) => s.gridField);
  const basemap = useStore((s) => s.basemap);
  const tazRender = useStore((s) => s.tazRender);
  const selectedTazId = useStore((s) => s.selectedTazId);
  const planTazId = useStore((s) => s.planTazId);
  const selectedSiteId = useStore((s) => s.selectedSiteId);
  const openTaz = useStore((s) => s.openTaz);
  const selectSite = useStore((s) => s.selectSite);
  const selectedSiteIds = useStore((s) => s.selectedSiteIds);
  const toggleSite = useStore((s) => s.toggleSite);

  const tazById = useMemo(() => new Map(dataset.tazList.map((t) => [t.id, t])), [dataset.tazList]);
  const ticketByTaz = useMemo(() => new Map(dataset.poorTickets.map((t) => [t.tazId, t])), [dataset.poorTickets]);
  const detailTaz = mode === 'detail' ? tazById.get(selectedTazId!) : null;
  const planTaz = mode === 'planning' ? tazById.get(planTazId!) : null;

  const indicator: GridIndicator | undefined = useMemo(() => {
    const cat = GRID_CATALOG.find((c) => c.category === gridCategory);
    return cat?.indicators.find((i) => i.field === gridField) ?? cat?.indicators[0];
  }, [gridCategory, gridField]);

  const gridsToShow = useMemo(
    () => (mode === 'detail' && detailTaz ? dataset.grids.filter((g) => g.tazId === detailTaz.id) : dataset.grids),
    [mode, detailTaz, dataset.grids],
  );

  // 栅格 Canvas：仅用于 详情RSRP / 智能板指标
  const showGrid = mode === 'detail' || (mode === 'global' && layers.smartGrid);
  const gridColorFor = useMemo(() => {
    if (mode === 'detail') return (g: SmartGrid) => hexToRgba(rsrpBandColor(g.rsrp), 0.78);
    if (layers.smartGrid && indicator) return (g: SmartGrid) => indicatorColor((g as any)[indicator.field], indicator);
    return () => null;
  }, [mode, layers.smartGrid, indicator]);

  // TAZ 不规则地块（Polygon）：质差地图优先按程度染色，否则按 POI 类型
  const showPolygons = mode === 'global' && !layers.smartGrid && (layers.tazRegions || layers.poorMap);
  const polyPoor = layers.poorMap;

  const planSites = mode === 'planning' && planTaz ? dataset.planSites.filter((s) => s.tazId === planTaz.id) : dataset.planSites;

  // 质差判定：按可编辑门限对 TAZ 实时分档（取代静态 poorSeverity）
  const qosThresholds = useStore((s) => s.qosThresholds);
  const qosByTaz = useMemo(() => new Map(dataset.tazList.map((t) => [t.id, classifyTaz(t.qos, qosThresholds)])), [dataset.tazList, qosThresholds]);
  const qosSev = (t: Taz) => qosByTaz.get(t.id)?.severity ?? t.poorSeverity;
  const poorTazs = useMemo(() => dataset.tazList.filter((t) => qosByTaz.get(t.id)?.isPoor), [dataset.tazList, qosByTaz]);

  // 规划覆盖模拟网格：按已选站点路损建模上色，选站越多绿色覆盖格越多（req: 截图2效果）
  const selSites = useMemo(() => planSites.filter((s) => selectedSiteIds.includes(s.id)), [planSites, selectedSiteIds]);
  const coverageCells = useMemo(() => {
    if (mode !== 'planning' || !planTaz) return [] as SmartGrid[];
    const lats = planTaz.poly.map((p) => p[0]), lngs = planTaz.poly.map((p) => p[1]);
    const pad = 0.004;
    const minLat = Math.min(...lats) - pad, maxLat = Math.max(...lats) + pad;
    const minLng = Math.min(...lngs) - pad, maxLng = Math.max(...lngs) + pad;
    const dLat = 50 / 111000, dLng = 50 / (111000 * Math.cos((planTaz.lat * Math.PI) / 180));
    const cells: any[] = []; let i = 0;
    for (let la = minLat; la <= maxLat; la += dLat) for (let lo = minLng; lo <= maxLng; lo += dLng) cells.push({ id: 'cov' + i++, lat: Math.round(la * 1e5) / 1e5, lng: Math.round(lo * 1e5) / 1e5 });
    return cells as SmartGrid[];
  }, [mode, planTaz]);
  const coverageColor = useMemo(() => {
    const sites = selSites.map((s) => ({ lat: s.lat, lng: s.lng }));
    return (cell: SmartGrid) => {
      let best = -200;
      for (const s of sites) {
        const dy = (cell.lat - s.lat) * 111000;
        const dx = (cell.lng - s.lng) * 111000 * Math.cos((cell.lat * Math.PI) / 180);
        const d = Math.sqrt(dx * dx + dy * dy);
        const r = -52 - 22 * Math.log10(Math.max(d, 20));
        if (r > best) best = r;
      }
      if (best >= -90) return 'rgba(34,197,94,0.62)'; // 优
      if (best >= -98) return 'rgba(132,204,22,0.55)'; // 良
      if (best >= -106) return 'rgba(245,158,11,0.5)'; // 中
      if (best >= -114) return 'rgba(239,68,68,0.42)'; // 弱
      return 'rgba(110,110,120,0.08)'; // 盲区
    };
  }, [selSites]);

  return (
    <MapContainer center={dataset.meta.center} zoom={mode === 'global' ? 13 : 16} minZoom={11} maxZoom={18} zoomControl className="w-full h-full" style={{ background: '#050505' }}>
      <TileLayer key={basemap} url={BASEMAP_URL[basemap]} subdomains={['a', 'b', 'c', 'd'] as any} attribution={basemap === 'satellite' ? '&copy; Esri' : '&copy; OpenStreetMap, &copy; CARTO'} className={basemap === 'dark' ? 'cm-dark-tiles' : ''} />

      {/* TAZ 不规则地块染色（req1 类型 / req4 质差） */}
      {showPolygons &&
        dataset.tazList.map((t) => {
          const fill = polyPoor ? SEVERITY_COLOR[qosSev(t)] : POI_COLOR[t.poiCategory];
          return (
            <Polygon
              key={(polyPoor ? 'q' : 'p') + t.id}
              positions={t.poly}
              pathOptions={{ color: '#06080d', weight: 0.6, fillColor: fill, fillOpacity: 0.52 }}
              eventHandlers={{ click: () => { if (!polyPoor) openTaz(t.id); } }}
            >
              {polyPoor ? (
                <Popup><PoorPopup taz={t} ticket={ticketByTaz.get(t.id)} qos={qosByTaz.get(t.id)} /></Popup>
              ) : (
                <Tooltip><b>{t.name}</b><br />{t.poiCategory} · {t.type}<br />优先级 {t.priority} · 得分 {t.weightedScore} · 流量 {t.dailyTrafficGB}GB</Tooltip>
              )}
            </Polygon>
          );
        })}

      {/* 智能板栅格 / 详情RSRP Canvas */}
      <GridCanvasLayer grids={gridsToShow} gridSize={dataset.meta.gridSize} colorFor={gridColorFor} visible={showGrid} />

      {/* 智能板栅格上叠加 TAZ 边界轮廓 */}
      {mode === 'global' && layers.smartGrid && layers.tazOutline &&
        dataset.tazList.map((t) => (
          <Polygon key={'o' + t.id} positions={t.poly} pathOptions={{ color: '#22d3ee', weight: 0.8, opacity: 0.55, fill: false }} interactive={false} />
        ))}

      {/* 规划覆盖模拟栅格：已选站点覆盖增强（选站越多绿色越多） */}
      {mode === 'planning' && planTaz && (
        <GridCanvasLayer grids={coverageCells} gridSize={50} colorFor={coverageColor} visible />
      )}

      {/* 详情/规划：选中 TAZ 地块轮廓 */}
      {(detailTaz || planTaz) && <Polygon positions={(detailTaz || planTaz)!.poly} pathOptions={{ color: '#22d3ee', weight: 2, fillOpacity: mode === 'detail' ? 0 : 0.05 }} />}

      {/* TAZ地图：优先级 ICON */}
      {mode === 'global' && layers.tazRegions && tazRender === 'priority' && !layers.poorMap &&
        dataset.tazList.map((t) => (
          <Marker key={'i' + t.id} position={[t.lat, t.lng]} icon={priorityIcon(t.priority)} eventHandlers={{ click: () => openTaz(t.id) }}>
            <Tooltip><b>{t.name}</b><br />{t.poiCategory} · {t.type}<br />优先级 {t.priority} · 得分 {t.weightedScore} · 流量 {t.dailyTrafficGB}GB</Tooltip>
          </Marker>
        ))}

      {/* 质差地图：地块主质差标注 */}
      {mode === 'global' && layers.poorMap &&
        poorTazs.map((t) => (
          <Marker key={'l' + t.id} position={[t.lat, t.lng]} icon={poorLabelIcon(qosByTaz.get(t.id)?.worstBiz ?? t.dominantPoor, qosByTaz.get(t.id)?.severity ?? t.poorSeverity)}>
            <Popup><PoorPopup taz={t} ticket={ticketByTaz.get(t.id)} qos={qosByTaz.get(t.id)} /></Popup>
          </Marker>
        ))}

      {/* 投诉地图 */}
      {layers.complaints &&
        dataset.complaints.map((c) => (
          <CircleMarker key={c.id} center={[c.lat, c.lng]} radius={4} pathOptions={{ color: '#0a0a0a', weight: 0.6, fillColor: COMPLAINT_COLOR[c.type], fillOpacity: 0.9 }}>
            <Popup><ComplaintPopup c={c} taz={tazById.get(c.tazId)} /></Popup>
          </CircleMarker>
        ))}

      {/* 社会事件 */}
      {layers.social &&
        dataset.social.map((e) => (
          <CircleMarker key={e.id} center={[e.lat, e.lng]} radius={7} pathOptions={{ color: '#fff', weight: 1, fillColor: e.kind === 'construction' ? '#f97316' : e.kind === 'realestate' ? '#22d3ee' : '#a78bfa', fillOpacity: 0.85 }}>
            <Popup><b>{e.name}</b><br />{e.detail}</Popup>
          </CircleMarker>
        ))}

      {/* 规划候选站：已选站画覆盖圈、未选淡化（地图联动） */}
      {(mode === 'planning' || layers.planSites) &&
        planSites.map((s) => {
          const on = selectedSiteIds.includes(s.id);
          const radius = s.name.includes('室分') ? 130 : s.name.includes('杆') ? 190 : 280;
          return (
            <Fragment key={s.id}>
              {on && <Circle center={[s.lat, s.lng]} radius={radius} pathOptions={{ color: PRIORITY_COLOR[s.priority], weight: 1, fillColor: PRIORITY_COLOR[s.priority], fillOpacity: 0.12, dashArray: '4 4' }} />}
              <CircleMarker
                center={[s.lat, s.lng]}
                radius={selectedSiteId === s.id ? 10 : on ? 7 : 5}
                pathOptions={{ color: '#fff', weight: selectedSiteId === s.id ? 2 : 1, fillColor: on ? PRIORITY_COLOR[s.priority] : '#475569', fillOpacity: on ? 0.95 : 0.5 }}
                eventHandlers={{ click: () => { selectSite(s.id); toggleSite(s.id); } }}
              >
                <Tooltip><b>{s.name}</b><br />{on ? '✓ 已选入方案' : '点击加入方案'}<br />打分 {s.score} · 覆盖 {s.coverage}% · PRB {s.prb}% · 潜客 {s.potentialUsers}</Tooltip>
              </CircleMarker>
            </Fragment>
          );
        })}

      <FlyController />
      <SizeFix />
    </MapContainer>
  );
}

function PoorPopup({ taz, ticket, qos }: { taz: Taz; ticket?: PoorTicket; qos?: QosResult }) {
  const sev = qos?.severity ?? taz.poorSeverity;
  const worstBiz = qos?.worstBiz ?? taz.dominantPoor;
  return (
    <div style={{ minWidth: 250, maxWidth: 300, color: '#e5e7eb', fontSize: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{taz.name}</div>
      <div style={{ marginBottom: 6 }}>
        <span style={{ color: SEVERITY_COLOR[sev], background: hexToRgba(SEVERITY_COLOR[sev], 0.15), padding: '1px 7px', borderRadius: 4, fontSize: 11 }}>质差程度 {sev}</span>
        <span style={{ color: '#94a3b8', marginLeft: 6 }}>主短板：{worstBiz}</span>
      </div>
      {qos && (
        <div style={{ marginTop: 4, paddingTop: 5, borderTop: '1px dashed rgba(255,255,255,.12)' }}>
          <div style={{ color: '#93c5fd', fontWeight: 600, fontSize: 11, marginBottom: 3 }}>典型业务分档判定（按当前参考门限）</div>
          {qos.perBiz.map((b) => (
            <div key={b.biz} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', lineHeight: 1.7 }}>
              <span style={{ color: '#cbd5e1' }}>{b.biz}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{b.val}{b.unit}</span>
                <span style={{ color: TIER_COLORS[b.tier], background: hexToRgba(TIER_COLORS[b.tier], 0.16), padding: '0 6px', borderRadius: 3, fontSize: 11, minWidth: 34, textAlign: 'center' }}>{b.tierName}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {ticket ? (
        <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px dashed rgba(255,255,255,.1)' }}>
          <Row k="质差原因" v={ticket.cause} />
          <Row k="优化建议" v={ticket.optimize} />
          <Row k="新建建议" v={ticket.build} />
          <Row k="影响用户" v={`${ticket.affectedUsers} 人`} />
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>关联质差工单：{ticket.id}</div>
        </div>
      ) : qos?.isPoor ? (
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5, paddingTop: 5, borderTop: '1px dashed rgba(255,255,255,.1)' }}>该TAZ存在体验短板（{worstBiz}未达「良好」），建议结合栅格做覆盖/容量优化，暂无质差工单明细。</div>
      ) : <div style={{ fontSize: 11, color: '#64748b', marginTop: 5 }}>各业务体验达「良好」及以上，暂未判定为质差。</div>}
    </div>
  );
}
function ComplaintPopup({ c, taz }: { c: Complaint; taz?: Taz }) {
  const col = COMPLAINT_COLOR[c.type];
  const net = c.source === '网络侧';
  return (
    <div style={{ minWidth: 270, maxWidth: 326, color: '#e5e7eb', fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,.12)', paddingBottom: 5 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>离网用户工单 {c.ticketId}</span>
        <span style={{ color: col, background: hexToRgba(col, 0.18), padding: '1px 7px', borderRadius: 4, fontSize: 11 }}>{c.type}</span>
      </div>
      <Row k="离网原因侧" v={`${c.source}${net ? '（可网络治理）' : '（市场侧维系）'}`} />
      <Row k="在用套餐" v={c.bizType} />
      <Row k="离网用户数" v={`${c.churnUsers} 户`} />
      <Row k="常驻地址" v={c.address} />
      <Row k="离网时间" v={c.time} />
      <Row k="离网场景" v={c.content} />
      <Row k="状态" v={c.status} />
      <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px dashed rgba(255,255,255,.1)' }}>
        <div style={{ color: '#93c5fd', fontWeight: 600, fontSize: 11, marginBottom: 2 }}>离网根因分析与挽留建议</div>
        <Row k="常驻网络指标" v={c.testResult} />
        <Row k="离网根因" v={c.rootCause} />
        <Row k="挽留/治理建议" v={c.suggestion} />
        {c.solveStation && <Row k="关联站点" v={c.solveStation} />}
      </div>
      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>所属TAZ：{taz?.name ?? ''}（{taz?.poiCategory ?? ''}）</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ lineHeight: 1.5 }}>
      <span style={{ color: '#94a3b8' }}>{k}：</span>
      <span style={{ color: '#e5e7eb' }}>{v}</span>
    </div>
  );
}
