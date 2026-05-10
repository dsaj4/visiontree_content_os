import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileSearch,
  FileText,
  Flame,
  FolderKanban,
  GalleryHorizontalEnd,
  Globe2,
  ImageIcon,
  LayoutTemplate,
  ListChecks,
  MessageSquareText,
  MousePointer2,
  PenLine,
  Plus,
  RadioTower,
  Repeat2,
  Search,
  Send,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Video,
  X,
  UsersRound
} from "lucide-react";

type Channel = "X" | "抖音" | "小红书" | "公众号" | "视频号" | "B站" | "微博" | "LinkedIn";
type ContentStatus = "草稿" | "审核中" | "已排期" | "已发布";
type PlanStatus = "待领取" | "制作中" | "待发布" | "已完成";
type ViewKey = "studio" | "assets" | "templates" | "content" | "calendar" | "insights" | "profile";
type CalendarMode = "planned" | "published";
type PlanScope = "mine" | "all";
type DetailTarget = { kind: "asset"; id: string } | { kind: "template"; id: string } | null;
type ResourceKind = "web" | "pdf";

type UserAccount = {
  id?: string;
  accountName: string;
  displayName: string;
  role: string;
  platform?: string;
  handle?: string;
  profileUrl?: string;
  positioning?: string;
  personaRole?: string;
  voice?: string[];
  contentTypes?: string[];
  avoid?: string[];
  cadence?: string;
  interactionTarget?: string;
  creatorProfile?: PersonaPrepProfile | null;
};

type BootstrapData = {
  user: UserAccount;
  accounts: UserAccount[];
  assets: Asset[];
  templates: Template[];
  contentPool: ContentItem[];
  planItems: PlanItem[];
};

type PersonaPrepProfile = {
  roleLine: string;
  backgroundStory: string;
  writeFor: string[];
  doNotWrite: string[];
  driftRisks: string[];
  styleNotes: string[];
  signatureLines: string[];
  writingEntries: { title: string; structure: string }[];
  referenceAccounts: string[];
  weeklyFocus: string;
};

const personaPrepProfiles: Record<string, PersonaPrepProfile> = {
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
  eli: {
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

const defaultPersonaPrepProfile: PersonaPrepProfile = {
  roleLine: "帮助创作者快速理解这个账号在 VisionTree 矩阵中的表达任务。",
  backgroundStory: "这个账号服务于 VisionTree 的认知增强叙事，创作时需要先守住角色位置，再选择具体内容入口。",
  writeFor: ["账号定位", "内容类型", "语气边界"],
  doNotWrite: ["替人思考", "自动决策", "成熟第二大脑", "虚构产品能力"],
  driftRisks: ["和其他账号声音趋同", "为了传播牺牲口径准确性"],
  styleNotes: ["先对齐账号定位", "再选择素材和模板", "最后检查禁写边界"],
  signatureLines: ["Cognitive augmentation, not cognitive outsourcing."],
  writingEntries: [{ title: "基础入口", structure: "账号角色 -> 可写主题 -> 禁写边界" }],
  referenceAccounts: ["Farnam Street", "Ethan Mollick", "Linear"],
  weeklyFocus: "先用短帖验证账号声音，再扩展为长内容。"
};

type ResourceLink = {
  id: string;
  title: string;
  kind: ResourceKind;
  url: string;
  source: string;
  updated: string;
  summary: string;
  highlights: string[];
};

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

type Activity = {
  id: string;
  type: "数据同步" | "评论记录" | "转发记录" | "状态更新";
  note: string;
  time: string;
};

type Metrics = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
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

type ContentItem = {
  id: string;
  title: string;
  body?: string;
  channel: Channel;
  status: ContentStatus;
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

type PlanItem = {
  id: string;
  date: string;
  day: string;
  slot: string;
  channel: Channel;
  theme: string;
  owner: string;
  goal: string;
  status: PlanStatus;
  contentId?: string;
};

const channels: Channel[] = ["X"];

const fallbackAssets: Asset[] = [
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
        highlights: ["Banner 写 One visual. One experiment. Every day.", "周一发沉没成本图解。", "周二发第一个互动实验。"]
      },
      {
        id: "a1-pdf",
        title: "Thinking Lab 启动清单 PDF",
        kind: "pdf",
        url: "https://visiontree.example/files/thinking-lab-launch.pdf",
        source: "PDF",
        updated: "2026-05-08",
        summary: "沉淀 Thinking Lab 第一周的视觉、互动、置顶帖与评论动作。",
        highlights: ["图要干净，三秒看懂。", "互动题可以纯文字。", "评论区不要自我介绍。"]
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
    title: "The Thinking Tree 树的独白素材",
    theme: "活的隐喻",
    source: "V2 账号启动计划",
    format: "图文独白",
    freshness: "本周一",
    score: 92,
    tags: ["The Thinking Tree", "树的口吻", "思维模型"],
    summary: "The Thinking Tree 不是一个人。它把产品名变成活的隐喻：思维模型是养分，判断力是年轮，结构化思考是根系。",
    owner: "The Thinking Tree",
    palette: "cyan",
    notes: ["语气不是卖萌，也不是装可爱。", "它更像一棵活了很久的树，在平静地观察人类。"],
    resources: [
      {
        id: "a4-web",
        title: "The Thinking Tree 角色设定页",
        kind: "web",
        url: "https://visiontree.example/v2/the-thinking-tree",
        source: "网页链接",
        updated: "2026-05-08",
        summary: "解释树的存在逻辑、视觉空间、语气和内容类型。",
        highlights: ["思维模型是养分。", "思考过程是光合作用。", "判断力是年轮。"]
      },
      {
        id: "a4-pdf",
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
    resources: []
  },
  {
    id: "a6",
    title: "Milo Reed 工程取舍素材",
    theme: "工程取舍",
    source: "V2 账号启动计划",
    format: "工程师短帖",
    freshness: "本周二",
    score: 86,
    tags: ["Milo Reed", "技术选择", "产品取舍"],
    summary: "从 VisionTree 最近真实遇到的技术选择出发：面临什么选项、选了哪个、为什么。",
    owner: "Milo Reed",
    palette: "amber",
    notes: ["不用长，写清楚选项和判断。", "评论像工程师对工程师说话。"],
    resources: []
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
    palette: "mint",
    notes: ["官方号的任务不是自己出圈，而是把其他六个号的内容收拢到一个叙事里。"],
    resources: []
  }
];

const fallbackTemplates: Template[] = [
  {
    id: "t1",
    title: "图解 + 两分钟实验",
    format: "Visual / Experiment",
    channels: ["X"],
    hook: "One visual. One experiment. Every day.",
    structure: ["一个模型", "一张干净图", "一句解释", "一个动作问题"],
    length: "1 图或 3-5 句",
    notes: ["适合 Thinking Lab。图和互动交替发。", "视觉内容三秒看懂，不要塞太多字。"],
    resources: []
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
    resources: []
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
    resources: []
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
    resources: []
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
    resources: []
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
    resources: []
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
    resources: []
  }
];

const fallbackPlan: PlanItem[] = [
  {
    id: "p1",
    date: "2026-05-11",
    day: "周一",
    slot: "10:00",
    channel: "X",
    theme: "Thinking Lab：沉没成本图解",
    owner: "Thinking Lab",
    goal: "建立视觉第一印象",
    status: "已完成",
    contentId: "c1"
  },
  {
    id: "p2",
    date: "2026-05-12",
    day: "周二",
    slot: "10:00",
    channel: "X",
    theme: "Thinking Lab：第一个两分钟实验",
    owner: "Thinking Lab",
    goal: "引导回复",
    status: "制作中"
  },
  {
    id: "p3",
    date: "2026-05-12",
    day: "周二",
    slot: "18:00",
    channel: "X",
    theme: "Milo：真实技术取舍",
    owner: "Milo Reed",
    goal: "建立工程可信度",
    status: "制作中",
    contentId: "c3"
  },
  {
    id: "p4",
    date: "2026-05-13",
    day: "周三",
    slot: "09:20",
    channel: "X",
    theme: "The Thinking Tree：第一片新叶",
    owner: "The Thinking Tree",
    goal: "建立记忆点",
    status: "待领取"
  },
  {
    id: "p5",
    date: "2026-05-13",
    day: "周三",
    slot: "20:30",
    channel: "X",
    theme: "VisionTree：第一条品类定义",
    owner: "VisionTree",
    goal: "收拢官方叙事",
    status: "待发布"
  }
];

const navItems = [
  { id: "studio", label: "创作台", icon: PenLine },
  { id: "assets", label: "素材池", icon: GalleryHorizontalEnd },
  { id: "templates", label: "模板库", icon: LayoutTemplate },
  { id: "content", label: "内容池", icon: FolderKanban },
  { id: "calendar", label: "计划日历", icon: CalendarDays },
  { id: "insights", label: "数据活动", icon: BarChart3 },
  { id: "profile", label: "个人主页", icon: UsersRound }
] satisfies Array<{ id: ViewKey; label: string; icon: typeof PenLine }>;

const statusClass: Record<ContentStatus | PlanStatus, string> = {
  草稿: "muted",
  审核中: "warning",
  已排期: "accent",
  已发布: "success",
  待领取: "muted",
  制作中: "warning",
  待发布: "accent",
  已完成: "success"
};

const API_BASE = "/api";

async function apiRequest<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...requestOptions } = options;
  const response = await fetch(`${API_BASE}${path}`, {
    ...requestOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "请求失败");
  }
  return payload as T;
}

async function uploadMediaFiles(files: File[], token: string): Promise<MediaAttachment[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error ?? "媒体上传失败");
  }
  return payload.media as MediaAttachment[];
}

function loadStoredUser() {
  try {
    const raw = localStorage.getItem("content-system-user");
    return raw ? (JSON.parse(raw) as UserAccount) : null;
  } catch {
    return null;
  }
}

function formatNumber(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
  return value.toLocaleString("zh-CN");
}

function formatFileSize(value: number) {
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function truncateText(value: string, maxLength: number) {
  const trimmed = value.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
}

function formatDayLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("zh-CN", { weekday: "short" });
}

function matchesQuery(parts: Array<string | number | undefined>, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return parts.join(" ").toLowerCase().includes(normalizedQuery);
}

function getCurrentTimeLabel() {
  return new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("content-system-token") ?? "");
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => loadStoredUser());
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [appError, setAppError] = useState("");
  const [loginName, setLoginName] = useState("");
  const [activeView, setActiveView] = useState<ViewKey>("studio");
  const [selectedAssetId, setSelectedAssetId] = useState(fallbackAssets[0].id);
  const [selectedTemplateId, setSelectedTemplateId] = useState(fallbackTemplates[0].id);
  const [selectedPlanId, setSelectedPlanId] = useState(fallbackPlan[2].id);
  const [planScope, setPlanScope] = useState<PlanScope>("mine");
  const [selectedChannel, setSelectedChannel] = useState<Channel>("X");
  const [assetQuery, setAssetQuery] = useState("");
  const [templateQuery, setTemplateQuery] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contentPool, setContentPool] = useState<ContentItem[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("planned");
  const [detailTarget, setDetailTarget] = useState<DetailTarget>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftCopy, setDraftCopy] = useState("");
  const [draftMedia, setDraftMedia] = useState<MediaAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const applyBootstrap = (data: BootstrapData) => {
    setCurrentUser(data.user);
    localStorage.setItem("content-system-user", JSON.stringify(data.user));
    setAccounts(data.accounts);
    setAssets(data.assets);
    setTemplates(data.templates);
    setContentPool(data.contentPool);
    setPlanItems(data.planItems);
    const userPlans = data.planItems.filter((plan) => plan.owner === data.user.displayName);
    setSelectedAssetId((current) => (data.assets.some((asset) => asset.id === current) ? current : data.assets[0]?.id ?? fallbackAssets[0].id));
    setSelectedTemplateId((current) =>
      data.templates.some((template) => template.id === current) ? current : data.templates[0]?.id ?? fallbackTemplates[0].id
    );
    setSelectedPlanId((current) =>
      userPlans.some((plan) => plan.id === current) ? current : userPlans[0]?.id ?? data.planItems[0]?.id ?? fallbackPlan[0].id
    );
  };

  const refreshData = async (token = authToken) => {
    const data = await apiRequest<BootstrapData>("/bootstrap", { token });
    applyBootstrap(data);
  };

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ accounts: UserAccount[] }>("/accounts")
      .then((data) => {
        if (!cancelled) setAccounts(data.accounts);
      })
      .catch((error) => {
        if (!cancelled) setAppError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    refreshData(authToken)
      .catch((error) => {
        if (!cancelled) {
          setAppError(error.message);
          setAuthToken("");
          setCurrentUser(null);
          localStorage.removeItem("content-system-token");
          localStorage.removeItem("content-system-user");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppError("");
    setIsLoading(true);
    try {
      const data = await apiRequest<{ token: string; user: UserAccount }>("/login", {
        method: "POST",
        body: JSON.stringify({ accountName: loginName })
      });
      const bootstrap = await apiRequest<BootstrapData>("/bootstrap", { token: data.token });
      localStorage.setItem("content-system-token", data.token);
      localStorage.setItem("content-system-user", JSON.stringify(data.user));
      setAuthToken(data.token);
      applyBootstrap(bootstrap);
      setLoginName("");
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAuthToken("");
    setCurrentUser(null);
    setAssets([]);
    setTemplates([]);
    setContentPool([]);
    setPlanItems([]);
    setPlanScope("mine");
    setDetailTarget(null);
    localStorage.removeItem("content-system-token");
    localStorage.removeItem("content-system-user");
  };

  const saveProfile = async (accountName: string, payload: Partial<UserAccount>) => {
    if (!authToken) throw new Error("请先登录。");
    setAppError("");
    setIsMutating(true);
    try {
      const data = await apiRequest<{ account: UserAccount; accounts: UserAccount[] }>(`/accounts/${encodeURIComponent(accountName)}/profile`, {
        method: "PATCH",
        token: authToken,
        body: JSON.stringify(payload)
      });
      setAccounts(data.accounts);
      if (currentUser?.accountName === data.account.accountName) {
        setCurrentUser(data.account);
        localStorage.setItem("content-system-user", JSON.stringify(data.account));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "个人主页更新失败";
      setAppError(message);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0] ?? fallbackAssets[0];
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? fallbackTemplates[0];

  const myPlanItems = useMemo(
    () => (currentUser ? planItems.filter((plan) => plan.owner === currentUser.displayName) : planItems),
    [currentUser, planItems]
  );

  const scopedPlanItems = planScope === "mine" ? myPlanItems : planItems;
  const composerPlanItems = scopedPlanItems.length ? scopedPlanItems : planItems;

  useEffect(() => {
    const availablePlans = composerPlanItems.length ? composerPlanItems : planItems;
    if (!availablePlans.length) return;
    if (!availablePlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(availablePlans[0].id);
    }
  }, [composerPlanItems, planItems, selectedPlanId]);

  const filteredAssets = useMemo(
    () =>
      assets.filter((asset) =>
        matchesQuery(
          [asset.title, asset.theme, asset.source, asset.format, asset.owner, asset.summary, asset.tags.join(" ")],
          assetQuery
        )
      ),
    [assets, assetQuery]
  );

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) =>
        matchesQuery(
          [
            template.title,
            template.format,
            template.hook,
            template.length,
            template.channels.join(" "),
            template.structure.join(" "),
            template.notes.join(" ")
          ],
          templateQuery
        )
      ),
    [templates, templateQuery]
  );
  const selectedPlan = planItems.find((plan) => plan.id === selectedPlanId) ?? planItems[0] ?? fallbackPlan[0];
  const visiblePendingPlanCount = myPlanItems.filter((plan) => plan.status !== "已完成").length;

  const totalMetrics = useMemo(
    () =>
      contentPool.reduce(
        (acc, content) => ({
          views: acc.views + content.metrics.views,
          likes: acc.likes + content.metrics.likes,
          comments: acc.comments + content.metrics.comments,
          shares: acc.shares + content.metrics.shares,
          saves: acc.saves + content.metrics.saves
        }),
        { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 }
      ),
    [contentPool]
  );

  const filteredContent = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return contentPool;
    return contentPool.filter((content) =>
      [content.title, content.body ?? "", content.channel, content.status, content.owner, content.assetTitle, content.templateTitle]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [contentPool, searchTerm]);

  const publishedContents = useMemo(
    () =>
      contentPool
        .filter((content) => content.status === "已发布")
        .sort((a, b) => String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? ""))),
    [contentPool]
  );

  const liveActivities = useMemo(
    () =>
      contentPool
        .flatMap((content) =>
          content.activities.map((activity) => ({
            ...activity,
            contentTitle: content.title,
            channel: content.channel
          }))
        )
        .slice(0, 8),
    [contentPool]
  );

  const generateDraft = () => {
    const channelText = selectedTemplate.channels.includes(selectedChannel)
      ? selectedChannel
      : selectedTemplate.channels[0];
    setSelectedChannel(channelText);
    setDraftTitle(`${selectedAsset.theme}｜${selectedTemplate.title}`);
    setDraftCopy(
      [
        `开场：${selectedTemplate.hook}`,
        "",
        `素材来源：${selectedAsset.title}。${selectedAsset.summary}`,
        "",
        `结构：${selectedTemplate.structure.join(" -> ")}。`,
        "",
        `发布平台：${channelText}。结尾引导用户评论一个真实问题，便于后续二创。`
      ].join("\n")
    );
  };

  const handleDraftMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (!files.length) return;

    const invalidFile = files.find((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/"));
    if (invalidFile) {
      setAppError("仅支持上传图片或视频文件。");
      return;
    }

    setAppError("");
    setIsUploading(true);
    try {
      const uploaded = await uploadMediaFiles(files, authToken);
      setDraftMedia((current) => [...current, ...uploaded]);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "媒体上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const saveDraft = async () => {
    setAppError("");
    setIsMutating(true);
    try {
      const data = await apiRequest<BootstrapData>("/contents/drafts", {
        method: "POST",
        token: authToken,
        body: JSON.stringify({
          title: draftTitle.trim() || `${selectedAsset.theme} 内容草稿`,
          channel: selectedChannel,
          body: draftCopy,
          assetId: selectedAsset.id,
          templateId: selectedTemplate.id,
          planId: selectedPlan.id,
          mediaIds: draftMedia.map((item) => item.id)
        })
      });
      applyBootstrap(data);
      setDraftTitle("");
      setDraftCopy("");
      setDraftMedia([]);
      setActiveView("content");
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "草稿保存失败");
    } finally {
      setIsMutating(false);
    }
  };

  const publishAndSync = async (contentId: string) => {
    setAppError("");
    setIsMutating(true);
    try {
      const data = await apiRequest<BootstrapData>(`/contents/${contentId}/publish`, {
        method: "POST",
        token: authToken
      });
      applyBootstrap(data);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "发布同步失败");
    } finally {
      setIsMutating(false);
    }
  };

  const recordInteraction = async (contentId: string, type: "评论记录" | "转发记录") => {
    setAppError("");
    setIsMutating(true);
    try {
      const data = await apiRequest<BootstrapData>(`/contents/${contentId}/interactions`, {
        method: "POST",
        token: authToken,
        body: JSON.stringify({ type })
      });
      applyBootstrap(data);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "互动记录失败");
    } finally {
      setIsMutating(false);
    }
  };

  const markPlanDone = async (planId: string) => {
    const plan = planItems.find((item) => item.id === planId);
    if (plan?.contentId) {
      await publishAndSync(plan.contentId);
      return;
    }

    setAppError("");
    setIsMutating(true);
    try {
      const data = await apiRequest<BootstrapData>(`/plans/${planId}/complete`, {
        method: "POST",
        token: authToken
      });
      applyBootstrap(data);
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "计划更新失败");
    } finally {
      setIsMutating(false);
    }
  };

  const renderView = () => {
    if (detailTarget?.kind === "asset") {
      const asset = assets.find((item) => item.id === detailTarget.id);
      if (asset) {
        return (
          <DetailView
            key={`asset-${asset.id}`}
            kindLabel="素材详情"
            title={asset.title}
            subtitle={`${asset.source} · ${asset.format} · ${asset.freshness}`}
            badge={`${asset.score} 热度 · 已发布引用 ${asset.referenceCount ?? 0} 次`}
            summary={asset.summary}
            tags={asset.tags}
            notes={asset.notes}
            resources={asset.resources}
            primaryActionLabel="取用素材"
            onBack={() => setDetailTarget(null)}
            onPrimaryAction={() => {
              setSelectedAssetId(asset.id);
              setDetailTarget(null);
              setActiveView("studio");
            }}
          />
        );
      }
    }

    if (detailTarget?.kind === "template") {
      const template = templates.find((item) => item.id === detailTarget.id);
      if (template) {
        return (
          <DetailView
            key={`template-${template.id}`}
            kindLabel="模板详情"
            title={template.title}
            subtitle={`${template.format} · ${template.length} · ${template.channels.join(" / ")}`}
            badge={`格式模板 · 已发布引用 ${template.referenceCount ?? 0} 次`}
            summary={template.hook}
            tags={template.structure}
            notes={template.notes}
            resources={template.resources}
            primaryActionLabel="套用模板"
            onBack={() => setDetailTarget(null)}
            onPrimaryAction={() => {
              setSelectedTemplateId(template.id);
              if (!template.channels.includes(selectedChannel)) setSelectedChannel(template.channels[0]);
              setDetailTarget(null);
              setActiveView("studio");
            }}
          />
        );
      }
    }

    if (activeView === "studio") {
      return (
        <section className="studio-grid">
          <div className="workspace-panel material-panel">
            <PanelTitle icon={GalleryHorizontalEnd} title="当前素材" meta={`${assets.length} 个可取用素材`} />
            <div className="selection-card">
              <span className={`asset-poster ${selectedAsset.palette}`} aria-hidden="true">
                <span>{selectedAsset.theme.slice(0, 2)}</span>
              </span>
              <div className="selection-copy">
                <div className="row-between">
                  <strong>{selectedAsset.title}</strong>
                  <em>{selectedAsset.score}</em>
                </div>
                <span className="usage-count">已发布引用 {selectedAsset.referenceCount ?? 0} 次</span>
                <p>{selectedAsset.summary}</p>
                <div className="tag-row">
                  {selectedAsset.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <div className="selection-actions">
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setDetailTarget(null);
                      setActiveView("assets");
                    }}
                  >
                    <Search size={16} />
                    更换素材
                  </button>
                  <button className="ghost-button" onClick={() => setDetailTarget({ kind: "asset", id: selectedAsset.id })}>
                    <FileSearch size={16} />
                    查看详情
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="workspace-panel template-panel">
            <PanelTitle icon={LayoutTemplate} title="当前模板" meta={selectedTemplate.length} />
            <div className="selection-card template-selection">
              <span className="template-type">{selectedTemplate.format}</span>
              <div className="selection-copy">
                <strong>{selectedTemplate.title}</strong>
                <span className="usage-count">已发布引用 {selectedTemplate.referenceCount ?? 0} 次</span>
                <p>{selectedTemplate.hook}</p>
                <small>{selectedTemplate.channels.join(" / ")}</small>
                <div className="structure-list">
                  {selectedTemplate.structure.map((step) => (
                    <span key={step}>{step}</span>
                  ))}
                </div>
                <div className="selection-actions">
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setDetailTarget(null);
                      setActiveView("templates");
                    }}
                  >
                    <Search size={16} />
                    更换模板
                  </button>
                  <button className="ghost-button" onClick={() => setDetailTarget({ kind: "template", id: selectedTemplate.id })}>
                    <FileSearch size={16} />
                    查看详情
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="workspace-panel composer-panel">
            <PanelTitle icon={Sparkles} title="创作草稿" meta="素材 + 模板 + 发布计划" />
            <div className="composer-toolbar">
              <label>
                <span>发布平台</span>
                <select value={selectedChannel} onChange={(event) => setSelectedChannel(event.target.value as Channel)}>
                  {channels.map((channel) => (
                    <option key={channel}>{channel}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>关联计划</span>
                <select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
                  {composerPlanItems.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.date} {plan.channel} {plan.theme}
                    </option>
                  ))}
                </select>
              </label>
              <button className="ghost-button" onClick={generateDraft}>
                <Sparkles size={16} />
                生成草稿
              </button>
            </div>

            <label className="field-stack">
              <span>标题</span>
              <input value={draftTitle} placeholder="输入这条内容的工作标题" onChange={(event) => setDraftTitle(event.target.value)} />
            </label>
            <label className="field-stack editor-field">
              <span>正文</span>
              <textarea
                value={draftCopy}
                placeholder="在这里写正文草稿；可先上传配图或视频，再存入内容池。"
                onChange={(event) => setDraftCopy(event.target.value)}
              />
            </label>
            <DraftMediaUploader
              media={draftMedia}
              isUploading={isUploading}
              onUpload={handleDraftMediaUpload}
              onRemove={(mediaId) => setDraftMedia((current) => current.filter((item) => item.id !== mediaId))}
            />
            <div className="composer-footer">
              <div>
                <strong>{selectedAsset.source}</strong>
                <span>
                  {selectedAsset.freshness} · {selectedTemplate.structure.length} 段结构
                </span>
              </div>
              <button className="primary-button" onClick={saveDraft} disabled={isMutating || isUploading}>
                <Plus size={18} />
                存入内容池
              </button>
            </div>
          </div>

          <PlanQueue
            currentUserName={currentUser?.displayName ?? ""}
            planItems={scopedPlanItems}
            planScope={planScope}
            selectedPlanId={selectedPlanId}
            totalPlanCount={planItems.length}
            userPlanCount={myPlanItems.length}
            onPlanScopeChange={setPlanScope}
            onSelectPlan={setSelectedPlanId}
          />
        </section>
      );
    }

    if (activeView === "assets") {
      return (
        <AssetLibraryView
          assets={filteredAssets}
          totalCount={assets.length}
          query={assetQuery}
          selectedAssetId={selectedAssetId}
          onQueryChange={setAssetQuery}
          onSelectAsset={(asset) => {
            setSelectedAssetId(asset.id);
            setActiveView("studio");
          }}
          onOpenDetail={(asset) => setDetailTarget({ kind: "asset", id: asset.id })}
        />
      );
    }

    if (activeView === "templates") {
      return (
        <TemplateLibraryView
          templates={filteredTemplates}
          totalCount={templates.length}
          query={templateQuery}
          selectedTemplateId={selectedTemplateId}
          onQueryChange={setTemplateQuery}
          onSelectTemplate={(template) => {
            setSelectedTemplateId(template.id);
            if (!template.channels.includes(selectedChannel)) setSelectedChannel(template.channels[0]);
            setActiveView("studio");
          }}
          onOpenDetail={(template) => setDetailTarget({ kind: "template", id: template.id })}
        />
      );
    }

    if (activeView === "content") {
      return (
        <section className="content-view">
          <div className="workspace-panel content-panel">
            <PanelTitle icon={FolderKanban} title="内容池" meta={`${filteredContent.length} 条内容记录`} />
            <div className="search-bar">
              <Search size={18} />
              <input
                value={searchTerm}
                placeholder="搜索标题、平台、状态、负责人"
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="content-table">
              {filteredContent.length ? (
                filteredContent.map((content) => (
                  <article className="content-row" key={content.id}>
                    <div className="content-main">
                      <span className={`status-pill ${statusClass[content.status]}`}>{content.status}</span>
                      <h3>{content.title}</h3>
                      <p>
                        {content.channel} · {content.owner} · {content.assetTitle} · {content.templateTitle}
                      </p>
                      <small className="time-note">
                        存入 {content.savedDate ?? "-"} {content.savedTime ?? ""} · 计划 {content.scheduledDate ?? content.publishDate}{" "}
                        {content.scheduledTime ?? content.publishTime} · 真实发布{" "}
                        {content.publishedAt ? `${content.publishDate} ${content.publishTime}` : "待平台回传"}
                      </small>
                      <MediaAttachmentStrip media={content.media ?? []} />
                    </div>
                    <MetricStrip metrics={content.metrics} />
                    <div className="row-actions">
                      <button onClick={() => publishAndSync(content.id)} disabled={isMutating}>
                        <RadioTower size={16} />
                        发布/同步
                      </button>
                      <button onClick={() => recordInteraction(content.id, "评论记录")} disabled={isMutating}>
                        <MessageSquareText size={16} />
                        评论
                      </button>
                      <button onClick={() => recordInteraction(content.id, "转发记录")} disabled={isMutating}>
                        <Repeat2 size={16} />
                        转发
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-state">
                  <FolderKanban size={22} />
                  <strong>内容池暂无记录</strong>
                  <span>保存第一条草稿后，这里会开始记录内容、附件和发布数据。</span>
                </div>
              )}
            </div>
          </div>

          <ActivityRail activities={liveActivities} />
        </section>
      );
    }

    if (activeView === "calendar") {
      return (
        <section className="calendar-view">
          <div className="workspace-panel calendar-panel">
            <PanelTitle
              icon={CalendarDays}
              title={calendarMode === "planned" ? "发布计划日历" : "已发布内容日历"}
              meta={calendarMode === "planned" ? "2026-05-09 至 2026-05-13" : `${publishedContents.length} 条已发布内容`}
            />
            <div className="calendar-switch" role="tablist" aria-label="日历视图切换">
              <button
                className={calendarMode === "planned" ? "active" : ""}
                onClick={() => setCalendarMode("planned")}
                role="tab"
                aria-selected={calendarMode === "planned"}
              >
                <CalendarDays size={16} />
                发布计划
              </button>
              <button
                className={calendarMode === "published" ? "active" : ""}
                onClick={() => setCalendarMode("published")}
                role="tab"
                aria-selected={calendarMode === "published"}
              >
                <Send size={16} />
                已发布内容
              </button>
            </div>

            {calendarMode === "planned" ? (
              <div className="calendar-board">
                {planItems.map((plan) => (
                  <article
                    className={`calendar-day ${selectedPlanId === plan.id ? "selected" : ""}`}
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <div className="date-block">
                      <strong>{plan.date.slice(5)}</strong>
                      <span>{plan.day}</span>
                    </div>
                    <span className={`status-pill ${statusClass[plan.status]}`}>{plan.status}</span>
                    <h3>{plan.theme}</h3>
                    <p>
                      {plan.slot} · {plan.channel} · {plan.owner}
                    </p>
                    <small>{plan.goal}</small>
                    <button onClick={() => markPlanDone(plan.id)} disabled={isMutating}>
                      <CheckCircle2 size={16} />
                      完成并更新
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="published-board">
                {publishedContents.length ? (
                  publishedContents.map((content) => (
                    <article className="published-card" key={content.id}>
                      <div className="published-date">
                        <strong>{content.publishDate.slice(5)}</strong>
                        <span>{formatDayLabel(content.publishDate)}</span>
                        <em>{content.publishTime}</em>
                      </div>
                      <div className="published-copy">
                        <span className={`status-pill ${statusClass[content.status]}`}>{content.channel}</span>
                        <h3>{content.title}</h3>
                        <p>
                          {content.owner} · {content.assetTitle} · {content.templateTitle}
                        </p>
                        <MediaAttachmentStrip media={content.media ?? []} compact />
                        <MetricStrip metrics={content.metrics} />
                      </div>
                      <button onClick={() => publishAndSync(content.id)} disabled={isMutating}>
                        <RadioTower size={16} />
                        同步数据
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <Send size={22} />
                    <strong>暂无已发布内容</strong>
                    <span>平台回传真实发布时间后，这里会显示发布历史。</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="workspace-panel checklist-panel">
            {calendarMode === "planned" ? (
              <>
                <PanelTitle icon={ListChecks} title="清单视图" meta="按负责人推进" />
                <div className="checklist">
                  {planItems.map((plan) => (
                    <label className="check-item" key={plan.id}>
                      <input
                        type="checkbox"
                        checked={plan.status === "已完成"}
                        onChange={() => markPlanDone(plan.id)}
                        disabled={isMutating}
                      />
                      <span>
                        <strong>{plan.theme}</strong>
                        <small>
                          {plan.date} {plan.slot} · {plan.channel} · {plan.owner}
                        </small>
                      </span>
                      <em>{plan.status}</em>
                    </label>
                  ))}
                </div>
              </>
            ) : (
              <>
                <PanelTitle icon={ListChecks} title="发布时间线" meta="按发布时间倒序" />
                <div className="published-timeline">
                  {publishedContents.length ? (
                    publishedContents.map((content) => (
                      <article className="timeline-item" key={content.id}>
                        <span>
                          {content.publishDate} {content.publishTime}
                        </span>
                        <strong>{content.title}</strong>
                        <small>
                          {content.channel} · {formatNumber(content.metrics.views)} 曝光 · {formatNumber(content.metrics.comments)} 评论
                        </small>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state compact-empty">
                      <Clock3 size={20} />
                      <strong>等待真实发布记录</strong>
                      <span>发布同步后自动生成时间线。</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      );
    }

    if (activeView === "profile") {
      if (!currentUser) return null;
      return <ProfileView currentUser={currentUser} accounts={accounts} isSaving={isMutating} onSave={saveProfile} />;
    }

    return (
      <section className="insights-view">
        <KpiPanel totalMetrics={totalMetrics} contentPool={contentPool} />
        <ActivityRail activities={liveActivities} wide />
      </section>
    );
  };

  if (!currentUser) {
    return (
      <LoginScreen
        accounts={accounts}
        error={appError}
        isLoading={isLoading}
        loginName={loginName}
        onLogin={handleLogin}
        onPickAccount={setLoginName}
        onLoginNameChange={setLoginName}
      />
    );
  }

  if (isLoading && assets.length === 0) {
    return (
      <main className="loading-shell">
        <div className="brand-mark">
          <span>VT</span>
          <div>
            <strong>VisionTree V2 内容工作台</strong>
            <small>正在连接七账号启动计划</small>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span>VT</span>
          <div>
            <strong>VisionTree V2 内容工作台</strong>
            <small>Seven-account launch OS</small>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeView === item.id ? "active" : ""}
                key={item.id}
                onClick={() => {
                  setDetailTarget(null);
                  setActiveView(item.id);
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <span>当前账号</span>
          <strong className="user-name">{currentUser.displayName}</strong>
          <button className="logout-button" onClick={logout}>
            退出登录
          </button>
          <span>本周计划完成率</span>
          <strong>{planItems.length ? Math.round((planItems.filter((plan) => plan.status === "已完成").length / planItems.length) * 100) : 0}%</strong>
          <div className="progress-track">
            <i
              style={{
                width: `${planItems.length ? (planItems.filter((plan) => plan.status === "已完成").length / planItems.length) * 100 : 0}%`
              }}
            />
          </div>
        </div>
      </aside>

      <section className="main-stage">
        <header className="topbar">
          <div>
            <span className="eyebrow">VisionTree V2 Launch OS</span>
            <h1>七个账号，六个人：让每个主页三秒内说清楚自己是谁</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" title="查看待办">
              <ClipboardList size={19} />
            </button>
            <button className="icon-button" title="团队协作">
              <UsersRound size={19} />
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setDetailTarget(null);
                setActiveView("studio");
              }}
            >
              <PenLine size={18} />
              新建内容
            </button>
          </div>
        </header>

        {appError && <div className="error-banner">{appError}</div>}

        <section className="metric-band">
          <MetricCard icon={Flame} label="启动素材热度" value={`${assets.length ? Math.max(...assets.map((asset) => asset.score)) : 0}`} tone="heat" />
          <MetricCard icon={FileText} label="内容池记录" value={`${contentPool.length}`} tone="paper" />
          <MetricCard icon={Clock3} label="我的待执行" value={`${visiblePendingPlanCount}`} tone="time" />
          <MetricCard icon={TrendingUp} label="累计曝光" value={formatNumber(totalMetrics.views)} tone="growth" />
        </section>

        {renderView()}
      </section>
    </main>
  );
}

function LoginScreen({
  accounts,
  error,
  isLoading,
  loginName,
  onLogin,
  onPickAccount,
  onLoginNameChange
}: {
  accounts: UserAccount[];
  error: string;
  isLoading: boolean;
  loginName: string;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onPickAccount: (accountName: string) => void;
  onLoginNameChange: (accountName: string) => void;
}) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark">
          <span>VT</span>
          <div>
            <strong>VisionTree V2 内容工作台</strong>
            <small>Seven-account launch OS</small>
          </div>
        </div>
        <div className="login-copy">
          <span className="eyebrow">Account Login</span>
          <h1>选择一个 VisionTree V2 账号进入系统</h1>
          <p>当前演示版不需要密码，仅允许 7 个账号登录。六个人负责具体账号，官方号负责把内容收拢到同一条叙事里。</p>
        </div>
        <form className="login-form" onSubmit={onLogin}>
          <label>
            <span>账号名</span>
            <input
              value={loginName}
              placeholder="例如 thinking-lab、milo、visiontree"
              onChange={(event) => onLoginNameChange(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={isLoading}>
            {isLoading ? "登录中" : "登录"}
          </button>
        </form>
        {error && <div className="error-banner">{error}</div>}
        <div className="account-grid">
          {accounts.map((account) => (
            <button key={account.accountName} onClick={() => onPickAccount(account.accountName)}>
              <strong>{account.displayName}</strong>
              <span>
                {account.accountName} · {account.handle ?? account.role}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function PanelTitle({ icon: Icon, title, meta }: { icon: typeof PenLine; title: string; meta: string }) {
  return (
    <div className="panel-title">
      <div>
        <Icon size={19} />
        <h2>{title}</h2>
      </div>
      <span>{meta}</span>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: typeof PenLine; label: string; value: string; tone: string }) {
  return (
    <article className={`metric-card ${tone}`}>
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function MetricStrip({ metrics }: { metrics: Metrics }) {
  return (
    <div className="metric-strip">
      <span>
        <MousePointer2 size={14} />
        {formatNumber(metrics.views)}
      </span>
      <span>赞 {formatNumber(metrics.likes)}</span>
      <span>评 {formatNumber(metrics.comments)}</span>
      <span>转 {formatNumber(metrics.shares)}</span>
      <span>藏 {formatNumber(metrics.saves)}</span>
    </div>
  );
}

function DraftMediaUploader({
  media,
  isUploading,
  onUpload,
  onRemove
}: {
  media: MediaAttachment[];
  isUploading: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (mediaId: string) => void;
}) {
  return (
    <div className="draft-media-section">
      <div className="draft-media-header">
        <div>
          <span>媒体附件</span>
          <strong>{media.length ? `${media.length} 个文件` : "图片 / 视频"}</strong>
        </div>
        <label className={`ghost-button upload-button ${isUploading ? "is-disabled" : ""}`}>
          <UploadCloud size={16} />
          {isUploading ? "上传中" : "上传"}
          <input type="file" accept="image/*,video/*" multiple onChange={onUpload} disabled={isUploading} />
        </label>
      </div>

      {media.length ? (
        <div className="draft-media-grid">
          {media.map((item) => (
            <article className="draft-media-card" key={item.id}>
              <div className="draft-media-thumb">
                {item.kind === "image" ? (
                  <img src={item.url} alt={item.name} />
                ) : (
                  <video src={item.url} muted preload="metadata" controls />
                )}
              </div>
              <div className="draft-media-copy">
                <span>
                  {item.kind === "image" ? <ImageIcon size={14} /> : <Video size={14} />}
                  {item.kind === "image" ? "图片" : "视频"}
                </span>
                <strong>{item.name}</strong>
                <small>{formatFileSize(item.size)}</small>
              </div>
              <button type="button" className="media-remove" title="移除附件" onClick={() => onRemove(item.id)}>
                <X size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="draft-media-empty">
          <ImageIcon size={18} />
          <span>暂无附件</span>
        </div>
      )}
    </div>
  );
}

function MediaAttachmentStrip({ media, compact = false }: { media: MediaAttachment[]; compact?: boolean }) {
  if (!media.length) return null;

  return (
    <div className={`media-strip ${compact ? "compact" : ""}`}>
      {media.map((item) => {
        const Icon = item.kind === "image" ? ImageIcon : Video;
        return (
          <a href={item.url} target="_blank" rel="noreferrer" key={item.id}>
            <Icon size={14} />
            <span>{item.name}</span>
          </a>
        );
      })}
    </div>
  );
}

function arrayToLines(items: string[] = []) {
  return items.join("\n");
}

function linesToArray(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function entriesToLines(entries: PersonaPrepProfile["writingEntries"] = []) {
  return entries.map((entry) => `${entry.title} | ${entry.structure}`).join("\n");
}

function linesToEntries(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => {
      const [title, ...rest] = line.split("|");
      return { title: title?.trim() ?? "", structure: rest.join("|").trim() };
    })
    .filter((entry) => entry.title && entry.structure);
}

function profileFormFromUser(user: UserAccount, profile: PersonaPrepProfile) {
  return {
    displayName: user.displayName,
    handle: user.handle ?? "",
    profileUrl: user.profileUrl ?? "",
    positioning: user.positioning ?? "",
    personaRole: user.personaRole ?? "",
    voice: arrayToLines(user.voice ?? []),
    contentTypes: arrayToLines(user.contentTypes ?? []),
    avoid: arrayToLines(user.avoid ?? []),
    cadence: user.cadence ?? "",
    interactionTarget: user.interactionTarget ?? "",
    roleLine: profile.roleLine,
    backgroundStory: profile.backgroundStory,
    writeFor: arrayToLines(profile.writeFor),
    doNotWrite: arrayToLines(profile.doNotWrite),
    driftRisks: arrayToLines(profile.driftRisks),
    styleNotes: arrayToLines(profile.styleNotes),
    signatureLines: arrayToLines(profile.signatureLines),
    writingEntries: entriesToLines(profile.writingEntries),
    referenceAccounts: arrayToLines(profile.referenceAccounts),
    weeklyFocus: profile.weeklyFocus
  };
}

function ProfileView({
  currentUser,
  accounts,
  isSaving,
  onSave
}: {
  currentUser: UserAccount;
  accounts: UserAccount[];
  isSaving: boolean;
  onSave: (accountName: string, payload: Partial<UserAccount>) => Promise<void>;
}) {
  const prep = currentUser.creatorProfile ?? personaPrepProfiles[currentUser.accountName] ?? defaultPersonaPrepProfile;
  const activeAccounts = accounts.length;
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [form, setForm] = useState(() => profileFormFromUser(currentUser, prep));

  useEffect(() => {
    setForm(profileFormFromUser(currentUser, currentUser.creatorProfile ?? personaPrepProfiles[currentUser.accountName] ?? defaultPersonaPrepProfile));
    setEditStatus("");
    setIsEditing(false);
  }, [currentUser]);

  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const creatorProfile: PersonaPrepProfile = {
      roleLine: form.roleLine.trim(),
      backgroundStory: form.backgroundStory.trim(),
      writeFor: linesToArray(form.writeFor),
      doNotWrite: linesToArray(form.doNotWrite),
      driftRisks: linesToArray(form.driftRisks),
      styleNotes: linesToArray(form.styleNotes),
      signatureLines: linesToArray(form.signatureLines),
      writingEntries: linesToEntries(form.writingEntries),
      referenceAccounts: linesToArray(form.referenceAccounts),
      weeklyFocus: form.weeklyFocus.trim()
    };
    await onSave(currentUser.accountName, {
      displayName: form.displayName.trim(),
      handle: form.handle.trim(),
      profileUrl: form.profileUrl.trim(),
      positioning: form.positioning.trim(),
      personaRole: form.personaRole.trim(),
      voice: linesToArray(form.voice),
      contentTypes: linesToArray(form.contentTypes),
      avoid: linesToArray(form.avoid),
      cadence: form.cadence.trim(),
      interactionTarget: form.interactionTarget.trim(),
      creatorProfile
    });
    setEditStatus("已保存到数据库");
    setIsEditing(false);
  };

  return (
    <section className="profile-view">
      <div className="workspace-panel profile-hero">
        <div className="profile-avatar">{currentUser.displayName.slice(0, 2)}</div>
        <div className="profile-copy">
          <span className="eyebrow">Creator Brief</span>
          <h2>{currentUser.displayName}</h2>
          <p>{currentUser.personaRole || "负责 VisionTree V2 七账号矩阵中的一个内容位置。"}</p>
          <div className="detail-meta">
            <span>{currentUser.positioning || currentUser.role}</span>
            <strong>
              {currentUser.platform || "X"} · {currentUser.handle || currentUser.accountName}
            </strong>
          </div>
        </div>
        <div className="profile-actions">
          <button className="ghost-button" type="button" onClick={() => setIsEditing((value) => !value)}>
            <PenLine size={17} />
            {isEditing ? "收起编辑" : "编辑主页"}
          </button>
          <a className="primary-button" href={currentUser.profileUrl || "#"} target="_blank" rel="noreferrer">
            <ExternalLink size={17} />
            打开 X 主页
          </a>
        </div>
      </div>

      {isEditing ? (
        <form className="workspace-panel profile-editor" onSubmit={submitProfile}>
          <PanelTitle icon={PenLine} title="编辑个人主页" meta="保存后写入数据库" />
          <div className="profile-editor-grid">
            <label>
              <span>展示名</span>
              <input value={form.displayName} onChange={(event) => updateField("displayName", event.target.value)} />
            </label>
            <label>
              <span>Handle</span>
              <input value={form.handle} onChange={(event) => updateField("handle", event.target.value)} />
            </label>
            <label className="wide-field">
              <span>X 主页链接</span>
              <input value={form.profileUrl} onChange={(event) => updateField("profileUrl", event.target.value)} />
            </label>
            <label className="wide-field">
              <span>账号定位</span>
              <input value={form.positioning} onChange={(event) => updateField("positioning", event.target.value)} />
            </label>
            <label className="wide-field">
              <span>矩阵角色说明</span>
              <textarea value={form.personaRole} onChange={(event) => updateField("personaRole", event.target.value)} rows={3} />
            </label>
            <label className="wide-field">
              <span>账号角色一句话</span>
              <textarea value={form.roleLine} onChange={(event) => updateField("roleLine", event.target.value)} rows={2} />
            </label>
            <label className="wide-field">
              <span>同类背景故事</span>
              <textarea value={form.backgroundStory} onChange={(event) => updateField("backgroundStory", event.target.value)} rows={3} />
            </label>
            <ProfileTextarea label="语气标签" value={form.voice} onChange={(value) => updateField("voice", value)} />
            <ProfileTextarea label="内容类型" value={form.contentTypes} onChange={(value) => updateField("contentTypes", value)} />
            <ProfileTextarea label="禁写边界" value={form.avoid} onChange={(value) => updateField("avoid", value)} />
            <ProfileTextarea label="适合写什么" value={form.writeFor} onChange={(value) => updateField("writeFor", value)} />
            <ProfileTextarea label="不适合写什么" value={form.doNotWrite} onChange={(value) => updateField("doNotWrite", value)} />
            <ProfileTextarea label="常见跑偏" value={form.driftRisks} onChange={(value) => updateField("driftRisks", value)} />
            <ProfileTextarea label="风格判断" value={form.styleNotes} onChange={(value) => updateField("styleNotes", value)} />
            <ProfileTextarea label="典型句式" value={form.signatureLines} onChange={(value) => updateField("signatureLines", value)} />
            <ProfileTextarea label="可参考账号" value={form.referenceAccounts} onChange={(value) => updateField("referenceAccounts", value)} />
            <label className="wide-field">
              <span>创作入口与栏目（每行：标题 | 结构）</span>
              <textarea value={form.writingEntries} onChange={(event) => updateField("writingEntries", event.target.value)} rows={5} />
            </label>
            <label className="wide-field">
              <span>本周优先</span>
              <textarea value={form.weeklyFocus} onChange={(event) => updateField("weeklyFocus", event.target.value)} rows={2} />
            </label>
            <label className="wide-field">
              <span>发布节奏</span>
              <textarea value={form.cadence} onChange={(event) => updateField("cadence", event.target.value)} rows={2} />
            </label>
            <label className="wide-field">
              <span>互动目标</span>
              <textarea value={form.interactionTarget} onChange={(event) => updateField("interactionTarget", event.target.value)} rows={2} />
            </label>
          </div>
          <div className="profile-editor-actions">
            {editStatus ? <span>{editStatus}</span> : <span>每个多值字段一行一条。</span>}
            <button type="button" onClick={() => setIsEditing(false)}>
              取消
            </button>
            <button className="primary-button" type="submit" disabled={isSaving}>
              <CheckCircle2 size={16} />
              保存到数据库
            </button>
          </div>
        </form>
      ) : null}

      <div className="workspace-panel profile-panel profile-brief-panel">
        <PanelTitle icon={BookOpenText} title="创作者速读" meta="30 秒进入角色" />
        <div className="profile-brief">
          <article className="profile-callout">
            <span>账号角色一句话</span>
            <strong>{prep.roleLine}</strong>
          </article>
          <article className="profile-story">
            <span>同类背景故事</span>
            <p>{prep.backgroundStory}</p>
          </article>
          <ProfileSection title="适合写什么" items={prep.writeFor} />
          <ProfileSection title="不适合写什么" items={prep.doNotWrite} />
          <ProfileSection title="常见跑偏" items={prep.driftRisks} />
        </div>
      </div>

      <div className="workspace-panel profile-panel">
        <PanelTitle icon={PenLine} title="内容风格与语气" meta="写作判断" />
        <div className="profile-style-board">
          <ProfileSection title="API 语气标签" items={currentUser.voice ?? []} />
          <ProfileSection title="风格判断" items={prep.styleNotes} />
          <ProfileSection title="典型句式" items={prep.signatureLines} />
        </div>
      </div>

      <div className="workspace-panel profile-panel">
        <PanelTitle icon={LayoutTemplate} title="创作入口与栏目" meta="从这里开写" />
        <div className="profile-entry-list">
          {prep.writingEntries.map((entry) => (
            <article key={entry.title}>
              <span>{entry.title}</span>
              <strong>{entry.structure}</strong>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel profile-panel">
        <PanelTitle icon={RadioTower} title="本周创作抓手" meta="发布与互动" />
        <div className="profile-ops">
          <article>
            <span>本周优先</span>
            <strong>{prep.weeklyFocus}</strong>
          </article>
          <article>
            <span>发布节奏</span>
            <strong>{currentUser.cadence || "待配置"}</strong>
          </article>
          <article>
            <span>互动目标</span>
            <strong>{currentUser.interactionTarget || "待配置"}</strong>
          </article>
        </div>
      </div>

      <div className="workspace-panel profile-panel">
        <PanelTitle icon={FileSearch} title="可参考账号" meta="真实账号占位" />
        <div className="profile-reference-grid">
          {prep.referenceAccounts.map((account) => (
            <article key={account}>
              <span>{account}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel profile-roster">
        <PanelTitle icon={UsersRound} title="账号矩阵差异" meta={`${activeAccounts} 个账号 · 防止写串号`} />
        <div className="persona-grid">
          {accounts.map((account) => {
            const accountPrep = personaPrepProfiles[account.accountName] ?? defaultPersonaPrepProfile;
            return (
              <article className={account.accountName === currentUser.accountName ? "active" : ""} key={account.accountName}>
                <strong>{account.displayName}</strong>
                <span>{account.positioning || account.role}</span>
                <small>最该写：{accountPrep.writeFor.slice(0, 2).join(" / ")}</small>
                <small>最不该写：{accountPrep.doNotWrite.slice(0, 2).join(" / ")}</small>
                <em>{account.accountName === currentUser.accountName ? "当前账号" : `区别：${accountPrep.roleLine}`}</em>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProfileSection({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="profile-section">
      <span>{title}</span>
      <div className="tag-row">
        {items.length ? items.map((item) => <span key={item}>{item}</span>) : <span>待配置</span>}
      </div>
    </article>
  );
}

function ProfileTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
    </label>
  );
}

function AssetLibraryView({
  assets,
  totalCount,
  query,
  selectedAssetId,
  onQueryChange,
  onSelectAsset,
  onOpenDetail
}: {
  assets: Asset[];
  totalCount: number;
  query: string;
  selectedAssetId: string;
  onQueryChange: (query: string) => void;
  onSelectAsset: (asset: Asset) => void;
  onOpenDetail: (asset: Asset) => void;
}) {
  return (
    <section className="library-view">
      <div className="workspace-panel library-panel">
        <PanelTitle icon={GalleryHorizontalEnd} title="素材池" meta={`${assets.length} / ${totalCount} 个素材`} />
        <div className="library-toolbar">
          <label className="search-bar library-search">
            <Search size={17} />
            <input
              value={query}
              placeholder="搜索素材标题、主题、标签或来源"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
          <div className="library-stat">
            <span>当前选中</span>
            <strong>{assets.find((asset) => asset.id === selectedAssetId)?.title ?? "未在筛选结果中"}</strong>
          </div>
        </div>

        {assets.length ? (
          <div className="library-results asset-library-grid">
            {assets.map((asset) => {
              const visibleTags = asset.tags.slice(0, 3);
              const hiddenTagCount = Math.max(0, asset.tags.length - visibleTags.length);

              return (
                <article
                  className={`asset-card ${asset.palette} ${selectedAssetId === asset.id ? "selected" : ""}`}
                  key={asset.id}
                  onClick={() => onSelectAsset(asset)}
                >
                  <span className="asset-poster" aria-hidden="true">
                    <span>{asset.theme.slice(0, 2)}</span>
                  </span>
                  <span className="asset-body">
                    <span className="row-between">
                      <strong className="asset-title" title={asset.title}>
                        {truncateText(asset.title, 24)}
                      </strong>
                      <em>{asset.score}</em>
                    </span>
                    <span className="usage-count">已发布引用 {asset.referenceCount ?? 0} 次</span>
                    <span className="asset-summary" title={asset.summary}>
                      {asset.summary}
                    </span>
                    <span className="tag-row asset-tag-row" title={asset.tags.join(" / ")}>
                      {visibleTags.map((tag) => (
                        <span key={tag}>{truncateText(tag, 10)}</span>
                      ))}
                      {hiddenTagCount > 0 && <span className="tag-overflow">+{hiddenTagCount}</span>}
                    </span>
                    <span className="library-card-actions">
                      <button
                        className="primary-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSelectAsset(asset);
                        }}
                      >
                        <Plus size={15} />
                        取用
                      </button>
                      <button
                        className="ghost-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenDetail(asset);
                        }}
                      >
                        <FileSearch size={15} />
                        详情
                      </button>
                    </span>
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={22} />
            <strong>没有匹配的素材</strong>
            <span>换一个标题、主题、标签或来源试试。</span>
          </div>
        )}
      </div>
    </section>
  );
}

function TemplateLibraryView({
  templates,
  totalCount,
  query,
  selectedTemplateId,
  onQueryChange,
  onSelectTemplate,
  onOpenDetail
}: {
  templates: Template[];
  totalCount: number;
  query: string;
  selectedTemplateId: string;
  onQueryChange: (query: string) => void;
  onSelectTemplate: (template: Template) => void;
  onOpenDetail: (template: Template) => void;
}) {
  return (
    <section className="library-view">
      <div className="workspace-panel library-panel">
        <PanelTitle icon={LayoutTemplate} title="格式模板" meta={`${templates.length} / ${totalCount} 个模板`} />
        <div className="library-toolbar">
          <label className="search-bar library-search">
            <Search size={17} />
            <input
              value={query}
              placeholder="搜索模板名称、结构、平台或格式"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
          <div className="library-stat">
            <span>当前选中</span>
            <strong>{templates.find((template) => template.id === selectedTemplateId)?.title ?? "未在筛选结果中"}</strong>
          </div>
        </div>

        {templates.length ? (
          <div className="library-results template-library-grid">
            {templates.map((template) => (
              <article
                className={`template-card ${selectedTemplateId === template.id ? "selected" : ""}`}
                key={template.id}
                onClick={() => onSelectTemplate(template)}
              >
                <span className="template-type">{template.format}</span>
                <strong>{template.title}</strong>
                <span className="usage-count">已发布引用 {template.referenceCount ?? 0} 次</span>
                <span>{template.hook}</span>
                <small>{template.channels.join(" / ")}</small>
                <div className="structure-list">
                  {template.structure.map((step) => (
                    <span key={step}>{step}</span>
                  ))}
                </div>
                <span className="library-card-actions">
                  <button
                    className="primary-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectTemplate(template);
                    }}
                  >
                    <Plus size={15} />
                    套用
                  </button>
                  <button
                    className="ghost-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenDetail(template);
                    }}
                  >
                    <FileSearch size={15} />
                    详情
                  </button>
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Search size={22} />
            <strong>没有匹配的模板</strong>
            <span>换一个名称、结构、平台或格式试试。</span>
          </div>
        )}
      </div>
    </section>
  );
}

function DetailView({
  kindLabel,
  title,
  subtitle,
  badge,
  summary,
  tags,
  notes,
  resources,
  primaryActionLabel,
  onBack,
  onPrimaryAction
}: {
  kindLabel: string;
  title: string;
  subtitle: string;
  badge: string;
  summary: string;
  tags: string[];
  notes: string[];
  resources: ResourceLink[];
  primaryActionLabel: string;
  onBack: () => void;
  onPrimaryAction: () => void;
}) {
  const [activeResourceId, setActiveResourceId] = useState(resources[0]?.id ?? "");
  const activeResource = resources.find((resource) => resource.id === activeResourceId) ?? resources[0];

  return (
    <section className="detail-view">
      <div className="workspace-panel detail-hero">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={17} />
          返回
        </button>
        <div className="detail-hero-copy">
          <span className="eyebrow">{kindLabel}</span>
          <h2>{title}</h2>
          <p>{summary}</p>
          <div className="detail-meta">
            <span>{subtitle}</span>
            <strong>{badge}</strong>
          </div>
          <div className="tag-row">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
        <button className="primary-button" onClick={onPrimaryAction}>
          <Plus size={18} />
          {primaryActionLabel}
        </button>
      </div>

      <div className="workspace-panel detail-notes">
        <PanelTitle icon={BookOpenText} title="创作提示" meta={`${notes.length} 条`} />
        <div className="note-list">
          {notes.map((note) => (
            <article key={note}>
              <span />
              <p>{note}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel resource-panel">
        <PanelTitle icon={FileSearch} title="来源资料" meta={`${resources.length} 个链接 / PDF`} />
        {activeResource ? (
          <div className="resource-layout">
            <div className="resource-list">
              {resources.map((resource) => {
                const Icon = resource.kind === "pdf" ? FileText : Globe2;
                return (
                  <button
                    className={`resource-item ${activeResource.id === resource.id ? "active" : ""}`}
                    key={resource.id}
                    onClick={() => setActiveResourceId(resource.id)}
                  >
                    <Icon size={18} />
                    <span>
                      <strong>{resource.title}</strong>
                      <small>
                        {resource.source} · {resource.updated}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="resource-preview">
              <div className="preview-topline">
                <span className={`status-pill ${activeResource.kind === "pdf" ? "accent" : "success"}`}>
                  {activeResource.kind === "pdf" ? "PDF" : "网页"}
                </span>
                <a href={activeResource.url} target="_blank" rel="noreferrer">
                  打开原链接
                  <ExternalLink size={15} />
                </a>
              </div>

              {activeResource.kind === "web" ? (
                <div className="web-frame">
                  <div className="browser-strip">
                    <i />
                    <i />
                    <i />
                    <span>{activeResource.url}</span>
                  </div>
                  <div className="web-document">
                    <span>网页摘要</span>
                    <h3>{activeResource.title}</h3>
                    <p>{activeResource.summary}</p>
                    <div className="web-lines">
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pdf-frame">
                  <div className="pdf-page">
                    <span>PDF</span>
                    <h3>{activeResource.title}</h3>
                    <p>{activeResource.summary}</p>
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="pdf-thumbs">
                    <span>01</span>
                    <span>02</span>
                    <span>03</span>
                  </div>
                </div>
              )}

              <div className="highlight-list">
                {activeResource.highlights.map((highlight) => (
                  <article key={highlight}>
                    <CheckCircle2 size={16} />
                    <span>{highlight}</span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <FileSearch size={22} />
            <strong>暂无配套资料</strong>
            <span>这个条目还没有录入网页链接或 PDF。</span>
          </div>
        )}
      </div>
    </section>
  );
}

function PlanQueue({
  currentUserName,
  planItems,
  planScope,
  selectedPlanId,
  totalPlanCount,
  userPlanCount,
  onPlanScopeChange,
  onSelectPlan
}: {
  currentUserName: string;
  planItems: PlanItem[];
  planScope: PlanScope;
  selectedPlanId: string;
  totalPlanCount: number;
  userPlanCount: number;
  onPlanScopeChange: (scope: PlanScope) => void;
  onSelectPlan: (id: string) => void;
}) {
  return (
    <div className="workspace-panel queue-panel">
      <PanelTitle icon={CalendarDays} title="待执行计划" meta={planScope === "mine" ? `${currentUserName} 的计划` : "全部账号计划"} />
      <div className="queue-toolbar">
        <button className={planScope === "mine" ? "active" : ""} onClick={() => onPlanScopeChange("mine")}>
          我的计划
          <span>{userPlanCount}</span>
        </button>
        <button className={planScope === "all" ? "active" : ""} onClick={() => onPlanScopeChange("all")}>
          全部计划
          <span>{totalPlanCount}</span>
        </button>
      </div>
      <div className="queue-list">
        {planItems.length ? (
          planItems.map((plan) => (
            <button
              className={`queue-item ${selectedPlanId === plan.id ? "selected" : ""}`}
              key={plan.id}
              onClick={() => onSelectPlan(plan.id)}
            >
              <span className={`status-dot ${statusClass[plan.status]}`} />
              <span>
                <strong>{plan.theme}</strong>
                <small>
                  {plan.date} {plan.slot} · {plan.channel}
                </small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))
        ) : (
          <div className="queue-empty">
            <CalendarDays size={20} />
            <strong>当前账号暂无待执行计划</strong>
            <span>切换到全部计划可以查看其他账号的安排。</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityRail({
  activities,
  wide = false
}: {
  activities: Array<Activity & { contentTitle: string; channel: Channel }>;
  wide?: boolean;
}) {
  return (
    <div className={`workspace-panel activity-panel ${wide ? "wide" : ""}`}>
      <PanelTitle icon={RadioTower} title="数据与互动记录" meta={`${activities.length} 条最近活动`} />
      <div className="activity-list">
        {activities.length ? (
          activities.map((activity) => (
            <article className="activity-item" key={activity.id}>
              <span>{activity.type}</span>
              <strong>{activity.contentTitle}</strong>
              <p>{activity.note}</p>
              <small>
                {activity.channel} · {activity.time}
              </small>
            </article>
          ))
        ) : (
          <div className="empty-state compact-empty">
            <RadioTower size={20} />
            <strong>暂无活动记录</strong>
            <span>保存草稿、发布同步或记录互动后，这里会自动更新。</span>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiPanel({ totalMetrics, contentPool }: { totalMetrics: Metrics; contentPool: ContentItem[] }) {
  const publishedCount = contentPool.filter((content) => content.status === "已发布").length;
  const engagement =
    totalMetrics.views === 0
      ? "0%"
      : `${(((totalMetrics.likes + totalMetrics.comments + totalMetrics.shares + totalMetrics.saves) / totalMetrics.views) * 100).toFixed(1)}%`;

  return (
    <div className="workspace-panel insight-panel">
      <PanelTitle icon={BarChart3} title="矩阵表现" meta="发布后持续更新" />
      <div className="insight-grid">
        <article>
          <span>累计曝光</span>
          <strong>{formatNumber(totalMetrics.views)}</strong>
        </article>
        <article>
          <span>互动率</span>
          <strong>{engagement}</strong>
        </article>
        <article>
          <span>已发布内容</span>
          <strong>{publishedCount}</strong>
        </article>
        <article>
          <span>收藏总数</span>
          <strong>{formatNumber(totalMetrics.saves)}</strong>
        </article>
      </div>
      <div className="channel-bars">
        {channels.map((channel) => {
          const channelViews = contentPool
            .filter((content) => content.channel === channel)
            .reduce((sum, content) => sum + content.metrics.views, 0);
          const width = totalMetrics.views ? Math.max(8, Math.round((channelViews / totalMetrics.views) * 100)) : 0;
          return (
            <div className="channel-bar" key={channel}>
              <span>{channel}</span>
              <i>
                <b style={{ width: `${width}%` }} />
              </i>
              <em>{formatNumber(channelViews)}</em>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
