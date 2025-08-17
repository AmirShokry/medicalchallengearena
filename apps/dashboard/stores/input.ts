import { defineStore } from "pinia";
import {
  ENTRY_PREFERENCES,
  type QuestionType,
  type Block,
} from "@/components/entry/Input/Index.vue";
export const useInputStore = defineStore("input", () => {
  const activeCategoryId = ref<number | null>(null);
  const data = ref<Block[number]>(init());
  function init(): Block[number] {
    const randId = new Date().getTime();
    return {
      id: randId,
      category_id: activeCategoryId.value,
      type: "" as any,
      body: "",
      imgUrls: [] as string[],
      questions: Array.from(
        { length: ENTRY_PREFERENCES.value.QUESTIONS_NUMBER },
        () => ({
          id: randId,
          body: "",
          imgUrls: [] as string[],
          type: "Default" as QuestionType,
          explanation: "",
          explanationImgUrls: [] as string[],
          isStudyMode: false as boolean | null,
          header: "" as string | null,
          choices: Array.from(
            { length: ENTRY_PREFERENCES.value.CHOICES_ROWS },
            () => ({
              id: randId,
              body: "",
              isCorrect: false as boolean | null,
              explanation: "" as string | null,
            })
          ),
        })
      ),
    };
  }

  function resetInput() {
    // Reflect.ownKeys(data.value).forEach(
    // 	(key) => delete data.value[key as keyof typeof data.value]
    // );
    Object.assign(data.value, init());
  }
  function setInput(newData: Block[number]) {
    Object.assign(data.value, newData);
  }

  return {
    data,
    resetInput,
    setInput,
    activeCategoryId,
  };
});
