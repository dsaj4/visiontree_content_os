# API Integration Guide

本文档说明 `content-system` 的 API 和数据边界。业务背景、账号矩阵、素材池/模板库管理要求见 [CONTENT_AGENT_BRIEF.md](CONTENT_AGENT_BRIEF.md)。

重要前提：

- 本项目是 VisionTree 主项目的营销内容创作管理系统，不是主产品本身。
- 当前内容创作刚刚开始，系统中已有账号、素材、模板和计划，但内容池尚未沉淀稳定内容。
- 素材池和模板库服务于 VisionTree 初期营销内容矩阵，新增字段或对接外部系统时必须保留“素材/模板可追溯、可复用、可统计引用”的结构。
- 普通 CRUD 只负责基础记录。真实发布时间、曝光、点赞、评论、转发、收藏等平台数据必须走发布同步或平台回传链路。

## 2026-05-09 CRUD API 更新

以下接口均需要登录后的 `Authorization: Bearer <token>`。`referenceCount`、`publishedAt`、曝光/点赞/评论/转发/收藏等平台数据不应由普通 CRUD 写入。

### 素材池 CRUD

- `GET /api/assets`：返回 `{ assets }`。
- `GET /api/assets/:id`：返回 `{ asset }`。
- `POST /api/assets`：新增素材，返回 `{ asset }`。
- `PATCH /api/assets/:id`：部分更新素材，返回 `{ asset }`。
- `DELETE /api/assets/:id`：删除素材。若已有内容记录引用该素材，返回 `409`。

新增/更新字段：

```json
{
  "id": "asset-external-id",
  "title": "素材标题",
  "theme": "主题",
  "source": "来源",
  "format": "网页/PDF/截图/访谈摘录",
  "freshness": "2026-05-09",
  "score": 80,
  "tags": ["VisionTree", "X"],
  "summary": "素材简介",
  "owner": "Milo Reed",
  "palette": "mint",
  "notes": ["备注"],
  "resources": [
    {
      "id": "resource-1",
      "title": "原始网页",
      "kind": "web",
      "url": "https://example.com",
      "source": "网页链接",
      "updated": "2026-05-09",
      "summary": "资源摘要",
      "highlights": ["可引用重点"]
    }
  ]
}
```

`id` 可由外部素材库指定；不传时后端生成。`referenceCount` 由已发布内容聚合计算，不支持写入。

### 模板库 CRUD

- `GET /api/templates`：返回 `{ templates }`。
- `GET /api/templates/:id`：返回 `{ template }`。
- `POST /api/templates`：新增模板，返回 `{ template }`。
- `PATCH /api/templates/:id`：部分更新模板，返回 `{ template }`。
- `DELETE /api/templates/:id`：删除模板。若已有内容记录引用该模板，返回 `409`。

新增/更新字段：

```json
{
  "id": "template-external-id",
  "title": "模板标题",
  "format": "短帖/长帖/图解/投票",
  "channels": ["X"],
  "structure": ["hook", "point", "cta"],
  "hook": "开场方式",
  "length": "short",
  "notes": ["备注"],
  "resources": []
}
```

`referenceCount` 同样由已发布内容聚合计算，不支持写入。

### 内容记录与正文 CRUD

- `GET /api/contents`：返回 `{ contents }`。
- `GET /api/contents/:id`：返回 `{ content }`，包含 `body`、素材/模板标题、媒体附件、活动记录和指标。
- `POST /api/contents`：新增内容记录，返回 `{ content }`。
- `PATCH /api/contents/:id`：更新标题、正文、渠道、素材、模板、计划时间等基础字段，返回 `{ content }`。
- `DELETE /api/contents/:id`：删除内容记录，并解绑相关计划。
- `GET /api/contents/:id/body`：只读取正文，返回 `{ id, body }`。
- `PATCH /api/contents/:id/body`：只更新正文，请求 `{ "body": "..." }`。
- `DELETE /api/contents/:id/body`：清空正文，不删除内容记录。

新增内容请求：

```json
{
  "id": "content-external-id",
  "title": "内容工作标题",
  "body": "正文草稿",
  "channel": "X",
  "assetId": "asset-external-id",
  "templateId": "template-external-id",
  "scheduledDate": "2026-05-10",
  "scheduledTime": "09:00",
  "mediaIds": []
}
```

边界规则：

- `savedAt` 由后端在创建内容时写入。
- `publishedAt` 和 `metrics` 不能通过 `POST /api/contents` 或 `PATCH /api/contents/:id` 写入。
- 真实发布时间与平台指标继续使用 `POST /api/contents/:id/platform-update`。
- 新增内容状态只允许 `草稿`、`审核中`、`已排期`；`已发布` 只能由发布/平台回传接口产生。
- 正文最大长度为 `20000` 字。

本文档面向后续接手本项目的 agent/工程师，用于对接真实素材库、模板库和内容记录系统。

## 当前架构

- 前端：React + Vite，入口在 `src/App.tsx`。
- 后端：Node.js 内置 `node:sqlite` + `node:http`，入口在 `server/api.mjs`。
- 数据库：SQLite 文件 `data/content-system.sqlite`。
- 开发代理：Vite 将 `/api` 代理到 `http://127.0.0.1:8787`。

当前后端同时负责：

- 初始化演示数据。
- 提供演示登录。
- 返回前端 bootstrap 数据。
- 写入草稿、发布同步、评论/转发活动。
- 预留平台数据更新 API。

## 登录与鉴权

### `GET /api/accounts`

返回可登录账号列表。

响应：

```json
{
  "accounts": [
    {
      "accountName": "thinking-lab",
      "displayName": "Thinking Lab",
      "role": "负责人：武新悦",
      "platform": "X",
      "handle": "@thinking_lab_vt"
    }
  ]
}
```

### `POST /api/login`

演示登录，不需要密码。只能登录数据库中存在的 7 个账号。

请求：

```json
{ "accountName": "thinking-lab" }
```

响应：

```json
{
  "token": "uuid-session-token",
  "user": {
    "id": "u5",
    "accountName": "thinking-lab",
    "displayName": "Thinking Lab",
    "role": "负责人：武新悦",
    "platform": "X",
    "handle": "@thinking_lab_vt"
  }
}
```

后续请求使用：

```http
Authorization: Bearer <token>
```

安全说明：

- 这是演示认证，不适合生产。
- 生产接入时应替换为正式登录、会话过期、权限校验和审计日志。
- 当前 API 已使用参数化 SQL，后续新增查询也必须继续使用参数化语句。

## Bootstrap 数据

### `GET /api/bootstrap`

前端登录后使用这个接口获取所有工作台数据。

响应结构：

```ts
type BootstrapData = {
  user: UserAccount;
  accounts: UserAccount[];
  assets: Asset[];
  templates: Template[];
  contentPool: ContentItem[];
  planItems: PlanItem[];
};
```

建议后续接入真实系统时，尽量保持该响应结构稳定。前端当前主要依赖这个接口刷新全局状态。

## 素材库对接

当前素材数据来自 SQLite `assets` 表，前端类型为：

```ts
type Asset = {
  id: string;
  title: string;
  theme: string;
  source: string;
  format: string;
  freshness: string;
  score: number;
  tags: string[];
  summary: string;
  owner: string;
  palette: string;
  notes: string[];
  resources: ResourceLink[];
  referenceCount?: number;
};
```

`resources` 用于详情页展示网页/PDF：

```ts
type ResourceLink = {
  id: string;
  title: string;
  kind: "web" | "pdf";
  url: string;
  source: string;
  updated: string;
  summary: string;
  highlights: string[];
};
```

引用次数规则：

- `referenceCount` 不应由素材库直接写死。
- 当前后端通过 `contents` 表中 `status = '已发布'` 的记录聚合计算：

```sql
SELECT asset_id, COUNT(*)
FROM contents
WHERE status = '已发布'
GROUP BY asset_id;
```

真实素材库接入建议：

- 外部素材库负责提供素材基础信息、资源链接和素材状态。
- 本系统后端负责合并引用次数。
- 如果外部素材库已有自己的素材 ID，请映射到当前 `assets.id` 或增加 `external_asset_id` 字段。

## 模板库/模块库对接

当前模板数据来自 SQLite `templates` 表，前端类型为：

```ts
type Template = {
  id: string;
  title: string;
  format: string;
  channels: Channel[];
  structure: string[];
  hook: string;
  length: string;
  notes: string[];
  resources: ResourceLink[];
  referenceCount?: number;
};
```

引用次数规则：

- `referenceCount` 由已发布内容聚合计算，不由模板库直接决定。

```sql
SELECT template_id, COUNT(*)
FROM contents
WHERE status = '已发布'
GROUP BY template_id;
```

真实模板库接入建议：

- 如果“模块库”比当前模板更细，可以新增 `template_modules` 表或让 `templates.structure` 存模块 ID 列表。
- 前端当前把 `structure` 作为展示标签和草稿生成结构使用。
- 接入前请决定：模板是完整内容格式，模块是模板内的结构片段，二者不要混用同一个 ID 空间。

### 准备区工具同步为介绍卡片

当 `creator-prep-workspace/03-template-library` 中新增真实工具、外部 Skill 或复杂工作流时，`content-system` 使用 `templates` 表新增一张介绍卡片：

- `title` 写工具卡片名。
- `format` 使用 `Tool Card / ...`。
- `channels` 写可服务的平台或内部用途。
- `structure` 固定覆盖适用范围、使用边界、操作方式和案例截图待补。
- `notes` 必须写清使用边界、适用范围、操作方式、发布前检查和后续维护。
- `resources` 先放源工具链接和准备区来源说明；真实案例截图、录屏或 prompt 样板后续再补。

该方式只同步介绍卡片，不代表 `content-system` 已具备执行该工具的运行能力。

## 内容记录对接

当前内容记录来自 SQLite `contents` 表，前端类型为：

```ts
type ContentItem = {
  id: string;
  title: string;
  channel: Channel;
  status: "草稿" | "审核中" | "已排期" | "已发布";
  assetId?: string;
  templateId?: string;
  assetTitle: string;
  templateTitle: string;
  owner: string;
  savedAt?: string;
  savedDate?: string;
  savedTime?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  publishedAt?: string | null;
  publishDate: string;
  publishTime: string;
  metrics: Metrics;
  media?: MediaAttachment[];
  activities: Activity[];
};

type MediaAttachment = {
  id: string;
  name: string;
  kind: "image" | "video";
  mimeType: string;
  size: number;
  url: string;
  createdAt?: string;
};
```

时间字段规则：

- `savedAt`：内容存入内容池的时间，由后端在保存草稿时写入。
- `scheduledDate` / `scheduledTime`：计划发布时间，来自计划日历。
- `publishedAt`：真实发布时间，必须由后端或平台回传 API 写入。
- `publishDate` / `publishTime`：前端展示字段，由后端根据 `publishedAt` 计算；未发布时可回退到计划时间。

平台数据规则：

- `views`、`likes`、`comments`、`shares`、`saves` 不应由前端直接决定。
- 前端可触发同步按钮，但最终数值应来自后端同步逻辑或外部平台回传。

## 当前写入 API

### `POST /api/contents/drafts`

保存草稿到内容池。后端写入 `savedAt`。

请求：

```json
{
  "title": "Sunk cost is not about money",
  "body": "正文草稿",
  "channel": "X",
  "assetId": "a1",
  "templateId": "t1",
  "planId": "p1",
  "mediaIds": ["m1778311400920-c709eb1e"]
}
```

响应：完整 `BootstrapData`。

### `POST /api/uploads`

上传创作草稿使用的图片或视频。请求必须使用 `multipart/form-data`，字段名为 `files`，支持一次上传多个文件。

限制：
- 需要 `Authorization: Bearer <token>`。
- 仅接受 `image/*` 和 `video/*`，但会拒绝 `image/svg+xml`。
- 一次最多 8 个文件，单个文件最大 50MB。
- 上传后先生成未绑定附件；保存草稿时通过 `mediaIds` 绑定到 `contents`。

响应：
```json
{
  "media": [
    {
      "id": "m1778311400920-c709eb1e",
      "name": "demo.jpeg",
      "kind": "image",
      "mimeType": "image/jpeg",
      "size": 124000,
      "url": "/api/uploads/m1778311400920-c709eb1e.jpeg",
      "createdAt": "2026-05-09T15:20:00.000+08:00"
    }
  ]
}
```

### `GET /api/uploads/:fileName`

读取上传后的媒体文件。前端会直接使用返回的 `url` 展示图片或视频预览。

### `POST /api/contents/:id/publish`

当前演示同步接口。后端会：

- 将内容状态改为 `已发布`。
- 如果没有 `publishedAt`，写入当前服务端时间。
- 模拟增加平台数据。
- 将关联计划改为 `已完成`。
- 返回完整 `BootstrapData`。

真实接入时，可以保留按钮触发同步，但应把模拟增长替换为平台查询结果。

### `POST /api/contents/:id/platform-update`

预留给外部平台或同步服务的真实数据更新 API。

请求：

```json
{
  "publishedAt": "2026-05-08T19:12:00+08:00",
  "metrics": {
    "views": 30000,
    "likes": 1500,
    "comments": 210,
    "shares": 88,
    "saves": 720
  }
}
```

后端会：

- 写入真实发布时间 `publishedAt`。
- 覆盖平台指标。
- 将内容状态改为 `已发布`。
- 将关联计划改为 `已完成`。
- 记录一条 `数据同步` 活动。

这是后续对接内容发布平台、数据同步服务时最重要的接口。

### `POST /api/contents/:id/interactions`

记录评论或转发活动。

请求：

```json
{ "type": "评论记录" }
```

或：

```json
{ "type": "转发记录" }
```

当前实现会自增评论数或转发数，并写入活动记录。真实平台接入后，建议改为活动记录来自平台事件流，指标仍以平台汇总值为准。

### `POST /api/plans/:id/complete`

将没有关联内容的计划标记为完成。若计划有关联内容，前端当前会优先调用内容发布同步接口。

## 数据库表

主要表：

- `users`：演示账号。
- `sessions`：演示登录 token。
- `assets`：素材基础信息和详情资源。
- `templates`：模板/模块基础信息和详情资源。
- `contents`：内容池记录、计划时间、真实发布时间、平台指标。
- `plans`：发布计划日历。
- `activities`：数据同步、评论、转发、状态更新记录。

关键字段：

- `contents.saved_at`：存入内容池时间。
- `contents.scheduled_date` / `contents.scheduled_time`：计划时间。
- `contents.published_at`：真实发布时间。
- `contents.asset_id` / `contents.template_id`：引用统计来源。

## 后续 agent 对接任务建议

### 1. 素材库 API

目标：

- 用真实素材库替换或同步 `assets` 表。
- 保留 `id/title/summary/tags/resources/referenceCount` 的前端响应字段。
- 明确外部素材 ID 与本系统素材 ID 的映射关系。

验收：

- `/api/bootstrap` 返回真实素材。
- 素材详情页可以打开网页/PDF 资料。
- 内容发布后对应素材引用次数增加。

### 2. 模板库/模块库 API

目标：

- 用真实模板库替换或同步 `templates` 表。
- 若存在模块库，设计模板与模块的关系。
- 保留 `structure` 给前端展示和草稿生成使用。

验收：

- `/api/bootstrap` 返回真实模板/模块结构。
- 模板详情页可以展示结构、创作提示和资源资料。
- 内容发布后对应模板引用次数增加。

### 3. 内容记录 API

目标：

- 将 `contents` 表接入真实内容记录系统。
- 保持 `savedAt` 与 `publishedAt` 分离。
- 将平台数据写入交给平台同步服务或 `platform-update`。

验收：

- 保存草稿后内容池出现新记录，且 `savedAt` 由后端写入。
- 未发布内容显示“真实发布：待平台回传”。
- 平台回传后显示真实发布时间和最新指标。
- 已发布内容日历按 `publishedAt` 排序。

## 注意事项

- 不要让前端直接写真实发布时间和平台指标。
- 不要把引用次数存成前端可编辑字段，应由内容记录聚合得到。
- 新增 API 时继续使用参数化 SQL，避免拼接 SQL。
- 当前 CORS 只允许本地 Vite 源；生产部署需要显式配置允许源。
- 当前 token 没有过期时间；生产环境必须补会话过期和权限控制。
