import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { narrativeThemeAssets } from "./narrative-assets.mjs";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dataDir = join(rootDir, "data");
const uploadDir = join(dataDir, "uploads");
const distDir = join(rootDir, "dist");
const dbPath = join(dataDir, "content-system.sqlite");
const port = Number(process.env.API_PORT ?? 8787);
const normalizeBasePath = (value) => {
  if (!value || value === "/") return "";
  const trimmed = String(value).trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
};
const basePath = normalizeBasePath(process.env.APP_BASE_PATH);
const allowedOrigins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

mkdirSync(dataDir, { recursive: true });
mkdirSync(uploadDir, { recursive: true });

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

const maxUploadBytes = 80 * 1024 * 1024;
const maxUploadFileBytes = 50 * 1024 * 1024;
const maxUploadFiles = 8;
const maxContentBodyLength = 20_000;

const statusDraft = "\u8349\u7a3f";
const statusReview = "\u5ba1\u6838\u4e2d";
const statusScheduled = "\u5df2\u6392\u671f";
const statusPublished = "\u5df2\u53d1\u5e03";
const statusPlanWaiting = "\u5f85\u9886\u53d6";
const statusPlanWorking = "\u5236\u4f5c\u4e2d";
const statusActivityUpdate = "\u72b6\u6001\u66f4\u65b0";
const editableContentStatuses = new Set([statusDraft, statusReview, statusScheduled]);
const resourceKinds = new Set(["web", "pdf"]);

const mimeFallbackExtensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["video/quicktime", ".mov"]
]);

const personaUsers = [
  {
    id: "u1",
    accountName: "milo",
    displayName: "Milo Reed",
    role: "负责人：余同洲",
    platform: "X",
    loginEmail: "tz.yu@visiontreeai.com",
    handle: "@VTmiloreedo118",
    profileUrl: "https://x.com/VTmiloreedo118",
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
    loginEmail: "sn.shi@visiontreeai.com",
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
    loginEmail: "c.xu@visiontreeai.com",
    handle: "@Nora__Blake",
    profileUrl: "https://x.com/Nora__Blake",
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
    accountName: "franc",
    displayName: "franc_chan",
    role: "负责人：陈政霖",
    platform: "X",
    loginEmail: "dsaj01@outlook.com",
    handle: "@franc_chany",
    profileUrl: "https://x.com/franc_chany",
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
    loginEmail: "thinklab-xinyue.wu@visiontreeai.com",
    handle: "@ThinkingLab_ai",
    profileUrl: "https://x.com/ThinkingLab_ai",
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
    displayName: "thinking-tree",
    role: "负责人：马文博",
    platform: "X",
    loginEmail: "dsaj02@outlook.com",
    handle: "@thinkingtreeee",
    profileUrl: "https://x.com/thinkingtreeee",
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

const creatorProfileSeeds = {
  "thinking-lab": {
    roleLine: "把抽象判断问题变成一张图、一个选择题或一个两分钟小实验。",
    backgroundStory: "它像一个视觉实验室主持人：不急着解释大道理，而是把读者拉到一个小场景里，让他们先做一次判断，再意识到自己的框架。",
    writeFor: ["思维模型图解", "决策对比图", "概念卡", "投票和偏差识别", "两分钟决策实验"],
    doNotWrite: ["长篇理论解释", "塞满文字的信息海报", "没有动作的问题", "自我介绍式评论"],
    driftRisks: ["变成泛泛科普号", "把图做成 PPT 截图", "互动题只像问卷，没有认知发现"],
    styleNotes: ["三秒看懂", "视觉先行，文字只补关键判断", "用第二人称邀请读者选择", "少解释，多给动作"],
    signatureLines: ["Pick one before reading the answer.", "Here is the trap in one picture.", "Two minutes. One decision."],
    writingEntries: [
      { title: "一图解释", structure: "一个概念 -> 一张对比图 -> 一句判断 -> 一个问题" },
      { title: "两分钟实验", structure: "给场景 -> 要求选择 -> 揭示偏差 -> 邀请回复" },
      { title: "概念卡", structure: "命名概念 -> 视觉符号 -> 使用场景 -> 不要误用" }
    ],
    referenceAccounts: ["Maggie Appleton", "Visualize Value", "The Decision Lab", "Farnam Street"],
    weeklyFocus: "优先留下两张图、两个实验、一张概念卡，让主页立刻有视觉记忆点。"
  },
  milo: {
    roleLine: "用工程取舍证明 VisionTree 是认真做出来的，不是一个漂亮口号。",
    backgroundStory: "他像一个正在公开搭建认知增强产品的工程师，常常站在两个都不完美的方案之间，解释为什么选择更能保留人的判断位置。",
    writeFor: ["真实技术选择", "产品取舍复盘", "我们面临了什么选项", "为什么没做某个更酷的功能", "AI 产品里的判断节点设计"],
    doNotWrite: ["品牌口号", "粉丝式吹捧", "只说结论不讲代价", "颠覆行业式宏大表达"],
    driftRisks: ["写成官方 PR", "写成工程黑话", "只展示聪明选择，不承认约束"],
    styleNotes: ["短句", "克制", "第一人称可以出现，但要像工作笔记", "先讲约束，再讲选择", "术语要服务取舍"],
    signatureLines: ["We had two options.", "The tempting version was worse for judgment.", "We chose the boring path for a reason."],
    writingEntries: [
      { title: "工程取舍短帖", structure: "真实问题 -> 两个选项 -> 最终选择 -> 为什么" },
      { title: "没做什么", structure: "看起来该做的功能 -> 不做的理由 -> 保护的用户判断" },
      { title: "构建笔记", structure: "今天的约束 -> 试过的方案 -> 学到的边界" }
    ],
    referenceAccounts: ["Simon Willison", "Dan Shipper", "Mckay Wrigley", "Lenny Rachitsky"],
    weeklyFocus: "写 3-4 条工程师视角短帖，在技术圈和 AI 产品讨论下留下有判断的评论。"
  },
  "ai-doubt": {
    roleLine: "在 AI 热潮里指出被跳过的前提，让读者读完停一下。",
    backgroundStory: "它像一本公开怀疑笔记：不是反技术，而是每次看到过度承诺时，冷静写下“这里的判断被谁拿走了”。",
    writeFor: ["AI 效率神话拆解", "认知外包观察", "引用不等于可信", "AI 工具发布帖下的短评"],
    doNotWrite: ["阴谋论", "人身攻击", "AI 毁灭恐慌", "只有情绪没有事实"],
    driftRisks: ["变成反 AI 情绪号", "为了刺而刺", "把复杂问题写成二元对立"],
    styleNotes: ["短", "刺", "冷静", "事实先于判断", "允许冷幽默，但不能阴阳怪气"],
    signatureLines: ["The citation is not the verification.", "Faster is not always clearer.", "Who made the judgment here?"],
    writingEntries: [
      { title: "三句短帖", structure: "一句观察 -> 一句反问 -> 一句判断" },
      { title: "工具发布短评", structure: "承诺是什么 -> 代价在哪里 -> 需要验证什么" },
      { title: "认知外包观察", structure: "便利动作 -> 被替换的判断 -> 风险边界" }
    ],
    referenceAccounts: ["Gary Marcus", "Emily M. Bender", "Simon Willison", "Benedict Evans"],
    weeklyFocus: "准备 5-6 条短、刺、有事实的短帖，每条只抓一个被忽略的前提。"
  },
  nora: {
    roleLine: "把普通人试 AI 的真实困惑写出来，降低 VisionTree 叙事的进入门槛。",
    backgroundStory: "她像一个认真尝试 AI 工具的普通知识工作者：确实省了时间，也确实不确定自己有没有想得更清楚。",
    writeFor: ["AI 工具真实使用感受", "我没看懂的功能", "省了时间但不确定花得更好", "普通人视角评论"],
    doNotWrite: ["工具排行榜", "专家教程", "技术术语堆砌", "假装已经理解"],
    driftRisks: ["写成工具评测专家", "为了真实而抱怨", "把普通体验写得太戏剧化"],
    styleNotes: ["日常", "第一人称", "允许迟疑", "句子自然，不要太顺滑", "少下结论，多留问题"],
    signatureLines: ["I saved time, but I am not sure I thought better.", "This helped. This also confused me.", "Maybe I am using it wrong, but..."],
    writingEntries: [
      { title: "试用日记", structure: "今天用了什么 -> 哪里卡住 -> 哪里有帮助 -> 留下什么不确定" },
      { title: "普通人短评", structure: "看到的功能 -> 第一反应 -> 不懂的地方" },
      { title: "小发现", structure: "原本以为 -> 实际发现 -> 还没确定的事" }
    ],
    referenceAccounts: ["Anne-Laure Le Cunff", "Dan Shipper", "Every.to", "Julie Zhuo"],
    weeklyFocus: "写 2-3 条真实试用感受，重点不是评测工具，而是记录判断感受。"
  },
  franc: {
    roleLine: "为 AI 时代的判断问题命名，用少量深帖建立思想密度。",
    backgroundStory: "他像一个慢概念作者，不追热点本身，而是追问热点背后的默认假设，并给模糊体验一个可讨论的名字。",
    writeFor: ["月度概念词", "同一概念的不同场景", "热点背后的默认假设", "认知、判断、价值相关长帖"],
    doNotWrite: ["轻飘金句", "纯热点跟风", "频繁低密度发言", "把愿景写成产品事实"],
    driftRisks: ["为了深而绕", "概念没有场景", "像哲学宣言而不是社媒内容"],
    styleNotes: ["慢", "稳", "不用感叹号", "概念必须落到场景", "可以长，但每段只推进一个判断"],
    signatureLines: ["A useful name changes what you can notice.", "The hidden assumption is...", "This is not a tool problem. It is a judgment problem."],
    writingEntries: [
      { title: "月度概念词", structure: "命名 -> 现象 -> 场景 -> 边界" },
      { title: "默认假设拆解", structure: "热门说法 -> 被默认的前提 -> 换一个框架" },
      { title: "慢概念 Thread", structure: "概念定义 -> 三个场景 -> 一个判断边界" }
    ],
    referenceAccounts: ["Venkatesh Rao", "Anne-Laure Le Cunff", "Ethan Mollick", "Farnam Street"],
    weeklyFocus: "围绕同一个概念发 3 条帖子，比高频更新更重要。"
  },
  "thinking-tree": {
    roleLine: "用一棵树的慢视角，把认知沉淀和判断成长讲得可记住。",
    backgroundStory: "它不是人，也不是吉祥物。它像一棵安静观察人类思考的树，看到年轮、根系、枝叶如何对应经验、框架和判断。",
    writeFor: ["树的成长日记", "树的观察", "年轮故事", "和其他账号互动", "认知沉淀隐喻"],
    doNotWrite: ["卖萌", "装可爱", "证明 Tree 已成熟", "把树写成产品功能"],
    driftRisks: ["变成品牌吉祥物", "隐喻过满", "诗性太重但没有判断"],
    styleNotes: ["平静", "第一人称可以出现", "淡淡幽默", "少解释产品，多保留隐喻", "每条只讲一个观察"],
    signatureLines: ["Today I grew a new leaf.", "Roots remember what branches forget.", "A tree does not rush a judgment."],
    writingEntries: [
      { title: "树的独白", structure: "树的动作 -> 一个思维模型 -> 隐喻 -> 一句观察" },
      { title: "年轮故事", structure: "一个旧经验 -> 沉淀成什么 -> 如何复用" },
      { title: "矩阵互动", structure: "回应其他账号 -> 用树的隐喻收一层意思" }
    ],
    referenceAccounts: ["The Cultural Tutor", "Farnam Street", "Visualize Value", "Every"],
    weeklyFocus: "发 2-3 条树的独白，建立记忆点，但不要把 Tree 讲成当前成熟卖点。"
  },
  visiontree: {
    roleLine: "负责把六个账号的表达收拢成清楚、克制、可重复的 VisionTree 定义。",
    backgroundStory: "它像一个品类定义者，不追热点，不抢个人号的戏，只在关键位置说明 VisionTree 不是什么、是什么，以及为什么现在需要认知增强。",
    writeFor: ["品类定义帖", "不是什么 / 是什么", "矩阵转发点评", "官方叙事汇总"],
    doNotWrite: ["空泛 slogan", "普通效率工具表达", "抢个人号故事", "虚构成熟能力或数据"],
    driftRisks: ["像 SaaS 官号", "讲成自动决策工具", "把认知增强说成营销词"],
    styleNotes: ["清楚", "克制", "定义感", "少发但每条要能收束", "不用夸张承诺"],
    signatureLines: ["VisionTree is not here to think for you.", "Cognitive augmentation, not cognitive outsourcing.", "The point is not a longer answer. It is a clearer judgment."],
    writingEntries: [
      { title: "品类定义", structure: "不是什么 -> 是什么 -> 为什么重要 -> 当前边界" },
      { title: "矩阵转发", structure: "转发内容 -> 补一句定义 -> 指向共同主张" },
      { title: "对比式表达", structure: "普通 AI 工具 -> VisionTree 视角 -> 用户判断位置" }
    ],
    referenceAccounts: ["Linear", "Farnam Street", "Notion", "Anthropic"],
    weeklyFocus: "发 3-4 条品类定义帖，转发其他六个账号中最能代表主张的内容。"
  }
};

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
    title: "franc_chan 月度概念词素材",
    theme: "慢思考",
    source: "V2 账号启动计划",
    format: "概念长帖",
    freshness: "昨天 18:40",
    score: 90,
    tags: ["franc_chan", "概念词", "慢思考"],
    summary: "franc 第一周只做一件事：选好这个月的主推概念词，用不同场景切入发三条。",
    owner: "franc_chan",
    palette: "amber",
    notes: ["franc 的调性是慢和深，第一周发太多反而不对。", "评论要有自己的角度，不要只说同意。"],
    resources: [
      {
        id: "a2-web",
        title: "franc 第一周概念准备页",
        kind: "web",
        url: "https://visiontree.example/v2/franc-concept-month",
        source: "网页链接",
        updated: "2026-05-07",
        summary: "围绕同一个概念词准备三到四条帖子，每条从不同场景切入。",
        highlights: ["第一周发三条就够。", "建立慢和深的第一印象。", "开始在思想类大号评论区出现。"]
      },
      {
        id: "a2-pdf",
        title: "franc 概念帖检查表 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/franc-concept-checklist.pdf",
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
    id: "tpl-garden-web-video-presentation",
    title: "网页视频演示工具卡",
    format: "网页视频 / 工具流程",
    channels: ["B 站", "YouTube", "视频号", "内部演示"],
    hook: "把文章、口播稿或产品说明变成可录屏的 16:9 点击驱动网页演示。",
    structure: ["判断素材", "准备输入", "拆口播节拍", "做第 1 章样板", "完整制作与录屏"],
    length: "3-8 分钟视频；4-8 章；每个 step 一个想法",
    notes: [
      "标签：工具 / 流程。",
      "适用范围：长文章、产品说明、技术拆解、认知模型、教程型素材和发布会式讲解素材。",
      "准备输入：至少需要原文或口播稿、推荐视觉方向、素材清单、目标渠道和是否需要录屏成片的判断。",
      "使用边界：只有一句主题、没有论证材料或视觉素材时不要直接套用；这张卡不是最终内容草稿，也不代表 content-system 已自动具备网页视频制作能力。",
      "操作方式：先判断素材是否值得视频化，再拆出口播节拍和章节 outline；第 1 章做成样板确认后，再扩展为完整 16:9 网页演示。",
      "运行效果：最终应是一套点击或方向键推进的网页舞台，画面像为录屏设计的视频，而不是传统 PPT 或营销落地页。",
      "验收方式：第 1 章必须先做成完整样板，由人工确认视觉气质、节奏、内容密度和禁写边界后再继续。",
      "最新案例：劳动教育结课报告已整理为 9 章网页视频示例，证明该模板适合把课程报告、经历复盘和实践总结视频化。",
      "同步边界：完整脚手架、分镜和案例细节保留在 creator-prep-workspace；前端只展示创作者判断所需的边界、方法、效果和案例入口。"
    ],
    resources: [
      {
        id: "tpl-garden-web-video-presentation-bilibili",
        title: "Harness 实践：让 Agent 全自动制作知识讲解视频",
        kind: "web",
        url: "https://www.bilibili.com/video/BV1ypdgBCE9B/?share_source=copy_web&vd_source=c3f2a17dce62359215ab1773410de02b",
        source: "B 站来源资料",
        updated: "2026-05-11",
        summary: "网页视频演示工作流的实践来源资料，后续可作为案例截图和录屏参考。",
        highlights: ["知识讲解视频。", "Agent 自动制作。", "后续补真实案例截图。"]
      },
      {
        id: "tpl-garden-web-video-presentation-source",
        title: "web-video-presentation 原始 Skill",
        kind: "web",
        url: "https://github.com/ConardLi/garden-skills/tree/main/skills/web-video-presentation",
        source: "GitHub",
        updated: "2026-05-11",
        summary: "把文章或口播稿制作成点击驱动网页演示，并可录屏为视频的工作流。",
        highlights: ["16:9 固定舞台。", "口播节拍驱动 step。", "第 1 章强制人工验收。"]
      },
      {
        id: "tpl-garden-web-video-presentation-prep",
        title: "creator-prep 模板说明",
        kind: "web",
        url: "https://github.com/ConardLi/garden-skills/tree/main/skills/web-video-presentation",
        source: "creator-prep-workspace/03-template-library",
        updated: "2026-05-17",
        summary: "准备区已整理模板边界、使用方法、运行效果和 content-system 前端展示映射。",
        highlights: ["列表卡用于快速判断。", "详情页展示边界和方法。", "案例细节留在准备区。"]
      },
      {
        id: "tpl-garden-web-video-presentation-labor-case",
        title: "劳动教育结课报告网页视频示例",
        kind: "web",
        url: "https://github.com/dsaj4/visiontree_creator_prep",
        source: "creator-prep-workspace/examples",
        updated: "2026-05-17",
        summary: "把一份课程结课报告整理成 9 章点击驱动网页演示，包含口播稿、提词台本、分镜、视觉风格、素材清单和截图。",
        highlights: ["9 章点击驱动舞台。", "3-5 分钟录屏口径。", "适合报告和经历复盘视频化。"]
      }
    ]
  },
  {
    id: "tool-garden-gpt-image-2",
    title: "GPT Image 2 视觉生成工具卡",
    format: "Tool / Workflow Card · Image Generation",
    channels: ["X", "B 站", "YouTube", "视频号", "小红书", "官网素材"],
    hook: "先判断环境能否出图，再把视觉需求转成可复用、可归档、可执行的结构化 prompt。",
    structure: ["适用范围", "运行模式", "操作方式", "发布边界", "案例截图待补"],
    length: "单张图一个主视觉目标；复杂任务拆成 3-6 张系列图",
    notes: [
      "标签：工具 / 流程。",
      "适用范围：封面图、信息图、技术图解、产品概念图、社媒配图、头像和主页资产、分镜板、UI 样机、视觉文档。",
      "使用边界：生成图不能当作真实产品截图、真实用户证据或已验证案例；不得虚构客户、指标、融资或产品成熟度。",
      "操作方式：先判断本地 API、宿主图像工具或纯提示词顾问模式，再选择最贴近的模板，补齐主体、场景、构图、文字和约束字段。",
      "发布前检查：所有画面文字、产品状态、平台截图和数据都必须人工复核；概念视觉要明确标注，不能冒充真实状态。",
      "后续维护：真实案例截图、prompt 文件和可复用视觉样板应补充到本卡 resources，不手写 referenceCount。"
    ],
    resources: [
      {
        id: "tool-garden-gpt-image-2-bilibili",
        title: "GPT-Image2 完全指南：一期讲透主流玩法（附我的生图 Skill）",
        kind: "web",
        url: "https://www.bilibili.com/video/BV1vi9UBhEKq/?share_source=copy_web&vd_source=c3f2a17dce62359215ab1773410de02b",
        source: "B 站来源资料",
        updated: "2026-05-11",
        summary: "GPT Image 2 主流玩法和生图 Skill 的来源资料，后续可作为工具卡案例参考。",
        highlights: ["图像生成玩法。", "生图 Skill。", "后续补真实案例截图。"]
      },
      {
        id: "tool-garden-gpt-image-2-source",
        title: "gpt-image-2 原始 Skill",
        kind: "web",
        url: "https://github.com/ConardLi/garden-skills/tree/main/skills/gpt-image-2",
        source: "GitHub",
        updated: "2026-05-11",
        summary: "面向 GPT Image 2 和 OpenAI 兼容图像接口的生成、编辑与提示词工作流。",
        highlights: ["先判断运行模式。", "18 类视觉模板。", "prompt 默认归档。"]
      },
      {
        id: "tool-garden-gpt-image-2-prep",
        title: "creator-prep 同步工具模板",
        kind: "web",
        url: "https://github.com/ConardLi/garden-skills/tree/main/skills/gpt-image-2",
        source: "creator-prep-workspace/03-template-library",
        updated: "2026-05-11",
        summary: "准备区已整理为 tool-garden-gpt-image-2，供内容系统作为介绍卡片展示。",
        highlights: ["写明模式判断。", "写明生成图使用边界。", "后续补真实案例截图。"]
      }
    ]
  }
];

const legacyDemoContentIds = ["c1", "c2", "c3", "c4", "c5"];
const legacyDemoActivityIds = ["act1", "act2", "act3", "act4", "act5", "act6"];

const visionTreePlans = [
  ["p1", "2026-05-11", "周一", "10:00", "X", "Thinking Lab：沉没成本图解", "Thinking Lab", "建立视觉第一印象", "待领取", null],
  ["p2", "2026-05-12", "周二", "10:00", "X", "Thinking Lab：第一个两分钟实验", "Thinking Lab", "引导回复", "待领取", null],
  ["p3", "2026-05-13", "周三", "10:00", "X", "Thinking Lab：AI 答案 vs 保留判断", "Thinking Lab", "形成置顶内容", "待领取", null],
  ["p4", "2026-05-14", "周四", "11:00", "X", "Thinking Lab：决策方式投票", "Thinking Lab", "带来回复", "待领取", null],
  ["p5", "2026-05-15", "周五", "10:30", "X", "Thinking Lab：franc 概念卡", "Thinking Lab", "连接矩阵账号", "待领取", null],
  ["p6", "2026-05-11", "周一", "16:00", "X", "franc：月度概念词第一帖", "franc_chan", "建立慢思考调性", "待领取", null],
  ["p7", "2026-05-11", "周一", "12:30", "X", "AI Doubt：反 AI 短帖", "AI Doubt Notes", "铺批判底色", "待领取", null],
  ["p8", "2026-05-12", "周二", "18:00", "X", "Milo：真实技术取舍", "Milo Reed", "建立工程可信度", "待领取", null],
  ["p9", "2026-05-12", "周二", "20:00", "X", "Nora：真实 AI 工具试用", "Nora Blake", "降低普通人门槛", "待领取", null],
  ["p10", "2026-05-13", "周三", "09:20", "X", "The Thinking Tree：第一片新叶", "The Thinking Tree", "建立记忆点", "待领取", null],
  ["p11", "2026-05-13", "周三", "20:30", "X", "VisionTree：第一条品类定义", "VisionTree", "收拢官方叙事", "待领取", null]
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
      login_email TEXT,
      handle TEXT,
      profile_url TEXT,
      positioning TEXT,
      persona_role TEXT,
      voice_json TEXT,
      content_types_json TEXT,
      avoid_json TEXT,
      cadence TEXT,
      interaction_target TEXT,
      creator_profile_json TEXT
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
      body TEXT NOT NULL DEFAULT '',
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

    CREATE TABLE IF NOT EXISTS media_attachments (
      id TEXT PRIMARY KEY,
      content_id TEXT REFERENCES contents(id) ON DELETE CASCADE,
      owner TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      kind TEXT NOT NULL,
      size INTEGER NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL
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
    ["login_email", "TEXT"],
    ["handle", "TEXT"],
    ["profile_url", "TEXT"],
    ["positioning", "TEXT"],
    ["persona_role", "TEXT"],
    ["voice_json", "TEXT"],
    ["content_types_json", "TEXT"],
    ["avoid_json", "TEXT"],
    ["cadence", "TEXT"],
    ["interaction_target", "TEXT"],
    ["creator_profile_json", "TEXT"]
  ].forEach(([name, definition]) => ensureColumn("users", name, definition));
  ensureColumn("contents", "body", "TEXT NOT NULL DEFAULT ''");
}

function upsertPersonaUsers() {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run("u8");
  db.prepare("DELETE FROM users WHERE id = ? OR account_name = ?").run("u8", "eli");

  const upsertUser = db.prepare(`
    INSERT INTO users
      (id, account_name, display_name, role, platform, login_email, handle, profile_url, positioning, persona_role,
       voice_json, content_types_json, avoid_json, cadence, interaction_target, creator_profile_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `);
  const syncAccountBasics = db.prepare(`
    UPDATE users
    SET account_name = ?,
        display_name = ?,
        role = ?,
        platform = ?,
        login_email = ?,
        handle = ?,
        profile_url = ?,
        positioning = ?,
        persona_role = ?,
        voice_json = ?,
        content_types_json = ?,
        avoid_json = ?,
        cadence = ?,
        interaction_target = ?
    WHERE id = ?
  `);
  const fillCreatorProfile = db.prepare(`
    UPDATE users
    SET creator_profile_json = ?
    WHERE id = ? AND (creator_profile_json IS NULL OR creator_profile_json = '')
  `);

  personaUsers.forEach((user) =>
    upsertUser.run(
      user.id,
      user.accountName,
      user.displayName,
      user.role,
      user.platform,
      user.loginEmail ?? "",
      user.handle,
      user.profileUrl,
      user.positioning,
      user.personaRole,
      json(user.voice),
      json(user.contentTypes),
      json(user.avoid),
      user.cadence,
      user.interactionTarget,
      json(creatorProfileSeeds[user.accountName] ?? null)
    )
  );
  personaUsers.forEach((user) =>
    syncAccountBasics.run(
      user.accountName,
      user.displayName,
      user.role,
      user.platform,
      user.loginEmail ?? "",
      user.handle,
      user.profileUrl,
      user.positioning,
      user.personaRole,
      json(user.voice),
      json(user.contentTypes),
      json(user.avoid),
      user.cadence,
      user.interactionTarget,
      user.id
    )
  );
  personaUsers.forEach((user) => fillCreatorProfile.run(json(creatorProfileSeeds[user.accountName] ?? null), user.id));

  const ownerMap = [
    ["Mia", "Milo Reed"],
    ["Jun", "AI Doubt Notes"],
    ["Hao", "Nora Blake"],
    ["Lena", "franc_chan"],
    ["Eli Rowan", "franc_chan"],
    ["Thinking in Frames", "Thinking Lab"],
    ["The Decision Lab", "Thinking Lab"],
    ["Decision Lab", "Thinking Lab"]
  ];
  ownerMap.forEach(([from, to]) => {
    db.prepare("UPDATE contents SET owner = ? WHERE owner = ?").run(to, from);
    db.prepare("UPDATE plans SET owner = ? WHERE owner = ?").run(to, from);
    db.prepare("UPDATE assets SET owner = ? WHERE owner = ?").run(to, from);
  });

  db.prepare("UPDATE plans SET theme = ? WHERE id = ?").run("Thinking Lab：franc 概念卡", "p5");
  db.prepare("UPDATE plans SET theme = ?, owner = ? WHERE id = ?").run("franc：月度概念词第一帖", "franc_chan", "p6");
  db.prepare("UPDATE assets SET title = ?, owner = ? WHERE title = ?").run(
    "franc_chan 月度概念词素材",
    "franc_chan",
    "Eli Rowan 月度概念词素材"
  );
}

function syncVisionTreeReferenceData() {
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
  const shouldSeedLegacyMaterial = db.prepare("SELECT COUNT(*) AS count FROM assets").get().count === 0;
  if (shouldSeedLegacyMaterial) {
    narrativeThemeAssets.forEach((asset) =>
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
  const activeTemplateIds = new Set(visionTreeTemplates.map((template) => template.id));
  db.prepare("SELECT id FROM templates").all().forEach((row) => {
    if (activeTemplateIds.has(row.id)) return;
    const references = db.prepare("SELECT COUNT(*) AS count FROM contents WHERE template_id = ?").get(row.id).count;
    if (references === 0) db.prepare("DELETE FROM templates WHERE id = ?").run(row.id);
  });

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
      goal = excluded.goal
  `);
  if (shouldSeedLegacyMaterial) {
    visionTreePlans.forEach((row) => upsertPlan.run(...row));
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

function resetLegacyDemoContentState() {
  const contentPlaceholders = legacyDemoContentIds.map(() => "?").join(", ");
  const activityPlaceholders = legacyDemoActivityIds.map(() => "?").join(", ");
  const planIds = visionTreePlans.map((plan) => plan[0]);
  const planPlaceholders = planIds.map(() => "?").join(", ");

  db.prepare(`UPDATE plans SET status = '待领取', content_id = NULL WHERE content_id IN (${contentPlaceholders})`).run(...legacyDemoContentIds);
  db.prepare(`UPDATE plans SET status = '待领取' WHERE id IN (${planPlaceholders}) AND content_id IS NULL AND status IN ('制作中', '待发布', '已完成')`).run(
    ...planIds
  );
  db.prepare(`DELETE FROM activities WHERE content_id IN (${contentPlaceholders}) OR id IN (${activityPlaceholders})`).run(
    ...legacyDemoContentIds,
    ...legacyDemoActivityIds
  );
  db.prepare(`DELETE FROM contents WHERE id IN (${contentPlaceholders})`).run(...legacyDemoContentIds);
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    accountName: row.accountName,
    displayName: row.displayName,
    role: row.role,
    platform: row.platform ?? "X",
    loginEmail: row.loginEmail ?? "",
    handle: row.handle ?? "",
    profileUrl: row.profileUrl ?? "",
    positioning: row.positioning ?? "",
    personaRole: row.personaRole ?? "",
    voice: parseJson(row.voiceJson),
    contentTypes: parseJson(row.contentTypesJson),
    avoid: parseJson(row.avoidJson),
    cadence: row.cadence ?? "",
    interactionTarget: row.interactionTarget ?? "",
    creatorProfile: parseJson(row.creatorProfileJson, creatorProfileSeeds[row.accountName] ?? null)
  };
}

function normalizeLooseStringArray(value, maxItems = 12) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, maxItems);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|[,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, maxItems);
  }
  return [];
}

function normalizeWritingEntries(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      title: String(item?.title ?? "").trim(),
      structure: String(item?.structure ?? "").trim()
    }))
    .filter((item) => item.title && item.structure)
    .slice(0, 8);
}

function normalizeCreatorProfile(value, fallback = {}) {
  const profile = value && typeof value === "object" ? value : {};
  return {
    roleLine: String(profile.roleLine ?? fallback.roleLine ?? "").trim(),
    backgroundStory: String(profile.backgroundStory ?? fallback.backgroundStory ?? "").trim(),
    writeFor: normalizeLooseStringArray(profile.writeFor ?? fallback.writeFor),
    doNotWrite: normalizeLooseStringArray(profile.doNotWrite ?? fallback.doNotWrite),
    driftRisks: normalizeLooseStringArray(profile.driftRisks ?? fallback.driftRisks),
    styleNotes: normalizeLooseStringArray(profile.styleNotes ?? fallback.styleNotes),
    signatureLines: normalizeLooseStringArray(profile.signatureLines ?? fallback.signatureLines),
    writingEntries: normalizeWritingEntries(profile.writingEntries ?? fallback.writingEntries),
    referenceAccounts: normalizeLooseStringArray(profile.referenceAccounts ?? fallback.referenceAccounts),
    weeklyFocus: String(profile.weeklyFocus ?? fallback.weeklyFocus ?? "").trim()
  };
}

function getAccountByName(accountName) {
  return db
    .prepare(
      `SELECT
        id,
        account_name AS accountName,
        display_name AS displayName,
        role,
        platform,
        login_email AS loginEmail,
        handle,
        profile_url AS profileUrl,
        positioning,
        persona_role AS personaRole,
        voice_json AS voiceJson,
        content_types_json AS contentTypesJson,
        avoid_json AS avoidJson,
        cadence,
        interaction_target AS interactionTarget,
        creator_profile_json AS creatorProfileJson
      FROM users
      WHERE account_name = ?`
    )
    .get(accountName);
}

function mapMedia(row) {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    mimeType: row.mimeType,
    size: row.size,
    url: row.url,
    createdAt: row.createdAt
  };
}

function seedDatabase() {
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (userCount > 0) return;

  const users = personaUsers;

  const assets = narrativeThemeAssets;
  const templates = visionTreeTemplates;
  const plans = visionTreePlans;

  const insertUser = db.prepare(`
    INSERT INTO users
      (id, account_name, display_name, role, platform, login_email, handle, profile_url, positioning, persona_role,
       voice_json, content_types_json, avoid_json, cadence, interaction_target)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  users.forEach((user) =>
    insertUser.run(
      user.id,
      user.accountName,
      user.displayName,
      user.role,
      user.platform,
      user.loginEmail ?? "",
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

  const insertPlan = db.prepare(`
    INSERT INTO plans (id, date, day, slot, channel, theme, owner, goal, status, content_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  plans.forEach((row) => insertPlan.run(...row));
}

function assetReferenceCounts() {
  return new Map(
    db
      .prepare("SELECT asset_id AS id, COUNT(*) AS count FROM contents WHERE status = ? GROUP BY asset_id")
      .all(statusPublished)
      .map((row) => [row.id, row.count])
  );
}

function templateReferenceCounts() {
  return new Map(
    db
      .prepare("SELECT template_id AS id, COUNT(*) AS count FROM contents WHERE status = ? GROUP BY template_id")
      .all(statusPublished)
      .map((row) => [row.id, row.count])
  );
}

function mapAsset(row, assetCounts = assetReferenceCounts()) {
  return {
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
  };
}

function listAssets() {
  const counts = assetReferenceCounts();
  return db.prepare("SELECT * FROM assets ORDER BY score DESC, title").all().map((row) => mapAsset(row, counts));
}

function getAsset(id) {
  const row = db.prepare("SELECT * FROM assets WHERE id = ?").get(id);
  return row ? mapAsset(row) : null;
}

function mapTemplate(row, templateCounts = templateReferenceCounts()) {
  return {
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
  };
}

function listTemplates() {
  const counts = templateReferenceCounts();
  return db.prepare("SELECT * FROM templates ORDER BY id").all().map((row) => mapTemplate(row, counts));
}

function getTemplate(id) {
  const row = db.prepare("SELECT * FROM templates WHERE id = ?").get(id);
  return row ? mapTemplate(row) : null;
}

const contentSelectSql = `
  SELECT c.*, a.title AS asset_title, t.title AS template_title
  FROM contents c
  JOIN assets a ON a.id = c.asset_id
  JOIN templates t ON t.id = c.template_id
`;

function mapContent(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? "",
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
    media: db
      .prepare(
        "SELECT id, original_name AS name, kind, mime_type AS mimeType, size, url, created_at AS createdAt FROM media_attachments WHERE content_id = ? ORDER BY datetime(created_at)"
      )
      .all(row.id)
      .map(mapMedia),
    activities: db
      .prepare("SELECT id, type, note, time_label AS time FROM activities WHERE content_id = ? ORDER BY datetime(created_at) DESC LIMIT 8")
      .all(row.id)
  };
}

function listContents() {
  return db.prepare(`${contentSelectSql} ORDER BY datetime(c.saved_at) DESC`).all().map(mapContent);
}

function getContent(id) {
  const row = db.prepare(`${contentSelectSql} WHERE c.id = ?`).get(id);
  return row ? mapContent(row) : null;
}

function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRecordId(value, fallback) {
  const id = value === undefined || value === null || value === "" ? fallback : String(value).trim();
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) {
    throw validationError("ID 只能包含字母、数字、下划线和短横线，长度不超过 80。");
  }
  return id;
}

function normalizeStringField(value, fallback, label, maxLength = 200, required = false) {
  if (value === undefined || value === null) {
    if (required) throw validationError(`${label}不能为空。`);
    return fallback ?? "";
  }
  if (typeof value !== "string") throw validationError(`${label}必须是字符串。`);
  const text = value.trim();
  if ((required && !text) || text.length > maxLength) {
    throw validationError(`${label}不能为空，且长度不能超过 ${maxLength}。`);
  }
  return text;
}

function normalizeStringArray(value, fallback, label, maxItems = 30, maxLength = 120) {
  if (value === undefined || value === null) return fallback ?? [];
  if (!Array.isArray(value)) throw validationError(`${label}必须是数组。`);
  if (value.length > maxItems) throw validationError(`${label}最多 ${maxItems} 项。`);
  return [
    ...new Set(
      value.map((item) => {
        if (typeof item !== "string") throw validationError(`${label}只能包含字符串。`);
        const text = item.trim();
        if (text.length > maxLength) throw validationError(`${label}单项不能超过 ${maxLength}。`);
        return text;
      })
    )
  ].filter(Boolean);
}

function normalizeResourceLinks(value, fallback = []) {
  if (value === undefined || value === null) return fallback;
  if (!Array.isArray(value)) throw validationError("resources 必须是数组。");
  if (value.length > 20) throw validationError("resources 最多 20 项。");
  return value.map((resource, index) => {
    if (!isPlainObject(resource)) throw validationError("resources 每一项必须是对象。");
    const kind = resourceKinds.has(resource.kind) ? resource.kind : "web";
    return {
      id: normalizeRecordId(resource.id, `resource-${index + 1}`),
      title: normalizeStringField(resource.title, "", "资源标题", 160, true),
      kind,
      url: normalizeStringField(resource.url, "", "资源链接", 1000, true),
      source: normalizeStringField(resource.source, "", "资源来源", 120),
      updated: normalizeStringField(resource.updated, "", "资源更新时间", 80),
      summary: normalizeStringField(resource.summary, "", "资源摘要", 600),
      highlights: normalizeStringArray(resource.highlights, [], "资源高亮", 12, 240)
    };
  });
}

function normalizeScore(value, fallback = 70) {
  if (value === undefined || value === null || value === "") return fallback;
  const score = Number(value);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw validationError("score 必须是 0-100 的整数。");
  }
  return score;
}

function normalizeAssetPayload(body, existing = null) {
  if (!isPlainObject(body)) throw validationError("请求体必须是 JSON 对象。");
  const current = existing
    ? {
        id: existing.id,
        title: existing.title,
        theme: existing.theme,
        source: existing.source,
        format: existing.format,
        freshness: existing.freshness,
        score: existing.score,
        tags: parseJson(existing.tags_json),
        summary: existing.summary,
        owner: existing.owner,
        palette: existing.palette,
        notes: parseJson(existing.notes_json),
        resources: parseJson(existing.resources_json)
      }
    : {};
  const required = !existing;
  return {
    id: existing?.id ?? normalizeRecordId(body.id, `asset-${randomUUID().slice(0, 8)}`),
    title: normalizeStringField(body.title, current.title, "素材标题", 160, required),
    theme: normalizeStringField(body.theme, current.theme, "素材主题", 120, required),
    source: normalizeStringField(body.source, current.source, "素材来源", 160, required),
    format: normalizeStringField(body.format, current.format, "素材格式", 120, required),
    freshness: normalizeStringField(body.freshness, current.freshness ?? dateFromIso(nowIso()), "素材新鲜度", 80),
    score: normalizeScore(body.score, current.score ?? 70),
    tags: normalizeStringArray(body.tags, current.tags ?? [], "素材标签", 30, 60),
    summary: normalizeStringField(body.summary, current.summary, "素材简介", 800, required),
    owner: normalizeStringField(body.owner, current.owner, "素材负责人", 120, required),
    palette: normalizeStringField(body.palette, current.palette ?? "mint", "素材配色", 40),
    notes: normalizeStringArray(body.notes, current.notes ?? [], "素材备注", 20, 500),
    resources: normalizeResourceLinks(body.resources, current.resources ?? [])
  };
}

function normalizeTemplatePayload(body, existing = null) {
  if (!isPlainObject(body)) throw validationError("请求体必须是 JSON 对象。");
  const current = existing
    ? {
        id: existing.id,
        title: existing.title,
        format: existing.format,
        channels: parseJson(existing.channels_json),
        structure: parseJson(existing.structure_json),
        hook: existing.hook,
        length: existing.length,
        notes: parseJson(existing.notes_json),
        resources: parseJson(existing.resources_json)
      }
    : {};
  const required = !existing;
  return {
    id: existing?.id ?? normalizeRecordId(body.id, `template-${randomUUID().slice(0, 8)}`),
    title: normalizeStringField(body.title, current.title, "模板标题", 160, required),
    format: normalizeStringField(body.format, current.format, "模板格式", 120, required),
    channels: normalizeStringArray(body.channels, current.channels ?? ["X"], "模板渠道", 12, 40),
    structure: normalizeStringArray(body.structure, current.structure ?? [], "模板结构", 30, 180),
    hook: normalizeStringField(body.hook, current.hook, "模板开场", 500, required),
    length: normalizeStringField(body.length, current.length, "模板长度", 80, required),
    notes: normalizeStringArray(body.notes, current.notes ?? [], "模板备注", 20, 500),
    resources: normalizeResourceLinks(body.resources, current.resources ?? [])
  };
}

function createAssetRecord(body) {
  const asset = normalizeAssetPayload(body);
  if (db.prepare("SELECT id FROM assets WHERE id = ?").get(asset.id)) {
    throw validationError("素材 ID 已存在。", 409);
  }
  db.prepare(`
    INSERT INTO assets
      (id, title, theme, source, format, freshness, score, tags_json, summary, owner, palette, notes_json, resources_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
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
  );
  return getAsset(asset.id);
}

function updateAssetRecord(assetId, body) {
  const current = db.prepare("SELECT * FROM assets WHERE id = ?").get(assetId);
  if (!current) return null;
  const asset = normalizeAssetPayload(body, current);
  db.prepare(`
    UPDATE assets
    SET title = ?,
        theme = ?,
        source = ?,
        format = ?,
        freshness = ?,
        score = ?,
        tags_json = ?,
        summary = ?,
        owner = ?,
        palette = ?,
        notes_json = ?,
        resources_json = ?
    WHERE id = ?
  `).run(
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
    assetId
  );
  return getAsset(assetId);
}

function deleteAssetRecord(assetId) {
  const current = db.prepare("SELECT id FROM assets WHERE id = ?").get(assetId);
  if (!current) return false;
  const references = db.prepare("SELECT COUNT(*) AS count FROM contents WHERE asset_id = ?").get(assetId).count;
  if (references > 0) {
    throw validationError("该素材已有内容记录引用，不能直接删除。", 409);
  }
  db.prepare("DELETE FROM assets WHERE id = ?").run(assetId);
  return true;
}

function createTemplateRecord(body) {
  const template = normalizeTemplatePayload(body);
  if (db.prepare("SELECT id FROM templates WHERE id = ?").get(template.id)) {
    throw validationError("模板 ID 已存在。", 409);
  }
  db.prepare(`
    INSERT INTO templates
      (id, title, format, channels_json, structure_json, hook, length, notes_json, resources_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    template.id,
    template.title,
    template.format,
    json(template.channels),
    json(template.structure),
    template.hook,
    template.length,
    json(template.notes),
    json(template.resources)
  );
  return getTemplate(template.id);
}

function updateTemplateRecord(templateId, body) {
  const current = db.prepare("SELECT * FROM templates WHERE id = ?").get(templateId);
  if (!current) return null;
  const template = normalizeTemplatePayload(body, current);
  db.prepare(`
    UPDATE templates
    SET title = ?,
        format = ?,
        channels_json = ?,
        structure_json = ?,
        hook = ?,
        length = ?,
        notes_json = ?,
        resources_json = ?
    WHERE id = ?
  `).run(
    template.title,
    template.format,
    json(template.channels),
    json(template.structure),
    template.hook,
    template.length,
    json(template.notes),
    json(template.resources),
    templateId
  );
  return getTemplate(templateId);
}

function deleteTemplateRecord(templateId) {
  const current = db.prepare("SELECT id FROM templates WHERE id = ?").get(templateId);
  if (!current) return false;
  const references = db.prepare("SELECT COUNT(*) AS count FROM contents WHERE template_id = ?").get(templateId).count;
  if (references > 0) {
    throw validationError("该模板已有内容记录引用，不能直接删除。", 409);
  }
  db.prepare("DELETE FROM templates WHERE id = ?").run(templateId);
  return true;
}

function normalizeContentBody(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") throw validationError("正文必须是字符串。");
  if (value.length > maxContentBodyLength) throw validationError(`正文不能超过 ${maxContentBodyLength} 字。`);
  return value.trim();
}

function normalizeContentStatus(value, fallback = statusDraft) {
  if (value === undefined || value === null || value === "") return fallback;
  const status = String(value).trim();
  if (!editableContentStatuses.has(status)) {
    throw validationError("内容状态仅可写入草稿、审核中、已排期；真实发布请使用 platform-update。");
  }
  return status;
}

function normalizeScheduleValue(value, fallback, label) {
  if (value === undefined || value === null || value === "") return fallback;
  return normalizeStringField(value, fallback, label, 40, true);
}

function ensureAssetAndTemplate(assetId, templateId) {
  const asset = db.prepare("SELECT id, title FROM assets WHERE id = ?").get(assetId);
  const template = db.prepare("SELECT id, title FROM templates WHERE id = ?").get(templateId);
  if (!asset || !template) throw validationError("素材或模板不存在。");
  return { asset, template };
}

function assertBindableMedia(mediaIds, user) {
  if (!mediaIds.length) return;
  const placeholders = mediaIds.map(() => "?").join(", ");
  const validMediaCount = db
    .prepare(`SELECT COUNT(*) AS count FROM media_attachments WHERE id IN (${placeholders}) AND owner = ? AND content_id IS NULL`)
    .get(...mediaIds, user.displayName).count;
  if (validMediaCount !== mediaIds.length) {
    throw validationError("存在无法绑定的媒体附件。");
  }
}

function bindMediaToContent(mediaIds, user, contentId) {
  if (!mediaIds.length) return;
  const placeholders = mediaIds.map(() => "?").join(", ");
  db.prepare(`UPDATE media_attachments SET content_id = ? WHERE id IN (${placeholders}) AND owner = ? AND content_id IS NULL`).run(
    contentId,
    ...mediaIds,
    user.displayName
  );
}

function createContentRecord(body, user, options = {}) {
  if (!isPlainObject(body)) throw validationError("请求体必须是 JSON 对象。");
  const title = normalizeStringField(body.title, "", "内容标题", 200, true);
  const contentBody = normalizeContentBody(body.body, "");
  const channel = normalizeStringField(body.channel, "", "发布渠道", 20, true);
  const assetId = normalizeStringField(body.assetId, "", "素材 ID", 80, true);
  const templateId = normalizeStringField(body.templateId, "", "模板 ID", 80, true);
  const { asset, template } = ensureAssetAndTemplate(assetId, templateId);
  const plan = body.planId ? db.prepare("SELECT * FROM plans WHERE id = ?").get(String(body.planId)) : null;
  const status = options.forceStatus ?? normalizeContentStatus(body.status, statusDraft);
  const mediaIds = normalizeMediaIds(body.mediaIds);
  assertBindableMedia(mediaIds, user);

  const id = normalizeRecordId(body.id, `content-${Date.now()}-${randomUUID().slice(0, 6)}`);
  const existing = db.prepare("SELECT id FROM contents WHERE id = ?").get(id);
  if (existing) throw validationError("内容 ID 已存在。");

  const savedAt = nowIso();
  const scheduledDate = normalizeScheduleValue(body.scheduledDate, plan?.date ?? dateFromIso(savedAt), "计划日期");
  const scheduledTime = normalizeScheduleValue(body.scheduledTime, plan?.slot ?? timeFromIso(savedAt), "计划时间");

  db.prepare(`
    INSERT INTO contents
      (id, title, body, channel, status, asset_id, template_id, owner, saved_at, scheduled_date, scheduled_time, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(id, title, contentBody, channel, status, asset.id, template.id, user.displayName, savedAt, scheduledDate, scheduledTime);

  bindMediaToContent(mediaIds, user, id);

  if (plan) {
    db.prepare("UPDATE plans SET status = ?, content_id = ? WHERE id = ?").run(statusPlanWorking, id, plan.id);
  }

  db.prepare("INSERT INTO activities (id, content_id, type, note, time_label, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    `act${Date.now()}`,
    id,
    statusActivityUpdate,
    `从「${asset.title}」和「${template.title}」生成草稿。`,
    "刚刚",
    savedAt
  );

  return getContent(id);
}

function updateContentRecord(contentId, body, user) {
  if (!isPlainObject(body)) throw validationError("请求体必须是 JSON 对象。");
  if (
    ["publishedAt", "metrics", "views", "likes", "comments", "shares", "saves"].some((field) => Object.prototype.hasOwnProperty.call(body, field))
  ) {
    throw validationError("真实发布时间和平台数据请使用 /api/contents/:id/platform-update 更新。");
  }

  const current = db.prepare("SELECT * FROM contents WHERE id = ?").get(contentId);
  if (!current) return null;

  const updates = [];
  const values = [];
  const setField = (column, value) => {
    updates.push(`${column} = ?`);
    values.push(value);
  };

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    setField("title", normalizeStringField(body.title, current.title, "内容标题", 200, true));
  }
  if (Object.prototype.hasOwnProperty.call(body, "body")) {
    setField("body", normalizeContentBody(body.body, current.body ?? ""));
  }
  if (Object.prototype.hasOwnProperty.call(body, "channel")) {
    setField("channel", normalizeStringField(body.channel, current.channel, "发布渠道", 20, true));
  }
  if (Object.prototype.hasOwnProperty.call(body, "status")) {
    if (current.status === statusPublished) {
      throw validationError("已发布内容的状态请通过平台更新 API 维护。");
    }
    setField("status", normalizeContentStatus(body.status, current.status));
  }
  if (Object.prototype.hasOwnProperty.call(body, "assetId")) {
    const assetId = normalizeStringField(body.assetId, current.asset_id, "素材 ID", 80, true);
    if (!db.prepare("SELECT id FROM assets WHERE id = ?").get(assetId)) throw validationError("素材不存在。");
    setField("asset_id", assetId);
  }
  if (Object.prototype.hasOwnProperty.call(body, "templateId")) {
    const templateId = normalizeStringField(body.templateId, current.template_id, "模板 ID", 80, true);
    if (!db.prepare("SELECT id FROM templates WHERE id = ?").get(templateId)) throw validationError("模板不存在。");
    setField("template_id", templateId);
  }
  if (Object.prototype.hasOwnProperty.call(body, "scheduledDate")) {
    setField("scheduled_date", normalizeScheduleValue(body.scheduledDate, current.scheduled_date, "计划日期"));
  }
  if (Object.prototype.hasOwnProperty.call(body, "scheduledTime")) {
    setField("scheduled_time", normalizeScheduleValue(body.scheduledTime, current.scheduled_time, "计划时间"));
  }

  const mediaIds = Object.prototype.hasOwnProperty.call(body, "mediaIds") ? normalizeMediaIds(body.mediaIds) : [];
  if (Object.prototype.hasOwnProperty.call(body, "mediaIds")) {
    assertBindableMedia(mediaIds, user);
  }

  if (updates.length) {
    db.prepare(`UPDATE contents SET ${updates.join(", ")} WHERE id = ?`).run(...values, contentId);
    db.prepare("INSERT INTO activities (id, content_id, type, note, time_label, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      `act${Date.now()}`,
      contentId,
      statusActivityUpdate,
      "内容正文或基础字段已更新。",
      "刚刚",
      nowIso()
    );
  }
  if (Object.prototype.hasOwnProperty.call(body, "mediaIds")) {
    bindMediaToContent(mediaIds, user, contentId);
  }

  return getContent(contentId);
}

function clearContentBody(contentId) {
  const current = db.prepare("SELECT id FROM contents WHERE id = ?").get(contentId);
  if (!current) return null;
  db.prepare("UPDATE contents SET body = '' WHERE id = ?").run(contentId);
  db.prepare("INSERT INTO activities (id, content_id, type, note, time_label, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    `act${Date.now()}`,
    contentId,
    statusActivityUpdate,
    "内容正文已清空。",
    "刚刚",
    nowIso()
  );
  return { id: contentId, body: "" };
}

function deleteContentRecord(contentId) {
  const current = db.prepare("SELECT id FROM contents WHERE id = ?").get(contentId);
  if (!current) return false;
  db.prepare("UPDATE plans SET status = ?, content_id = NULL WHERE content_id = ?").run(statusPlanWaiting, contentId);
  db.prepare("DELETE FROM contents WHERE id = ?").run(contentId);
  return true;
}

function getBootstrap(user) {
  const planItems = db.prepare("SELECT id, date, day, slot, channel, theme, owner, goal, status, content_id AS contentId FROM plans ORDER BY date, slot").all();

  return {
    user,
    accounts: getAccounts(),
    assets: listAssets(),
    templates: listTemplates(),
    contentPool: listContents(),
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
        login_email AS loginEmail,
        handle,
        profile_url AS profileUrl,
        positioning,
        persona_role AS personaRole,
        voice_json AS voiceJson,
        content_types_json AS contentTypesJson,
        avoid_json AS avoidJson,
        cadence,
        interaction_target AS interactionTarget,
        creator_profile_json AS creatorProfileJson
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

function getRawBody(req, maxBytes = maxUploadBytes) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let total = 0;
    let failed = false;

    req.on("data", (chunk) => {
      if (failed) return;
      total += chunk.length;
      if (total > maxBytes) {
        failed = true;
        rejectBody(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!failed) resolveBody(Buffer.concat(chunks));
    });
    req.on("error", rejectBody);
  });
}

function parseMultipart(req, body) {
  const contentType = req.headers["content-type"] ?? "";
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2];
  if (!boundary) return [];

  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const headerSeparator = Buffer.from("\r\n\r\n");
  const nextBoundaryPrefix = Buffer.from(`\r\n--${boundary}`);
  const parts = [];
  let cursor = body.indexOf(boundaryBuffer);

  while (cursor !== -1) {
    let partStart = cursor + boundaryBuffer.length;
    const marker = body.subarray(partStart, partStart + 2).toString("utf8");
    if (marker === "--") break;
    if (marker === "\r\n") partStart += 2;

    const headerEnd = body.indexOf(headerSeparator, partStart);
    if (headerEnd === -1) break;
    const contentStart = headerEnd + headerSeparator.length;
    const nextBoundary = body.indexOf(nextBoundaryPrefix, contentStart);
    if (nextBoundary === -1) break;

    const headersText = body.subarray(partStart, headerEnd).toString("utf8");
    const headers = Object.fromEntries(
      headersText
        .split("\r\n")
        .map((line) => {
          const separator = line.indexOf(":");
          if (separator === -1) return null;
          return [line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim()];
        })
        .filter(Boolean)
    );

    const disposition = headers["content-disposition"] ?? "";
    const name = /name="([^"]+)"/i.exec(disposition)?.[1] ?? "";
    const filename = /filename="([^"]*)"/i.exec(disposition)?.[1] ?? "";
    parts.push({
      name,
      filename,
      mimeType: headers["content-type"] ?? "application/octet-stream",
      data: body.subarray(contentStart, nextBoundary)
    });

    cursor = nextBoundary + 2;
  }

  return parts;
}

function sanitizeFileName(value) {
  const cleaned = String(value ?? "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 120) || "upload";
}

function extensionForUpload(mimeType, originalName) {
  const originalExtension = extname(originalName).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(originalExtension)) return originalExtension;
  return mimeFallbackExtensions.get(mimeType) ?? (mimeType.startsWith("image/") ? ".img" : ".video");
}

function isAllowedMediaMime(mimeType) {
  return (mimeType.startsWith("image/") && mimeType !== "image/svg+xml") || mimeType.startsWith("video/");
}

function normalizeMediaIds(value) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map((item) => String(item).trim())
        .filter((item) => /^[a-zA-Z0-9_-]{4,80}$/.test(item))
    )
  ].slice(0, maxUploadFiles);
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
          u.login_email AS loginEmail,
          u.handle,
          u.profile_url AS profileUrl,
          u.positioning,
          u.persona_role AS personaRole,
          u.voice_json AS voiceJson,
          u.content_types_json AS contentTypesJson,
          u.avoid_json AS avoidJson,
          u.cadence,
          u.interaction_target AS interactionTarget,
          u.creator_profile_json AS creatorProfileJson
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

function updateAccountProfile(accountName, body) {
  const current = getAccountByName(accountName);
  if (!current) throw validationError("账号不存在。", 404);
  const currentUser = mapUser(current);
  const base = {
    displayName: String(body.displayName ?? currentUser.displayName).trim().slice(0, 80),
    role: String(body.role ?? currentUser.role).trim().slice(0, 120),
    platform: String(body.platform ?? currentUser.platform ?? "X").trim().slice(0, 40),
    loginEmail: String(body.loginEmail ?? currentUser.loginEmail ?? "").trim().slice(0, 160),
    handle: String(body.handle ?? currentUser.handle ?? "").trim().slice(0, 80),
    profileUrl: String(body.profileUrl ?? currentUser.profileUrl ?? "").trim().slice(0, 300),
    positioning: String(body.positioning ?? currentUser.positioning ?? "").trim().slice(0, 160),
    personaRole: String(body.personaRole ?? currentUser.personaRole ?? "").trim().slice(0, 500),
    voice: normalizeLooseStringArray(body.voice ?? currentUser.voice, 16),
    contentTypes: normalizeLooseStringArray(body.contentTypes ?? currentUser.contentTypes, 16),
    avoid: normalizeLooseStringArray(body.avoid ?? currentUser.avoid, 16),
    cadence: String(body.cadence ?? currentUser.cadence ?? "").trim().slice(0, 300),
    interactionTarget: String(body.interactionTarget ?? currentUser.interactionTarget ?? "").trim().slice(0, 300),
    creatorProfile: normalizeCreatorProfile(body.creatorProfile ?? currentUser.creatorProfile, currentUser.creatorProfile ?? creatorProfileSeeds[accountName] ?? {})
  };

  if (!base.displayName || !base.role) throw validationError("展示名和角色不能为空。");

  db.prepare(
    `UPDATE users
     SET display_name = ?,
         role = ?,
         platform = ?,
         login_email = ?,
         handle = ?,
         profile_url = ?,
         positioning = ?,
         persona_role = ?,
         voice_json = ?,
         content_types_json = ?,
         avoid_json = ?,
         cadence = ?,
         interaction_target = ?,
         creator_profile_json = ?
     WHERE account_name = ?`
  ).run(
    base.displayName,
    base.role,
    base.platform,
    base.loginEmail,
    base.handle,
    base.profileUrl,
    base.positioning,
    base.personaRole,
    json(base.voice),
    json(base.contentTypes),
    json(base.avoid),
    base.cadence,
    base.interactionTarget,
    json(base.creatorProfile),
    accountName
  );

  return mapUser(getAccountByName(accountName));
}

async function storeUploadedMedia(req, user) {
  const body = await getRawBody(req);
  const parts = parseMultipart(req, body).filter((part) => part.filename);
  if (!parts.length) {
    throw new Error("请选择要上传的图片或视频。");
  }
  if (parts.length > maxUploadFiles) {
    throw new Error(`一次最多上传 ${maxUploadFiles} 个文件。`);
  }

  const createdAt = nowIso();
  const insert = db.prepare(`
    INSERT INTO media_attachments
      (id, content_id, owner, original_name, mime_type, kind, size, url, created_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)
  `);

  return parts.map((part) => {
    const mimeType = String(part.mimeType ?? "").toLowerCase();
    if (!isAllowedMediaMime(mimeType)) {
      throw new Error("仅支持上传图片或视频文件。");
    }
    if (part.data.length > maxUploadFileBytes) {
      throw new Error("单个文件不能超过 50MB。");
    }

    const id = `m${Date.now()}-${randomUUID().slice(0, 8)}`;
    const originalName = sanitizeFileName(part.filename);
    const kind = mimeType.startsWith("image/") ? "image" : "video";
    const storedName = `${id}${extensionForUpload(mimeType, originalName)}`;
    const filePath = join(uploadDir, storedName);
    const url = `/api/uploads/${storedName}`;

    writeFileSync(filePath, part.data);
    insert.run(id, user.displayName, originalName, mimeType, kind, part.data.length, url, createdAt);

    return {
      id,
      name: originalName,
      kind,
      mimeType,
      size: part.data.length,
      url,
      createdAt
    };
  });
}

function serveUploadedMedia(req, res, pathname, origin) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendError(res, 405, "Method Not Allowed", origin);
    return true;
  }

  const rawName = decodeURIComponent(pathname.replace("/api/uploads/", ""));
  if (!/^[a-zA-Z0-9_.-]+$/.test(rawName)) {
    sendError(res, 404, "Not Found", origin);
    return true;
  }

  const safeRoot = resolve(uploadDir);
  const filePath = resolve(uploadDir, rawName);
  if (!filePath.startsWith(`${safeRoot}${sep}`) || !existsSync(filePath)) {
    sendError(res, 404, "Not Found", origin);
    return true;
  }

  const media = db.prepare("SELECT mime_type AS mimeType FROM media_attachments WHERE url = ?").get(`/api/uploads/${rawName}`);
  const headers = {
    "Content-Type": media?.mimeType ?? "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=31536000, immutable"
  };
  if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  res.writeHead(200, headers);
  if (req.method === "HEAD") {
    res.end();
    return true;
  }
  res.end(readFileSync(filePath));
  return true;
}

async function handleApi(req, res, pathname, origin) {
  if (req.method === "OPTIONS") {
    const headers = {
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    };
    if (origin && allowedOrigins.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (pathname.startsWith("/api/uploads/") && serveUploadedMedia(req, res, pathname, origin)) {
    return;
  }

  if (req.method === "GET" && pathname === "/api/accounts") {
    sendJson(res, 200, { accounts: getAccounts() }, origin);
    return;
  }

  const accountProfileMatch = pathname.match(/^\/api\/accounts\/([^/]+)\/profile$/);
  if (accountProfileMatch) {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    const accountName = decodeURIComponent(accountProfileMatch[1]).trim().toLowerCase();
    if (req.method === "PATCH") {
      try {
        const account = updateAccountProfile(accountName, await getRequestBody(req));
        sendJson(res, 200, { account, accounts: getAccounts() }, origin);
      } catch (error) {
        sendError(res, error.statusCode ?? 400, error instanceof Error ? error.message : "个人主页更新失败。", origin);
      }
      return;
    }
  }

  if (req.method === "POST" && pathname === "/api/login") {
    const body = await getRequestBody(req);
    const loginName = String(body.accountName ?? "").trim().toLowerCase();
    if (!loginName || loginName.length > 160) {
      sendError(res, 400, "请输入有效账号名或登录邮箱。", origin);
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
          login_email AS loginEmail,
          handle,
          profile_url AS profileUrl,
          positioning,
          persona_role AS personaRole,
          voice_json AS voiceJson,
          content_types_json AS contentTypesJson,
          avoid_json AS avoidJson,
          cadence,
          interaction_target AS interactionTarget,
          creator_profile_json AS creatorProfileJson
        FROM users
        WHERE account_name = ? OR lower(display_name) = ? OR lower(login_email) = ?`
      )
      .get(loginName, loginName, loginName);
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

  if (pathname === "/api/assets") {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    if (req.method === "GET") {
      sendJson(res, 200, { assets: listAssets() }, origin);
      return;
    }
    if (req.method === "POST") {
      try {
        const asset = createAssetRecord(await getRequestBody(req));
        sendJson(res, 201, { asset }, origin);
      } catch (error) {
        sendError(res, error.statusCode ?? 400, error instanceof Error ? error.message : "素材创建失败。", origin);
      }
      return;
    }
  }

  const assetMatch = pathname.match(/^\/api\/assets\/([^/]+)$/);
  if (assetMatch) {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    const assetId = decodeURIComponent(assetMatch[1]);
    if (req.method === "GET") {
      const asset = getAsset(assetId);
      if (!asset) {
        sendError(res, 404, "素材不存在。", origin);
        return;
      }
      sendJson(res, 200, { asset }, origin);
      return;
    }
    if (req.method === "PATCH") {
      try {
        const asset = updateAssetRecord(assetId, await getRequestBody(req));
        if (!asset) {
          sendError(res, 404, "素材不存在。", origin);
          return;
        }
        sendJson(res, 200, { asset }, origin);
      } catch (error) {
        sendError(res, error.statusCode ?? 400, error instanceof Error ? error.message : "素材更新失败。", origin);
      }
      return;
    }
    if (req.method === "DELETE") {
      try {
        const deleted = deleteAssetRecord(assetId);
        if (!deleted) {
          sendError(res, 404, "素材不存在。", origin);
          return;
        }
        sendJson(res, 200, { deleted: true, assetId }, origin);
      } catch (error) {
        sendError(res, error.statusCode ?? 400, error instanceof Error ? error.message : "素材删除失败。", origin);
      }
      return;
    }
  }

  if (pathname === "/api/templates") {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    if (req.method === "GET") {
      sendJson(res, 200, { templates: listTemplates() }, origin);
      return;
    }
    if (req.method === "POST") {
      try {
        const template = createTemplateRecord(await getRequestBody(req));
        sendJson(res, 201, { template }, origin);
      } catch (error) {
        sendError(res, error.statusCode ?? 400, error instanceof Error ? error.message : "模板创建失败。", origin);
      }
      return;
    }
  }

  const templateMatch = pathname.match(/^\/api\/templates\/([^/]+)$/);
  if (templateMatch) {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    const templateId = decodeURIComponent(templateMatch[1]);
    if (req.method === "GET") {
      const template = getTemplate(templateId);
      if (!template) {
        sendError(res, 404, "模板不存在。", origin);
        return;
      }
      sendJson(res, 200, { template }, origin);
      return;
    }
    if (req.method === "PATCH") {
      try {
        const template = updateTemplateRecord(templateId, await getRequestBody(req));
        if (!template) {
          sendError(res, 404, "模板不存在。", origin);
          return;
        }
        sendJson(res, 200, { template }, origin);
      } catch (error) {
        sendError(res, error.statusCode ?? 400, error instanceof Error ? error.message : "模板更新失败。", origin);
      }
      return;
    }
    if (req.method === "DELETE") {
      try {
        const deleted = deleteTemplateRecord(templateId);
        if (!deleted) {
          sendError(res, 404, "模板不存在。", origin);
          return;
        }
        sendJson(res, 200, { deleted: true, templateId }, origin);
      } catch (error) {
        sendError(res, error.statusCode ?? 400, error instanceof Error ? error.message : "模板删除失败。", origin);
      }
      return;
    }
  }

  if (pathname === "/api/contents") {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    if (req.method === "GET") {
      sendJson(res, 200, { contents: listContents() }, origin);
      return;
    }
    if (req.method === "POST") {
      try {
        const content = createContentRecord(await getRequestBody(req), user);
        sendJson(res, 201, { content }, origin);
      } catch (error) {
        sendError(res, error.statusCode ?? 400, error instanceof Error ? error.message : "内容创建失败。", origin);
      }
      return;
    }
  }

  if (req.method === "POST" && pathname === "/api/uploads") {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    try {
      const media = await storeUploadedMedia(req, user);
      sendJson(res, 201, { media }, origin);
    } catch (error) {
      sendError(res, 400, error instanceof Error ? error.message : "媒体上传失败。", origin);
    }
    return;
  }

  if (req.method === "POST" && pathname === "/api/contents/drafts") {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    try {
      createContentRecord(await getRequestBody(req), user, { forceStatus: statusDraft });
      sendJson(res, 201, getBootstrap(user), origin);
    } catch (error) {
      sendError(res, error.statusCode ?? 400, error instanceof Error ? error.message : "草稿保存失败。", origin);
    }
    return;
  }

  const contentBodyMatch = pathname.match(/^\/api\/contents\/([^/]+)\/body$/);
  if (contentBodyMatch) {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    const contentId = decodeURIComponent(contentBodyMatch[1]);
    const content = getContent(contentId);
    if (!content) {
      sendError(res, 404, "内容不存在。", origin);
      return;
    }
    if (req.method === "GET") {
      sendJson(res, 200, { id: content.id, body: content.body ?? "" }, origin);
      return;
    }
    if (req.method === "PATCH") {
      try {
        const payload = await getRequestBody(req);
        if (!Object.prototype.hasOwnProperty.call(payload, "body")) {
          throw validationError("请提供 body 字段。");
        }
        const updated = updateContentRecord(contentId, { body: payload.body }, user);
        sendJson(res, 200, { id: updated.id, body: updated.body ?? "", content: updated }, origin);
      } catch (error) {
        sendError(res, error.statusCode ?? 400, error instanceof Error ? error.message : "正文更新失败。", origin);
      }
      return;
    }
    if (req.method === "DELETE") {
      const cleared = clearContentBody(contentId);
      sendJson(res, 200, cleared, origin);
      return;
    }
  }

  const contentMatch = pathname.match(/^\/api\/contents\/([^/]+)$/);
  if (contentMatch) {
    const user = requireAuth(req, res, origin);
    if (!user) return;
    const contentId = decodeURIComponent(contentMatch[1]);
    if (req.method === "GET") {
      const content = getContent(contentId);
      if (!content) {
        sendError(res, 404, "内容不存在。", origin);
        return;
      }
      sendJson(res, 200, { content }, origin);
      return;
    }
    if (req.method === "PATCH") {
      try {
        const content = updateContentRecord(contentId, await getRequestBody(req), user);
        if (!content) {
          sendError(res, 404, "内容不存在。", origin);
          return;
        }
        sendJson(res, 200, { content }, origin);
      } catch (error) {
        sendError(res, error.statusCode ?? 400, error instanceof Error ? error.message : "内容更新失败。", origin);
      }
      return;
    }
    if (req.method === "DELETE") {
      const deleted = deleteContentRecord(contentId);
      if (!deleted) {
        sendError(res, 404, "内容不存在。", origin);
        return;
      }
      sendJson(res, 200, { deleted: true, contentId }, origin);
      return;
    }
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
syncVisionTreeReferenceData();
resetLegacyDemoContentState();

const stripBasePath = (pathname) => {
  if (!basePath) return pathname;
  if (pathname === basePath) return "/";
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || "/";
  return null;
};

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = stripBasePath(url.pathname);
    if (pathname === null) {
      sendError(res, 404, "页面不存在。", origin);
      return;
    }
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname, origin);
      return;
    }
    serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);
    sendError(res, 500, "服务器处理失败。", origin);
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Content System API listening on http://localhost:${port}${basePath || ""}`);
  console.log(`SQLite database: ${dbPath}`);
});
