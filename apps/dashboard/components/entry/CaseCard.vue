<script setup lang="ts">
/**
 * Read-only renderer for a single case, mirroring the markup used by the live
 * preview (`PreviewRoot.vue`). Used by the text-editor mode to "show the user
 * one last time" before importing. Purely presentational.
 */
import { CheckCircle2Icon, NotebookPenIcon } from "lucide-vue-next";

type CaseItem = {
  id: number;
  body: string;
  imgUrls: string[];
  questions: Array<{
    id: number;
    body: string;
    type: "Default" | "Tabular";
    header: string | null;
    isStudyMode: boolean | null;
    imgUrls: string[];
    explanation: string;
    explanationImgUrls: string[];
    choices: Array<{
      id: number;
      body: string;
      isCorrect: boolean | null;
      explanation: string | null;
    }>;
  }>;
};

defineProps<{ item: CaseItem }>();
</script>

<template>
  <div
    :id="`unit-${item.id}`"
    class="unit-container bg-muted min-h-50 rounded-sm p-4 pb-6 overflow-hidden relative"
  >
    <div
      aria-role="case-item"
      class="p-4 w-full flex gap-1 justify-between items-center"
    >
      <p class="whitespace-pre-line">{{ item.body }}</p>
      <ImagesGallery v-if="item.imgUrls.length" :img-urls="item.imgUrls" />
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
          <p class="text-sm p-2 whitespace-pre-line">
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

        <!-- Tabular questions: header + choice cells rendered as a real table. -->
        <div class="mt-2 px-6 overflow-x-auto" v-if="question.type === 'Tabular'">
          <table class="text-sm border-collapse w-full">
            <thead v-if="question.header">
              <tr>
                <th
                  v-for="(col, ci) in (question.header ?? '').split('\t')"
                  :key="`h-${ci}`"
                  class="border border-border/60 px-2 py-1 text-left font-semibold"
                >
                  {{ col }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="choice in question.choices" :key="`r-${choice.id}`">
                <td
                  v-for="(cell, ci) in choice.body.split('\t')"
                  :key="`c-${choice.id}-${ci}`"
                  class="border border-border/60 px-2 py-1"
                  :class="
                    choice.isCorrect ? 'bg-success/15 text-success-foreground' : ''
                  "
                >
                  <span class="inline-flex items-center gap-1">
                    {{ cell }}
                    <CheckCircle2Icon
                      v-if="choice.isCorrect && ci === 0"
                      class="h-4 w-4 text-success shrink-0"
                    />
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Default questions: choices as a lettered list. -->
      <ol
        v-if="question.type !== 'Tabular'"
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
          <p
            v-if="choice.explanation"
            class="text-xs text-muted-foreground ml-1 mt-0.5"
          >
            ↳ {{ choice.explanation }}
          </p>
        </li>
      </ol>

      <div
        aria-role="explanation"
        class="flex gap-1 items-center justify-between px-2 text-sm"
      >
        <p>
          Explanation
          <span class="block my-1 whitespace-pre-line">
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
</template>
