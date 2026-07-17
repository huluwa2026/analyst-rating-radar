# Analyst Rating Radar — 开源华尔街分析师评级看板

Analyst Rating Radar 是一个开源的美股研究看板，用于追踪华尔街分析师评级、股票上调与下调、目标价变动、分析师共识，以及多家机构对同一公司的共识与分歧。

[English](README.md) | [简体中文](README.zh-CN.md)

**[打开在线分析师评级看板](https://analyst-rating-radar.vercel.app)** · [系统架构](docs/architecture.md) · [安全策略](SECURITY.md) · [使用 Drillr 构建](https://drillr.ai/l/analyst-radar-gh)

[![CI](https://github.com/huluwa2026/analyst-rating-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/huluwa2026/analyst-rating-radar/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-101b17?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-16734a.svg)](LICENSE)

![展示美股评级上调、评级下调、目标价变化和多机构信号的华尔街分析师评级看板](docs/analyst-rating-radar.png)

## 这个项目解决什么问题？

Analyst Rating Radar 聚焦一个问题：**华尔街分析师今天改变了什么？**

它把分散的分析师评级事件整理成透明、可搜索的每日视图，同时保留原始机构、分析师、评级、目标价和重要性信息，不用黑箱预测替代原始事实。

你可以用它查看：

- 美股评级上调、评级下调、首次覆盖、重申和维持评级；
- 分析师目标价上调、下调，以及评级与目标价相互矛盾的信号；
- 多家华尔街研究机构对同一只股票的一致意见或分歧；
- 当前分析师共识及最多 120 天的已发布评级历史；
- 按股票代码、公司、研究机构或分析师搜索和筛选。

本项目不预测收益、不解释股价波动，也不构成投资建议。

## 核心功能

- **关键变动**：集中查看评级上调、下调和首次覆盖。
- **多机构共识**：识别多家独立机构同时发出相同方向的评级信号。
- **分析师分歧**：展示不同机构之间相反的评级或目标价方向。
- **矛盾信号**：识别“评级上调但目标价下调”等组合。
- **全部活动**：按股票代码聚合完整交易日事件，同时保留每一条原始评级。
- **股票详情**：展示公司信息、分析师共识和已发布的历史评级事件。
- **研究筛选器**：支持按动作、方向、重要性及机构数量筛选。

## 本地运行

需要 Node.js 20.9 或更高版本，以及 npm。

```bash
git clone https://github.com/huluwa2026/analyst-rating-radar.git
cd analyst-rating-radar
npm ci
npm run dev:fixture
```

打开 [http://localhost:3000](http://localhost:3000)。Fixture 模式使用合成测试数据，不需要任何 API 凭据。

完整验证命令：

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
RADAR_DATA_MODE=fixture npm run build
```

实时刷新需要[创建 Drillr API Key](https://drillr.ai/l/analyst-radar-gh)。服务端请求会携带稳定的 `X-Drillr-Via: analyst-rating-radar` 项目标识，用于汇总项目用量，不会给公开页面 URL 添加追踪参数。

## 技术栈

| 层级 | 技术 |
|---|---|
| Web 应用 | Next.js 16 App Router、React 19、TypeScript |
| 快照存储 | 私有 Vercel Blob、不可变对象与原子清单发布 |
| 数据源 | [Drillr 结构化分析师评级数据](https://drillr.ai/l/analyst-radar-gh) |
| 测试 | Vitest、Playwright |
| 部署 | Vercel Cron、Functions、Firewall |

## 数据架构与防滥用

公开网页请求只读取已经发布的私有快照，永远不会因为用户访问而调用 Drillr。只有经过认证的定时任务或管理员才能进入刷新流程。

每次上游调用都需要先从全局每日预算中原子扣减额度；数据源失败会自动打开熔断器；公开 ticker 详情只能查询当前已发布快照中的股票。Vercel Firewall 还会在边缘按 IP 限制公开请求频率。

完整设计见[架构文档](docs/architecture.md)。

## 安全与开源数据边界

`DRILLR_API_KEY`、`BLOB_READ_WRITE_TOKEN` 和 `CRON_SECRET` 只存在于服务端部署环境。它们不会进入浏览器代码、HTML、公开 JSON、Fixture、日志或提交到 GitHub 的环境文件。

生产快照保存在私有 Blob 存储中，不属于开源仓库内容。漏洞请通过 [GitHub 私密漏洞报告](https://github.com/huluwa2026/analyst-rating-radar/security/advisories/new)提交，不要在 Issue 中附带凭据或私有数据。

## 隐私

在线站点使用 Vercel Web Analytics 统计匿名、汇总的页面访问和来源，不设置分析 Cookie，也不发送自定义交互事件。事件发送前会移除查询参数和 URL 片段，因此日期、搜索词和所选股票不会进入分析数据。跳转 Drillr 使用可读的品牌短链，落地后的地址栏不显示 UTM 参数。

## 参与贡献

欢迎提交可复现的 Bug、聚焦的功能建议、文档改进和 Pull Request。可以先查看[现有 Issues](https://github.com/huluwa2026/analyst-rating-radar/issues)。

## 许可证

本项目采用 [MIT License](LICENSE)。
