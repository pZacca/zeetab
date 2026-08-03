# Contributing

Issues and PRs are welcome. Setup and everyday commands are in the
[README](./README.md#development); what follows are the project's standing
conventions.

## Conventions

- **Versioning:** `package.json` is the single source of truth — WXT
  propagates the version into both browser manifests. Both stores always
  ship the same version number.
- **Commits:** conventional style (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`).
  Release notes are generated from them.
- **No GitHub Packages:** zeetab is not a library; the distributables are
  the store zips attached to GitHub Releases.
- **Feature ideas** belong in
  [issues](https://github.com/pZacca/zeetab/issues).
  [ROADMAP.md](./ROADMAP.md) tracks process and infrastructure work only.
- **Privacy is a feature:** changes that add network calls, telemetry, or
  remote code will not be merged. See [PRIVACY.md](./PRIVACY.md).

## Before opening a PR

```sh
npm run lint && npm run compile && npm test && npm run build
```

CI runs the same checks plus the Firefox and demo builds.
