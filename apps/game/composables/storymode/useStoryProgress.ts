import { computed, ref, watch } from "vue";
import type { StationStatus, StorySystem } from "./types";

/**
 * Per-system progress tracking, persisted in localStorage.
 *
 * Mirrors the rules from the original reference HTML:
 *   - The first station of chapter 1 is always available.
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
		return Array.isArray(arr) ? new Set(arr) : new Set();
	} catch {
		return new Set();
	}
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
			completed.value = load(system.name);
		},
		{ immediate: true },
	);

	/** Status for a specific station, computed lazily so callers stay reactive. */
	function getStatus(chapterNum: number, stationIdx: number): StationStatus {
		const system = systemRef();
		if (!system) return "locked";
		const key = getStationKey(chapterNum, stationIdx);
		if (completed.value.has(key)) return "completed";

		// A chapter past the first is locked until every station of the
		// preceding chapter is finished.
		if (chapterNum > 1) {
			const prev = system.chapters[chapterNum - 2];
			if (!prev) return "locked";
			const prevAllDone = prev.stations.every((_, i) =>
				completed.value.has(getStationKey(prev.num, i)),
			);
			if (!prevAllDone) return "locked";
		}

		// Within an unlocked chapter, only the first incomplete station is
		// available.
		const chapter = system.chapters[chapterNum - 1];
		if (!chapter) return "locked";
		for (let i = 0; i < chapter.stations.length; i++) {
			if (!completed.value.has(getStationKey(chapterNum, i))) {
				return i === stationIdx ? "available" : "locked";
			}
		}
		return "locked";
	}

	function isChapterLocked(chapterNum: number): boolean {
		if (chapterNum === 1) return false;
		const system = systemRef();
		if (!system) return true;
		const prev = system.chapters[chapterNum - 2];
		if (!prev) return true;
		return !prev.stations.every((_, i) =>
			completed.value.has(getStationKey(prev.num, i)),
		);
	}

	function chapterDoneCount(chapterNum: number): number {
		const system = systemRef();
		if (!system) return 0;
		const chapter = system.chapters[chapterNum - 1];
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
