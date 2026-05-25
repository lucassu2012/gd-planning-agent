// ── 广东移动 · 规划Agent · 数据模型（对齐 snapshot 样机）──

/** TAZ 类型（交通分析小区 / 场景类型） */
export type TazType =
  | '办公区'
  | '居住区'
  | '教育机构区'
  | '医疗机构区'
  | '政府机构区'
  | '文化体育区'
  | '生活服务区'
  | '交通枢纽区';

export const TAZ_TYPES: TazType[] = [
  '办公区',
  '居住区',
  '教育机构区',
  '医疗机构区',
  '政府机构区',
  '文化体育区',
  '生活服务区',
  '交通枢纽区',
];

/** 典型质差 */
export type TypicalIssue = '弱覆盖' | '高负荷' | '体验质差' | 'OTT覆盖落后' | '正常';
/** 优先级 */
export type Priority = '极高' | '高' | '中' | '低';
export const PRIORITY_ORDER: Record<Priority, number> = { 极高: 4, 高: 3, 中: 2, 低: 1 };

/** 价值打分 13 维指标 key */
export type MetricKey =
  | 'sceneType' // 场景类型
  | 'popDensity' // 人口密度
  | 'trafficDensity' // 业务密度(流量密度)
  | 'valueBusiness' // 价值业务(高价值商业比)
  | 'weakCover' // 弱覆盖
  | 'highInterf' // 高干扰
  | 'complaint' // 投诉强度
  | 'poorRate' // 质差率(质差采样点比例)
  | 'ratePoor' // 速率质差
  | 'latencyPoor' // 时延质差
  | 'lossPoor' // 丢包质差
  | 'highLoad' // 高负荷
  | 'competitorLag'; // 竞对落后(OTT覆盖落后)

export interface MetricDef {
  key: MetricKey;
  label: string;
  weight: number; // 默认权重(0~1)
  /** 原始值单位/说明 */
  unit: string;
}

/** 13 维指标定义（权重对齐 snapshot：投诉15%，场景/价值业务/速率/高负荷/竞对各10%，其余5%） */
export const METRICS: MetricDef[] = [
  { key: 'sceneType', label: '场景类型', weight: 0.1, unit: '' },
  { key: 'popDensity', label: '人口密度', weight: 0.05, unit: '人/km²' },
  { key: 'trafficDensity', label: '业务密度', weight: 0.05, unit: 'GB/km²' },
  { key: 'valueBusiness', label: '价值业务', weight: 0.1, unit: '%' },
  { key: 'weakCover', label: '弱覆盖', weight: 0.05, unit: '%' },
  { key: 'highInterf', label: '高干扰', weight: 0.05, unit: '%' },
  { key: 'complaint', label: '投诉强度', weight: 0.15, unit: '' },
  { key: 'poorRate', label: '质差率', weight: 0.05, unit: '%' },
  { key: 'ratePoor', label: '速率质差', weight: 0.1, unit: '%' },
  { key: 'latencyPoor', label: '时延质差', weight: 0.05, unit: '%' },
  { key: 'lossPoor', label: '丢包质差', weight: 0.05, unit: '%' },
  { key: 'highLoad', label: '高负荷', weight: 0.1, unit: '%' },
  { key: 'competitorLag', label: '竞对落后', weight: 0.1, unit: '%' },
];

export interface MetricValue {
  raw: number | string; // 原始值
  score: number; // 1~5 得分
}

/** 环境要素（楼宇/地块） */
export interface EnvElement {
  name: string;
  role: string; // 功能定位
  area: string; // 面积
  activity: string; // 主要活动
}

/** 网络指标质差行 */
export interface PoorRow {
  dim: string; // 指标维度
  item: string; // 指标项
  poorCount: number; // 质差话单数
  total: number; // 话单总数
  ratio: number; // 质差比例 %
}

/** TAZ（交通分析小区 / 场景单元） */
export interface Taz {
  id: string;
  code: string; // TAZ ID 十六进制
  name: string;
  type: TazType;
  district: string; // 行政区划
  contractor: string; // 承建方
  lat: number;
  lng: number;
  poly: [number, number][]; // 粗略边界(用于地图描边)
  population: number; // 常住人口
  dailyTrafficGB: number; // 日均流量
  typicalIssue: TypicalIssue;
  priority: Priority;
  activeIndex: Priority; // 活跃指数
  description: string; // 区域解读
  metrics: Record<MetricKey, MetricValue>;
  weightedScore: number; // 加权综合得分 0~5
  valueLevel: '高价值区域' | '中价值区域' | '低价值区域';
  buildings: EnvElement[]; // 环境要素
  poorRows: PoorRow[]; // 网络指标质差
  bizPoorRows: PoorRow[]; // 业务质差
  gridCount: number; // 关联智能板栅格数
  complaintCount: number; // 投诉数
  poiCategory: PoiCategory; // POI 类别（地图染色/图例）
  dominantPoor: string; // 主质差类型（质差地图标注）
  poorSeverity: '低' | '中' | '高'; // 质差程度（质差地图染色）
  competitors: { cmcc: OperatorPerf; telecom: OperatorPerf; unicom: OperatorPerf }; // 三家竞对
  qos: TazQos; // 典型业务体验指标（用于按门限分档判定质差）
  tokenUsers: number; // Token(AI算力)套餐用户数——AI推理/Agent重度用户聚集度
}

/** TAZ 典型业务体验指标（管A栅格呈现指标，用于分档判定） */
export interface TazQos {
  vodTput: number; // 视频点播 承载级下行吞吐率 Mbps
  vcUl: number; // 视频通话 承载级上行吞吐率 Mbps
  confUl: number; // 视频会议 承载级上行吞吐率 Mbps
  gameLat: number; // 手游 空口包时延 ms
  tokenTtft: number; // Token推理(AI/Agent) 首Token时延 ms（上行密集+时延敏感，越小越好）
}

/** POI 类别（TAZ 类型图例，对齐附件1） */
export type PoiCategory =
  | '房地产'
  | '公司企业'
  | '学校'
  | '医疗'
  | '政府机构'
  | '交通设施'
  | '酒店'
  | '购物'
  | '教育培训'
  | '金融'
  | '休闲娱乐'
  | '美食'
  | '运动健身'
  | '文化传媒';
export const POI_COLOR: Record<PoiCategory, string> = {
  房地产: '#ef4444',
  公司企业: '#22d3ee',
  学校: '#2dd4bf',
  医疗: '#34d399',
  政府机构: '#eab308',
  交通设施: '#f97316',
  酒店: '#ec4899',
  购物: '#22c55e',
  教育培训: '#3b82f6',
  金融: '#facc15',
  休闲娱乐: '#fb7185',
  美食: '#f87171',
  运动健身: '#a3e635',
  文化传媒: '#a78bfa',
};
export const POI_CATEGORIES = Object.keys(POI_COLOR) as PoiCategory[];

/** 运营商性能（竞对分析） */
export interface OperatorPerf {
  rsrp: number; // 平均 RSRP dBm
  sinr: number; // 平均 SINR dB
  samples: number; // 采样数 cnt
  gridCount: number; // 50m 栅格总数
  rsrpDist: number[]; // RSRP 分档计数 [≤-115,-115~-105,-105~-95,-95~-85,-85~-75,>-75]
  coverage: number; // 覆盖 0~100
  quality: number; // 质量 0~100
  experience: number; // 体验 0~100
}
export const RSRP_DIST_LABELS = ['≤-115', '-115~-105', '-105~-95', '-95~-85', '-85~-75', '>-75'];

/** 智能板 50m 栅格（真实字段派生） */
export interface SmartGrid {
  id: string; // mgrs_grid_id
  lat: number;
  lng: number;
  gnodeb: string;
  cell: string;
  rsrp: number; // dBm
  sinr: number; // dB
  ulRsrp: number;
  ulSinr: number;
  weakCoverRatio: number; // %
  poorQualityRatio: number; // %
  highInterfRatio: number; // 信号强质量差 %
  videoRtt: number; // ms
  videoTputMbps: number;
  retransRatio: number; // %
  highLatRatio: number; // RTT>阈值占比 %
  mr: number;
  loadPct: number; // 负荷 %
  trafficMB: number; // 短视频下行流量 MB
  users: number; // 栅格内用户数
  poorRatio: number; // 短视频下行质差比例 %
  tazId: string;
}

/** 建站候选 */
export interface PlanSite {
  id: string;
  tazId: string;
  name: string;
  priority: Priority;
  score: number; // 打分
  coverage: number; // 覆盖率 %
  prb: number; // PRB %
  cei: number; // CEI
  competitorRank: number; // 竞对 #
  potentialUsers: number; // 潜客
  lat: number;
  lng: number;
}

/** 建站收益预估（按 TAZ） */
export interface PlanRoi {
  tazId: string;
  newUsers: number;
  revenueWan: number; // 万/月
  trafficGB: number; // GB/日
  paybackMonths: number;
}

/** 离网原因（离网用户地图分类） */
export type ComplaintType =
  | '网络质差'
  | '弱覆盖'
  | '高负荷拥塞'
  | '资费偏高'
  | '竞对策反'
  | '服务不满'
  | '合约到期'
  | '其他';
export const COMPLAINT_COLOR: Record<ComplaintType, string> = {
  网络质差: '#ef4444',
  弱覆盖: '#f97316',
  高负荷拥塞: '#eab308',
  资费偏高: '#a78bfa',
  竞对策反: '#ec4899',
  服务不满: '#22d3ee',
  合约到期: '#3b82f6',
  其他: '#94a3b8',
};
export const COMPLAINT_TYPES = Object.keys(COMPLAINT_COLOR) as ComplaintType[];
/** 离网原因是否网络侧可治理 */
export const CHURN_NETWORK_REASON: Record<ComplaintType, boolean> = {
  网络质差: true, 弱覆盖: true, 高负荷拥塞: true, 资费偏高: false, 竞对策反: false, 服务不满: false, 合约到期: false, 其他: false,
};

/** 投诉点（含投诉单详情） */
export interface Complaint {
  id: string;
  lat: number;
  lng: number;
  type: ComplaintType; // 投诉类型
  tazId: string;
  ticketId: string; // 工单号
  bizType: string; // 业务类型(公众类:手机:5G上网业务)
  time: string; // 建单时间
  address: string; // 投诉地址(常驻)
  source: string; // 来源分类
  content: string; // 申告内容
  testResult: string; // 现场测试结论
  rootCause: string; // 根因分析
  conclusion: string; // 无线侧修复结论(网络-高负荷等)
  suggestion: string; // 网络调整建议
  solveStation: string; // 关联治理站点
  status: string; // 状态(在网预警/挽留中/已离网)
  churnUsers: number; // 该点离网/高危用户数
}

/** 质差工单（质差地图关联） */
export interface PoorTicket {
  id: string;
  tazId: string;
  poorType: string; // 质差类型
  cause: string; // 质差原因
  optimize: string; // 网络优化建议
  build: string; // 新建建议
  affectedUsers: number;
}

/** 社会事件（在建工程/楼盘/事件） */
export interface SocialEvent {
  id: string;
  name: string;
  kind: 'construction' | 'realestate' | 'event';
  lat: number;
  lng: number;
  detail: string;
}

/** 离网清单（汇聚栅格） */
export interface ChurnGrid {
  gridId: string;
  churnUsers: number;
  churnProb: number;
  downgradeUsers: number;
}

/** 全局 KPI / 图表数据 */
export interface GlobalKpi {
  cell4g: number;
  cell5g: number;
  poorCellRatio: number; // %
  poorCellChg: number;
  highLoadCellRatio: number; // %
  highLoadCellChg: number;
  highLoadCellCount: number;
  hourly: { hour: number; poor: number; load: number }[]; // 24h
  newSiteByDistrict: { district: string; count: number }[];
}

export interface Dataset {
  meta: {
    region: string;
    period: string; // 2026年02月
    center: [number, number];
    bbox: [number, number, number, number];
    gridSize: number;
    generatedAt: string;
    gridTotal: number;
  };
  kpi: GlobalKpi;
  tazList: Taz[];
  grids: SmartGrid[];
  planSites: PlanSite[];
  roi: PlanRoi[];
  complaints: Complaint[];
  social: SocialEvent[];
  churn: ChurnGrid[];
  poorTickets: PoorTicket[];
}

// ── 智能板栅格指标三级目录（业务场景 × 地图类别 × 具体指标），对齐附件2/设计文档Slide5 ──
export type GridField =
  | 'rsrp' | 'ulRsrp' | 'weakCoverRatio'
  | 'sinr' | 'ulSinr' | 'highInterfRatio'
  | 'users' | 'loadPct' | 'trafficMB'
  | 'videoRtt' | 'videoTputMbps' | 'highLatRatio' | 'retransRatio' | 'poorRatio';

export interface GridIndicator {
  label: string; // 具体指标名
  field: GridField;
  dir: 'high' | 'low'; // high=值越高越好(绿)；low=值越低越好
  domain: [number, number]; // 色阶域 [低,高]
  unit: string;
}
export interface GridCategory {
  category: string; // 地图类别：覆盖/干扰/用户/话务/体验/环境
  indicators: GridIndicator[];
}
/** 业务场景（体验类指标随场景切换标签） */
export const GRID_BUSINESS = ['短视频', '视频通话', '在线游戏', '网页浏览', 'AI推理(Agent)'] as const;
export const GRID_CATALOG: GridCategory[] = [
  {
    category: '覆盖',
    indicators: [
      { label: 'RSRP 覆盖电平', field: 'rsrp', dir: 'high', domain: [-115, -75], unit: 'dBm' },
      { label: '下行弱覆盖比例', field: 'weakCoverRatio', dir: 'low', domain: [0, 50], unit: '%' },
      { label: '上行 RSRP', field: 'ulRsrp', dir: 'high', domain: [-125, -90], unit: 'dBm' },
    ],
  },
  {
    category: '干扰',
    indicators: [
      { label: 'SINR', field: 'sinr', dir: 'high', domain: [0, 20], unit: 'dB' },
      { label: '高干扰比例(信号强质差)', field: 'highInterfRatio', dir: 'low', domain: [0, 60], unit: '%' },
    ],
  },
  {
    category: '话务',
    indicators: [
      { label: '负荷(PRB利用率)', field: 'loadPct', dir: 'low', domain: [20, 100], unit: '%' },
      { label: '下行流量', field: 'trafficMB', dir: 'high', domain: [0, 4000], unit: 'MB' },
    ],
  },
  {
    category: '用户',
    indicators: [{ label: '用户数', field: 'users', dir: 'high', domain: [0, 60], unit: '' }],
  },
  {
    category: '体验',
    indicators: [
      { label: '下行 TCP RTT 时延', field: 'videoRtt', dir: 'low', domain: [20, 140], unit: 'ms' },
      { label: '高时延占比(>阈值)', field: 'highLatRatio', dir: 'low', domain: [0, 60], unit: '%' },
      { label: '下行质差比例', field: 'poorRatio', dir: 'low', domain: [0, 50], unit: '%' },
      { label: '承载级下行吞吐', field: 'videoTputMbps', dir: 'high', domain: [1, 60], unit: 'Mbps' },
      { label: '重传率', field: 'retransRatio', dir: 'low', domain: [0, 10], unit: '%' },
    ],
  },
];

// 颜色 / 标签常量
export const ISSUE_COLOR: Record<TypicalIssue, string> = {
  弱覆盖: '#ef4444',
  高负荷: '#f97316',
  体验质差: '#eab308',
  OTT覆盖落后: '#a142ff',
  正常: '#10b981',
};
export const PRIORITY_COLOR: Record<Priority, string> = {
  极高: '#ef4444',
  高: '#f97316',
  中: '#eab308',
  低: '#10b981',
};
export const TAZ_TYPE_COLOR: Record<TazType, string> = {
  办公区: '#3b82f6',
  居住区: '#10b981',
  教育机构区: '#a142ff',
  医疗机构区: '#ff6fae',
  政府机构区: '#1fa9ff',
  文化体育区: '#eab308',
  生活服务区: '#f97316',
  交通枢纽区: '#29d6e6',
};
