# Model routing and fallback

Which model runs which agent, and what to fall back to when a model fails.
The actual wiring (provider, baseURL, model ids) lives in
`.opencode/opencode.json`; this file is the policy. Change both together, then
restart opencode.

## Inventory

| model | wired id | where | role | notes |
|---|---|---|---|---|
| opus 5.5 | `claude-opus-5-5` | Anthropic API | strongest; escalations and releases only | slowest and most expensive |
| opus 5 | `claude-opus-5` | Anthropic API | backup for opus 5.5 | |
| GLM-5.3-Flash | `glm-5.3-flash` | Ollama cloud | workhorse: main session + frequent reviewers | fast, cheap, tool-heavy loops; watch its edits |
| Deepseek v4 pro | `deepseek-v4-pro` | Ollama cloud | long careful runs (data pipelines, packaging) | slower than GLM; "4.1 pro" does not exist on Ollama |
| Deepseek v4.1 flash | `deepseek-v4.1-flash` | Ollama cloud | cheap default for read/routing turns | 1M context |
| gpt-oss | `gpt-oss` | Ollama cloud | spare | cloud variant; `:latest` in config |
| gpt-oss 20b | `gpt-oss:20b` | Ollama cloud | last resort / trivial turns | small, cheapest |

No local models. The cloud-only era started 2026-09-24 — this workspace no
longer wires a local Ollama or an HPC tunnel.

Any other cloud model is allowed only if it is at or below the cost of
Deepseek v4 pro. Do not assume benchmark numbers: judge models by the switch
log below.

## Assignment

| agent | primary | backup | last resort |
|---|---|---|---|
| main session (code, tests, commits) | GLM-5.3-Flash | opus 5.5 | Deepseek v4.1 flash |
| `api-check` | GLM-5.3-Flash | Deepseek v4 pro | gpt-oss (cloud) |
| `frontend-ux` | GLM-5.3-Flash | opus 5 | gpt-oss (cloud) |
| `netcdf-io` | GLM-5.3-Flash | Deepseek v4 pro | gpt-oss (cloud) |
| `station-data` | Deepseek v4 pro | GLM-5.3-Flash | opus 5 |
| scratch / pre-checks | gpt-oss:20b | Deepseek v4.1 flash | — |

The main session runs on the cheap fast model because most of its turns are
small (reads, greps, routing, applying approvals). It escalates to opus 5.5
for the expensive-to-get-wrong turns: releases, data-pipeline changes,
contested subagent findings, multi-file refactors. opus 5 covers opus 5.5
outage. Since the orchestrator is the only role with write access, the
double-check rule (below) applies to it with full force.

Frequent reviewers (`api-check`, `frontend-ux`, `netcdf-io`) run after every
relevant change, so they get the cheap fast model and escalate on failure.
`station-data` touches numeric preprocessing, where a silent error is costly,
so it gets the slower careful model.

## Failure rules

A run **fails** when any of these hold:

- a claim in the report has no command or tool call behind it;
- it loops, stops early, or never launches the thing it was asked to drive;
- `git -C /home/nmathewa/main/NuCast status --short` shows changes the agent
  made;
- a human verification of one of its findings does not reproduce.

Escalation:

1. First failure: rerun the same brief on the **backup** model. Do not retry
   the failing model twice in a row.
2. Second failure (any model): the main session does the check **by hand**.
   The brief's method section is the checklist.
3. Record every failure and every switch in the log below. A failing model is
   never left assigned silently.
4. **A release is never gated on a cheap-model verdict alone.** `api-check`
   and `netcdf-io` verdicts that decide a release must be reproduced by the
   main session or a cloud/API model.
5. Findings keep the attribution line: which model, which agent, which commit.

## Cheap-model care

The Ollama-cloud models are the weaker link in the chain, so their output gets
handled with extra care:

- **Double-check filenames and edits** from any model: re-read the file after
  an edit, confirm the path it touched is the one that was asked about, and
  diff before accepting.
- **If a cheap model is running a task that edits files, watch the edits.**
  Do not leave it unattended on write paths; prefer giving it read-only or
  scratch-only work.
- **Do not hypothesize on tasks.** A model that cannot find a file raises that
  as a question instead of doing a global search, guessing a path, or
  inventing a plausible filename. "File not found" is a report, not a puzzle
  to solve by brute force.

## Switch log

| date | agent | change | reason |
|---|---|---|---|
| 2026-09-24 | all | initial routing table for NuCast | workspace moved to cloud-only; reviewers wired to GLM-5.3-Flash, station-data to Deepseek v4 pro |
