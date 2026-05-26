---
name: skill-scout
description: |
  AI Agent 自主成长侦察兵。每天从 Hermes 技能市场索引（lobehub、clawhub、official、github 等 842+ skills）中，
  通过多维度评分筛选出最值得安装的 20+ 个候选，生成报告推送到飞书，供你决策。
  核心功能：目标驱动评分、边界过滤、来源中性、不拘来源质量至上、安全过滤、每日推送。
version: "1.7"
author: Hermes Scout
license: MIT
tags: [autonomous-growth, skill-discovery, daily-report, feishu]
created: 2026-05-13
updated: 2026-05-24
---

# 🔭 Skill Scout

AI Agent 自主成长侦察兵。

## 功能

- **目标驱动**：聚焦"真正有用"——描述完整、关键词匹配实用场景、结构化文档完整
- **边界过滤**：排除明确有害的 Skill（损坏/废弃/诈骗/声明不可用等）
- **来源中性**：所有来源一视同仁，官方不一定最好，草根不一定差，质量说了算
- **多维度评分**：描述质量（3分）+ 关键词实用性（3分）+ 结构化标签（1.5分）+ 新鲜度（1.5分）+ 来源微调（1分）
- **每日推送**：自动生成 Markdown 报告并推送到飞书

## 评分标准（满分 10 分，≥5 分通过）

| 维度 | 分值 | 说明 |
|------|------|------|
| 描述质量 | 3.0 | 描述 >150 字符 = 满分，越长越详细 |
| 关键词匹配 | 3.0 | 命中实用场景关键词越多分越高（100+ 关键词库） |
| 结构化标签 | 1.5 | 有 tags = 0.8 分，3+ tags = 1.5 分 |
| 新鲜度 | 1.5 | 7 天内更新 = 满分，90 天以上不扣分 |
| 来源微调 | 1.0 | 官方小加成（+1.0），其余来源均等（+0.3~0.5） |

> **来源只是加分项之一，不决定生死**。一个 lobehub 的完整 Skill 可以超过官方的简单 Skill。

## 安全边界

以下 Skill 直接排除：

| 关键词 | 原因 |
|--------|------|
| `do not use` / `do-not-install` | 明确声明不可用 |
| `broken` / `abandoned` / `deprecated` | 已损坏/废弃 |
| `experimental` / `test-only` | 风险未知 |
| `fake` / `scam` | 疑似诈骗 |
| `draft` | 草稿阶段 |

> 无描述或描述 <10 字符的 Skill 也无法评估，直接排除。

## 运维参考

- `references/operations.md` — GitHub 推送、飞书推送机制、常见问题排查
- `references/known-missing-and-blocked.md` — **本地缺失 vs 上游缺失** 分类 + `KNOWN_MISSING` 黑名单（已编码于 skill-scout.js）+ 上游 tarball 验证流程 + 社区 BLOCKED 技能策略 + Identifier 解析失败的恢复流程 + lobehub 源容量说明。每日 cron 跑前先看这个。

## Hermes 上游仓库（提 issue / 验证 release 用）

- 仓库：`NousResearch/hermes-agent`（GitHub REST API 可达；web 和 git push 走代理可能不通）
- **提 issue 前必跑** `references/known-missing-and-blocked.md` 中的 **上游验证探针**：拉最新 release tarball 看 SKILL.md 是否已被打包。如已存在 → 用户只是没升级 Hermes，**不要提 issue**；如确实未打包 → 才向上游 `NousResearch/hermes-agent` 提 issue。
- 本会话教训（2026-05-23）：v0.12.0 上"持久缺失"的 finance×7 + searxng-search 全部已在 v0.14.0（`v2026.5.16`）合入（PR #21180 等）。差点错误地向上游提 issue —— 真因是用户本地落后 16 天。

## 关键发现（2026-05-17）

### 内置专属技能 `repo: ""` 检测逻辑

**现象**：`hermes skills install official/finance/lbo-model` 报错 `Could not fetch`，但 `hermes skills inspect official/finance/lbo-model` 成功返回完整信息。

**原因**：部分 official 技能的 `repo` 字段为空字符串（`repo: ""`），属于 Hermes 内置预装技能，其 SKILL.md 不通过外部仓库分发，而是本地存储在对应的功能分类目录下（如 `research/`、`mlops/`、`web-development/`），**不在** `finance/` 子目录中。

**受影响技能**：lbo-model、dcf-model、3-statement-model、comps-analysis、pptx-author、inference-sh-cli 等 finance 类，以及其他 `repo: ""` 的 official 技能。

**已确认的内置技能路径映射**（2026-05-18 初次整理 · 2026-05-20 最新）：

| Skill (索引名) | 索引 Identifier | 实际本地路径 | 状态 |
|---|---|---|---|
| inference-sh-cli | official/devops/**cli** | `devops/cli` | ✅ 已确认存在 |
| huggingface-accelerate | official/mlops/accelerate | `mlops/accelerate` | ✅ 已确认存在 |
| qdrant-vector-search | official/mlops/qdrant | `mlops/qdrant` | ✅ 已确认存在 |
| distributed-llm-pretraining-torchtitan | official/mlops/torchtitan | `mlops/torchtitan` | ✅ 已确认存在 |
| blackbox | official/autonomous-ai-agents/blackbox | `autonomous-ai-agents/blackbox` | ✅ 2026-05-20安装 |
| llava | official/mlops/llava | `mlops/llava` | ✅ 2026-05-20安装 |
| mcporter | official/mcp/mcporter | `mcp/mcporter` | ✅ 2026-05-20安装 |
| adversarial-ux-test | official/dogfood/adversarial-ux-test | `dogfood/adversarial-ux-test` | ✅ 已确认存在 |
| lbo-model | official/finance/lbo-model | **本地不存在** | ❌ 缺失 |
| 3-statement-model | official/finance/3-statement-model | **本地不存在** | ❌ 缺失 |
| comps-analysis | official/finance/comps-analysis | **本地不存在** | ❌ 缺失 |
| dcf-model | official/finance/dcf-model | **本地不存在** | ❌ 缺失 |
| pptx-author | official/finance/pptx-author | **本地不存在** | ❌ 缺失 |
| excel-author | official/productivity/excel-author | **本地不存在** | ❌ 缺失 |

> ⚠️ **2026-05-20 重大更新**：finance 类内置技能（lbo-model、3-statement-model、comps-analysis、dcf-model、pptx-author、excel-author）的 SKILL.md **本地完全不存在**，非但 `finance/` 子目录缺失，连 `research/` 或其他分类下也没有。`hermes skills install` 报 "Could not fetch" 是真的无法获取——这些 SKILL.md 尚未被官方内置到本地。

> ⚠️ **安装失败=真的不存在**：与 inference-sh-cli/huggingface-accelerate/qdrant 等已本地存在的 repo="" 技能不同，这 6 个 finance 技能是真正的缺失项。

**检测三步法**：
```bash
# 第1步：查索引确认 repo 字段
# 在 index JSON 中，repo === "" 即为内置专属技能

# 第2步：直接尝试安装（确认是否真的无法安装）
hermes skills install <identifier> --yes
# → "Could not fetch" 即确认

# 第3步：验证本地存在（确认 SKILL.md 位置）
# 方法A：按 name 搜索（推荐，一行搞定）
find ~/.hermes/skills -maxdepth 3 -name "SKILL.md" | xargs grep -l "^name: <skill-name>" 2>/dev/null | grep -q . && echo "EXISTS" || echo "MISSING"

# 方法B：按目录扫描（展示路径）
find ~/.hermes/skills -maxdepth 3 -type d -name "<skill-name>" 2>/dev/null

# 目录扫描（完整列表）
find ~/.hermes/skills -maxdepth 2 -name "SKILL.md" | sed 's|.*/.hermes/skills/||' | sed 's|/SKILL.md||'
```

**处理原则**（2026-05-25 修正：`repo: ""` ≠ 一定预装）：
- repo="" + 本地已存在 SKILL.md → "内置预装·无需安装"，跳过（如 inference-sh-cli, qdrant 等已确认列表）
- repo="" + install **成功** + 本地落盘 → "内置可下载·首次安装"（2026-05-25 实证：`neuroskill-bci`, `one-three-one-rule`, `openclaw-migration` 都是 repo="" 但 `hermes skills install` 一次成功并落盘）。**所以遇到 repo="" 的新条目必须先尝试 install 一次，不要预设它"不可安装"。**
- repo="" + install 失败 (`Could not fetch`) + 本地不存在 → "本地真缺失·需上游修复"（跳过，加入 KNOWN_MISSING 候选；先跑 `references/known-missing-and-blocked.md` 上游探针分类）
- repo="" + inspect 也超时 → 可能是网络问题，标记为"待确认"而非"不存在"

### hermes skills inspect 自身也可能超时（2026-05-19 发现）
部分 repo="" 内置技能的 `inspect` 命令本身也会超时（60s），即便 skill 存在。例如 `hermes skills inspect official/finance/dcf-model` 超时，但 `official/finance/lbo-model` 成功返回。这是安装器查询外部源时的网络行为差异，不代表 skill 不存在。

### 索引 Identifier 到安装路径的解析差异（2026-05-19）
同一 skill 在索引中的 identifier 与安装器实际接受的 identifier 不一致：

| Skill | 索引 Identifier | 安装器接受的 identifier | 结果 |
|-------|----------------|------------------------|------|
| inference-sh-cli | official/devops/**inference-sh-cli** | official/devops/**cli** | `Could not fetch` |
| huggingface-accelerate | official/mlops/**accelerate** | official/mlops/**accelerate** | ✅ 匹配 |
| qdrant-vector-search | official/mlops/**qdrant** | official/mlops/**qdrant** | ✅ 匹配 |
| peft-fine-tuning | official/mlops/**peft-fine-tuning** | official/mlops/**peft** | `Could not fetch` |
| simpo-training | official/mlops/**simpo-training** | official/mlops/**simpo** | `Could not fetch` |
| slime-rl-training | official/mlops/**slime-rl-training** | official/mlops/**slime** | `Could not fetch` |
| solana | official/research/**solana** | official/**blockchain**/solana | `Could not fetch`（path 重新分类）|
| drug-discovery | official/research/**drug-discovery** | official/research/**drug-discovery** | ✅ 匹配 |
| 1password | official/devops/**1password** | official/**security**/1password | 安装时 alias 自动解析 |
| memento-flashcards | official/productivity/**memento-flashcards** | official/productivity/**memento-flashcards** | ✅ 匹配 |
| pinecone | official/mlops/**pinecone** | official/mlops/**pinecone** | ✅ 匹配 |

**根本原因**：索引中 `identifier` 字段来自索引本身，而安装器有独立解析逻辑，直接用索引 identifier 可能会失败。**最佳实践**：`hermes skills inspect <索引identifier>` 成功后再从 inspect 输出中提取真正可用的 identifier。

### hermes skills list 表格截断问题（2026-05-17 发现）
`hermes skills list` 表格列宽固定，长技能名被截断成 `…`：
```
ai-models-leaderboa…   ← 实际是 ai-models-leaderboard
lark-workflow-meeti…   ← 实际是 lark-workflow-meeting-summary
lark-workflow-stand…   ← 实际是 lark-workflow-standup-report
```
正则 `\S+` 提取到截断后的名字，导致 script 中 `installed.has(s.name)` 永远为 false。

**修复算法**（已实现于 skill-scout.js）：

Hermes skills 目录结构为**两层**：
- **顶层**：`~/.hermes/skills/<name>/SKILL.md`（如 `clash-linux`、`tavily`）
- **子目录**：`~/.hermes/skills/<category>/<name>/SKILL.md`（如 `mlops/chroma`、`research/qmd`、`lark/lark-im`）

扫描逻辑：
1. 遍历 `~/.hermes/skills/` 顶层，对每个条目检测 `SKILL.md` 是否存在 → 记录为已安装
2. 对每个顶层条目，若 `SKILL.md` 不存在则递归进入，检测子目录的 `SKILL.md` → 记录子目录名为已安装
3. 返回合并后的 Set

**验证已安装技能的可靠方式**（不依赖 hermes CLI）：
```bash
# 方法1：检测特定 skill 是否存在（任意层级）
find ~/.hermes/skills -maxdepth 2 -name "SKILL.md" -path "*/qmd/SKILL.md" | grep -q . && echo "INSTALLED" || echo "NOT INSTALLED"

# 方法2：批量列出所有已安装 skill 名
find ~/.hermes/skills -maxdepth 2 -name "SKILL.md" | sed 's|.*/.hermes/skills/||' | sed 's|/SKILL.md||'
```

### skills.sh 安装超时
skills.sh 来源的技能需要从外部 GitHub 仓库克隆，60秒内未完成则超时。这是网络/仓库大小问题，非技能本身问题。

## 使用方式

### 手动运行

```bash
# 仅输出到终端
node ~/.hermes/skills/research/skill-scout/scripts/skill-scout.js

# 输出 + 推送到飞书
node ~/.hermes/skills/research/skill-scout/scripts/skill-scout.js --feishu

# 保存到本地文件
node ~/.hermes/skills/research/skill-scout/scripts/skill-scout.js --output=~/skill-scout-report.md

# 静默模式（仅推送，不打印）
node ~/.hermes/skills/research/skill-scout/scripts/skill-scout.js --feishu --quiet
```

### 输出示例

```
## 🔭 Skill Scout · 每日精选 · 2026-05-26

🥇 **1. inference-sh-cli** · ⭐ official · 📊 6.6/10
   Run 150+ AI apps via inference.sh CLI (infsh) — image generation, video creation, LLMs, search... · *AI, image-generation, video*

🥈 **2. huggingface-accelerate** · ⭐ official · 📊 6.0/10
   Simplest distributed training API. 4 lines to add distributed support to any PyTorch script... · *Distributed Training, HuggingFace*

🔹 **4. adversarial-ux-test** · ⭐ official · 📊 5.9/10
   Roleplay the most difficult, tech-resistant user for your product... · *qa, ux, testing*
```

💡 **安装命令**（⚠️ 每次只能安装 1 个，需加 `--yes` 确认）：

```bash
hermes skills install --yes <skill-id>
```

## 安装工作流（重要）

> ⚠️ **索引 Identifier ≠ 安装路径**：skill-scout 报告中的 `source/category/name` 直接作为 `hermes skills install` 参数可能失败。Hermes 安装器有独立的解析逻辑。

### 安装前预检（避免无用重试）

> Top 10 候选很可能已是已安装状态，先扫描再尝试安装，节省 60+ 秒/个。
>
> ⚠️ **2026-05-24 重复教训**：`repo: ""` 的 official 内置技能（如 inference-sh-cli,
> huggingface-accelerate, qdrant-vector-search, distributed-llm-pretraining-torchtitan,
> peft-fine-tuning, simpo-training, slime-rl-training, adversarial-ux-test）每次都被
> scout 算成"未安装"，但其本地 SKILL.md 已经在对应分类目录下。**永远先用下面的目录探测**
> 一遍，安装命令只对真正缺失的跑。否则每天浪费 8×60s=8 分钟在已存在的技能上。
>
> 根本修复方向：在 `skill-scout.js` 的"已安装"判定里，对 `repo===""` 的条目同时按
> `name` 在 `~/.hermes/skills` 下递归 `find SKILL.md`，命中即视为已安装。

```bash
# 批量检查候选是否已安装（目录扫描，不依赖 hermes skills list）
for name in qmd duckduckgo-search inference-sh-cli chroma lbo-model nemo-curator 3-statement-model clip fastmcp page-agent; do
  if find ~/.hermes/skills -maxdepth 2 -name "$name" -type d | grep -q .; then
    echo "INSTALLED: $name"
  else
    echo "NOT INSTALLED: $name"
  fi
done
```

### 安装前验证
```bash
# 用 inspect 确认正确路径（最可靠）
hermes skills inspect <reported-identifier>

# inspect 成功后，用 inspect 输出中的 Identifier 安装
hermes skills install <correct-identifier> --yes
```

**安装结果判定**：
- `Installed: <path>` → ✅ 成功
- `Warning: 'xxx' is already installed` → ✅ 已存在，无需处理
- `Error: Could not fetch` → ❌ 技能不存在（repo="" + 本地缺失），跳过
- `Quarantined to .hub/quarantine/...` + `Decision: ALLOWED` → ✅ 正常安装（安全扫描触发隔离属正常流程）
- `Decision: BLOCKED — community source + caution/dangerous verdict` → ⚠️ **cron 模式下不要 `--force`**。记录到"失败待处理"让用户决定。这是 Hermes 安全门槛，不是网络/路径问题，重试无意义。常见触发：SKILL.md 里包含 `npm install` / `pip install` / `git clone` 等 supply-chain 调用（如 2026-05-25 的 `transformers-js`：2 个 supply_chain MEDIUM 命中即被 BLOCKED）。
- `Error: Could not find` → ❌ identifier 不存在，跳过

### 已安装检查（hermes skills list 超时/卡死时）
```bash
# 替代方案：直接扫描 skills 目录
find ~/.hermes/skills -maxdepth 2 -name "SKILL.md" | while read f; do
  echo "${f#*/.hermes/skills/}" | sed 's|/SKILL.md||'
done
```

### GitHub 限流处理
GitHub 未认证用户 60 请求/小时限额很容易耗尽。处理顺序：

1. **先等 60 秒再重试**（有时限流会在 1 分钟内解除）
2. **用 `hermes skills inspect` 确认 skill 存在**，获取正确的安装 identifier
3. **仍然失败则跳过**，不阻塞其他 skill
4. **根本解法**：在 `~/.hermes/.env` 中添加 `GITHUB_TOKEN=ghp_...`

```bash
# ~/.hermes/.env 中找到并启用：
# GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

## 飞书推送（lark-cli v1.x）

```bash
# 正确语法（v1.x）
lark-cli im +messages-send \
  --chat-id oc_0fee7fe79f079f6bcc02e2a1a27e66f8 \
  --text "报告内容"

# 推送 Markdown 内容
lark-cli im +messages-send \
  --chat-id oc_0fee7fe79f079f6bcc02e2a1a27e66f8 \
  --markdown "$(cat report.md)"
```

> ⚠️ **常见错误**：`lark-cli im message create` 是旧语法（v0.x）。v1.x 的子命令是 `+messages-send`，不是 `message create`。
> ⚠️ **字段名**：v1.x 使用 `--chat-id`（不是 `--chat_id`），`--msg-type` 已废弃，由 `--text`/`--markdown` 自动推断类型。

## 安全机制

1. **只归档不删除**：Curator 机制保护已安装 skill，Pinned skill 不会被覆盖
2. **静态正则边界过滤**：排除含 `broken/scam/fake/deprecated/abandoned` 等明确有害的 skill
3. **来源中性**：所有来源一视同仁，官方仅享 +1.0 微调，不决定排名
4. **人工决策**：最终安装决定权在用户，Cron Job 只推送报告不自动安装
5. **描述兜底**：无描述或描述 <10 字符的 skill 无法评估，直接排除

## 依赖

- Hermes Agent（内置 `hermes skills` CLI）
- lark-cli（用于飞书推送，可选）
- Node.js 14+

## 故障排查

**问题：索引文件不存在**
```bash
# 重建索引
hermes skills browse --source all --size 1
```

**问题：已安装数量显示不对**
```bash
# 验证已安装列表
hermes skills list
```

**问题：飞书推送失败**
```bash
# 检查 lark-cli 绑定状态
lark-cli config show
# 重新绑定
lark-cli config bind --source hermes
```
