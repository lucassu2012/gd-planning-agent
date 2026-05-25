import { useRef, useState } from 'react';
import { useStore } from '../store';
import { parseSmartBoardCsv, parseChurnCsv, parseTensorCsv, readFileText } from '../data/load';

type Kind = 'smartboard' | 'churn' | 'tensor';
interface St { status: 'idle' | 'done' | 'error'; msg: string }

const META: { kind: Kind; num: number; title: string; desc: string; fmt: string; sample: string }[] = [
  {
    kind: 'smartboard', num: 1, title: '智能板数据（六维感知）',
    desc: '以 MGRS 50m×50m 栅格为单元的真实智能板话单。自动派生覆盖(RSRP)、干扰(SINR)、负荷、短视频体验(RTT/吞吐/重传/高时延占比)、弱覆盖/质差占比等六维指标，并定位到地图。',
    fmt: '管道符(|)分隔 · time | mgrs_grid_id | gnodeb_id | cell_id | svid_tot_dl_vid_tcp_rtt | dl_ssb_rsrp_accumulated | dl_sinr_accumulated | dl_ssb_rsrp_poor_count | dl_ssb_rsrp_good_and_sinr_poor_count | dl_rb_accumulated …（51列）',
    sample: 'samples/智能板六维感知数据_样例.csv',
  },
  {
    kind: 'churn', num: 2, title: '离网用户清单',
    desc: '市场侧分析输出、汇聚到栅格的离网/降档清单，用于离网聚集与网络侧联动分析。',
    fmt: '逗号分隔 · grid_id, churn_users, churn_prob, downgrade_users',
    sample: 'samples/离网用户清单_样例.csv',
  },
  {
    kind: 'tensor', num: 3, title: '时空张量数据',
    desc: '外部环境事件、在建工程、楼盘在售、用户通勤等，叠加到地图「社会」图层，支撑未来动态预测。',
    fmt: '逗号分隔 · record_type, id, name, sub_type, geo, props(JSON)',
    sample: 'samples/时空张量数据_样例.csv',
  },
];

const DEMOS: { id: 1 | 2 | 3 | 4; name: string; icon: string; color: string; desc: string }[] = [
  { id: 1, name: '智能板六维感知包', icon: '▦', color: '#3b82f6', desc: '高校竞技手游干扰场景：智能板栅格 + 干扰指标 + TAZ 边界，演示"信号强但 SINR 低"的根因与干扰治理。' },
  { id: 2, name: '离网经营数据包', icon: '⚑', color: '#ef4444', desc: '城中村离网聚集场景：离网用户地图 + 离网原因，区分网络可治理 / 市场维系，演示离网根因与挽留。' },
  { id: 3, name: '时空张量数据包', icon: '◷', color: '#a78bfa', desc: '商圈/枢纽话务激增场景：事件/在建/楼盘叠加，演示话务脉冲、未来发展预测与建站规划联动。' },
  { id: 4, name: 'Token经营数据包', icon: '◈', color: '#14b8a6', desc: 'AI算力套餐(Token)体验保障场景：智能板「高时延占比」+ 质差地图，定位写字楼/软件园/高校等Token重度区的上行/时延短板，演示监控→优化→5G-A上行增强建站闭环。' },
];

export default function ImportData() {
  const setView = useStore((s) => s.setView);
  const center = useStore((s) => s.dataset!.meta.center);
  const flags = useStore((s) => s.importedFlags);
  const importSmartBoard = useStore((s) => s.importSmartBoard);
  const importChurn = useStore((s) => s.importChurn);
  const importTensor = useStore((s) => s.importTensor);
  const loadDemo = useStore((s) => s.loadDemo);
  const [st, setSt] = useState<Record<Kind, St>>({ smartboard: { status: 'idle', msg: '' }, churn: { status: 'idle', msg: '' }, tensor: { status: 'idle', msg: '' } });

  async function onFile(kind: Kind, file: File) {
    try {
      const text = await readFileText(file);
      if (kind === 'smartboard') {
        const grids = parseSmartBoardCsv(text, center);
        if (!grids.length) throw new Error('未解析到栅格行');
        const avgRsrp = (grids.reduce((s, g) => s + g.rsrp, 0) / grids.length).toFixed(1);
        const avgRtt = Math.round(grids.reduce((s, g) => s + g.videoRtt, 0) / grids.length);
        importSmartBoard(grids);
        setSt((s) => ({ ...s, smartboard: { status: 'done', msg: `已解析 ${grids.length} 个栅格 · 均值 RSRP ${avgRsrp}dBm / 短视频RTT ${avgRtt}ms，已定位并刷新「智能板栅格」图层` } }));
      } else if (kind === 'churn') {
        const c = parseChurnCsv(text);
        if (!c.length) throw new Error('未解析到离网行');
        importChurn(c);
        setSt((s) => ({ ...s, churn: { status: 'done', msg: `已导入 ${c.length} 个离网栅格` } }));
      } else {
        const e = parseTensorCsv(text);
        if (!e.length) throw new Error('未解析到张量记录');
        importTensor(e);
        setSt((s) => ({ ...s, tensor: { status: 'done', msg: `已导入 ${e.length} 条事件，已叠加到「社会」图层` } }));
      }
    } catch (e: any) {
      setSt((s) => ({ ...s, [kind]: { status: 'error', msg: '解析失败：' + (e?.message ?? e) } }));
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 shrink-0 flex items-center px-4 gap-3 border-b border-white/10 bg-[#0f0f0f]">
        <button onClick={() => setView('global')} className="flex items-center gap-1 text-xs text-white/60 hover:text-white">
          <svg width="14" height="14" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" fill="none"><path d="M10 3l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          返回
        </button>
        <div className="h-5 w-px bg-white/10" />
        <b className="text-sm">导入数据</b>
        <span className="text-xs text-white/40">三类输入驱动 TAZ 价值评估、六维感知与智能规划</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[860px] mx-auto space-y-4">
          {/* 演示数据包：一键载入不同故事线 */}
          <div>
            <div className="text-sm font-semibold mb-1">演示数据包 <span className="text-white/40 text-xs font-normal">一键载入，演示不同故事线</span></div>
            <div className="grid grid-cols-2 gap-3">
              {DEMOS.map((d) => (
                <div key={d.id} className="rounded-xl border border-white/10 bg-[#0f0f0f] p-3.5 hover:border-blue-500/50 transition-colors flex flex-col">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: `${d.color}22`, color: d.color }}>{d.icon}</span>
                    <span className="text-xs font-bold">{d.name}</span>
                  </div>
                  <div className="text-[10.5px] text-white/50 leading-relaxed flex-1 mb-2.5">{d.desc}</div>
                  <button onClick={() => loadDemo(d.id)} className="text-xs px-3 py-1.5 rounded-md text-white font-medium" style={{ background: d.color }}>载入此演示 →</button>
                </div>
              ))}
            </div>
          </div>
          <div className="text-sm font-semibold pt-1">导入自有数据（CSV）</div>
          {META.map((m) => (
            <Card key={m.kind} m={m} loaded={flags[m.kind]} st={st[m.kind]} onFile={onFile} />
          ))}
          <div className="text-xs text-white/40 leading-relaxed pt-2">
            提示：当前已载入广州天河区演示数据。智能板数据格式与《智能板测试数据.csv》一致（管道符分隔、MGRS 栅格 ID、原始话单计数），导入后将按字段口径自动派生六维指标、解码经纬度并定位刷新地图。可下载样例查看完整字段。
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ m, loaded, st, onFile }: { m: (typeof META)[number]; loaded: boolean; st: St; onFile: (k: Kind, f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const done = st.status === 'done';
  return (
    <div className={`rounded-xl border p-4 transition-colors ${done ? 'border-emerald-500/40 bg-emerald-500/[0.04]' : 'border-white/10 bg-[#0f0f0f] hover:border-blue-500/40'}`}>
      <div className="flex items-center gap-3 mb-1.5">
        <span className="w-6 h-6 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center justify-center text-xs font-bold">{m.num}</span>
        <span className="font-semibold text-sm">{m.title}</span>
        {loaded && <span className="ml-auto text-xs text-emerald-400 font-medium">● 已载入</span>}
      </div>
      <div className="text-xs text-white/55 leading-relaxed mb-2">{m.desc}</div>
      <div className="text-[10.5px] text-white/45 font-mono bg-[#161616] rounded px-2.5 py-2 mb-3 break-all leading-relaxed">{m.fmt}</div>
      <div className="flex items-center gap-2.5 flex-wrap">
        <input ref={ref} type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(m.kind, f); e.currentTarget.value = ''; }} />
        <button onClick={() => ref.current?.click()} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">选择 CSV 文件</button>
        <a href={m.sample} download className="px-3 py-1.5 rounded-lg border border-white/15 text-white/70 hover:border-white/30 text-xs">下载样例</a>
        {st.status !== 'idle' && <span className={`text-xs ${st.status === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{st.msg}</span>}
      </div>
    </div>
  );
}
