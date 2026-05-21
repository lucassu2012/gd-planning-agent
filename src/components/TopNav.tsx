import { useStore, type View } from '../store';

const NAV: { key: View; label: string }[] = [
  { key: 'global', label: '全局洞察' },
  { key: 'detail', label: 'TAZ整体洞察' },
  { key: 'planning', label: '建站规划' },
  { key: 'import', label: '导入数据' },
];

export default function TopNav() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const openTaz = useStore((s) => s.openTaz);
  const openPlanning = useStore((s) => s.openPlanning);
  const dataset = useStore((s) => s.dataset);
  const selectedTazId = useStore((s) => s.selectedTazId);

  const go = (k: View) => {
    if (k === 'detail') {
      const id = selectedTazId ?? dataset?.tazList[0]?.id;
      if (id) openTaz(id);
    } else if (k === 'planning') {
      const id = useStore.getState().planTazId ?? dataset?.tazList.find((t) => t.priority === '极高' || t.priority === '高')?.id ?? dataset?.tazList[0]?.id;
      if (id) openPlanning(id);
    } else {
      setView(k);
    }
  };

  return (
    <header className="h-14 shrink-0 flex items-center px-5 bg-[#0f0f0f] border-b border-white/10 gap-6">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M3 18l5-5 3 3 7-8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="18" cy="8" r="1.6" fill="#fff" stroke="none" />
          </svg>
        </div>
        <div>
          <div className="text-[15px] font-bold tracking-tight leading-none">
            广东移动 <span className="text-blue-400">规划Agent</span>
          </div>
          <div className="text-[10px] text-white/40 mt-0.5">业务·体验·价值协同的无线网络智能规划</div>
        </div>
      </div>

      <nav className="flex items-center gap-1 ml-4">
        {NAV.map((n) => {
          const active = view === n.key;
          return (
            <button
              key={n.key}
              onClick={() => go(n.key)}
              className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                active ? 'bg-blue-500/15 text-blue-300' : 'text-white/55 hover:text-white hover:bg-white/5'
              }`}
            >
              {n.label}
            </button>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-4 text-xs text-white/50">
        <span>{dataset?.meta.period} · {dataset?.meta.region}</span>
        <div className="flex items-center gap-2 pl-4 border-l border-white/10">
          <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-300 text-xs font-bold">管</div>
          <div className="leading-tight">
            <div className="text-white/80">管理员</div>
            <div className="text-[10px] text-white/40">规划洞察专家</div>
          </div>
        </div>
      </div>
    </header>
  );
}
