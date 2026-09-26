# NuCast

NuCast is a weather forecasting and data-visualization workspace. All
agent- and platform-related content lives here, in the directory `AGENTS.md`
lives in.

NuCast has three components, and they are at very different levels of
maturity. Treat them that way.

| folder | what it is | git |
|---|---|---|
| `temp_normals/` | **The main app.** React dashboard (Chart.js + Windy map) backed by a FastAPI service that proxies Open-Meteo and Sunrise-Sunset. The only deployable piece today. | same repo |
| `test_app/netcdf-viewer/` | NetCDF inspector. Flask backend (`netCDF4`) plus a React D3/netcdfjs frontend. Backend scaffolded, frontend partly connected. | same repo |
| `station_tests/` | ML preprocessing for weather-station CSVs. `prepro.py` builds TensorFlow windowed datasets; no trained model is committed. | same repo |

The frontend of `temp_normals` auto-deploys to GitHub Pages on every push to
`main` (`.github/workflows/blank.yml`). The backend is run locally only.

## Run the components

**Backend** (`temp_normals/backend/`) — FastAPI via uvicorn:

```bash
cd temp_normals/backend
./ru.sh            # uvicorn app.main:app --reload  (port 8000)
```

There is no `requirements.txt` in the tree. Dependencies observed in use:
`fastapi`, `uvicorn`, `requests`, `numpy`; add `netCDF4`, `flask`,
`flask-cors` for `test_app/netcdf-viewer`.

**Frontend** (`temp_normals/`) — Create React App:

```bash
cd temp_normals
npm install
npm start          # dev server; expects the backend on localhost:8000
npm run build      # what CI deploys
```

The API base URL is hardcoded to `http://localhost:8000` in
`src/components/WeatherDashboard.js`. The location is hardcoded to Melbourne,
FL (`28.0836, -80.6081`) in the same file. Both are known rough edges, not
configuration.

**netCDF viewer** (`test_app/netcdf-viewer/`) — note the source file
`src/App.js` currently contains the **Flask backend** (a copy/paste artefact:
it starts with `# app.py` and imports `flask`), not the React frontend. Do not
assume its name matches its contents.

## Scratch and big data

- **`/mnt/data/Datasets/`** holds real netCDF samples (the Manus 2011–2013
  case): ERA5 pressure/single levels, ERA5-Land, ASCAT swaths, MERGIR, OISST,
  ARM TWP station series. Never modify or delete sample files. Use them to see
  what real inputs look like.
- **`/mnt/data/Datasets/nucast_work/`** is scratch on the big disk
  (`/mnt/data` has ~160 GB free; `/` is ~97% full). Put large files, venvs and
  agent scratch there, not under `~` or `/tmp`.
- Per-agent scratch directories at the workspace root (`.scratch-api/`,
  `.scratch-ux/`, `.scratch-netcdf/`, `.scratch-station/`) are gitignored and
  live on the nearly-full root disk — keep them small. Large generated files
  go to `/mnt/data/Datasets/nucast_work/`.

The station CSV data (`station_tests/RM1/`) is **not** in the repo: the root
`.gitignore` excludes `*.csv`. Any test must build its own fixtures.

## Review subagents

Four reviewer agents live in `.opencode/agent/`. Each drives the real thing
rather than reading code and guessing, and none of them may edit the
repository. They run on Ollama-cloud models (this workspace has no local
models).

| agent | what it does | when |
|---|---|---|
| `api-check` | starts the FastAPI backend and probes the weather/sunrise endpoints, real responses and failure modes | after a change to `temp_normals/backend/` |
| `frontend-ux` | drives the dashboard in headless Chromium and reports what the interface gets wrong | after a change to a React component |
| `netcdf-io` | builds adversarial netCDF files and looks for silently wrong numbers in the viewer backend | after a change to anything that opens or selects from netCDF |
| `station-data` | checks the preprocessing pipeline for silent data errors (ordering, leakage, normalization) | after a change to `station_tests/preprocess*.py` |

New or edited agent files need an opencode restart to be read.

**An issue raised from a subagent's finding says so, in its first line** —
which agent found it, and on which branch or commit. A reader needs to know
whether a human met the bug or a machine constructed it, because the two
deserve different weight: a file shape an agent invented may never occur in
practice, while a thing a user hit certainly did.

**Verify before acting on a finding.** These agents are useful and they are
also wrong sometimes. Reproduce the measurement or the failure yourself, then
fix; and if it does not reproduce, say so rather than quietly dropping it.

**Reviewer agents may read the repository but never write to it.**
- Allowed: reading any file, searching, read-only git (`status`, `diff`,
  `log`, `show`), and running code and tests from it.
- Not allowed: editing, creating or deleting files; any git command that
  changes the index, a branch, a ref or the working tree.
- This is enforced in `.opencode/opencode.json` with `edit: deny` per agent,
  not only in the briefs.
- Files an agent creates go under `/mnt/data/Datasets/nucast_work/` or the
  matching `.scratch-*/` directory.

**Reject any report without tool calls behind it.** Every claim must point at
the script and output that produced it.

**`mistakes.md`** records what models got wrong here — what, why, and who.
Read it before trusting a first conclusion; add an entry when a model (yours
or a subagent's) is caught in a real mistake, with the evidence that caught
it. Cheaper cloud models are its main audience.

## Writing issues and pull requests

Issues and pull requests are documentation of the work, not a reply to whoever
asked for it. Someone reading in a year has no idea a conversation happened
and should not need to.

- **Never quote or paraphrase the request that prompted it.** No `> can you
  fix the panning`, no "as you asked", no opening line that answers a
  question.
- **No second person.** Not "you picked the red line" but "the line is red";
  not "awaiting your sign-off" but "needs sign-off". State what is true of the
  code, not who decided it.
- **Lead with the defect or the change**, not with context about why it is
  being written now.
- Keep the measurement, the reproduction, what was verified and how, and what
  is deliberately not covered. Those are the parts that are worth reading
  later.

The attribution line for a subagent finding is the one exception — that says
where a finding came from, which is about the evidence, not about the
conversation.

## Working rules

- Do not change numerics, precision or scientific behaviour unilaterally —
  that needs sign-off, even when a change is provably bit-identical.
- The API base URL and the dashboard location are hardcoded. Do not
  "fix" them into config without saying so; the current behaviour is known.
- `temp_normals` is deployed by CI on every push to `main`. Do not push a
  frontend change that does not build (`npm run build`).
- The netCDF viewer backend lives at `test_app/netcdf-viewer/src/backend.py`;
  its coordinate-detection logic is `generic_handler.py` beside it. The React
  frontend is `src/App.js`.
- Do not invent new theories or new algorithms. NuCast is a visualization and
  data-handling tool, not a research project.
- Every response must either contain a tool call or state that the whole task
  is complete. Never end a response by describing what will be done next; do
  it.

## Git rules

- Every commit username is nmathewa, and every commit email is
  nalex2023@my.fit.edu.
- Commit messages should be clear and minimal. Do not add any part of the
  prompt or any agent's instructions to the commit message.
- Pull request bodies carry no "Generated with" footer or session link.
- Pull request bodies and issue bodies are short bullet points.
- Show the commit message, pull request message, and issue message before
  committing or creating a pull request or issue. Review and approval come
  first.
- The repo is private. Do not add public-facing badges or links that assume
  public visibility.
