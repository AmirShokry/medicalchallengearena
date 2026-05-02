import z from "zod";
import { TRPCError } from "@trpc/server";
import { authProcedure, createTRPCRouter } from "../init";

/**
 * Story mode tRPC router.
 *
 * Story mode is a guided, single-player learning experience built on top of
 * the same /game/solo namespace. Each "system" is described by a JSON
 * document that ships alongside the server (see
 * `apps/game/server/data/storymode/`) and is bundled at build time.
 * Diagrams (SVG) are kept separately as Vue components — this router only
 * ever returns structured data referencing diagrams by id.
 *
 * The data contract returned by `system` is intentionally identical to the
 * shape produced by the extraction script (see
 * `scripts/storymode-extraction/extract.mjs`) so the backend is a thin
 * passthrough — adding a new system means dropping a new JSON file in the
 * data folder, registering it below, and adding it to `index.json`.
 */

// Static imports keep these JSON documents in the server bundle so they
// work in every Nitro deployment target (node-server, lambda, edge, etc.)
// without depending on filesystem layout at runtime. To register a new
// story-mode system, add its JSON file here and to the SYSTEMS map below.
import systemsIndex from "@/server/data/storymode/index.json";
import innateImmunity from "@/server/data/storymode/innate-immunity-story.json";

/**
 * Registry mapping system slug → bundled JSON metadata. Names must match
 * the entries in `index.json` exactly so the client can move from the
 * picker page to the system detail page using the same key.
 */
const SYSTEMS: Record<string, unknown> = {
	"innate-immunity-story": innateImmunity,
};

export const storymode = createTRPCRouter({
	/**
	 * List every story-mode system available. Used by `/game/solo/story` to
	 * render the systems-picker page. Returns lightweight metadata only.
	 */
	systems: authProcedure.query(async () => {
		return systemsIndex;
	}),

	/**
	 * Fetch the full metadata for a single story-mode system, including its
	 * chapters, stations, questions, choices, and the IDs of all referenced
	 * diagrams. The client resolves diagram IDs to Vue components using the
	 * registry under `apps/game/components/storymode/svgs/<system>/index.ts`.
	 */
	system: authProcedure
		.input(z.object({ name: z.string().min(1) }))
		.query(async ({ input }) => {
			const data = SYSTEMS[input.name];
			if (!data)
				throw new TRPCError({
					code: "NOT_FOUND",
					message: `Story-mode system not found: ${input.name}`,
				});
			return data;
		}),
});
