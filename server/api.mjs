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
    role: "负责人：余同洲",
    platform: "X",
    handle: "@milo_reed_vt",
    profileUrl: "https://x.com/milo_reed_vt",
    positioning: "工程师号 / 产品建设者",
    personaRole: "发工程师视角的真实技术选择和产品取舍，让人相信 VisionTree 是认真做出来的。",
    voice: ["短句", "克制", "工程师对工程师说话", "说清楚选项与取舍"],
    contentTypes: ["真实技术选择", "产品取舍复盘", "我们面临了什么选项", "为什么这样做"],
    avoid: ["粉丝式吹捧", "宏大品牌口号", "颠覆行业", "只说结论不讲取舍"],
    cadence: "第一周发 3-4 条工程师视角短帖；在技术圈大号下留下有判断的评论。",
    interactionTarget: "技术圈、AI 工具圈、产品建设讨论。"
  },
  {
    id: "u2",
    accountName: "ai-doubt",
    displayName: "AI Doubt Notes",
    role: "负责人：石盛楠",
    platform: "X",
    handle: "@ai_doubt_notes",
    profileUrl: "https://x.com/ai_doubt_notes",
    positioning: "反 AI 怀疑者 / 公开怀疑笔记",
    personaRole: "用短、刺、有事实的短帖建立批判底色，让人读完停一下。",
    voice: ["短", "刺", "冷静", "有事实", "不只是情绪"],
    contentTypes: ["反 AI 短帖", "AI 效率神话拆解", "认知外包观察", "AI 工具发布帖下的短评"],
    avoid: ["阴谋论", "人身攻击", "AI 毁灭人类式恐慌", "第一周先不发 Grudging Admit"],
    cadence: "第一周准备 5-6 条反 AI 短帖；每条不超过三四句话。",
    interactionTarget: "AI 工具发布帖、AI 效率讨论帖、认知外包相关讨论。"
  },
  {
    id: "u3",
    accountName: "nora",
    displayName: "Nora Blake",
    role: "负责人：许畅",
    platform: "X",
    handle: "@nora_tries_ai",
    profileUrl: "https://x.com/nora_tries_ai",
    positioning: "普通人试用号 / 非技术用户",
    personaRole: "真实记录 AI 工具里的困惑、不确定和小发现，不装懂也不做评测。",
    voice: ["真实", "日常", "不装懂", "有一点普通人的迟疑"],
    contentTypes: ["AI 工具真实使用感受", "我没看懂这个功能", "省了时间但不确定花得更好", "普通人视角评论"],
    avoid: ["技术术语堆砌", "专家口吻", "工具排行榜", "假装已经理解"],
    cadence: "第一周写 2-3 条真实使用感受；在普通人视角的 AI 讨论帖下评论。",
    interactionTarget: "普通用户、AI 工具体验、职场效率焦虑内容。"
  },
  {
    id: "u4",
    accountName: "eli",
    displayName: "Eli Rowan",
    role: "负责人：陈政霖",
    platform: "X",
    handle: "@eli_rowan_vt",
    profileUrl: "https://x.com/eli_rowan_vt",
    positioning: "造概念的慢思考号",
    personaRole: "为 VisionTree 叙事造第一个月的主推概念词，用少量深帖建立思想密度。",
    voice: ["慢", "稳", "有思想密度", "不用感叹号"],
    contentTypes: ["月度概念词", "同一概念的不同场景切入", "热点背后的默认假设", "认知、判断、价值相关长帖"],
    avoid: ["发太多", "纯热点跟风", "轻飘金句", "只说同意"],
    cadence: "第一周发 3 条围绕同一概念词的帖子；在 5-8 个思想类大号评论区出现。",
    interactionTarget: "深度讨论、研究解读、AI 与人的价值边界。"
  },
  {
    id: "u5",
    accountName: "thinking-lab",
    displayName: "Thinking Lab",
    role: "负责人：武新悦",
    platform: "X",
    handle: "@thinking_lab_vt",
    profileUrl: "https://x.com/thinking_lab_vt",
    positioning: "视觉 + 互动实验室",
    personaRole: "原 Thinking in Frames 和 Decision Lab 合并。用图解释模型，也用两分钟小实验让人动手想。",
    voice: ["视觉优先", "实验感", "三秒看懂", "少解释多动作"],
    contentTypes: ["思维模型图解", "决策对比图", "数据可视化", "概念卡", "投票", "偏差识别", "决策挑战"],
    avoid: ["每天都必须发图", "每天都必须发实验", "一张图塞太多字", "自我介绍式评论"],
    cadence: "第一周主页留下 5 条：两张图、两个实验、一张概念卡。",
    interactionTarget: "思维模型、概念解释、互动实验、可收藏图解内容。"
  },
  {
    id: "u6",
    accountName: "thinking-tree",
    displayName: "The Thinking Tree",
    role: "负责人：马文博",
    platform: "X",
    handle: "@thinking_tree_vt",
    profileUrl: "https://x.com/thinking_tree_vt",
    positioning: "一棵会说话的树",
    personaRole: "它不是一个人。它把 VisionTree 的 Tree 变成活的隐喻，用树的口吻讲思维模型、认知偏差和结构化思考。",
    voice: ["平静", "像活了很久的树", "淡淡幽默", "不卖萌", "不装可爱"],
    contentTypes: ["树的成长日记", "树的观察", "年轮故事", "和其他账号互动"],
    avoid: ["卖萌", "装可爱", "过度人设化", "把树写成吉祥物"],
    cadence: "第一周发 2-3 条树的独白；长期每天 1 条。",
    interactionTarget: "思维模型、AI 时代人类观察、可收藏的树形隐喻内容。"
  },
  {
    id: "u7",
    accountName: "visiontree",
    displayName: "VisionTree",
    role: "武新悦与石盛楠共同管理",
    platform: "X",
    handle: "@VisionTreeLab",
    profileUrl: "https://x.com/VisionTreeLab",
    positioning: "官方号 / 叙事收拢",
    personaRole: "官方号不追自己出圈。第一周用 3-4 条品类定义帖说明 VisionTree 不是什么、是什么，并转发其他账号的好内容。",
    voice: ["清楚", "克制", "定义感", "收拢叙事"],
    contentTypes: ["品类定义帖", "对比式表达", "矩阵转发点评", "官方叙事汇总"],
    avoid: ["发太多", "自己抢矩阵账号的戏", "空泛 slogan", "把 VisionTree 讲成普通效率工具"],
    cadence: "第一周 3-4 条品类定义帖；转发其他六个号中质量最高的帖子并补一句评论。",
    interactionTarget: "把七个账号收拢到同一条 VisionTree 叙事里。"
  }
];

const visionTreeAssets = [
  {
    id: "a1",
    title: "Thinking Lab 第一周启动素材",
    theme: "视觉实验",
    source: "V2 账号启动计划",
    format: "图解 + 两分钟实验",
    freshness: "今天 10:20",
    score: 95,
    tags: ["Thinking Lab", "图解", "互动实验"],
    summary: "原 Thinking in Frames 和 Decision Lab 合并为 Thinking Lab：一边做模型图解，一边发两分钟思维实验。",
    owner: "Thinking Lab",
    palette: "mint",
    notes: ["第一周目标不是追粉丝，而是让主页三秒内说清楚账号是谁。", "内容组合是两张图、两个实验、一张概念卡。"],
    resources: [
      {
        id: "a1-web",
        title: "Thinking Lab 第一周详细计划",
        kind: "web",
        url: "https://visiontree.example/v2/thinking-lab-week-one",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "头像、Banner、Bio、周一到周日的内容节奏与互动方式。",
        highlights: ["Banner 写 One visual. One experiment. Every day.", "周一发沉没成本图解，周二发第一个互动实验。", "周三有 3-4 条内容后再置顶第一张图。"]
      },
      {
        id: "a1-pdf",
        title: "Thinking Lab 启动清单 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/thinking-lab-launch.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "沉淀 Thinking Lab 第一周的视觉、互动、置顶帖与评论动作。",
        highlights: ["图要干净，三秒看懂。", "互动题可以纯文字。", "评论区不要自我介绍，不要说关注我。"]
      }
    ]
  },
  {
    id: "a2",
    title: "Eli Rowan 月度概念词素材",
    theme: "慢思考",
    source: "V2 账号启动计划",
    format: "概念长帖",
    freshness: "昨天 18:40",
    score: 90,
    tags: ["Eli Rowan", "概念词", "慢思考"],
    summary: "Eli 第一周只做一件事：选好这个月的主推概念词，用不同场景切入发三条。",
    owner: "Eli Rowan",
    palette: "amber",
    notes: ["Eli 的调性是慢和深，第一周发太多反而不对。", "评论要有自己的角度，不要只说同意。"],
    resources: [
      {
        id: "a2-web",
        title: "Eli 第一周概念准备页",
        kind: "web",
        url: "https://visiontree.example/v2/eli-concept-month",
        source: "网页链接",
        updated: "2026-05-07",
        summary: "围绕同一个概念词准备三到四条帖子，每条从不同场景切入。",
        highlights: ["第一周发三条就够。", "建立慢和深的第一印象。", "开始在思想类大号评论区出现。"]
      },
      {
        id: "a2-pdf",
        title: "Eli 概念帖检查表 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/eli-concept-checklist.pdf",
        source: "PDF",
        updated: "2026-05-06",
        summary: "检查概念是否足够清楚、场景是否有差异、语气是否慢而稳。",
        highlights: ["不用感叹号。", "不要轻飘金句。", "概念要能被 Thinking Lab 做成图。"]
      }
    ]
  },
  {
    id: "a3",
    title: "AI Doubt Notes 反 AI 短帖素材",
    theme: "怀疑笔记",
    source: "V2 账号启动计划",
    format: "三句短帖",
    freshness: "2 天前",
    score: 88,
    tags: ["AI Doubt Notes", "反 AI", "效率神话"],
    summary: "准备五到六条反 AI 短帖。每条不超过三四句话，但要让人读完愣一下。",
    owner: "AI Doubt Notes",
    palette: "rose",
    notes: ["评论要短要刺，但要有事实，不能只是情绪。", "第一周不用发 Grudging Admit，先铺批判底色。"],
    resources: [
      {
        id: "a3-web",
        title: "AI Doubt 第一周短帖池",
        kind: "web",
        url: "https://visiontree.example/v2/ai-doubt-week-one",
        source: "网页链接",
        updated: "2026-05-06",
        summary: "收集 AI 工具发布帖、效率讨论帖下可切入的反问和短评论。",
        highlights: ["短帖不超过三四句话。", "读完要停一下。", "不要把怀疑写成恐慌。"]
      },
      {
        id: "a3-pdf",
        title: "反 AI 短帖检查表 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/ai-doubt-notes.pdf",
        source: "PDF",
        updated: "2026-05-05",
        summary: "检查每条短帖是否有事实支点、是否足够短、是否避免情绪化。",
        highlights: ["短。", "刺。", "有事实。"]
      }
    ]
  },
  {
    id: "a4",
    title: "Milo Reed 工程取舍素材",
    theme: "工程取舍",
    source: "V2 账号启动计划",
    format: "工程师短帖",
    freshness: "本周一",
    score: 86,
    tags: ["Milo Reed", "技术选择", "产品取舍"],
    summary: "从 VisionTree 最近真实遇到的技术选择出发：面临什么选项、选了哪个、为什么。",
    owner: "Milo Reed",
    palette: "cyan",
    notes: ["不用长，写清楚选项和判断。", "评论像工程师对工程师说话。"],
    resources: [
      {
        id: "a4-web",
        title: "Milo 工程师短帖素材页",
        kind: "web",
        url: "https://visiontree.example/v2/milo-engineering-notes",
        source: "网页链接",
        updated: "2026-05-04",
        summary: "记录 VisionTree 建设中的真实技术选择、被砍掉的方案和保留原因。",
        highlights: ["我们面临了什么选项。", "我们选了哪个。", "为什么。"]
      },
      {
        id: "a4-pdf",
        title: "工程取舍复盘 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/milo-tradeoffs.pdf",
        source: "PDF",
        updated: "2026-05-03",
        summary: "把真实技术选择整理为可发布的短帖结构。",
        highlights: ["别像发布公告。", "别写成粉丝口吻。", "保留工程判断。"]
      }
    ]
  },
  {
    id: "a5",
    title: "Nora Blake 真实试用素材",
    theme: "普通人体验",
    source: "V2 账号启动计划",
    format: "试用日记",
    freshness: "本周二",
    score: 84,
    tags: ["Nora Blake", "真实体验", "不装懂"],
    summary: "挑一个这周真的在用的 AI 工具，写两到三条真实使用感受：可以困惑，可以承认没看懂。",
    owner: "Nora Blake",
    palette: "rose",
    notes: ["关键词是真实。", "不要做评测，不要装懂。"],
    resources: [
      {
        id: "a5-web",
        title: "Nora 第一周试用记录",
        kind: "web",
        url: "https://visiontree.example/v2/nora-tries-ai",
        source: "网页链接",
        updated: "2026-05-05",
        summary: "记录一个普通人使用 AI 工具时的迟疑、节省时间和不确定。",
        highlights: ["我没看懂这个功能在干嘛。", "它确实省了时间。", "但我不确定省下来的时间有没有花在更好的地方。"]
      },
      {
        id: "a5-pdf",
        title: "普通人体验帖模板 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/nora-week-one.pdf",
        source: "PDF",
        updated: "2026-05-05",
        summary: "把真实试用感受整理为两到三条 X 帖。",
        highlights: ["保留困惑。", "保留不确定。", "不要排榜。"]
      }
    ]
  },
  {
    id: "a6",
    title: "The Thinking Tree 树的独白素材",
    theme: "活的隐喻",
    source: "V2 账号启动计划",
    format: "图文独白",
    freshness: "本周三",
    score: 92,
    tags: ["The Thinking Tree", "树的口吻", "思维模型"],
    summary: "The Thinking Tree 不是一个人。它把产品名变成活的隐喻：思维模型是养分，判断力是年轮，结构化思考是根系。",
    owner: "The Thinking Tree",
    palette: "mint",
    notes: ["语气不是卖萌，也不是装可爱。", "它更像一棵活了很久的树，在平静地观察人类。"],
    resources: [
      {
        id: "a6-web",
        title: "The Thinking Tree 角色设定页",
        kind: "web",
        url: "https://visiontree.example/v2/the-thinking-tree",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "解释树的存在逻辑、视觉空间、语气和内容类型。",
        highlights: ["思维模型是养分。", "思考过程是光合作用。", "判断力是年轮。"]
      },
      {
        id: "a6-pdf",
        title: "树的独白首周素材 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/thinking-tree-week-one.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "包含发芽、新叶、根系、年轮等视觉方向和首条独白。",
        highlights: ["I grow one leaf at a time.", "Each leaf is a way of thinking.", "先回到根，再伸向枝。"]
      }
    ]
  },
  {
    id: "a7",
    title: "VisionTree 官方品类定义素材",
    theme: "官方叙事",
    source: "V2 账号启动计划",
    format: "对比式定义帖",
    freshness: "本周四",
    score: 89,
    tags: ["VisionTree", "官方号", "品类定义"],
    summary: "官方号第一周不用发太多。用三到四条对比式定义帖说清楚 VisionTree 不是什么、是什么。",
    owner: "VisionTree",
    palette: "amber",
    notes: ["官方号的任务不是自己出圈，而是把其他六个号的内容收拢到一个叙事里。", "转发矩阵账号的好内容，加一两句评论。"],
    resources: [
      {
        id: "a7-web",
        title: "VisionTree 官方号第一周计划",
        kind: "web",
        url: "https://visiontree.example/v2/official-week-one",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "定义官方号的发布边界、转发策略和品类表达方式。",
        highlights: ["不是普通效率工具。", "不是自动替你做判断。", "是帮助人保留判断的认知增强项目。"]
      },
      {
        id: "a7-pdf",
        title: "官方品类定义帖模板 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/official-category-posts.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "三到四条官方号对比式定义帖草稿模板。",
        highlights: ["不是什么。", "是什么。", "为什么这件事在 AI 时代重要。"]
      }
    ]
  }
];

const visionTreeTemplates = [
  {
    id: "t1",
    title: "图解 + 两分钟实验",
    format: "Visual / Experiment",
    channels: ["X"],
    hook: "One visual. One experiment. Every day.",
    structure: ["一个模型", "一张干净图", "一句解释", "一个动作问题"],
    length: "1 图或 3-5 句",
    notes: ["适合 Thinking Lab。图和互动交替发。", "视觉内容三秒看懂，不要塞太多字。"],
    resources: [
      {
        id: "t1-web",
        title: "Thinking Lab 图解与实验模板页",
        kind: "web",
        url: "https://visiontree.example/templates/thinking-lab",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "把思维模型转成图解或两分钟实验的发布模板。",
        highlights: ["图解只讲一个模型。", "实验题要让人立刻能回复。", "评论区不要自我介绍。"]
      },
      {
        id: "t1-pdf",
        title: "Thinking Lab 内容检查表 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/thinking-lab-template.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "检查模型、图解、互动动作和置顶策略。",
        highlights: ["两张图。", "两个实验。", "一张概念卡。"]
      }
    ]
  },
  {
    id: "t2",
    title: "慢概念三帖",
    format: "Concept Thread",
    channels: ["X"],
    hook: "先命名一个概念，再用三个场景慢慢打开它。",
    structure: ["概念命名", "场景切入", "默认假设", "判断边界"],
    length: "3-8 段",
    notes: ["适合 Eli Rowan。第一周发三条就够。", "不要为了热闹牺牲慢和深。"],
    resources: [
      {
        id: "t2-web",
        title: "Eli 概念帖模板展示页",
        kind: "web",
        url: "https://visiontree.example/templates/eli-concept",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "围绕同一个概念词准备多角度帖子。",
        highlights: ["同一概念，不同场景。", "评论要有自己的角度。", "不用感叹号。"]
      },
      {
        id: "t2-pdf",
        title: "慢概念写作检查表 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/eli-template.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "控制语气、密度和发布频率。",
        highlights: ["慢。", "稳。", "有思想密度。"]
      }
    ]
  },
  {
    id: "t3",
    title: "反 AI 三句短帖",
    format: "Short Note",
    channels: ["X"],
    hook: "让人读完愣一下，但不是情绪宣泄。",
    structure: ["一句观察", "一句反问", "一句判断"],
    length: "3-4 句",
    notes: ["适合 AI Doubt Notes。短、刺、有事实。", "第一周先不发 Grudging Admit。"],
    resources: [
      {
        id: "t3-web",
        title: "AI Doubt 短帖模板页",
        kind: "web",
        url: "https://visiontree.example/templates/ai-doubt",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "把 AI 效率叙事拆成短观察和短反问。",
        highlights: ["不超过三四句话。", "评论更短。", "有事实，不靠愤怒。"]
      },
      {
        id: "t3-pdf",
        title: "AI Doubt 语气检查 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/ai-doubt-template.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "避免恐吓、阴谋论和纯情绪。",
        highlights: ["冷静。", "刺。", "不是恐慌。"]
      }
    ]
  },
  {
    id: "t4",
    title: "工程取舍短帖",
    format: "Build Note",
    channels: ["X"],
    hook: "我们面临了两个选项，最后选了更保留判断的那个。",
    structure: ["真实问题", "两个选项", "最终选择", "为什么"],
    length: "4-6 句",
    notes: ["适合 Milo Reed。写真实取舍，不写发布公告。", "评论要像工程师对工程师说话。"],
    resources: [
      {
        id: "t4-web",
        title: "Milo 工程取舍模板页",
        kind: "web",
        url: "https://visiontree.example/templates/milo-build-note",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "把产品建设中的真实技术选择整理为短帖。",
        highlights: ["选项必须具体。", "判断理由要清楚。", "避免宏大表述。"]
      },
      {
        id: "t4-pdf",
        title: "工程取舍短帖 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/milo-template.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "辅助检查短帖是否像真实工程记录。",
        highlights: ["问题。", "选项。", "取舍。"]
      }
    ]
  },
  {
    id: "t5",
    title: "普通人真实试用日记",
    format: "Diary Note",
    channels: ["X"],
    hook: "我没完全看懂，但这个感受是真的。",
    structure: ["今天用了什么", "哪里卡住", "哪里有帮助", "留下什么不确定"],
    length: "3-6 句",
    notes: ["适合 Nora Blake。不要做评测。", "可以承认不懂，也可以承认不确定。"],
    resources: [
      {
        id: "t5-web",
        title: "Nora 试用日记模板页",
        kind: "web",
        url: "https://visiontree.example/templates/nora-diary",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "把普通人的 AI 工具体验写得真实而不装懂。",
        highlights: ["我也是普通人。", "我也有这个困惑。", "不是工具评测。"]
      },
      {
        id: "t5-pdf",
        title: "Nora 试用日记 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/nora-template.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "保留困惑、不确定和日常语气。",
        highlights: ["真实。", "日常。", "不装懂。"]
      }
    ]
  },
  {
    id: "t6",
    title: "树的独白图文",
    format: "Tree Monologue",
    channels: ["X"],
    hook: "Today I grew a new leaf. It is called first principles thinking.",
    structure: ["树的动作", "一个思维模型", "树的隐喻", "一张图"],
    length: "1 图 + 1-3 句",
    notes: ["适合 The Thinking Tree。不是卖萌，是一棵树平静地观察人类。", "视觉可以是发芽、年轮、根系或被风吹弯。"],
    resources: [
      {
        id: "t6-web",
        title: "树的独白模板页",
        kind: "web",
        url: "https://visiontree.example/templates/thinking-tree",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "把思维模型翻译成树的语言。",
        highlights: ["思维模型是养分。", "判断力是年轮。", "认知偏差是害虫。"]
      },
      {
        id: "t6-pdf",
        title: "The Thinking Tree 视觉模板 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/tree-template.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "AI 作图方向和树的独白写法。",
        highlights: ["发芽。", "根系。", "年轮截面。"]
      }
    ]
  },
  {
    id: "t7",
    title: "官方对比式品类定义",
    format: "Category Definition",
    channels: ["X"],
    hook: "VisionTree is not here to think for you. It is here to keep you in the act of thinking.",
    structure: ["不是什么", "是什么", "为什么重要", "转发矩阵账号"],
    length: "4-7 句",
    notes: ["适合官方号 VisionTree。第一周 3-4 条就够。", "官方号负责收拢叙事，不抢其他账号的戏。"],
    resources: [
      {
        id: "t7-web",
        title: "官方号品类定义模板页",
        kind: "web",
        url: "https://visiontree.example/templates/official-category",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "用对比式写法解释 VisionTree 不是什么、是什么。",
        highlights: ["不是普通效率工具。", "不是自动替你思考。", "是认知增强项目。"]
      },
      {
        id: "t7-pdf",
        title: "VisionTree 官方帖检查表 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/official-template.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "保证官方文案清楚、克制、收拢叙事。",
        highlights: ["不追自己出圈。", "转发质量最高的矩阵内容。", "补一两句评论。"]
      }
    ]
  }
];

const visionTreeContents = [
  ["c1", "Sunk cost is not about money", "X", "已发布", "a1", "t1", "Thinking Lab", "2026-05-11T08:30:00+08:00", "2026-05-11", "10:00", "2026-05-11T10:05:00+08:00", 12800, 620, 74, 41, 390],
  ["c2", "AI did not save your thinking. It moved the judgment out of sight.", "X", "已发布", "a3", "t3", "AI Doubt Notes", "2026-05-11T11:20:00+08:00", "2026-05-11", "12:30", "2026-05-11T12:32:00+08:00", 9400, 510, 63, 38, 221],
  ["c3", "为什么我们没有做一键自动判断", "X", "草稿", "a4", "t4", "Milo Reed", "2026-05-12T09:40:00+08:00", "2026-05-12", "18:00", null, 0, 0, 0, 0, 0],
  ["c4", "Today I grew a new leaf. It is called first principles thinking.", "X", "草稿", "a6", "t6", "The Thinking Tree", "2026-05-12T14:10:00+08:00", "2026-05-13", "09:20", null, 0, 0, 0, 0, 0],
  ["c5", "VisionTree is not an autopilot for thinking.", "X", "已排期", "a7", "t7", "VisionTree", "2026-05-12T16:25:00+08:00", "2026-05-13", "20:30", null, 0, 0, 0, 0, 0]
];

const visionTreePlans = [
  ["p1", "2026-05-11", "周一", "10:00", "X", "Thinking Lab：沉没成本图解", "Thinking Lab", "建立视觉第一印象", "已完成", "c1"],
  ["p2", "2026-05-12", "周二", "10:00", "X", "Thinking Lab：第一个两分钟实验", "Thinking Lab", "引导回复", "制作中", null],
  ["p3", "2026-05-13", "周三", "10:00", "X", "Thinking Lab：AI 答案 vs 保留判断", "Thinking Lab", "形成置顶内容", "待领取", null],
  ["p4", "2026-05-14", "周四", "11:00", "X", "Thinking Lab：决策方式投票", "Thinking Lab", "带来回复", "待领取", null],
  ["p5", "2026-05-15", "周五", "10:30", "X", "Thinking Lab：Eli 概念卡", "Thinking Lab", "连接矩阵账号", "待领取", null],
  ["p6", "2026-05-11", "周一", "16:00", "X", "Eli：月度概念词第一帖", "Eli Rowan", "建立慢思考调性", "待领取", null],
  ["p7", "2026-05-11", "周一", "12:30", "X", "AI Doubt：反 AI 短帖", "AI Doubt Notes", "铺批判底色", "已完成", "c2"],
  ["p8", "2026-05-12", "周二", "18:00", "X", "Milo：真实技术取舍", "Milo Reed", "建立工程可信度", "制作中", "c3"],
  ["p9", "2026-05-12", "周二", "20:00", "X", "Nora：真实 AI 工具试用", "Nora Blake", "降低普通人门槛", "待领取", null],
  ["p10", "2026-05-13", "周三", "09:20", "X", "The Thinking Tree：第一片新叶", "The Thinking Tree", "建立记忆点", "制作中", "c4"],
  ["p11", "2026-05-13", "周三", "20:30", "X", "VisionTree：第一条品类定义", "VisionTree", "收拢官方叙事", "待发布", "c5"]
];

const visionTreeActivities = [
  ["act1", "c1", "数据同步", "周一沉没成本图解已发布，收藏集中来自模型图。", "10:45", "2026-05-11T10:45:00+08:00"],
  ["act2", "c1", "评论记录", "在相关大号评论区贴图并补一句解释，没有自我介绍。", "11:20", "2026-05-11T11:20:00+08:00"],
  ["act3", "c2", "数据同步", "AI Doubt 第一条短帖建立了短、刺、有事实的语气。", "13:10", "2026-05-11T13:10:00+08:00"],
  ["act4", "c3", "状态更新", "Milo 工程取舍帖已进入内容池，等待补充真实选项细节。", "09:40", "2026-05-12T09:40:00+08:00"],
  ["act5", "c4", "状态更新", "The Thinking Tree 首条独白已准备配图方向：新叶与根系。", "14:10", "2026-05-12T14:10:00+08:00"],
  ["act6", "c5", "状态更新", "官方号第一条品类定义帖已排期，用对比式写法定调。", "16:25", "2026-05-12T16:25:00+08:00"]
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
    ["Lena", "Eli Rowan"],
    ["Thinking in Frames", "Thinking Lab"],
    ["The Decision Lab", "Thinking Lab"],
    ["Decision Lab", "Thinking Lab"]
  ];
  ownerMap.forEach(([from, to]) => {
    db.prepare("UPDATE contents SET owner = ? WHERE owner = ?").run(to, from);
    db.prepare("UPDATE plans SET owner = ? WHERE owner = ?").run(to, from);
    db.prepare("UPDATE assets SET owner = ? WHERE owner = ?").run(to, from);
  });
}

function syncVisionTreeDemoData() {
  pruneLegacyVisionTreeMaterial();

  const upsertAsset = db.prepare(`
    INSERT INTO assets
      (id, title, theme, source, format, freshness, score, tags_json, summary, owner, palette, notes_json, resources_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      theme = excluded.theme,
      source = excluded.source,
      format = excluded.format,
      freshness = excluded.freshness,
      score = excluded.score,
      tags_json = excluded.tags_json,
      summary = excluded.summary,
      owner = excluded.owner,
      palette = excluded.palette,
      notes_json = excluded.notes_json,
      resources_json = excluded.resources_json
  `);
  const shouldSeedLegacyMaterial = db.prepare("SELECT COUNT(*) AS count FROM assets WHERE source LIKE 'IMA VT素材库%'").get().count === 0;
  if (shouldSeedLegacyMaterial) {
    visionTreeAssets.forEach((asset) =>
      upsertAsset.run(
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
  }

  const upsertTemplate = db.prepare(`
    INSERT INTO templates
      (id, title, format, channels_json, structure_json, hook, length, notes_json, resources_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      format = excluded.format,
      channels_json = excluded.channels_json,
      structure_json = excluded.structure_json,
      hook = excluded.hook,
      length = excluded.length,
      notes_json = excluded.notes_json,
      resources_json = excluded.resources_json
  `);
  visionTreeTemplates.forEach((template) =>
    upsertTemplate.run(
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

  const upsertContent = db.prepare(`
    INSERT INTO contents
      (id, title, channel, status, asset_id, template_id, owner, saved_at, scheduled_date, scheduled_time,
       published_at, views, likes, comments, shares, saves)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      channel = excluded.channel,
      status = excluded.status,
      asset_id = excluded.asset_id,
      template_id = excluded.template_id,
      owner = excluded.owner,
      saved_at = excluded.saved_at,
      scheduled_date = excluded.scheduled_date,
      scheduled_time = excluded.scheduled_time,
      published_at = excluded.published_at,
      views = excluded.views,
      likes = excluded.likes,
      comments = excluded.comments,
      shares = excluded.shares,
      saves = excluded.saves
  `);
  if (shouldSeedLegacyMaterial) {
    visionTreeContents.forEach((row) => upsertContent.run(...row));
  }

  const upsertPlan = db.prepare(`
    INSERT INTO plans (id, date, day, slot, channel, theme, owner, goal, status, content_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      date = excluded.date,
      day = excluded.day,
      slot = excluded.slot,
      channel = excluded.channel,
      theme = excluded.theme,
      owner = excluded.owner,
      goal = excluded.goal,
      status = excluded.status,
      content_id = excluded.content_id
  `);
  if (shouldSeedLegacyMaterial) {
    visionTreePlans.forEach((row) => upsertPlan.run(...row));
  }

  const upsertActivity = db.prepare(`
    INSERT INTO activities (id, content_id, type, note, time_label, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      content_id = excluded.content_id,
      type = excluded.type,
      note = excluded.note,
      time_label = excluded.time_label,
      created_at = excluded.created_at
  `);
  if (shouldSeedLegacyMaterial) {
    visionTreeActivities.forEach((row) => upsertActivity.run(...row));
  }
}

function pruneLegacyVisionTreeMaterial() {
  const legacyAssetIds = visionTreeAssets.map((asset) => asset.id);
  if (!legacyAssetIds.length) return;

  const placeholders = legacyAssetIds.map(() => "?").join(", ");
  const legacyContentIds = db
    .prepare(`SELECT id FROM contents WHERE asset_id IN (${placeholders})`)
    .all(...legacyAssetIds)
    .map((row) => row.id);

  if (legacyContentIds.length) {
    const contentPlaceholders = legacyContentIds.map(() => "?").join(", ");
    db.prepare(`UPDATE plans SET content_id = NULL WHERE content_id IN (${contentPlaceholders})`).run(...legacyContentIds);
    db.prepare(`DELETE FROM activities WHERE content_id IN (${contentPlaceholders})`).run(...legacyContentIds);
    db.prepare(`DELETE FROM contents WHERE id IN (${contentPlaceholders})`).run(...legacyContentIds);
  }

  db.prepare(`DELETE FROM assets WHERE id IN (${placeholders})`).run(...legacyAssetIds);
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
  const templates = visionTreeTemplates;
  const contents = visionTreeContents;
  const plans = visionTreePlans;
  const activities = visionTreeActivities;

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
