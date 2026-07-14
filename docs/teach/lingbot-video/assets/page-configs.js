const lessons = [
  "01 System Map",
  "02 Public Workflow",
  "03 Rewriter",
  "04 Runner",
  "05 Pipeline",
  "06 TI2V",
  "07 Single Stream",
  "08 Sparse MoE",
  "09 Refiner",
  "10 Serving",
  "11 Validation",
];

export const pageConfigs = {
  "course-map": {
    hero: {
      kind: "ogl",
      kicker: "11 章必修主线",
      title: "先看全局路径，再逐章深入。",
      lead: "这不是自由漫游目录，而是一条作者编排好的学习坡道：每一步都只要求读者做最少决定。",
      focusPreset: "overview",
      intro: ["overview", "mechanics", "systems"],
      cameras: {
        overview: { label: "全局路径", position: [1.2, 2.4, 14.2], target: [1.4, -0.2, 0] },
        mechanics: { label: "机制区", position: [5.4, 3, 9.4], target: [4.8, 0.3, -1.5] },
        systems: { label: "部署区", position: [8, 2.8, 7], target: [8, 0.6, -4.5] },
      },
      nodes: lessons.map((label, index) => ({
        id: `l${index + 1}`,
        label,
        shape: index < 2 ? "sphere" : "box",
        size: index < 2 ? [0.9, 0.9, 0.9] : [1.05, 0.72, 0.72],
        color: index < 3 ? "#6bd0ff" : index < 9 ? "#f7b955" : "#8ee28a",
        position: [index * 1.55 - 7.6, Math.sin(index * 0.66) * 0.95, -index * 0.78],
      })),
      steps: lessons.map((label, index) => ({
        label,
        camera: index < 3 ? "overview" : index < 9 ? "mechanics" : "systems",
        marker: [index * 1.55 - 7.6, Math.sin(index * 0.66) * 0.95 + 0.88, -index * 0.78],
        activeNodes: [`l${index + 1}`],
        note: `读到 ${label} 时，读者应只处理这一章的主承诺，再把结果带去下一章。整套地图的职责是防止“过早跳深水”。`,
      })),
    },
    diagrams: [
      {
        title: "主线总览",
        description: "课程主线不是“选感兴趣章节”，而是从系统边界进入使用层，再进入机制、架构与部署验证。",
        route: ["entry", "use", "mechanics", "architecture", "systems", "practice"],
        columns: [
          {
            title: "进入",
            items: [
              { id: "entry", title: "System Map", body: "先建立 repo / 论文 / 运行时三层边界。" },
            ],
          },
          {
            title: "使用层",
            items: [
              { id: "use", title: "Public Workflow", body: "搞清 T2I / T2V / TI2V 契约。" },
              { id: "rewriter", title: "Prompt Rewriter", body: "知道短 prompt 如何对齐成训练分布。" },
            ],
          },
          {
            title: "机制层",
            items: [
              { id: "mechanics", title: "Runner -> Pipeline", body: "从 CLI 进入 call_kwargs，再进入扩散循环。" },
              { id: "conditioning", title: "TI2V / Refiner", body: "理解首帧硬约束和二阶段细化。" },
            ],
          },
          {
            title: "架构 / 系统",
            items: [
              { id: "architecture", title: "Transformer / MoE", body: "看清 token、RoPE、router 与 expert path。" },
              { id: "systems", title: "Serving / Validation", body: "最后才进入并行与验证策略。" },
              { id: "practice", title: "最小运行验证", body: "用无权重静态检查与有权重最小运行验证收束证据。" },
            ],
          },
        ],
        steps: [
          {
            label: "先立边界",
            active: ["entry"],
            note: "第一步不是看炫图，而是知道哪些结论来自代码、哪些来自论文、哪些仍未证实。",
          },
          {
            label: "再走使用链",
            active: ["entry", "use", "rewriter"],
            note: "在系统能跑通之前，不进入 Transformer 细节，先守住输入输出契约。",
          },
          {
            label: "最后才深潜",
            active: ["mechanics", "conditioning", "architecture", "systems"],
            note: "机制、架构、部署按依赖推进，让初学者始终在已有心智模型上叠楼。",
          },
        ],
      },
    ],
  },
  "01-system-map": {
    hero: {
      kind: "ogl",
      kicker: "主场景",
      title: "把 Prompt、DiT 与部署看成同一条受约束的数据走廊。",
      lead: "这章的任务不是背术语，而是先把三大子系统在脑中摆对位置。",
      focusPreset: "dit",
      intro: ["overview", "prompt", "deploy"],
      cameras: {
        overview: { label: "全局视角", position: [0.3, 1.6, 9.6], target: [0, 0.1, 0] },
        prompt: { label: "Prompt 处理", position: [-4.8, 1.2, 6.6], target: [-4.2, 0.2, 0] },
        dit: { label: "DiT 推理", position: [0.2, 2.3, 6.2], target: [0, 0, 0] },
        deploy: { label: "部署与细化", position: [4.8, 1.4, 6.8], target: [4.2, 0.2, 0] },
      },
      nodes: [
        { id: "prompt", label: "Prompt 处理", shape: "box", size: [2.1, 1.3, 1.1], color: "#6bd0ff", position: [-4.2, 0.1, 0] },
        { id: "dit", label: "DiT 推理", shape: "box", size: [2.2, 1.45, 1.1], color: "#f7b955", position: [0, 0, 0] },
        { id: "deploy", label: "部署与细化", shape: "box", size: [2.05, 1.3, 1.1], color: "#8ee28a", position: [4.2, 0.1, 0] },
        { id: "paper", label: "论文主张", shape: "sphere", size: [0.9, 0.9, 0.9], color: "#f585ad", position: [0, 2.05, -1.2] },
      ],
      steps: [
        {
          label: "Prompt 桥梁",
          camera: "prompt",
          marker: [-4.2, 1.05, 0],
          activeNodes: ["prompt"],
          note: "读者先接受一个事实：用户短句不会直接喂给 DiT，必须先被改写成训练时见过的结构。",
        },
        {
          label: "DiT 中心",
          camera: "dit",
          marker: [0, 1.1, 0],
          activeNodes: ["dit"],
          note: "一切复杂机制最终都收敛到 DiT 的条件建模与 latent 采样循环，因此它是整套课的几何中心。",
        },
        {
          label: "部署出口",
          camera: "deploy",
          marker: [4.2, 1.05, 0],
          activeNodes: ["deploy"],
          note: "部署、refiner、多卡并行不是外挂，而是同一条数据走廊的末端工程化延伸。",
        },
        {
          label: "证据边界",
          camera: "overview",
          marker: [0, 2.75, -1.2],
          activeNodes: ["paper", "prompt", "dit", "deploy"],
          note: "这门课反复强调：公开仓库与论文主张不是同一层证据，主场景必须把这条边界钉死。",
        },
      ],
    },
    diagrams: [
      {
        title: "系统走廊",
        description: "把系统理解成受约束的数据走廊，而不是松散的文件堆。",
        route: ["user", "rewrite", "runner", "pipeline", "save"],
        columns: [
          {
            title: "进入口",
            items: [
              { id: "user", title: "用户意图", body: "自然语言短句或首帧条件。" },
              { id: "rewrite", title: "结构化改写", body: "把输入拉回训练时的 caption 分布。" },
            ],
          },
          {
            title: "运行时",
            items: [
              { id: "runner", title: "Runner 编排", body: "统一 CLI、backend、geometry 与并行契约。" },
              { id: "pipeline", title: "Pipeline / DiT", body: "把 prompt embedding 与 latent 采样闭环连接起来。" },
            ],
          },
          {
            title: "出口",
            items: [
              { id: "save", title: "保存 / Refiner / Serve", body: "输出图片、视频或进入部署和细化链路。" },
            ],
          },
        ],
        steps: [
          { label: "先立入口", active: ["user", "rewrite"], note: "若不先把用户意图翻成结构化契约，后面所有 shape 都会被误读。" },
          { label: "再立运行时", active: ["runner", "pipeline"], note: "runner 不是边角料，而是把人类参数编译成模型调用的意图编译器。" },
          { label: "最后看出口", active: ["save"], note: "部署与细化必须被视作同一条走廊的末端，而不是额外附录。" },
        ],
      },
    ],
  },
  "02-public-workflow": {
    hero: {
      kind: "diagram",
      kicker: "主场景",
      title: "先把三种模式的输入输出契约钉死，再谈模型细节。",
      lead: "这章是所有后续章节的地板：如果 T2I / T2V / TI2V 的契约没搞定，后面每一章都会漂。",
      focusStep: 1,
      intro: [0, 1, 2],
      steps: [
        { label: "共用入口", active: ["prompt", "mode"], note: "三种模式的共同点比差异更重要：都由同一条结构化 prompt 链驱动。" },
        { label: "守住帧数", active: ["frames", "latents"], note: "真正难记的不是模式名称，而是为什么帧数必须服从 4n+1。" },
        { label: "最后看输出", active: ["output"], note: "当你能手推出 shape，就不会再把 T2I 误解成另一套完全独立的系统。" },
      ],
      diagram: {
        title: "模式契约总览",
        description: "同一个 DiT / VAE 家族，三种模式只是在输入契约与帧数约束上不同。",
        route: ["prompt", "mode", "frames", "latents", "output"],
        columns: [
          { title: "输入", items: [
            { id: "prompt", title: "structured prompt", body: "三种模式都以结构化 prompt 为条件入口。" },
            { id: "image", title: "可选首帧", body: "只有 TI2V 需要首帧图像进入条件分支。" },
          ]},
          { title: "模式规则", items: [
            { id: "mode", title: "T2I / T2V / TI2V", body: "决定是否强制单帧、是否需要 image、是否允许 refiner。" },
            { id: "frames", title: "4n+1 对齐", body: "视频模式一律对齐到 VAE 时间压缩要求。" },
          ]},
          { title: "输出", items: [
            { id: "latents", title: "latent shape", body: "统一进入 [1, C, T', H/8, W/8] 这一族张量。" },
            { id: "output", title: "PNG / MP4", body: "图片只是视频在时间维退化到单帧的特例。" },
          ]},
        ],
      },
    },
    diagrams: [
      {
        title: "公开工作流",
        description: "工作流的重点不是命令本身，而是人类输入如何变成几何一致的模型调用。",
        route: ["user", "json", "runner", "check", "call", "save"],
        columns: [
          { title: "人类侧", items: [
            { id: "user", title: "自然语言 / 首帧", body: "用户给的是语义意图，不是模型张量。" },
            { id: "json", title: "prompt.json", body: "rewriter 把意图写成训练分布内的结构化 JSON。" },
          ]},
          { title: "编排侧", items: [
            { id: "runner", title: "runner", body: "决定 mode、resolution、ratio、duration 与 refiner 约束。" },
            { id: "check", title: "硬约束", body: "校验 4n+1 帧、16 倍数空间与参数组合合法性。" },
          ]},
          { title: "模型侧", items: [
            { id: "call", title: "pipe(**call_kwargs)", body: "所有策略最后都压缩成一次模型调用。" },
            { id: "save", title: "图片 / 视频", body: "根据 mode 输出 PNG 或 MP4。" },
          ]},
        ],
        steps: [
          { label: "先懂 JSON", active: ["user", "json"], note: "用户从来不是直接喂给 DiT 的，先承认这一点才能继续。" },
          { label: "再懂约束", active: ["runner", "check"], note: "真正让工作流稳定的不是命令多，而是 runner 持有全部边界条件。" },
          { label: "最后懂 call", active: ["call", "save"], note: "输出不是魔法，它只是几何被编译正确后的自然结果。" },
        ],
      },
    ],
  },
  "03-prompt-rewriter-and-negative": {
    hero: {
      kind: "diagram",
      kicker: "主场景",
      title: "同一份 base 权重，切换 LoRA 开关，就能在通才与专才之间切换。",
      lead: "这章要打掉的误解是“两阶段 = 两个模型”。",
      focusStep: 1,
      intro: [0, 1, 2],
      steps: [
        { label: "先认清一份权重", active: ["prompt", "expand", "map"], note: "LoRA 开关是角色切换，不是第二套模型。" },
        { label: "再认清子集约束", active: ["negative"], note: "auto-negative 的价值在于把自由度压缩到“只删不增”的安全边界内。" },
        { label: "最后看落盘", active: ["parse", "save"], note: "真正的风险不在数学公式，而在 parse 失败后是否还把坏 caption 写进主线。" },
      ],
      diagram: {
        title: "两阶段改写",
        description: "EXPAND 负责把短句扩成动作中心描述，MAP 负责把描述压进结构化 schema。",
        route: ["prompt", "expand", "map", "parse", "negative", "save"],
        columns: [
          { title: "输入", items: [
            { id: "prompt", title: "plain prompt", body: "短 prompt 或带首帧条件的自然语言描述。" },
          ]},
          { title: "两阶段", items: [
            { id: "expand", title: "EXPAND", body: "LoRA 关闭，使用 base VLM 的通用视觉语言能力。" },
            { id: "map", title: "MAP", body: "LoRA 打开，把富描述映射到固定 JSON schema。" },
          ]},
          { title: "收尾", items: [
            { id: "parse", title: "parse_json", body: "把模型文本输出转换为可供 runner 消费的结构。" },
            { id: "negative", title: "delete-only negative", body: "只从默认集合中删除，不新增或改写。" },
            { id: "save", title: "caption 保存", body: "结构化 caption 与 duration 一起写盘。" },
          ]},
        ],
      },
    },
    diagrams: [
      {
        title: "改写与剪枝的两条链",
        description: "主改写链负责把语义拉回训练分布，negative 链负责做受控剪枝。",
        route: ["plain", "expand", "map", "caption", "default", "prune"],
        columns: [
          { title: "主改写链", items: [
            { id: "plain", title: "短 prompt", body: "用户只给一句意图。" },
            { id: "expand", title: "EXPAND", body: "先扩成富描述，让 base VLM 发挥通才能力。" },
            { id: "map", title: "MAP", body: "再用 LoRA 把描述压成 schema。" },
            { id: "caption", title: "caption.json", body: "最终供 runner 消费的结构化对象。" },
          ]},
          { title: "negative 链", items: [
            { id: "default", title: "default negative", body: "受控、人工审核过的默认集合。" },
            { id: "prune", title: "delete-only prune", body: "只删冲突项，不得新增任何圆外元素。" },
          ]},
        ],
        steps: [
          { label: "主链", active: ["plain", "expand", "map", "caption"], note: "改写链的目的是做分布对齐，而不是炫技生成文案。" },
          { label: "剪枝链", active: ["default", "prune"], note: "negative 链最大的价值是把不确定性关进一个有限集合。" },
        ],
      },
    ],
  },
  "04-runner-orchestration": {
    hero: {
      kind: "diagram",
      kicker: "主场景",
      title: "把 runner 当作意图编译器，而不是参数搬运工。",
      lead: "这章要让读者看到：真正把人类输入变成模型调用的是 runner 的规范化与分派逻辑。",
      focusStep: 2,
      intro: [0, 1, 2],
      steps: [
        { label: "先解 backend", active: ["cli", "engine"], note: "用户输入的不是 engine，而是意图强弱不同的 backend / engine 选择。" },
        { label: "再解约束", active: ["prompt", "mesh"], note: "真正容易出错的是参数之间的组合约束，而不是单个 flag 的含义。" },
        { label: "最后凝结调用", active: ["kwargs", "pipe"], note: "理解 call_kwargs，就是理解 runner 为模型承包了哪些认知负担。" },
      ],
      diagram: {
        title: "Runner 编译链",
        description: "CLI 只是开端，真正重要的是 backend 解析、world_size 分解与 call_kwargs 凝结。",
        route: ["cli", "engine", "prompt", "mesh", "kwargs", "pipe"],
        columns: [
          { title: "入口", items: [
            { id: "cli", title: "scripts/inference.py", body: "薄入口：设置路径并注入默认 backend。" },
          ]},
          { title: "编译", items: [
            { id: "engine", title: "resolve_backend_engine", body: "决定 diffusers / sglang-native 及其回退语义。" },
            { id: "prompt", title: "prompt / negative / geometry", body: "把 duration、resolution、ratio 等统一归一。" },
            { id: "mesh", title: "world_size = Dcfg × Dcp", body: "把多卡拓扑拆成 CFG lane 与 context lane。" },
          ]},
          { title: "执行", items: [
            { id: "kwargs", title: "call_kwargs", body: "把所有意图压缩成一次明确的调用契约。" },
            { id: "pipe", title: "pipe(**call_kwargs)", body: "进入 pipeline 或 native wrapper。" },
          ]},
        ],
      },
    },
    diagrams: [
      {
        title: "回退与网格",
        description: "这一张图只讲两件最容易误解的事：backend 回退语义，以及 world_size 的乘法分解。",
        route: ["backend", "fallback", "grid", "conflict", "call"],
        columns: [
          { title: "backend", items: [
            { id: "backend", title: "--backend sglang", body: "软偏好：能用 native 就用，不能用就回退。" },
            { id: "fallback", title: "--engine sglang-native", body: "硬要求：失败即失败，不可静默改跑 diffusers。" },
          ]},
          { title: "并行", items: [
            { id: "grid", title: "Dcfg × Dcp", body: "把卡数拆成 guidance 分支 lane 与 context lane。" },
            { id: "conflict", title: "batch_cfg 互斥", body: "同一份 CFG 工作不能同时按进程和按 batch 两次切分。" },
          ]},
          { title: "落地", items: [
            { id: "call", title: "call_kwargs", body: "最后一切都被压进一次明确调用。" },
          ]},
        ],
        steps: [
          { label: "回退语义", active: ["backend", "fallback"], note: "表面上看只是 flag 不同，实质上是用户意图强度不同。" },
          { label: "网格语义", active: ["grid", "conflict"], note: "world_size 的乘法拆分是部署思维的入口，不是实现细枝末节。" },
          { label: "落地调用", active: ["call"], note: "runner 的价值在于把所有约束都在模型调用前解决掉。" },
        ],
      },
    ],
  },
  "05-diffusion-pipeline-loop": {
    hero: {
      kind: "diagram",
      kicker: "主场景",
      title: "先看一整圈采样循环，再进去算公式。",
      lead: "这章的核心不是记函数名，而是先在脑中看见 prompt、latents、scheduler 与 decode 如何闭成环。",
      focusStep: 2,
      intro: [0, 1, 2],
      steps: [
        { label: "先准备", active: ["prompt", "latents"], note: "读者先看见模型实际消费的不是自然语言，而是 token 与 latent。" },
        { label: "再看循环", active: ["timesteps", "transformer", "scheduler"], note: "扩散的认知负担在于时间循环，不在于单个函数名。" },
        { label: "最后解码", active: ["decode"], note: "VAE decode 只在末端发生，这一点如果模糊，整个章节都会漂。" },
      ],
      diagram: {
        title: "扩散主循环",
        description: "LingBot-Video 的 pipeline 只是把条件编码、latent 初始化、timestep 循环和 decode 串成一个可靠闭环。",
        route: ["prompt", "latents", "timesteps", "transformer", "scheduler", "decode"],
        columns: [
          { title: "准备", items: [
            { id: "prompt", title: "encode_prompt", body: "把 prompt 和 negative_prompt 压成条件 token 表示。" },
            { id: "latents", title: "prepare_latents", body: "创建 [B,C,T',H',W'] 族的噪声 latent。" },
          ]},
          { title: "循环", items: [
            { id: "timesteps", title: "scheduler.set_timesteps", body: "定义从噪声回到数据的时间离散。" },
            { id: "transformer", title: "transformer()", body: "每一步预测 velocity / noise 场。" },
            { id: "scheduler", title: "scheduler.step()", body: "把当前预测积分回更干净的 latent。" },
          ]},
          { title: "收尾", items: [
            { id: "decode", title: "VAE.decode", body: "只在循环后把最终 latent 抬回可看的像素空间。" },
          ]},
        ],
      },
    },
    diagrams: [
      {
        title: "Rectified Flow 运行链",
        description: "把公式读成阶段转换，而不是堆在一页上的符号。",
        route: ["x1", "xt", "velocity", "guided", "integrate", "x0"],
        columns: [
          { title: "轨迹", items: [
            { id: "x1", title: "noise x1", body: "从高斯噪声端出发。" },
            { id: "xt", title: "intermediate xt", body: "沿 rectified flow 直线轨迹前进。" },
          ]},
          { title: "预测", items: [
            { id: "velocity", title: "v_theta", body: "Transformer 在每个 t 上预测速度场。" },
            { id: "guided", title: "CFG guidance", body: "把 cond / uncond 线性组合成引导速度。" },
          ]},
          { title: "落地", items: [
            { id: "integrate", title: "scheduler.step", body: "把 guided velocity 积分回更干净的状态。" },
            { id: "x0", title: "decoded sample", body: "最终获得更接近数据分布的结果。" },
          ]},
        ],
        steps: [
          { label: "先看轨迹", active: ["x1", "xt"], note: "直线轨迹的价值在于让读者先相信“少步也能走得准”是合理的。" },
          { label: "再看预测", active: ["velocity", "guided"], note: "CFG 在这里依然只是速度场的线性外推，不是另一套独立机制。" },
          { label: "最后看落地", active: ["integrate", "x0"], note: "理解 scheduler.step 的位置，比死记某个求解器名更重要。" },
        ],
      },
    ],
  },
  "06-ti2v-conditioning": {
    hero: {
      kind: "ogl",
      kicker: "主场景",
      title: "首帧不是提示词附件，而是每一步都会被重新钉回去的硬约束。",
      lead: "这章要让读者在脑中看到：首帧同时走 prompt 条件支路和 clean latent 支路。",
      focusPreset: "clamp",
      intro: ["overview", "vlm", "clamp"],
      cameras: {
        overview: { label: "双通路", position: [0.5, 2, 10], target: [0, 0, 0] },
        vlm: { label: "VLM 条件", position: [-4.4, 1.5, 7.2], target: [-4.2, 0, 0] },
        clamp: { label: "首帧钉住", position: [2.4, 1.6, 5.6], target: [2.1, 0.1, 0] },
      },
      nodes: [
        { id: "image", label: "first frame", shape: "sphere", size: [0.92, 0.92, 0.92], color: "#6bd0ff", position: [-4.2, 0, 0] },
        { id: "vlm", label: "vlm branch", shape: "box", size: [1.4, 0.8, 0.8], color: "#6bd0ff", position: [-1.8, 1.15, 0] },
        { id: "latent0", label: "clean x0", shape: "box", size: [1.05, 1.05, 1.05], color: "#f7b955", position: [1.2, 0, 0] },
        { id: "latent1", label: "latent t1", shape: "box", size: [1.05, 1.05, 1.05], color: "#8893a5", position: [2.8, 0, 0] },
        { id: "latent2", label: "latent t2", shape: "box", size: [1.05, 1.05, 1.05], color: "#8893a5", position: [4.4, 0, 0] },
      ],
      steps: [
        {
          label: "双重身份",
          camera: "overview",
          marker: [-4.2, 1.05, 0],
          activeNodes: ["image", "vlm", "latent0"],
          note: "首帧一分为二：一份进入 VLM 条件支路，一份被编码成 clean latent 前缀。",
        },
        {
          label: "条件支路",
          camera: "vlm",
          marker: [-1.8, 2.05, 0],
          activeNodes: ["image", "vlm"],
          note: "VLM 支路影响的是 prompt encoding，而不是直接替代 diffusion 主循环。",
        },
        {
          label: "每步回钉",
          camera: "clamp",
          marker: [1.2, 1.15, 0],
          activeNodes: ["latent0", "latent1", "latent2"],
          note: "真正关键的是：每个 scheduler step 之后，frame-0 都会被重新钉回 clean x0。",
        },
      ],
    },
    diagrams: [
      {
        title: "TI2V 双通路",
        description: "首帧先分叉，再在采样循环里重新汇合。",
        route: ["frame", "resize", "vlm", "vae", "reclamp", "decode"],
        columns: [
          { title: "进入", items: [
            { id: "frame", title: "first_frame.png", body: "原始像素首帧。" },
            { id: "resize", title: "preprocess / smart_resize", body: "为 VLM 与 VAE 条件各自做对齐处理。" },
          ]},
          { title: "双支路", items: [
            { id: "vlm", title: "VLM image branch", body: "参与 prompt encoding，影响语义条件。" },
            { id: "vae", title: "clean latent branch", body: "编码成规范化的 clean x0 前缀。" },
          ]},
          { title: "循环", items: [
            { id: "reclamp", title: "_apply_inpainting", body: "每一步后都把首帧重新钉回干净前缀。" },
            { id: "decode", title: "video decode", body: "其余帧在保留首帧约束下完成生成。" },
          ]},
        ],
        steps: [
          { label: "先分支", active: ["frame", "resize", "vlm", "vae"], note: "TI2V 最重要的不是“有图像条件”，而是这张图走了两条不同职责的支路。" },
          { label: "再回钉", active: ["reclamp"], note: "如果不知道每步都重新注入 clean x0，就会把 TI2V 误解成一次性条件。" },
          { label: "最后成片", active: ["decode"], note: "视频生成不是“参考首帧后就忘了它”，而是在硬约束下展开。" },
        ],
      },
    ],
  },
  "07-transformer-single-stream": {
    hero: {
      kind: "ogl",
      kicker: "主场景",
      title: "先看见同一条序列，再去理解 attention、RoPE 和 joint tokenization。",
      lead: "这章不是让读者被矩阵淹没，而是先看到‘视频 token 和文本 token 真的是同一条流’。",
      focusPreset: "sequence",
      intro: ["grid", "merge", "sequence"],
      cameras: {
        grid: { label: "张量视角", position: [6, 4.2, 11.5], target: [0, 0, 0] },
        merge: { label: "并流视角", position: [4.2, 3.2, 8.2], target: [1.8, -0.2, 0] },
        sequence: { label: "序列视角", position: [0, 2.1, 9.1], target: [0, -1.6, 0] },
      },
      nodes: [
        { id: "v1", label: "v1", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [-3, 1.5, -1.8] },
        { id: "v2", label: "v2", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [-1.8, 1.5, -1.8] },
        { id: "v3", label: "v3", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [-0.6, 1.5, -1.8] },
        { id: "v4", label: "v4", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [-3, 0.3, -1.8] },
        { id: "v5", label: "v5", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [-1.8, 0.3, -1.8] },
        { id: "v6", label: "v6", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [-0.6, 0.3, -1.8] },
        { id: "v7", label: "v7", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [0.6, 1.5, -0.4] },
        { id: "v8", label: "v8", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [1.8, 1.5, -0.4] },
        { id: "v9", label: "v9", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [3, 1.5, -0.4] },
        { id: "v10", label: "v10", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [0.6, 0.3, -0.4] },
        { id: "v11", label: "v11", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [1.8, 0.3, -0.4] },
        { id: "v12", label: "v12", shape: "box", size: [0.55, 0.55, 0.55], color: "#6bd0ff", position: [3, 0.3, -0.4] },
        { id: "t1", label: "t1", shape: "sphere", size: [0.44, 0.44, 0.44], color: "#8ee28a", position: [4.8, 1.7, 1.2] },
        { id: "t2", label: "t2", shape: "sphere", size: [0.44, 0.44, 0.44], color: "#8ee28a", position: [4.8, 0.9, 1.2] },
        { id: "t3", label: "t3", shape: "sphere", size: [0.44, 0.44, 0.44], color: "#8ee28a", position: [4.8, 0.1, 1.2] },
        { id: "t4", label: "t4", shape: "sphere", size: [0.44, 0.44, 0.44], color: "#8ee28a", position: [4.8, -0.7, 1.2] },
        { id: "joint", label: "joint", shape: "box", size: [5.4, 0.42, 0.42], color: "#f7b955", position: [0.9, -2, 0] },
      ],
      steps: [
        {
          label: "视频 patch 网格",
          camera: "grid",
          marker: [-0.8, 2.2, -1.1],
          activeNodes: ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9", "v10", "v11", "v12"],
          note: "先看到的是 5D latent 被切成时空 patch 网格，而不是抽象的矩阵字母。",
        },
        {
          label: "文本条件加入",
          camera: "merge",
          marker: [4.8, 2.3, 1.2],
          activeNodes: ["t1", "t2", "t3", "t4", "joint"],
          note: "single-stream 的关键不是“有文本 token”，而是文本和视觉 token 在同一 hidden space 相遇。",
        },
        {
          label: "同一条序列",
          camera: "sequence",
          marker: [0.9, -1.2, 0],
          activeNodes: ["joint"],
          note: "所有后续的 RoPE、QK-Norm、joint attention 都应建立在“它们已被并成一条序列”这件事上。",
        },
      ],
    },
    diagrams: [
      {
        title: "Single-Stream token 数据流",
        description: "先 patchify，再 interleave，再送入共享注意力块，而不是两条独立流水线偶尔握手。",
        route: ["latent", "patchify", "text", "interleave", "rope", "blocks", "unpatchify"],
        columns: [
          { title: "输入", items: [
            { id: "latent", title: "video latent", body: "[B,C,T,H,W] 进入 patchify。" },
            { id: "text", title: "text states", body: "条件文本先投到同一 hidden size。" },
          ]},
          { title: "统一", items: [
            { id: "patchify", title: "patchify", body: "时空网格被拉平成 video tokens。" },
            { id: "interleave", title: "_cat_interleave", body: "视觉 token 与文本 token 接成一条 joint sequence。" },
            { id: "rope", title: "joint position ids", body: "用非重叠 temporal 坐标做 3D RoPE。" },
          ]},
          { title: "输出", items: [
            { id: "blocks", title: "shared transformer blocks", body: "每一层都在同一 attention 空间里同时处理两类 token。" },
            { id: "unpatchify", title: "unpatchify", body: "最后重新回到视频 latent 结构。" },
          ]},
        ],
        steps: [
          { label: "先统一维度", active: ["latent", "text", "patchify"], note: "文本和视频先被压到同一 hidden 语言里，后续 single-stream 才成立。" },
          { label: "再统一序列", active: ["interleave", "rope"], note: "最核心的动作不是 attention，而是把 token 真正并成一条流。" },
          { label: "最后共享块", active: ["blocks", "unpatchify"], note: "shared self-attention 的意义在于每一层都允许跨模态直接交互。" },
        ],
      },
    ],
  },
  "08-sparse-moe": {
    hero: {
      kind: "ogl",
      kicker: "主场景",
      title: "先看 token 如何被分发，再进入 router 的数学细节。",
      lead: "MoE 最容易被误读成“很多参数而已”，主场景要先把 dispatch 感建立起来。",
      focusPreset: "route",
      intro: ["overview", "route", "merge"],
      cameras: {
        overview: { label: "全貌", position: [0, 3.2, 12], target: [0, 0, 0] },
        route: { label: "路由面", position: [0, 2.6, 8.2], target: [0, 0.4, 0] },
        merge: { label: "回写视角", position: [0, 5.1, 9.2], target: [0, 0, -0.8] },
      },
      nodes: [
        { id: "tok1", label: "tok1", shape: "box", size: [0.7, 0.7, 0.7], color: "#f7b955", position: [-4, 3, 0] },
        { id: "tok2", label: "tok2", shape: "box", size: [0.7, 0.7, 0.7], color: "#f7b955", position: [-2, 3, 0] },
        { id: "tok3", label: "tok3", shape: "box", size: [0.7, 0.7, 0.7], color: "#f7b955", position: [0, 3, 0] },
        { id: "tok4", label: "tok4", shape: "box", size: [0.7, 0.7, 0.7], color: "#f7b955", position: [2, 3, 0] },
        { id: "tok5", label: "tok5", shape: "box", size: [0.7, 0.7, 0.7], color: "#f7b955", position: [4, 3, 0] },
        { id: "e1", label: "e1", shape: "sphere", size: [0.58, 0.58, 0.58], color: "#6bd0ff", position: [-5.3, -2.2, -1.4] },
        { id: "e2", label: "e2", shape: "sphere", size: [0.58, 0.58, 0.58], color: "#6bd0ff", position: [-3.8, -1.4, -0.8] },
        { id: "e3", label: "e3", shape: "sphere", size: [0.58, 0.58, 0.58], color: "#6bd0ff", position: [-2.2, -0.8, -0.3] },
        { id: "e4", label: "e4", shape: "sphere", size: [0.58, 0.58, 0.58], color: "#6bd0ff", position: [-0.6, -0.5, 0] },
        { id: "e5", label: "e5", shape: "sphere", size: [0.58, 0.58, 0.58], color: "#6bd0ff", position: [0.9, -0.5, 0] },
        { id: "e6", label: "e6", shape: "sphere", size: [0.58, 0.58, 0.58], color: "#6bd0ff", position: [2.5, -0.8, -0.3] },
        { id: "e7", label: "e7", shape: "sphere", size: [0.58, 0.58, 0.58], color: "#6bd0ff", position: [4.1, -1.4, -0.8] },
        { id: "e8", label: "e8", shape: "sphere", size: [0.58, 0.58, 0.58], color: "#6bd0ff", position: [5.5, -2.2, -1.4] },
      ],
      steps: [
        {
          label: "token 进入",
          camera: "overview",
          marker: [0, 4.2, 0],
          activeNodes: ["tok1", "tok2", "tok3", "tok4", "tok5"],
          note: "先感知同一批 token 同时到达 router，而不是把专家执行误读成串行 if-else。",
        },
        {
          label: "top-k 路由",
          camera: "route",
          marker: [-3.8, -0.2, -0.8],
          activeNodes: ["tok1", "tok3", "tok5", "e2", "e4", "e7"],
          note: "每个 token 只点亮少数 expert，这就是容量与激活计算解耦的直观来源。",
        },
        {
          label: "加权回写",
          camera: "merge",
          marker: [0, 1.3, 0],
          activeNodes: ["tok1", "tok2", "tok3", "tok4", "tok5", "e2", "e4", "e7"],
          note: "读者需要先看到‘出去又回来’，才不会把 MoE 误解成孤立的小模型群。",
        },
      ],
    },
    diagrams: [
      {
        title: "Router -> dispatch -> experts -> merge",
        description: "MoE 真正重要的是 token 如何被路由、打包、执行并重新回写。",
        route: ["tokens", "router", "choice", "pack", "experts", "merge"],
        columns: [
          { title: "前半程", items: [
            { id: "tokens", title: "hidden tokens", body: "同一批 token 同时进入 router。" },
            { id: "router", title: "fp32 router", body: "先算 affinity，再做归一化分数。" },
            { id: "choice", title: "choice vs gate", body: "选择用 bias 修正分数，门控仍用原始分数。" },
          ]},
          { title: "执行", items: [
            { id: "pack", title: "group / pack", body: "按 expert 重排，让同一路专家一起算。" },
            { id: "experts", title: "expert paths", body: "loop、grouped_mm、Triton、SGLang、FP8 等多条执行路径。" },
          ]},
          { title: "回写", items: [
            { id: "merge", title: "restore / merge", body: "把 expert 输出按 gate 权重回写到 token 维。" },
          ]},
        ],
        steps: [
          { label: "先选", active: ["tokens", "router", "choice"], note: "selection 与 gate 的非对称性是本章最容易漏掉却最关键的代码事实。" },
          { label: "再排队", active: ["pack", "experts"], note: "MoE 的工程价值在于如何把‘少数专家被点亮’转成高效的张量路径。" },
          { label: "最后回写", active: ["merge"], note: "只有把 token 合并回主流，MoE 才是主模型的一部分，而不是旁支外挂。" },
        ],
      },
    ],
  },
  "09-refiner": {
    hero: {
      kind: "diagram",
      kicker: "主场景",
      title: "refiner 不是第二次从纯噪声开始，而是在低噪声窗口里做定向精修。",
      lead: "这章必须让读者先看到‘base video -> t_thresh 附近 -> refiner’这条轨迹。",
      focusStep: 1,
      intro: [0, 1, 2],
      steps: [
        { label: "先看重入点", active: ["base", "reload", "encode"], note: "refiner 的起点不是全新采样，而是 base video 的重编码结果。" },
        { label: "再看 sigma 窗口", active: ["sigma"], note: "理解 t_thresh 的意义，比背具体参数表更重要。" },
        { label: "最后看第二阶段", active: ["refiner", "save"], note: "refiner 的职责是补细节，而不是重写整段时序。" },
      ],
      diagram: {
        title: "Refiner 轨迹",
        description: "base 阶段先得到可用视频，refiner 在低噪声区间重新进入并补高频细节。",
        route: ["base", "reload", "encode", "sigma", "refiner", "save"],
        columns: [
          { title: "base", items: [
            { id: "base", title: "base video", body: "第一阶段先产出低频已对齐的视频。" },
            { id: "reload", title: "reload / upsample", body: "为第二阶段准备更高分辨率的入口。" },
          ]},
          { title: "重入", items: [
            { id: "encode", title: "VAE encode", body: "把 base video 再编码回 latent 空间。" },
            { id: "sigma", title: "t_thresh window", body: "不从纯噪声起跑，而是只走低噪声子区间。" },
          ]},
          { title: "输出", items: [
            { id: "refiner", title: "refiner DiT", body: "以 t2v 模式做第二阶段精修。" },
            { id: "save", title: "refined video", body: "输出更稳定的高频细节。" },
          ]},
        ],
      },
    },
    diagrams: [
      {
        title: "Refiner 的工程位置",
        description: "只有把它放回整条主线里看，refiner 才不会被误读成一个孤立模型。",
        route: ["prompt", "basecall", "basevideo", "sigmas", "refinercall", "final"],
        columns: [
          { title: "base 阶段", items: [
            { id: "prompt", title: "prompt / image", body: "沿原主线进入 base 生成。" },
            { id: "basecall", title: "base pipeline", body: "产出低频结构已经成立的视频。" },
            { id: "basevideo", title: "base.mp4", body: "作为第二阶段的再进入口。" },
          ]},
          { title: "refiner 阶段", items: [
            { id: "sigmas", title: "compute_refiner_sigmas", body: "构造 t_thresh 到 sigma_min 的窗口。" },
            { id: "refinercall", title: "refiner call", body: "重新以 t2v 模式进入第二阶段。" },
            { id: "final", title: "refined.mp4", body: "更高频、更稳的最终结果。" },
          ]},
        ],
        steps: [
          { label: "base 先行", active: ["prompt", "basecall", "basevideo"], note: "refiner 永远建立在 base 阶段已经收敛出主结构的前提上。" },
          { label: "低噪声窗", active: ["sigmas"], note: "这不是从 1.0 重新采样，而是截取尾部窗口继续精修。" },
          { label: "重新进入", active: ["refinercall", "final"], note: "把 refiner 理解成尾段专精器，而不是第二个完整生成系统。" },
        ],
      },
    ],
  },
  "10-serving-fsdp-sglang": {
    hero: {
      kind: "ogl",
      kicker: "主场景",
      title: "同一组 GPU，可以按参数、序列或 CFG 分支三种完全不同的方式被导演。",
      lead: "这章先让读者看见‘切分对象不同’，再进入通信复杂度与 backend 语义。",
      focusPreset: "cp",
      intro: ["overview", "fsdp", "cp", "cfg"],
      cameras: {
        overview: { label: "总览", position: [0, 3.4, 12.4], target: [0, 0, 0] },
        fsdp: { label: "参数分片", position: [-3.8, 2.2, 7.4], target: [-2.1, 0, 0] },
        cp: { label: "序列切片", position: [0, 1.8, 7], target: [0, 0, 0] },
        cfg: { label: "分支切分", position: [4.1, 2.1, 7.4], target: [2.1, 0, 0] },
      },
      nodes: [
        { id: "g1", label: "gpu1", shape: "box", size: [1.5, 1.5, 1.5], color: "#6bd0ff", position: [-4.2, 0, 0] },
        { id: "g2", label: "gpu2", shape: "box", size: [1.5, 1.5, 1.5], color: "#6bd0ff", position: [-1.4, 0, 0] },
        { id: "g3", label: "gpu3", shape: "box", size: [1.5, 1.5, 1.5], color: "#6bd0ff", position: [1.4, 0, 0] },
        { id: "g4", label: "gpu4", shape: "box", size: [1.5, 1.5, 1.5], color: "#6bd0ff", position: [4.2, 0, 0] },
      ],
      steps: [
        {
          label: "FSDP 切参数",
          camera: "fsdp",
          marker: [-2.8, 1.35, 0],
          activeNodes: ["g1", "g2", "g3", "g4"],
          note: "FSDP 不改变 token 归属，它改变的是‘每张卡常驻哪一片参数’。",
        },
        {
          label: "CP 切序列",
          camera: "cp",
          marker: [0, 1.35, 0],
          activeNodes: ["g1", "g2", "g3", "g4"],
          note: "Context Parallel 切的是长序列，让每张卡只看整段 token 的一个切片。",
        },
        {
          label: "CFG 切分支",
          camera: "cfg",
          marker: [2.8, 1.35, 0],
          activeNodes: ["g1", "g2", "g3", "g4"],
          note: "CFG parallel 只负责两条 guidance 分支的分工，不负责参数或序列本身。",
        },
      ],
    },
    diagrams: [
      {
        title: "backend 选择与并行拓扑",
        description: "部署章节最容易混淆的恰恰不是术语，而是切分对象与回退语义。",
        route: ["backend", "engine", "mesh", "fsdp", "cp", "cfg", "pipe"],
        columns: [
          { title: "选择", items: [
            { id: "backend", title: "--backend", body: "表达软偏好：希望走哪条公开入口。" },
            { id: "engine", title: "--engine", body: "表达硬要求：指定内部执行引擎。" },
          ]},
          { title: "拓扑", items: [
            { id: "mesh", title: "DeviceMesh", body: "先构造进程网格，再叠加不同切分语义。" },
            { id: "fsdp", title: "FSDP", body: "切参数，不切序列。" },
            { id: "cp", title: "Context Parallel", body: "切序列，不切参数。" },
            { id: "cfg", title: "CFG Parallel", body: "切 guidance 分支。" },
          ]},
          { title: "执行", items: [
            { id: "pipe", title: "native / diffusers pipe", body: "所有切分最终都落回一次明确的执行路径。" },
          ]},
        ],
        steps: [
          { label: "先分选择", active: ["backend", "engine"], note: "部署第一层问题不是并行，而是用户到底要求软偏好还是硬约束。" },
          { label: "再分对象", active: ["mesh", "fsdp", "cp", "cfg"], note: "本章真正要学会的是三种并行切的是不同对象，而不是不同缩写。" },
          { label: "最后回调用", active: ["pipe"], note: "所有部署复杂性最后都要被压缩回稳定执行路径，否则主线体验不可信。" },
        ],
      },
    ],
  },
  "11-debugging-and-validation": {
    hero: {
      kind: "diagram",
      kicker: "主场景",
      title: "把验证看成一条从“静态可判定”到“运行时观测”的台阶，而不是一团待办。",
      lead: "这章的任务是让读者知道：在缺权重环境里，哪些证据是真的，哪些只能等运行时。",
      focusStep: 1,
      intro: [0, 1, 2],
      steps: [
        { label: "先静态", active: ["syntax", "json", "pure"], note: "无权重环境仍然可以产出强证据，只要你知道哪些属性真能被静态判定。" },
        { label: "再运行时", active: ["minimum-runtime", "distributed"], note: "运行时验证按风险梯度上升，让首个失败点对应最小新增系统层级。" },
        { label: "最后证据边界", active: ["evidence"], note: "顶级教学包不是“证明一切”，而是把能证与未证的边界诚实讲清。" },
      ],
      diagram: {
        title: "验证台阶",
        description: "先拿最便宜、最确定的静态证据守住边界，再把昂贵的运行时验证留到最后。",
        route: ["syntax", "json", "pure", "minimum-runtime", "distributed", "evidence"],
        columns: [
          { title: "静态层", items: [
            { id: "syntax", title: "syntax / parse", body: "先证明代码、脚本、JSON 至少可解析。" },
            { id: "json", title: "asset integrity", body: "确认 lesson / prompt / refs 的结构不坏。" },
            { id: "pure", title: "pure function checks", body: "断言那些真正可在无权重环境里证明正确的边界逻辑。" },
          ]},
          { title: "运行时层", items: [
            { id: "minimum-runtime", title: "单机最小运行验证", body: "从 Dense T2I 开始，逐步增加风险面。" },
            { id: "distributed", title: "multi-GPU / SGLang", body: "最后才进入拓扑、量化与 fused kernel。" },
          ]},
          { title: "证据层", items: [
            { id: "evidence", title: "claim boundary", body: "把“已验证”“可解析”“需权重”明确分栏，不混写。" },
          ]},
        ],
      },
    },
    diagrams: [
      {
        title: "验证路径图",
        description: "把检查项按证据强度排序，比堆 checklist 更重要。",
        route: ["compile", "pure", "dense", "ti2v", "moe", "multi"],
        columns: [
          { title: "静态证据", items: [
            { id: "compile", title: "compile / parse", body: "语法与结构层的最低门槛。" },
            { id: "pure", title: "pure invariants", body: "能在本地直接证明输入输出关系的边界函数。" },
          ]},
          { title: "单机最小运行验证", items: [
            { id: "dense", title: "Dense T2I / T2V", body: "最小系统先成立，再增加时间维与条件支路。" },
            { id: "ti2v", title: "TI2V / Refiner", body: "把图像条件与第二阶段精修逐层叠加。" },
          ]},
          { title: "高风险层", items: [
            { id: "moe", title: "MoE / FP8", body: "引入稀疏路由与特殊 kernel 后再测。" },
            { id: "multi", title: "CP / FSDP / SGLang", body: "最后再碰最昂贵的分布式与 native path。" },
          ]},
        ],
        steps: [
          { label: "先强证据", active: ["compile", "pure"], note: "这些检查最便宜，也最适合在无权重环境里建立可信基线。" },
          { label: "再最小系统", active: ["dense", "ti2v"], note: "最小运行验证逐层增加风险面，每一步只引入一个新的系统层级。" },
          { label: "最后高风险", active: ["moe", "multi"], note: "只有在前面都成立后，复杂拓扑的失败才有解释价值。" },
        ],
      },
    ],
  },
};
