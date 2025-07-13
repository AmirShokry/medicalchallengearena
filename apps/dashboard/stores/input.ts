import { defineStore } from "pinia";
import {
	DEFALT_QUESTIONS_NUMBER,
	DEFAULT_CHOICES_ROWS,
} from "@/components/entry/index";

export const useInputStore = defineStore("input", () => {
	const input = ref(initInputData());
	function initInputData() {
		return {
			id: new Date().getTime(),
			body: "",
			imgUrls: [] as string[],
			questions: Array.from(
				{ length: DEFALT_QUESTIONS_NUMBER.value },
				() => {
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
				}
			),
		};
	}

	function resetInput() {
		input.value = initInputData();
		console.log("Input data has been reset to default values.");
	}
	function setInput(newData: any) {
		Object.assign(input.value, newData);
	}

	return {
		input,
		resetInput,
		setInput,
	};
});
