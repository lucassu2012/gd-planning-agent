import Papa from 'papaparse';
import type { Dataset, SmartGrid, ChurnGrid, SocialEvent } from '../types';

export async function loadDefaultDataset(): Promise<Dataset> {
  const res = await fetch('data/dataset.json');
  if (!res.ok) throw new Error('默认数据集加载失败');
  return res.json();
}

const num = (v: unknown, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

// ── MGRS-like grid id 解码 ──
// id 形如 49QGF-{e}-{n}-{size}；按已知前缀的原点绝对定位，未知前缀相对定位。
const ORIGIN: Record<string, [number, number]> = {
  '49QGF': [23.1, 113.29], // 广州天河
  '51TWG': [31.1, 121.3], // 上海徐汇(测试数据)
};

function metersPerDeg(lat: number) {
  return { dLat: 1 / 111000, dLng: 1 / (111000 * Math.cos((lat * Math.PI) / 180)) };
}

interface DecodedId {
  prefix: string;
  e: number;
  n: number;
  size: number;
}
function decodeId(id: string): DecodedId | null {
  const parts = id.split('-');
  if (parts.length < 4) return null;
  const size = num(parts[parts.length - 1], 50);
  const n = num(parts[parts.length - 2]);
  const e = num(parts[parts.length - 3]);
  const prefix = parts.slice(0, parts.length - 3).join('-');
  return { prefix, e, n, size };
}

/** 将解码索引落到经纬度。anchor 为未知前缀时的兜底中心。 */
function placeGrids(rows: { id: string; dec: DecodedId | null }[], anchor: [number, number]) {
  // 按前缀分组
  const out = new Map<string, { lat: number; lng: number }>();
  const unknown: { id: string; dec: DecodedId }[] = [];
  for (const r of rows) {
    if (!r.dec) continue;
    const org = ORIGIN[r.dec.prefix];
    if (org) {
      const { dLat, dLng } = metersPerDeg(org[0]);
      out.set(r.id, { lat: org[0] + r.dec.n * r.dec.size * dLat, lng: org[1] + r.dec.e * r.dec.size * dLng });
    } else {
      unknown.push({ id: r.id, dec: r.dec });
    }
  }
  if (unknown.length) {
    const eMin = Math.min(...unknown.map((u) => u.dec.e));
    const nMin = Math.min(...unknown.map((u) => u.dec.n));
    const { dLat, dLng } = metersPerDeg(anchor[0]);
    for (const u of unknown)
      out.set(u.id, {
        lat: anchor[0] + (u.dec.n - nMin) * u.dec.size * dLat,
        lng: anchor[1] + (u.dec.e - eMin) * u.dec.size * dLng,
      });
  }
  return out;
}

/** 解析智能板真实管道格式 → SmartGrid[] */
export function parseSmartBoardCsv(text: string, anchor: [number, number] = [23.13, 113.33]): SmartGrid[] {
  const clean = text.replace(/^﻿/, '');
  const { data } = Papa.parse<Record<string, string>>(clean, {
    header: true,
    delimiter: '|',
    skipEmptyLines: true,
  });
  const rows = data.filter((r) => r.mgrs_grid_id);
  const positions = placeGrids(
    rows.map((r) => ({ id: r.mgrs_grid_id, dec: decodeId(r.mgrs_grid_id) })),
    anchor,
  );

  return rows.map((r) => {
    const rsrpVc = num(r.dl_ssb_rsrp_valid_count, 1) || 1;
    const sinrVc = num(r.dl_sinr_valid_count, 1) || 1;
    const ulRsrpVc = num(r.ul_ssb_rsrp_valid_count, 1) || 1;
    const ulSinrVc = num(r.ul_sinr_valid_count, 1) || 1;
    const pkts = num(r.svid_tot_dl_vid_pkts_for_tcp_rtt, 1) || 1;
    const tcpPkts = num(r.svid_tot_dl_tcp_pkts, 1) || 1;
    const rbSched = num(r.dl_rb_schd_count, 1) || 1;

    const rsrp = num(r.dl_ssb_rsrp_accumulated) / rsrpVc;
    const sinr = num(r.dl_sinr_accumulated) / sinrVc;
    const weak = (num(r.dl_ssb_rsrp_poor_count) / rsrpVc) * 100;
    const poorQ = (num(r.dl_sinr_poor_count) / sinrVc) * 100;
    const highInterf = (num(r.dl_ssb_rsrp_good_and_sinr_poor_count) / rsrpVc) * 100;
    const videoRtt = num(r.svid_tot_dl_vid_tcp_rtt) / pkts;
    const highLat = (num(r.svid_tot_dl_vid_tcp_rtt_x_th) / pkts) * 100;
    const retrans = (num(r.svid_tot_dl_retrans_tcp_pkts) / tcpPkts) * 100;
    const rbPer = num(r.dl_rb_accumulated) / rbSched;
    const load = Math.max(0, Math.min(100, (rbPer / 14) * 100));
    const tput = Math.max(1, Math.min(70, 60 - videoRtt * 0.28 - weak * 0.18 - load * 0.2));
    const trafficMB = Math.round((num(r.svid_tot_vid_download_dv) / 1024) * 10) / 10;
    const users = Math.max(0, Math.min(60, Math.round(load * 0.3 + num(r.total_mr_count) / 200)));
    const poorRatio = Math.round(Math.max(0, Math.min(80, poorQ * 0.5 + highLat * 0.4)) * 10) / 10;
    const pos = positions.get(r.mgrs_grid_id) ?? { lat: anchor[0], lng: anchor[1] };

    const g: SmartGrid = {
      id: r.mgrs_grid_id,
      lat: Math.round(pos.lat * 1e5) / 1e5,
      lng: Math.round(pos.lng * 1e5) / 1e5,
      gnodeb: r.gnodeb_id ?? '',
      cell: r.cell_id ?? '',
      rsrp: Math.round(rsrp * 10) / 10,
      sinr: Math.round(sinr * 10) / 10,
      ulRsrp: Math.round((num(r.ul_rsrp_accumulated) / ulRsrpVc) * 10) / 10,
      ulSinr: Math.round((num(r.ul_sinr_accumulated) / ulSinrVc) * 10) / 10,
      weakCoverRatio: Math.round(weak * 10) / 10,
      poorQualityRatio: Math.round(poorQ * 10) / 10,
      highInterfRatio: Math.round(highInterf * 10) / 10,
      videoRtt: Math.round(videoRtt),
      videoTputMbps: Math.round(tput * 100) / 100,
      retransRatio: Math.round(retrans * 100) / 100,
      highLatRatio: Math.round(highLat),
      mr: num(r.total_mr_count),
      loadPct: Math.round(load * 10) / 10,
      trafficMB,
      users,
      poorRatio,
      tazId: '',
    };
    return g;
  });
}

/** 离网清单 CSV */
export function parseChurnCsv(text: string): ChurnGrid[] {
  const { data } = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: true,
  });
  return data
    .filter((r) => r.grid_id)
    .map((r) => ({
      gridId: r.grid_id,
      churnUsers: num(r.churn_users),
      churnProb: num(r.churn_prob),
      downgradeUsers: num(r.downgrade_users),
    }));
}

/** 时空张量 CSV → 社会事件 */
export function parseTensorCsv(text: string): SocialEvent[] {
  const { data } = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ''), {
    header: true,
    skipEmptyLines: true,
  });
  const out: SocialEvent[] = [];
  for (const r of data) {
    if (!r.id) continue;
    const [lat, lng] = (r.geo ?? '').split(',').map(Number);
    let detail = '';
    try {
      detail = r.props ? JSON.parse(r.props).detail ?? '' : '';
    } catch {
      detail = r.props ?? '';
    }
    const kindRaw = r.sub_type ?? 'event';
    const kind: SocialEvent['kind'] =
      kindRaw === 'construction' || kindRaw === 'realestate' ? kindRaw : 'event';
    out.push({ id: r.id, name: r.name ?? r.id, kind, lat, lng, detail });
  }
  return out;
}

export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file, 'utf-8');
  });
}
