# form-poc

JSON-driven form builder, renderer, and component reference, organised as a
[pnpm](https://pnpm.io) + [Turborepo](https://turborepo.com) monorepo.

## Layout

```
form-poc/
├── apps/
│   ├── poc/        # form list, builder, and preview (port 3000)
│   └── gallery/    # component reference (port 3001)
└── packages/
    ├── forms/             # @hoshina-dev/forms — schema + UI components
    ├── eslint-config/     # shared ESLint flat configs
    └── typescript-config/ # shared tsconfig presets
```

### Apps

- **`poc`** — browses example form schemas from `apps/poc/data/forms/`,
  edits them through a builder UI (Mantine + `@mantine/form`), and runs the
  user → worker → result flow via `FormFlow`. Static export, deployable to
  any static host.
- **`gallery`** — one page per question type, showing the Zod-derived JSON
  Schema, an example JSON document, and a live-bound preview. Useful when
  authoring new form schemas or extending the renderer.

### `@hoshina-dev/forms`

The package both apps depend on. Exports:

- `schema.ts` — Zod schemas for every question type, plus `FormSchema`,
  `FormSection`, `WorkerQuestion`, `FormAnswers`, etc.
- `FormRenderer.tsx` — Mantine-based renderer (`FormRenderer` for a whole
  section, `QuestionField` for a single question).
- `gallery.ts` — metadata + example documents that drive the gallery app.

Apps consume it as a workspace dependency through Next.js'
[`transpilePackages`](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages),
so there is no build step in the package itself.

## Getting started

```bash
pnpm install
pnpm dev          # runs both apps via turbo (poc on :3000, gallery on :3001)
```

Run a single app:

```bash
pnpm --filter poc dev
pnpm --filter gallery dev
```

## Tasks

All tasks are pipelined through Turborepo at the repo root:

| Command         | What it runs                          |
| --------------- | ------------------------------------- |
| `pnpm dev`      | `next dev` for both apps in parallel  |
| `pnpm build`    | `next build` for both apps            |
| `pnpm lint`     | ESLint across apps and packages       |
| `pnpm format`   | `eslint --fix` across the workspace   |
| `pnpm check`    | `tsc --noEmit` across the workspace   |

Scope a task to one package with `pnpm --filter <name> <task>`, e.g.
`pnpm --filter @hoshina-dev/forms check`.

## Form data

`apps/poc/data/forms/*.json` is the form store. It is git-ignored — drop
JSON files in there for local development. Examples that survive a fresh
clone live in `apps/poc/examples/`; copy them in to seed the store:

```bash
cp apps/poc/examples/*.json apps/poc/data/forms/
```

## Deployment

The GitHub Pages workflow was removed during the monorepo refactor while
we decide how to host two apps. Each app is configured with
`output: "export"`, so `pnpm --filter <app> build` produces a static
`out/` directory ready for any static host.

## Tech

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript 6
- Mantine 9 (`@mantine/core`, `@mantine/form`)
- Zod 4
- pnpm workspaces + Turborepo 2
