import { Component, useEffect, type ReactNode } from 'react';
import { useStore } from './store';
import TopNav from './components/TopNav';
import GlobalInsight from './views/GlobalInsight';
import TazDetail from './views/TazDetail';
import Planning from './views/Planning';
import ImportData from './views/ImportData';

class ErrorBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null as string | null };
  static getDerivedStateFromError(e: any) { return { err: (e?.stack || e?.message || String(e)).slice(0, 600) }; }
  render() {
    if (this.state.err) return <div className="p-6 text-xs text-red-300 whitespace-pre-wrap font-mono">渲染错误：{this.state.err}</div>;
    return this.props.children;
  }
}

export default function App() {
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const view = useStore((s) => s.view);
  const init = useStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-white/70">
        <div className="text-center">
          <div className="spin w-10 h-10 mx-auto rounded-full border-[3px] border-white/15 border-t-blue-400" />
          <div className="mt-4 text-sm tracking-wide">广东移动 · 规划Agent</div>
          <div className="mt-1 text-xs text-white/40">正在加载 TAZ 与智能板数据…</div>
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-red-400 text-sm">数据加载失败：{error}</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-white font-sans overflow-hidden">
      <TopNav />
      <div className="flex-1 overflow-hidden">
        <ErrorBoundary key={view}>
          {view === 'global' && <GlobalInsight />}
          {view === 'detail' && <TazDetail />}
          {view === 'planning' && <Planning />}
          {view === 'import' && <ImportData />}
        </ErrorBoundary>
      </div>
    </div>
  );
}
