/**
 * Extracts the story-mode content from the source `MCA innate immunity story
 * mode.html` reference file into:
 *
 *   1) A JSON metadata file at:
 *        apps/game/server/data/storymode/innate-immunity-story.json
 *      The JSON contains NO svg markup. Each diagram entry carries an
 *      `id`, a `src` URL, and the original `viewBox`. The `src` value is
 *      the source of truth for diagram location — change it (e.g. to a
 *      cloud object-storage URL) without redeploying any code.
 *
 *   2) One standalone .svg file per diagram at:
 *        apps/game/public/storymode/<systemKey>/<id>.svg
 *      Each SVG is self-contained and visually identical to the original
 *      (no styling changes, no data loss). Files in `public/` are served
 *      from `/storymode/<systemKey>/<id>.svg` by Nuxt at runtime.
 *
 *   3) An index entry at:
 *        apps/game/server/data/storymode/index.json
 *      Listing every system available in story mode.
 *
 * Re-running this script overwrites the generated artifacts so the editor
 * can simply re-extract after authoring changes upstream.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");

const SOURCE_HTML = join(
	REPO_ROOT,
	"apps/game/pages/MCA innate immunity story mode.html",
);

const SYSTEM_KEY = "innate-immunity-story";
const SYSTEM_DISPLAY_NAME = "Innate Immunity";
const SYSTEM_TITLE = "High Yield NBME · Innate Immunity";

/**
 * Public URL prefix used in the JSON `src` field. Files saved under
 * `apps/game/public/storymode/...` are served from this URL prefix at
 * runtime. To swap in a CDN / object-storage URL later, the operator just
 * edits the JSON — no code or extraction-script changes needed.
 */
const PUBLIC_URL_PREFIX = `/storymode/${SYSTEM_KEY}`;

const SVG_OUT_DIR = join(
	REPO_ROOT,
	"apps/game/public/storymode",
	SYSTEM_KEY,
);
const DATA_OUT_DIR = join(REPO_ROOT, "apps/game/server/data/storymode");
const SYSTEM_JSON_PATH = join(DATA_OUT_DIR, `${SYSTEM_KEY}.json`);
const SYSTEMS_INDEX_PATH = join(DATA_OUT_DIR, "index.json");

const html = readFileSync(SOURCE_HTML, "utf8");

// =====================================================================
// 1) Extract every <symbol id="diagram-..."> block from the SVG library.
//    These are the "shared" diagrams referenced from CHAPTERS via { id }.
// =====================================================================

/** @returns {Map<string, {viewBox: string, inner: string}>} */
function extractTopLevelDiagramSymbols(html) {
	/** @type {Map<string, {viewBox: string, inner: string}>} */
	const map = new Map();

	// Match each top-level `<symbol id="diagram-...">` until its matching
	// closing tag. Symbols can nest, so we manually balance with a stack.
	const openRe = /<symbol\s+id="(diagram-[a-z0-9-]+)"\s+viewBox="([^"]+)">/g;
	let m;
	while ((m = openRe.exec(html))) {
		const id = m[1];
		const viewBox = m[2];
		const start = m.index + m[0].length;

		// Walk forward, balancing nested <symbol> tags.
		let depth = 1;
		let cursor = start;
		const tagRe = /<\/?symbol\b[^>]*>/g;
		tagRe.lastIndex = start;
		let tagMatch;
		while ((tagMatch = tagRe.exec(html))) {
			if (tagMatch[0].startsWith("</")) {
				depth--;
				if (depth === 0) {
					const end = tagMatch.index;
					const inner = html.slice(start, end);
					map.set(id, { viewBox, inner });
					cursor = tagRe.lastIndex;
					break;
				}
			} else {
				depth++;
			}
		}
		openRe.lastIndex = cursor;
	}

	return map;
}

const sharedDiagrams = extractTopLevelDiagramSymbols(html);

/**
 * Extract the chapter "hero" SVGs from the JS literal `SP_HERO_SVG = { 1: `<svg>…</svg>`, 2: …, … }`.
 * These are the small (60×60) chapter illustrations shown in the left
 * sidebar's "Your Journey" panel. They are emitted to public/ as their
 * own .svg files and the chapter JSON gets a `heroSrc` reference.
 *
 * @returns {Map<number, string>} chapter num -> full <svg>…</svg> markup
 */
function extractChapterHeroSvgs(html) {
	/** @type {Map<number, string>} */
	const map = new Map();
	const blockRe = /const\s+SP_HERO_SVG\s*=\s*\{([\s\S]*?)\n\s*\};/;
	const block = html.match(blockRe);
	if (!block) return map;
	const body = block[1];
	const entryRe = /(\d+)\s*:\s*`([\s\S]*?)`\s*,?/g;
	let m;
	while ((m = entryRe.exec(body))) {
		const num = parseInt(m[1], 10);
		const svg = m[2].trim();
		map.set(num, svg);
	}
	return map;
}

const chapterHeroSvgs = extractChapterHeroSvgs(html);

// =====================================================================
// 2) Evaluate the embedded `const CHAPTERS = [...]` literal so we can
//    walk the data tree and serialize a clean JSON document.
// =====================================================================

/** @returns {string} The JS expression text for the CHAPTERS array. */
function extractChaptersJsLiteral(html) {
	const startMarker = "const CHAPTERS = [";
	const startIdx = html.indexOf(startMarker);
	if (startIdx < 0)
		throw new Error("Could not locate CHAPTERS in source HTML");

	let i = startIdx + startMarker.length - 1; // position at the opening `[`
	let depth = 0;
	let inString = null;
	let prev = "";
	for (; i < html.length; i++) {
		const c = html[i];
		if (inString) {
			if (c === "\\") {
				i++;
				continue;
			}
			if (c === inString) inString = null;
			continue;
		}
		if (c === "'" || c === '"' || c === "`") {
			inString = c;
			continue;
		}
		if (c === "/" && prev === "/") {
			while (i < html.length && html[i] !== "\n") i++;
			continue;
		}
		if (prev === "/" && c === "*") {
			i++;
			while (i < html.length && !(html[i] === "*" && html[i + 1] === "/"))
				i++;
			i++;
			continue;
		}
		if (c === "[") depth++;
		else if (c === "]") {
			depth--;
			if (depth === 0) {
				return html.slice(startIdx + startMarker.length - 1, i + 1);
			}
		}
		prev = c;
	}
	throw new Error("Unterminated CHAPTERS array literal");
}

const chaptersLiteral = extractChaptersJsLiteral(html);

let CHAPTERS;
try {
	CHAPTERS = new Function(`return (${chaptersLiteral});`)();
} catch (err) {
	console.error("Failed to evaluate CHAPTERS literal:", err);
	throw err;
}

// =====================================================================
// 3) Walk CHAPTERS, normalize to JSON, and harvest per-step inline SVGs
//    into their own .svg files so the JSON contains zero markup.
// =====================================================================

/** Map of every diagram we need to write to disk. id -> { viewBox, inner }. */
const allDiagrams = new Map(sharedDiagrams);

/**
 * Build a unique, file-friendly id for a per-step inline diagram.
 *
 * @param {number} chapterNum
 * @param {number} stationIdx zero-based
 * @param {number} stepN one-based
 */
function stepDiagramId(chapterNum, stationIdx, stepN) {
	const ch = String(chapterNum).padStart(2, "0");
	const st = String(stationIdx + 1).padStart(2, "0");
	const sn = String(stepN).padStart(2, "0");
	return `step-c${ch}-s${st}-n${sn}`;
}

/**
 * Build a public URL for a diagram id. Operators editing the JSON later
 * can point this anywhere (e.g. a cloud bucket).
 */
function srcFor(id) {
	return `${PUBLIC_URL_PREFIX}/${id}.svg`;
}

/**
 * Normalize a diagram ref. Either points to a shared symbol (already in
 * `sharedDiagrams`) or to a per-step diagram we just registered.
 *
 * The `viewBox` is intentionally NOT carried into the JSON — the SVG
 * file itself declares its viewBox in the `<svg>` root, which is what
 * the browser uses when rendering via <img>. Duplicating it in JSON
 * just creates two sources of truth.
 *
 * @returns {{ id: string, src: string, caption?: string } | null}
 */
function normalizeDiagramRef(d) {
	if (!d || !d.id) return null;
	return {
		id: d.id,
		src: srcFor(d.id),
		...(d.caption ? { caption: d.caption } : {}),
	};
}

const normalized = {
	name: SYSTEM_KEY,
	displayName: SYSTEM_DISPLAY_NAME,
	title: SYSTEM_TITLE,
	chapters: [],
};

// Hand-curated chapter intros pulled from the source file body. Keeping
// them here lets the JSON drive the chapter map UI without re-parsing the
// HTML at runtime.
const CHAPTER_META = {
	1: {
		subtitle:
			"Follow one cell, one signal, one enzyme at a time — from the moment a pathogen is detected to the moment it's destroyed.",
		mapHint: "14 stations · bacterium → killed → sensed",
		color: "#9370b9",
	},
	2: {
		subtitle:
			"Every redness, every swelling, every throb has a molecular cause — and each one follows a specific rule.",
		mapHint: "7 stations · tissue-level inflammation",
		color: "#4fb8a8",
	},
	3: {
		subtitle:
			"The spleen, the neutrophil supply, the flora on your own skin — systemic defenses you never notice until they're gone.",
		mapHint: "9 stations · systemic defense",
		color: "#d14859",
	},
	4: {
		subtitle:
			"When the quick response fails, the body settles in — macrophages, T-cell help, granulomas, and the architecture of chronic containment.",
		mapHint: "7 stations · chronic inflammation",
		color: "#e8a951",
	},
};

/**
 * Build the public path for a chapter's hero SVG. Like diagram src, this
 * is what the JSON exposes — operators editing the JSON later can swap
 * any chapter hero to a CDN URL without touching code.
 */
function chapterHeroSrc(num) {
	return `${PUBLIC_URL_PREFIX}/chapter-hero-${num}.svg`;
}

for (const chapter of CHAPTERS) {
	const meta = CHAPTER_META[chapter.num] || {};
	const hasHero = chapterHeroSvgs.has(chapter.num);
	const chapterOut = {
		num: chapter.num,
		slug: `chapter-${chapter.num}`,
		title: chapter.title,
		subtitle: meta.subtitle || null,
		mapHint: meta.mapHint || null,
		color: meta.color || null,
		heroSrc: hasHero ? chapterHeroSrc(chapter.num) : null,
		stations: [],
	};

	chapter.stations.forEach((s, stationIdx) => {
		// Pre-compute the station's "main" diagram so we can reuse it as
		// the per-step diagram when a step doesn't define its own.
		// Reasoning: orientation-style stations (e.g. station 1 / chapter
		// 1) author every step as a different *spotlight* on the SAME
		// big-picture diagram, with no inline `stepDiagram.svg` per step.
		// The reference HTML achieved this with a runtime fallback; we
		// bake the same intent into the JSON so every step explicitly
		// references the SVG file it should display, instead of leaving
		// a confusing `"stepDiagram": null` next to a defined spotlight.
		const stationMainDiagramSrc = s.diagrams?.[0] || s.diagram || null;

		// Per-step inline SVGs become their own .svg file, with the JSON
		// referencing them by id + src. The original `hook` + `estimate`
		// fields are intentionally dropped — the intro screen they drove
		// was removed from StoryStepFlow.
		let stepFlow = null;
		if (s.stepFlow) {
			stepFlow = {
				flow: (s.stepFlow.flow || []).map((f) => {
					if (f.type !== "step") return { ...f };
					// `voice` is intentionally NOT carried into the JSON — the
					// frontend strips HTML from `text` (+ `subtext`) at runtime
					// and feeds that to the TTS engine, so storing a separate
					// narration string would be a second source of truth.
					const out = {
						type: "step",
						n: f.n,
						text: f.text,
						...(f.subtext ? { subtext: f.subtext } : {}),
						...(f.insight ? { insight: f.insight } : {}),
						...(f.spotlight ? { spotlight: f.spotlight } : {}),
						stepDiagram: null,
					};
					if (f.stepDiagram) {
						if (f.stepDiagram.svg) {
							const id = stepDiagramId(chapter.num, stationIdx, f.n);
							allDiagrams.set(id, {
								viewBox: f.stepDiagram.viewBox,
								inner: f.stepDiagram.svg,
							});
							out.stepDiagram = { id, src: srcFor(id) };
						} else if (f.stepDiagram.id) {
							out.stepDiagram = {
								id: f.stepDiagram.id,
								src: srcFor(f.stepDiagram.id),
							};
						}
					} else if (stationMainDiagramSrc?.id) {
						// Fallback: spotlight-only steps inherit the station's
						// main diagram. We emit a per-step COPY of that diagram
						// (rather than just pointing back at the shared file)
						// so every step has its own consistently-named .svg
						// file in `public/` — i.e. step-cXX-sYY-nNN.svg always
						// exists, regardless of whether the source authored
						// inline SVG or only a spotlight. Operators editing
						// the JSON later can swap individual step files
						// independently without affecting the shared symbol.
						const baseId = stationMainDiagramSrc.id;
						const base = sharedDiagrams.get(baseId);
						if (base) {
							const copyId = stepDiagramId(
								chapter.num,
								stationIdx,
								f.n,
							);
							allDiagrams.set(copyId, {
								viewBox: base.viewBox,
								inner: base.inner,
							});
							out.stepDiagram = {
								id: copyId,
								src: srcFor(copyId),
							};
						} else {
							// Source main diagram couldn't be found in the
							// symbol library — fall back to referencing it
							// directly so we don't drop the field entirely.
							out.stepDiagram = {
								id: baseId,
								src: srcFor(baseId),
							};
						}
					}
					return out;
				}),
			};
		}

		const stationOut = {
			idx: stationIdx,
			slug: `station-${String(stationIdx + 1).padStart(2, "0")}`,
			label: s.label,
			title: s.title,
			subtitle: s.subtitle || null,
			stage: s.stage || null,
			previously: s.previously || null,
			cardTitle: s.cardTitle || null,
			tagline: s.tagline || null,
			story: s.story || "",
			diagrams: (s.diagrams || (s.diagram ? [s.diagram] : []))
				.map(normalizeDiagramRef)
				.filter(Boolean),
			explanationDiagrams: (
				s.explanationDiagrams ||
				(s.explanationDiagram ? [s.explanationDiagram] : [])
			)
				.map(normalizeDiagramRef)
				.filter(Boolean),
			stepFlow,
			bridge: s.bridge || null,
			vignette: s.vignette || null,
			stem: s.stem,
			choices: s.choices,
			correct: s.correct,
			explanationTitle: s.explanationTitle || null,
			explanation: s.explanation || "",
			whatsNext: s.whatsNext || null,
			nextBtn: s.nextBtn || null,
			bank: s.bank || [],
		};

		chapterOut.stations.push(stationOut);
	});

	normalized.chapters.push(chapterOut);
}

// =====================================================================
// 4) Emit standalone .svg files. Each is self-contained: viewBox is
//    baked in, internal <symbol>/<defs>/<style> are preserved.
// =====================================================================

if (existsSync(SVG_OUT_DIR))
	rmSync(SVG_OUT_DIR, { recursive: true, force: true });
mkdirSync(SVG_OUT_DIR, { recursive: true });
mkdirSync(DATA_OUT_DIR, { recursive: true });

/**
 * Wrap a symbol's inner contents in a self-contained <svg> element so the
 * file renders identically to the original `<use href="#id"/>` reference.
 * The inner markup is preserved verbatim.
 *
 * Browsers tolerate duplicate attributes (taking the first); some parsers
 * reject them. The reference HTML has exactly one such case
 * (`opacity="..." ... opacity="..."` on diagram-friendly-fire). We strip
 * the second occurrence so the SVG file parses cleanly while preserving
 * the same visible result.
 */
function dedupeAttrs(svg) {
	return svg.replace(/<[a-zA-Z][^>]*?>/g, (tag) => {
		const seen = new Set();
		return tag.replace(/\s([a-z][a-zA-Z-]*)="[^"]*"/g, (match, name) => {
			if (seen.has(name)) return "";
			seen.add(name);
			return match;
		});
	});
}

function renderStandaloneSvg(viewBox, inner) {
	const cleanInner = dedupeAttrs(inner.replace(/\r\n/g, "\n"));
	return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Auto-generated from the reference HTML by
  scripts/storymode-extraction/extract.mjs.
  Do not edit by hand — regenerate the file instead.
-->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">${cleanInner}</svg>
`;
}

let totalSvgFiles = 0;
for (const [id, { viewBox, inner }] of allDiagrams) {
	writeFileSync(
		join(SVG_OUT_DIR, `${id}.svg`),
		renderStandaloneSvg(viewBox, inner),
		"utf8",
	);
	totalSvgFiles++;
}

// Chapter hero SVGs are already complete <svg>…</svg> documents in the
// source — write them out verbatim (just dedupe attributes).
for (const [num, svg] of chapterHeroSvgs) {
	const cleaned = dedupeAttrs(svg.replace(/\r\n/g, "\n"));
	const withDecl = `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  Auto-generated from the reference HTML by\n  scripts/storymode-extraction/extract.mjs.\n  Chapter ${num} hero icon.\n-->\n${cleaned}\n`;
	writeFileSync(join(SVG_OUT_DIR, `chapter-hero-${num}.svg`), withDecl, "utf8");
	totalSvgFiles++;
}

// =====================================================================
// 5) Emit the metadata JSON + the systems index JSON.
// =====================================================================

writeFileSync(SYSTEM_JSON_PATH, JSON.stringify(normalized, null, 2), "utf8");

const systemsIndex = [
	{
		name: SYSTEM_KEY,
		displayName: SYSTEM_DISPLAY_NAME,
		title: SYSTEM_TITLE,
		chapterCount: normalized.chapters.length,
		stationCount: normalized.chapters.reduce(
			(sum, c) => sum + c.stations.length,
			0,
		),
	},
];
writeFileSync(SYSTEMS_INDEX_PATH, JSON.stringify(systemsIndex, null, 2), "utf8");

// =====================================================================
// 6) Summary
// =====================================================================

const stationCount = normalized.chapters.reduce(
	(sum, c) => sum + c.stations.length,
	0,
);
console.log("Story-mode extraction complete.");
console.log(`  Chapters:    ${normalized.chapters.length}`);
console.log(`  Stations:    ${stationCount}`);
console.log(`  SVG files:   ${totalSvgFiles}`);
console.log(`  System JSON: ${SYSTEM_JSON_PATH}`);
console.log(`  Index JSON:  ${SYSTEMS_INDEX_PATH}`);
console.log(`  SVG dir:     ${SVG_OUT_DIR}`);
