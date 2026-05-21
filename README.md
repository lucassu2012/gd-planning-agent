# 广东移动 · 规划Agent（无线网络智能规划 DEMO）

业务-体验-价值协同的无线网络智能规划样机。TAZ 街区地块洞察 + 智能板栅格多维感知 + 投诉/质差/竞对分析 + 价值打分 + 建站规划（选站↔地图覆盖联动）+ 规划 Agent。

技术栈：React + Vite + TypeScript + Leaflet + Recharts + Tailwind。

## 本地运行

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # 生产构建到 dist/
npm run gen      # 重新生成广东模拟数据(public/data) 与样例 CSV(public/samples)
```

## 在线发布（GitHub Pages，任何人凭链接打开）

仓库已内置 GitHub Actions 自动部署（`.github/workflows/deploy.yml`），Vite 已用相对路径 `base: './'`，适配 Pages 子路径。

方式一（GitHub Desktop，最简单）：
1. 用 GitHub Desktop 打开本目录 → File ▸ Add Local Repository（或 Publish repository）。
2. 点 **Publish repository**（建议公开 Public），推送到你的 GitHub。
3. GitHub 仓库页 ▸ Settings ▸ Pages ▸ Build and deployment ▸ Source 选 **GitHub Actions**。
4. 推送后 Actions 自动构建部署，完成后链接为：`https://<你的用户名>.github.io/<仓库名>/`

方式二（命令行）：
```bash
git init && git add -A && git commit -m "init: 广东移动规划Agent"
git branch -M main
git remote add origin https://github.com/<用户名>/<仓库名>.git
git push -u origin main
# 然后在 仓库 Settings ▸ Pages ▸ Source 选 GitHub Actions
```

其他免费渠道（任选其一，均需各自账号）：
- Netlify：`npx netlify deploy --dir=dist --prod`
- Surge：`npx surge dist <自定义>.surge.sh`
- Cloudflare Pages：`npx wrangler pages deploy dist`

## 主要视图

- **全局洞察**：4/5G 小区、质差/高负荷 KPI + 24h 趋势 + 各区待新建 + TAZ 列表 + 地图（TAZ 街区地块按类型/质差染色、智能板连片栅格多指标、投诉、社会层）。
- **TAZ 整体洞察**：网络多维画像雷达 + 指标打分（可勾选/编辑权重）+ 环境/社会/网络深读（指标质差/业务质差/三家竞对）+ 栅格联动根因。
- **建站规划**：候选站清单（勾选）↔ 地图覆盖栅格模拟（选站越多绿色覆盖越多）+ 收益预估（新增用户/收入/投资/回报期）+ 规划决策 Agent。
- **导入数据**：智能板（真实管道格式）/ 离网清单 / 时空张量 CSV 导入。
