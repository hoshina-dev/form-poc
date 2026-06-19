# Schema migration handoff (form-poc ↔ experiment-manager)

Agent-oriented notes for continuing the nested experiment-template schema work across **form-poc** (this repo) and **experiment-manager** (sibling repo at `../experiment-manager`).

Last updated: 2026-06-20 (POC UX + calculate retry fixes; calculate API still broken on prod).

---

## Goal

Single schema for lab forms:

- Two form sections: **`clientForm`** (client intake) and **`labForm`** (technician)
- Question options nested under **`config`**
- New component: **`repeatable-group`** (columnar child answers, Mantine Tabs in UI)
- **`calculations`**: `{ name: { formula, result? } }` — evaluated server-side (Python)
- **`values`**: flat map of answers keyed by question id (including repeatable-group child ids)

Dropped from the old POC model: `prefillFrom`, top-level `template` summary string (use a string calculation instead).

---

## Source of truth (read these first)

| Artifact | Path |
|---|---|
| JSON Schema spec | `schema-bundle/experiment-template.schema.json` |
| Examples | `schema-bundle/examples/*.json` |
| Zod schema (runtime validation in TS) | `packages/forms/src/schema.ts` |
| Gallery fixtures | `packages/forms/src/gallery.ts` |
| Backend context spec | `../experiment-manager/docs/experiment-context.md` |
| Backend PDF placeholders | `../experiment-manager/docs/pdf-report-engine.md` |
| Seed migration script (backend) | `../experiment-manager/scripts/migrate_seed_sql.py` |

---

## Wire format (experiment-manager HTTP API)

Templates and experiment state use the **same shape** as the schema bundle (not the old `userForm` / `workerForm` names).

### Template create/update (`POST`/`PUT …/experiments`)

```json
{
  "title": "Proximate Analysis",
  "description": "…",
  "clientForm": { "title": "…", "questions": [ … ] },
  "labForm": { "title": "…", "questions": [ … ] },
  "calculations": {
    "moisture_pct": { "formula": "round(1000 * moisture_loss / values['sample_mass']) / 10" }
  }
}
```

### Experiment update (`PUT /api/experiments/{exp_id}`)

Same forms + calculations, plus:

```json
{
  "clientForm": { … },
  "labForm": { … },
  "calculations": { … },
  "values": {
    "crucible_mass": 21.354,
    "reading_a": [10.12, 10.08]
  }
}
```

Answers live in **`values`**, not only on `question.value`. Legacy snapshots may still have `value` on questions; readers should merge both (see mappers).

### Calculations

- **Plain Python** expressions (`round`, `or`, ternary `a if cond else b`)
- **Not** JS (`Math.round`, `||`, `? :` without `if/else`)
- Formulas reference answers via `values['question_id']`
- Later calculation keys can reference earlier results in the same map
- `POST /api/experiments/{exp_id}/calculate` evaluates formulas and writes **`result`** on each calculation object

### Question shape (nested config)

```json
{
  "id": "sample_mass",
  "type": "number",
  "label": "Sample mass (g)",
  "required": true,
  "config": { "min": 0, "max": 10, "step": 0.001, "default": 1.0 }
}
```

Repeatable group:

```json
{
  "id": "measurement",
  "type": "repeatable-group",
  "label": "Measurements",
  "config": {
    "count": 8,
    "itemLabel": "Measurement",
    "questions": [ … ]
  }
}
```

Columnar answers in **`values`**: `{ "reading_a": [v1, v2, …], "reading_b": […] }`.

---

## Architecture: who owns what

```
┌─────────────────┐     clientForm/labForm/values      ┌──────────────────────┐
│   form-poc      │ ◄────────────────────────────────► │  experiment-manager  │
│  (Zod + UI)     │     calculations {formula, result} │  (FastAPI + PG)      │
└─────────────────┘                                    └──────────────────────┘
        │                                                          │
        │  packages/forms FormRenderer                           │  calculation_service
        │  apps/poc mappers (bridge)                             │  form_schema.py
        └────────────────────────────────────────────────────────┘
                              same logical schema
```

**Ticketing service** (`../ticketing-service`): stores ticket metadata + `experiment_template_id` UUID only. **No form JSON.** No schema migration needed there.

---

## Completed work

### form-poc (`0b48af4` on `main`)

- `packages/forms`: Zod schema, `RepeatableGroupField` (Mantine Tabs), renderer reads `config.*`
- `apps/gallery`: nested schema docs + value display
- `apps/poc`: builder, FormFlow, PDF editor, examples; removed client-side `evaluator.ts`
- Internal model uses `clientForm` / `labForm` throughout

### experiment-manager (`89c42de`, `9f9f3d2` on `main`)

- API renamed **`userForm` → `clientForm`**, **`workerForm` → `labForm`**
- Calculations stored as objects; answers in **`values`**
- `POST /calculate`, `calculation_service.py`, `form_schema.py`
- `sql_mock/` seeds: nested `config`, Python formulas, tomato template (`908`/`909`)
- `scripts/migrate_seed_sql.py` + `nest_question_config.py` for rewrites
- PDF `context.py` reads `config.default`, flattens repeatable-group, prefers calculation `result`

### form-poc API bridge (`c367364` on `main`)

These files fix prod “legacy format” flags by reading `clientForm`/`labForm`/`values`:

| File | Change |
|---|---|
| `apps/poc/src/lib/experiment-manager/client.ts` | `clientForm`/`labForm`/`values`/calc objects; explicit create/update types |
| `apps/poc/src/lib/experiment-manager/mappers.ts` | `readFormDoc`, `normalizeCalculations`, `extractExperimentAnswers`, `buildExperimentUpdateBody` |
| `apps/poc/src/lib/experiment-manager/queries.ts` | Run state from `values`; phase from partitioned answers |
| `apps/poc/src/app/actions/experiment-manager.ts` | PUT sends `values` map |
| `apps/poc/src/app/experiments/[expId]/page.tsx` | `experiment.name` vs `title` |
| `apps/poc/src/app/experiments/[expId]/resume/page.tsx` | same |
| `apps/poc/src/components/pdf-editor/PdfEditor.tsx` | Preview from `values` + forms |
| `apps/poc/src/app/samples/.../pdf/page.tsx` | `clientForm`/`labForm` for variable groups |

Legacy **`userForm`/`workerForm`** still accepted as read fallback for old DB rows.

**OpenAPI types:** `pnpm codegen` regenerated `packages/api-client/src/experiment-manager.d.ts` from deployed experiment-manager (2026-06-20). Write types in `client.ts` now alias generated schemas; `TemplateSnapshotFields` kept for legacy reads and JSONB detail fields.

### form-poc flow UX + calculate resilience (uncommitted → next commit)

| Area | Change |
|---|---|
| `FormFlow.tsx` | Technician submit stays on Result step (no auto-redirect); calc-failure alert + retry guidance |
| `experiments/.../resume/page.tsx` | Allow viewing completed run on resume URL (`phase === "result"`) |
| `ExperimentStatusPanel.tsx` | Stepper + cards + ticket timeline on experiment detail (use `StepperStep` / `TimelineItem`, not compound syntax, in server components) |
| `derivePhase` | Phase `"result"` only when calculation `result` exists (or template has no calcs) — avoids locking technician after failed calculate |
| `normalizeTechnicianState` | Allow retry when answers saved but no `state.result` yet |
| `format-datetime.ts` | Fixed `en-GB` + UTC formatting (SSR/client hydration safe) |
| `layout.tsx` | Fixed light scheme via `mantineHtmlProps` + `defaultColorScheme="light"` (no `ColorSchemeScript` — React 19 script warning) |

---

## Known blockers

### `POST /api/experiments/{exp_id}/calculate` not working (prod)

**Status:** POC is wired end-to-end (`saveExperimentStateAction` → `calculateExperiment`, `calculateExperimentAction`, `FormFlow` Result view), but the **deployed experiment-manager calculate endpoint currently fails** when technicians submit (user sees *“Form saved but calculation failed”*).

**POC mitigations (in place):**

- Answers are saved via `PUT` before calculate runs; phase stays `"worker"` until calculation objects have `result` on the experiment detail.
- Technician can click **Submit & finish** again after a failure (no longer stuck with *“not ready for technician edits”*).

**Backend follow-up (experiment-manager):**

1. Reproduce: complete client + lab flow on prod, watch `POST …/calculate` response (status + body).
2. Check `calculation_service.py` / `form_schema.py` against seed formulas (Python syntax, `values['id']` keys, list helpers).
3. Confirm experiment `values` map contains all ids referenced in formulas after PUT.
4. Run `uv run pytest tests/test_calculation_service.py` locally with failing template.

Until calculate works, Result step and experiment detail will not show computed summaries; report generation may also stay blocked for incomplete runs.

---

## Why templates showed “legacy format”

POC marks templates invalid when `ExperimentTemplateSchema.safeParse` fails in `templateDetailToLoaded` (`mappers.ts` → `valid: false`).

**Previous bug:** mapper read `detail.userForm` / `detail.workerForm` while prod returned `clientForm` / `labForm`, producing empty forms + broken calculations → all templates flagged legacy.

**Fix:** bridge layer now reads the new field names (see table above).

Experiments list uses `deriveRunStateFromDetail`; if `loaded.valid` is false → `stateKind: "legacy"`.

---

## Remaining tasks (priority order)

### 1. Fix `POST /calculate` on experiment-manager (prod) — **blocker**

See **Known blockers** above. Highest priority; POC cannot show results until backend calculate succeeds.

### 2. Repeatable-group seed example (experiment-manager)

No `sql_mock` template uses `repeatable-group` yet. Reference: `schema-bundle/examples/06-repeatable-measurements.json`. Add e.g. `910_seed_repeatable_measurements.up.sql`.

### 3. List-aware calculation helpers (backend)

Example 06 formulas use `mean(values['reading_a'])`, list comprehensions. Confirm `form_schema.CALC_BUILTINS` covers all needed helpers; extend if formulas fail at runtime.

### 4. Phase detection for repeatable groups (form-poc)

`derivePhase` checks top-level question ids only. Required **repeatable-group** may need “all child columns filled” logic.

### 5. OpenAPI examples (experiment-manager)

`app/models.py` `_PROXIMATE_EXAMPLE` already nested; keep in sync with seeds.

### 6. Optional: ticketing dev seeds

Only if fixed template UUIDs are added to experiment-manager seeds. See `../ticketing-service/sql_mock/README.md`.

### Done (no longer open)

- ~~Commit regenerated api-client + client.ts type aliases~~ (`364593a`)
- ~~Wire `POST /calculate` in POC result UI~~ (wired; blocked on backend)
- ~~Regenerate `packages/api-client`~~ (`364593a`)

---

## Key files (form-poc)

| Concern | Path |
|---|---|
| Zod schema | `packages/forms/src/schema.ts` |
| Form UI | `packages/forms/src/FormRenderer.tsx` |
| API types | `apps/poc/src/lib/experiment-manager/client.ts` |
| Read/write mapping | `apps/poc/src/lib/experiment-manager/mappers.ts` |
| Validity / run state | `apps/poc/src/lib/experiment-manager/queries.ts` |
| Legacy gate UI | `apps/poc/src/app/samples/[sampleId]/page.tsx` |
| Builder | `apps/poc/src/components/builder/*` |
| Form flow | `apps/poc/src/components/FormFlow.tsx` |
| Experiment progress UI | `apps/poc/src/components/ExperimentStatusPanel.tsx` |
| Date formatting (UTC) | `apps/poc/src/lib/format-datetime.ts` |
| Server actions | `apps/poc/src/app/actions/experiment-manager.ts` |

---

## Key files (experiment-manager)

| Concern | Path |
|---|---|
| Models / OpenAPI | `app/models.py` |
| Template CRUD | `app/services/sample_service.py` |
| Experiment CRUD | `app/services/experiment_service.py` |
| Calculate | `app/services/calculation_service.py` |
| Values + formulas | `app/form_schema.py` |
| PDF context | `app/pdf/context.py` |
| Dev seeds | `sql_mock/*.up.sql` |
| Context docs | `docs/experiment-context.md` |

---

## Applying dev/prod seeds (experiment-manager)

From `../experiment-manager/README.md`:

```bash
# migrations 001–007, then:
psql $DATABASE_URL -f sql_mock/900_seed_samples.up.sql
psql $DATABASE_URL -f sql_mock/901_seed_experiment_templates.up.sql
# … through 909_seed_tomato_analysis_pdf_template.up.sql
```

Re-seed after schema changes; `ON CONFLICT DO NOTHING` on 901 may skip updates if rows already exist — delete old template rows or bump version via builder.

To rewrite flat question JSON in seed files:

```bash
cd ../experiment-manager
python3 scripts/migrate_seed_sql.py
```

---

## Verification checklist

```bash
# form-poc
cd form-poc
pnpm --filter @hoshina-dev/forms exec tsc --noEmit
pnpm --filter poc exec tsc --noEmit
pnpm --filter poc lint

# experiment-manager
cd ../experiment-manager
uv run pytest tests/test_calculation_service.py -q   # needs .env + TEST_DATA_SOURCE_NAME, S3_*
```

**Manual:**

1. Open POC samples page → templates should **not** show “legacy format” badge (with prod reseeded to new JSON).
2. Open builder → edit/save template → reload → still valid.
3. Run client + lab flow → PUT experiment includes `values` in network tab.
4. `POST /calculate` → calculation objects gain `result` in experiment state. **Currently failing on prod — see Known blockers.**
5. Gallery `/repeatable-group` → Tabs UI, columnar JSON in value panel.
6. Technician submit → stays on Result step; experiment detail shows Form progress panel (stepper + cards).

---

## Environment notes

- POC reads experiment-manager URL from env (see `apps/poc/src/lib/experiment-manager/config.ts`). Localhost POC often points at **prod** experiment-manager — seeding a **local** DB does not affect what prod API returns.
- Invalid legacy templates: flat question props (no `config`), old `userForm`-only JSON, or duplicate ids across client/lab forms fail Zod → disabled buttons (intentional).

---

## Git reference (approximate)

| Repo | Commit | Summary |
|---|---|---|
| form-poc | `0b48af4` | Nested schema, gallery, POC UI migration |
| form-poc | `c367364` | API bridge + `docs/schema-migration-handoff.md` |
| form-poc | `364593a` | Regenerated api-client; wire calculate in POC actions |
| form-poc | `727e0a9` | Fix experiment 404 when API returns null question fields |
| form-poc | *(next)* | Form flow UX, status panel, calculate retry, UTC dates |
| experiment-manager | `89c42de` | Align API + services with schema-bundle |
| experiment-manager | `9f9f3d2` | Seed ON CONFLICT fix for SCD2 |
| experiment-manager | *(open)* | **`POST /calculate` failing on prod** |

---

## Suggested next agent prompt

> Read `docs/schema-migration-handoff.md`. **Priority:** debug and fix `POST /api/experiments/{id}/calculate` on deployed experiment-manager (POC already calls it; prod returns errors). Reproduce from technician submit, inspect formula evaluation in `calculation_service.py`. Optionally add repeatable-group sql_mock seed from example 06.
