/**
 * Adds a `keypoints: string[]` field to every station in
 * `apps/game/server/data/storymode/innate-immunity-story.json`.
 *
 * Replaces the long `explanation` HTML with a small list of summary
 * "key points" — short, punchy lines that the bullet-slideshow UI
 * (`StoryKeypoints.vue`) can step through one at a time, mirroring the
 * `setupBulletSlideshow` UX from the reference HTML.
 *
 * The keypoints are hand-crafted (not auto-extracted) so each station
 * gets a tight summary of its existing explanation rather than a copy
 * of the prose. To refine a station, edit its entry in the KEYPOINTS
 * map below and re-run this script.
 *
 * The original `explanation` field is left untouched so no data is lost
 * — the front-end simply reads from `keypoints` for the slideshow and
 * ignores the long prose.
 *
 * Run with:
 *   node scripts/storymode-extraction/add-keypoints.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const JSON_PATH = join(
	REPO_ROOT,
	"apps/game/server/data/storymode/innate-immunity-story.json",
);

/**
 * Keypoints keyed by `${chapterNum}.${stationIdx}`. Station idx is the
 * 0-based index inside `chapter.stations` (matches the JSON's `idx`
 * field). Each value is an array of HTML-bearing strings — inline tags
 * like <strong>, <em>, <span class="highlight"> are preserved verbatim
 * by the slideshow component.
 */
const KEYPOINTS = {
	"1.0": [
		"Detection is the trigger: a tissue macrophage's <strong>PRR</strong> (e.g. TLR4) binds a <strong>PAMP</strong>. Nothing downstream happens until that binding occurs.",
		"Selectin upregulation, neutrophil firm adhesion, chemotaxis in tissue, and the respiratory burst are all real innate events — but each is <em>downstream</em> of detection.",
		"Innate immunity is a <em>sequence</em>, not a soup. Every station ahead is a zoom-in on one segment of this chain — and every disease you'll meet is a broken link in it.",
	],
	"1.1": [
		"<strong>TLR3</strong> lives in the endosome and recognizes <strong>double-stranded RNA</strong> — a viral replication intermediate.",
		"TLR3 deficiency → recurrent <strong>HSV encephalitis</strong> in otherwise healthy children. TLR3 is the key CNS sensor for HSV.",
		"Distractors by ligand: TLR4 = LPS · TLR5 = flagellin · NOD2 = intracellular peptidoglycan (Crohn's) · Dectin-1 = fungal β-glucans.",
		"Clue chain: <em>endosome + dsRNA + HSV</em> = TLR3.",
	],
	"1.2": [
		"<strong>LPS is the archetypal TLR4 ligand.</strong> Only the TLR family is built to recognize microbial patterns like LPS.",
		"Cytokine receptors bind the <em>output</em> of this system (IL-1, TNF), not the input.",
		"G-protein receptors handle chemokines/histamine · ion channels are for neurotransmitters · nuclear receptors bind steroid-like molecules that enter the cell.",
	],
	"1.3": [
		"<strong>NF-κB</strong> is the master inflammatory transcription factor downstream of TLR4.",
		"Distractors are real proteins with the wrong jobs: c-ras = growth signaling · p53 = DNA-damage guardian · Rb = cell-cycle regulator.",
		"<strong>VP-16 (etoposide)</strong> isn't a transcription factor at all — it's a chemo drug that inhibits topoisomerase II.",
		"Only NF-κB has the specific job of driving inflammatory gene transcription downstream of TLR4.",
	],
	"1.4": [
		"The chain: IL-1 → IKK activated → IKK <strong>phosphorylates IκB</strong> → IκB ubiquitinated and degraded → NF-κB released → NF-κB enters the nucleus → IL-6 transcription.",
		"IκB doesn't attach to the cytokine receptor — that's the receptor's own job.",
		"NF-κB is activated by <em>release</em>, not cleavage — and IκB is the one that <em>gets</em> phosphorylated (by IKK), not the phosphorylator.",
		"IκB is destroyed; NF-κB is the one that travels to the nucleus.",
	],
	"1.5": [
		"\"Loose, reversible adhesion\" = <strong>rolling</strong> = <strong>selectins</strong> (E-selectin and P-selectin on activated endothelium).",
		"<strong>Integrins</strong> on leukocytes mediate <em>firm</em> adhesion, not rolling. <strong>ICAM-1</strong> is the endothelial ligand for integrins — also firm adhesion.",
		"Prostacyclin = vasodilator + antiplatelet. Thrombomodulin = anticoagulant endothelial receptor.",
	],
	"1.6": [
		"<strong>ICAM-1 is the \"stop and stick\" molecule</strong> — the firm-adhesion step right after rolling.",
		"Activation is upstream — chemokines flipping integrins to their high-affinity state.",
		"Chemotaxis happens later, once the neutrophil is out of the vessel and following a chemical trail.",
		"Demargination = cells re-entering circulation (opposite). Transmigration = squeezing between endothelial cells, mediated by <strong>PECAM-1</strong>.",
	],
	"1.7": [
		"Classic <strong>LAD</strong> triad: <em>delayed cord separation + infections without pus + peripheral neutrophilia</em>.",
		"β2-integrin (<strong>CD18</strong>) defect → integrins can't bind ICAM-1 → no firm adhesion → no extravasation → no pus.",
		"C3 deficiency → recurrent pyogenic infections <em>with</em> pus formation preserved.",
		"Distinguishers: NADPH oxidase = CGD (granulomas, not extravasation failure) · CD40L = hyper-IgM · lysosomal trafficking = Chédiak-Higashi.",
	],
	"1.8": [
		"All five answers move something into a cell — but only <strong>phagocytosis</strong> requires the dramatic membrane extension that depends on <em>actin</em>.",
		"Mannose-receptor binding is molecular recognition; no cytoskeleton needed.",
		"Clathrin-coated pits and receptor-mediated endocytosis use <strong>clathrin</strong>, not actin, for small vesicles.",
		"Pinocytosis (\"cell drinking\") doesn't need the big-pseudopod machinery.",
	],
	"1.9": [
		"<strong>Chédiak-Higashi syndrome.</strong> The combination is essentially diagnostic: <em>silvery hair + giant granules on smear + recurrent infections + neuropathy</em>.",
		"Defect = <strong>defective lysosomal trafficking</strong> (LYST mutation) → giant lysosomes can't fuse with phagosomes → killing fails.",
		"Adjacent defects to keep separate: NADPH oxidase = CGD · CD18 = LAD · MPO = Candida susceptibility · IFN-γR = mycobacterial susceptibility.",
	],
	"1.10": [
		"The word that matters is <em>initiating</em>. <strong>NADPH oxidase is the very first enzyme</strong> in the respiratory burst.",
		"<strong>Catalase</strong> breaks down H₂O₂ into water — protective, not microbicidal.",
		"<strong>SOD</strong> acts second in the burst. Cyclooxygenase makes prostaglandins. Lysosomal hydrolases digest the microbe's remains <em>after</em> killing.",
	],
	"1.11": [
		"Abnormal DHR confirms <strong>CGD</strong> (NADPH oxidase deficiency).",
		"<strong>Catalase-positive organisms</strong> are dangerous because they produce H₂O₂ <em>and</em> destroy it — eliminating the neutrophil's H₂O₂ backup.",
		"Other susceptibility patterns: encapsulated → splenic dysfunction · mycobacteria → IFN-γR defect · enveloped viruses → T-cell territory.",
	],
	"1.12": [
		"<strong>MPO</strong> uses H₂O₂ + Cl⁻ to make <strong>HOCl</strong> (the \"bleach\" step). Without MPO the cell still makes superoxide, H₂O₂, and hydroxyl radical — but can't convert them into the final hypohalous-acid product.",
		"Distinguishes from CGD: in MPO deficiency the upstream burst is intact (<strong>NBT/DHR normal</strong>); in CGD it's broken.",
		"Defective degranulation = Chédiak-Higashi · inability to make H₂O₂ = CGD-like.",
	],
	"1.13": [
		"<strong>Alpha toxin</strong> (lecithinase / phospholipase C) breaks down membrane phospholipids — destroying muscle tissue <em>and</em> lysing neutrophils before they can phagocytose.",
		"<em>C. perfringens</em> is an extracellular pathogen that kills fast — it doesn't rely on a prominent capsule, doesn't disrupt actin, and doesn't survive inside neutrophils or macrophages.",
	],
	"2.0": [
		"<strong>Histamine and bradykinin</strong> → endothelial cells contract → <strong>gaps form between them</strong> → plasma leaks through those gaps → protein-rich exudate.",
		"Demargination = WBCs re-entering circulation (not fluid escape). Fibrin thrombi = intravascular clots.",
		"Vasoconstriction would <em>reduce</em> blood flow. Vasodilation gives redness and warmth — but not fluid escape on its own.",
	],
	"2.1": [
		"Pain + swelling + redness at <em>postcapillary venules</em> within minutes = <strong>bradykinin</strong>.",
		"C3b opsonizes microbes — doesn't produce pain. IL-1 is systemic (fever, acute phase response).",
		"Phospholipase C is intracellular signaling. Thromboxane A₂ vasoconstricts — opposite of what's happening.",
	],
	"2.2": [
		"Peak A is strongly <strong>histamine-dependent</strong> via H1 receptors on venular endothelium. Block H1 and the immediate peak drops dramatically.",
		"Peak B is driven by other mediators — newly synthesized <strong>leukotrienes and prostaglandins</strong> + infiltrating inflammatory cells. H1 blockade doesn't meaningfully affect it.",
	],
	"2.3": [
		"The rate-limiting step for neutrophil extravasation = <strong>coordinated adhesion-molecule expression</strong> (selectins, ICAM-1, integrins flipped to high affinity).",
		"Phagocytic ability matters once the cell is already in tissue. Lysosomal enzymes kill <em>after</em> engulfment.",
		"<strong>IL-1</strong> is upstream — it <em>triggers</em> adhesion-molecule expression. <strong>Fc receptors</strong> bind opsonized microbes (later step still).",
	],
	"2.4": [
		"The infected foot drains lymph toward the <strong>ipsilateral inguinal nodes</strong>. Inflammation + bacterial/antigen delivery enlarges them.",
		"Angiogenesis is tissue repair, not lymphadenopathy. Protein-deficient edema would be generalized.",
		"Right-leg venous obstruction is the wrong side. Neutrophil recirculation doesn't form a node mass.",
	],
	"2.5": [
		"<strong>Neutrophil ROS</strong> are highly reactive and don't distinguish bacterial from host molecules — they leak from dying or activated neutrophils and injure nearby host tissue.",
		"Complement contributes to inflammation but isn't the primary direct cause of oxidative bystander injury.",
		"Defensins focus on microbes · IL-1 drives systemic inflammation · prostaglandins handle pain and fever · TGF-β is regulatory/fibrotic.",
	],
	"2.6": [
		"By <strong>day 5</strong>, the acute neutrophil-driven phase is over and <strong>macrophages dominate</strong> — clearing debris, recruiting fibroblasts, and promoting tissue repair.",
		"Cell-line cheat sheet: eosinophils = parasites/allergy · lymphocytes = chronic inflammation · neutrophils = days 1–2 · plasma cells = antibody production.",
	],
	"3.0": [
		"The <strong>anterior nares</strong> are the primary reservoir for <em>S. aureus</em> in humans — about <strong>30% of healthy adults</strong> are persistent carriers.",
		"In the perioperative setting, bacteria from the nasal reservoir can seed hardware and cause prosthetic joint infection even when the surgical site itself looks clean.",
		"Other sites: GI = E. coli/enterococci · oropharynx = S. pneumoniae/viridans · perineum/UT = gram-negatives or enterococci.",
	],
	"3.1": [
		"The spleen is the primary clearance site for <strong>encapsulated organisms</strong>: <em>S. pneumoniae</em>, <em>H. influenzae</em> type b, and <em>N. meningitidis</em>.",
		"All three vaccinations are <strong>mandatory post-splenectomy</strong>.",
		"Acid-fast cell walls = mycobacteria (cell-mediated). Flagella don't confer phagocytic resistance. IgA protease is a virulence factor but isn't the splenic-clearance issue. LPS = gram-negatives, handled by neutrophils.",
	],
	"3.2": [
		"<em>Neisseria</em> species (<em>meningitidis</em> + <em>gonorrhoeae</em>) are uniquely dependent on the <strong>membrane attack complex</strong> for clearance.",
		"Deficiency in any of <strong>C5–C9</strong> blocks MAC assembly → <em>recurrent neisserial infections</em> (the classic board pattern).",
		"Other complement defects: C1-INH = HAE (swelling, not infection) · C3 = pyogenic infections + immune-complex disease · DAF = PNH · MBL = diffuse infections in infancy.",
		"Narrow Neisseria pattern + low CH50 = MAC deficiency. Every time.",
	],
	"3.3": [
		"Severe and recurrent <strong>herpesvirus infections</strong> (HSV, VZV, CMV) with otherwise normal immunity → <strong>NK cell deficiency</strong>.",
		"NK cells are the primary innate defense against herpesviruses — they kill infected cells via missing-self and ADCC.",
		"Flow cytometry: <strong>absent CD16+/CD56+ lymphocytes</strong> directly identifies NK cells.",
		"B-cell def = encapsulated bacteria + low Ig. CD4 def = opportunistic (PCP, fungi, atypical mycobacteria). Neutrophil def = pyogenic. pDCs aren't CD16+/CD56+.",
	],
	"3.4": [
		"<strong>Howell-Jolly bodies</strong> = functional asplenia — here from chronic autoinfarction in <em>sickle cell disease</em>.",
		"Greatest risk = <strong>encapsulated organisms</strong>; <em>S. pneumoniae</em> leads as the top cause of life-threatening infection in this group.",
		"CMV and Pneumocystis are T-cell-deficiency concerns. TB needs cell-mediated immunity. Pseudomonas is a neutropenia concern.",
	],
	"3.5": [
		"OPSI is driven by loss of <strong>two synergistic splenic functions</strong>: (1) mechanical filtering of opsonized bacteria from blood, and (2) the IgM memory B-cell response that produces early protective antibody against encapsulated organisms.",
		"Without both, pneumococcus entering the bloodstream multiplies unchecked — hence the <strong>12-hour sepsis timeline</strong>.",
		"Splenectomy normally causes thrombo<em>cytosis</em>, not -penia. Hypogammaglobulinemia, T-cell defects, and complement issues aren't post-splenectomy effects.",
	],
	"3.6": [
		"Lifelong asplenia = lifelong risk of <strong>OPSI with encapsulated organisms</strong>, especially <em>S. pneumoniae</em>.",
		"<strong>Children under 5</strong> are highest-risk because of immature humoral immunity → vaccination + prophylactic antibiotics are essential.",
		"Lymphopenia, CMV, lymphoma, and thrombocytopenia aren't asplenia-specific concerns. (Splenectomy actually causes <em>thrombocytosis</em>.)",
	],
	"3.7": [
		"Profound neutropenia creates specific vulnerability to <strong>gram-negative rods</strong>, with <em>Pseudomonas aeruginosa</em> as the classic and most feared pathogen in febrile neutropenia.",
		"Empiric <strong>anti-pseudomonal therapy</strong> (cefepime, pip-tazo, meropenem) starts <em>before</em> cultures return.",
		"<em>E. coli</em> is possible but less specific. <em>H. influenzae</em> & <em>N. meningitidis</em> are encapsulated (asplenia/humoral territory). <em>S. pneumoniae</em> is gram-positive.",
	],
	"3.8": [
		"Pattern: <strong>isolated neutropenia from birth</strong> + normal Hb, platelets, and lymphocytes + no recurrent infections = <em>congenital neutropenia</em>.",
		"Distinguishers: alloimmune hemolytic disease causes anemia. Congenital CMV → microcephaly + hearing loss + petechiae + jaundice.",
		"<strong>DiGeorge</strong> = T-cell deficiency + cardiac defects + hypocalcemia. <strong>SCID</strong> = combined T+B deficiency with severe infections — not this clinical picture.",
	],
	"4.0": [
		"<strong>Disseminated atypical mycobacterial infection</strong> + normal T-cell and B-cell numbers = <em>Mendelian susceptibility to mycobacterial disease</em>.",
		"Most common defect: <strong>IFN-γ receptor</strong>. Without IFN-γ signaling, macrophages can't be activated to kill intracellular mycobacteria.",
		"CD40L defect = hyper-IgM. IL-2R = SCID. TLR4 = LPS recognition. TNFR = different phenotypes entirely.",
	],
	"4.1": [
		"The center of a pyogenic abscess = <strong>dying neutrophils releasing acid hydrolases</strong> — lysosomal enzymes that work at acidic pH.",
		"These enzymes both kill bacteria <em>and</em> liquefy tissue — that's why the abscess center turns soft and fluid-filled.",
		"Bradykinin drives the vascular pain response, not tissue liquefaction. IgG = B-cell derived. IFN-γ = T cells. TGF-β = fibrosis and repair.",
	],
	"4.2": [
		"<strong>Sarcoidosis</strong> is the classic cause of <em>noncaseating</em> granulomas in bilateral hilar lymph nodes in a young adult, often with skin involvement.",
		"Biopsy: epithelioid histiocytes + multinucleated giant cells, <strong>no caseation, no organisms</strong>.",
		"Cat scratch = stellate microabscesses (next station). TB = caseating, often AFB+. Histoplasmosis = caseating, fungi on special stains. GPA = vasculitis with necrotizing granulomas.",
	],
	"4.3": [
		"Granulomas with <strong>stellate microabscesses</strong> are nearly pathognomonic for <em>cat-scratch disease</em>, caused by <strong><em>Bartonella henselae</em></strong>.",
		"History of a <em>kitten scratch</em> followed by regional lymphadenitis clinches the diagnosis.",
		"Distinguishers: TB = caseating granulomas · Pasteurella = rapid post-bite cellulitis · Sporothrix = lymphocutaneous nodules · Toxoplasma = reactive lymphadenopathy without stellate microabscesses.",
	],
	"4.4": [
		"Intracellular bacteria like <em>Chlamydophila</em> are cleared primarily by <strong>T-cell-mediated immunity</strong> — CD4+ Th1 cells activate macrophages via IFN-γ, and CD8+ cytotoxic T cells kill infected cells.",
		"With aging, <strong>thymic involution</strong> reduces the output of naïve T cells, weakening this arm of immunity while antibody responses remain relatively preserved.",
		"B-cell class switching and complement support humoral immunity (intact in this stem). NK and neutrophils play limited roles against obligate intracellular bacteria.",
	],
};

// =====================================================================
// Apply
// =====================================================================
const data = JSON.parse(readFileSync(JSON_PATH, "utf8"));

let appliedCount = 0;
let missingCount = 0;
const missing = [];

/**
 * Most stations ship with an empty `explanationDiagrams` array — the
 * source HTML attached the diagram to the step-flow walkthrough rather
 * than the explanation panel. The user wants a diagram visible above
 * the keypoints, so when the array is empty we seed it with the first
 * step's diagram (which the extraction script already auto-fills with
 * a copy of the station's main diagram for spotlight-only steps).
 */
function seedExplanationDiagram(station) {
	if (Array.isArray(station.explanationDiagrams) && station.explanationDiagrams.length) {
		return;
	}
	const flow = station.stepFlow && station.stepFlow.flow;
	if (!Array.isArray(flow)) return;
	const firstStepWithDiagram = flow.find(
		(f) => f && f.type === "step" && f.stepDiagram,
	);
	if (!firstStepWithDiagram) return;
	station.explanationDiagrams = [
		{
			id: firstStepWithDiagram.stepDiagram.id,
			src: firstStepWithDiagram.stepDiagram.src,
		},
	];
}

for (const chapter of data.chapters) {
	for (const station of chapter.stations) {
		const key = `${chapter.num}.${station.idx}`;
		const points = KEYPOINTS[key];
		if (points && Array.isArray(points) && points.length) {
			station.keypoints = points;
			appliedCount++;
		} else {
			missing.push(`${key} ${station.title}`);
			missingCount++;
		}

		seedExplanationDiagram(station);
		// Drop every prose field that the explanation column used to
		// render. The user's final structure for that column is just
		// "explanation diagram + keypoints, nothing more" — so the
		// previously / stage / cardTitle / tagline / story / story
		// diagrams / whatsNext fields no longer have a place. The
		// station's `title` (in the topbar) still gives the user a
		// heading; everything else is conveyed by the keypoints.
		delete station.explanation;
		delete station.explanationTitle;
		delete station.previously;
		delete station.stage;
		delete station.cardTitle;
		delete station.tagline;
		delete station.story;
		delete station.diagrams;
		delete station.whatsNext;
	}
}

writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), "utf8");

console.log(`Applied keypoints to ${appliedCount} stations`);
if (missingCount) {
	console.log(`Missing keypoints for ${missingCount} stations:`);
	for (const m of missing) console.log("  - " + m);
}
