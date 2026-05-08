import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dataDir = join(rootDir, "data");
const distDir = join(rootDir, "dist");
const dbPath = join(dataDir, "content-system.sqlite");
const port = Number(process.env.API_PORT ?? 8787);
const allowedOrigins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");

const json = (value) => JSON.stringify(value);
const parseJson = (value, fallback = []) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const personaUsers = [
  {
    id: "u1",
    accountName: "milo",
    displayName: "Milo Reed",
    role: "产品建设者",
    platform: "X",
    handle: "@milo_reed_vt",
    profileUrl: "https://x.com/milo_reed_vt",
    positioning: "工程师 / 产品建设者",
    personaRole: "让用户相信 VisionTree 背后有人在认真做东西。",
    voice: ["短句", "克制", "偶尔自嘲", "工程判断"],
    contentTypes: ["开发过程中的真实取舍", "产品细节背后的哲学", "AI 工具的工程师判断", "失败复盘和小 bug 记录"],
    avoid: ["我们的产品非常伟大", "颠覆行业", "革命性功能上线"],
    cadence: "每周 8-12 条主帖；每天评论技术圈 / AI 工具圈内容 8-12 条。",
    interactionTarget: "技术圈、AI 工具圈、产品建设讨论。"
  },
  {
    id: "u2",
    accountName: "ai-doubt",
    displayName: "AI Doubt Notes",
    role: "公开怀疑笔记",
    platform: "X",
    handle: "@ai_doubt_notes",
    profileUrl: "https://x.com/ai_doubt_notes",
    positioning: "公开怀疑笔记",
    personaRole: "制造问题意识，让读者意识到 AI 的假效率和认知外包。",
    voice: ["犀利", "聪明", "冷静", "不恐吓"],
    contentTypes: ["AI 让人产出更多但理解更少", "效率崇拜的冷静吐槽", "认知外包观察", "Grudging Admit"],
    avoid: ["阴谋论", "人身攻击", "AI 毁灭人类式恐慌"],
    cadence: "每周 8-12 条主帖；每天评论 AI 争议与效率相关内容 6-8 条。",
    interactionTarget: "AI 争议、效率叙事、认知外包相关讨论。"
  },
  {
    id: "u3",
    accountName: "nora",
    displayName: "Nora Blake",
    role: "非技术用户",
    platform: "X",
    handle: "@nora_tries_ai",
    profileUrl: "https://x.com/nora_tries_ai",
    positioning: "普通上班族 / 非技术用户",
    personaRole: "降低门槛，让普通用户感到“不是只有我跟不上”。",
    voice: ["真实", "日常", "有一点幽默", "不装懂"],
    contentTypes: ["AI 工具真实体验", "日常工作里的 AI 尴尬场景", "Nora Tries VisionTree", "普通人的迟疑和小发现"],
    avoid: ["技术术语堆砌", "专家口吻", "工具评测排行榜"],
    cadence: "每周 8-10 条主帖；每天回复普通用户、AI 工具体验类内容 5-8 条。",
    interactionTarget: "普通用户、AI 工具体验、职场效率焦虑内容。"
  },
  {
    id: "u4",
    accountName: "eli",
    displayName: "Eli Rowan",
    role: "慢思考者",
    platform: "X",
    handle: "@eli_rowan_vt",
    profileUrl: "https://x.com/eli_rowan_vt",
    positioning: "慢思考者 / 概念提出者",
    personaRole: "给 VisionTree 的叙事加深度。",
    voice: ["慢", "稳", "有思想密度", "不用感叹号"],
    contentTypes: ["AI 时代人的处境", "新概念命名", "热点背后的默认假设", "认知、判断、价值相关长帖"],
    avoid: ["纯热点跟风", "轻飘的金句", "过度学院化黑话"],
    cadence: "每周 5-7 条主帖；每天评论深度讨论 3-5 条。",
    interactionTarget: "深度讨论、研究解读、AI 与人的价值边界。"
  },
  {
    id: "u5",
    accountName: "frames",
    displayName: "Thinking in Frames",
    role: "视觉模型账号",
    platform: "X",
    handle: "@thinking_frames",
    profileUrl: "https://x.com/thinking_frames",
    positioning: "视觉化思维模型账号",
    personaRole: "用图片提高收藏率和传播率。",
    voice: ["短", "清楚", "视觉优先", "可收藏"],
    contentTypes: ["思维模型图解", "决策对比图", "数据图", "概念卡"],
    avoid: ["一图讲多个概念", "频繁换视觉框架", "长文案压过图"],
    cadence: "每天 1 张图；用图或一句模型化表达参与讨论。",
    interactionTarget: "思维模型、概念解释、可视化决策讨论。"
  },
  {
    id: "u6",
    accountName: "decision-lab",
    displayName: "The Decision Lab",
    role: "互动实验账号",
    platform: "X",
    handle: "@decision_lab_vt",
    profileUrl: "https://x.com/decision_lab_vt",
    positioning: "互动实验账号",
    personaRole: "让用户动手参与，提升回复和回访。",
    voice: ["直接", "互动", "实验感", "少解释多提问"],
    contentTypes: ["两分钟思维实验", "偏差识别题", "决策挑战", "投票 + 第二天分析"],
    avoid: ["没有明确回复动作", "只讲道理不让用户参与", "恐吓式互动"],
    cadence: "每天 1 条互动实验；高优先级回复所有参与实验的用户。",
    interactionTarget: "用户回复、投票、认知偏差和决策挑战讨论。"
  }
];

const visionTreeAssets = [
  {
    id: "a1",
    title: "AI 时代人的价值危机素材",
    theme: "价值危机",
    source: "项目叙事",
    format: "长帖 + 观点短帖",
    freshness: "今天 10:20",
    score: 94,
    tags: ["认知增强", "人的价值", "AI 时代"],
    summary: "围绕“当 AI 完成基础脑力劳动，人还剩什么价值”展开，可拆成 Eli 深度帖和 AI Doubt 短帖。",
    owner: "Eli Rowan",
    palette: "mint",
    notes: ["适合从人的价值危机切入，不要写成普通 AI 焦虑。", "核心表达是人主导判断，AI 辅助思考。"],
    resources: [
      {
        id: "a1-web",
        title: "VisionTree 项目叙事主线",
        kind: "web",
        url: "https://visiontree.example/narrative",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "统一 VisionTree 对外叙事：AI 时代人的价值危机、判断外包与思考扶手。",
        highlights: ["第一入口是 AI 时代人的价值危机。", "不要把 VisionTree 讲成普通效率工具。", "强调 AI 辅助思考，人主导判断。"]
      },
      {
        id: "a1-pdf",
        title: "价值宣言摘录 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/value-manifesto.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "沉淀 VisionTree 关于人的价值、模糊判断和认知框架的核心表述。",
        highlights: ["人的价值锚定在处理模糊。", "AI 不应替代人的判断过程。", "VisionTree 是认知框架加速器。"]
      }
    ]
  },
  {
    id: "a2",
    title: "产品建设与判断取舍素材",
    theme: "产品建设",
    source: "产品迭代记录",
    format: "短帖 + 复盘",
    freshness: "昨天 18:40",
    score: 88,
    tags: ["产品哲学", "判断取舍", "工程记录"],
    summary: "记录 VisionTree 如何把产品做成“思考扶手”，适合 Milo Reed 和官方号使用。",
    owner: "Milo Reed",
    palette: "amber",
    notes: ["从一个按钮、一处交互、一次砍功能讲产品哲学。", "不要夸大成宏大功能发布。"],
    resources: [
      {
        id: "a2-web",
        title: "产品取舍记录",
        kind: "web",
        url: "https://visiontree.example/build-notes",
        source: "网页链接",
        updated: "2026-05-07",
        summary: "记录哪些自动化功能被保留、砍掉或改写。",
        highlights: ["砍掉会让用户少想一步的功能。", "文案从生成答案改为继续判断。", "工程选择服务于判断而不是效率。"]
      },
      {
        id: "a2-pdf",
        title: "产品建设复盘 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/build-retro.pdf",
        source: "PDF",
        updated: "2026-05-06",
        summary: "用于 Milo Reed 的产品建设内容素材。",
        highlights: ["短句表达。", "真实取舍优先。", "避免品牌口号。"]
      }
    ]
  },
  {
    id: "a3",
    title: "普通人的 AI 困惑素材",
    theme: "用户困境",
    source: "用户观察",
    format: "体验帖 + FAQ",
    freshness: "2 天前",
    score: 83,
    tags: ["AI 疲惫", "普通用户", "Nora Tries VisionTree"],
    summary: "围绕普通人跟不上 AI、产出更多但理解更少的体验，适合 Nora Blake 和 Decision Lab。",
    owner: "Nora Blake",
    palette: "rose",
    notes: ["写真实困惑，不装懂。", "自然导流到 Nora Tries VisionTree。"],
    resources: [
      {
        id: "a3-web",
        title: "用户困境观察页",
        kind: "web",
        url: "https://visiontree.example/user-observations",
        source: "网页链接",
        updated: "2026-05-06",
        summary: "记录普通用户在 AI 工具使用中的迟疑、疲惫和判断丢失。",
        highlights: ["AI 帮我写完，但我不同意结论。", "回复更多邮件，但理解更少。", "不是不会用工具，而是不知道如何判断。"]
      },
      {
        id: "a3-pdf",
        title: "Nora 体验素材 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/nora-tries.pdf",
        source: "PDF",
        updated: "2026-05-05",
        summary: "Nora Blake 的体验帖和普通用户导流素材。",
        highlights: ["语言日常。", "保留犹豫感。", "避免工具排行榜。"]
      }
    ]
  },
  {
    id: "a4",
    title: "思维模型与决策训练素材",
    theme: "思维模型",
    source: "思考方法学",
    format: "图卡 + 互动实验",
    freshness: "本周一",
    score: 81,
    tags: ["思维模型", "决策实验", "认知框架"],
    summary: "把语理分析、谬误剖析、判断框架转成图卡和两分钟实验。",
    owner: "Thinking in Frames",
    palette: "cyan",
    notes: ["一张图只讲一个概念。", "每个实验都要有明确回复动作。"],
    resources: [
      {
        id: "a4-web",
        title: "思维模型素材索引",
        kind: "web",
        url: "https://visiontree.example/frames",
        source: "网页链接",
        updated: "2026-05-04",
        summary: "归档可视化思维模型、决策对比图和互动实验题。",
        highlights: ["Eli 的概念可转成概念卡。", "Nora 的体验可转成前后对比图。", "Decision Lab 负责让用户动手。"]
      },
      {
        id: "a4-pdf",
        title: "决策实验模板 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/decision-lab.pdf",
        source: "PDF",
        updated: "2026-05-03",
        summary: "用于 The Decision Lab 的投票、偏差识别和二次分析模板。",
        highlights: ["先给场景。", "要求用户做选择。", "第二天回收答案做分析。"]
      }
    ]
  }
];

const nowIso = () => new Date().toISOString();
const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
const timeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

function dateFromIso(iso, fallback = "") {
  return iso ? dateFormatter.format(new Date(iso)) : fallback;
}

function timeFromIso(iso, fallback = "") {
  return iso ? timeFormatter.format(new Date(iso)) : fallback;
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      account_name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      platform TEXT,
      handle TEXT,
      profile_url TEXT,
      positioning TEXT,
      persona_role TEXT,
      voice_json TEXT,
      content_types_json TEXT,
      avoid_json TEXT,
      cadence TEXT,
      interaction_target TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      theme TEXT NOT NULL,
      source TEXT NOT NULL,
      format TEXT NOT NULL,
      freshness TEXT NOT NULL,
      score INTEGER NOT NULL,
      tags_json TEXT NOT NULL,
      summary TEXT NOT NULL,
      owner TEXT NOT NULL,
      palette TEXT NOT NULL,
      notes_json TEXT NOT NULL,
      resources_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      format TEXT NOT NULL,
      channels_json TEXT NOT NULL,
      structure_json TEXT NOT NULL,
      hook TEXT NOT NULL,
      length TEXT NOT NULL,
      notes_json TEXT NOT NULL,
      resources_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      asset_id TEXT NOT NULL REFERENCES assets(id),
      template_id TEXT NOT NULL REFERENCES templates(id),
      owner TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      published_at TEXT,
      views INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      comments INTEGER NOT NULL DEFAULT 0,
      shares INTEGER NOT NULL DEFAULT 0,
      saves INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      day TEXT NOT NULL,
      slot TEXT NOT NULL,
      channel TEXT NOT NULL,
      theme TEXT NOT NULL,
      owner TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT NOT NULL,
      content_id TEXT REFERENCES contents(id)
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      note TEXT NOT NULL,
      time_label TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function ensureColumn(table, name, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
  if (!columns.includes(name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

function migrateSchema() {
  [
    ["platform", "TEXT"],
    ["handle", "TEXT"],
    ["profile_url", "TEXT"],
    ["positioning", "TEXT"],
    ["persona_role", "TEXT"],
    ["voice_json", "TEXT"],
    ["content_types_json", "TEXT"],
    ["avoid_json", "TEXT"],
    ["cadence", "TEXT"],
    ["interaction_target", "TEXT"]
  ].forEach(([name, definition]) => ensureColumn("users", name, definition));
}

function upsertPersonaUsers() {
  const upsertUser = db.prepare(`
    INSERT INTO users
      (id, account_name, display_name, role, platform, handle, profile_url, positioning, persona_role,
       voice_json, content_types_json, avoid_json, cadence, interaction_target)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      account_name = excluded.account_name,
      display_name = excluded.display_name,
      role = excluded.role,
      platform = excluded.platform,
      handle = excluded.handle,
      profile_url = excluded.profile_url,
      positioning = excluded.positioning,
      persona_role = excluded.persona_role,
      voice_json = excluded.voice_json,
      content_types_json = excluded.content_types_json,
      avoid_json = excluded.avoid_json,
      cadence = excluded.cadence,
      interaction_target = excluded.interaction_target
  `);

  personaUsers.forEach((user) =>
    upsertUser.run(
      user.id,
      user.accountName,
      user.displayName,
      user.role,
      user.platform,
      user.handle,
      user.profileUrl,
      user.positioning,
      user.personaRole,
      json(user.voice),
      json(user.contentTypes),
      json(user.avoid),
      user.cadence,
      user.interactionTarget
    )
  );

  const ownerMap = [
    ["Mia", "Milo Reed"],
    ["Jun", "AI Doubt Notes"],
    ["Hao", "Nora Blake"],
    ["Lena", "Eli Rowan"]
  ];
  ownerMap.forEach(([from, to]) => {
    db.prepare("UPDATE contents SET owner = ? WHERE owner = ?").run(to, from);
    db.prepare("UPDATE plans SET owner = ? WHERE owner = ?").run(to, from);
    db.prepare("UPDATE assets SET owner = ? WHERE owner = ?").run(to, from);
  });
}

function syncVisionTreeDemoData() {
  const updateAsset = db.prepare(`
    UPDATE assets
    SET title = ?, theme = ?, source = ?, format = ?, freshness = ?, score = ?, tags_json = ?, summary = ?,
        owner = ?, palette = ?, notes_json = ?, resources_json = ?
    WHERE id = ?
  `);
  visionTreeAssets.forEach((asset) =>
    updateAsset.run(
      asset.title,
      asset.theme,
      asset.source,
      asset.format,
      asset.freshness,
      asset.score,
      json(asset.tags),
      asset.summary,
      asset.owner,
      asset.palette,
      json(asset.notes),
      json(asset.resources),
      asset.id
    )
  );

  const updates = [
    ["c1", "AI 没有替你省下思考，它只是把判断藏到了下一步", "X", "a1", "t2", "AI Doubt Notes"],
    ["c2", "为什么我们把“生成答案”改成了“继续判断”", "X", "a2", "t3", "Milo Reed"],
    ["c3", "我试了一个 AI 工具，结果更不确定了", "X", "a3", "t4", "Nora Blake"]
  ];
  const updateContent = db.prepare("UPDATE contents SET title = ?, channel = ?, asset_id = ?, template_id = ?, owner = ? WHERE id = ?");
  updates.forEach(([id, title, channel, assetId, templateId, owner]) => updateContent.run(title, channel, assetId, templateId, owner, id));

  const plans = [
    ["p1", "2026-05-09", "周六", "10:00", "X", "Nora Tries VisionTree", "Nora Blake", "降低门槛"],
    ["p2", "2026-05-10", "周日", "20:30", "X", "按钮文案背后的产品哲学", "Milo Reed", "建立信任"],
    ["p3", "2026-05-11", "周一", "12:15", "X", "AI 时代人的价值危机", "Eli Rowan", "沉淀深度叙事"],
    ["p4", "2026-05-12", "周二", "18:00", "X", "一张图解释认知外包", "Thinking in Frames", "提高收藏"],
    ["p5", "2026-05-13", "周三", "09:40", "X", "两分钟判断实验", "The Decision Lab", "提升回复"]
  ];
  const updatePlan = db.prepare("UPDATE plans SET date = ?, day = ?, slot = ?, channel = ?, theme = ?, owner = ?, goal = ? WHERE id = ?");
  plans.forEach(([id, date, day, slot, channel, theme, owner, goal]) => updatePlan.run(date, day, slot, channel, theme, owner, goal, id));
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    accountName: row.accountName,
    displayName: row.displayName,
    role: row.role,
    platform: row.platform ?? "X",
    handle: row.handle ?? "",
    profileUrl: row.profileUrl ?? "",
    positioning: row.positioning ?? "",
    personaRole: row.personaRole ?? "",
    voice: parseJson(row.voiceJson),
    contentTypes: parseJson(row.contentTypesJson),
    avoid: parseJson(row.avoidJson),
    cadence: row.cadence ?? "",
    interactionTarget: row.interactionTarget ?? ""
  };
}

function seedDatabase() {
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (userCount > 0) return;

  const users = personaUsers;

  const assets = visionTreeAssets;

  /*
  const legacyAssets = [
    {
      id: "a1",
      title: "AI 视频脚本复盘素材",
      theme: "效率工具",
      source: "访谈摘录",
      format: "长文 + 短视频",
      freshness: "今天 10:20",
      score: 91,
      tags: ["案例", "生产力", "脚本"],
      summary: "来自创作者访谈的三段故事线，可拆成教程、复盘和观点短帖。",
      owner: "Mia",
      palette: "mint",
      notes: ["适合拆成 1 条短视频、1 条小红书观点帖和 1 条公众号复盘。", "素材里的失败版本可以作为开场冲突。"],
      resources: [
        {
          id: "a1-web",
          title: "访谈原文：创作者如何复盘脚本",
          kind: "web",
          url: "https://content.example/source/ai-script-interview",
          source: "网页链接",
          updated: "2026-05-08",
          summary: "记录创作者从选题、脚本、剪辑到评论复盘的完整过程。",
          highlights: ["改稿集中在前 3 秒钩子。", "评论区问题可继续做答疑内容。", "适合沉淀为团队脚本检查清单。"]
        },
        {
          id: "a1-pdf",
          title: "脚本迭代记录 PDF",
          kind: "pdf",
          url: "https://content.example/files/script-review.pdf",
          source: "PDF",
          updated: "2026-05-07",
          summary: "包含 6 版脚本、镜头说明和发布后的数据回看。",
          highlights: ["第 3 版完播率提升最明显。", "标题测试可复用于 B 站和视频号。", "结尾评论引导需要保留。"]
        }
      ]
    },
    {
      id: "a2",
      title: "五月内容增长周报",
      theme: "数据洞察",
      source: "运营报表",
      format: "图文轮播",
      freshness: "昨天 18:40",
      score: 84,
      tags: ["周报", "增长", "复盘"],
      summary: "整理了 6 个账号的曝光、收藏和评论关键词，适合做复盘型内容。",
      owner: "Jun",
      palette: "amber",
      notes: ["适合做周报轮播，也可以拆成管理层同步长文。", "优先突出曝光增长和收藏率异常点。"],
      resources: [
        {
          id: "a2-web",
          title: "矩阵账号周报看板",
          kind: "web",
          url: "https://content.example/dashboard/may-weekly-growth",
          source: "网页链接",
          updated: "2026-05-07",
          summary: "汇总 6 个账号本周曝光、互动和内容发布节奏。",
          highlights: ["小红书收藏率连续两周上升。", "公众号打开率受发布时间影响明显。", "微博话题互动适合做快评。"]
        },
        {
          id: "a2-pdf",
          title: "五月第一周增长简报 PDF",
          kind: "pdf",
          url: "https://content.example/files/may-growth-brief.pdf",
          source: "PDF",
          updated: "2026-05-06",
          summary: "沉淀周报结论、样本内容截图和下周行动建议。",
          highlights: ["轮播封面建议使用一个关键数字。", "需要补充高收藏内容样本。", "下周优先测试午间发布时间。"]
        }
      ]
    },
    {
      id: "a3",
      title: "用户评论高频问题",
      theme: "社群反馈",
      source: "评论抓取",
      format: "FAQ 清单",
      freshness: "2 天前",
      score: 79,
      tags: ["评论", "答疑", "转化"],
      summary: "归类了 32 条评论中的疑问和反对意见，可生成答疑帖和直播提纲。",
      owner: "Hao",
      palette: "rose",
      notes: ["适合做 FAQ 清单和短视频口播。", "高频问题可以直接作为标题，减少创作距离感。"],
      resources: [
        {
          id: "a3-web",
          title: "评论聚类页面",
          kind: "web",
          url: "https://content.example/comments/faq-cluster",
          source: "网页链接",
          updated: "2026-05-06",
          summary: "按疑问、反对意见、购买顾虑和功能建议归类评论。",
          highlights: ["价格相关问题占 28%。", "教程类追问适合做系列内容。", "有 5 条评论可做二创引用。"]
        },
        {
          id: "a3-pdf",
          title: "评论问题归档 PDF",
          kind: "pdf",
          url: "https://content.example/files/comment-faq.pdf",
          source: "PDF",
          updated: "2026-05-05",
          summary: "保留原始评论、回复建议和可复用答疑话术。",
          highlights: ["需要避开过度承诺。", "每条回答控制在 80 字内。", "结尾引导用户补充场景。"]
        }
      ]
    },
    {
      id: "a4",
      title: "品牌幕后拍摄素材",
      theme: "品牌信任",
      source: "素材上传",
      format: "短视频混剪",
      freshness: "本周一",
      score: 73,
      tags: ["幕后", "团队", "信任"],
      summary: "包含产品打磨、团队讨论和客户交付片段，适合做温度型内容。",
      owner: "Lena",
      palette: "cyan",
      notes: ["适合品牌信任内容，不宜过度销售。", "短视频开场可以直接使用团队讨论片段。"],
      resources: [
        {
          id: "a4-web",
          title: "幕后素材索引页",
          kind: "web",
          url: "https://content.example/media/behind-the-scenes",
          source: "网页链接",
          updated: "2026-05-04",
          summary: "按场景归档产品打磨、团队会议和交付瞬间。",
          highlights: ["团队讨论片段适合做开场。", "客户交付镜头需要打码。", "产品细节镜头适合做转场。"]
        },
        {
          id: "a4-pdf",
          title: "品牌幕后拍摄脚本 PDF",
          kind: "pdf",
          url: "https://content.example/files/brand-bts-shotlist.pdf",
          source: "PDF",
          updated: "2026-05-03",
          summary: "包含镜头清单、拍摄顺序和平台剪辑建议。",
          highlights: ["先信任，再功能。", "避免大段旁白。", "建议保留现场环境声。"]
        }
      ]
    }
  ];
  */

  const templates = [
    {
      id: "t1",
      title: "三段式观点短帖",
      format: "观点 / 图文",
      channels: ["小红书", "微博", "公众号"],
      hook: "先抛出反常识结论，再给证据。",
      structure: ["反常识标题", "真实场景", "三点拆解", "行动提示"],
      length: "600-900 字",
      notes: ["适合观点明确、证据充分的素材。", "标题不要只写结论，要保留一点反差。"],
      resources: [
        {
          id: "t1-web",
          title: "观点短帖示例页",
          kind: "web",
          url: "https://content.example/templates/opinion-post",
          source: "网页链接",
          updated: "2026-05-02",
          summary: "展示三段式观点短帖的标题、正文和评论引导样例。",
          highlights: ["第一段只讲一个场景。", "中段用数字或案例支撑。", "结尾给一个可执行动作。"]
        },
        {
          id: "t1-pdf",
          title: "观点帖写作检查表 PDF",
          kind: "pdf",
          url: "https://content.example/files/opinion-checklist.pdf",
          source: "PDF",
          updated: "2026-05-01",
          summary: "用于审核标题、论据和转化引导是否完整。",
          highlights: ["标题需要包含对象和冲突。", "每段不超过 120 字。", "保留一个评论问题。"]
        }
      ]
    },
    {
      id: "t2",
      title: "短视频脚本：问题到结果",
      format: "短视频",
      channels: ["抖音", "视频号", "B站"],
      hook: "3 秒内展示痛点和结果画面。",
      structure: ["痛点镜头", "过程演示", "前后对比", "评论引导"],
      length: "45-75 秒",
      notes: ["适合教程、复盘和工具类素材。", "开场先给结果画面，再回到过程。"],
      resources: [
        {
          id: "t2-web",
          title: "短视频脚本模板展示页",
          kind: "web",
          url: "https://content.example/templates/problem-to-result-video",
          source: "网页链接",
          updated: "2026-05-04",
          summary: "展示镜头段落、字幕节奏和评论引导的组合方式。",
          highlights: ["每 8-12 秒切换一次视觉重点。", "前后对比要有同一指标。", "口播只保留必要解释。"]
        },
        {
          id: "t2-pdf",
          title: "短视频分镜模板 PDF",
          kind: "pdf",
          url: "https://content.example/files/video-shot-template.pdf",
          source: "PDF",
          updated: "2026-05-03",
          summary: "包含镜头、字幕、画面素材和剪辑备注的表格模板。",
          highlights: ["第一镜头必须可独立理解。", "字幕不超过两行。", "最后 5 秒留互动钩子。"]
        }
      ]
    },
    {
      id: "t3",
      title: "数据周报轮播",
      format: "轮播 / 长图",
      channels: ["小红书", "公众号", "微博"],
      hook: "用一个关键数字做封面。",
      structure: ["关键指标", "波动原因", "内容样本", "下周动作"],
      length: "8-10 页",
      notes: ["适合周报、月报和活动复盘素材。", "每一页只服务一个判断，不堆叠过多指标。"],
      resources: [
        {
          id: "t3-web",
          title: "数据轮播版式展示页",
          kind: "web",
          url: "https://content.example/templates/data-carousel",
          source: "网页链接",
          updated: "2026-05-05",
          summary: "展示封面数字、图表页、样本页和行动页的排版。",
          highlights: ["封面只放一个核心指标。", "图表页需要配一句结论。", "最后一页必须落到下周动作。"]
        },
        {
          id: "t3-pdf",
          title: "数据周报模板 PDF",
          kind: "pdf",
          url: "https://content.example/files/data-report-carousel.pdf",
          source: "PDF",
          updated: "2026-05-04",
          summary: "可复用的 10 页周报结构和数据填充说明。",
          highlights: ["先结论，后指标。", "样本截图要统一尺寸。", "结尾列 3 个动作。"]
        }
      ]
    },
    {
      id: "t4",
      title: "评论区答疑合集",
      format: "FAQ",
      channels: ["抖音", "小红书", "视频号", "B站"],
      hook: "直接引用用户问题，降低距离感。",
      structure: ["评论截图", "简短回答", "展开解释", "二次提问"],
      length: "5-7 问",
      notes: ["适合评论素材、售前问题和直播切片。", "每条回答要保留用户原始表达里的关键词。"],
      resources: [
        {
          id: "t4-web",
          title: "评论答疑合集展示页",
          kind: "web",
          url: "https://content.example/templates/comment-faq",
          source: "网页链接",
          updated: "2026-05-06",
          summary: "展示评论截图、短回答和展开解释的内容结构。",
          highlights: ["先回应情绪，再回答问题。", "每个问题只给一个明确结论。", "结尾引导用户补充场景。"]
        },
        {
          id: "t4-pdf",
          title: "FAQ 内容审核 PDF",
          kind: "pdf",
          url: "https://content.example/files/faq-review.pdf",
          source: "PDF",
          updated: "2026-05-05",
          summary: "用于检查答疑内容是否准确、克制、可发布。",
          highlights: ["避免承诺无法保证的结果。", "保留真实评论口吻。", "必要时补充免责声明。"]
        }
      ]
    }
  ];

  const contents = [
    ["c1", "我们把一条视频改了 6 次，播放才破万", "抖音", "已发布", "a1", "t2", "Mia", "2026-05-07T16:35:00+08:00", "2026-05-07", "18:00", "2026-05-07T18:20:00+08:00", 28600, 1460, 183, 92, 614],
    ["c2", "五月第一周账号矩阵内容表现", "公众号", "已排期", "a2", "t3", "Jun", "2026-05-07T17:25:00+08:00", "2026-05-10", "20:30", null, 0, 0, 0, 0, 0],
    ["c3", "评论区问得最多的 5 个问题", "小红书", "草稿", "a3", "t4", "Hao", "2026-05-08T13:05:00+08:00", "2026-05-09", "10:00", null, 0, 0, 0, 0, 0]
  ];

  const plans = [
    ["p1", "2026-05-09", "周六", "10:00", "小红书", "评论区答疑合集", "Hao", "拉升收藏", "制作中", "c3"],
    ["p2", "2026-05-10", "周日", "20:30", "公众号", "矩阵周报复盘", "Jun", "管理层同步", "待发布", "c2"],
    ["p3", "2026-05-11", "周一", "12:15", "抖音", "脚本改稿过程", "Mia", "提高完播", "待领取", null],
    ["p4", "2026-05-12", "周二", "18:00", "视频号", "品牌幕后混剪", "Lena", "建立信任", "待领取", null],
    ["p5", "2026-05-13", "周三", "09:40", "微博", "增长数据快评", "Jun", "话题互动", "待领取", null]
  ];

  const activities = [
    ["act1", "c1", "数据同步", "曝光 +12%，评论集中在脚本结构。", "09:30", "2026-05-08T09:30:00+08:00"],
    ["act2", "c1", "评论记录", "置顶了高赞问题，准备二创答疑。", "11:12", "2026-05-08T11:12:00+08:00"],
    ["act3", "c2", "状态更新", "已通过审核，等待发布。", "昨天", "2026-05-07T18:00:00+08:00"],
    ["act4", "c3", "状态更新", "初稿已进入内容池。", "13:05", "2026-05-08T13:05:00+08:00"]
  ];

  const insertUser = db.prepare(`
    INSERT INTO users
      (id, account_name, display_name, role, platform, handle, profile_url, positioning, persona_role,
       voice_json, content_types_json, avoid_json, cadence, interaction_target)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  users.forEach((user) =>
    insertUser.run(
      user.id,
      user.accountName,
      user.displayName,
      user.role,
      user.platform,
      user.handle,
      user.profileUrl,
      user.positioning,
      user.personaRole,
      json(user.voice),
      json(user.contentTypes),
      json(user.avoid),
      user.cadence,
      user.interactionTarget
    )
  );

  const insertAsset = db.prepare(`
    INSERT INTO assets
      (id, title, theme, source, format, freshness, score, tags_json, summary, owner, palette, notes_json, resources_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  assets.forEach((asset) =>
    insertAsset.run(
      asset.id,
      asset.title,
      asset.theme,
      asset.source,
      asset.format,
      asset.freshness,
      asset.score,
      json(asset.tags),
      asset.summary,
      asset.owner,
      asset.palette,
      json(asset.notes),
      json(asset.resources)
    )
  );

  const insertTemplate = db.prepare(`
    INSERT INTO templates
      (id, title, format, channels_json, structure_json, hook, length, notes_json, resources_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  templates.forEach((template) =>
    insertTemplate.run(
      template.id,
      template.title,
      template.format,
      json(template.channels),
      json(template.structure),
      template.hook,
      template.length,
      json(template.notes),
      json(template.resources)
    )
  );

  const insertContent = db.prepare(`
    INSERT INTO contents
      (id, title, channel, status, asset_id, template_id, owner, saved_at, scheduled_date, scheduled_time,
       published_at, views, likes, comments, shares, saves)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  contents.forEach((row) => insertContent.run(...row));

  const insertPlan = db.prepare(`
    INSERT INTO plans (id, date, day, slot, channel, theme, owner, goal, status, content_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  plans.forEach((row) => insertPlan.run(...row));

  const insertActivity = db.prepare(`
    INSERT INTO activities (id, content_id, type, note, time_label, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  activities.forEach((row) => insertActivity.run(...row));
}

function assetReferenceCounts() {
  return new Map(
    db
      .prepare("SELECT asset_id AS id, COUNT(*) AS count FROM contents WHERE status = '已发布' GROUP BY asset_id")
      .all()
      .map((row) => [row.id, row.count])
  );
}

function templateReferenceCounts() {
  return new Map(
    db
      .prepare("SELECT template_id AS id, COUNT(*) AS count FROM contents WHERE status = '已发布' GROUP BY template_id")
      .all()
      .map((row) => [row.id, row.count])
  );
}

function getBootstrap(user) {
  const assetCounts = assetReferenceCounts();
  const templateCounts = templateReferenceCounts();

  const assets = db
    .prepare("SELECT * FROM assets ORDER BY score DESC")
    .all()
    .map((row) => ({
      id: row.id,
      title: row.title,
      theme: row.theme,
      source: row.source,
      format: row.format,
      freshness: row.freshness,
      score: row.score,
      tags: parseJson(row.tags_json),
      summary: row.summary,
      owner: row.owner,
      palette: row.palette,
      notes: parseJson(row.notes_json),
      resources: parseJson(row.resources_json),
      referenceCount: assetCounts.get(row.id) ?? 0
    }));

  const templates = db
    .prepare("SELECT * FROM templates ORDER BY id")
    .all()
    .map((row) => ({
      id: row.id,
      title: row.title,
      format: row.format,
      channels: parseJson(row.channels_json),
      structure: parseJson(row.structure_json),
      hook: row.hook,
      length: row.length,
      notes: parseJson(row.notes_json),
      resources: parseJson(row.resources_json),
      referenceCount: templateCounts.get(row.id) ?? 0
    }));

  const contents = db
    .prepare(`
      SELECT c.*, a.title AS asset_title, t.title AS template_title
      FROM contents c
      JOIN assets a ON a.id = c.asset_id
      JOIN templates t ON t.id = c.template_id
      ORDER BY datetime(c.saved_at) DESC
    `)
    .all()
    .map((row) => ({
      id: row.id,
      title: row.title,
      channel: row.channel,
      status: row.status,
      assetId: row.asset_id,
      templateId: row.template_id,
      assetTitle: row.asset_title,
      templateTitle: row.template_title,
      owner: row.owner,
      savedAt: row.saved_at,
      savedDate: dateFromIso(row.saved_at),
      savedTime: timeFromIso(row.saved_at),
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      publishedAt: row.published_at,
      publishDate: dateFromIso(row.published_at, row.scheduled_date),
      publishTime: timeFromIso(row.published_at, row.scheduled_time),
      metrics: {
        views: row.views,
        likes: row.likes,
        comments: row.comments,
        shares: row.shares,
        saves: row.saves
      },
      activities: db
        .prepare("SELECT id, type, note, time_label AS time FROM activities WHERE content_id = ? ORDER BY datetime(created_at) DESC LIMIT 8")
        .all(row.id)
    }));

  const planItems = db.prepare("SELECT id, date, day, slot, channel, theme, owner, goal, status, content_id AS contentId FROM plans ORDER BY date, slot").all();

  return {
    user,
    accounts: getAccounts(),
    assets,
    templates,
    contentPool: contents,
    planItems
  };
}

function getAccounts() {
  return db
    .prepare(`
      SELECT
        id,
        account_name AS accountName,
        display_name AS displayName,
        role,
        platform,
        handle,
        profile_url AS profileUrl,
        positioning,
        persona_role AS personaRole,
        voice_json AS voiceJson,
        content_types_json AS contentTypesJson,
        avoid_json AS avoidJson,
        cadence,
        interaction_target AS interactionTarget
      FROM users
      ORDER BY id
    `)
    .all()
    .map(mapUser);
}

function getRequestBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        rejectBody(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(body));
      } catch {
        rejectBody(new Error("Invalid JSON"));
      }
    });
  });
}

function sendJson(res, status, payload, origin) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store"
  };
  if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  res.writeHead(status, headers);
  res.end(JSON.stringify(payload));
}

function sendError(res, status, message, origin) {
  sendJson(res, status, { error: message }, origin);
}

function authenticate(req) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  return (
    db
      .prepare(`
        SELECT
          u.id,
          u.account_name AS accountName,
          u.display_name AS displayName,
          u.role,
          u.platform,
          u.handle,
          u.profile_url AS profileUrl,
          u.positioning,
          u.persona_role AS personaRole,
          u.voice_json AS voiceJson,
          u.content_types_json AS contentTypesJson,
          u.avoid_json AS avoidJson,
          u.cadence,
          u.interaction_target AS interactionTarget
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
      `)
      .get(token)
  );
}

function requireAuth(req, res, origin) {
  const user = authenticate(req);
  if (!user) {
    sendError(res, 401, "请先登录。", origin);
    return null;
  }
  return mapUser(user);
}

function validateText(value, maxLength = 200) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function validMetric(value) {
  return Number.isInteger(value) && value >= 0 && value <= 1_000_000_000;
}

async function handleApi(req, res, pathname, origin) {
  if (req.method === "OPTIONS") {
    const headers = {
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    };
    if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method === "GET" && pathname === "/api/accounts") {
    sendJson(res, 200, { accounts: getAccounts() }, origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/login") {
    const body = await getRequestBody(req);
    const accountName = String(body.accountName ?? "").trim().toLowerCase();
    if (!accountName || accountName.length > 40) {
      sendError(res, 400, "请输入有效账号名。", origin);
      return;
    }

    const userRow = db
      .prepare(
        `SELECT
          id,
          account_name AS accountName,
          display_name AS displayName,
          role,
          platform,
          handle,
          profile_url AS profileUrl,
          positioning,
          persona_role AS personaRole,
          voice_json AS voiceJson,
          content_types_json AS contentTypesJson,
          avoid_json AS avoidJson,
          cadence,
          interaction_target AS interactionTarget
        FROM users
        WHERE account_name = ? OR lower(display_name) = ?`
      )
      .get(accountName, accountName);
    const user = mapUser(userRow);
    if (!user) {
      sendError(res, 404, "账号不存在。", origin);
      return;
    }

    const token = randomUUID();
    db.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(token, user.id, nowIso());
    sendJson(res, 200, { token, user }, origin);
    return;
  }

  if (req.method === "GET" && pathname === "/api/bootstrap") {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    sendJson(res, 200, getBootstrap(user), origin);
    return;
  }

  if (req.method === "POST" && pathname === "/api/contents/drafts") {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    const body = await getRequestBody(req);
    if (!validateText(body.title) || !validateText(body.channel, 20) || !validateText(body.assetId, 40) || !validateText(body.templateId, 40)) {
      sendError(res, 400, "草稿字段不完整。", origin);
      return;
    }

    const asset = db.prepare("SELECT id, title FROM assets WHERE id = ?").get(body.assetId);
    const template = db.prepare("SELECT id, title FROM templates WHERE id = ?").get(body.templateId);
    const plan = body.planId ? db.prepare("SELECT * FROM plans WHERE id = ?").get(String(body.planId)) : null;
    if (!asset || !template) {
      sendError(res, 400, "素材或模板不存在。", origin);
      return;
    }

    const id = `c${Date.now()}`;
    const savedAt = nowIso();
    const scheduledDate = plan?.date ?? dateFromIso(savedAt);
    const scheduledTime = plan?.slot ?? timeFromIso(savedAt);

    db.prepare(`
      INSERT INTO contents
        (id, title, channel, status, asset_id, template_id, owner, saved_at, scheduled_date, scheduled_time, published_at)
      VALUES (?, ?, ?, '草稿', ?, ?, ?, ?, ?, ?, NULL)
    `).run(id, String(body.title).trim(), String(body.channel).trim(), asset.id, template.id, user.displayName, savedAt, scheduledDate, scheduledTime);

    if (plan) {
      db.prepare("UPDATE plans SET status = '制作中', content_id = ? WHERE id = ?").run(id, plan.id);
    }

    db.prepare("INSERT INTO activities (id, content_id, type, note, time_label, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      `act${Date.now()}`,
      id,
      "状态更新",
      `从「${asset.title}」和「${template.title}」生成草稿。`,
      "刚刚",
      savedAt
    );

    sendJson(res, 201, getBootstrap(user), origin);
    return;
  }

  const publishMatch = pathname.match(/^\/api\/contents\/([^/]+)\/publish$/);
  if (req.method === "POST" && publishMatch) {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    const contentId = publishMatch[1];
    const content = db.prepare("SELECT * FROM contents WHERE id = ?").get(contentId);
    if (!content) {
      sendError(res, 404, "内容不存在。", origin);
      return;
    }

    const publishedAt = content.published_at ?? nowIso();
    const viewsGain = content.views > 0 ? 2400 : 12800;
    const likesGain = Math.round(viewsGain * 0.046);
    const commentsGain = Math.round(viewsGain * 0.006);
    const sharesGain = Math.round(viewsGain * 0.003);
    const savesGain = Math.round(viewsGain * 0.012);

    db.prepare(`
      UPDATE contents
      SET status = '已发布',
          published_at = ?,
          views = views + ?,
          likes = likes + ?,
          comments = comments + ?,
          shares = shares + ?,
          saves = saves + ?
      WHERE id = ?
    `).run(publishedAt, viewsGain, likesGain, commentsGain, sharesGain, savesGain, contentId);
    db.prepare("UPDATE plans SET status = '已完成' WHERE content_id = ?").run(contentId);
    db.prepare("INSERT INTO activities (id, content_id, type, note, time_label, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      `act${Date.now()}`,
      contentId,
      "数据同步",
      `后端同步 ${content.channel} 最新表现，曝光新增 ${viewsGain >= 10000 ? `${(viewsGain / 10000).toFixed(1)}万` : viewsGain}。`,
      "刚刚",
      nowIso()
    );

    sendJson(res, 200, getBootstrap(user), origin);
    return;
  }

  const interactionMatch = pathname.match(/^\/api\/contents\/([^/]+)\/interactions$/);
  if (req.method === "POST" && interactionMatch) {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    const body = await getRequestBody(req);
    const type = body.type === "转发记录" ? "转发记录" : body.type === "评论记录" ? "评论记录" : null;
    if (!type) {
      sendError(res, 400, "互动类型不合法。", origin);
      return;
    }

    const contentId = interactionMatch[1];
    const content = db.prepare("SELECT id FROM contents WHERE id = ?").get(contentId);
    if (!content) {
      sendError(res, 404, "内容不存在。", origin);
      return;
    }

    if (type === "评论记录") {
      db.prepare("UPDATE contents SET comments = comments + 1 WHERE id = ?").run(contentId);
    } else {
      db.prepare("UPDATE contents SET shares = shares + 1 WHERE id = ?").run(contentId);
    }

    db.prepare("INSERT INTO activities (id, content_id, type, note, time_label, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      `act${Date.now()}`,
      contentId,
      type,
      type === "评论记录" ? "新增一条高价值评论，已标记为二创线索。" : "记录一次跨平台转发。",
      "刚刚",
      nowIso()
    );

    sendJson(res, 200, getBootstrap(user), origin);
    return;
  }

  const planCompleteMatch = pathname.match(/^\/api\/plans\/([^/]+)\/complete$/);
  if (req.method === "POST" && planCompleteMatch) {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    const planId = planCompleteMatch[1];
    const plan = db.prepare("SELECT id FROM plans WHERE id = ?").get(planId);
    if (!plan) {
      sendError(res, 404, "计划不存在。", origin);
      return;
    }
    db.prepare("UPDATE plans SET status = '已完成' WHERE id = ?").run(planId);
    sendJson(res, 200, getBootstrap(user), origin);
    return;
  }

  const platformMatch = pathname.match(/^\/api\/contents\/([^/]+)\/platform-update$/);
  if (req.method === "POST" && platformMatch) {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    const body = await getRequestBody(req);
    const contentId = platformMatch[1];
    const content = db.prepare("SELECT id FROM contents WHERE id = ?").get(contentId);
    if (!content) {
      sendError(res, 404, "内容不存在。", origin);
      return;
    }

    const metrics = body.metrics ?? {};
    const views = Number(metrics.views ?? 0);
    const likes = Number(metrics.likes ?? 0);
    const comments = Number(metrics.comments ?? 0);
    const shares = Number(metrics.shares ?? 0);
    const saves = Number(metrics.saves ?? 0);
    if (![views, likes, comments, shares, saves].every(validMetric)) {
      sendError(res, 400, "平台数据不合法。", origin);
      return;
    }
    const publishedAt = typeof body.publishedAt === "string" && !Number.isNaN(Date.parse(body.publishedAt)) ? new Date(body.publishedAt).toISOString() : nowIso();

    db.prepare(`
      UPDATE contents
      SET status = '已发布',
          published_at = ?,
          views = ?,
          likes = ?,
          comments = ?,
          shares = ?,
          saves = ?
      WHERE id = ?
    `).run(publishedAt, views, likes, comments, shares, saves, contentId);
    db.prepare("UPDATE plans SET status = '已完成' WHERE content_id = ?").run(contentId);
    db.prepare("INSERT INTO activities (id, content_id, type, note, time_label, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      `act${Date.now()}`,
      contentId,
      "数据同步",
      "平台数据更新 API 已写入真实发布时间和最新互动指标。",
      "刚刚",
      nowIso()
    );

    sendJson(res, 200, getBootstrap(user), origin);
    return;
  }

  sendError(res, 404, "API 不存在。", origin);
}

function serveStatic(req, res, pathname) {
  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  const filePath = pathname === "/" ? join(distDir, "index.html") : join(distDir, pathname);
  const safePath = resolve(filePath);
  if (!safePath.startsWith(distDir) || !existsSync(safePath)) {
    const fallback = join(distDir, "index.html");
    if (existsSync(fallback)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff" });
      res.end(readFileSync(fallback));
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg"
  };
  res.writeHead(200, { "Content-Type": contentTypes[extname(safePath)] ?? "application/octet-stream", "X-Content-Type-Options": "nosniff" });
  res.end(readFileSync(safePath));
}

createSchema();
migrateSchema();
seedDatabase();
upsertPersonaUsers();
syncVisionTreeDemoData();

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname, origin);
      return;
    }
    serveStatic(req, res, url.pathname);
  } catch (error) {
    sendError(res, 500, "服务器处理失败。", origin);
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Content System API listening on http://localhost:${port}`);
  console.log(`SQLite database: ${dbPath}`);
});
