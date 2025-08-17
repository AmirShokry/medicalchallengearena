<script lang="ts">
import type { APIOutput } from "@/shared/types/api";
import { useStorage } from "@vueuse/core";
import type { InjectionKey, ShallowRef } from "vue";
export type Block = APIOutput["block"]["get"];
export type QuestionType = "Default" | "Tabular";
export type CaseTypes = (typeof CASE_TYPES)[number];
export const CASE_TYPES = ["STEP 1", "STEP 2", "STEP 3"] as const;
export const ENTRY_PREFERENCES = useStorage("entry-preferences", {
  CHOICES_ROWS: 4,
  CHOICES_COLUMNS: 4,
  QUESTIONS_NUMBER: 1,
  CASE_TYPE: "STEP 1" as CaseTypes,
  INPUT_PANEL_SIZE: [70],
  IS_SIDEBAR_OPEN: false,
});
const inputSectionRefKey = Symbol("inputSectionRef") as InjectionKey<
  ShallowRef<HTMLElement | null>
>;
export function useInjectInputSectionRef() {
  return inject(inputSectionRefKey);
}
</script>

<script setup lang="ts">
import { inputSchema } from "@/shared/schema/input";
import { toast } from "vue-sonner";
import { TrashIcon } from "lucide-vue-next";
const { caseType, system, category } = defineProps<{
  caseType: CaseTypes;
  system: string;
  category: string;
}>();
const { $trpc } = useNuxtApp();
const inputStore = useInputStore();
const previewStore = usePreviewStore();
const formRef = useTemplateRef("formRef");
const inputSectionRef = useTemplateRef("inputSectionRef");
provide(inputSectionRefKey, inputSectionRef);

function inputValidation() {
  const { success, error } = inputSchema.safeParse(inputStore.data);
  if (success) return;
  else throw new Error(error.message);
}

inputStore.data.type = caseType;
watch(
  () => caseType,
  (newCaseType) => {
    inputStore.data.type = newCaseType;
  }
);

async function submitInput() {
  if (!formRef.value?.reportValidity()) return;
  inputValidation();
  try {
    console.log("Submitting input:", inputStore.data.type);
    const data = await $trpc.block.add.mutate({
      ...inputStore.data,
      category_id: inputStore.activeCategoryId,
    });

    console.log(`Returned `, data);
    await previewStore.addData(data);
    inputStore.resetInput();
    inputStore.data.type = caseType;
  } catch (error) {
    console.error("Error submitting input:", error);
    console.log(error);
  }
}

async function applyEdit() {
  if (!formRef.value?.reportValidity()) return;
  inputValidation();
  try {
    await $trpc.block.update.mutate(inputStore.data);
    if (previewStore.editedCaseIndex === null) return;
    previewStore.preview[previewStore.editedCaseIndex] = structuredClone(
      toRaw(inputStore.data)
    );
    toast.success("Case updated successfully.");
  } catch (error) {
    console.error("Error applying edit:", error);
    toast.error("Failed to update case.");
  } finally {
    previewStore.editedCaseIndex = null;
    inputStore.resetInput();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

async function handleDeleteCase(caseIndex: number | null) {
  if (previewStore.isEmpty) return;
  if (caseIndex === null) return;
  const caseId = previewStore.preview[caseIndex]?.id;
  try {
    await $trpc.block.delete.mutate({ caseId });
    previewStore.deleteCase(caseIndex);
    inputStore.resetInput();
    inputStore.data.type = caseType;
    toast.success("Case deleted successfully.");
  } catch (error) {
    console.error("Error deleting case:", error);
  }
}
</script>
<template>
  <section
    ref="inputSectionRef"
    aria-role="input-section"
    class="h-full overflow-y-scroll thin-scrollbar p-6"
  >
    <form ref="formRef" id="submit-input" @submit.prevent="submitInput" />
    <EntryInputToolbar class="gap-2 mb-4">
      <template #submit>
        <Button
          v-if="!previewStore.isEditing"
          class="!h-9 !px-4 !rounded-md"
          type="submit"
          form="submit-input"
        >
          Submit
        </Button>
        <Dialog v-if="previewStore.isEditing">
          <DialogTrigger>
            <Button title="Edit case" class="cursor-pointer !h-9 !px-4">
              Apply Edit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Case</DialogTitle>
              <DialogDescription>
                Are you sure you want to apply these changes?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button @click="applyEdit"> Save Changes </Button>
              <DialogClose>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </template>

      <template #delete v-if="previewStore.isEditing">
        <Dialog>
          <DialogTrigger>
            <Button
              title="Delete case"
              variant="secondary"
              class="cursor-pointer hover:text-destructive !h-9 !px-4"
            >
              <TrashIcon />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Case</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this case? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="secondary"
                @click="handleDeleteCase(previewStore.editedCaseIndex)"
              >
                Ok
              </Button>
              <DialogClose>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </template>
    </EntryInputToolbar>
    <EntryInputCase class="mb-4" />
    <EntryInputQuestionsBlock class="p-1 mb-4" />
  </section>
</template>
