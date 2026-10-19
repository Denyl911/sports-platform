#!/usr/bin/env bun
// The repository's checks, one program with a subcommand each:
//   layering | errors | rbac | adr | docs | web-fetch | glyphs | gate
//
// **Why one program.** nilo's `checks/` pattern: each rule is a scan the
// machine runs, not a paragraph somebody reads. A scan prints the violations
// it found and exits non-zero on any. One subcommand is one rule; `gate`
// runs them all and is what CI runs.
//
// The declared matrices below are AGENTS.md's "Layout" and invariants made
// executable. When a refusal fires on a case that is actually right, the
// move is to write the row (with its reason) or edit the ADR — never to
// silence the check by hand.

import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { argv, exit, stdout } from "node:process";

const ROOT = path.resolve(import.meta.dir, "..");

// ---------------------------------------------------------------------------
// Scanning: file walk, comment stripping, import extraction, classification
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
	"node_modules",
	".turbo",
	".output",
	".next",
	".tanstack",
	".nitro",
	".vercel",
	"dist",
	"coverage",
	"drizzle",
	"gen",
	"src-tauri",
	"target",
	"site",
]);

const CODE_EXT = /\.(tsx?|jsx?)$/;
const GENERATED = /routeTree\.gen\.tsx?$|\.gen\.tsx?$|\.d\.ts$/;

type Region =
	| "api-root"
	| "api-routes"
	| "api-services"
	| "api-middlewares"
	| "api-lib"
	| "web"
	| "pkg-db"
	| "pkg-schemas"
	| "pkg-api-client"
	| "pkg-ui";

const REGION_RULES: Array<{ re: RegExp; region: Region }> = [
	{ re: /^apps\/web\/src\//, region: "web" },
	{ re: /^apps\/api\/src\/routes\//, region: "api-routes" },
	{ re: /^apps\/api\/src\/services\//, region: "api-services" },
	{ re: /^apps\/api\/src\/middlewares\//, region: "api-middlewares" },
	{ re: /^apps\/api\/src\/lib\//, region: "api-lib" },
	{ re: /^apps\/api\/src\/[^/]+$/, region: "api-root" },
	{ re: /^packages\/db\/src\//, region: "pkg-db" },
	{ re: /^packages\/schemas\/src\//, region: "pkg-schemas" },
	{ re: /^packages\/api-client\/src\//, region: "pkg-api-client" },
	{ re: /^packages\/ui\/src\//, region: "pkg-ui" },
];

function regionFor(relPath: string): Region | null {
	for (const { re, region } of REGION_RULES)
		if (re.test(relPath)) return region;
	return null;
}

const OWN_SRC: Array<[string, string]> = [
	["apps/api/src", "apps/api"],
	["apps/web/src", "apps/web"],
	["packages/db/src", "packages/db"],
	["packages/schemas/src", "packages/schemas"],
	["packages/api-client/src", "packages/api-client"],
	["packages/ui/src", "packages/ui"],
];

async function collectCodeFiles(): Promise<string[]> {
	const acc: string[] = [];
	for (const dir of ["apps", "packages"]) {
		await walkCode(path.join(ROOT, dir), acc);
	}
	return acc;
}

async function walkCode(dir: string, out: string[]): Promise<void> {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		const rel = path.relative(ROOT, full);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) await walkCode(full, out);
		} else if (CODE_EXT.test(rel) && !GENERATED.test(rel)) {
			out.push(rel);
		}
	}
}

async function collectTextFiles(): Promise<string[]> {
	const acc: string[] = [];
	for (const dir of ["apps", "packages", "docs"]) {
		await walkText(path.join(ROOT, dir), acc);
	}
	return acc;
}

async function walkText(dir: string, out: string[]): Promise<void> {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		const rel = path.relative(ROOT, full);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) await walkText(full, out);
		} else if (CODE_EXT.test(rel) || rel.endsWith(".md")) {
			out.push(rel);
		}
	}
}

async function rootMarkdown(): Promise<string[]> {
	const names = ["README.md", "AGENTS.md", "CONTEXT.md", "CHANGELOG.md"];
	const out: string[] = [];
	for (const name of names) {
		if (await Bun.file(path.join(ROOT, name)).exists()) out.push(name);
	}
	return out;
}

// Import scans run on comment-stripped text: comments quote module paths all
// over this repo (`// peerDependency ligera: api es apps/api ...`), and a
// comment is never an import.
function stripComments(text: string): string {
	return text
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

type Import = { spec: string; typeOnly: boolean };

// One regex for the three import forms. Laziness is bounded: a match spans
// at most 400 characters to reach its nearest `from "..."`.
const IMPORT_RE =
	/(?:^|[\s;)}])(?:import|export)\s+(type\s+)?[\s\S]{0,400}?from\s+["']([^"']+)["']|\bimport\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']/g;

function importsOf(rawText: string): Import[] {
	const text = stripComments(rawText);
	const out: Import[] = [];
	for (const match of text.matchAll(IMPORT_RE)) {
		const spec = match[2] ?? match[3] ?? match[4];
		if (spec) out.push({ spec, typeOnly: Boolean(match[1]) });
	}
	return out;
}

type Target =
	| { kind: "external"; name: string }
	| { kind: "self"; region: Region | null; targetPath: string }
	| { kind: "sports"; name: string }
	| { kind: "cross-app"; name: string }
	| { kind: "other"; rel: string };

// Where an import points. `self` keeps, for apps/api, the sub-region the
// target lands in — that is what the internal boundaries read. A relative
// path outside its own app/package, or naming another workspace, is `other`.
function classify(spec: string, file: string): Target {
	if (spec.startsWith("api/")) return { kind: "cross-app", name: spec };
	if (spec.startsWith("@sports/"))
		return { kind: "sports", name: spec.slice("@sports/".length) };
	if (spec.startsWith("bun:")) return { kind: "external", name: spec };
	if (!spec.startsWith(".") && !spec.startsWith("/"))
		return { kind: "external", name: spec };

	const abs = path.resolve(path.dirname(path.join(ROOT, file)), spec);
	const rel = path.relative(ROOT, abs);
	if (rel.startsWith("..")) return { kind: "other", rel };

	for (const [ownSrc, owner] of OWN_SRC) {
		if (!rel.startsWith(`${ownSrc}/`)) continue;
		const importerOwner = file.split(path.sep).slice(0, 2).join("/");
		if (owner !== importerOwner) return { kind: "other", rel };
		const inside = rel.slice(ownSrc.length + 1);
		return {
			kind: "self",
			region: regionFor(rel) ?? null,
			targetPath: inside,
		};
	}
	return { kind: "other", rel };
}

// ---------------------------------------------------------------------------
// layering: the declared matrix (AGENTS.md "Layout", executable)
// ---------------------------------------------------------------------------

type Violation = { file: string; detail: string };

type LayerRule = (args: {
	spec: string;
	target: Target;
	typeOnly: boolean;
	file: string;
}) => string | null; // the refusal, or null when allowed

const LAYERING: Partial<Record<Region, LayerRule>> = {
	"api-routes": ({ spec, target }) => {
		if (target.kind === "sports" && target.name === "schemas") return null;
		if (target.kind === "external") return null;
		if (target.kind === "self") {
			const { region } = target;
			if (
				region === "api-services" ||
				region === "api-middlewares" ||
				region === "api-lib" ||
				region === "api-root"
			)
				return null;
			if (region === "api-routes")
				return `a route imports another route ('${spec}') — routes are composed in app.ts, not in each other`;
			return `a route may import a schema, a service, a middleware or lib; '${spec}' is none of those`;
		}
		return `a route may not import '${spec}'`;
	},

	"api-services": ({ spec, target, file }) => {
		if (target.kind === "sports" && target.name.startsWith("db")) return null;
		if (target.kind === "sports" && target.name === "schemas") return null;
		if (target.kind === "external") {
			if (spec === "elysia" || spec.startsWith("@elysia/"))
				return `the service '${file}' imports ${spec} — services are free of HTTP; DomainError is their language (ADR 004)`;
			return null;
		}
		if (target.kind === "self") {
			const { region } = target;
			if (region === "api-services" || region === "api-lib") return null;
			if (region === "api-middlewares")
				return `a service imports a middleware ('${spec}') — the guard resolves; the service refuses (ADR 002)`;
			if (region === "api-routes")
				return `a service imports a route ('${spec}') — routes are the outer layer`;
		}
		return `a service may not import '${spec}'`;
	},

	"api-middlewares": ({ spec, target }) => {
		if (target.kind === "sports" && target.name === "schemas") return null;
		if (target.kind === "external") return null;
		if (target.kind === "self") {
			const { region } = target;
			if (region === "api-services" || region === "api-lib") return null;
			if (region === "api-routes")
				return `a middleware imports a route ('${spec}')`;
		}
		return `a middleware may not import '${spec}' — lookups live in services (ADR 002)`;
	},

	"api-lib": ({ spec, target }) => {
		if (target.kind === "external") return null;
		if (target.kind === "sports") return null;
		if (target.kind === "self") {
			if (target.region !== "api-routes") return null;
			return `lib imports a route ('${spec}')`;
		}
		return `lib may not import '${spec}'`;
	},

	"api-root": () => null, // the composition root assembles everything

	web: ({ spec, target }) => {
		if (target.kind === "sports") {
			if (target.name.startsWith("api-client") || target.name === "ui")
				return null;
			return `web imports '${spec}' — the API is reached through @sports/api-client, the UI stays in @sports/ui (ADR 003)`;
		}
		if (target.kind === "external") return null;
		if (target.kind === "self") return null;
		return `web may not import '${spec}'`;
	},

	"pkg-db": ({ spec, target }) =>
		target.kind === "sports"
			? `@sports/db imports '${spec}' — the bottom package`
			: null,

	"pkg-schemas": ({ spec, target }) => {
		if (target.kind === "self") return null; // own modules (index re-exports)
		if (target.kind === "sports" && target.name.startsWith("db")) return null;
		if (target.kind === "external") return null;
		return `@sports/schemas imports '${spec}' — the tables are its only source (ADR 001)`;
	},

	"pkg-api-client": ({ spec, target, typeOnly }) => {
		if (target.kind === "sports") {
			if (target.name === "schemas") return null;
			return `@sports/api-client imports '${spec}'`;
		}
		if (target.kind === "external") return null;
		if (target.kind === "cross-app" && typeOnly) return null; // the contract surface
		if (target.kind === "cross-app")
			return `@sports/api-client imports '${spec}' at runtime — only type-only imports of the API are the door (ADR 003)`;
		if (target.kind === "self") return null;
		return `@sports/api-client may not import '${spec}'`;
	},

	"pkg-ui": ({ spec, target }) =>
		target.kind === "sports"
			? `@sports/ui imports '${spec}' — shared components carry no domain`
			: null,
};

async function checks_layering(): Promise<{
	scanned: number;
	violations: Violation[];
}> {
	const rels = await collectCodeFiles();
	const violations: Violation[] = [];
	for (const rel of rels) {
		const region = regionFor(rel);
		if (!region) continue; // scripts, configs, tests — nothing declared yet
		const rule = LAYERING[region];
		if (!rule) continue;
		const text = await Bun.file(path.join(ROOT, rel)).text();
		for (const imp of importsOf(text)) {
			const refusal = rule({
				spec: imp.spec,
				target: classify(imp.spec, rel),
				typeOnly: imp.typeOnly,
				file: rel,
			});
			if (refusal) violations.push({ file: rel, detail: refusal });
		}
	}
	return { scanned: rels.length, violations };
}

// ---------------------------------------------------------------------------
// errors: the static half of ADR 004 — services speak DomainError; raw throws
// are refused (the dynamic half lives in apps/api/test/error-contract.test.ts)
// ---------------------------------------------------------------------------

const RAW_THROW_LINE =
	/throw\s+new\s+(?!DomainError\b)(?:[A-Z][\w$]*Error|ValidationError)\(/;

async function checks_errors(): Promise<{
	scanned: number;
	violations: Violation[];
}> {
	const rels = await collectCodeFiles();
	const violations: Violation[] = [];
	let scanned = 0;
	for (const rel of rels) {
		const region = regionFor(rel);
		if (region !== "api-services" && region !== "api-middlewares") continue;
		scanned += 1;
		const text = stripComments(await Bun.file(path.join(ROOT, rel)).text());
		const lines = text.split("\n");
		for (const [i, line] of lines.entries()) {
			if (RAW_THROW_LINE.test(line)) {
				violations.push({
					file: rel,
					detail: `line ${i + 1}: a raw error is thrown — throw DomainError, with a status and a domain message (ADR 004); what is not one leaves as a 500`,
				});
			}
		}
	}
	return { scanned, violations };
}

// ---------------------------------------------------------------------------
// rbac: every mutating route carries a guard, or is declared public here
// ---------------------------------------------------------------------------

const MUTATION_RE = /\.(post|patch|put|delete)\(\s*["'`]([^"'`]+)/g;

// Route files that mutate without a guard, with the reason that is right. A
// new public mutation gets a row here — thinking about it is the sweep's
// point.
const PUBLIC_MUTATIONS: Record<string, string> = {
	"auth.ts":
		"register, login, refresh and logout run before there is a member; the token is born here",
};

async function checks_rbac(): Promise<{
	scanned: number;
	violations: Violation[];
	notes: string[];
}> {
	const routeDir = path.join(ROOT, "apps", "api", "src", "routes");
	if (!(await stat(routeDir).catch(() => null)))
		return { scanned: 0, violations: [], notes: [] };

	const names = (await readdir(routeDir))
		.filter((n) => n.endsWith(".ts"))
		.sort();
	const violations: Violation[] = [];
	const notes: string[] = [];

	for (const name of names) {
		const rel = `apps/api/src/routes/${name}`;
		const code = stripComments(
			await Bun.file(path.join(routeDir, name)).text(),
		);
		const mutations: string[] = [];
		for (const match of code.matchAll(MUTATION_RE)) {
			mutations.push(`${match[1].toUpperCase()} ${match[2]}`);
		}
		if (mutations.length === 0) continue;

		const hasGuard = /require[A-Z][A-Za-z]*Role\s*[({]/.test(code);
		if (hasGuard) {
			notes.push(`${rel}: guarded, ${mutations.length} mutation(s)`);
		} else {
			const reason = PUBLIC_MUTATIONS[name];
			if (reason) {
				notes.push(`${rel}: public (no guard) — ${reason}`);
			} else {
				violations.push({
					file: rel,
					detail: `${mutations.length} mutating endpoint(s) (${mutations.join(", ")}) and no require<Role> guard — every write carries its guard (ADR 002), or a PUBLIC_MUTATIONS row in scripts/checks.ts names why it is public`,
				});
			}
		}
	}
	return { scanned: names.length, violations, notes };
}

// ---------------------------------------------------------------------------
// adr: file shape, and every cited number has its file (ADR 006's rules)
// ---------------------------------------------------------------------------

const ADR_FILE_RE = /^\d{3}-[a-z0-9-]+\.md$/;

async function checks_adr(): Promise<{
	scanned: number;
	violations: Violation[];
}> {
	const adrDir = path.join(ROOT, "docs", "adr");
	const violations: Violation[] = [];
	const names = (await readdir(adrDir)).filter((n) => n.endsWith(".md"));
	const numbers = new Set<number>();

	for (const name of names) {
		if (!ADR_FILE_RE.test(name)) {
			violations.push({
				file: `docs/adr/${name}`,
				detail: `an ADR file is not 'NNN-slug.md'`,
			});
			continue;
		}
		numbers.add(Number(name.slice(0, 3)));

		const text = await Bun.file(path.join(adrDir, name)).text();
		if (!text.includes("**Status:**"))
			violations.push({
				file: `docs/adr/${name}`,
				detail: "no **Status:** line",
			});
		if (!text.includes("**Topic:**"))
			violations.push({
				file: `docs/adr/${name}`,
				detail: "no **Topic:** line",
			});
		if (/^\*\*(Amends|Supersedes|Refines):/m.test(text))
			violations.push({
				file: `docs/adr/${name}`,
				detail:
					"a revision written as a new file — edit the rule in place (ADR 006)",
			});
		if (/^#\s+\d{3}[-\s]/m.test(text))
			violations.push({
				file: `docs/adr/${name}`,
				detail: "the title carries its number — the filename does that job",
			});
	}

	// every cited ADR exists, in the three-digit form (ADR 006)
	const textFiles = await collectTextFiles();
	for (const rel of textFiles) {
		const text = await Bun.file(path.join(ROOT, rel)).text();
		for (const match of text.matchAll(/ADRs?\s+(\d{1,6})(?!\d)/g)) {
			const digits = match[1];
			if (digits.length !== 3) {
				violations.push({
					file: rel,
					detail: `cites an ADR as '${digits}' — the form is three digits (ADR 006)`,
				});
			} else if (!numbers.has(Number(digits))) {
				violations.push({
					file: rel,
					detail: `cites ADR ${digits}, which has no file under docs/adr/`,
				});
			}
		}
	}

	return { scanned: names.length, violations };
}

// ---------------------------------------------------------------------------
// docs: every relative markdown link resolves; todo entries carry their line
// ---------------------------------------------------------------------------

const MD_LINK_RE =
	/[^!]\[[^\]]*\]\((?!https?:|#|mailto:)([^)\s]+)(?:#[^)\s]*)?\)/g;

async function walkMd(dir: string, out: string[]): Promise<void> {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		const rel = path.relative(ROOT, full);
		if (entry.isDirectory()) {
			if (!SKIP_DIRS.has(entry.name)) await walkMd(full, out);
		} else if (rel.endsWith(".md")) {
			out.push(rel);
		}
	}
}

async function checks_docs(): Promise<{
	scanned: number;
	violations: Violation[];
}> {
	const files: string[] = [...(await rootMarkdown())];
	await walkMd(path.join(ROOT, "docs"), files);
	const violations: Violation[] = [];

	for (const rel of files) {
		const text = await Bun.file(path.join(ROOT, rel)).text();
		const dir = path.dirname(path.join(ROOT, rel));
		for (const match of text.matchAll(MD_LINK_RE)) {
			const spec = match[1];
			if (!spec) continue;
			const target = path.resolve(dir, decodeURIComponent(spec));
			const entry = await stat(target).catch(() => null);
			if (!entry) {
				violations.push({
					file: rel,
					detail: `a link to '${spec}' names a file that does not exist`,
				});
			}
		}
	}

	// todo entries: every bold-open paragraph under a `## P` tier carries a
	// `Needs:` or `What would settle it:` line, which is what makes a
	// quietly-stopped blocker findable.
	const todoText = await Bun.file(path.join(ROOT, "docs", "todo.md")).text();
	let tier = "";
	for (const block of todoText.split(/\n\n+/)) {
		if (block.startsWith("## P")) {
			tier = block.split("\n")[0];
			continue;
		}
		if (!block.startsWith("**") || !tier.startsWith("## P")) continue;
		if (!block.includes("Needs:") && !block.includes("What would settle it:")) {
			const claim = (block.split("\n")[0].match(/\*\*(.+?)\*\*/) ?? [
				"",
				block.split("\n")[0],
			])[1];
			violations.push({
				file: "docs/todo.md",
				detail: `the entry '${claim}' under ${tier} closes without a Needs: or What would settle it: line`,
			});
		}
	}

	return { scanned: files.length, violations };
}

// ---------------------------------------------------------------------------
// web-fetch: the call-site half of ADR 003. The layering matrix pins what
// apps/web may *import*, but a fetch() made inside a component is invisible
// to the import graph — the door to the API and the live sockets is
// @sports/api-client only, at runtime too (its callers pass getToken; the
// token never lives in the web app). A case that is actually right is an
// edit to this rule naming its reason, not a silenced check.
// ---------------------------------------------------------------------------

const WEB_NET_LINES: Array<{ label: string; re: RegExp }> = [
	{ label: "fetch()", re: /\bfetch\s*\(/ },
	{ label: "new WebSocket()", re: /\bnew\s+WebSocket\s*\(/ },
	{ label: "new EventSource()", re: /\bnew\s+EventSource\s*\(/ },
	{ label: "XMLHttpRequest", re: /\bXMLHttpRequest\b/ },
];

const WEB_NET_EXEMPTIONS: Record<string, Set<string>> = {
	"apps/web/src/components/ImageUploader.tsx": new Set(["XMLHttpRequest"]),
};

async function checks_web_fetch(): Promise<{
	scanned: number;
	violations: Violation[];
}> {
	const rels = await collectCodeFiles();
	const violations: Violation[] = [];
	let scanned = 0;
	for (const rel of rels) {
		if (regionFor(rel) !== "web") continue;
		scanned += 1;
		const text = stripComments(await Bun.file(path.join(ROOT, rel)).text());
		const lines = text.split("\n");
		for (const [i, line] of lines.entries()) {
			const exempt = WEB_NET_EXEMPTIONS[rel];
			const hit = WEB_NET_LINES.find(({ re }) => re.test(line));
			if (hit && !(exempt?.has(hit.label) ?? false)) {
				violations.push({
					file: rel,
					detail: `line ${i + 1}: raw network call (${hit.label}) — every request and socket rides @sports/api-client (ADR 003)`,
				});
			}
		}
	}
	return { scanned, violations };
}

// ---------------------------------------------------------------------------
// glyphs: the other half of the icon rule. An icon is `lucide` through
// `@sports/ui` (ADR 009): restyleable, resizable, and silenced to the screen
// reader while the control keeps its name. A `→`, a `✓` or a `☰` typed into
// JSX is none of those — and it is what every admin affordance used before
// this scan. The one shape the rule cannot reach is `<option>`: a select label
// holds text, not elements, so the "A → Z" sort labels keep their arrow.
// ---------------------------------------------------------------------------

const TEXT_GLYPHS: Array<{ glyph: string; name: string }> = [
	{ glyph: "→", name: "flecha" },
	{ glyph: "←", name: "flecha" },
	{ glyph: "▸", name: "triángulo" },
	{ glyph: "▾", name: "triángulo" },
	{ glyph: "›", name: "chevron" },
	{ glyph: "‹", name: "chevron" },
	{ glyph: "✓", name: "check" },
	{ glyph: "✔", name: "check" },
	{ glyph: "✕", name: "cruz" },
	{ glyph: "×", name: "cruz" },
	{ glyph: "☰", name: "hamburguesa" },
	{ glyph: "ℹ", name: "info" },
	{ glyph: "•", name: "punto" },
];

async function checks_glyphs(): Promise<{
	scanned: number;
	violations: Violation[];
}> {
	const rels = await collectCodeFiles();
	const violations: Violation[] = [];
	let scanned = 0;
	for (const rel of rels) {
		const region = regionFor(rel);
		if (region !== "web" && region !== "pkg-ui") continue;
		scanned += 1;
		const text = stripComments(await Bun.file(path.join(ROOT, rel)).text());
		for (const [i, line] of text.split("\n").entries()) {
			// Un `<option>` no admite hijos: la etiqueta del select es texto.
			if (line.includes("<option")) continue;
			const hit = TEXT_GLYPHS.find(({ glyph }) => line.includes(glyph));
			if (hit) {
				violations.push({
					file: rel,
					detail: `line ${i + 1}: '${hit.glyph}' (${hit.name}) drawn as text — an icon comes from @sports/ui, the barrel in packages/ui/src/components/ui/icon.ts`,
				});
			}
		}
	}
	return { scanned, violations };
}

// ---------------------------------------------------------------------------
// gate: every check, one summary each
// ---------------------------------------------------------------------------

const CHECKS = {
	layering: checks_layering,
	errors: checks_errors,
	rbac: checks_rbac,
	adr: checks_adr,
	docs: checks_docs,
	"web-fetch": checks_web_fetch,
	glyphs: checks_glyphs,
} as const satisfies Record<
	string,
	() => Promise<{ scanned: number; violations: Violation[]; notes?: string[] }>
>;

type CheckName = keyof typeof CHECKS;
type CheckResult = {
	scanned: number;
	violations: Violation[];
	notes?: string[];
};

async function runOne(name: CheckName): Promise<boolean> {
	const { scanned, violations, notes } = (await CHECKS[name]()) as CheckResult;
	if (name === "rbac") stdout.write(`\nrbac — ${scanned} route file(s):\n`);
	else stdout.write(`\n${name} — ${scanned} file(s) scanned:\n`);
	for (const note of notes ?? []) stdout.write(`    ${note}\n`);
	if (violations.length === 0) {
		stdout.write("  ok\n");
	} else {
		for (const v of violations) stdout.write(`  ${v.file}: ${v.detail}\n`);
		stdout.write(`  ${violations.length} violation(s)\n`);
	}
	return violations.length === 0;
}

async function gate(): Promise<boolean> {
	let ok = true;
	for (const name of Object.keys(CHECKS) as CheckName[]) {
		if (!(await runOne(name))) ok = false;
	}
	stdout.write(`\n${ok ? "gate: all checks pass" : "gate: FAIL"}\n`);
	return ok;
}

function usage(): never {
	stdout.write(
		"usage: bun scripts/checks.ts layering|errors|rbac|adr|docs|web-fetch|glyphs|gate\n",
	);
	exit(2);
}

const command = argv[2];
if (!command) usage();
if (command !== "gate" && !(command in CHECKS)) usage();
const ok =
	command === "gate" ? await gate() : await runOne(command as CheckName);
exit(ok ? 0 : 1);
