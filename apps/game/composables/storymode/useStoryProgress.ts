import { computed, ref, watch } from "vue";
import type { StationStatus, StorySystem } from "./types";

/**
 * Per-system progress tracking, persisted in localStorage.
 *
 * Mirrors the rules from the original reference HTML:
 *   - The first station of the first chapter is always available.
 *   - A chapter is locked until every station of the previous chapter is
 *     completed.
 *   - Within an unlocked chapter, only the first not-yet-completed station
 *     is available; later stations are locked until earlier ones are done.
 *
 * The store key is namespaced by system so different systems track
 * independent progress.
 */
const STORAGE_PREFIX = "storymode.progress.v1.";

function storageKey(systemName: string) {
	return `${STORAGE_PREFIX}${systemName}`;
}

/**
 * Load the persisted Set of completed station keys. Resilient to
 * localStorage being unavailable (private mode) or corrupted.
 */
function load(systemName: string): Set<string> {
	if (typeof window === "undefined") return new Set();
	try {
		const raw = window.localStorage.getItem(storageKey(systemName));
		if (!raw) return new Set();
		const arr = JSON.parse(raw);
		return Array.isArray(arr)
			? new Set(arr.filter((key): key is string => typeof key === "string"))
			: new Set();
	} catch {
		return new Set();
	}
}

function setsEqual(left: Set<string>, right: Set<string>) {
	if (left.size !== right.size) return false;
	for (const item of left) if (!right.has(item)) return false;
	return true;
}

function sanitizeCompleted(system: StorySystem, stored: Set<string>) {
	const next = new Set<string>();
	for (const chapter of system.chapters) {
		for (let stationIdx = 0; stationIdx < chapter.stations.length; stationIdx++) {
			const key = getStationKey(chapter.num, stationIdx);
			if (!stored.has(key)) return next;
			next.add(key);
		}
	}
	return next;
}

function persist(systemName: string, completed: Set<string>) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			storageKey(systemName),
			JSON.stringify([...completed]),
		);
	} catch {
		/* quota / unavailable — silent */
	}
}

/**
 * Compose a station key — the same shape used by the reference HTML so a
 * future migration could preserve user progress one-to-one if needed.
 */
export function getStationKey(chapterNum: number, stationIdx: number) {
	return `${chapterNum}-${stationIdx}`;
}

/**
 * Reactive progress state for a given system. Components can both read
 * derived station statuses and call `markCompleted` to persist progress.
 */
export function useStoryProgress(systemRef: () => StorySystem | null | undefined) {
	const completed = ref<Set<string>>(new Set());
	const currentSystemName = ref<string | null>(null);

	// Hydrate (and re-hydrate) whenever the system changes.
	watch(
		systemRef,
		(system) => {
			if (!system) {
				completed.value = new Set();
				currentSystemName.value = null;
				return;
			}
			if (currentSystemName.value === system.name) return;
			currentSystemName.value = system.name;
			const stored = load(system.name);
			const sanitized = sanitizeCompleted(system, stored);
			completed.value = sanitized;
			if (!setsEqual(stored, sanitized)) persist(system.name, sanitized);
		},
		{ immediate: true },
	);

	/**
	 * Look up a chapter and its preceding chapter by `num`, NOT by
	 * `chapterNum - 1` array indexing. Different systems use different
	 * chapter number ranges (innate is 1-4, adaptive is 5-16) but the
	 * array indices always start at 0 — so subtracting from the chapter
	 * number gave the wrong neighbour for any system that doesn't start
	 * at chapter 1.
	 */
	function findChapter(chapterNum: number) {
		const system = systemRef();
		if (!system) return { chapter: null, prev: null, isFirst: false };
		const idx = system.chapters.findIndex((c) => c.num === chapterNum);
		if (idx === -1) return { chapter: null, prev: null, isFirst: false };
		return {
			chapter: system.chapters[idx] ?? null,
			prev: idx > 0 ? (system.chapters[idx - 1] ?? null) : null,
			isFirst: idx === 0,
		};
	}

	/** Status for a specific station, computed lazily so callers stay reactive. */
	function getStatus(chapterNum: number, stationIdx: number): StationStatus {
		const key = getStationKey(chapterNum, stationIdx);
		if (completed.value.has(key)) return "completed";

		const { chapter, prev, isFirst } = findChapter(chapterNum);
		if (!chapter) return "locked";

		// Non-first chapters are locked until every station of the
		// preceding chapter (in display order) is finished.
		if (!isFirst) {
			if (!prev) return "locked";
			const prevAllDone = prev.stations.every((_, i) =>
				completed.value.has(getStationKey(prev.num, i)),
			);
			if (!prevAllDone) return "locked";
		}

		// Within an unlocked chapter, only the first not-yet-completed
		// station is available; later ones stay locked until earlier
		// ones are done.
		for (let i = 0; i < chapter.stations.length; i++) {
			if (!completed.value.has(getStationKey(chapterNum, i))) {
				return i === stationIdx ? "available" : "locked";
			}
		}
		return "locked";
	}

	function isChapterLocked(chapterNum: number): boolean {
		const { prev, isFirst } = findChapter(chapterNum);
		if (isFirst) return false;
		if (!prev) return true;
		return !prev.stations.every((_, i) =>
			completed.value.has(getStationKey(prev.num, i)),
		);
	}

	function chapterDoneCount(chapterNum: number): number {
		const { chapter } = findChapter(chapterNum);
		if (!chapter) return 0;
		return chapter.stations.filter((_, i) =>
			completed.value.has(getStationKey(chapterNum, i)),
		).length;
	}

	const totalCompleted = computed(() => completed.value.size);

	const totalStations = computed(() => {
		const system = systemRef();
		if (!system) return 0;
		return system.chapters.reduce((sum, c) => sum + c.stations.length, 0);
	});

	function markCompleted(chapterNum: number, stationIdx: number) {
		if (getStatus(chapterNum, stationIdx) === "locked") return;
		const next = new Set(completed.value);
		next.add(getStationKey(chapterNum, stationIdx));
		completed.value = next;
		const system = systemRef();
		if (system) persist(system.name, next);
	}

	function reset() {
		completed.value = new Set();
		const system = systemRef();
		if (system) persist(system.name, completed.value);
	}

	return {
		completed,
		totalCompleted,
		totalStations,
		getStatus,
		isChapterLocked,
		chapterDoneCount,
		markCompleted,
		reset,
	};
}
