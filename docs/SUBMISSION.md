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
  upload custom icons, and move your config anywhere with JSON
  import/export. No account, no server, no tracking — everything stays in
  your browser. Try it first at https://zeetab.zacca.dev.
- **Category:** Productivity / Workflow
- **Homepage:** https://github.com/pZacca/zeetab

## Privacy declarations

- Permissions requested: **none** (only `chrome_url_overrides.newtab`).
- Remote requests: favicon images are loaded from
  `icons.duckduckgo.com` for the domains of shortcuts the user added.
  No other network traffic; no analytics; no data leaves the browser.
- Data collection: none. State the same in CWS "privacy practices" form and
  AMO's data-collection questionnaire.

## Still needed before submitting

- [ ] Screenshots: 1280×800 (CWS) — populated grid, settings sheet open,
      section drag in progress. AMO accepts the same images.
- [ ] CWS: developer account ($5 one-time, likely already registered).
- [ ] AMO: add-on ID is `zeetab@zacca.dev` (already in the manifest).
- [ ] After approval: replace the `#` store links in README.md.

## AMO source-code notes (reviewer instructions)

Build reproducibly with:

```
npm ci
npm run zip:firefox
```

Node 24, npm 11. The zip under `.output/` matches the upload.
