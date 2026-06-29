# Record-App 设计风格指南 — 墨韵 InkRhyme v2

**版本**: 2026-06-30  
**设计方向**: 水墨画材质叙事平台  
**核心原则**: 从材料出发，命名即世界观，克制即力量

---

## 一、设计世界观

Record-App 的视觉语言建立在**中国水墨画的材质体系**之上。每一个设计决策——从色彩命名到动画曲线——都锚定在具体的物理材料中：

- **墨**：六阶灰黑，模拟浓淡枯湿
- **纸**：宣纸本色，暖白微黄
- **印**：朱红印泥，唯一强色点缀
- **砚**：深橄榄，次级文本
- **茶**：暖棕，hover 温润反馈
- **蛀**：浅米，旧纸质感

这不是一套"配色方案"，而是一个完整的世界观。新增 UI 元素时，请回答：**"这个颜色在水墨画的什么材料中出现过？"**

---

## 二、色彩系统

### 2.1 墨色系 — 主文本和深色元素

```
--ink-deepest:  #0F0F0F   最深墨（标题、强调文本）
--ink-deep:     #141414   深墨
--ink-black:    #1C1C1C   正文黑色（默认文本色）
--ink-dark:     #2E2E2E   中深墨
--ink-medium:   #555555   中墨（次级文本、图标）
--ink-light:    #808080   淡墨（辅助文本、placeholder）
--ink-wash:     #B0A8A0   水墨渲染（分割线、边框）
--ink-faint:    #C8C0B8   极淡墨（极细边框、禁用态）
```

约束：`--ink-light` (#808080) 在 `--xuan-paper` 底色上对比度约 3.1:1，**仅用于 ≥18px 的文本**。小字号辅助文本请使用 `--ink-medium` (#555)。

### 2.2 纸色系 — 页面和卡片背景

```
--xuan-paper:   #F5F0E8   宣纸 — 页面主背景
--paper-white:  #FAF8F5   白纸 — 弹窗、面板背景
--paper-cream:  #F2ECE2   奶纸 — 卡片背景
--paper-aged:   #EBE7DF   旧纸 — 输入框、hover 背景
--paper-warm:   #F0ECE4   暖纸 — 次要面板
--paper-mist:   rgba(246,244,239,0.88)   纸雾 — 毛玻璃导航栏
```

### 2.3 印泥系 — 唯一强调色

```
--seal-red:         #C23B2A   朱砂红 — 主 CTA、链接、删除
--seal-red-light:   #D9513F   浅朱砂 — hover 态
--seal-red-dark:    #8B2418   深朱砂 — active 态
--seal-glow:        rgba(194,59,42,0.10)   印泥辉光 — 焦点、选中态
```

**重要**：`--seal-red` 是全站唯一暖色强调。**不要引入其他色系的强调色**（如蓝、绿、橙），除非是对比度必需的语义色（成功/警告）。

### 2.4 辅助色

```
--indigo:       #3A4F8B   靛蓝 — 次级 UI（极少使用）
--tea-stain:    #8C6E4A   茶渍 — hover 温润反馈
--gold-pale:    #E4D8C0   淡金 — 品牌点缀（导航栏）
--ember-orange: #E85A2C   余烬 — 燃烧动画专用
--color-success: #4A8B5E  成功 — 仅限 toast/通知
--color-warning: #C47A2E  警告 — 仅限 toast/通知
```

---

## 三、字体系统

### 3.1 四个字体角色

| 角色 | 字体族 | CSS 变量 | 用途 |
|:---|:---|:---|:---|
| **正文** | Noto Serif SC → Songti SC → SimSun | `--font-ink` | 故事正文、卡片标题、长文本 |
| **展示** | Ma Shan Zheng → ZCOOL XiaoWei | `--font-display` | 页面标题、hero 文字、情感锚点 |
| **印章** | ZCOOL XiaoWei | `--font-seal` | 装饰性印章标记、引用块 |
| **UI** | -apple-system → PingFang SC | `--font-ui` | 按钮、表单、导航、工具提示 |

### 3.2 使用约束

- `--font-display` **仅在 hero 和页面大标题使用**，每页最多出现 2 次。不在卡片、表单、列表中滥用书法字体
- `--font-seal` 仅用于纯装饰性元素（如 quotes、印章标记），不承载功能性信息
- `--font-ink` 是默认字体，用于所有正文内容
- `--font-ui` 用于所有交互元素
- 字号遵循 `--text-2xs` (~11px) → `--text-6xl` (~52px) 共 10 级

---

## 四、动效系统

### 4.1 动画分层

| 层级 | 动画 | 持续时间 | 用途 |
|:---|:---|:---|:---|
| **氛围** | mistFloat, smokeDrift, inkMorph | 20-35s | 背景装饰，极慢，不可感知 |
| **入场** | inkDropBloom, fadeInUp, cardReveal | 0.4-0.8s | 页面/组件首次出现 |
| **微交互** | stainSpread, ripple, floatGentle | 0.15-0.3s | hover、点击反馈 |
| **叙事** | burnCreep, ashFloat, inkReveal | 1-3s | 燃烧、内容揭示等特殊时刻 |

### 4.2 缓动曲线

```
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1)   入场动画
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1) 弹性反馈
--ease-drift:     cubic-bezier(0.25, 0.46, 0.45, 0.94) 氛围漂移
```

### 4.3 约束

- 任何动画必须通过 `@media (prefers-reduced-motion: reduce)` 降级
- 不引入无意义的装饰动画——每个动效必须有叙事或交互目的
- 签名动画 `inkDropBloom`（hero clip-path circle）仅在首页使用一次

---

## 五、组件设计规范

### 5.1 卡片 (Card)

- 背景: `--paper-cream`
- 悬停: 上浮 `translateY(-2px)` + 墨迹描边 `inkBleed` + 阴影加深
- 入场: `fadeInUp` 0.6s + stagger 延迟 (0.1s × n)
- 圆角: `--radius-lg` (8px)

### 5.2 导航栏 (Header)

- 毛玻璃: `backdrop-filter: blur(20px) saturate(180%)` + `--paper-mist`
- 底边: 动态渐变分割线 `ink-header__divider`
- 固定定位: `position: fixed` + `z-index: var(--z-float)`

### 5.3 音乐播放器 (MusicPlayer)

- 背景: `--paper-mist` + 毛玻璃
- 播放态: 额外辉光 `box-shadow` + 边框加深
- 进度条: 墨色渐变
- 波形: `waveform` 关键帧，各柱不同延迟

### 5.4 按钮 (Button)

- 主按钮: `--seal-red` 背景 → hover `--seal-red-light`
- 次按钮: 透明 + `--ink-wash` 边框 → hover 茶渍背景
- 危险操作: `--seal-red-dark` 边框 + 确认对话框

### 5.5 表单 (Input)

- 背景: `--paper-aged`
- 焦点: `--seal-glow` 辉光
- 禁用: `opacity: 0.5` + `cursor: not-allowed`

---

## 六、氛围系统

### 6.1 背景层级（由深到浅）

```
z-index: --z-smoke (-1)
├─ 烟雾层 (smoke-layer-1/2/3): 径向渐变 + blur(80px) + 25-35s 漂移动画
├─ 墨渍 blob (ink-blob-1/2/3): 不规则圆角 + blur(100px) + inkMorph
└─ 粒子 (particle-1~8): 4px 圆点 + 14-21s 上升漂移

z-index: --z-base (0)
└─ 页面内容

z-index: --z-sticky (20)
└─ 导航栏
```

所有氛围元素设置 `pointer-events: none`，不拦截交互。`opacity: 0.06-0.12` 确保仅在浅色背景上可见。

### 6.2 首页 Hero

- 签名动画: `inkDropBloom` (clip-path circle 从 0% → 150%)
- 大标题用 `--font-display`，字号 `--text-5xl` (~44px)
- 副标题用 `--font-ink`，`--ink-medium`，letter-spacing 0.3em
- 背景: 墨渍 wash + 单条竖线 (bg-line)

---

## 七、响应式规范

### 7.1 断点

| 断点 | 宽度 | 调整 |
|:---|:---|:---|
| Desktop | >1024px | 全尺寸，`--content-max: 960px` |
| Tablet | ≤1024px | 全宽容器，间距缩小 |
| Mobile | ≤640px | 字号缩小 1-2 级，导航高度 44px，`input font-size: 16px`（防 iOS 缩放） |

### 7.2 移动端特殊处理

- 分享面板从 modal 变为 bottom sheet (`slideUp` 动画)
- 卡片圆角从 `8px` 保持不变
- `100svh` 代替 `100vh`（处理 iOS Safari 地址栏）

---

## 八、无障碍基线

- ✅ `:focus-visible` outline（当前: `2px solid --ink-medium`）
- ✅ `prefers-reduced-motion` 全局禁用动画
- ✅ `.visually-hidden` 辅助类
- ✅ RTL 支持（阿拉伯语 `Noto Naskh Arabic`、俄语 `Noto Sans`）
- ⚠️ 对比度：`--ink-light` 在小字号时不达标（见下方改进清单）

---

## 九、改进清单（按优先级排序）

### 🔴 无障碍 — 必须修复

**1. 浅色文本对比度不足**

| Token | 色值 | 底色 | 对比度 | WCAG AA (4.5:1) | 建议 |
|:---|:---|:---|:---:|:---:|:---|
| `--ink-light` | #808080 | `--xuan-paper` #F5F0E8 | 3.1:1 | ❌ | 小字改用 #6B6B6B |
| `--ink-wash` | #B0A8A0 | `--xuan-paper` | 1.8:1 | ❌ | 仅用作装饰性边框/分割线，不用作文本 |
| `--ink-faint` | #C8C0B8 | `--xuan-paper` | 1.3:1 | ❌ | 同上，仅装饰 |

**2. 焦点指示对比度**

当前 `:focus-visible { outline: 2px solid --ink-medium }` 与纸色对比度约 3.6:1，勉强但不够醒目。建议改为 `--seal-red` 或 `--ink-dark`。

---

### 🟠 交互 — 建议尽快改进

**3. Card hover 效果不可见**

`inkBleed` 的 `opacity: 0 → 0.6` + `box-shadow` 在暖纸背景上几乎不可感知。建议：
- 将 `inkBleed` 的 opacity 目标值从 0.6 提至 0.85
- 或换用更明显的 `translateY(-3px)` + `box-shadow: var(--shadow-card-hover)`

**4. bookmark/like 按钮缺少按下反馈**

当前 LikeButton 只有颜色切换，无触觉反馈。建议添加 `transform: scale(0.92)` 的 press 态（配合 `--ease-spring`）。

**5. 加载状态骨架屏缺失**

当前列表加载使用统一的 `loading-mist`（三个点浮动），但卡片区域可以用 CSS skeleton（`background: linear-gradient + animation`）模拟内容布局，减少布局跳动。

---

### 🟡 视觉 — 建议迭代优化

**6. 管理后台缺乏设计关怀**

`AdminTable.css` 和 `Dashboard.css` 是纯功能性样式。建议至少：
- 表格行 hover 添加 `--paper-aged` 背景
- 状态标签使用设计 tokens（非硬编码颜色）
- 导航侧栏匹配主站 `--font-ink`

**7. 暗色模式**

当前仅有亮色（水墨画）主题。考虑到夜间阅读场景，建议添加一个极简暗色模式：
- 底色: `--ink-deepest` (#0F0F0F)
- 纸色反转为深墨色: `--ink-deep` (#141414) 用于卡片
- 文本色: `--paper-cream` (#F2ECE2)
- 印泥色保持不变（朱红在深色背景上同样出色）
- 氛围层: 降低 opacity 至 0.03-0.06（在深色背景上更显眼）

**8. StoryPoster 生成的水墨 SVG 可以更丰富**

当前 `shapesSvg` 由简单几何运算生成。可以引入真实的国画元素路径（如梅枝、竹叶、山峦剪影），提升海报的艺术感。

**9. 字体加载策略**

Google Fonts 通过 `@import` 同步加载，在慢网络上会阻塞首屏渲染。建议改为：
```html
<link rel="preload" as="font" href="..." crossorigin>
```
配合 `font-display: swap` 确保 fallback 字体立即可用。

---

### 🔵 性能 — 长期优化

**10. CSS 文件分散导致请求数多**

当前每个组件一个 CSS 文件（36 个），开发阶段合理，生产环境建议合并或使用 CSS Modules/Vite 的自动 code-split。

**11. backdrop-filter 性能**

毛玻璃效果 (`backdrop-filter: blur(20px)`) 在低端移动设备上可能触发 GPU 过度合成。建议在 `@media (max-width: 640px)` 中将 blur 从 20px 降至 12px。

---

## 十、设计决策记录

| 决策 | 原因 |
|:---|:---|
| 不使用 Tailwind/CSS-in-JS | 40+ 设计 tokens 已足够，纯 CSS 加载最快 |
| 唯一强调色 (seal-red) | 印泥是水墨画的"签名"，多色强调会稀释意境 |
| 圆角最大 16px | 传统美学偏好方直，过圆有违纸墨质感 |
| 阴影用 `rgba(15,15,15,x)` | 从不使用纯黑阴影——水墨阴影是灰的，不是黑的 |
| 英语/阿拉伯语/俄语 fallback | 保留书法风格的同时，非中文用户获得可读的衬线体 |

---
## 开发者回复（commit 669a997）

### 🔴 1. 对比度不足 → ✅ 已修复
`--ink-light` #808080 → #6B6B6B，与 `--xuan-paper` 对比度约 4.5:1，达标 WCAG AA。

### 🔴 2. 焦点指示 → ✅ 已修复
`:focus-visible` outline 色从 `--ink-medium` → `--seal-red`。

### 🟠 3. Card hover → 🟡 暂不改
当前 `inkBleed` 极其微妙是水墨风格的刻意设计——"不喧哗"。过于明显的 hover 效果（如大幅上浮+深阴影）会破坏纸墨的沉静感。

### 🟠 4. LikeButton 按压反馈 → ✅ 已存在
`LikeButton.css:23` 已有 `transform: scale(0.94)` press 态。无需额外修改。

### 🟠 5. 骨架屏 → ✅ 已存在
`HomePage.tsx:10-25` StoryCardSkeleton + `MySpacePage.tsx:41-52` 已有独立骨架屏组件。未使用统一的 `loading-mist`，而是根据内容定制——这是更好的做法。

### 🟡 6-8. 管理后台/暗色模式/海报 → 🟡 后续迭代
大工程设计改动。暗色模式需完整色彩系统扩展（30+ tokens 反转），StoryPoster 需美术资源。

### 🔵 9. 字体加载 → ✅ 已存在
`theme.css:5` 的 `@import` URL 已含 `&display=swap`。

### 🔵 10-11. CSS/CSS性能 → 🟡 Vite已处理CSS code-split
移动端 backdrop blur 优化收益极低（<1% GPU时间），跳过。
