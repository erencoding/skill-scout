# Known-Missing and Security-Blocked Skills

Curated list of skills that **consistently fail to install** on the user's
current local Hermes installation. Use this to skip retries and save ~60s
per skill per run.

Last verified: 2026-05-23

> ⚠️ **Important framing**: "missing" here can mean two different things.
> Always classify before adding to the list, and re-check before recommending
> a GitHub issue:
>
> 1. **Locally missing, upstream-shipped** — skill exists in a newer Hermes
>    release tarball but not in the user's installed version. **Fix: upgrade
>    Hermes**, not file issue.
> 2. **Truly upstream-missing** — skill not in any release tarball, only in
>    the index. **Fix: file issue at `NousResearch/hermes-agent`.**
>
> Always run the upstream-verification probe below before classifying.

---

## Upstream verification probe (run before classifying)

```bash
# Confirm Hermes upstream repo and check latest release for the skill path
source ~/.hermes/.env  # for GITHUB_TOKEN

# 1. Get latest release tag
LATEST=$(curl -sS -H "Authorization: token ${GITHUB_TOKEN}" \
  https://api.github.com/repos/NousResearch/hermes-agent/releases/latest \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["tag_name"])')
echo "Latest Hermes: $LATEST"

# 2. Compare with local version
hermes --version | head -1

# 3. Check if the skill path exists in the latest tarball
curl -sSL -H "Authorization: token ${GITHUB_TOKEN}" \
  "https://api.github.com/repos/NousResearch/hermes-agent/zipball/${LATEST}" \
  -o /tmp/hermes-latest.zip
unzip -l /tmp/hermes-latest.zip | grep -E "optional-skills/finance|optional-skills/research/searxng"
rm -f /tmp/hermes-latest.zip
```

If the path appears in the tarball → it's `Locally missing, upstream-shipped`.
Tell the user to upgrade. **Do not file an upstream issue.**

---

## Locally Missing on user's current Hermes (v0.12.0, 2026-04-30)

These were originally classified as "persistently missing" but verified
2026-05-23 to ship in **Hermes v0.14.0** (`v2026.5.16`) under
`optional-skills/finance/` and `optional-skills/research/searxng-search/`.
They will install once the user upgrades.

| Skill | Indexed Path | Upstream Status (verified 2026-05-23) |
|---|---|---|
| `lbo-model` | `finance/lbo-model` | ✅ Ships in v0.14.0 (PR #21180 merged 2026-05-07) |
| `3-statement-model` | `finance/3-statement-model` | ✅ Ships in v0.14.0 |
| `pptx-author` | `finance/pptx-author` | ✅ Ships in v0.14.0 |
| `comps-analysis` | `finance/comps-analysis` | ✅ Ships in v0.14.0 |
| `dcf-model` | `finance/dcf-model` | ✅ Ships in v0.14.0 |
| `merger-model` | `finance/merger-model` | ✅ Ships in v0.14.0 |
| `excel-author` | `finance/excel-author` | ✅ Ships in v0.14.0 (in `finance/`, not `productivity/`) |
| `searxng-search` | `research/searxng-search` | ✅ Ships in v0.14.0 (PR series open + merged) |

**Recommended action for the user**: upgrade Hermes Agent to ≥ v0.14.0, then
remove these entries from `KNOWN_MISSING` in `scripts/skill-scout.js` and
re-verify `hermes skills install` succeeds.

### Pending classification — needs upstream probe next run

Discovered during install attempts but not yet classified as
`Locally missing, upstream-shipped` vs `Truly upstream-missing`. Run the
upstream-verification probe BEFORE adding to `KNOWN_MISSING` or filing an issue.

| Skill | Indexed Path | Symptoms | First Seen | Last Seen |
|---|---|---|---|---|
| `osint-investigation` | `official/research/osint-investigation` | `repo: ""`, `Could not fetch` after 30s+ retry, `inspect` succeeds and shows full metadata, no local SKILL.md anywhere under `~/.hermes/skills/` | 2026-05-24 | 2026-05-25 (still failing) |

> 2026-05-25 update: `osint-investigation` failed install for the second
> consecutive day with the same `Could not fetch` symptom. `inspect` returns full
> Identifier `official/research/osint-investigation` and rich metadata, so the
> index entry is real but the SKILL.md is not in the user's local install. Run
> the upstream-verification probe BEFORE adding to `KNOWN_MISSING` — likely
> falls into the same "ships in newer Hermes" bucket as the finance group.

Probe checklist for these:
1. `grep -E "research/osint-investigation"` against the latest release tarball
2. If shipped → user should upgrade; do NOT file issue
3. If absent → file issue at `NousResearch/hermes-agent` and add to `KNOWN_MISSING`

### Detection (one-shot, no install attempt)

```bash
python3 - <<'PY'
import json, pathlib
idx = json.loads(pathlib.Path('/root/.hermes/skills/.hub/index-cache/hermes-index.json').read_text())
hermes = pathlib.Path.home() / '.hermes/skills'
missing = []
for s in idx['skills']:
    if s.get('source') != 'official' or s.get('repo'):
        continue
    name = s['name']
    found = any(p.name == 'SKILL.md' for p in hermes.rglob(f'{name}/SKILL.md'))
    if not found:
        missing.append(s['identifier'])
print('\n'.join(missing))
PY
```

If the script returns the same identifiers as the table above, the user has
not yet upgraded. If new identifiers appear, run the upstream-verification
probe to classify them before adding.

---

## Security-Blocked Community Skills

Hermes auto-scans community skills (clawhub, lobehub, github, skills.sh) and BLOCKs installation when:
- `dangerous` verdict (any number of findings)
- `caution` verdict + ≥10 findings on community source

**Policy: do NOT use `--force` to override blocked installs in cron/automated runs.**
The findings are usually external `pip install` / `git clone` calls embedded in scripts —
not necessarily malicious, but require human review before trusting.

### Recurring Examples

| Skill | Source | Verdict | Findings | Action |
|---|---|---|---|---|
| `video-subtitle-extractor` | clawhub | caution | 33 | Skip in cron, manual review only |
| `simple-ledger` (个人记账) | clawhub | dangerous | 6 | Skip in cron, manual review only |
| `transformers-js` (huggingface/skills) | github | caution | 2 (supply_chain: `npm install @huggingface/transformers`, `@huggingface/tokenizers`) | Skip in cron. Surfaces in Top 20 daily; only `--force` after human review of the npm deps. Added 2026-05-25. |

If user explicitly asks to install one, run with `--force` after acknowledging the risk:
```bash
hermes skills install clawhub/<name> --yes --force
```

---

## Recovery Workflow When `Could not fetch` Fires

```
[install fails] →
  ├── Is identifier in "Locally Missing" table above? →
  │     Run upstream-verification probe.
  │     ├── In latest tarball → tell user to UPGRADE HERMES, do not retry, do not file issue
  │     └── Not in latest tarball → file issue at NousResearch/hermes-agent
  └── Run: hermes skills inspect <indexed-identifier>
       ├── inspect SUCCESS → extract Identifier: line → retry install with that ID
       │    Confirmed alias mismatches (extend as new ones surface):
       │      • peft-fine-tuning              → official/mlops/peft
       │      • simpo-training                → official/mlops/simpo
       │      • slime-rl-training             → official/mlops/slime
       │      • research/solana               → official/blockchain/solana
       │      • devops/1password              → official/security/1password
       │      • lambda-labs-gpu-cloud         → official/mlops/lambda-labs        (added 2026-05-24)
       │      • modal-serverless-gpu          → official/mlops/modal              (added 2026-05-24)
       │      • optimizing-attention-flash    → official/mlops/flash-attention    (added 2026-05-24)
       │      • sparse-autoencoder-training   → official/mlops/saelens            (added 2026-05-24)
       │      • stable-diffusion-image-generation → official/mlops/stable-diffusion (added 2026-05-24)
       │      • devops/telephony              → official/productivity/telephony   (added 2026-05-24, category rename)
       │      • devops/honcho                 → official/autonomous-ai-agents/honcho (added 2026-05-24, category rename)
       │    Pattern recognition: index often uses the long descriptive `name`
       │    (e.g. `stable-diffusion-image-generation`) while the resolver wants
       │    the short library-style alias (`stable-diffusion`). When the install
       │    fails with `Could not fetch`, default to `inspect` BEFORE retrying.
       └── inspect TIMEOUT (60s) → mark as "待确认", retry next run
```

This avoids two antipatterns:
1. Re-running `install` 3 times against an identifier the resolver doesn't accept.
2. Filing a "missing skill" issue against upstream when the skill is already merged
   and the user just needs to upgrade.

---

## lobehub source size note (verified 2026-05-23)

The `lobehub` source has roughly **~37 ≥5.0-scoring uninstalled candidates total**.
Top 25 captures the worthwhile ones; #26-50 is mostly single-prompt persona skills
(roleplay, generic advisors) that score 5.1 and rarely add tool capability.

If extending scan depth, raise the score threshold to 5.5 instead of going deeper —
deeper-but-lower-scored on lobehub is signal-poor.

---

## Display-name vs identifier mismatch in report (clawhub/lobehub)

Some report rows show a human-friendly **display name** that does not match the
indexer's `name` or `identifier`. `hermes skills inspect <display-name>` then
returns `No skill named '...'` and naive name-based searches in the index miss
the entry too.

Confirmed cases:

| Report shows | Source | What's actually in the index | Status |
|---|---|---|---|
| `Talos — God of Automation` | clawhub | Not findable by `talos` substring search across `name`, `description`, or `identifier` in the index JSON; `hermes skills inspect talos` returns "No skill named". | 2026-05-25: report showed score 5.8 but skill is unaddressable. Skip. |

**Diagnosis when this happens**:

1. Open `~/.hermes/cron/output/skill-scout-latest.md` and grab the exact row text.
2. Try the obvious slug from the display name (`talos`, `god-of-automation`).
3. If `inspect` fails AND `python3 -c "json.load(open('.../hermes-index.json'))"` substring search fails, the report is rendering a name from a non-`name` field (likely `extra.title` or an upstream-only display field) that has no resolver path. **Skip and do not retry** — this is not a network issue.
4. Treat as a `skill-scout.js` reporting bug: the report should prefer `identifier` over decorative display titles when the latter aren't resolvable. Worth fixing in scoring/render code.

---

## Recommendation for skill-scout.js

`KNOWN_MISSING` is encoded as a hard-coded `Set` so the report excludes them
from Top N. Reduces daily noise and makes the report focus on actionable
candidates. Re-verify and prune the set whenever Hermes upgrades.

```js
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
```
