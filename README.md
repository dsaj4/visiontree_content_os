# VisionTree Content OS

VisionTree 社交内容创作和发布工作台。当前版本包含素材池、格式模板、创作台、内容池、计划日历、已发布内容日历、数据活动记录、个人主页、SQLite 后端和演示登录。

## 运行方式

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

当前登录方式是演示用无密码登录，只允许输入以下 6 个账号名：

- `milo`
- `ai-doubt`
- `nora`
- `eli`
- `frames`
- `decision-lab`

生产环境需要替换为正式认证，不应沿用无密码登录。

## 核心规则

- 素材和模板的引用次数由数据库根据“已发布内容”实时统计。
- 内容存入内容池时间 `savedAt` 和真实发布时间 `publishedAt` 分开保存。
- 前端可以保存草稿和发起同步，但真实发布时间、点赞、收藏、评论、转发等平台数据应由后端或外部平台回传 API 写入。
- 未来接入真实素材库、模板库、内容记录系统时，优先保持当前前端响应结构稳定。

## API 对接文档

交给其他 agent 接手时，请先阅读：

[docs/API_INTEGRATION.md](docs/API_INTEGRATION.md)

## 服务器部署

阿里云 Alibaba Cloud Linux 3.2104 LTS 64 位部署说明见：

[docs/DEPLOY_ALIBABA_CLOUD_LINUX.md](docs/DEPLOY_ALIBABA_CLOUD_LINUX.md)
