---
name: skill-scout
description: |
  AI Agent 自主成长侦察兵。每天从 Hermes 技能市场索引（lobehub、clawhub、official、github 等 842+ skills）中，
  通过多维度评分筛选出最值得安装的 20+ 个候选，生成报告推送到飞书，供你决策。
  核心功能：目标驱动评分、边界过滤、来源中性、不拘来源质量至上、安全过滤、每日推送。
version: "1.0"
author: Hermes Scout
license: MIT
tags: [autonomous-growth, skill-discovery, daily-report, feishu]
created: 2026-05-13
updated: 2026-05-13
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

详见 `references/operations.md`（GitHub 推送、飞书推送机制、常见问题排查）。

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
## 🔭 Skill Scout · 每日精选 · 2026-05-13

| # | Skill | 来源 | ⭐ | 简介 |
|---|---|---|---|---|
| 1 | fastmcp | ⭐ official | 7.8/10 | Build, test, inspect, install, and deploy MCP servers... |
| 2 | qmd | ⭐ official | 7.8/10 | Search personal knowledge bases, notes, docs... |

💡 安装命令：
hermes skills install official/mcp/fastmcp
hermes skills install official/research/qmd
```

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
