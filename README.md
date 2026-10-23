# 仓位 Position

React + Vite 仓位计算器设计预览 v0.1，纯静态页面，计算在浏览器内完成。

```sh
npm install
npm run dev
```

`npm test` 验证计算逻辑；`npm run build` 输出静态文件至 `dist/`；`npm run preview` 预览生产构建。

本版用于确认视觉和交互：浅色工作台、桌面双栏 / 手机单栏、实时计算、多空切换、可选止盈与结果复制。不显示具体标的，合约数量以「单位」表示，适用于数量 × 价格的线性计价；不接行情或交易接口。切换方向时按原价差镜像调整止损与止盈；无效参数会清空结果。

风险快捷值固定为 1%、2%、3%、4%，默认 4%；杠杆默认 10x。账户资金、风险比例和杠杆的有效值自动写入当前站点的 localStorage（键 `position-size:preferences`），刷新后恢复；价格与方向不保存。恢复默认会重置这些设置。存储被禁用时仍可计算，并显示无法保存的提示。

入场、止损、止盈价格支持直接在输入框内使用 Ctrl+V 或系统粘贴。`65,000.25`、`1,234,567.89` 等合法千分位会自动识别；格式错误时保留原值并显示错误。

合约数量 = 账户资金 × 风险比例 ÷ |入场价 − 止损价|；预计保证金 = 仓位大小 ÷ 杠杆；保证金比率 = 预计保证金 ÷ 账户资金 × 100%。杠杆只影响预计保证金及保证金比率，不改变按风险反推的合约数量及计划盈亏。保证金按入场价估算，未计手续费、滑点、交易数量步长和维持保证金，不计算强平。预计保证金超出账户资金时显示提示，不自动截断。价格区间图的间距不按数值比例，仅展示交易参数，并非市场数据或预测。

网页与复制结果统一使用「合约数量、仓位大小、预计保证金、保证金比率」。这四项的复制值四舍五入，固定保留两位小数；内部计算保留完整精度。

GitHub 仓库：[ggzui/position-size](https://github.com/ggzui/position-size)；网站地址：[仓位计算器](https://ggzui.github.io/position-size/)；发布记录：[GitHub Actions](https://github.com/ggzui/position-size/actions)。

部署工作流位于 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)。每次 push 到 `main` 分支后，GitHub Actions 使用 Node.js 24 依次运行 `npm ci`、`npm test`、`npm run build`，通过后上传 `dist/` 并发布到 GitHub Pages；测试或构建失败时停止发布。也可在 Actions 页选择「Deploy to GitHub Pages」→「Run workflow」，选择 `main` 手动发布。

仓库 Settings → Pages 的 Source 使用「GitHub Actions」。工作流使用内置 `GITHUB_TOKEN`，仅申请读取仓库、写入 Pages 与签发部署身份令牌的权限，无需额外配置部署密钥。发布使用 `github-pages` 环境，同一时间仅运行一次；新 push 不会打断正在执行的部署。所有 Actions 固定到已核对的完整提交 SHA。本项目保留 `base: './'`，构建资源使用相对路径，兼容 `/position-size/` 仓库子路径。

部署依据：[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[Vite GitHub Pages 部署](https://vite.dev/guide/static-deploy.html#github-pages)、[Vite 相对 base](https://vite.dev/guide/build.html#relative-base)、[GitHub Actions 并发控制](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)。

界面字体通过 Google Fonts 加载 DM Sans / Noto Sans SC；不可用时使用本地无衬线字体。

参考：[React useState](https://react.dev/reference/react/useState)、[Vite 静态部署与 GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages)、[CME 仓位与风险](https://www.cmegroup.com/education/courses/trade-and-risk-management/proper-position-size)、[初始保证金公式](https://www.bybit.com/en/help-center/article/Initial-Margin-USDT-Contract)、[localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)。
