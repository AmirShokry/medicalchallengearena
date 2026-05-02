<!--
  StoryDiagram
  ============
  Renders one of the standalone .svg files served from a system's public
  folder (or a remote object-storage URL — the JSON's `src` field is the
  source of truth).

  Three visual variants matching the reference HTML:

    - mode="inline" (default): the prose-flow card with click-to-zoom
      chrome (.diagram-inline). Image flows with the document at
      width 100% / height auto.
    - mode="lightbox": full-resolution view shown inside the diagram
      lightbox. Image is width 100% / height auto with a 78vh ceiling
      so it never pushes the chrome off-screen, plus an italic caption.
    - mode="stage": the pinned diagram inside the step-flow walkthrough.
      Image fills 100% of its parent box with object-fit contain so the
      SVG scales to the wrap without overflowing or leaving its parent
      collapsed.

  Each `<img>` reads the SVG file's intrinsic `viewBox` (declared in the
  file's own `<svg>` root) for its aspect ratio — no separate `viewBox`
  prop is needed at the call site.

  We use <img src> rather than fetching+inlining the markup so:
    1. The browser caches the file alongside other static assets.
    2. The same component works for cloud-hosted SVGs without any CORS
       configuration on the bucket.
    3. Each SVG file's internal <symbol>/<defs>/<style> stays scoped to
       its own document — no id collisions across diagrams on the page.
-->
<script setup lang="ts">
interface Props {
	/** Public URL (or object-storage URL) of the SVG file to render. */
	src: string;
	/** Optional caption shown below the diagram. */
	caption?: string;
	/** Optional accessible alt text for the image. */
	alt?: string;
	/** Visual variant — see component header for details. */
	mode?: "inline" | "lightbox" | "stage";
}

const props = withDefaults(defineProps<Props>(), {
	caption: "",
	alt: "",
	mode: "inline",
});

const emit = defineEmits<{
	enlarge: [payload: { src: string; caption: string }];
}>();

function onClick() {
	if (props.mode !== "inline") return;
	emit("enlarge", {
		src: props.src,
		caption: props.caption,
	});
}

function onKey(e: KeyboardEvent) {
	if (props.mode !== "inline") return;
	if (e.key === "Enter" || e.key === " ") {
		e.preventDefault();
		onClick();
	}
}
</script>

<template>
	<!-- INLINE — click-to-zoom card embedded in story / explanation prose. -->
	<figure
		v-if="mode === 'inline'"
		role="button"
		tabindex="0"
		class="group relative my-7 cursor-zoom-in rounded-[10px] border border-border bg-background px-3.5 pt-5 pb-2.5 transition-[border-color,box-shadow] duration-200 hover:border-[#c08537] hover:[box-shadow:inset_0_0_0_1px_#c08537]"
		@click="onClick"
		@keydown="onKey"
	>
		<figcaption
			class="pointer-events-none absolute top-2.5 right-3.5 text-[10px] tracking-[1px] uppercase text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-90"
		>
			↗ click to enlarge
		</figcaption>
		<img
			:src="src"
			:alt="alt || caption || ''"
			class="block h-auto w-full select-none"
			draggable="false"
			loading="lazy"
		/>
		<div
			v-if="caption"
			class="mt-2 text-center text-[12px] italic leading-[1.5] text-muted-foreground"
		>
			{{ caption }}
		</div>
	</figure>

	<!-- LIGHTBOX — natural aspect ratio with a 78vh ceiling, caption below. -->
	<div v-else-if="mode === 'lightbox'" class="contents">
		<img
			:src="src"
			:alt="alt || caption || ''"
			class="block h-auto max-h-[78vh] w-full select-none"
			draggable="false"
		/>
		<div
			v-if="caption"
			class="mt-4 text-center text-[13px] italic leading-[1.6] text-muted-foreground"
		>
			{{ caption }}
		</div>
	</div>

	<!-- STAGE — fills the step-flow's `.sf-diagram-wrap`. -->
	<img
		v-else
		:src="src"
		:alt="alt || caption || ''"
		class="block h-full w-full max-w-[720px] select-none object-contain"
		draggable="false"
	/>
</template>
