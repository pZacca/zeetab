# AGENTS.md

Guidance for AI coding agents working in this repository. (`CLAUDE.md` is a
symlink to this file.)

## Commands

```sh
npm install            # postinstall runs `wxt prepare` (generates .wxt/ types — needed before typecheck works)

npm run dev            # extension dev mode (Chrome)
npm run dev:firefox    # extension dev mode (Firefox)
npm run dev:demo       # web demo dev server (Vite)

npm run build          # extension, Chrome MV3 → .output/chrome-mv3
npm run build:firefox  # extension, Firefox MV2 → .output/firefox-mv2
npm run build:demo     # web demo → dist-demo/
npm run zip            # store-ready zip (also :firefox)

npm test               # vitest run (all unit tests)
npx vitest run src/lib/newtab/store.test.ts   # single test file
npx vitest run -t "name"                       # single test by name
npm run lint           # eslint (lint:fix to autofix)
npm run compile        # tsc --noEmit
```

CI (`.github/workflows/ci.yml`) runs lint, compile, test, and all three builds. Pushes to `main` and PRs deploy the demo to Vercel (`deploy-demo.yml`) — but only when a path the demo depends on changed; the workflow's `paths` filter lists them. If you make the demo build depend on a new path (a config file, an asset directory), add it to both `paths` lists in `deploy-demo.yml`, or deploys will silently stop firing for that change.

## Architecture

**One source, two artifacts** (see `docs/adr/`): the browser extension and the web demo at zeetab.zacca.dev both render the same `src/app.tsx`.

- Extension entrypoint: `src/entrypoints/newtab/` (WXT convention; `wxt.config.ts` sets `srcDir: "src"` and per-browser manifest tweaks).
- Demo entrypoint: `demo/` built with a separate Vite config, `vite.demo.config.ts`. Files in `demo/public/` are served at the site root. `demo/public/zeetab-sample-config.json` is a sample config covering every feature; on a true first visit (no stored key) `demo/main.tsx` seeds it into localStorage before render — it never overwrites a saved config, including a deliberately emptied one.
- The extension bundles everything locally (ADR 0001) — nothing loads from the network at new-tab time except favicons. Demo and extension never share state; import/export is the only bridge.

**Domain logic lives in `src/lib/newtab/`** — pure TypeScript, no React, and the only code with unit tests (vitest, node environment, colocated `*.test.ts`):

- `types.ts` — `Config` → `Section[]` → `Shortcut[]`, plus storage keys and upload limits. `CONFIG_VERSION` is 1.
- `storage.ts` — localStorage read/write. Reads that fail validation back up the raw value under `zacca.newtab.config.corrupted.<timestamp>` keys (max 3 kept) and fall back to `emptyConfig()`. Writes return a `WriteResult` distinguishing quota errors from unavailable storage.
- `migrations.ts` — `migrate(raw)` is validate-or-reset: any shape that isn't a valid v1 config returns `emptyConfig()`.
- `store.ts` — framework-agnostic external store consumed via `useSyncExternalStore`; `attachStorageSync` reloads on cross-tab `storage` events.
- `import-export.ts` — parses imported JSON through `migrate`, rejecting configs newer than `CONFIG_VERSION` or unrecognized shapes.

**React layer**: `NewtabProvider` (`src/components/newtab/newtab-provider.tsx`) owns the store and exposes all mutations as an `Actions` object via the `useNewtab()` context hook — components never touch storage directly. Write failures surface through `meta` (quota / storage-unavailable flags). Feature components are in `src/components/newtab/`, shadcn/ui primitives in `src/components/ui/`. Styling is Tailwind CSS v4.

**Invariants** enforced across migrations and actions:

- `sections[0]` is always the default section: `id === "default"` (`DEFAULT_SECTION_ID`), `name === null`. It can't be deleted, renamed, or reordered away from position 0; deleting another section deletes its shortcuts with it.
- Config updates are immutable (`applyWrite` takes `prev => next` updaters); returning `prev` unchanged skips the write.

The `@` → `src/` path alias is configured in three places: WXT's generated tsconfig, `vite.demo.config.ts`, and `vitest.config.ts`. Adding config elsewhere means adding the alias there too.

## Gotchas

- Tailwind v4 auto-detects class sources from the Vite root. The demo build's root is `demo/`, so `src/styles/globals.css` declares `@source "../";` explicitly — without it the demo ships CSS with zero utilities (fonts only) while the extension build looks fine. If the built demo CSS is ~14 KB instead of ~50 KB, this is why.
- `data_collection_permissions` in `wxt.config.ts` (Firefox manifest) is **required by AMO** for every new version — removing it while "simplifying" the manifest breaks the next Firefox store upload.
- Firefox builds target MV2 on purpose (WXT's default; fully supported by Firefox). Don't migrate it to MV3 without a concrete reason.

## Releases

- `package.json` is the **only** place the version lives — WXT propagates it into both manifests. Never edit a version anywhere else.
- Both stores always ship the same version number, and the Chrome Web Store cannot downgrade a published version.
- A release is: bump version → `npm run zip && npm run zip:firefox` → upload to both stores (AMO also requires the generated `-sources.zip`). Process details: `ROADMAP.md`; store checklists: `docs/SUBMISSION.md`.

## Repo docs

- `CONTEXT.md` — glossary of domain terms (Shortcut, Section, Config, Icon Source, Extension, Demo). Use these terms; implementation details don't belong there.
- `docs/adr/` — architecture decision records; add one for decisions of similar weight.
- `CONTRIBUTING.md` — standing conventions: conventional commits, `package.json` as the single version source, and the privacy stance (changes adding network calls or telemetry won't be merged).
- `ROADMAP.md` — process and infrastructure work only; feature ideas go to GitHub issues.
