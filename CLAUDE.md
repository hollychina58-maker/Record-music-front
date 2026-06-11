# CLAUDE.md — Record-App

## 项目概要

AI 赋能的叙事平台：用户记录故事，MiniMax 自动生成配乐。React 18 + Express + Turso，水墨风格 UI。

## 开发命令

```bash
# 前端开发
cd client && npm run dev        # Vite 开发服务器 (端口由 Vite 自动分配)

# 后端开发
cd server && npm run dev        # tsx watch 热重载 (需 PORT=4000)

# 构建
cd client && npm run build      # tsc && vite build → client/dist/
cd server && npm run build      # tsc → server/dist/

# E2E 测试 (需同时启动前后端)
npx playwright test             # 运行全部 42 个测试
npx playwright test --headed    # 有头模式调试
```

## 完整构建 (Render 部署)

```bash
npm run build   # 安装 server 依赖 → 编译 → 复制 dist + node_modules 到根
npm start       # node dist/index.js
```

## 架构概览

```
client/   React 18 + Vite 5 + TypeScript (路由 / 组件 / hooks / stores / i18n)
server/   Express 4 + TypeScript + Turso (libsql) 数据库
e2e/      Playwright 42 个测试用例
```

## 关键路径

- **路由**: `client/src/App.tsx` — 所有页面路由 + 管理后台懒加载
- **状态**: `client/src/stores/authStore.ts` — Zustand JWT 认证持久化
- **API**: `client/src/services/api.ts` — Axios 单例 + 拦截器
- **国际化**: `client/src/i18n/LanguageContext.tsx` — 8 语言 Context
- **数据库**: `server/src/models/database.ts` — 10 张表 schema + 迁移
- **音乐生成**: `server/src/services/minimax.ts` — MiniMax API + 情绪分析
- **支付**: `server/src/services/payment/alipay.ts` — 支付宝 SDK v4
- **认证**: `server/src/middleware/auth.ts` — JWT + bcrypt

## 编码约定

- **SQL**: 原始参数化查询 `dbAll/dbGet/dbRun/dbBatch`，无 ORM
- **CSS**: 纯 CSS + 自定义属性（40+ 设计 tokens），无 Tailwind/CSS-in-JS
- **i18n**: 自定义 Context，JSON 翻译文件 8 语言，无第三方库
- **样式风格**: 水墨画（ink-wash），色调 `theme.css` 中定义
- **注释**: 中文注释为主，API 端点使用 JSDoc 风格

## 环境变量 (server/.env)

```
JWT_SECRET=         # 必需
MINIMAX_API_KEY=    # MiniMax 音乐生成
ALIPAY_APP_ID=      # 支付宝
ALIPAY_PRIVATE_KEY= # PKCS8 格式
ALIPAY_PUBLIC_KEY=  # 支付宝公钥
TURSO_DATABASE_URL= # 生产环境 Turso
TURSO_AUTH_TOKEN=   # Turso 认证
```

## 当前状态

- 33 个提交，工作区干净
- 支付宝沙箱已上线，微信支付/PayPal 待激活
- 42 个 E2E 测试全通过
- 所有会话记录同步至 Obsidian: `d:/dragon-Knowlege/MyClaudeMemo/Record-App/`
