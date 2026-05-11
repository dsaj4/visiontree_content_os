# VisionTree Content OS

VisionTree 主项目的营销内容创作管理系统。

它不是 VisionTree 主产品本身，而是服务于 VisionTree V2 早期内容启动的内部工作台：把主项目的定位、叙事边界、素材池、格式模板、账号分工、发布计划和内容池组织在一起，帮助后续管理 agent 和运营人员持续产出准确、一致、可追踪的营销内容。

当前版本围绕“七个账号，六个人”的第一周启动计划，包含素材池、格式模板、创作台、内容池、计划日历、已发布内容日历、数据活动记录、个人主页、SQLite 后端和演示登录。

## 项目背景

VisionTree 主项目当前应被理解为一个“帮助人更会思考”的认知增强项目，对外主定义是“认知增强引擎”。它的根本立场是认知增强，而非认知替代：不是让 AI 替用户思考、替用户判断，而是帮助用户建立更清晰的思考边界、组织信息结构，并参与判断形成过程。

现阶段营销表达应重点讲清楚 `Vision`：内部一致的视角 / 认知框架。`Tree` 可以作为长期认知沉淀方向保留，但不应被写成已经成熟落地的认知树产品。

本系统的内容创作要始终守住这些边界：

- 不把 VisionTree 写成“替人思考的 AI”。
- 不把 VisionTree 写成知识管理工具、第二大脑、模型库或 skill 平台。
- 不把 Tree 写成当前已经成熟的核心卖点。
- 不虚构产品成熟度、用户结果或尚未验证的能力。
- 不为了传播效果牺牲项目定义的准确性。

更完整的业务说明见：

- [docs/CONTENT_AGENT_BRIEF.md](docs/CONTENT_AGENT_BRIEF.md)
- 上游资料：`../vision-docs/Visiontree 资产整理/16_营销人员项目说明文档.md`
- 上游资料：`../vision-docs/Visiontree 核心文档/核心立意文档.md`
- 上游资料：`../vision-docs/Visiontree 核心文档/价值宣言文档.md`

## 当前进度

项目目前刚刚进入内容创作启动阶段。

当前已有：

- 7 个演示账号 / persona：`thinking-lab`、`milo`、`ai-doubt`、`nora`、`eli`、`thinking-tree`、`visiontree`。
- 24 条素材记录，其中包含从 VT 素材库同步来的网页、PDF、图片、笔记等资料。
- 2 个工具 / 流程介绍卡片，从 `creator-prep-workspace/03-template-library` 同步来的网页视频演示和 GPT Image 2 视觉生成工具卡；原有账号写法模板已从模板库移除。
- 11 条第一周发布计划。
- 内容池目前为空，表示正式内容沉淀刚开始，还没有稳定的已发布内容记录和平台数据。

当前最重要的管理任务不是扩功能，而是把素材、模板和计划转化为第一批稳定内容，并在内容发布后回填真实发布时间、曝光、点赞、评论、转发、收藏等平台数据。

## 运行方式

Windows 一键启动：

```bash
start.cmd
```

或：

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

如果端口被旧进程占用或页面/API 状态异常，使用强制重启：

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1 -Restart
```

Windows 本地开发：

```bash
npm.cmd install
npm.cmd run api
npm.cmd run dev
```

Linux / macOS 本地开发：

```bash
npm install
npm run api
npm run dev
```

- 前端开发服务：http://localhost:5173/
- API 服务：http://localhost:8787/
- SQLite 数据库：`data/content-system.sqlite`

也可以先构建前端，再用 API 服务托管 `dist`：

```bash
npm run build
npm run serve
```

## 演示账号

当前登录方式是演示用无密码登录，只允许输入以下 7 个账号名：

- `thinking-lab`
- `milo`
- `ai-doubt`
- `nora`
- `eli`
- `thinking-tree`
- `visiontree`

生产环境需要替换为正式认证，不应沿用无密码登录。

## 核心规则

- 素材和模板的引用次数由数据库根据“已发布内容”实时统计。
- 内容存入内容池时间 `savedAt` 和真实发布时间 `publishedAt` 分开保存。
- 前端可以保存草稿和发起同步，但真实发布时间、点赞、收藏、评论、转发等平台数据应由后端或外部平台回传 API 写入。
- 未来接入真实素材库、模板库、内容记录系统时，优先保持当前前端响应结构稳定。
- 素材池和模板库不是普通资料库，而是服务于 VisionTree 初期营销内容矩阵的创作基础。新增素材或模板时必须补齐使用场景、可引用重点、适合账号和创作边界。
- 从 `creator-prep-workspace/03-template-library` 载入真实工具时，真实工具说明和操作细节保留在准备区；`content-system` 只新增介绍卡片，写清使用边界、适用范围、操作方式和后续案例截图位置。

## API 对接文档

交给其他 agent 接手时，请先阅读：

[docs/CONTENT_AGENT_BRIEF.md](docs/CONTENT_AGENT_BRIEF.md)

[docs/API_INTEGRATION.md](docs/API_INTEGRATION.md)

## 服务器部署

阿里云 Alibaba Cloud Linux 3.2104 LTS 64 位部署说明见：

[docs/DEPLOY_ALIBABA_CLOUD_LINUX.md](docs/DEPLOY_ALIBABA_CLOUD_LINUX.md)
