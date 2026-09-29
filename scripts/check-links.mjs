#!/usr/bin/env node
// The drift radar. Resolves every wazootech link in this repository and reports
// what moved, went archived, or stopped existing.
//
//   node scripts/check-links.mjs              report only
//   node scripts/check-links.mjs --file-issue report, and open/update one tracking issue
//
// Exit codes:  0 = clean   1 = drift found   2 = cannot read the organization
//
// The "2" case matters. A token scoped to this repository alone cannot see the
// rest of the organization, and without the preflight below that would be
// reported as 52 missing repositories — a false alarm that would train everyone
// to ignore this job. Fail loudly instead.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = "wazootech";

/**
 * Curated files: every repository named here must be current. Any archived,
 * renamed or missing repository is drift.
 */
const CURATED = ["README.md", "INSTALL.md", "AGENTS.md"];

/**
 * Generated inventories: they list archived repositories on purpose, so only a
 * broken link (missing or renamed) counts. Without this split the radar fires on
 * its very first run over REPOS.md's archived section, and a radar that cries
 * wolf on day one is a radar nobody reads.
 */
const INVENTORY = ["REPOS.md", "VERSION.md"];

const FILES = [...CURATED, ...INVENTORY];

// Repositories the curated map depends on. Their absence from the *organization
// listing* means the listing is truncated.
//
// Reading a single public repository is deliberately NOT the test: any token
// can do that, including a GITHUB_TOKEN scoped to this repository. Such a token
// would resolve every curated link to "ok" and return a near-empty org listing,
// so the radar would report a confident, completely blind "all clear". A radar
// that cannot fail is worse than no radar, so the listing is the sentinel.
const ORG_SENTINELS = ["wazoo-api", "worlds-api", "docs.wazoo.dev", "wazoo-skills"];

const ISSUE_TITLE = "Drift radar: the platform map is out of date";
const ISSUE_MARKER = "<!-- drift-radar -->";

function gh(args, { allowFail = false } = {}) {
  try {
    // stderr is piped, never inherited: a 404 that we deliberately tolerate must
    // not print "gh: Not Found" and read like a failure in the workflow log.
    return execFileSync("gh", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 32 * 1024 * 1024,
    }).trim();
  } catch (error) {
    if (allowFail) return null;
    throw new Error(`gh ${args.join(" ")} failed: ${error.stderr?.toString().trim() || error.message}`);
  }
}

function repoState(name) {
  const raw = gh(["api", `repos/${OWNER}/${name}`], { allowFail: true });
  if (raw === null) return { name, state: "missing" };
  const repo = JSON.parse(raw);
  if (repo.full_name !== `${OWNER}/${name}`)
    return { name, state: "renamed", detail: repo.full_name, archived: repo.archived };
  if (repo.archived) return { name, state: "archived" };
  return { name, state: "ok" };
}

function listOrgRepos() {
  const all = [];
  for (let page = 1; ; page++) {
    const raw = gh(["api", `orgs/${OWNER}/repos?per_page=100&page=${page}&type=all`], {
      allowFail: true,
    });
    if (raw === null) return null;
    let batch;
    try {
      batch = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

function linkedRepos() {
  /** @type {Map<string, {name: string, strict: boolean, files: Set<string>}>} */
  const found = new Map();
  for (const file of FILES) {
    let text;
    try {
      text = readFileSync(join(ROOT, file), "utf8");
    } catch {
      continue; // file absent is not a link problem
    }
    const re = new RegExp(`https://github\\.com/${OWNER}/([A-Za-z0-9._-]+)`, "g");
    for (const match of text.matchAll(re)) {
      const name = match[1].replace(/\.git$/, "");
      const entry = found.get(name) ?? { name, strict: false, files: new Set() };
      // Curated wins: a repo named in README.md is held to the stricter bar even
      // if the same repo also appears in the generated inventory.
      if (CURATED.includes(file)) entry.strict = true;
      entry.files.add(file);
      found.set(name, entry);
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const isDrift = ({ state, strict }) =>
  state === "missing" || state === "renamed" || (strict && state === "archived");

function report(states, unlisted) {
  const drift = states.filter(isDrift);
  const expectedArchived = states.filter((x) => x.state === "archived" && !x.strict);

  const lines = [`${ISSUE_MARKER}`, "", `_Checked ${new Date().toISOString()}._`, ""];

  if (drift.length === 0) {
    lines.push(
      `All ${states.length} linked repositories resolve, are not archived, and have not been renamed.`,
    );
    if (expectedArchived.length > 0) {
      lines.push(
        "",
        `_${expectedArchived.length} archived repositories are listed in the generated inventory, which is expected._`,
      );
    }
  } else {
    lines.push("## Links needing attention", "", "| Repository | State | Detail |", "| --- | --- | --- |");
    for (const item of drift) {
      const what =
        item.state === "missing"
          ? "does not resolve — 404 or not visible"
          : item.state === "archived"
            ? "archived — frozen, but named in curated content"
            : `renamed to \`${item.detail}\``;
      lines.push(
        `| \`${item.name}\` | **${item.state}** | ${what} | in ${item.files.join(", ")} |`,
      );
    }
    lines.push(
      "",
      "Fix by editing the link, or by correcting the repository it points at. If a",
      "repository is archived, the fix is usually to drop it from the curated table in",
      "`README.md` and let `scripts/generate.mjs` move it to the archived section.",
    );
  }

  if (unlisted.length > 0) {
    lines.push(
      "",
      "## New in the organization",
      "",
      ...unlisted.map((n) => `- \`${n}\` — not in the inventory. Run \`node scripts/generate.mjs\`.`),
      "",
      "New repositories are not automatically part of the platform. Adding one to the",
      "curated table in `README.md` is a human decision.",
    );
  }

  if (drift.length === 0 && unlisted.length === 0) {
    lines.push(
      "",
      "Nothing to do. The map matches the organization, and any open drift issue",
      "from a previous run was closed by this one.",
    );
  }

  return lines.join("\n");
}

/**
 * Keep exactly one drift issue. `clean` closes it instead of editing it, so a
 * resolved map retires its own reminder rather than leaving a stale one open.
 *
 * `gh issue list --json` only returns the fields asked for, so the title has to
 * be requested: filtering a list that has no `title` field silently matches
 * nothing and opens a fresh issue on every run.
 */
function fileIssue(body, { clean }) {
  const repo = `${OWNER}/wazootech`;
  const existing = JSON.parse(
    gh(["issue", "list", "--repo", repo, "--state", "open", "--search", ISSUE_TITLE, "--json", "number,title"], {
      allowFail: true,
    }) ?? "[]",
  );
  const targets = existing.filter((i) => i.title === ISSUE_TITLE);

  if (clean) {
    for (const issue of targets) {
      gh(["issue", "close", String(issue.number), "--repo", repo, "--comment", "Clean run: no drift. Closing."], {
        allowFail: true,
      });
      console.log(`closed drift issue #${issue.number}`);
    }
    if (targets.length === 0) console.log("clean: no open drift issue to close");
    return;
  }

  if (targets.length > 0) {
    for (const issue of targets.slice(1)) {
      gh(["issue", "close", String(issue.number), "--repo", repo, "--comment", `Duplicate of #${targets[0].number}.`], {
        allowFail: true,
      });
      console.log(`closed duplicate drift issue #${issue.number}`);
    }
    gh(["issue", "edit", String(targets[0].number), "--repo", repo, "--body", body]);
    console.log(`updated drift issue #${targets[0].number}`);
  } else {
    const url = gh(["issue", "create", "--repo", repo, "--title", ISSUE_TITLE, "--body", body]);
    console.log(`opened drift issue: ${url}`);
  }
}

function main() {
  // Preflight: is the organization listing complete? A truncated listing is the
  // dangerous case here — every link would still resolve, so the radar would
  // report a confident and entirely blind "all clear".
  const org = listOrgRepos();
  if (org === null) {
    console.error(
      `Could not list ${OWNER}'s repositories, so the organization's repositories are\n` +
        "not visible to this credential. That is a credentials problem, not map drift.\n\n" +
        "Fix: give the workflow a token with read access to the organization, as the\n" +
        "GH_ORG_TOKEN secret. A GITHUB_TOKEN scoped to this repository is not enough.",
    );
    process.exit(2);
  }

  const visible = new Set(org.map((r) => r.name));
  const absent = ORG_SENTINELS.filter((n) => !visible.has(n));
  if (absent.length > 0) {
    console.error(
      `The organization listing is incomplete: ${absent.map((n) => `${OWNER}/${n}`).join(", ")}\n` +
        `not present. ${org.length} repositories were visible, which is not the whole\n` +
        "organization. Every curated link would still resolve, so this run would\n" +
        "otherwise report a clean, completely blind pass.\n\n" +
        "Fix: give the workflow a token with read access to the organization, as the\n" +
        "GH_ORG_TOKEN secret. A GITHUB_TOKEN scoped to this repository is not enough.",
    );
    process.exit(2);
  }

  const states = linkedRepos().map((entry) => ({
    ...repoState(entry.name),
    strict: entry.strict,
    files: [...entry.files],
  }));
  const listed = new Set(states.map((s) => s.name));
  const unlisted = org
    .filter((r) => !r.private && !r.archived && !listed.has(r.name))
    .map((r) => r.name)
    .sort();

  const drift = states.filter(isDrift);
  const expectedArchived = states.filter((x) => x.state === "archived" && !x.strict);
  const body = report(states, unlisted);

  const clean = drift.length === 0 && unlisted.length === 0;

  if (process.argv.includes("--file-issue")) {
    fileIssue(body, { clean });
  } else {
    console.log(body);
  }

  const summary =
    `${states.length} links checked · ${byCount(states, "ok")} ok · ` +
    `${expectedArchived.length} archived (inventory, expected) · ` +
    `${byCount(drift, "archived")} archived (curated) · ` +
    `${byCount(drift, "renamed")} renamed · ${byCount(drift, "missing")} missing · ` +
    `${unlisted.length} new`;
  console.error(summary);

  process.exit(drift.length > 0 || unlisted.length > 0 ? 1 : 0);
}

const byCount = (list, state) => list.filter((x) => x.state === state).length;

main();
