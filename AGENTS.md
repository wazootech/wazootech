# AGENTS.md

The constitution for `wazootech/wazootech`. Short, because the repository is
supposed to stay small.

## What this repository is

A **map**. It points at the repositories that make up the Wazoo Platform and
nothing else. It contains no product code, no build, and no dependencies.

It exists because the organization has enough repositories that "which of these
do I need, and is it still current?" stopped being answerable by reading. This
file is the answer, kept answerable by a scheduled check rather than by anyone's
memory.

## Hard rules

1. **No product code, ever.** If it compiles, ships, or runs, it belongs in a
   child repository. This repository has no `package.json`, no `deno.json`, no
   build step, and no runtime dependencies.
2. **No duplicated documentation.** One link to a repository's own README, never
   a summary of it. If a linked repository's README is wrong, fix it there. A
   copy here becomes a second thing that is wrong.
3. **No prose that duplicates a sibling surface.** Product documentation belongs
   in `docs.wazoo.dev`; positioning and brand belong in `wazoo.dev`. This
   repository links to both and does not restate either.
4. **No new source of truth.** The workspace manifest in the internal harness
   remains the record of what is checked out. This repository is prose and links.
5. **The file cap is nine.** `README.md`, `INSTALL.md`, `AGENTS.md`, `REPOS.md`,
   `VERSION.md`, `.gitattributes`, `scripts/`, `.github/workflows/`. A pull
   request that exceeds the cap must justify the increase in its description, in
   one sentence, explaining why a child repository could not hold the content.
   The cap started at eight; `.gitattributes` is the ninth, because without
   pinned LF endings this repository produces whole-file diffs on prose changes.
6. **Every repository named in `README.md` must be current.** If one is archived
   or renamed, fix it in the same change that archived or renamed it. The weekly
   check will find it eventually; that is the backstop, not the plan.

## Generated files

`REPOS.md` and `VERSION.md` are generated. **Never hand-edit them.** A
hand-edited generated file is reverted by the next run, and the diff hides the
real change.

```sh
node scripts/generate.mjs        # rewrite REPOS.md and VERSION.md
node scripts/generate.mjs --check # fail if either is out of date (used by CI)
```

The generator reads the organization's repository list through the `gh` CLI. It
requires `gh auth status` to be logged in with read access to the organization.

## The upkeep workflow is not optional

```sh
node scripts/check-links.mjs              # report drift
node scripts/check-links.mjs --file-issue # report, and open/update the drift issue
```

Run weekly by [`.github/workflows/links.yml`](.github/workflows/links.yml). It
resolves every `github.com/wazootech/*` link in this repository and classifies
each one:

| Result | Meaning |
| --- | --- |
| `ok` | resolves, not archived, name unchanged |
| `archived` | still resolves, but the repository is frozen |
| `renamed` | resolves under a different name — the link is now a redirect |
| `missing` | does not resolve — 404 or not visible |

The check is **stricter for curated content than for the generated inventory**:
any repository named in `README.md`, `INSTALL.md`, or `AGENTS.md` must be
`ok`, while `REPOS.md` lists archived repositories on purpose and only reports
`missing` and `renamed` there. Without that split the job fires on its first
run over its own archived section, and a radar that cries wolf on day one is a
radar nobody reads.

It also diffs the organization's repository list against `REPOS.md` so **new**
repositories are surfaced, and files the result as a single open issue.

### The workflow needs a credential

The automatic `GITHUB_TOKEN` is scoped to this repository alone, so it cannot see
the other 52 repositories in the organization — every one of them would look
missing. The job requires a repository secret named **`GH_ORG_TOKEN`** holding a
token with read access to the organization. Without it the job exits `2` and
says so, rather than reporting a false alarm.

If that workflow is ever removed, this repository becomes a fourth hand-maintained
surface that silently rots — which is what happened to the organization's retired
knowledge base, and the reason it is archived rather than maintained. **If the
check cannot run, delete this repository instead of leaving it stale.**

## Adding a repository to the showcase

Only `README.md`'s platform table is curated, and it stays small on purpose.

1. The repository must be public, not archived, and part of the platform — not a
   tool, template, or experiment that happens to be public.
2. Add one row: link, one line, what it is. No summary of its internals.
3. If it is a published package, add it to the `INSTALL.md` table with its
   registry and version.
4. `node scripts/generate.mjs` — the inventory picks it up automatically.

The generator cannot decide what is "platform". A human adds the row; the
generator only keeps the inventory honest.

## Public and private

This repository is public. **No private repository name appears in it** — not in
`README.md`, not in `INSTALL.md`, and not in the generated `REPOS.md`. The
generator filters the inventory to public repositories and reports only a *count*
of the internal ones it omitted.

If a task requires documenting private repositories, that documentation belongs
in the internal harness, not here.

## When something here is wrong

If a claim in this repository is wrong, the fix is almost never more words here.
It is either a correction in the linked repository, or a link to the right one.
Write the shortest thing that makes the map true.
