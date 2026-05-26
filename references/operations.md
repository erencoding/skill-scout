# skill-scout 运维笔记

## 索引文件

路径：`~/.hermes/skills/.hub/index-cache/hermes-index.json`

读取方式：直接 `JSON.parse()` 而非解析 `hermes skills browse` CLI 表格输出（Unicode BOX 字符跨环境不兼容）。

```bash
# 手动刷新索引
hermes skills browse --source all --size 1
```

## GitHub 限流（重要）

GitHub 未认证用户 60 请求/小时限额在安装多个 skill 时极易耗尽。

**症状**：`Could not fetch 'official/...' from any source` + `GitHub API rate limit exhausted`

**解决**：在 `~/.hermes/.env` 中取消注释并填入：
```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```
获取：https://github.com/settings/tokens（Fine-grained PAT，需 `contents:read` 权限）

**临时应对**：等待 60 秒再重试（部分限流会快速解除），但 finance 类 skill 普遍需要 GitHub API，重试不一定成功。

## GitHub 推送

仓库已关联 SSH remote，`git push` 走 SSH agent 认证：

```bash
cd ~/.hermes/skills/research/skill-scout
git add . && git commit -m "..." && git push origin master
```

无需 token 输入。

## 飞书推送机制

### 方式一：lark-cli（推荐，cron 环境）
```bash
lark-cli im +messages-send \
  --chat-id oc_0fee7fe79f079f6bcc02e2a1a27e66f8 \
  --markdown "$(cat report.md)"
```

> 注意：`--msg-type text --content` 是旧语法。v1.x 使用 `--markdown`/`--text` 自动推断类型。

### 方式二：脚本静默模式 + 文件落地
脚本保存报告到 `~/.hermes/cron/output/skill-scout-latest.md`，Cron agent 读取后推送。

```bash
# 验证推送文件
cat ~/.hermes/cron/output/skill-scout-latest.md | head -5
```

## 安装失败排查

**hermes skills install 失败但 inspect 成功**：索引 identifier 与安装器解析路径不一致，用 `hermes skills inspect <id>` 获取实际 Identifier 再安装。

**bioinformatics 安装警告**：该 skill 被安全扫描标记为 CAUTION（`sudo apt install` 高权限命令 + 多个外部 Git 克隆）。根因是其 SKILL.md 内含 `samtools bcftools ncbi-blast+` 等系统工具安装指令，以及 `git clone` 外部仓库。遇到时记录为 CAUTION 级别，建议人工确认后再用于生产环境。

**索引存在但 install 报 `Could not fetch`**：区分三种子情况，处理策略完全不同：

### 情况 A：`inspect` 成功 + `repo: ""` 的 official 内置技能
- 症状：`inspect` 有输出，`install` 报 `Could not fetch`
- **重要区分**：部分此类技能本地 SKILL.md 实际存在，另一部分**本地也缺失**
  - ✅ 加速类/qdrant：已确认本地存在于 `mlops/`，无需处理
  - ❌ finance 类（lbo-model、3-statement-model、comps-analysis、dcf-model）：本地 `research/` 路径下**未找到**，属于"索引标记内置但本地未同步"
- 处理：先用 `find ~/.hermes/skills -maxdepth 3 -name "<name>/SKILL.md"` 确认本地是否存在

### 情况 B：`inspect` 超时（60s）+ `repo: ""`
- 症状：`hermes skills inspect official/finance/dcf-model` 超时，但其他同组 skill 正常
- 原因：安装器查询外部源时部分节点网络抖动，不代表 skill 不存在
- 处理：改用 `find ~/.hermes/skills -maxdepth 3 -name "SKILL.md" -path "*/<name>/SKILL.md"` 验证本地存在性

### 情况 B：`inspect` 成功 + 有外部 repo（GitHub 限流/网络问题）
- 症状：`inspect` 有内容，`install` 报 `Could not fetch`
- 原因：GitHub API 限流（60请求/小时）或源站网络抖动
- 处理：等 60 秒重试 1-2 次通常自动恢复；配置 `GITHUB_TOKEN` 可根除

### 情况 C：`inspect` 报 `Could not find`
- 原因：索引路径已不存在（被删除/迁移/从未创建），跳过无法重试解决

### skills.sh 来源安装超时
- 症状：60秒内无法完成 Git 克隆
- 处理：下次再试，或配置代理

**安全扫描拦截含 emoji 的 heredoc**：
`cat << 'REPORT'` 包含 emoji、VS 字符时会触发安全扫描拦截。**不要用 heredoc 管道传内容给 lark-cli**，正确两步法：
```bash
# 步骤1：写报告文件
cat > /tmp/report.md << 'EOF'
内容...
EOF

# 步骤2：读取文件发送（正确）
lark-cli im +messages-send --chat-id <id> --markdown "$(cat /tmp/report.md)"

# 注意：--content 和 --msg-type text 是旧语法，v1.x 只认 --markdown / --text
# 不要用：lark-cli im message create --chat-id ... --content "$(cat -)"
# 正确用：lark-cli im +messages-send --chat-id ... --markdown "$(cat file)"
```

**hermes skills list 超时/卡死**：改用目录扫描：
```bash
find ~/.hermes/skills -maxdepth 2 -name "SKILL.md" | wc -l
```

**索引文件不存在**：`hermes skills browse --source all --size 1`

**≥5 分候选为 0**：检查 `hermes-index.json` 是否存在且有内容。

**飞书绑定失效**：`lark-cli config bind --source hermes --identity user-default`

## 安装前验证速查

```bash
# 1. 检查本地是否已存在（避免重复安装）
ls ~/.hermes/skills/<category>/<name>/SKILL.md 2>/dev/null && echo "已本地存储"

# 2. 用 inspect 确认正确路径
hermes skills inspect <source>/<category>/<name>

# 3. 确认已安装列表
hermes skills list

# 4. 验证索引可用性
ls ~/.hermes/skills/.hub/index-cache/hermes-index.json
```
