import { useStorage } from "@vueuse/core";

export const DEFAULT_EXAM_TYPE = useStorage("exam-type", "STEP 1");
export const DEFAULT_CHOICES_ROWS = useStorage("choices-rows", 4);
export const DEFAULT_CHOICES_COLUMNS = useStorage("choices-columns", 4);
export const DEFALT_QUESTIONS_NUMBER = useStorage("questions-number", 1);
export const EXAM_TYPES = ["STEP 1", "STEP 2", "STEP 3"];
export const DEFAULT_ENTRY_PANEL_SIZE = useStorage("input-panel-size", [70]);
export const IS_SIDEBAR_OPEN = useStorage("is-sidebar-open", true);

export const inputData = ref(initInputData());
function initInputData() {
	return {
		id: new Date().getTime(),
		body: "",
		imgUrls: [] as string[],
		questions: Array.from({ length: DEFALT_QUESTIONS_NUMBER.value }, () => {
			return {
				id: new Date().getTime(),
				body: "",
				imgUrls: [] as string[],
				type: "Default" as "Default" | "Tabular",
				explanation: "",
				explanationImgUrls: [] as string[],
				isStudyMode: false as boolean | null,
				header: "" as string | null,
				choices: Array.from(
					{ length: DEFAULT_CHOICES_ROWS.value },
					() => {
						return {
							id: new Date().getTime(),
							body: "",
							isCorrect: false as boolean | null,
							explanation: "" as string | null,
						};
					}
				),
			};
		}),
	};
}

export function resetInputData() {
	inputData.value = initInputData();
	console.log("Input data has been reset to default values.");
}
