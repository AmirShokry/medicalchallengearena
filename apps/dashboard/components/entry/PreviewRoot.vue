<script setup lang="ts">
//@ts-expect-error
import { DynamicScroller, DynamicScrollerItem } from "vue-virtual-scroller";
import { type CaseTypes, type Block } from "./Input/Index.vue";
import {
  CheckCircle2Icon,
  NotebookPenIcon,
  SquarePenIcon,
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
} from "lucide-vue-next";

const { system, category, caseType } = defineProps<{
  system: string;
  category: string;
  caseType: CaseTypes;
}>();

const scrollerRef = useTemplateRef("scrollerRef");
const inputStore = useInputStore();
const previewStore = usePreviewStore();

watch(
  () => caseType,
  async () => {
    // Reset input when changing case types
    inputStore.resetInput();
    await previewStore.fetchPreviewData({
      system,
      category,
      caseType,
    });
  },
  { immediate: true }
);

// Scroll to top when new data is added
watch(
  () => previewStore.scrollToTopTrigger,
  () => {
    // Use setTimeout to ensure the scroller has fully rendered the new item
    setTimeout(() => {
      // Try multiple approaches to ensure scrolling to absolute top
      if (scrollerRef.value) {
        // Method 1: Use scrollToItem(0) first
        scrollerRef.value.scrollToItem(0);
        // Method 2: Then also try native scroll on the internal element
        const scrollerEl = scrollerRef.value.$el;
        if (scrollerEl) {
          scrollerEl.scrollTop = 0;
        }
      }
    }, 100);
  }
);

function handleEditCase(itemId: number) {
  const originalIndex = previewStore.preview.findIndex((p) => p.id === itemId);
  if (originalIndex === -1) return;

  const isEditing = originalIndex === previewStore.editedCaseIndex;
  previewStore.editedCaseIndex = isEditing ? null : originalIndex;
  inputStore.resetInput();

  if (!isEditing) {
    inputStore.setInput(
      structuredClone(toRaw(previewStore.preview[originalIndex]))
    );
  }
}

// Check if an item is currently being edited
function isItemEditing(itemId: number): boolean {
  const originalIndex = previewStore.preview.findIndex((p) => p.id === itemId);
  return previewStore.editedCaseIndex === originalIndex;
}
</script>
<template>
  <section
    aria-role="preview-section"
    class="bg-primary/20 @container/preview-section relative thin-scrollbar h-full"
  >
    <Button
      @click="scrollerRef?.scrollToBottom()"
      variant="link"
      title="Scroll to bottom"
      class="cursor-pointer absolute -top-1.5 -left-2 z-50"
      ><ArrowDownCircleIcon
    /></Button>
    <Button
      @click="scrollerRef?.scrollToItem(0)"
      variant="link"
      title="Scroll to top"
      class="cursor-pointer absolute -bottom-1.5 -left-2 z-50"
      ><ArrowUpCircleIcon
    /></Button>

    <DynamicScroller
      v-if="
        !previewStore.error &&
        !previewStore.pending &&
        previewStore.filteredPreview.length > 0
      "
      ref="scrollerRef"
      :items="previewStore.filteredPreview"
      :min-item-size="400"
      class="scroller @max-[220px]/preview-section:hidden"
      style="height: 97svh"
      key-field="id"
    >
      <template v-slot="{ item, index, active }">
        <DynamicScrollerItem
          :item="item"
          :active="active"
          :size-dependencies="[
            item.body,
            item.questions.map((q: any) => q.body).join(''),
            item.questions
              .map((q: any) => q.choices.map((c: any) => c.body).join(''))
              .join(''),
            item.questions.map((q: any) => q.explanation).join(''),
            item.questions.length,
          ]"
          :data-index="index"
          class="item-wrapper p-6"
        >
          <div
            :id="`unit-${item.id}`"
            class="unit-container bg-muted min-h-100 rounded-sm p-4 pb-10 overflow-hidden relative"
          >
            <Button
              @click="handleEditCase(item.id)"
              variant="link"
              title="Edit case"
              :class="isItemEditing(item.id) ? 'text-pink-600' : undefined"
              class="cursor-pointer hover:text-pink-500 !py-0 absolute top-0 right-1.5"
            >
              <SquarePenIcon />
            </Button>
            <div
              aria-role="case-item"
              class="p-4 w-full flex gap-1 justify-between items-center"
            >
              <p>{{ item.body }}</p>
              <ImagesGallery
                v-if="item.imgUrls.length"
                :img-urls="item.imgUrls"
              />
            </div>
            <div
              aria-role="block-container"
              v-for="(question, qIndex) in item.questions"
              :id="`question-${question.id}`"
              class="flex flex-col gap-1 px-6 py-4 mx-4 rounded-sm bg-sidebar overflow-hidden"
              :style="{ marginTop: qIndex > 0 ? '12px' : '0' }"
              :key="question.id"
            >
              <div aria-role="question" class="w-full">
                <div class="flex items-center gap-1">
                  <p class="text-sm p-2">
                    <NotebookPenIcon
                      v-if="question.isStudyMode"
                      title="Study Mode"
                      class="text-sidebar-primary inline mr-1"
                      :size="15"
                    />
                    <span class="underline underline-offset-2 unselectable">
                      Q#{{ qIndex + 1 }}
                    </span>
                    {{ question.body }}
                  </p>

                  <ImagesGallery
                    v-if="question.imgUrls.length"
                    :img-urls="question.imgUrls"
                  />
                </div>
                <div
                  class="flex flex-col mt-2 px-6"
                  v-if="question.type === 'Tabular'"
                >
                  <pre
                    class="text-sm whitespace-normal break-words font-[inherit]"
                  >
                    {{ question.header }}
                  </pre>
                </div>
              </div>

              <ol
                aria-role="choices-list"
                class="text-sm pb-2 ml-8 list-[upper-alpha]"
              >
                <li
                  v-for="choice in question.choices"
                  :key="choice.id"
                  :id="`choice-${choice.id}`"
                  class="my-1"
                >
                  <p class="inline-flex gap-1 items-center">
                    {{ choice.body }}
                    <CheckCircle2Icon
                      v-if="choice.isCorrect"
                      class="h-4 w-4 text-success shrink-0"
                    />
                  </p>
                </li>
              </ol>

              <div
                aria-role="explanation"
                class="flex gap-1 items-center justify-between px-2 text-sm"
              >
                <p>
                  Explanation
                  <span class="block my-1">
                    {{ question.explanation }}
                  </span>
                </p>

                <ImagesGallery
                  :imgUrls="question.explanationImgUrls"
                  v-if="question.explanationImgUrls.length"
                />
              </div>
            </div>
          </div>
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>
    <div
      class="p-6 text-center py-20"
      v-if="previewStore.isEmpty && !previewStore.noSearchResults"
    >
      No data found.
    </div>
    <div class="p-6 text-center py-20" v-if="previewStore.noSearchResults">
      No results found for "{{ previewStore.searchQuery }}".
    </div>
    <div
      v-if="previewStore.pending"
      class="p-7 text-center py-16 w-full inline-flex justify-center"
    >
      <SvgoLoader class="text-6xl text-center delayed-fade" />
    </div>
  </section>
</template>

<style scoped>
.delayed-fade {
  animation: delayedFadeIn 1s ease-out;
}
@keyframes delayedFadeIn {
  0% {
    opacity: 0;
  }
  75% {
    opacity: 0.2;
  }
  100% {
    opacity: 1;
  }
}
</style>
