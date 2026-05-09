export const narrativeThemeAssets = [
  {
    id: "narrative-cognitive-agency",
    title: "AI 不是省脑工具：判断力需要被保留和训练",
    theme: "认知主权与判断力",
    source: "叙事主题重组 / 原始素材聚合",
    format: "叙事主题素材包",
    freshness: "2026-05-09",
    score: 96,
    tags: ["认知增强", "判断力", "思考外包", "批判性思考", "普通人体验"],
    summary:
      "核心观点：AI 会放大使用者原本的学习姿态。把 AI 当代写、代想、代整理，会削弱批判性思考；把 AI 当陪练、反方和对照物，才可能训练判断力。可用于解释 VisionTree 为什么强调“保留用户判断位置”，而不是替用户输出结论。",
    owner: "VisionTree",
    palette: "amber",
    notes: [
      "适合用于官方定义、Eli 慢概念、Nora 真实体验和 AI Doubt 短评。",
      "论证结构：便利诱惑 -> 判断外包 -> 答案趋同 -> 先想、对照、反驳、再使用 AI。",
      "可落到行动建议：先自己列要点，再让 AI 改写；要求 AI 给反方观点；重要任务先做个人版本再对比。",
      "不要写成“用 AI 一定变笨”；准确表达是懒惰使用会削弱思考，主动使用会放大学习能力。"
    ],
    resources: [
      sourceResource("narrative-cognitive-agency-source-1", "用ai会变笨吗", "web", "/vt-assets/notes/vtlib-284d716bb25b06.txt", "支撑 AI 使用方式会影响批判性思考与答案多样性的论证。"),
      sourceResource("narrative-cognitive-agency-source-2", "同事.skill 的尽头，是把人生外包给 AI", "web", "https://mp.weixin.qq.com/s?scene=312&subscene=318&__biz=MjM5MjAyNDUyMA%3D%3D&mid=2651086498&idx=1&underline_version=0&sn=88bf824c4495190cee68bdeacc732fc5&item_show_type=0&share_id=1775285791022&fromsharesource=underline&contentMd5=09eb1a155d848ee863b59877a401f5cb&start=651&end=757&forbidShowSource=0&ascene=101", "支撑“人生/同事技能外包给 AI”的反面叙事入口。"),
      sourceResource("narrative-cognitive-agency-source-3", "《元认知教育》.pdf", "pdf", "/vt-assets/files/vtlib-486bf05204effe.pdf", "支撑元认知、学习者自我监控和判断训练的教育背景。"),
      sourceResource("narrative-cognitive-agency-source-4", "记忆.jpeg", "web", "/vt-assets/files/vtlib-8163f5af49357b.jpeg", "可作为记忆、思考痕迹或认知沉淀的视觉素材。"),
      sourceResource("narrative-cognitive-agency-source-5", "呆bot定律", "web", "/vt-assets/notes/vtlib-5f296b30e55375.txt", "可作为组织中能力错配、低效协作与判断退化的侧面案例。")
    ]
  },
  {
    id: "narrative-verification-over-citation",
    title: "有引用不等于可信：AI 答案需要二次验证",
    theme: "信息可信度与验证习惯",
    source: "叙事主题重组 / 原始素材聚合",
    format: "叙事主题素材包",
    freshness: "2026-05-09",
    score: 95,
    tags: ["AI搜索", "引用幻觉", "交叉验证", "信息判断", "两次点击法则"],
    summary:
      "核心观点：带引用来源的 AI 回答可能更危险，因为引用格式会快速抬高人的信任感，但用户往往不会真的点开核对。AI 搜索把人从主动导航者变成被动接收者，重要决策必须保留交叉验证动作。",
    owner: "AI Doubt Notes",
    palette: "cyan",
    notes: [
      "适合 AI Doubt 做短、刺、有事实的怀疑帖，也适合 Thinking Lab 做“两次点击法则”互动实验。",
      "论证结构：引用带来信任感 -> 零点击率上升 -> 信息多样性下降 -> 重要问题至少打开两个原始来源。",
      "可用于 VisionTree 的机制解释：不是给一个更像真的答案，而是在关键节点让用户停下来判断。",
      "不要写成所有 AI 搜索都不可信；重点是高风险场景不能只看 AI 摘要。"
    ],
    resources: [
      sourceResource("narrative-verification-over-citation-source-1", "帶引用來源的AI更危險", "web", "/vt-assets/notes/vtlib-d9ed0490a21662.txt", "主素材：AI 搜索、引用信任、零点击、长尾内容与两次点击法则。"),
      sourceResource("narrative-verification-over-citation-source-2", "AI选择说谎？竟是为了不让同伴被关闭..", "web", "/vt-assets/notes/vtlib-21a6b2f92441dd.txt", "支撑模型可能出现非预期行为，不能把表面顺从当成可靠性的论点。"),
      sourceResource("narrative-verification-over-citation-source-3", "纪要_AI精神病.pdf", "pdf", "/vt-assets/files/vtlib-61b5844fc8cea8.pdf", "支撑过度依赖 AI 回答可能造成心理与判断风险的讨论。")
    ]
  },
  {
    id: "narrative-agent-limits",
    title: "Agent 不是越多越好：自主协作需要边界和调度",
    theme: "Agent 协作边界",
    source: "叙事主题重组 / 原始素材聚合",
    format: "叙事主题素材包",
    freshness: "2026-05-09",
    score: 92,
    tags: ["Agent", "多智能体", "协作边界", "调度", "工程取舍"],
    summary:
      "核心观点：Agent 的价值不在堆数量，而在清晰任务边界、线性调度和责任收敛。多 Agent 平行讨论容易变成无止境开会；有效系统更像有明确负责人收集信息、拆任务、指派和整合。",
    owner: "Milo Reed",
    palette: "mint",
    notes: [
      "适合 Milo 写工程取舍，也适合 AI Doubt 拆解 Agent 神话。",
      "论证结构：多 Agent 并行看似高级 -> 实际可能互相开会 -> Boss Agent 应收敛信息和决策 -> 专业模型分工比通才混战更有效。",
      "可以连接 VisionTree：好的 AI 协作不是替人决策，而是把人的判断位置放在调度和边界设计上。",
      "不要写成 VisionTree 已经拥有成熟多 Agent 编排平台。"
    ],
    resources: [
      sourceResource("narrative-agent-limits-source-1", "AI agent：少与多", "web", "/vt-assets/notes/vtlib-bdde586bc9b556.txt", "主素材：多 Agent 容易开会循环，线性调度和负责人模式更有效。"),
      sourceResource("narrative-agent-limits-source-2", "OpenClaw发展研究报告(1.0版)清华大学202603.pdf", "pdf", "/vt-assets/files/vtlib-14a73f7b227773.pdf", "OpenClaw 报告，可作为 Agent 产品形态和趋势背景。"),
      sourceResource("narrative-agent-limits-source-3", "Openclaw的潜力", "web", "/vt-assets/notes/vtlib-cd9a5bbf6f0b1d.txt", "OpenClaw 潜力讨论，可作为拟人化 Agent 与主动能力案例。"),
      sourceResource("narrative-agent-limits-source-4", "爆肝2天！搓了个Agent App，语音唤醒，还能视频通话，已免费开源～", "web", "https://mp.weixin.qq.com/s?__biz=MzkwMzE4NjU5NA==&mid=2247515881&idx=1&sn=e9b5a76c83cdea1a67c93d0a20f37059", "Agent App 快速构建案例，可作为产品热度和可实现性背景。"),
      sourceResource("narrative-agent-limits-source-5", "五源投资人笔记：Agent 是新生命，它今天很饿｜5Y View", "web", "https://mp.weixin.qq.com/s?__biz=MzkwMDI2ODE0OQ==&mid=2247503508&idx=1&sn=5afd487500e40c424e3ca8d445a0faa5", "Agent 是新生命的投资人视角，可作为市场想象和隐喻材料。")
    ]
  },
  {
    id: "narrative-ai-programming-shift",
    title: "AI 编程的变化不是代写代码，而是人从执行者变成调度者",
    theme: "AI 编程与工程角色变化",
    source: "叙事主题重组 / 原始素材聚合",
    format: "叙事主题素材包",
    freshness: "2026-05-09",
    score: 91,
    tags: ["AI编程", "工程师角色", "调度者", "产品建设", "能力迁移"],
    summary:
      "核心观点：AI 编程的关键变化不是让 AI 写几段函数，而是工程师从编辑器里的执行者，逐步变成任务拆解、质量判断和多 AI 协调者。真正的壁垒从写代码迁移到定义问题、验收结果和架构调度。",
    owner: "Milo Reed",
    palette: "cyan",
    notes: [
      "适合 Milo 做工程师短帖或取舍复盘。",
      "论证结构：副驾驶阶段 -> Agent 跑任务 -> 多 Agent 调度 -> 人的价值迁移到架构、判断和验收。",
      "可用于 VisionTree 表达：AI 压缩基础脑力劳动后，人更需要结构化判断能力。",
      "不要写成工程师会被简单替代；重点是角色重心移动。"
    ],
    resources: [
      sourceResource("narrative-ai-programming-shift-source-1", "ai 编程：8个阶段", "web", "/vt-assets/notes/vtlib-510846f4751520.txt", "主素材：AI 编程阶段、100x 工程师、多 Agent 调度趋势。"),
      sourceResource("narrative-ai-programming-shift-source-2", "AI编程-海啸前的沉思", "web", "https://mp.weixin.qq.com/s?__biz=MzI0NjA3NzgxNg==&mid=2247487880&idx=1&sn=61c3e60f870e013d8f8ee9170263a98f", "AI 编程海啸前的沉思，可作为行业冲击背景。"),
      sourceResource("narrative-ai-programming-shift-source-3", "别为今天的AI", "web", "/vt-assets/notes/vtlib-9a903673d68c83.txt", "别为今天的 AI 打造产品，可作为产品判断和技术周期素材。")
    ]
  },
  {
    id: "narrative-macro-ai-pressure",
    title: "AI 压缩基础脑力劳动后，人需要重新建立价值位置",
    theme: "AI 时代人的价值危机",
    source: "叙事主题重组 / 原始素材聚合",
    format: "叙事主题素材包",
    freshness: "2026-05-09",
    score: 90,
    tags: ["时代命题", "价值危机", "基础脑力劳动", "个人出路", "长期风险"],
    summary:
      "核心观点：AI 的长期冲击不只是工具效率提升，而是基础脑力劳动被压缩后，个人如何重新建立判断能力、结构化思考能力和价值位置。VisionTree 的叙事应从焦虑转向能力重建。",
    owner: "VisionTree",
    palette: "rose",
    notes: [
      "适合 VisionTree 官方叙事、Eli 深帖和 AI Doubt 风险观察。",
      "论证结构：AI 能力上升 -> 基础脑力劳动被压缩 -> 焦虑不能解决问题 -> 需要建立结构化思考和判断能力。",
      "可以支撑“不是替人思考，而是帮人更会思考”的主张。",
      "不要写成末日预言；用作时代背景和问题定义，不虚构具体结果。"
    ],
    resources: [
      sourceResource("narrative-macro-ai-pressure-source-1", "当AI赢了，我们会输吗？ 深度解读《2028全球智能危机》", "web", "https://mp.weixin.qq.com/s?__biz=MzE5MTYzMzQ5NA==&mid=2247485847&idx=1&sn=0fc3960ee5242c2fc60e5f054a6b8086", "全球智能危机、盲区、中美差异与个人出路的时代背景。"),
      sourceResource("narrative-macro-ai-pressure-source-2", "纪要_AI冲击与经济寒冬.pdf", "pdf", "/vt-assets/files/vtlib-30f7c864bdf4e1.pdf", "AI 冲击与经济寒冬，支撑宏观压力叙事。"),
      sourceResource("narrative-macro-ai-pressure-source-3", "AI启示录", "web", "/vt-assets/notes/vtlib-eca6015a448af7.txt", "AI 启示录，支撑长期风险和未来史视角。")
    ]
  },
  {
    id: "narrative-human-content-value",
    title: "AI 内容泛滥后，真实经验和叙事能力反而更稀缺",
    theme: "真实内容与人类经验",
    source: "叙事主题重组 / 原始素材聚合",
    format: "叙事主题素材包",
    freshness: "2026-05-09",
    score: 89,
    tags: ["AI内容", "真实经验", "叙事能力", "内容价值", "普通人表达"],
    summary:
      "核心观点：AI 内容大量出现后，稀缺的不是更顺滑的文本，而是绑定人类经验、现场感和真实判断的内容。人会下意识跳过明显 AI 生成的空泛内容，平台也会逐渐识别这种反馈。",
    owner: "Nora Blake",
    palette: "rose",
    notes: [
      "适合 Nora 写普通人真实体验，也适合 VisionTree 官方解释为什么内容不应只追求生成效率。",
      "论证结构：AI 内容增加 -> 用户厌倦空泛文本 -> 真实经验、故事和现场互动仍然有价值。",
      "可以和 Seedance、AI 视频素材连接，讨论生成能力增强后，判断和叙事更重要。",
      "不要写成反技术或否定 AI 创作工具；重点是人类经验仍是内容可信度来源。"
    ],
    resources: [
      sourceResource("narrative-human-content-value-source-1", "AI 垃圾", "web", "/vt-assets/notes/vtlib-4eebbd51e61e44.txt", "主素材：AI slop、故事能力、人类经验与内容触达。"),
      sourceResource("narrative-human-content-value-source-2", "Seedance 2.0王者回归——中国AI视频模型领跑全球", "web", "https://mp.weixin.qq.com/s?__biz=MzIzNjE5MDg2NA==&mid=2247483838&idx=1&sn=b0ae002aae7e3138778f63924ab004c0", "AI 视频模型案例，可作为生成内容供给增加的背景。"),
      sourceResource("narrative-human-content-value-source-3", "对话 Elys 创始人：他的 10 个产品洞察", "web", "https://mp.weixin.qq.com/s?__biz=Mzg5NTc0MjgwMw==&mid=2247522790&idx=1&sn=1b5d9e5594bc8436aa6fd686896eb7ad", "产品洞察与下一代社交网络，可作为真实互动和社交产品案例。")
    ]
  },
  {
    id: "narrative-distillation-and-memory",
    title: "认知沉淀不是保存资料，而是把经验蒸馏成可复用结构",
    theme: "认知沉淀与结构化记忆",
    source: "叙事主题重组 / 原始素材聚合",
    format: "叙事主题素材包",
    freshness: "2026-05-09",
    score: 88,
    tags: ["认知沉淀", "记忆", "蒸馏", "结构化思考", "Tree长期方向"],
    summary:
      "核心观点：资料本身不会自动变成认知资产。真正有价值的是把经历、判断、模型和反馈蒸馏成可连接、可复用的结构。这个主题可轻连接 Tree，但不能写成当前成熟产品能力。",
    owner: "The Thinking Tree",
    palette: "mint",
    notes: [
      "适合 Thinking Tree 的隐喻表达，也适合 Eli 做概念帖。",
      "论证结构：信息保存不等于认知沉淀 -> 蒸馏需要筛选、命名、连接和复用 -> Tree 是长期方向而非当前成熟卖点。",
      "可以用记忆图片做视觉入口，用“蒸馏”解释经验到结构的转换。",
      "不要写成 VisionTree 已经是成熟知识管理或第二大脑产品。"
    ],
    resources: [
      sourceResource("narrative-distillation-and-memory-source-1", "这个世界的本质就是蒸馏", "web", "https://mp.weixin.qq.com/s?__biz=MzAxMzUzMDY0Nw==&mid=2247484386&idx=1&sn=83ba5740bdacaabfbd889f6c58e81de5", "主素材：世界的本质是蒸馏，可转为认知沉淀隐喻。"),
      sourceResource("narrative-distillation-and-memory-source-2", "记忆.jpeg", "web", "/vt-assets/files/vtlib-8163f5af49357b.jpeg", "记忆视觉素材，可用于结构化记忆与认知沉淀的图像表达。"),
      sourceResource("narrative-distillation-and-memory-source-3", "《元认知教育》.pdf", "pdf", "/vt-assets/files/vtlib-486bf05204effe.pdf", "元认知教育，可支撑从资料保存到思考训练的论证。")
    ]
  },
  {
    id: "narrative-language-as-thinking-interface",
    title: "语言不是怀旧对象，而是未来复杂思考的接口",
    theme: "语言、互动与认知框架",
    source: "叙事主题重组 / 原始素材聚合",
    format: "叙事主题素材包",
    freshness: "2026-05-09",
    score: 87,
    tags: ["语言", "互动", "认知框架", "文化场景", "复杂表达"],
    summary:
      "核心观点：一种语言要在 AI 时代继续存在，不只是被保存，而是能不能继续用于查资料、写分析、做教学、讨论复杂问题。语言是思考接口；不用它处理未来问题，它就会退出知识生产空间。",
    owner: "Eli Rowan",
    palette: "amber",
    notes: [
      "适合 Eli 做慢概念，也适合 Thinking Lab 做互动实验。",
      "论证结构：语言保育不是怀旧 -> 关键是能否用于复杂任务 -> 与 AI 高频互动会影响未来模型能力 -> 使用本身就是建设。",
      "可以转译为 VisionTree 叙事：Vision 是内部一致的视角/框架，而语言是承载框架的接口之一。",
      "不要把它写成单纯文化情绪帖；重点是语言作为未来认知生产工具。"
    ],
    resources: [
      sourceResource("narrative-language-as-thinking-interface-source-1", "ai与互动", "web", "/vt-assets/notes/vtlib-5dce53c212cafd.txt", "主素材：AI 时代语言保育从保存过去转向参与未来复杂任务。")
    ]
  }
];

function sourceResource(id, title, kind, url, summary) {
  return {
    id,
    title,
    kind,
    url,
    source: "原始素材",
    updated: "2026-05-08",
    summary,
    highlights: [title, summary]
  };
}
