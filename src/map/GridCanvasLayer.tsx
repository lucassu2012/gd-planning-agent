import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { SmartGrid } from '../types';

interface Props {
  grids: SmartGrid[];
  gridSize: number;
  colorFor: (g: SmartGrid) => string | null; // 返回 rgba 字符串或 null(跳过)
  visible: boolean;
  highlightIds?: Set<string> | null;
}

const LAT_M = 1 / 111000;

const GridCanvas = (L.Layer as any).extend({
  initialize(opts: any) { this._opts = opts; },
  setData(opts: any) { this._opts = opts; this._draw(); },
  onAdd(map: L.Map) {
    this._map = map;
    const c = L.DomUtil.create('canvas', 'grid-canvas-layer') as HTMLCanvasElement;
    c.style.position = 'absolute';
    c.style.pointerEvents = 'none';
    this._canvas = c;
    map.getPanes().overlayPane!.appendChild(c);
    map.on('moveend zoomend resize viewreset', this._reset, this);
    this._reset();
  },
  onRemove(map: L.Map) { map.off('moveend zoomend resize viewreset', this._reset, this); this._canvas?.remove(); },
  _reset() {
    if (!this._map || !this._canvas) return;
    const size = this._map.getSize();
    L.DomUtil.setPosition(this._canvas, this._map.containerPointToLayerPoint([0, 0]));
    this._canvas.width = size.x; this._canvas.height = size.y;
    this._draw();
  },
  _draw() {
    const map: L.Map = this._map, canvas: HTMLCanvasElement = this._canvas;
    if (!map || !canvas || !this._opts) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { grids, gridSize, colorFor, visible, highlightIds } = this._opts as Props;
    if (!visible) return;
    const dLat = gridSize * LAT_M;
    const center = map.getCenter();
    const dLng = gridSize / (111000 * Math.cos((center.lat * Math.PI) / 180));
    const p0 = map.latLngToContainerPoint([center.lat, center.lng]);
    const pd = map.latLngToContainerPoint([center.lat + dLat, center.lng + dLng]);
    const w = Math.max(2, Math.abs(pd.x - p0.x)), h = Math.max(2, Math.abs(pd.y - p0.y));
    const size = map.getSize(), pad = Math.max(w, h) + 2;
    const hasHi = highlightIds && highlightIds.size > 0;
    for (const g of grids) {
      const p = map.latLngToContainerPoint([g.lat, g.lng]);
      if (p.x < -pad || p.y < -pad || p.x > size.x + pad || p.y > size.y + pad) continue;
      const col = colorFor(g);
      if (!col) continue;
      ctx.globalAlpha = hasHi && !highlightIds!.has(g.id) ? 0.18 : 1;
      ctx.fillStyle = col;
      ctx.fillRect(p.x - w / 2, p.y - h / 2, w + 0.6, h + 0.6);
    }
    ctx.globalAlpha = 1;
  },
});

export default function GridCanvasLayer(props: Props) {
  const map = useMap();
  const ref = useRef<any>(null);
  useEffect(() => {
    const layer = new (GridCanvas as any)(props);
    layer.addTo(map);
    ref.current = layer;
    return () => { map.removeLayer(layer); ref.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  useEffect(() => { ref.current?.setData(props); }, [props]);
  return null;
}
