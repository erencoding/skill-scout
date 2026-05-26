#!/usr/bin/env node
/**
 * skill-scout.js
 * AI Agent 自主成长侦察兵
 *
 * 目标驱动 · 边界过滤 · 来源中性
 *
 * 直接读取 ~/.hermes/skills/.hub/index-cache/hermes-index.json
 * 解析 + 评分 + 过滤 + 生成 Markdown 报告
 *
 * 用法：
 *   node skill-scout.js                    # 输出到 stdout
 *   node skill-scout.js --feishu           # 同时推送到飞书
 *   node skill-scout.js --output report.md  # 保存到文件
 *   node skill-scout.js --feishu --quiet   # 静默模式（推送后不打印）
 */

const fs = require('fs');
const path = require('path');

// ── 参数解析 ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const optFeishu   = args.includes('--feishu');
const optQuiet    = args.includes('--quiet');
const optOutput   = args.find(a => a.startsWith('--output='))?.split('=')[1];

// ── 路径常量 ────────────────────────────────────────────────────────────
const HERMES_HOME = process.env.HERMES_HOME || path.join(process.env.HOME, '.hermes');
const INDEX_PATH  = path.join(HERMES_HOME, 'skills/.hub/index-cache/hermes-index.json');
const SKILLS_DIR  = path.join(HERMES_HOME, 'skills');

// ── 读取 Hermes skill 索引 ──────────────────────────────────────────────
function loadHermesIndex() {
  try {
    const raw = fs.readFileSync(INDEX_PATH, 'utf8');
    const d = JSON.parse(raw);
    return d.skills || [];
  } catch (e) {
    console.error('❌ 无法读取索引文件:', e.message);
    return [];
  }
}

// ── 读取已安装的 skill 列表 ─────────────────────────────────────────────
// 优先用目录扫描（最可靠，不受 CLI 输出截断影响）
// hermes skills list 表格格式会截断长技能名（如 ai-models-leaderboard → ai-models-leaderboa…）
// 两层结构：顶层 ~/.hermes/skills/<name>/ 和子目录 ~/.hermes/skills/<category>/<name>/
function getInstalledSkills() {
  const installed = new Set();

  function scanDir(dir) {
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            const skillMd = path.join(fullPath, 'SKILL.md');
            if (fs.existsSync(skillMd)) {
              // 子目录形式：category/name，直接用目录名作为 skill 名
              installed.add(entry);
            } else {
              // 可能是顶层目录，继续递归
              scanDir(fullPath);
            }
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.error('⚠️ 目录扫描失败:', e.message);
    }
  }

  // 扫描顶层（顶层目录本身就是 skill）
  try {
    const topEntries = fs.readdirSync(SKILLS_DIR);
    for (const entry of topEntries) {
      const skillPath = path.join(SKILLS_DIR, entry, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        installed.add(entry);
      }
    }
  } catch (e) { /* ignore */ }

  // 扫描子目录（category/name 结构）
  scanDir(SKILLS_DIR);

  return installed;
}

// ── 已知持久缺失（official repo:"" + 本地 SKILL.md 不存在）────────────────
// 这些技能在索引里有，但 hermes skills install 永远报 "Could not fetch"，
// 因为对应的 SKILL.md 没被打进当前 Hermes 发行版。每天推荐它们只是噪声。
// 来源：references/known-missing-and-blocked.md（最后核对：2026-05-23）
// 当上游 Hermes 释出这些 skill 后，从这里移除即可恢复推荐。
const KNOWN_MISSING = new Set([
  'official/finance/lbo-model',
  'official/finance/3-statement-model',
  'official/finance/pptx-author',
  'official/finance/comps-analysis',
  'official/finance/dcf-model',
  'official/finance/merger-model',
  'official/finance/excel-author',
  'official/research/searxng-search',
]);

function isKnownMissing(skill) {
  const id = skill.identifier || `${skill.source}/${skill.name}`;
  return KNOWN_MISSING.has(id);
}

// ── 边界过滤：排除有问题的 Skill ─────────────────────────────────────────
// 这些是绝对底线，有任意一项匹配就直接排除
const BOUNDARY_PATTERNS = [
  { pattern: /do\s*not\s*use/i,        reason: '明确声明不可用' },
  { pattern: /broken/i,                 reason: '已损坏' },
  { pattern: /experimental/i,           reason: '实验性项目（风险未知）' },
  { pattern: /draft/i,                  reason: '草稿阶段' },
  { pattern: /test-only/i,              reason: '仅供测试' },
  { pattern: /do-not-install/i,         reason: '明确要求不要安装' },
  { pattern: /fake/i,                   reason: '虚假项目' },
  { pattern: /scam/i,                   reason: '疑似诈骗' },
  { pattern: /deprecated/i,            reason: '已废弃' },
  { pattern: /abandoned/i,              reason: '已弃置' },
];

function isBlocked(skill) {
  const name = skill.name || '';
  const desc = skill.description || '';
  for (const { pattern, reason } of BOUNDARY_PATTERNS) {
    if (pattern.test(name) || pattern.test(desc)) {
      return reason;
    }
  }
  return null; // 通过边界检查
}

// ── 实用性关键词 ─────────────────────────────────────────────────────────
// 覆盖主流工具、平台、技术栈、语言、场景
const USEFUL_KEYWORDS = [
  // 平台 & 通信
  'lark', 'feishu', '飞书', 'telegram', 'slack', 'discord', 'wechat', '微信',
  'notion', 'linear', 'jira', 'asana', 'trello', 'asana',
  // Git & 代码
  'github', 'gitlab', 'bitbucket', 'git', 'code review', 'pull request',
  'docker', 'kubernetes', 'k8s', 'container', 'nginx', 'caddy',
  // Web & 网络
  'browser', 'web', 'http', 'rest', 'graphql', 'websocket', 'api',
  'cloudflare', 'aws', 'gcp', 'azure', 'vercel', 'netlify',
  // 数据 & 存储
  'database', 'postgres', 'mysql', 'redis', 'mongodb', 'sqlite', 'sqlite',
  'csv', 'excel', 'spreadsheet', 'pdf', 'etl',
  // AI & ML
  'llm', 'large language model', 'claude', 'gpt', 'gemini', 'mistral',
  'openai', 'anthropic', 'hugging face', 'embedding', 'vector',
  'rag', 'retrieval', 'fine-tuning', 'training', 'mlops',
  'arxiv', 'paper', 'research', 'academic',
  // 任务 & 自动化
  'automation', 'cron', 'schedule', 'webhook', 'trigger',
  'terminal', 'shell', 'bash', 'zsh', 'script',
  'email', 'smtp', 'imap',
  // 媒体 & 内容
  'youtube', 'video', 'audio', 'music', 'speech', 'transcribe',
  'image', 'vision', 'ocr', 'screenshot',
  // 安全 & 认证
  'auth', 'oauth', 'jwt', 'sso', 'password', '2fa', 'security',
  // 开发工具
  'python', 'javascript', 'typescript', 'rust', 'go', 'java', 'c++',
  'jupyter', 'notebook', 'debug', 'test', 'monitor',
  'ci/cd', 'github actions', 'jenkins', 'gitlab ci',
  // 效率 & 知识
  'knowledge base', 'notes', 'docs', 'documentation',
  'calendar', 'meeting', 'zoom', 'schedule',
  'analytics', 'dashboard', 'metrics', 'observability',
  'sentry', 'error', 'logging', 'tracing',
  // 垂直领域
  'blockchain', 'crypto', 'web3', 'defi',
  'finance', 'trading', 'stock', 'invest',
  'health', 'medical', 'bioinformatics',
  'iot', 'hardware', 'robot',
];

// ── 评分函数 ────────────────────────────────────────────────────────────
// 评分聚焦于"目标达成度"：这个 Skill 是否真正有用、文档是否完整、是否与常见需求相关
// 来源只是加分项之一，不决定生死
// 满分 10 分，≥5 分进入候选
function scoreSkill(skill) {
  let score = 0;
  const name = skill.name || '';
  const desc = skill.description || '';
  const tags = skill.tags || [];
  const descLower = desc.toLowerCase();
  const nameLower = name.toLowerCase();

  // ── 维度 1：描述质量（3分）─────────────────────────────────────────────
  // 有用且完整的文档是高质量 Skill 的首要标志
  if (desc.length > 150) score += 3.0;
  else if (desc.length > 80)  score += 2.2;
  else if (desc.length > 40)  score += 1.4;
  else if (desc.length > 15)  score += 0.6;

  // ── 维度 2：实用性关键词匹配（3分）────────────────────────────────────
  const allText = descLower + ' ' + nameLower;
  const matched = USEFUL_KEYWORDS.filter(k => allText.includes(k.toLowerCase()));
  score += Math.min(3.0, matched.length * 0.18);

  // ── 维度 3：结构化程度（1.5分）────────────────────────────────────────
  // 有 tags 说明开发者做了分类，文档意识强
  if (tags.length >= 3) score += 1.5;
  else if (tags.length >= 1) score += 0.8;

  // ── 维度 4：新鲜度（1.5分）────────────────────────────────────────────
  const dateField = skill.extra?.updated_at || skill.extra?.created_at;
  if (dateField) {
    const days = (Date.now() - new Date(dateField).getTime()) / (1000 * 60 * 60 * 24);
    if (days < 7)    score += 1.5;
    else if (days < 30)  score += 1.0;
    else if (days < 90)  score += 0.5;
    // 90 天以上不加不减，不惩罚老而弥坚的项目
  }

  // ── 维度 5：来源微调（1分）—— 不是门槛，只是信号 ────────────────────
  // official 来源通常质量更稳定，给一个小的额外信任分
  // 但clawhub/lobehub 也有大量高质量内容，github 来源如果是知名项目也值得看
  const sourceBonus = {
    'official': 1.0,
    'claude-marketplace': 0.9,
    'lobehub': 0.4,
    'clawhub': 0.4,
    'github': 0.5,
  };
  score += sourceBonus[skill.source] ?? 0.3;

  // ── 边界检查（已在过滤阶段做过，这里做兜底）───────────────────────────
  const blockReason = isBlocked(skill);
  if (blockReason) score = 0;

  return Math.min(10, Math.max(0, score));
}

// ── 来源友好标签 ─────────────────────────────────────────────────────────
const SOURCE_LABELS = {
  'official': '⭐ official',
  'lobehub': '🔮 lobehub',
  'clawhub': '🦞 clawhub',
  'github': '🐙 github',
  'claude-marketplace': '🤖 claude-marketplace',
};
function sourceLabel(src) {
  return SOURCE_LABELS[src] || src || '🌐 unknown';
}

// ── 生成 Markdown 报告 ───────────────────────────────────────────────────
function generateReport(allSkills, installed, candidates) {
  const today = new Date().toISOString().slice(0, 10);
  const top25 = candidates.slice(0, 25);

  // 索引来源分布（用于参考，不作为门槛）
  const sourceStats = {};
  for (const s of allSkills) {
    const src = s.source || '?';
    sourceStats[src] = (sourceStats[src] || 0) + 1;
  }

  let md = `## 🔭 Skill Scout · 每日精选 · ${today}\n\n`;
  md += `**目标：找到真正有用的 Skill，不拘来源。**\n`;
  md += `索引总量 ${allSkills.length} 个 · 已安装 ${installed.size} 个 · 未安装 ≥5分候选 ${candidates.length} 个\n\n`;

  // 排名图标：前 3 名用奖牌，其余用菱形
  const rankIcon = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return '🔹';
  };

  top25.forEach((s, i) => {
    const d = (s.description || '').replace(/\n/g, ' ').substring(0, 100);
    const src = sourceLabel(s.source);
    const tags = (s.tags || []).slice(0, 3).join(', ');
    md += `${rankIcon(i)} **${i+1}. ${s.name}** · ${src} · 📊 ${s.score.toFixed(1)}/10\n`;
    md += `   ${d}${tags ? ` · *${tags}*` : ''}\n\n`;
  });

  md += `\n---\n`;
  md += `🛡️ **安全边界**：已过滤禁用/损坏/诈骗/废弃项目（静态正则 + 描述长度兜底）\n`;
  md += `📊 **索引分布**：${Object.entries(sourceStats).map(([k,v]) => `${sourceLabel(k)} ${v}个`).join(' · ')}\n\n`;
  md += `💡 **安装命令**（复制执行，建议每次 3-5 个避免冲突）：\n\n`;

  top25.slice(0, 10).forEach(s => {
    const id = s.identifier || `${s.source}/${s.name}`;
    md += "```bash\nhermes skills install " + id + "\n```\n";
  });

  md += `\n---\n*由 Skill Scout 自动生成 · Hermes Agent · ${new Date().toISOString()}*`;
  return md;
}

// ── 推送飞书 ────────────────────────────────────────────────────────────
// Cron 环境下脚本无法直接调 Hermes send_message 工具。
// 策略：保存报告到固定路径，由 cron job 的 agent 读取后通过 send_message 推送。
function pushToFeishu(md) {
  const CRON_OUTPUT_DIR = path.join(HERMES_HOME, 'cron/output');
  const REPORT_FILE = path.join(CRON_OUTPUT_DIR, 'skill-scout-latest.md');

  try {
    fs.mkdirSync(CRON_OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(REPORT_FILE, md, 'utf8');
    console.log(`📁 报告已保存: ${REPORT_FILE}`);
    return REPORT_FILE;
  } catch (e) {
    console.error('❌ 保存报告失败:', e.message);
    return null;
  }
}

// ── 主函数 ──────────────────────────────────────────────────────────────
function main() {
  console.log('🔭 Skill Scout 启动...');
  console.log(`📂 索引: ${INDEX_PATH}`);

  const allSkills = loadHermesIndex();
  if (!allSkills.length) {
    console.error('❌ 索引为空或读取失败');
    process.exit(1);
  }
  console.log(`📊 索引总量: ${allSkills.length} 个`);

  const installed = getInstalledSkills();
  console.log(`📦 已安装: ${installed.size} 个`);

// ── 过滤 + 评分 + 排序 ─────────────────────────────────────────────────
  // 第一层：边界过滤（安全底线）
  // 第二层：描述完整性（无法评估无描述的 Skill）
  // 第三层：去重（同名 Skill 取最高分）
  // 第四层：评分
  // 第五层：阈值筛选
  // 第六层：排除已安装（确保 Top 候选全部为未安装状态）
const seen = new Set();
  let candidates = allSkills
    // 边界过滤（安全底线）
    .filter(s => !isBlocked(s))
    // 已知持久缺失（official repo:"" 但本地无 SKILL.md，永远装不上）
    .filter(s => !isKnownMissing(s))
    // 描述完整性（无法评估无描述的 Skill）
    .filter(s => s.description && s.description.length > 10)
    // 去重
    .filter(s => !seen.has(s.name) && seen.add(s.name))
    // 排除已安装（在评分前排除，减少不必要的评分计算）
    .filter(s => !installed.has(s.name))
    // 评分
    .map(s => ({ ...s, score: scoreSkill(s) }))
    // 阈值筛选
    .filter(s => s.score >= 5.0)
    // 排序
    .sort((a, b) => b.score - a.score);

  console.log(`✅ 未安装 ≥5分候选: ${candidates.length} 个 (已过滤 ${KNOWN_MISSING.size} 个已知缺失)`);

  const report = generateReport(allSkills, installed, candidates);

  if (optOutput) {
    fs.writeFileSync(optOutput, report, 'utf8');
    console.log(`📁 已保存: ${optOutput}`);
  }

  let reportFile = null;
  if (optFeishu) {
    reportFile = pushToFeishu(report);
  }

  if (!optQuiet) {
    console.log('\n' + report);
    if (reportFile) {
      console.log(`\n📬 飞书推送文件: ${reportFile}`);
    }
  }

  return { report, reportFile };
}

main();
