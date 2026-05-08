import { FormEvent, useEffect, useMemo, useState } from "react";
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
  UsersRound
} from "lucide-react";

type Channel = "X" | "抖音" | "小红书" | "公众号" | "视频号" | "B站" | "微博" | "LinkedIn";
type ContentStatus = "草稿" | "审核中" | "已排期" | "已发布";
type PlanStatus = "待领取" | "制作中" | "待发布" | "已完成";
type ViewKey = "studio" | "assets" | "templates" | "content" | "calendar" | "insights" | "profile";
type CalendarMode = "planned" | "published";
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
};

type BootstrapData = {
  user: UserAccount;
  accounts: UserAccount[];
  assets: Asset[];
  templates: Template[];
  contentPool: ContentItem[];
  planItems: PlanItem[];
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

type ContentItem = {
  id: string;
  title: string;
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

const channels: Channel[] = ["X", "LinkedIn", "小红书", "公众号", "视频号", "B站", "微博"];

const fallbackAssets: Asset[] = [
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

const fallbackTemplates: Template[] = [
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

const fallbackContents: ContentItem[] = [
  {
    id: "c1",
    title: "我们把一条视频改了 6 次，播放才破万",
    channel: "抖音",
    status: "已发布",
    assetTitle: "AI 视频脚本复盘素材",
    templateTitle: "短视频脚本：问题到结果",
    owner: "Mia",
    publishDate: "2026-05-07",
    publishTime: "18:20",
    metrics: { views: 28600, likes: 1460, comments: 183, shares: 92, saves: 614 },
    activities: [
      { id: "act1", type: "数据同步", note: "曝光 +12%，评论集中在脚本结构。", time: "09:30" },
      { id: "act2", type: "评论记录", note: "置顶了高赞问题，准备二创答疑。", time: "11:12" }
    ]
  },
  {
    id: "c2",
    title: "五月第一周账号矩阵内容表现",
    channel: "公众号",
    status: "已排期",
    assetTitle: "五月内容增长周报",
    templateTitle: "数据周报轮播",
    owner: "Jun",
    publishDate: "2026-05-10",
    publishTime: "20:30",
    metrics: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
    activities: [{ id: "act3", type: "状态更新", note: "已通过审核，等待发布。", time: "昨天" }]
  },
  {
    id: "c3",
    title: "评论区问得最多的 5 个问题",
    channel: "小红书",
    status: "草稿",
    assetTitle: "用户评论高频问题",
    templateTitle: "评论区答疑合集",
    owner: "Hao",
    publishDate: "2026-05-09",
    publishTime: "10:00",
    metrics: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 },
    activities: [{ id: "act4", type: "状态更新", note: "初稿已进入内容池。", time: "13:05" }]
  }
];

const fallbackPlan: PlanItem[] = [
  {
    id: "p1",
    date: "2026-05-09",
    day: "周六",
    slot: "10:00",
    channel: "小红书",
    theme: "评论区答疑合集",
    owner: "Hao",
    goal: "拉升收藏",
    status: "制作中",
    contentId: "c3"
  },
  {
    id: "p2",
    date: "2026-05-10",
    day: "周日",
    slot: "20:30",
    channel: "公众号",
    theme: "矩阵周报复盘",
    owner: "Jun",
    goal: "管理层同步",
    status: "待发布",
    contentId: "c2"
  },
  {
    id: "p3",
    date: "2026-05-11",
    day: "周一",
    slot: "12:15",
    channel: "抖音",
    theme: "脚本改稿过程",
    owner: "Mia",
    goal: "提高完播",
    status: "待领取"
  },
  {
    id: "p4",
    date: "2026-05-12",
    day: "周二",
    slot: "18:00",
    channel: "视频号",
    theme: "品牌幕后混剪",
    owner: "Lena",
    goal: "建立信任",
    status: "待领取"
  },
  {
    id: "p5",
    date: "2026-05-13",
    day: "周三",
    slot: "09:40",
    channel: "微博",
    theme: "增长数据快评",
    owner: "Jun",
    goal: "话题互动",
    status: "待领取"
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
  const [selectedTemplateId, setSelectedTemplateId] = useState(fallbackTemplates[1].id);
  const [selectedPlanId, setSelectedPlanId] = useState(fallbackPlan[2].id);
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
  const [draftTitle, setDraftTitle] = useState("把一个普通素材拆成 4 条矩阵内容");
  const [draftCopy, setDraftCopy] = useState(
    "开场：很多团队不是缺内容，而是缺一套把素材变成矩阵资产的方法。\n\n主体：从素材池选择原始信息，套用适配平台的格式模板，生成初稿后进入内容池；发布后再回收评论、转发和数据表现。\n\n收束：下一个动作，是把这条内容关联到本周的发布计划。"
  );

  const applyBootstrap = (data: BootstrapData) => {
    setCurrentUser(data.user);
    setAccounts(data.accounts);
    setAssets(data.assets);
    setTemplates(data.templates);
    setContentPool(data.contentPool);
    setPlanItems(data.planItems);
    setSelectedAssetId((current) => (data.assets.some((asset) => asset.id === current) ? current : data.assets[0]?.id ?? fallbackAssets[0].id));
    setSelectedTemplateId((current) =>
      data.templates.some((template) => template.id === current) ? current : data.templates[0]?.id ?? fallbackTemplates[0].id
    );
    setSelectedPlanId((current) => (data.planItems.some((plan) => plan.id === current) ? current : data.planItems[0]?.id ?? fallbackPlan[0].id));
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
    setDetailTarget(null);
    localStorage.removeItem("content-system-token");
    localStorage.removeItem("content-system-user");
  };

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? assets[0] ?? fallbackAssets[0];
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? fallbackTemplates[0];

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
      [content.title, content.channel, content.status, content.owner, content.assetTitle, content.templateTitle]
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
          assetId: selectedAsset.id,
          templateId: selectedTemplate.id,
          planId: selectedPlan.id
        })
      });
      applyBootstrap(data);
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
                  {planItems.map((plan) => (
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
              <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} />
            </label>
            <label className="field-stack editor-field">
              <span>正文</span>
              <textarea value={draftCopy} onChange={(event) => setDraftCopy(event.target.value)} />
            </label>
            <div className="composer-footer">
              <div>
                <strong>{selectedAsset.source}</strong>
                <span>
                  {selectedAsset.freshness} · {selectedTemplate.structure.length} 段结构
                </span>
              </div>
              <button className="primary-button" onClick={saveDraft} disabled={isMutating}>
                <Plus size={18} />
                存入内容池
              </button>
            </div>
          </div>

          <PlanQueue planItems={planItems} selectedPlanId={selectedPlanId} onSelectPlan={setSelectedPlanId} />
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
              {filteredContent.map((content) => (
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
              ))}
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
                {publishedContents.map((content) => (
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
                      <MetricStrip metrics={content.metrics} />
                    </div>
                    <button onClick={() => publishAndSync(content.id)} disabled={isMutating}>
                      <RadioTower size={16} />
                      同步数据
                    </button>
                  </article>
                ))}
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
                  {publishedContents.map((content) => (
                    <article className="timeline-item" key={content.id}>
                      <span>
                        {content.publishDate} {content.publishTime}
                      </span>
                      <strong>{content.title}</strong>
                      <small>
                        {content.channel} · {formatNumber(content.metrics.views)} 曝光 · {formatNumber(content.metrics.comments)} 评论
                      </small>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      );
    }

    if (activeView === "profile") {
      if (!currentUser) return null;
      return <ProfileView currentUser={currentUser} accounts={accounts} />;
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
            <strong>VisionTree 内容工作台</strong>
            <small>正在连接认知内容库</small>
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
            <strong>VisionTree 内容工作台</strong>
            <small>Content OS</small>
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
            <span className="eyebrow">VisionTree Content OS</span>
            <h1>让每个账号围绕同一条认知叙事，各自说出不同的人话</h1>
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
          <MetricCard icon={Flame} label="素材热度" value={`${assets.length ? Math.max(...assets.map((asset) => asset.score)) : 0}`} tone="heat" />
          <MetricCard icon={FileText} label="内容池记录" value={`${contentPool.length}`} tone="paper" />
          <MetricCard icon={Clock3} label="待执行计划" value={`${planItems.filter((plan) => plan.status !== "已完成").length}`} tone="time" />
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
            <strong>VisionTree 内容工作台</strong>
            <small>Content OS</small>
          </div>
        </div>
        <div className="login-copy">
          <span className="eyebrow">Persona Login</span>
          <h1>选择一个 VisionTree 内容人格进入系统</h1>
          <p>当前演示版不需要密码，仅允许 6 个 persona 账号登录。每个账号负责一条不同的叙事边界。</p>
        </div>
        <form className="login-form" onSubmit={onLogin}>
          <label>
            <span>账号名</span>
            <input
              value={loginName}
              placeholder="例如 milo、nora、eli"
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

function ProfileView({ currentUser, accounts }: { currentUser: UserAccount; accounts: UserAccount[] }) {
  return (
    <section className="profile-view">
      <div className="workspace-panel profile-hero">
        <div className="profile-avatar">{currentUser.displayName.slice(0, 2)}</div>
        <div className="profile-copy">
          <span className="eyebrow">Persona Home</span>
          <h2>{currentUser.displayName}</h2>
          <p>{currentUser.personaRole || "负责 VisionTree 内容矩阵中的一个叙事角色。"}</p>
          <div className="detail-meta">
            <span>{currentUser.positioning || currentUser.role}</span>
            <strong>
              {currentUser.platform || "X"} · {currentUser.handle || currentUser.accountName}
            </strong>
          </div>
        </div>
        <a className="primary-button" href={currentUser.profileUrl || "#"} target="_blank" rel="noreferrer">
          <ExternalLink size={17} />
          打开 X 主页
        </a>
      </div>

      <div className="workspace-panel profile-panel">
        <PanelTitle icon={BookOpenText} title="人设信息" meta="内容边界" />
        <div className="profile-sections">
          <ProfileSection title="语气" items={currentUser.voice ?? []} />
          <ProfileSection title="内容类型" items={currentUser.contentTypes ?? []} />
          <ProfileSection title="不要写" items={currentUser.avoid ?? []} />
        </div>
      </div>

      <div className="workspace-panel profile-panel">
        <PanelTitle icon={RadioTower} title="账号运营" meta="X 示例" />
        <div className="profile-ops">
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

      <div className="workspace-panel profile-roster">
        <PanelTitle icon={UsersRound} title="账号矩阵" meta={`${accounts.length} 个 persona`} />
        <div className="persona-grid">
          {accounts.map((account) => (
            <article className={account.accountName === currentUser.accountName ? "active" : ""} key={account.accountName}>
              <strong>{account.displayName}</strong>
              <span>{account.positioning || account.role}</span>
              <small>
                {account.platform || "X"} · {account.handle || account.accountName}
              </small>
            </article>
          ))}
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
            {assets.map((asset) => (
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
                    <strong>{asset.title}</strong>
                    <em>{asset.score}</em>
                  </span>
                  <span className="usage-count">已发布引用 {asset.referenceCount ?? 0} 次</span>
                  <span className="asset-summary">{asset.summary}</span>
                  <span className="tag-row">
                    {asset.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
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
            ))}
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

  if (!activeResource) return null;

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
      </div>
    </section>
  );
}

function PlanQueue({
  planItems,
  selectedPlanId,
  onSelectPlan
}: {
  planItems: PlanItem[];
  selectedPlanId: string;
  onSelectPlan: (id: string) => void;
}) {
  return (
    <div className="workspace-panel queue-panel">
      <PanelTitle icon={CalendarDays} title="待执行计划" meta="创作者实时可见" />
      <div className="queue-list">
        {planItems.map((plan) => (
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
        ))}
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
        {activities.map((activity) => (
          <article className="activity-item" key={activity.id}>
            <span>{activity.type}</span>
            <strong>{activity.contentTitle}</strong>
            <p>{activity.note}</p>
            <small>
              {activity.channel} · {activity.time}
            </small>
          </article>
        ))}
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
          const width = totalMetrics.views ? Math.max(8, Math.round((channelViews / totalMetrics.views) * 100)) : 8;
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
