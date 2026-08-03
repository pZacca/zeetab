# 0001 — Bundle the UI inside the extension

Date: 2026-08-03
Status: accepted

## Context

A new tab extension can deliver its page two ways: bundle the app locally
inside the extension package, or point the new tab at a hosted URL
(the web version of zeetab).

The new tab page is the most frequently opened page in a browser. Anything
on its critical path — network latency, DNS, the hosting provider being up —
is felt on every single tab the user opens. Pointing at a hosted URL would
have made the extension a trivial manifest-only package, at the cost of
putting the network on that critical path and breaking offline use.

## Decision

The extension bundles the entire app (HTML, JS, CSS, fonts, icons). Nothing
is loaded from the network at new-tab time except favicons of the user's
shortcuts, which are cached by the browser anyway.

## Consequences

- New tabs render instantly and work offline.
- The extension and the demo site are two build artifacts of the same
  source; a release means shipping a new extension version through the
  stores, not deploying a server.
- Store review is required for every update (acceptable: the app changes
  rarely and has no server-driven behavior to keep in sync with).
