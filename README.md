# 🔭 skill-scout

**AI Agent 自主成长侦察兵**

每天从 Hermes 技能市场索引中，通过多维度评分筛选出最值得安装的 Skill，生成报告推送到飞书，供你决策。

---

## 设计原则

| 原则 | 说明 |
|------|------|
| **目标驱动** | 聚焦"真正有用"——描述完整、关键词匹配实用场景、结构化文档完整 |
| **边界过滤** | 排除明确有害的 Skill（损坏/废弃/诈骗/声明不可用等） |
| **来源中性** | 所有来源一视同仁，官方不一定最好，草根不一定差，质量说了算 |

---

## 评分标准（满分 10 分，≥5 分通过）

| 维度 | 分值 | 说明 |
|------|------|------|
| 描述质量 | 3.0 | >150 字符 = 满分，越长越详细 |
| 关键词匹配 | 3.0 | 命中 100+ 实用场景关键词 |
| 结构化标签 | 1.5 | 有 tags = 0.8，3+ = 1.5 |
| 新鲜度 | 1.5 | 7 天内 = 满分，90 天+ 不扣分 |
| 来源微调 | 1.0 | 官方 +1.0，其余均等 |

> 来源只是加分项之一，不决定生死。一个 lobehub 的完整 Skill 可以超过官方的简单 Skill。

---

## 安全边界

以下 Skill 直接排除：`broken` / `deprecated` / `abandoned` / `experimental` / `fake` / `scam` / `do-not-install` / `draft`

---

## 安装

```bash
hermes skills install github:erencoding/skill-scout
```

## 手动运行

```bash
# 仅输出到终端
node ~/.hermes/skills/research/skill-scout/scripts/skill-scout.js

# 输出 + 推送到飞书
node ~/.hermes/skills/research/skill-scout/scripts/skill-scout.js --feishu

# 保存到本地文件
node ~/.hermes/skills/research/skill-scout/scripts/skill-scout.js --output ~/skill-scout-report.md
```

## 自动运行（Cron）

```bash
hermes cron create \
  --name "Skill Scout 每日精选" \
  --schedule "0 8 * * *" \
  --prompt "运行 Skill Scout 报告并推送到飞书。执行：node ~/.hermes/skills/research/skill-scout/scripts/skill-scout.js --feishu --quiet" \
  --skills "skill-scout"
```

---

## 文件结构

```
skill-scout/
├── SKILL.md               # Hermes Skill 元数据
└── scripts/
    └── skill-scout.js    # 核心脚本（直接读 hermes-index.json）
```

---

MIT · Hermes Agent
