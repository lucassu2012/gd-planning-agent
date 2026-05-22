import { useStore } from '../store';
import { TIER_NAMES, TIER_COLORS } from '../lib/qos';

const TIER_HEADERS = TIER_NAMES.slice(0, 4); // 极致 / 优秀 / 良好 / 入门

export default function QosEditor({ onClose }: { onClose: () => void }) {
  const defs = useStore((s) => s.qosThresholds);
  const setQosTier = useStore((s) => s.setQosTier);
  const resetQos = useStore((s) => s.resetQos);

  return (
    <div
      className="absolute inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[760px] max-w-[94%] max-h-[88%] overflow-hidden rounded-xl border border-white/12 bg-[#111] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-start justify-between bg-[#161616]">
          <div>
            <div className="text-sm font-bold">典型业务分档网络需求 · 质差判定参考门限</div>
            <div className="text-[11px] text-white/45 mt-0.5">编辑各业务的体验分档门限，地图与质差TAZ判定将实时按新门限重算。</div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none px-1">×</button>
        </div>

        {/* 表格 */}
        <div className="flex-1 overflow-auto px-5 py-3">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-white/45 text-[10px] uppercase">
                <th className="text-left font-medium py-2 pr-2">业务类型</th>
                <th className="text-left font-medium py-2 px-2">主要流向</th>
                <th className="text-left font-medium py-2 px-2">管A栅格呈现指标</th>
                {TIER_HEADERS.map((t, i) => (
                  <th key={t} className="font-medium py-2 px-1 text-center" style={{ color: TIER_COLORS[i] }}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {defs.map((d, bi) => (
                <tr key={d.biz} className="border-t border-white/8">
                  <td className="py-2.5 pr-2 font-semibold text-white/90 whitespace-nowrap">{d.biz}</td>
                  <td className="py-2.5 px-2 text-white/55 whitespace-nowrap">{d.flow}</td>
                  <td className="py-2.5 px-2 text-white/55">
                    {d.metric}
                    <span className="text-white/35 ml-1">({d.unit}·{d.dir === 'high' ? '越大越好' : '越小越好'})</span>
                  </td>
                  {d.tiers.map((v, ti) => (
                    <td key={ti} className="py-2 px-1">
                      <input
                        type="number"
                        value={v}
                        step={v < 5 ? 0.5 : 1}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value);
                          if (!Number.isNaN(n)) setQosTier(bi, ti, n);
                        }}
                        className="w-full bg-[#0a0a0a] border rounded px-1.5 py-1 text-center tabular-nums outline-none focus:border-blue-500/60"
                        style={{ borderColor: `${TIER_COLORS[ti]}55`, color: TIER_COLORS[ti] }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 text-[11px] text-white/45 leading-relaxed bg-[#0d0d0d] border border-white/8 rounded-lg p-3">
            <div className="font-semibold text-white/65 mb-1">判定规则</div>
            <div>· 每个TAZ按四类业务的实测指标，对照上方门限分别归入 <span style={{ color: TIER_COLORS[0] }}>极致</span> / <span style={{ color: TIER_COLORS[1] }}>优秀</span> / <span style={{ color: TIER_COLORS[2] }}>良好</span> / <span style={{ color: TIER_COLORS[3] }}>入门</span> / <span style={{ color: TIER_COLORS[4] }}>质差</span>。</div>
            <div>· 任一业务体验未达「良好」即判该TAZ为<b className="text-white/70">质差</b>；综合短板越严重，质差程度（低/中/高）越高。</div>
            <div>· 「越大越好」指标值≥门限即达标；「越小越好」（如手游空口时延）指标值≤门限即达标。</div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between bg-[#161616]">
          <button onClick={resetQos} className="text-xs text-white/55 hover:text-white px-3 py-1.5 rounded border border-white/12 hover:border-white/25">恢复默认门限</button>
          <button onClick={onClose} className="text-xs font-medium px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white">应用并关闭</button>
        </div>
      </div>
    </div>
  );
}
