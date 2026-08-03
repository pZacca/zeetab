# Roadmap

Working notes on where zeetab is headed. Not a promise — an ordering.

## Releases & distribution

- [ ] **Release workflow** — GitHub Action triggered by `v*` tags: build the
      three zips (Chrome, Firefox, sources) and attach them to a GitHub
      Release with `--generate-notes`. The flow per release becomes:
      `npm version x.y.z` → `git push --follow-tags` → upload the same zips
      to both stores.
- [ ] **Version alignment** — next release (0.2.0) ships the same number to
      both stores, fixing the cosmetic 0.1.0 (CWS) / 0.1.1 (AMO) split from
      the initial submissions. From then on: one version, two stores, always.
- [ ] **Automated store submission** — once the manual cycle has settled:
      AMO via its signing API (`wxt submit`), CWS via the Web Store API.
      Manual until then, deliberately.
- [ ] **Verified CRX uploads (CWS)** — supply-chain hardening that requires
      signing each upload with a locally-held private key. Revisit if the
      user base grows enough to make account-hijack a real threat model;
      not worth the key-management burden today.

Project conventions live in [CONTRIBUTING.md](./CONTRIBUTING.md); feature
ideas live in [issues](https://github.com/pZacca/zeetab/issues). This file
tracks process and infrastructure work only.
