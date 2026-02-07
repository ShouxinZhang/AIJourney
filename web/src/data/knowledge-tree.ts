/**
 * AI Journey 知识树数据
 *
 * 三大类别:
 * 1. Vibe Coding Skills - AI辅助编程技能
 * 2. Agent Dev - AI Agent 开发
 * 3. LLM Fundamental - 大语言模型基础
 *
 * 数据结构: 每个节点可以有子节点(children)，形成树形结构
 * 添加新知识点只需在对应分类下添加子节点即可
 */

export interface KnowledgeNode {
  id: string;
  label: string;
  description?: string;
  children?: KnowledgeNode[];
  color?: string;
}

export const knowledgeTree: KnowledgeNode[] = [
  {
    id: 'vibe-coding',
    label: 'Vibe Coding Skills',
    description: 'AI辅助编程技能 — 用自然语言驱动开发',
    color: '#f97316',
    children: [
      {
        id: 'vc-prompt-engineering',
        label: 'Prompt Engineering',
        description: '编写高质量的代码生成提示词',
        children: [
          { id: 'vc-pe-context', label: 'Context 设定', description: '为AI提供充分的项目和文件上下文' },
          { id: 'vc-pe-constraints', label: '约束条件设置', description: '限定输出格式、语言、框架等' },
          { id: 'vc-pe-examples', label: 'Few-shot 示例', description: '通过示例引导AI输出风格' },
          { id: 'vc-pe-iterative', label: '迭代优化', description: '逐步细化需求，分步骤生成代码' },
        ],
      },
      {
        id: 'vc-copilot',
        label: 'GitHub Copilot',
        description: '利用Copilot加速开发的技巧',
        children: [
          { id: 'vc-copilot-inline', label: 'Inline Completion', description: '行内代码补全与Tab接受' },
          { id: 'vc-copilot-chat', label: 'Copilot Chat', description: '对话式编程助手' },
          { id: 'vc-copilot-agent', label: 'Agent Mode', description: '自主多步骤任务执行' },
          { id: 'vc-copilot-cli', label: 'Copilot CLI', description: '命令行AI辅助' },
        ],
      },
      {
        id: 'vc-agent-skills',
        label: 'Agent Skills',
        description: '为Copilot创建可复用的技能模板',
        children: [
          { id: 'vc-as-skillmd', label: 'SKILL.md 编写', description: '定义技能的名称、描述和指令' },
          { id: 'vc-as-project', label: 'Project Skills', description: '仓库级技能 (.github/skills/)' },
          { id: 'vc-as-personal', label: 'Personal Skills', description: '个人级技能 (~/.copilot/skills/)' },
          { id: 'vc-as-scripts', label: '脚本与资源', description: '为技能附带脚本和示例文件' },
          { id: 'vc-as-instructions', label: 'Custom Instructions', description: '仓库自定义指令 vs 技能的选择' },
        ],
      },
      {
        id: 'vc-workflow',
        label: '开发工作流',
        description: 'AI驱动的完整开发流程',
        children: [
          { id: 'vc-wf-planning', label: '需求拆解', description: '用AI辅助分解复杂任务' },
          { id: 'vc-wf-scaffolding', label: '项目脚手架', description: 'AI生成项目初始结构' },
          { id: 'vc-wf-testing', label: '自动测试生成', description: 'AI编写单元测试和集成测试' },
          { id: 'vc-wf-review', label: 'Code Review', description: 'AI辅助代码审查' },
          { id: 'vc-wf-debug', label: '智能调试', description: 'AI辅助定位和修复Bug' },
        ],
      },
      {
        id: 'vc-best-practices',
        label: '最佳实践',
        description: 'Vibe Coding 的关键原则',
        children: [
          { id: 'vc-bp-agents', label: 'AGENTS.md', description: '项目级AI行为规范文件' },
          { id: 'vc-bp-modular', label: '模块化设计', description: '让AI更好理解和修改代码' },
          { id: 'vc-bp-docs', label: '文档驱动', description: '良好的文档让AI更高效' },
          { id: 'vc-bp-verify', label: '验证与测试', description: '始终验证AI生成的代码' },
        ],
      },
    ],
  },
  {
    id: 'agent-dev',
    label: 'Agent Dev',
    description: 'AI Agent 开发 — 构建自主智能体',
    color: '#22c55e',
    children: [
      {
        id: 'ad-fundamentals',
        label: 'Agent 基础概念',
        description: 'Agent 的核心理论与设计',
        children: [
          { id: 'ad-fund-what', label: '什么是 Agent', description: '感知-思考-行动的自主循环' },
          { id: 'ad-fund-arch', label: 'Agent 架构', description: 'ReAct / Plan-and-Execute / 反射' },
          { id: 'ad-fund-memory', label: '记忆系统', description: '短期记忆、长期记忆、外部存储' },
          { id: 'ad-fund-planning', label: '规划能力', description: '任务分解与子目标管理' },
        ],
      },
      {
        id: 'ad-tools',
        label: 'Tool Use',
        description: 'Agent 的工具调用能力',
        children: [
          { id: 'ad-tools-fc', label: 'Function Calling', description: 'LLM 结构化工具调用' },
          { id: 'ad-tools-mcp', label: 'MCP (Model Context Protocol)', description: '统一的工具连接协议' },
          { id: 'ad-tools-api', label: 'API 集成', description: '连接外部服务和数据源' },
          { id: 'ad-tools-code', label: 'Code Interpreter', description: '代码执行沙箱能力' },
        ],
      },
      {
        id: 'ad-frameworks',
        label: '开发框架',
        description: '主流 Agent 开发框架',
        children: [
          { id: 'ad-fw-langchain', label: 'LangChain / LangGraph', description: '链式调用与图状态流' },
          { id: 'ad-fw-crewai', label: 'CrewAI', description: '多Agent协作框架' },
          { id: 'ad-fw-autogen', label: 'AutoGen', description: '微软多Agent对话框架' },
          { id: 'ad-fw-openai-sdk', label: 'OpenAI Agents SDK', description: 'OpenAI官方Agent SDK' },
        ],
      },
      {
        id: 'ad-multi-agent',
        label: '多 Agent 系统',
        description: '多个Agent协作完成复杂任务',
        children: [
          { id: 'ad-ma-orchestration', label: '编排模式', description: '中心调度 vs 去中心化协作' },
          { id: 'ad-ma-communication', label: 'Agent 通信', description: '消息传递与共享状态' },
          { id: 'ad-ma-roles', label: '角色分工', description: '专业化Agent的任务分配' },
          { id: 'ad-ma-evaluation', label: '评估与监控', description: 'Agent 行为的可观测性' },
        ],
      },
      {
        id: 'ad-rag',
        label: 'RAG (检索增强生成)',
        description: '让Agent访问自有知识库',
        children: [
          { id: 'ad-rag-embedding', label: 'Embedding 模型', description: '文本向量化表示' },
          { id: 'ad-rag-vectordb', label: '向量数据库', description: 'Pinecone / Chroma / Weaviate' },
          { id: 'ad-rag-chunking', label: '文档分块', description: '智能文档切分策略' },
          { id: 'ad-rag-retrieval', label: '检索策略', description: '相似度搜索与重排序' },
        ],
      },
    ],
  },
  {
    id: 'llm-fundamental',
    label: 'LLM Fundamental',
    description: '大语言模型基础 — 理解AI的核心引擎',
    color: '#a855f7',
    children: [
      {
        id: 'llm-architecture',
        label: 'Transformer 架构',
        description: 'LLM 的核心神经网络结构',
        children: [
          { id: 'llm-arch-attention', label: 'Self-Attention', description: '自注意力机制的工作原理' },
          { id: 'llm-arch-positional', label: '位置编码', description: '序列位置信息的注入方式' },
          { id: 'llm-arch-ffn', label: 'FFN 前馈网络', description: '特征变换与非线性映射' },
          { id: 'llm-arch-norm', label: 'Layer Norm', description: '训练稳定性的归一化技术' },
        ],
      },
      {
        id: 'llm-training',
        label: '训练方法',
        description: '模型的训练过程与技术',
        children: [
          { id: 'llm-train-pretrain', label: '预训练 (Pre-training)', description: '大规模无监督语言建模' },
          { id: 'llm-train-sft', label: 'SFT (监督微调)', description: '基于标注数据的指令跟随训练' },
          { id: 'llm-train-rlhf', label: 'RLHF', description: '人类反馈强化学习对齐' },
          { id: 'llm-train-dpo', label: 'DPO', description: '直接偏好优化，RLHF的简化替代' },
        ],
      },
      {
        id: 'llm-inference',
        label: '推理与部署',
        description: '模型的高效推理技术',
        children: [
          { id: 'llm-inf-quantization', label: '量化 (Quantization)', description: 'INT8/INT4 降低显存占用' },
          { id: 'llm-inf-kvcache', label: 'KV Cache', description: '键值缓存加速自回归生成' },
          { id: 'llm-inf-batching', label: 'Continuous Batching', description: '动态批处理提升吞吐量' },
          { id: 'llm-inf-speculative', label: 'Speculative Decoding', description: '投机采样加速生成' },
        ],
      },
      {
        id: 'llm-prompting',
        label: '提示工程',
        description: '与LLM高效交互的技术',
        children: [
          { id: 'llm-prompt-cot', label: 'Chain-of-Thought', description: '链式思考提升推理能力' },
          { id: 'llm-prompt-fewshot', label: 'Few-shot Learning', description: '少量示例引导输出' },
          { id: 'llm-prompt-system', label: 'System Prompt', description: '系统提示词设定角色和行为' },
          { id: 'llm-prompt-structured', label: '结构化输出', description: 'JSON/XML 格式化输出控制' },
        ],
      },
      {
        id: 'llm-models',
        label: '主流模型',
        description: '了解各大LLM的特点与差异',
        children: [
          { id: 'llm-model-gpt', label: 'GPT 系列', description: 'OpenAI GPT-4o / o1 / o3' },
          { id: 'llm-model-claude', label: 'Claude 系列', description: 'Anthropic Claude Opus/Sonnet' },
          { id: 'llm-model-gemini', label: 'Gemini 系列', description: 'Google Gemini Pro / Ultra' },
          { id: 'llm-model-open', label: '开源模型', description: 'Llama / Qwen / DeepSeek / Mistral' },
        ],
      },
    ],
  },
];
