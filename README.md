# Zhen Battle Sandbox

一个用于模拟古今中外知名战役的开源沙盘动画项目。

项目基于 **Next.js + SVG + GSAP** 构建：Next.js 负责应用结构，SVG 负责清晰呈现地图、路线、单位和阶段标注，GSAP 负责时间轴播放、暂停、跳转和速度控制。当前版本提供了战役卡片列表、战役详情沙盘、时间轴播放、阶段跳转、速度控制和基础战役数据目录规范。

## Features

- 瀑布流战役卡片首页
- 每个战役独立目录管理
- 基于 JSON 的战役动画定义
- SVG 渲染地图、地形、单位、行军轨迹、战线和战术标注
- GSAP 驱动时间轴播放、暂停、跳转、拖动和速度控制
- 响应式界面，支持桌面和移动端浏览

## Tech Stack

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [GSAP](https://gsap.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [lucide-react](https://lucide.dev/)

## Getting Started

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

打开浏览器访问：

```text
http://127.0.0.1:3000
```

构建生产版本：

```bash
npm run build
```

启动生产服务：

```bash
npm run start
```

## Project Structure

```text
app/
  globals.css
  layout.tsx
  page.tsx

components/
  BattleExperience.tsx
  BattleGallery.tsx
  BattleSandbox.tsx

data/
  battles.ts
  battles/
    README.md
    changping/
      battle.json
    midway/
      battle.json
    waterloo/
      battle.json
```

## Battle Data Convention

每个战役都放在独立目录中：

```text
data/battles/<battle-id>/
  battle.json
```

`battle.json` 是当前沙盘动画使用的核心定义文件。未来可以在同一个目录下继续扩展：

```text
data/battles/<battle-id>/
  battle.json
  brief.md
  references.md
  assets/
  narration.md
```

### battle.json

一个战役 JSON 包含基础信息、地形、单位路径、战线和事件阶段：

```json
{
  "id": "changping",
  "name": "长平之战",
  "era": "战国",
  "year": "公元前260年",
  "location": "上党、长平",
  "mapTone": "steppe",
  "duration": 100,
  "coverFocus": "围歼",
  "briefing": "秦军以正面牵制和两翼迂回切断赵军补给，赵军主力被压缩后陷入包围。",
  "fronts": [],
  "terrain": [],
  "units": [],
  "events": []
}
```

字段说明：

- `id`: 战役唯一标识，建议与目录名一致。
- `name`: 战役名称。
- `era`: 历史时期。
- `year`: 发生年份。
- `location`: 地点。
- `mapTone`: 地图色调，目前支持 `steppe`、`coast`、`europe`、`island`。
- `duration`: 沙盘时间轴总长度。
- `coverFocus`: 首页卡片上的主题词。
- `briefing`: 战役摘要。
- `fronts`: 战线折线。
- `terrain`: 地形元素，如河流、山脊、道路、海岸、城市。
- `units`: 作战单位及其路径。
- `events`: 时间轴阶段事件。

新增战役时，需要：

1. 创建目录 `data/battles/<battle-id>/`。
2. 在目录中添加 `battle.json`。
3. 在 `data/battles.ts` 中 import 并加入 `battles` 数组。

## Development Notes

- 沙盘渲染逻辑集中在 `components/BattleSandbox.tsx`。
- 首页卡片列表在 `components/BattleGallery.tsx`。
- 页面入口和列表/详情切换在 `components/BattleExperience.tsx`。
- 战役类型定义和数据索引在 `data/battles.ts`。

## Roadmap Ideas

- 战役说明页和长文资料
- 更多战役数据
- 地图素材和历史地理图层
- 旁白时间轴
- 单位编制、伤亡、补给和士气模型
- 战役搜索、筛选和标签系统
- 可视化编辑器，用于编辑 `battle.json`

## Contributing

欢迎提交 issue、战役数据、动画改进、地图表现和交互体验优化。

建议贡献前先保持一个战役一个目录的结构，并尽量让 `battle.json` 中的坐标、时间和事件描述清晰可读。

## License

当前仓库尚未声明开源许可证。正式对外开放前，建议添加 `LICENSE` 文件，例如 MIT、Apache-2.0 或其他适合项目目标的许可证。
