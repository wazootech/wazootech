# Install

Three ways in, depending on what you are trying to do. Pick one.

Nothing here is a build system. There is no root install step, because there is
no root package: each part of the platform is an independent repository with its
own setup, and this file only tells you which ones you need and in what order.

Every package version below was verified against its registry when this file was
written. Each repository's own README is authoritative for its API — this file
deliberately does not restate it.

---

## 1. Use the hosted platform

No cloning. The platform runs as a service.

| What | Where |
| --- | --- |
| Product site | [wazoo.dev](https://wazootech/wazoo.dev) |
| Console (sign in, manage worlds) | [console.wazoo.dev](https://console.wazoo.dev) |
| Platform API (control plane) | [api.wazoo.dev](https://api.wazoo.dev) |
| Worlds API (data plane) | [data.wazoo.dev](https://data.wazoo.dev) |
| Documentation | [docs.wazoo.dev](https://github.com/wazootech/docs.wazoo.dev) |

The hosted platform is in **private beta** — accounts are invited. Start with the
[onboarding guide](https://github.com/wazootech/docs.wazoo.dev) in
docs.wazoo.dev, which covers requesting access, signing in, and creating your
first world.

Use the hosted platform if you want worlds without running anything.

---

## 2. Build on Worlds locally

You want in-process graph operations against storage you control. Install the
SDK and one storage adapter:

```sh
# Deno (first-class JSR support)
deno add jsr:@worlds/sdk jsr:@worlds/libsql

# Bun / npm / pnpm / Yarn (via JSR's npm compatibility layer)
npx jsr add @worlds/sdk @worlds/libsql
```

Or via CDN, with no build step:

```js
import { /* ... */ } from "https://esm.sh/jsr/@worlds/sdk@0.9.0";
```

| Package | Registry | Latest | Repository |
| --- | --- | --- | --- |
| `@worlds/sdk` | JSR | 0.9.0 | [worlds-sdk-ts](https://github.com/wazootech/worlds-sdk-ts) |
| `@worlds/libsql` | JSR | 0.6.0 | [worlds-libsql](https://github.com/wazootech/worlds-libsql) |
| `@worlds/sqlite` | JSR | 0.7.1 | [worlds-sqlite](https://github.com/wazootech/worlds-sqlite) |
| `@worlds/postgres` | JSR | 0.3.0 | [worlds-postgres](https://github.com/wazootech/worlds-postgres) |
| `@worlds/cloudflare` | JSR | 0.8.0 | [worlds-cloudflare](https://github.com/wazootech/worlds-cloudflare) |
| `@worlds/indexeddb` | JSR | 0.2.0 | [worlds-indexeddb](https://github.com/wazootech/worlds-indexeddb) |
| `@wazoo/sparql-engine` | JSR | 0.4.2 | [sparql-engine](https://github.com/wazootech/sparql-engine) |
| `@wazoo/client` | JSR | 0.2.0 | [wazoo-client-ts](https://github.com/wazootech/wazoo-client-ts) |
| `@worlds/client` | JSR | 0.2.1 | [worlds-client-ts](https://github.com/wazootech/worlds-client-ts) |
| `@wazoo/tools` | JSR | 0.2.0 | [wazoo-tools](https://github.com/wazootech/wazoo-tools) |

Versions come from each registry at the time this file was written and are
regenerated weekly — see [VERSION.md](VERSION.md). A repository with a package
version here is not a promise that the package is feature-complete.

**`@worlds/libsql` is the only adapter with a complete implementation.** The
others ship scaffolds. If you are choosing a backend, choose libSQL; if you are
building one, start from
[worlds-libsql](https://github.com/wazootech/worlds-libsql) as the reference
shape.

`@wazoo/worlds-kit` (the React composition framework) is not published to a
registry yet — clone [worlds-kit](https://github.com/wazootech/worlds-kit) and
work from source.

For the API surface — how to construct an SDK, what the storage adapters
guarantee, how to wire a SPARQL engine — read the SDK's own README. Do not trust
a snippet from a facade repository to be current.

---

## 3. Give an agent access to your graphs

No local setup. The agent-facing packages install the same way as the others:

```sh
deno add jsr:@wazoo/tools jsr:@wazoo/sparql-engine
npx jsr add @wazoo/tools @wazoo/sparql-engine
```

| Capability | Package | Repository |
| --- | --- | --- |
| AI SDK tools over Worlds graphs | `@wazoo/tools` | [wazoo-tools](https://github.com/wazootech/wazoo-tools) |
| Prebuilt agent skills for the platform | via `npx` | [wazoo-skills](https://github.com/wazootech/wazoo-skills) |
| SPARQL from the command line | via `deno`/`npx` | [wazoo-cli](https://github.com/wazootech/wazoo-cli) |

To install the packaged agent skills into a harness:

```sh
npx skills add wazootech/wazoo-skills
```

[wazoo-cli](https://github.com/wazootech/wazoo-cli) is the verifiable route into
a graph — SHACL validation and SPARQL querying from a terminal, which makes it
the fastest way to check that what an agent claims is actually in the store.

---

## Working on the platform itself

Setting up a full development environment spans repositories that are not all
public, so that setup is documented in the internal workspace harness rather
than here. This repository deliberately does not list private repositories, and
it is not the place to record how to check them out.

If you have access and want the harness, the entry point is the `workspace`
repository in this organization.

---

## Verifying what you installed

```sh
deno info jsr:@worlds/sdk     # or: npx jsr info @worlds/sdk
```

The weekly link check in this repository ([README](README.md#keeping-this-map-honest))
reports when a repository named here has moved, been archived, or stopped
existing.
