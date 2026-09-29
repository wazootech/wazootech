# Wazoo

**World models as a service for AI agents.**

Wazoo is not one repository. It is a set of repositories that sit side by side: a
control plane for organizations, worlds, tokens and usage; a data plane that
stores world data as an RDF graph and answers SPARQL over it; SDKs and generated
clients; a zero-dependency SPARQL engine; interchangeable storage adapters; an
agent-facing tool surface; and the documentation.

This repository is the **map**. It contains no product code — only pointers to
the repositories that make up the platform.

- **New here?** Read the table below, then [INSTALL.md](INSTALL.md) for the
  quickstart that matches what you want to do.
- **Looking for one specific repo?** [REPOS.md](REPOS.md) is the full inventory,
  generated from the org, with archived and current status.
- **Evaluating Wazoo?** [wazoo.dev](https://wazootech/wazoo.dev) is the product
  site and [docs.wazoo.dev](https://github.com/wazootech/docs.wazoo.dev) is the
  documentation. This repo does not restate either.

---

## The platform

| Part | Repository | What it is |
| --- | --- | --- |
| **Control plane** | [wazoo-api](https://github.com/wazootech/wazoo-api) | Platform API for organizations, worlds, tokens, usage and billing |
| **Data plane** | [worlds-api](https://github.com/wazootech/worlds-api) | World data, lifecycle, storage and keys; search, SPARQL, import and export |
| **Management UI** | [wazoo-console](https://github.com/wazootech/wazoo-console) | The web console for managing world models |
| | [wazoo-desktop](https://github.com/wazootech/wazoo-desktop) | Native desktop app |
| **Clients** | [wazoo-client-ts](https://github.com/wazootech/wazoo-client-ts) | `@wazoo/client` — TypeScript client for the platform API |
| | [worlds-client-ts](https://github.com/wazootech/worlds-client-ts) | `@worlds/client` — generated client for the data-plane API |
| **Core SDK** | [worlds-sdk-ts](https://github.com/wazootech/worlds-sdk-ts) | `@worlds/sdk` — embeddable SDK for in-process graph operations |
| | [worlds-kit](https://github.com/wazootech/worlds-kit) | RDF-native React composition framework for Worlds |
| **Engine** | [sparql-engine](https://github.com/wazootech/sparql-engine) | `@wazoo/sparql-engine` — zero-dependency SPARQL 1.1/1.2 engine |
| **Agent tooling** | [wazoo-tools](https://github.com/wazootech/wazoo-tools) | `@wazoo/tools` — AI SDK tools over Worlds knowledge graphs |
| | [wazoo-cli](https://github.com/wazootech/wazoo-cli) | Command-line access with SHACL validation and SPARQL querying |
| | [wazoo-skills](https://github.com/wazootech/wazoo-skills) | Agent skills for the platform, via `npx skills add wazootech/wazoo-skills` |
| **Storage** | [worlds-libsql](https://github.com/wazootech/worlds-libsql) | libSQL/Turso adapter — the backend used by the hosted platform |
| | [worlds-sqlite](https://github.com/wazootech/worlds-sqlite) · [worlds-postgres](https://github.com/wazootech/worlds-postgres) · [worlds-cloudflare](https://github.com/wazootech/worlds-cloudflare) · [worlds-indexeddb](https://github.com/wazootech/worlds-indexeddb) | SQLite, PostgreSQL, Cloudflare D1 and browser IndexedDB adapters |
| **Docs** | [docs.wazoo.dev](https://github.com/wazootech/docs.wazoo.dev) | Product documentation |
| | [wazoo.dev](https://github.com/wazootech/wazoo.dev) | The product site |

Every row links to that repository's own README. Nothing here is a copy of it,
and nothing here needs to be kept in sync with it beyond the link working.

---

## How the pieces fit

```
                 wazoo-api                worlds-api
              (control plane)            (data plane)
              orgs · tokens ·            world data · lifecycle
              usage · billing            storage · keys · search
                   │                     SPARQL · import/export
                   │                            │
          wazoo-client-ts              worlds-client-ts
                   │                            │
                   └─────────── @worlds/sdk ─────┘
                          (in-process graph ops)
                                 │
                    ┌────────────┴────────────┐
              worlds-libsql            worlds-sqlite · postgres
              (hosted, Turso)           cloudflare · indexeddb
```

`worlds-api` is the single source of truth for world **data, lifecycle, storage
and keys**. `wazoo-api` is tenant, identity, usage and billing. One writer per
fact; no mirror.

---

## Keeping this map honest

A map that nobody maintains is worse than no map, so upkeep here is a scheduled
job rather than a habit:

- [REPOS.md](REPOS.md) and [VERSION.md](VERSION.md) are **generated** by
  [`scripts/generate.mjs`](scripts/generate.mjs). Never hand-edit them.
- [`scripts/check-links.mjs`](scripts/check-links.mjs) resolves every link in
  this repository weekly, classifies what moved, went archived, or 404'd, and
  files the diff as a single open issue.
- If you see a drift issue, that is your reminder. You do not need to remember
  this repository exists.

The rules that keep this repository minimal are in [AGENTS.md](AGENTS.md).

## Status

The hosted platform is in private beta. The durable-backend adapters other than
libSQL ship scaffolds, not full implementations — see
[docs.wazoo.dev](https://github.com/wazootech/docs.wazoo.dev) for what is
actually usable today.

## License

This repository holds documentation only. Each linked repository carries its own
license.

