# Mistakes

What models got wrong in this workspace, so the next one — especially a
cheaper Ollama-cloud model — does not repeat it. Read this before trusting
your own first conclusion.

Each entry records **what** happened, **why** it was wrong (and how it was
caught), and **who** made it. Newest first. A claim without the script or
output that produced it does not belong here: this file records what
happened, not what might have.

---

## 2026-09 — Agent concluded a component exists because the filename says so

- **Who:** main session (repo survey)
- **What:** described `test_app/netcdf-viewer/src/App.js` as the React viewer
  frontend, based on its path.
- **Why:** the file is the **Flask backend** — it starts with `# app.py` and
  imports `flask`. The name matched the directory, not the contents. Lesson:
  read the file before characterising it; a plausible path is not evidence.

## Recurring — Treating a hardcoded value as misconfiguration

- **Who:** recurring
- **What:** proposes moving the API base URL (`http://localhost:8000`) and
  the Melbourne, FL coordinates out of `WeatherDashboard.js` into config.
- **Why:** both are known, deliberate rough edges for a local-only backend.
  "Fixing" them changes deployed behaviour and is not requested by the
  working rules in `AGENTS.md`. Report the hardcoding; do not silently change
  it.
