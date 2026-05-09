/**
 * Extracts story-mode content from one or more reference HTML files
 * (each one a self-contained "system" — innate immunity, adaptive
 * immunity, etc) into:
 *
 *   1) Per-system JSON metadata at:
 *        apps/game/server/data/storymode/<system-key>.json
 *      Each JSON contains NO svg markup. Each diagram entry carries an
 *      `id` and a `src` URL. The `src` is the source of truth for
 *      diagram location — change it (e.g. to a cloud object-storage
 *      URL) without redeploying any code.
 *
 *   2) Per-system standalone .svg files at:
 *        apps/game/public/storymode/<system-key>/...
 *      Organised in three subfolders for clarity:
 *        - chapter-hero/ch-NN-hero.svg
 *        - steps/step-cNN-sNN-nNN.svg
 *        - explanation-diagram/diagram-chNN-sNN.svg
 *
 *   3) A systems index at:
 *        apps/game/server/data/storymode/index.json
 *      Listing every system that this script has emitted.
 *
 * Adding a new system: append a config object to the `SYSTEMS` array
 * at the bottom of this file. Re-running the script overwrites every
 * generated artefact for every system, so new systems and edits to
 * existing ones can both flow through the same single command.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const DATA_OUT_DIR = join(REPO_ROOT, "apps/game/server/data/storymode");
const SYSTEMS_INDEX_PATH = join(DATA_OUT_DIR, "index.json");

// ============================================================
// Pure helpers — these have no system-specific state and are
// defined once at module scope.
// ============================================================

function pad2(n) {
	return String(n).padStart(2, "0");
}

/**
 * Extract every top-level `<symbol id="diagram-...">` block from the
 * SVG library at the top of a story HTML. Symbols can nest, so we
 * balance with a manual stack.
 *
 * @returns {Map<string, {viewBox: string, inner: string}>}
 */
function extractTopLevelDiagramSymbols(html) {
	const map = new Map();
	const openRe = /<symbol\s+id="(diagram-[a-z0-9-]+)"\s+viewBox="([^"]+)">/g;
	let m;
	while ((m = openRe.exec(html))) {
		const id = m[1];
		const viewBox = m[2];
		const start = m.index + m[0].length;
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
					map.set(id, { viewBox, inner: html.slice(start, end) });
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

/**
 * Extract the chapter "hero" SVGs from `const SP_HERO_SVG = { … }`.
 * Each value is a complete `<svg>…</svg>` document.
 *
 * @returns {Map<number, string>} chapter num -> svg markup
 */
function extractChapterHeroSvgs(html) {
	const map = new Map();
	const block = html.match(/const\s+SP_HERO_SVG\s*=\s*\{([\s\S]*?)\n\s*\};/);
	if (!block) return map;
	const entryRe = /(\d+)\s*:\s*`([\s\S]*?)`\s*,?/g;
	let m;
	while ((m = entryRe.exec(block[1]))) {
		map.set(parseInt(m[1], 10), m[2].trim());
	}
	return map;
}

/**
 * Pull the `const CHAPTERS = [...]` array literal out of the HTML
 * source as raw JS text we can pass to `new Function(...)`.
 *
 * The walker honours strings (single, double, backtick) and line +
 * block comments so embedded `]` characters inside SVG strings or
 * inline comments don't terminate the array prematurely.
 */
function extractChaptersJsLiteral(html) {
	const startMarker = "const CHAPTERS = [";
	const startIdx = html.indexOf(startMarker);
	if (startIdx < 0) {
		throw new Error("Could not locate CHAPTERS in source HTML");
	}
	let i = startIdx + startMarker.length - 1;
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
			while (i < html.length && !(html[i] === "*" && html[i + 1] === "/")) i++;
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

/**
 * Convert a station's raw explanation HTML into an array of "key
 * points" suitable for the bullet slideshow.
 *
 * Strategy mirrors the reference HTML's `setupBulletSlideshow`:
 *   1. If the explanation contains `<ul class="pathway-list">`,
 *      return its top-level `<li>` items.
 *   2. Otherwise split top-level `<p>` blocks.
 * Returns [] if nothing usable is found. The post-processing
 * `add-keypoints.mjs` script can override these with hand-curated
 * summaries; this seed just keeps the field non-empty so the column
 * isn't blank if a system ships before keypoints are curated.
 */
function extractKeypoints(html) {
	if (!html || typeof html !== "string") return [];
	const listMatch = html.match(
		/<ul[^>]*class="[^"]*pathway-list[^"]*"[^>]*>([\s\S]*?)<\/ul>/,
	);
	if (listMatch) {
		const inner = listMatch[1];
		const itemRe = /<li[^>]*>([\s\S]*?)<\/li>/g;
		const out = [];
		let m;
		while ((m = itemRe.exec(inner))) {
			const text = m[1].trim();
			if (text) out.push(text);
		}
		if (out.length) return out;
	}
	const paraRe = /<p[^>]*>([\s\S]*?)<\/p>/g;
	const paras = [];
	let pm;
	while ((pm = paraRe.exec(html))) {
		const text = pm[1].trim();
		if (text) paras.push(text);
	}
	return paras;
}

/**
 * Browsers tolerate duplicate XML attributes (taking the first); some
 * parsers reject them. We strip second-occurrence attrs so the SVG
 * file parses cleanly while preserving the visible result.
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

/**
 * Wrap a symbol's inner contents in a self-contained <svg> element so
 * the file renders identically to the original `<use href="#id"/>`
 * reference.
 */
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

// ============================================================
// processSystem — one full extraction pass for a single system.
// All outputs (SVG files, JSON file) are written under that
// system's prefix; the function returns a summary entry suitable
// for the systems index.
// ============================================================

function processSystem({ key, displayName, title, sourceHtml, chapterMeta }) {
	const PUBLIC_URL_PREFIX = `/storymode/${key}`;
	const SVG_OUT_DIR = join(REPO_ROOT, "apps/game/public/storymode", key);
	const SYSTEM_JSON_PATH = join(DATA_OUT_DIR, `${key}.json`);

	const html = readFileSync(join(REPO_ROOT, sourceHtml), "utf8");

	// SVG library + chapter heroes + the CHAPTERS literal.
	const sharedDiagrams = extractTopLevelDiagramSymbols(html);
	const chapterHeroSvgs = extractChapterHeroSvgs(html);
	const chaptersLiteral = extractChaptersJsLiteral(html);
	let CHAPTERS;
	try {
		CHAPTERS = new Function(`return (${chaptersLiteral});`)();
	} catch (err) {
		console.error(`[${key}] Failed to evaluate CHAPTERS literal:`, err);
		throw err;
	}

	// Master map of every diagram we'll emit. We seed it with the shared
	// symbol library; per-step copies + per-station explanation copies
	// are added during the metadata pass below.
	const allDiagrams = new Map(sharedDiagrams);

	// ----- system-prefix-aware path helpers -----
	function chapterHeroSrc(num) {
		return `${PUBLIC_URL_PREFIX}/chapter-hero/ch-${pad2(num)}-hero.svg`;
	}
	function chapterHeroFileName(num) {
		return `ch-${pad2(num)}-hero.svg`;
	}
	function stepSrc(stepId) {
		return `${PUBLIC_URL_PREFIX}/steps/${stepId}.svg`;
	}
	function stepDiagramId(chapterNum, stationIdx, stepN) {
		return `step-c${pad2(chapterNum)}-s${pad2(stationIdx + 1)}-n${pad2(stepN)}`;
	}
	function explanationDiagramId(chapterNum, stationIdx) {
		return `diagram-ch${pad2(chapterNum)}-s${pad2(stationIdx + 1)}`;
	}
	function explanationDiagramSrc(chapterNum, stationIdx) {
		return `${PUBLIC_URL_PREFIX}/explanation-diagram/${explanationDiagramId(chapterNum, stationIdx)}.svg`;
	}
	/**
	 * Generic src lookup used during the metadata-build pass. Step
	 * diagrams resolve via `stepSrc`; everything else is treated as a
	 * shared/legacy symbol that lives at the system root (used only as
	 * a temporary value — section 3.5 below rewrites every diagram URL
	 * into a step or explanation URL before the JSON is written).
	 */
	function srcFor(id) {
		if (typeof id === "string" && id.startsWith("step-")) return stepSrc(id);
		return `${PUBLIC_URL_PREFIX}/${id}.svg`;
	}
	function normalizeDiagramRef(d) {
		if (!d || !d.id) return null;
		return {
			id: d.id,
			src: srcFor(d.id),
			...(d.caption ? { caption: d.caption } : {}),
		};
	}

	// =================================================================
	// Build normalised JSON for this system.
	// =================================================================
	const normalized = {
		name: key,
		displayName,
		title,
		chapters: [],
	};

	for (const chapter of CHAPTERS) {
		const meta = (chapterMeta && chapterMeta[chapter.num]) || {};
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
			// Pre-compute the station's "main" diagram so we can reuse it
			// as a per-step diagram when a step doesn't define its own.
			const stationMainDiagramSrc = s.diagrams?.[0] || s.diagram || null;

			let stepFlow = null;
			if (s.stepFlow) {
				stepFlow = {
					flow: (s.stepFlow.flow || []).map((f) => {
						if (f.type !== "step") return { ...f };
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
							// Spotlight-only steps inherit the station's main
							// diagram. Emit a per-step COPY so every step has
							// its own .svg file in `public/`.
							const baseId = stationMainDiagramSrc.id;
							const base = sharedDiagrams.get(baseId);
							if (base) {
								const copyId = stepDiagramId(chapter.num, stationIdx, f.n);
								allDiagrams.set(copyId, {
									viewBox: base.viewBox,
									inner: base.inner,
								});
								out.stepDiagram = { id: copyId, src: srcFor(copyId) };
							} else {
								out.stepDiagram = { id: baseId, src: srcFor(baseId) };
							}
						}
						return out;
					}),
				};
			}

			// First step-flow diagram, used as the LAST-resort source for
			// the explanation diagram. Some stations (especially in the
			// adaptive immunity dataset) have NO `s.diagram` /
			// `s.diagrams` at all — every diagram lives inside the
			// step-flow as inline SVG. In that case we fall back to the
			// first step's diagram so the explanation column still has
			// something to show. (The 3.5 pass below then makes a
			// dedicated per-station copy under `explanation-diagram/`.)
			const firstStepDiagram = stepFlow
				? stepFlow.flow.find(
						(f) => f.type === "step" && f.stepDiagram && f.stepDiagram.id,
					)?.stepDiagram
				: null;

			const stationOut = {
				idx: stationIdx,
				slug: `station-${pad2(stationIdx + 1)}`,
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
				/**
				 * Diagram source priority — every station ends up with at
				 * least one diagram so the explanation column always
				 * paints. Order:
				 *   1. `explanationDiagrams` (authored array)
				 *   2. `explanationDiagram` (authored single)
				 *   3. `diagrams[0]` / `diagram` (station main diagram)
				 *   4. First step-flow diagram (covers step-only stations)
				 */
				explanationDiagrams: (
					s.explanationDiagrams && s.explanationDiagrams.length
						? s.explanationDiagrams
						: s.explanationDiagram
							? [s.explanationDiagram]
							: s.diagrams && s.diagrams.length
								? [s.diagrams[0]]
								: s.diagram
									? [s.diagram]
									: firstStepDiagram
										? [{ id: firstStepDiagram.id }]
										: []
				)
					.map(normalizeDiagramRef)
					.filter(Boolean),
				stepFlow,
				bridge: s.bridge || null,
				vignette: s.vignette || null,
				stem: s.stem,
				choices: s.choices,
				correct: s.correct,
				keypoints: extractKeypoints(s.explanation || ""),
				whatsNext: s.whatsNext || null,
				nextBtn: s.nextBtn || null,
				bank: s.bank || [],
			};

			chapterOut.stations.push(stationOut);
		});

		normalized.chapters.push(chapterOut);
	}

	// =================================================================
	// 3.5) Per-station explanation diagram copies — keyed by chapter
	//      number + station-within-chapter (e.g. `diagram-ch01-s07`).
	// =================================================================
	const explanationDiagramFiles = new Map();
	for (const chapter of normalized.chapters) {
		for (const station of chapter.stations) {
			if (!Array.isArray(station.explanationDiagrams) || !station.explanationDiagrams.length) continue;
			const original = station.explanationDiagrams[0];
			const sourceContent =
				allDiagrams.get(original.id) || sharedDiagrams.get(original.id);
			if (!sourceContent) continue;
			const copyId = explanationDiagramId(chapter.num, station.idx);
			explanationDiagramFiles.set(copyId, sourceContent);
			station.explanationDiagrams = [
				{
					id: copyId,
					src: explanationDiagramSrc(chapter.num, station.idx),
					...(original.caption ? { caption: original.caption } : {}),
				},
			];
		}
	}

	// =================================================================
	// 4) Emit standalone .svg files into the three subfolders.
	// =================================================================
	if (existsSync(SVG_OUT_DIR)) rmSync(SVG_OUT_DIR, { recursive: true, force: true });
	mkdirSync(SVG_OUT_DIR, { recursive: true });
	mkdirSync(join(SVG_OUT_DIR, "chapter-hero"), { recursive: true });
	mkdirSync(join(SVG_OUT_DIR, "steps"), { recursive: true });
	mkdirSync(join(SVG_OUT_DIR, "explanation-diagram"), { recursive: true });
	mkdirSync(DATA_OUT_DIR, { recursive: true });

	let totalSvgFiles = 0;

	// Step diagrams — every diagram with a `step-` id is a per-step
	// copy. Other shared symbols are no longer emitted at the system
	// root; they're consumed only as content sources for step copies
	// and explanation copies.
	for (const [id, { viewBox, inner }] of allDiagrams) {
		if (!id.startsWith("step-")) continue;
		writeFileSync(
			join(SVG_OUT_DIR, "steps", `${id}.svg`),
			renderStandaloneSvg(viewBox, inner),
			"utf8",
		);
		totalSvgFiles++;
	}

	// Per-station explanation-diagram copies.
	for (const [id, { viewBox, inner }] of explanationDiagramFiles) {
		writeFileSync(
			join(SVG_OUT_DIR, "explanation-diagram", `${id}.svg`),
			renderStandaloneSvg(viewBox, inner),
			"utf8",
		);
		totalSvgFiles++;
	}

	// Chapter heroes — already complete <svg>…</svg> documents.
	// `SP_HERO_SVG` in some sources covers more chapter numbers than the
	// system actually defines (e.g. the adaptive HTML carries hero icons
	// for chapters 1-16, but only chapters 5-16 are actual chapters in
	// its CHAPTERS array). Restrict emission to the chapters this system
	// actually owns so the public folder doesn't carry orphan icons.
	const ownedChapterNums = new Set(CHAPTERS.map((c) => c.num));
	for (const [num, svg] of chapterHeroSvgs) {
		if (!ownedChapterNums.has(num)) continue;
		const cleaned = dedupeAttrs(svg.replace(/\r\n/g, "\n"));
		const withDecl = `<?xml version="1.0" encoding="UTF-8"?>\n<!--\n  Auto-generated from the reference HTML by\n  scripts/storymode-extraction/extract.mjs.\n  Chapter ${num} hero icon.\n-->\n${cleaned}\n`;
		writeFileSync(
			join(SVG_OUT_DIR, "chapter-hero", chapterHeroFileName(num)),
			withDecl,
			"utf8",
		);
		totalSvgFiles++;
	}

	// =================================================================
	// 5) Emit the system's metadata JSON.
	// =================================================================
	writeFileSync(SYSTEM_JSON_PATH, JSON.stringify(normalized, null, 2), "utf8");

	const stationCount = normalized.chapters.reduce(
		(sum, c) => sum + c.stations.length,
		0,
	);

	console.log(`[${key}] extraction complete.`);
	console.log(`  Chapters:   ${normalized.chapters.length}`);
	console.log(`  Stations:   ${stationCount}`);
	console.log(`  SVG files:  ${totalSvgFiles}`);
	console.log(`  JSON:       ${SYSTEM_JSON_PATH}`);
	console.log(`  SVG dir:    ${SVG_OUT_DIR}`);

	return {
		name: key,
		displayName,
		title,
		chapterCount: normalized.chapters.length,
		stationCount,
	};
}

// ============================================================
// Hand-curated chapter meta. Kept here (not in the source HTML)
// because subtitles / map hints / colors are editorial choices
// rather than structural data — they belong with the extractor.
// ============================================================

const INNATE_CHAPTER_META = {
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

const ADAPTIVE_CHAPTER_META = {
	5: {
		subtitle:
			"A protein cascade that opsonises, lyses, and recruits — bridging innate sensors to adaptive memory.",
		mapHint: "complement system",
		color: "#4fb8a8",
	},
	6: {
		subtitle:
			"How cells advertise self vs. not-self on MHC platters so T cells know what to attack.",
		mapHint: "antigen presentation & MHC",
		color: "#9370b9",
	},
	7: {
		subtitle:
			"Thymic education, activation, and the effector and helper differentiations T cells make in the periphery.",
		mapHint: "T-cell biology",
		color: "#e8a951",
	},
	8: {
		subtitle:
			"From naïve B cell to plasma cell — class-switching, affinity maturation, and the antibodies they produce.",
		mapHint: "B-cell biology & antibodies",
		color: "#d14859",
	},
	9: {
		subtitle:
			"How memory is built, why it lasts, and how each vaccine type exploits a different arm of immunity.",
		mapHint: "vaccines & immune memory",
		color: "#6cc27d",
	},
	10: {
		subtitle:
			"When a single gene defect breaks adaptive immunity — the inherited patterns boards love to test.",
		mapHint: "primary immunodeficiencies",
		color: "#5b9bd5",
	},
	11: {
		subtitle:
			"Type I through IV — when the same machinery that protects starts attacking the wrong target.",
		mapHint: "hypersensitivity reactions",
		color: "#c08537",
	},
	12: {
		subtitle:
			"When self-tolerance breaks down — the autoantibodies, the affected organs, the diagnostic patterns.",
		mapHint: "autoimmune disease",
		color: "#ffc674",
	},
	13: {
		subtitle:
			"Hyperacute, acute, chronic — the three rejection timelines and the immunology behind each one.",
		mapHint: "transplant immunology",
		color: "#b87b24",
	},
	14: {
		subtitle:
			"A virus that disassembles the immune system — receptor binding, CD4 collapse, opportunistic infections.",
		mapHint: "HIV",
		color: "#d14859",
	},
	15: {
		subtitle:
			"How specific pathogens get past, hide from, or hijack the system you've just learned.",
		mapHint: "infection immunology",
		color: "#4fb8a8",
	},
	16: {
		subtitle:
			"Pharmacology, lab values, and adjacent topics that round out the immunology picture.",
		mapHint: "supporting concepts",
		color: "#9370b9",
	},
};

// ============================================================
// Systems list. Add a new entry here to extract another story.
// ============================================================

const SYSTEMS = [
	{
		key: "innate-immunity-story",
		displayName: "Innate Immunity",
		title: "High Yield NBME · Innate Immunity",
		sourceHtml: "apps/game/MCA innate immunity story mode.html",
		chapterMeta: INNATE_CHAPTER_META,
	},
	{
		key: "adaptive-immunity-story",
		displayName: "Adaptive Immunity",
		title: "High Yield NBME · Adaptive Immunity",
		sourceHtml: "apps/game/MCA adaptive immunity story.html",
		chapterMeta: ADAPTIVE_CHAPTER_META,
	},
];

// ============================================================
// Run.
// ============================================================

mkdirSync(DATA_OUT_DIR, { recursive: true });

const systemsIndex = [];
for (const system of SYSTEMS) {
	systemsIndex.push(processSystem(system));
}

writeFileSync(SYSTEMS_INDEX_PATH, JSON.stringify(systemsIndex, null, 2), "utf8");

console.log("");
console.log("All systems extracted.");
console.log(`  Index: ${SYSTEMS_INDEX_PATH}`);
