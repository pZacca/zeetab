# 0002 — Extracted from the private zacca.dev repo; this repo is the source of truth

Date: 2026-08-03
Status: accepted

## Context

zeetab began as the `/newtab` page inside the private repo of zacca.dev
(a Next.js site). Publishing the extension open source required either
open-sourcing the whole site, maintaining a duplicated copy, or extracting
the new tab code into its own public repo.

Options considered for the site after extraction:

1. The public repo deploys its own web demo; the site drops the page.
2. The public repo publishes an npm package the private site consumes —
   permanent versioning/publishing friction for every change.
3. The site keeps a frozen copy — guaranteed divergence.

## Decision

This repo is the single source of truth for zeetab. It builds two artifacts:
the browser extension (Chrome + Firefox, via WXT) and the web demo at
https://zeetab.zacca.dev. The private site removed its `/newtab` route without
a redirect (it had a single known user). History starts clean here — nothing
was filtered out of the private repo's git history.

## Consequences

- The code can be open source (MIT) without exposing the rest of the site.
- There is no automatic state sync between demo and extension; import/export
  is the deliberate bridge (see CONTEXT.md).
- Existing localStorage config on zacca.dev/newtab does not migrate
  automatically; users move it via export/import.
