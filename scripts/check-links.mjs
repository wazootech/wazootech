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

// A repository that certainly exists and is certainly public. If this one cannot
// be read, the credential is the problem, not the map.
const SENTINEL = "wazoo-api";

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
    lines.push("", "Nothing to do. This issue closes itself on the next clean run.");
  }

  return lines.join("\n");
}

function fileIssue(body) {
  const existing = JSON.parse(
    gh(["issue", "list", "--repo", `${OWNER}/wazootech`, "--state", "open", "--search", ISSUE_TITLE, "--json", "number"], {
      allowFail: true,
    }) ?? "[]",
  );
  const target = existing.find((i) => i.title === ISSUE_TITLE);
  if (target) {
    gh(["issue", "edit", String(target.number), "--repo", `${OWNER}/wazootech`, "--body", body]);
    console.log(`updated drift issue #${target.number}`);
  } else {
    const url = gh([
      "issue",
      "create",
      "--repo",
      `${OWNER}/wazootech`,
      "--title",
      ISSUE_TITLE,
      "--body",
      body,
    ]);
    console.log(`opened drift issue: ${url}`);
  }
}

function main() {
  // Preflight: can this credential see the organization at all?
  const sentinel = repoState(SENTINEL);
  if (sentinel.state === "missing") {
    console.error(
      `Cannot read ${OWNER}/${SENTINEL}, so the organization's repositories are not visible\n` +
        "to this credential. That is a credentials problem, not map drift — refusing to\n" +
        "report every repository as missing.\n\n" +
        "Fix: give the workflow a token with read access to the organization, as the\n" +
        "GH_ORG_TOKEN secret. A GITHUB_TOKEN scoped to this repository is not enough.",
    );
    process.exit(2);
  }

  const org = listOrgRepos();
  if (org === null) {
    console.error("Could not list the organization's repositories. Same credentials problem as above.");
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

  if (process.argv.includes("--file-issue")) {
    fileIssue(body);
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
