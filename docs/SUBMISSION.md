# Store submission checklist

Artifacts (run `npm run zip && npm run zip:firefox`):

- `.output/zeetab-<version>-chrome.zip` → Chrome Web Store
- `.output/zeetab-<version>-firefox.zip` → AMO (upload)
- `.output/zeetab-<version>-sources.zip` → AMO (source code upload, required
  because the build is bundled/minified)

## Listing copy (both stores)

- **Name:** zeetab
- **Summary:** A minimal new tab with shortcut sections.
- **Description:** Replaces your new tab page with a fast, offline grid of
  shortcuts. Group them into collapsible sections, drag & drop to reorder,
  upload custom icons, and move your config — or a single section — anywhere
  with JSON import/export. No account, no server, no tracking — everything
  stays in your browser. Try it first at https://zeetab.zacca.dev.
- **Category:** Productivity / Workflow
- **Homepage:** https://github.com/pZacca/zeetab

## Privacy declarations

- Permissions requested: **none** (only `chrome_url_overrides.newtab`).
- Remote requests: favicon images are loaded from
  `icons.duckduckgo.com` for the domains of shortcuts the user added.
  No other network traffic; no analytics; no data leaves the browser.
- Data collection: none. State the same in CWS "privacy practices" form and
  AMO's data-collection questionnaire.

## Per-release checklist

Both listings are live (CWS `okigemonkljchelokiilmfhdapecckel`, AMO
`zeetab@zacca.dev` — the ID is in the manifest). For every release:

- [ ] `npm run screenshots` — regenerates `docs/store-assets/*.png`
      (1280×800, from the demo build). Re-upload only the images whose UI
      changed; check for letter-tile fallbacks if the network was flaky.
- [ ] Upload the same version to both stores — CWS cannot downgrade a
      published version, so a mismatch is permanent until the next release.
- [ ] If the listing copy above changed, paste it into both stores; the
      stores don't read this file.
- [ ] Privacy declarations unchanged (no new permissions, no new network
      calls) — re-confirm the CWS privacy form and AMO questionnaire only if
      they were.

## AMO source-code notes (reviewer instructions)

Build reproducibly with:

```
npm ci
npm run zip:firefox
```

Node 24, npm 11. The zip under `.output/` matches the upload.
