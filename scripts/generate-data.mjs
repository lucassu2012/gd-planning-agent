// ── 广东·广州天河 规划Agent 数据生成器（v3，对齐6张实拍+设计文档）──
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let seed = 20260521;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed / 0x7fffffff);
const rint = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const rf = (a, b) => a + rnd() * (b - a);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const r5 = (v) => Math.round(v * 1e5) / 1e5; // 经纬度精度（~1m）
function gauss(m, s) { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const CENTER = [23.132, 113.33];
const BBOX = [23.108, 113.3, 23.165, 113.372];
const GRID_M = 50;
const LAT_M = 1 / 111000;
const LNG_M = 1 / (111000 * Math.cos((CENTER[0] * Math.PI) / 180));
const DLAT = GRID_M * LAT_M, DLNG = GRID_M * LNG_M;
const ORIGIN = [23.1, 113.29];

const DISTRICTS = ['天河区', '越秀区', '海珠区', '荔湾区', '白云区', '黄埔区', '番禺区', '南沙区', '花都区', '增城区'];

const ZONES = [
  { name: '珠江新城CBD', c: [23.119, 113.321], r: 0.012, types: ['办公区', '生活服务区', '文化体育区'], issue: 'load' },
  { name: '天河路商圈', c: [23.135, 113.324], r: 0.01, types: ['生活服务区', '办公区'], issue: 'load' },
  { name: '天河体育中心', c: [23.1335, 113.3175], r: 0.008, types: ['文化体育区', '生活服务区'], issue: 'load' },
  { name: '华南理工/师大', c: [23.15, 113.347], r: 0.013, types: ['教育机构区', '居住区'], issue: 'interf' },
  { name: '暨南大学', c: [23.129, 113.342], r: 0.009, types: ['教育机构区', '居住区'], issue: 'interf' },
  { name: '石牌村', c: [23.146, 113.336], r: 0.008, types: ['居住区', '生活服务区'], issue: 'weak' },
  { name: '棠下村', c: [23.13, 113.355], r: 0.009, types: ['居住区', '生活服务区'], issue: 'weak' },
  { name: '广州东站', c: [23.149, 113.328], r: 0.009, types: ['交通枢纽区', '办公区'], issue: 'move' },
  { name: '员村/科韵路', c: [23.116, 113.36], r: 0.011, types: ['办公区', '居住区'], issue: 'load' },
  { name: '天河北', c: [23.142, 113.323], r: 0.009, types: ['居住区', '办公区', '医疗机构区'], issue: 'normal' },
  { name: '猎德/冼村', c: [23.118, 113.335], r: 0.008, types: ['居住区', '办公区'], issue: 'weak' },
  { name: '林和/林乐', c: [23.143, 113.33], r: 0.007, types: ['办公区', '生活服务区'], issue: 'load' },
];

const NAMES = {
  办公区: ['利通广场', '广州国际金融中心', '高德置地广场', '天汇广场IGC', '太古汇商务', '天河城商务楼', '维多利广场', '中信广场', '保利中心', '富力盈凯', '天盈广场', '骏汇大厦', '都市华庭商务', '建和中心', '华标涟山写字楼', '科韵路软件园', '羊城创意园', '中山大道软件园', '亿达创意园', '维家思广场写字楼'],
  居住区: ['石牌东社区', '石牌村握手楼群', '棠下涌住宅', '猎德复建房', '冼村社区', '员村二横路', '天河北小区', '华景新城', '骏景花园', '中海康城', '美林海岸', '天力居', '富力天河华庭', '东方新世界', '帝景苑', '德欣小区', '陶育路小区', '龙口西社区', '兴华苑', '前进村'],
  教育机构区: ['华南理工大学五山校区', '华南师范大学石牌校区', '暨南大学本部', '广东工业大学', '华师附中', '天河中学', '华阳小学', '体育东路小学', '汇景实验学校', '天河外国语学校', '广州天河职业高中', '省实附中', '五山小学', '龙口西小学'],
  医疗机构区: ['中山三院', '省中医院大学城', '广东省第二人民医院', '武警广东总队医院', '天河区中医院', '员村社区卫生中心', '广州长安医院', '暨大附属第一医院'],
  政府机构区: ['天河区人民政府', '天河区人民法院', '天河区税务局', '天河区公安分局', '天河区市场监管局', '天河区档案馆', '天河南街道办', '林和街道办'],
  文化体育区: ['天河体育场', '天河体育馆', '天河区文化馆', '天河公园', '正佳极地海洋世界', '广州购书中心', '天河儿童公园', '珠江公园'],
  生活服务区: ['正佳广场', '天河城', '万菱汇', '太古汇', '天娱广场', '宜家天河商场', '维家思广场', '天河又一城', '六运小区美食街', '体育东横街', '石牌西路商业街', '岗顶电脑城'],
  交通枢纽区: ['广州东站', '天河客运站', '体育西路地铁站', '珠江新城地铁站', '广州东站公交枢纽', '岗顶地铁站', '五山地铁站', '车陂南综合枢纽'],
};

const PROFILE = {
  办公区: { pop: [12000, 40000], traffic: [800, 9000], value: [70, 96], scene: 5 },
  生活服务区: { pop: [8000, 28000], traffic: [1500, 9500], value: [80, 98], scene: 5 },
  交通枢纽区: { pop: [5000, 20000], traffic: [600, 7000], value: [60, 88], scene: 5 },
  文化体育区: { pop: [6000, 30000], traffic: [800, 7500], value: [55, 90], scene: 4 },
  居住区: { pop: [20000, 60000], traffic: [200, 5500], value: [25, 55], scene: 3 },
  教育机构区: { pop: [8000, 35000], traffic: [500, 5500], value: [45, 75], scene: 4 },
  医疗机构区: { pop: [4000, 15000], traffic: [400, 6500], value: [50, 80], scene: 4 },
  政府机构区: { pop: [2000, 9000], traffic: [50, 2400], value: [40, 70], scene: 3 },
};

// 类型 → POI 类别
function poiOf(type, name) {
  if (type === '办公区') return /金融|银行|金/.test(name) ? '金融' : '公司企业';
  if (type === '居住区') return '房地产';
  if (type === '教育机构区') return /大学|学院/.test(name) ? '学校' : /培训|职业/.test(name) ? '教育培训' : '学校';
  if (type === '医疗机构区') return '医疗';
  if (type === '政府机构区') return '政府机构';
  if (type === '交通枢纽区') return '交通设施';
  if (type === '文化体育区') return /体育|健身|场|馆/.test(name) ? '运动健身' : /文化|书/.test(name) ? '文化传媒' : '休闲娱乐';
  if (type === '生活服务区') return /美食|食街/.test(name) ? '美食' : /酒店|宾馆/.test(name) ? '酒店' : '购物';
  return '房地产';
}

const TIERS = {}; // unused placeholder
const score5 = (v, lo, hi) => clamp(1 + (4 * (v - lo)) / (hi - lo), 1, 5);

// ── 街区式地块划分：沿"街道线"递归切分凸多边形，生成沿街/区块边界的城市街区（非Voronoi）──
const VW = (BBOX[3] - BBOX[1]) / LNG_M; // 区域宽(米)
const VH = (BBOX[2] - BBOX[0]) / LAT_M; // 区域高(米)
const toXY = (lat, lng) => ({ x: (lng - BBOX[1]) / LNG_M, y: (lat - BBOX[0]) / LAT_M });
const toLatLng = (p) => [r5(BBOX[0] + p.y * LAT_M), r5(BBOX[1] + p.x * LNG_M)];
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const A = p[i], B = p[(i + 1) % p.length]; a += A.x * B.y - B.x * A.y; } return Math.abs(a) / 2; }
function polyCentroid(p) { let cx = 0, cy = 0, a = 0; for (let i = 0; i < p.length; i++) { const A = p[i], B = p[(i + 1) % p.length]; const cr = A.x * B.y - B.x * A.y; a += cr; cx += (A.x + B.x) * cr; cy += (A.y + B.y) * cr; } a *= 0.5; if (Math.abs(a) < 1e-6) { let sx = 0, sy = 0; for (const v of p) { sx += v.x; sy += v.y; } return { x: sx / p.length, y: sy / p.length }; } return { x: cx / (6 * a), y: cy / (6 * a) }; }
function bboxOf(p) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const v of p) { x0 = Math.min(x0, v.x); y0 = Math.min(y0, v.y); x1 = Math.max(x1, v.x); y1 = Math.max(y1, v.y); } return { x0, y0, x1, y1 }; }
function splitByLine(poly, p1, p2) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y, nx = -dy, ny = dx;
  const side = (v) => (v.x - p1.x) * nx + (v.y - p1.y) * ny;
  const L = [], R = [];
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length], sA = side(A), sB = side(B);
    if (sA <= 0) L.push(A); if (sA >= 0) R.push(A);
    if ((sA < 0 && sB > 0) || (sA > 0 && sB < 0)) { const t = sA / (sA - sB); const I = { x: A.x + t * (B.x - A.x), y: A.y + t * (B.y - A.y) }; L.push(I); R.push(I); }
  }
  return [L, R];
}
function sliceBlocks(target) {
  let cells = [[{ x: 0, y: 0 }, { x: VW, y: 0 }, { x: VW, y: VH }, { x: 0, y: VH }]];
  let guard = 0;
  while (cells.length < target && guard++ < target * 8) {
    const areas = cells.map(polyArea), tot = areas.reduce((s, a) => s + a, 0);
    let rr = rnd() * tot, idx = 0; for (let i = 0; i < cells.length; i++) { rr -= areas[i]; if (rr <= 0) { idx = i; break; } }
    const cell = cells[idx], bb = bboxOf(cell), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
    if (Math.max(w, h) < 130) continue; // 街区不再切过小(<130m)
    const vertical = w >= h ? rnd() < 0.82 : rnd() < 0.18; // 沿长边切、主要正交
    const f = rf(0.38, 0.62), jit = rf(-0.05, 0.05); // 切线轻微角度抖动(像真实街道)
    let p1, p2;
    if (vertical) { const x = bb.x0 + w * f; p1 = { x: x - jit * h, y: bb.y0 - 5 }; p2 = { x: x + jit * h, y: bb.y1 + 5 }; }
    else { const y = bb.y0 + h * f; p1 = { x: bb.x0 - 5, y: y - jit * w }; p2 = { x: bb.x1 + 5, y: y + jit * w }; }
    const [A, B] = splitByLine(cell, p1, p2);
    if (A.length >= 3 && B.length >= 3) cells.splice(idx, 1, A, B);
  }
  return cells;
}
const ZONE_XY = ZONES.map((z) => toXY(z.c[0], z.c[1]));
function nearestZone(p) { let best = 0, bd = Infinity; for (let i = 0; i < ZONE_XY.length; i++) { const d = (p.x - ZONE_XY[i].x) ** 2 + (p.y - ZONE_XY[i].y) ** 2; if (d < bd) { bd = d; best = i; } } return ZONES[best]; }
const usedNames = new Set();
function uniqName(type, idx) { const pool = NAMES[type]; let n = pool[idx % pool.length]; if (usedNames.has(n)) n = `${n}${Math.floor(idx / pool.length) + 1}`; usedNames.add(n); return n; }

function describe(t) {
  const acts = {
    办公区: '小微企业与总部办公聚集，工作日日间商务活动密集，呈"昼高夜低"潮汐特征。',
    生活服务区: '商业综合体与商圈聚集，午间与夜间客流高峰，短视频/直播话务旺盛。',
    交通枢纽区: '高铁/地铁换乘枢纽，通勤双峰明显，高速移动下短视频体验承压。',
    文化体育区: '场馆与公共活动空间，大型活动期上行脉冲突出。',
    居住区: '高密度居住形态，夜间娱乐社交话务高峰，握手楼穿透差。',
    教育机构区: '高校与中小学聚集，学生玩家群体夜间在线，竞技手游对时延敏感。',
    医疗机构区: '门诊住院人流密集，语音与即时通信需求高，室内深度覆盖要求高。',
    政府机构区: '行政机关聚集，工作日日间活跃，公共服务功能显著。',
  };
  return `${t.name}（${t.district}·${t.type}）。${acts[t.type]}加权综合得分 ${t.weightedScore.toFixed(2)}，价值等级：${t.valueLevel}。`;
}

const POOR_LABELS = { weak: '弱覆盖', interf: '高干扰', rate: '速率', ulrate: '上行速率', dlrate: '下行速率', lat: '时延', load: '高负荷' };

// ── 生成 TAZ ──
const tazList = [];
let codeSeq = 0x79707;
const typeCounter = {};
const blocks = sliceBlocks(200);
for (let i = 0; i < blocks.length; i++) {
  const _ctr = polyCentroid(blocks[i]);
  const [lat, lng] = toLatLng(_ctr);
  const z = nearestZone(_ctr);
  const type = pick(z.types.concat(z.types, ['居住区', '办公区']));
  typeCounter[type] = (typeCounter[type] || 0) + 1;
  const prof = PROFILE[type];
  const population = Math.round(rf(prof.pop[0], prof.pop[1]));
  const dailyTrafficGB = r2(Math.max(0, rf(prof.traffic[0], prof.traffic[1]) * rf(0.3, 1)));
  const valueBiz = r1(rf(prof.value[0], prof.value[1]));

  const weak = clamp(z.issue === 'weak' ? rf(8, 32) : z.issue === 'move' ? rf(4, 16) : rf(0, 10), 0, 40);
  const interf = clamp(z.issue === 'interf' ? rf(8, 28) : z.issue === 'move' ? rf(5, 16) : rf(0, 9), 0, 35);
  const load = clamp(z.issue === 'load' ? rf(55, 99) : rf(20, 70), 0, 100);
  const poorRate = clamp((weak * 0.5 + interf * 0.6 + (load > 70 ? 12 : 0)) * rf(0.8, 1.3) + rf(2, 8), 0, 60);
  const ratePoor = clamp(poorRate * rf(0.5, 1) + rf(1, 8), 0, 50);
  const latencyPoor = clamp((interf * 0.4 + (load > 75 ? 6 : 1)) * rf(0.6, 1.2), 0, 25);
  const lossPoor = clamp(rf(0, 4) + (weak > 15 ? rf(0, 3) : 0), 0, 8);
  const competitor = clamp(z.issue === 'weak' ? rf(40, 90) : rf(5, 60), 0, 100);
  const complaint = clamp((poorRate * 0.2 + (load > 80 ? 6 : 0) + rf(0, 8)) * rf(0.6, 1.4), 0, 14);
  const popDensity = population / rf(0.02, 0.12);
  const trafficDensity = dailyTrafficGB / rf(0.02, 0.12);

  const metrics = {
    sceneType: { raw: type, score: prof.scene },
    popDensity: { raw: Math.round(popDensity), score: Math.round(score5(popDensity, 30000, 600000)) },
    trafficDensity: { raw: r1(trafficDensity), score: Math.round(score5(trafficDensity, 1000, 90000)) },
    valueBusiness: { raw: valueBiz, score: Math.round(score5(valueBiz, 20, 96)) },
    weakCover: { raw: r1(weak), score: Math.round(score5(weak, 0, 30)) },
    highInterf: { raw: r1(interf), score: Math.round(score5(interf, 0, 28)) },
    complaint: { raw: r1(complaint), score: Math.round(score5(complaint, 0, 12)) },
    poorRate: { raw: r1(poorRate), score: Math.round(score5(poorRate, 0, 40)) },
    ratePoor: { raw: r1(ratePoor), score: Math.round(score5(ratePoor, 0, 35)) },
    latencyPoor: { raw: r1(latencyPoor), score: Math.round(score5(latencyPoor, 0, 18)) },
    lossPoor: { raw: r2(lossPoor), score: Math.round(score5(lossPoor, 0, 6)) },
    highLoad: { raw: r1(load), score: Math.round(score5(load, 20, 100)) },
    competitorLag: { raw: r1(competitor), score: Math.round(score5(competitor, 0, 90)) },
  };
  const W = { sceneType: 0.1, popDensity: 0.05, trafficDensity: 0.05, valueBusiness: 0.1, weakCover: 0.05, highInterf: 0.05, complaint: 0.15, poorRate: 0.05, ratePoor: 0.1, latencyPoor: 0.05, lossPoor: 0.05, highLoad: 0.1, competitorLag: 0.1 };
  let ws = 0; for (const k in W) ws += metrics[k].score * W[k];
  const weightedScore = r2(ws);
  const valueLevel = weightedScore >= 4 ? '高价值区域' : weightedScore >= 3 ? '中价值区域' : '低价值区域';

  let issue = '正常';
  if (complaint >= 8) issue = '高投诉';
  else if (load >= 82) issue = '高负荷';
  else if (poorRate >= 22) issue = '体验质差';
  else if (competitor >= 60) issue = 'OTT覆盖落后';
  const priority = weightedScore >= 4 ? (complaint >= 10 ? '极高' : '高') : weightedScore >= 3.2 ? '高' : weightedScore >= 2.4 ? '中' : '低';
  const activeIndex = dailyTrafficGB > 4000 ? '极高' : dailyTrafficGB > 1500 ? '高' : dailyTrafficGB > 400 ? '中' : '低';

  // 主质差类型 + 程度
  const poorCand = [['weak', weak / 30], ['interf', interf / 28], ['rate', ratePoor / 35], ['lat', latencyPoor / 18], ['load', (load - 50) / 50]];
  poorCand.sort((a, b) => b[1] - a[1]);
  const dominantPoor = POOR_LABELS[poorCand[0][0]] || '速率';
  const poorSeverity = poorRate >= 28 ? '高' : poorRate >= 14 ? '中' : '低';

  // 三家竞对（覆盖RSRP/质量SINR/采样数/50m栅格数+RSRP分档 + 覆盖·质量·体验得分；OTT落后区移动覆盖偏弱）
  // RSRP 分档（对齐 snapshot-10）：≤-115 / -115~-105 / -105~-95 / -95~-85 / -85~-75 / >-75
  const RSRP_CENTERS = [-120, -110, -100, -90, -80, -70];
  const rsrpDistOf = (mean, total) => {
    const w = RSRP_CENTERS.map((c) => Math.exp(-((c - mean) ** 2) / (2 * 11 * 11)));
    const sum = w.reduce((s, x) => s + x, 0) || 1;
    const d = w.map((x) => Math.round((x / sum) * total));
    return d;
  };
  const mkOp = (rsrpBase, sinrBase, cntBase) => {
    const rsrp = r1(clamp(rsrpBase + gauss(0, 2), -118, -72)), sinr = r1(clamp(sinrBase + gauss(0, 1.5), -3, 22));
    const gridCount = Math.max(20, Math.round(cntBase * rf(60, 110)));
    return {
      rsrp, sinr, samples: Math.max(3, Math.round(cntBase * rf(0.7, 1.3))),
      gridCount, rsrpDist: rsrpDistOf(rsrp, gridCount),
      coverage: Math.round(clamp((rsrp + 120) / 48 * 100, 35, 99)),
      quality: Math.round(clamp((sinr + 5) / 27 * 100, 35, 99)),
      experience: Math.round(clamp((rsrp + 120) / 48 * 55 + (sinr + 5) / 27 * 45, 35, 99)),
    };
  };
  const cntBase = Math.round(clamp(population / 800 + dailyTrafficGB / 60, 6, 90));
  const cmccLag = competitor > 60; // OTT落后区移动偏弱
  const cmcc = mkOp(-87 - weak * 0.5 - (cmccLag ? 6 : 0), 9 - interf * 0.18, cntBase * 1.3);
  const telecom = mkOp(-86 - weak * 0.3 + (cmccLag ? 4 : 0), 9 - interf * 0.12 + (cmccLag ? 2 : 0), cntBase * 0.9);
  const unicom = mkOp(-90 - weak * 0.35, 8 - interf * 0.15, cntBase * 0.7);

  const code = (codeSeq++).toString(16).padStart(6, '0') + rint(0x1000, 0xffff).toString(16);
  const name = uniqName(type, typeCounter[type] - 1);
  const taz = {
    id: 'T' + String(i).padStart(3, '0'), code, name, type, district: '天河区', contractor: '移动',
    lat: r5(lat), lng: r5(lng), poly: blocks[i].map(toLatLng),
    population, dailyTrafficGB, typicalIssue: issue, priority, activeIndex,
    metrics, weightedScore, valueLevel, buildings: [], poorRows: [], bizPoorRows: [],
    gridCount: 0, complaintCount: Math.round(complaint * rf(0.8, 2.5)),
    poiCategory: poiOf(type, name), dominantPoor, poorSeverity, competitors: { cmcc, telecom, unicom },
    _zone: z, _weak: weak, _interf: interf, _load: load, _ratePoor: ratePoor, _lat: latencyPoor,
  };
  taz.description = describe(taz);
  const bn = rint(2, 4);
  for (let b = 0; b < bn; b++) taz.buildings.push({ name: `${name}${['主楼', '配楼', '裙楼', '北座', '南区'][b] || '附属'}`, role: `${type}载体，服务于${z.name}片区`, area: `建筑面积约 ${rint(1200, 42000).toLocaleString()}㎡`, activity: pick(['日间办公活跃', '高密度居住烟火气', '商贸洽谈频繁', '学生群体聚集', '门诊人流密集', '公共服务显著']) });
  const callTot = rint(8000, 90000);
  const mk = (dim, item, ratio) => ({ dim, item, poorCount: Math.round((callTot * ratio) / 100), total: callTot, ratio: r2(ratio) });
  taz.poorRows = [mk('综合', '整体质差', poorRate), mk('速率', '速率', ratePoor), mk('速率', '上行速率', ratePoor * rf(0.6, 0.9)), mk('速率', '下行速率', ratePoor * rf(0.7, 1)), mk('覆盖', '弱覆盖', weak), mk('覆盖', '上行弱覆盖', weak * rf(0.2, 0.5)), mk('覆盖', '下行弱覆盖', weak * rf(0.7, 1)), mk('时延', '时延质差', latencyPoor), mk('丢包', '数据丢包', lossPoor)];
  taz.bizPoorRows = [mk('短视频', '短视频卡顿', ratePoor * rf(0.8, 1.2)), mk('游戏', '游戏时延', latencyPoor * rf(1.5, 2.5)), mk('视频通话', '通话卡顿', ratePoor * rf(0.4, 0.8)), mk('网页', '网页时延', latencyPoor * rf(0.8, 1.4))];
  tazList.push(taz);
}
const PORD = { 极高: 4, 高: 3, 中: 2, 低: 1 };
tazList.sort((a, b) => PORD[b.priority] - PORD[a.priority] || b.weightedScore - a.weightedScore || b.dailyTrafficGB - a.dailyTrafficGB);

// ── 智能板栅格：核心区连片全填（50m，最近TAZ归属着色）──
const grids = [];
const gnodebOf = new Map();
let gnodebSeq = 7340000;
const GRID_BBOX = [23.116, 113.311, 23.155, 113.357]; // 核心密集区(连片)
const rows = Math.round((GRID_BBOX[2] - GRID_BBOX[0]) / DLAT);
const cols = Math.round((GRID_BBOX[3] - GRID_BBOX[1]) / DLNG);
function distDeg(aLat, aLng, bLat, bLng) { const dy = (aLat - bLat) / LAT_M; const dx = (aLng - bLng) / LNG_M; return Math.sqrt(dx * dx + dy * dy); }
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const lat = GRID_BBOX[0] + r * DLAT + DLAT / 2;
    const lng = GRID_BBOX[1] + c * DLNG + DLNG / 2;
    // 最近 TAZ（用于归属）— 核心区全填，连片覆盖
    let best = null, bd = Infinity;
    for (const t of tazList) { const d = distDeg(lat, lng, t.lat, t.lng); if (d < bd) { bd = d; best = t; } }
    if (!best) continue;
    const edge = clamp(bd / 340, 0, 1);
    const z = best._zone;
    let rsrp = gauss(-88 - best._weak * 0.6, 6) - edge * 6;
    let sinr = gauss(8 - best._interf * 0.25, 4);
    let load = clamp(best._load + gauss(0, 11), 0, 100);
    if (z.issue === 'weak' && rnd() < 0.5) rsrp -= rf(6, 20);
    if (z.issue === 'interf' && rnd() < 0.5) { rsrp += rf(2, 7); sinr -= rf(5, 12); }
    if (z.issue === 'move' && rnd() < 0.5) { sinr -= rf(3, 9); rsrp -= rf(2, 8); }
    rsrp = clamp(rsrp, -125, -62); sinr = clamp(sinr, -8, 25);
    const weakRatio = clamp(((-105 - rsrp) / 20) * 50 + (rsrp < -105 ? 30 : 0) + gauss(6, 4), 0, 96);
    const poorQ = clamp(((6 - sinr) / 14) * 55 + gauss(8, 5), 0, 95);
    const highInterf = clamp(rsrp > -95 && sinr < 3 ? rf(20, 60) : rf(0, 18), 0, 80);
    const busy = clamp((load - 50) / 50, 0, 1);
    const cov = clamp((-95 - rsrp) / 20, 0, 1);
    const qual = clamp((6 - sinr) / 14, 0, 1);
    const videoRtt = Math.round(20 + 120 * (0.4 * qual + 0.3 * cov + 0.5 * busy) * rf(0.8, 1.2));
    const highLat = clamp(5 + 70 * (0.4 * qual + 0.3 * busy + 0.2 * cov) * rf(0.85, 1.15), 0, 92);
    const tput = r2(clamp(60 * (1 - 0.5 * cov - 0.3 * qual - 0.5 * busy) * rf(0.85, 1.1), 1, 70));
    const retrans = r2(clamp(0.3 + 6 * (0.5 * qual + 0.4 * busy) * rf(0.7, 1.3), 0.1, 12));
    const poorRatio = clamp((0.5 * qual + 0.4 * busy + 0.3 * cov) * 60 * rf(0.85, 1.15), 0, 80);
    const mr = rint(40, 2400);
    const users = clamp(Math.round(load * rf(0.1, 0.5) + rf(0, 8)), 0, 60);
    const trafficMB = r1(clamp(tput * rf(40, 120) + load * rf(2, 8), 5, 4200));
    if (!gnodebOf.has(best.id)) gnodebOf.set(best.id, String(gnodebSeq++));
    const ei = Math.round((lng - ORIGIN[1]) / DLNG), ni = Math.round((lat - ORIGIN[0]) / DLAT);
    grids.push({
      id: `49QGF-${ei}-${ni}-50`, lat: r5(lat), lng: r5(lng), gnodeb: gnodebOf.get(best.id), cell: String(rint(1, 24)),
      rsrp: r1(rsrp), sinr: r1(sinr), ulRsrp: r1(rsrp - rf(14, 24)), ulSinr: r1(sinr + gauss(0, 3)),
      weakCoverRatio: r1(weakRatio), poorQualityRatio: r1(poorQ), highInterfRatio: r1(highInterf),
      videoRtt, videoTputMbps: tput, retransRatio: retrans, highLatRatio: Math.round(highLat),
      mr, loadPct: r1(load), trafficMB, users, poorRatio: r1(poorRatio), tazId: best.id,
    });
    best.gridCount++;
  }
}

// ── 建站候选 + ROI ──
const planSites = [], roi = [];
const SITE_SUFFIX = ['西侧新增站', '东侧扩容站', '南广场补盲站', '周边商圈补盲站', '北侧住宅区站', '核心区室分点', '地铁口杆站', '楼宇室分'];
for (const taz of tazList.filter((t) => t.priority === '极高' || t.priority === '高').slice(0, 32)) {
  const sn = rint(3, 8);
  for (let s = 0; s < sn; s++) planSites.push({ id: `${taz.id}-S${s}`, tazId: taz.id, name: `${taz.name}${SITE_SUFFIX[s % SITE_SUFFIX.length]}`, priority: s === 0 ? taz.priority : s < 3 ? '高' : '中', score: Math.round(clamp(70 + taz.weightedScore * 6 - s * 3 + rf(-3, 4), 50, 99)), coverage: r1(clamp(99 - s * 1.3 - rf(0, 2), 90, 99.5)), prb: Math.round(clamp(taz.metrics.highLoad.raw - s * 4 + rf(-5, 5), 25, 95)), cei: Math.round(clamp(95 - s * 2.5 - rf(0, 4), 70, 98)), competitorRank: s + 1, potentialUsers: Math.round(clamp(taz.population * rf(0.02, 0.06) - s * 80, 80, 2500)), lat: r5(taz.lat + gauss(0, 0.0012)), lng: r5(taz.lng + gauss(0, 0.0012)) });
  roi.push({ tazId: taz.id, newUsers: Math.round(rf(800, 3200)), revenueWan: r1(rf(6, 28)), trafficGB: Math.round(rf(900, 3600)), paybackMonths: rint(10, 28) });
}

// ── 投诉点（分类型 + 完整投诉单，对齐 投诉数据.csv）──
const C_TEMPLATE = {
  高负荷: { content: '高峰时段上网卡顿、视频加载慢，离开此地正常', cause: '投诉点主覆盖基站忙时同时上网人数多，基站高负荷影响网速', sug: '可通过载波聚合扩容/小区分裂、忙时负载均衡解决', conclusion: '网络-高负荷', rsrp: [-95, -88], sinr: [4, 9], rate: [2, 5] },
  弱覆盖: { content: '室内信号差、经常无信号，重启无效', cause: '主服小区RSRP偏低、建筑穿透损耗大，存在覆盖空洞', sug: '建议新增室分/微站补盲，优化邻区与功率', conclusion: '网络-弱覆盖', rsrp: [-115, -106], sinr: [-2, 4], rate: [0.5, 3] },
  室分故障: { content: '楼内特定楼层无信号，电梯里更明显', cause: '室分系统部分点位无输出/无源器件故障', sug: '派单核查室分链路，修复无源器件', conclusion: '网络-室分故障', rsrp: [-118, -108], sinr: [-3, 3], rate: [0.3, 2] },
  外部干扰: { content: '通话有杂音、网速忽快忽慢', cause: '上行受外部干扰、RSSI抬升，SINR恶化', sug: '开展干扰排查与频率优化，协调干扰源', conclusion: '网络-外部干扰', rsrp: [-92, -82], sinr: [-3, 2], rate: [1, 4] },
  网络优化: { content: '移动中切换掉话、边缘速率低', cause: '邻区/切换参数不合理导致乒乓切换', sug: '优化切换门限与邻区关系、调整下倾角', conclusion: '网络-网络优化', rsrp: [-105, -95], sinr: [0, 6], rate: [2, 6] },
  基站拆迁: { content: '近期信号突然变差', cause: '周边基站因市政/物业拆迁退服', sug: '推进站址恢复或新增替代站点', conclusion: '网络-基站拆迁', rsrp: [-112, -100], sinr: [-1, 5], rate: [1, 4] },
  基站故障: { content: '区域大面积无法上网', cause: '基站退服/传输中断告警', sug: '派单抢修、启用应急保障', conclusion: '网络-基站故障', rsrp: [-120, -105], sinr: [-4, 2], rate: [0, 1] },
  自行恢复: { content: '之前信号差现已恢复', cause: '临时拥塞/遮挡，已自行恢复', sug: '持续观察，无需处理', conclusion: '网络-自行恢复', rsrp: [-100, -90], sinr: [3, 9], rate: [3, 8] },
  实测正常: { content: '反映信号差但离开后正常，愿配合测试', cause: '现场实测各项指标正常，无线网络正常', sug: '安抚回访，关注终端/室内因素', conclusion: '用户原因-实测正常', rsrp: [-90, -78], sinr: [10, 18], rate: [12, 35] },
  其他: { content: '其他网络相关诉求', cause: '需进一步定位', sug: '转专业线核查', conclusion: '其他', rsrp: [-100, -88], sinr: [3, 10], rate: [3, 10] },
};
const C_TYPES = Object.keys(C_TEMPLATE);
const C_BIZ = ['公众类:手机:5G上网业务', '公众类:手机:4G上网业务', '公众类:手机:VoLTE语音业务'];
const complaints = [];
let cseq = 0;
for (const taz of tazList) {
  const n = Math.min(taz.complaintCount, 14);
  for (let c = 0; c < n; c++) {
    let type; const rr = rnd();
    if (taz._load > 80 && rr < 0.4) type = '高负荷';
    else if (taz._weak > 15 && rr < 0.5) type = pick(['弱覆盖', '室分故障']);
    else if (taz._interf > 12 && rr < 0.4) type = '外部干扰';
    else type = pick(C_TYPES);
    const tpl = C_TEMPLATE[type];
    const tRsrp = Math.round(rf(tpl.rsrp[0], tpl.rsrp[1])), tSinr = Math.round(rf(tpl.sinr[0], tpl.sinr[1])), tRate = r1(rf(tpl.rate[0], tpl.rate[1]));
    const solved = type !== '实测正常' && type !== '自行恢复' && rnd() < 0.7;
    complaints.push({
      id: 'C' + cseq, lat: r5(taz.lat + gauss(0, 0.0016)), lng: r5(taz.lng + gauss(0, 0.0016)), type, tazId: taz.id,
      ticketId: '2026' + String(20000 + cseq).padStart(8, '0'), bizType: pick(C_BIZ),
      time: `2026-02-${String(rint(1, 28)).padStart(2, '0')} ${String(rint(8, 22)).padStart(2, '0')}:${String(rint(0, 59)).padStart(2, '0')}:${String(rint(0, 59)).padStart(2, '0')}`,
      address: `广州市天河区${taz.name}${rint(1, 300)}号`, source: '申告', content: tpl.content,
      testResult: `现场测试：5G SS-RSRP ${tRsrp}dBm，SS-SINR ${tSinr}dB，下载速率 ${tRate} Mbps`,
      rootCause: tpl.cause, conclusion: tpl.conclusion, suggestion: tpl.sug,
      solveStation: solved ? `站点 GZ${rint(100000, 999999)}-${taz.name.slice(0, 4)}-5G_${rint(1, 3)}（经度${r5(taz.lng + gauss(0, 0.001))}，纬度${r5(taz.lat + gauss(0, 0.001))}）` : '',
      status: type === '实测正常' ? '已闭环' : pick(['归档', '处理中', '已闭环']),
    });
    cseq++;
  }
}

// ── 质差工单（中/高质差 TAZ）──
const poorTickets = [];
let pseq = 0;
const POOR_FIX = {
  弱覆盖: { cause: '主服小区弱覆盖占比高、RSRP偏低，存在覆盖空洞与穿透差', opt: '优化下倾角与功率、补强邻区', build: '建议新增室分/微站补盲' },
  高干扰: { cause: '信号强但SINR低，存在同频/外部干扰（高层远小区）', opt: 'PCI/邻区与频率优化、控制过覆盖、下压下倾角', build: '一般无需新建，优先优化' },
  速率: { cause: '速率质差占比高，受覆盖/干扰/容量综合影响', opt: '载波聚合、参数优化提升边缘速率', build: '高价值区可考虑扩容/新建' },
  上行速率: { cause: '上行速率受限（直播/上传），上行容量不足', opt: '上行CA/SUL、时隙配比优化', build: '场馆类按需应急扩容' },
  下行速率: { cause: '下行速率受限，忙时容量受压', opt: '扩容新增小区、负载均衡', build: '建议小区分裂/新建' },
  时延: { cause: '时延质差占比高，影响游戏/实时业务', opt: '干扰协调、调度优化降低空口时延', build: '热点区可新增小站' },
  高负荷: { cause: '忙时PRB利用率高、负荷受限', opt: '扩容/小区分裂、忙时负载均衡', build: '高话务区建议新建扩容' },
};
for (const taz of tazList) {
  if (taz.poorSeverity === '低') continue;
  const fix = POOR_FIX[taz.dominantPoor] || POOR_FIX['速率'];
  poorTickets.push({ id: 'PT' + pseq++, tazId: taz.id, poorType: taz.dominantPoor, cause: fix.cause, optimize: fix.opt, build: fix.build, affectedUsers: Math.round(taz.population * rf(0.03, 0.12)) });
}

// ── 社会事件（演唱会/市集/在建/楼盘）──
const social = [
  { id: 'E1', name: '珠江新城新建超甲写字楼', kind: 'construction', lat: 23.1175, lng: 113.3225, detail: '2026Q3交付，预计日间话务+35%，需提前容量储备' },
  { id: 'E2', name: '天河路商圈跨年市集', kind: 'event', lat: 23.135, lng: 113.324, detail: '客流激增，短视频/直播话务高峰' },
  { id: 'E3', name: '中山大道地铁施工', kind: 'construction', lat: 23.1392, lng: 113.348, detail: '围挡改变传播环境，沿线弱覆盖加剧' },
  { id: 'E4', name: '天河体育中心演唱会', kind: 'event', lat: 23.1335, lng: 113.3175, detail: '万人级聚集，上行脉冲占满上行资源' },
  { id: 'E5', name: '猎德新盘在售', kind: 'realestate', lat: 23.118, lng: 113.337, detail: '新交付社区入住率上升，居住话务增长' },
  { id: 'E6', name: '棠下旧改在建', kind: 'construction', lat: 23.13, lng: 113.354, detail: '旧改施工期传播环境变化' },
];
const churn = [];
for (const g of grids) {
  const taz = tazList.find((t) => t.id === g.tazId);
  const base = (g.weakCoverRatio / 100) * 0.3 + (g.loadPct > 80 ? 0.12 : 0) + (taz && taz.typicalIssue !== '正常' ? 0.1 : 0);
  const prob = clamp(0.04 + base + gauss(0, 0.04), 0.01, 0.8);
  const cu = Math.round(rf(2, 30) * prob);
  if (cu > 0) churn.push({ gridId: g.id, churnUsers: cu, churnProb: r2(prob), downgradeUsers: Math.round(cu * rf(1, 1.8)) });
}

const cell5g = rint(7800, 9200), cell4g = rint(4800, 5800);
const highLoadCellCount = rint(38, 60);
const hourly = Array.from({ length: 24 }, (_, h) => { const d = Math.exp(-((h - 14) ** 2) / 30); const n = Math.exp(-((h - 22) ** 2) / 12); return { hour: h, poor: Math.round(18 + 34 * (0.5 * d + 0.7 * n) + gauss(0, 2)), load: Math.round(12 + 40 * (0.7 * d + 0.4 * n) + gauss(0, 2)) }; });
const newSiteByDistrict = DISTRICTS.map((d, i) => ({ district: d, count: i === 0 ? rint(42, 58) : Math.round(rf(4, 40) * (1 - i * 0.06)) }));

const dataset = {
  meta: { region: '广东省 · 广州市天河区', period: '2026年02月', center: CENTER, bbox: BBOX, gridSize: GRID_M, generatedAt: new Date().toISOString(), gridTotal: grids.length },
  kpi: { cell4g, cell5g, poorCellRatio: r1(rf(10, 14)), poorCellChg: r1(rf(-1, 3)), highLoadCellRatio: r1((highLoadCellCount / (cell4g + cell5g)) * 100 * rf(8, 14)), highLoadCellChg: r1(rf(-1, 3)), highLoadCellCount, hourly, newSiteByDistrict },
  tazList: tazList.map(({ _zone, _weak, _interf, _load, _ratePoor, _lat, ...t }) => t),
  grids, planSites, roi, complaints, social, churn, poorTickets,
};
function ensure(p) { mkdirSync(dirname(p), { recursive: true }); }
const dsp = resolve(ROOT, 'public/data/dataset.json');
ensure(dsp); writeFileSync(dsp, JSON.stringify(dataset));
console.log(`dataset: ${tazList.length} TAZ, ${grids.length} grids, ${planSites.length} sites, ${complaints.length} complaints, ${poorTickets.length} poorTickets`);

// ── 智能板真实管道格式 CSV ──
const SB_COLS = ['time', 'mgrs_grid_id', 'gnodeb_id', 'cell_id', 'svid_tot_vid_download_dv', 'svid_tot_dl_vid_tcp_rtt', 'svid_tot_dl_vid_pkts_for_tcp_rtt', 'svid_tot_dl_tcp_pkts', 'svid_tot_dl_retrans_tcp_pkts', 'svid_tot_dl_vid_tcp_rtt_x_th', 'svid_tot_dl_vid_tcp_syn2synack_dly', 'svid_tot_dl_vid_tcp_est_syn2synack', 'svid_tot_dl_vid_tcp_synack2ack_dly', 'svid_tot_dl_vid_tcp_est_synack2ack', 'svid_tot_dl_vid_tcp_ack2data_dly', 'svid_tot_dl_vid_tcp_est_ack2data', 'total_mr_count', 'dl_ssb_rsrp_accumulated', 'dl_sinr_accumulated', 'ul_rsrp_accumulated', 'ul_sinr_accumulated', 'ul_ssb_rsrp_valid_count', 'ul_sinr_valid_count', 'dl_sinr_valid_count', 'dl_ssb_rsrp_valid_count', 'dl_ssb_rsrp_poor_count', 'dl_sinr_poor_count', 'dl_ssb_rsrp_and_sinr_valid_count', 'dl_ssb_rsrp_good_and_sinr_poor_count', 'dl_ssb_rsrp_poor_and_sinr_poor_count', 'ul_rsrp_poor_count', 'ul_sinr_poor_count', 'ul_rsrp_and_sinr_valid_count', 'ul_rsrp_good_and_sinr_poor_count', 'ul_rsrp_poor_and_sinr_poor_count', 'dl_cqi_cw0_accumulated', 'dl_cqi_cw0_count', 'dl_cqi_cw1_accumulated', 'dl_cqi_cw1_count', 'ul_mcs_accumulated', 'dl_mcs_accumulated', 'ul_mcs_tb_count', 'dl_mcs_tb_count', 'ul_rb_accumulated', 'dl_rb_accumulated', 'ul_rb_schd_count', 'dl_rb_schd_count', 'dl_rank1_count', 'dl_rank2_count', 'dl_rank3_count', 'dl_rank4_count'];
function sbRow(g) {
  const vc = Math.max(3, Math.round(g.mr / 12));
  const poorR = Math.round((g.weakCoverRatio / 100) * vc), poorS = Math.round((g.poorQualityRatio / 100) * vc), goodSinrPoor = Math.round((g.highInterfRatio / 100) * vc);
  const pkts = rint(120, 16000), rttX = Math.round((g.highLatRatio / 100) * pkts), tcpPkts = pkts * rint(8, 12), retransP = Math.round((g.retransRatio / 100) * tcpPkts);
  const cqi = Math.round(clamp(15 - g.poorQualityRatio / 12, 3, 15)), mcs = Math.round(clamp(26 - g.poorQualityRatio / 8, 4, 28));
  const rbSched = rint(150, 38000), rbAcc = Math.round(rbSched * clamp((g.loadPct / 100) * rf(8, 16), 1, 22));
  return { time: '20260201', mgrs_grid_id: g.id, gnodeb_id: g.gnodeb, cell_id: g.cell, svid_tot_vid_download_dv: r1(g.trafficMB * 1024), svid_tot_dl_vid_tcp_rtt: r2(g.videoRtt * pkts), svid_tot_dl_vid_pkts_for_tcp_rtt: pkts, svid_tot_dl_tcp_pkts: tcpPkts, svid_tot_dl_retrans_tcp_pkts: retransP, svid_tot_dl_vid_tcp_rtt_x_th: rttX, svid_tot_dl_vid_tcp_syn2synack_dly: r2(rf(0, 2400)), svid_tot_dl_vid_tcp_est_syn2synack: rint(0, 80), svid_tot_dl_vid_tcp_synack2ack_dly: r2(rf(0, 1900)), svid_tot_dl_vid_tcp_est_synack2ack: rint(0, 80), svid_tot_dl_vid_tcp_ack2data_dly: r2(rf(0, 8300)), svid_tot_dl_vid_tcp_est_ack2data: rint(0, 80), total_mr_count: g.mr, dl_ssb_rsrp_accumulated: Math.round(g.rsrp * vc), dl_sinr_accumulated: r2(g.sinr * vc), ul_rsrp_accumulated: r2(g.ulRsrp * vc), ul_sinr_accumulated: r2(g.ulSinr * vc), ul_ssb_rsrp_valid_count: vc, ul_sinr_valid_count: vc, dl_sinr_valid_count: vc, dl_ssb_rsrp_valid_count: vc, dl_ssb_rsrp_poor_count: poorR, dl_sinr_poor_count: poorS, dl_ssb_rsrp_and_sinr_valid_count: vc, dl_ssb_rsrp_good_and_sinr_poor_count: goodSinrPoor, dl_ssb_rsrp_poor_and_sinr_poor_count: Math.round(poorR * 0.4), ul_rsrp_poor_count: Math.round(poorR * 1.2), ul_sinr_poor_count: poorS, ul_rsrp_and_sinr_valid_count: vc, ul_rsrp_good_and_sinr_poor_count: goodSinrPoor, ul_rsrp_poor_and_sinr_poor_count: Math.round(poorR * 0.5), dl_cqi_cw0_accumulated: cqi * vc, dl_cqi_cw0_count: vc, dl_cqi_cw1_accumulated: cqi * Math.round(vc * 0.6), dl_cqi_cw1_count: Math.round(vc * 0.6), ul_mcs_accumulated: mcs * rint(100, 2000), dl_mcs_accumulated: (mcs + 2) * rint(200, 4000), ul_mcs_tb_count: rint(100, 2000), dl_mcs_tb_count: rint(200, 4000), ul_rb_accumulated: Math.round(rbAcc * 0.5), dl_rb_accumulated: rbAcc, ul_rb_schd_count: Math.round(rbSched * 0.6), dl_rb_schd_count: rbSched, dl_rank1_count: rint(0, 30), dl_rank2_count: rint(0, 40), dl_rank3_count: rint(0, 10), dl_rank4_count: rint(0, 6) };
}
const sbLines = [SB_COLS.join('|')];
for (const g of grids) { const row = sbRow(g); sbLines.push(SB_COLS.map((c) => row[c]).join('|')); }
const sbp = resolve(ROOT, 'public/samples/智能板六维感知数据_样例.csv');
ensure(sbp); writeFileSync(sbp, '﻿' + sbLines.join('\n'), 'utf8');
const cnLines = ['grid_id,churn_users,churn_prob,downgrade_users'];
for (const c of churn) cnLines.push(`${c.gridId},${c.churnUsers},${c.churnProb},${c.downgradeUsers}`);
writeFileSync(resolve(ROOT, 'public/samples/离网用户清单_样例.csv'), '﻿' + cnLines.join('\n'), 'utf8');
const tsLines = ['record_type,id,name,sub_type,geo,props'];
for (const e of social) tsLines.push(`event,${e.id},${e.name},${e.kind},"${e.lat},${e.lng}","${JSON.stringify({ detail: e.detail }).replace(/"/g, '""')}"`);
writeFileSync(resolve(ROOT, 'public/samples/时空张量数据_样例.csv'), '﻿' + tsLines.join('\n'), 'utf8');
console.log('samples:', grids.length, 'grid rows /', churn.length, 'churn /', social.length, 'events');
