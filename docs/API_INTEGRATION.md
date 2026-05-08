# API Integration Guide

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
    { "accountName": "mia", "displayName": "Mia", "role": "creator" }
  ]
}
```

### `POST /api/login`

演示登录，不需要密码。只能登录数据库中存在的 6 个账号。

请求：

```json
{ "accountName": "mia" }
```

响应：

```json
{
  "token": "uuid-session-token",
  "user": {
    "id": "u1",
    "accountName": "mia",
    "displayName": "Mia",
    "role": "creator"
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
  activities: Activity[];
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
  "title": "把一个普通素材拆成 4 条矩阵内容",
  "channel": "抖音",
  "assetId": "a1",
  "templateId": "t2",
  "planId": "p3"
}
```

响应：完整 `BootstrapData`。

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

