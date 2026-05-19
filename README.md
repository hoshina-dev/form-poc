# form-poc

JSON-driven form POC, renderer, and component reference, organised as a
[pnpm](https://pnpm.io) + [Turborepo](https://turborepo.com) monorepo.

## Layout

```
form-poc/
├── apps/
│   ├── poc/        # POC demo, built as a standalone Node Docker image
│   └── gallery/    # static component reference, deployed to GitHub Pages
└── packages/
    ├── forms/             # @hoshina-dev/forms — schema + UI components
    ├── eslint-config/     # shared ESLint flat configs
    └── typescript-config/ # shared tsconfig presets
```

### Apps

- **`poc`** — POC demo that browses form schemas from
  `apps/poc/data/forms/`, inspects them through a builder UI (Mantine +
  `@mantine/form`), and runs the user → worker → result flow via `FormFlow`.
  It builds with Next.js `output: "standalone"` and ships as a Docker image
  served by the bundled Node server.
- **`gallery`** — static component reference with one page per question type,
  showing the Zod-derived JSON Schema, an example JSON document, and a
  live-bound preview. It builds with Next.js `output: "export"` and deploys to
  GitHub Pages.

### `@hoshina-dev/forms`

The package both apps depend on. Exports:

- `schema.ts` — Zod schemas for every question type, plus `FormSchema`,
  `FormSection`, `WorkerQuestion`, `FormAnswers`, etc.
- `FormRenderer.tsx` — Mantine-based renderer (`FormRenderer` for a whole
  section, `QuestionField` for a single question).
- `gallery.ts` — metadata + example documents that drive the gallery app.

Apps consume it as a workspace dependency through Next.js `transpilePackages`,
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

`apps/poc/data/forms/*.json` is the local form store. It is git-ignored —
drop JSON files in there for local development. Examples that survive a fresh
clone live in `apps/poc/examples/`; copy them in to seed the store:

```bash
cp apps/poc/examples/*.json apps/poc/data/forms/
```

## Deployment

- **Gallery**: `.github/workflows/deploy.yml` builds `apps/gallery` as a
  static export and deploys `apps/gallery/out` to GitHub Pages. The workflow
  sets `NEXT_PUBLIC_BASE_PATH=/${{ github.event.repository.name }}` so the
  static site works under the repository path.
- **POC**: the same workflow builds `apps/poc/Dockerfile` from the repository
  root for `linux/amd64` and `linux/arm64`, then pushes the multi-arch image to
  `ghcr.io/<owner>/form-poc-web`. The app runs the Next standalone Node server
  on port `3000`.

Build the POC image locally from the repository root:

```bash
docker build -f apps/poc/Dockerfile -t form-poc-poc .
docker run --rm -p 3000:3000 form-poc-poc
```

The Docker image seeds `/app/apps/poc/data/forms` from
`apps/poc/examples/`. Mount a volume at that path to provide a different form
store.

## Tech

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript 6
- Mantine 9 (`@mantine/core`, `@mantine/form`)
- Zod 4
- pnpm workspaces + Turborepo 2
