<script setup lang="ts">
import type { Player } from "@/components/player";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";

const current = defineModel<{
  caseIdx: number;
  questionIdx: number;
  selectedChoiceIdx: number;
  eliminatedChoicesIdx: Set<number>;
  questionNumber: number;
}>("currentIndexes", { required: true });

const props = defineProps<{
  records: Player["records"]["data"];
  maxQuestion: number;
  revertState: () => void;
  length: number;
}>();

const isReviewing = defineModel("isReviewing", {
  type: Boolean,
  required: true,
});

const canShowExplanation = defineModel("canShowExplanation", {
  type: Boolean,
  required: true,
});

const isSolved = computed(() => props.records.length === props.maxQuestion);

function isPendingQuestion(page: number) {
  return page === props.maxQuestion && !isSolved.value;
}

function handleReviewClicked(page: number) {
  if (isPendingQuestion(page)) props.revertState();
  if (!props.records?.[page - 1]) return (isReviewing.value = false);

  isReviewing.value = true;

  current.value.questionNumber = page;
  current.value.caseIdx = props.records[page - 1]?.nthCase!;
  current.value.questionIdx = props.records[page - 1]?.nthQuestion!;
  current.value.selectedChoiceIdx = props.records[page - 1]?.nthSelectedChoice!;
  current.value.eliminatedChoicesIdx = new Set(
    props.records[page - 1]?.nthEliminatedChoices!
  );
  canShowExplanation.value = true;
}

function getRecordClass(page: number) {
  if (isPendingQuestion(page)) return tw`!bg-orange-500`;
  if (page - 1 < props?.records.length) {
    if (props.records[page - 1]?.isCorrect) return tw`!bg-success`;
    return tw`!bg-destructive`;
  }
  return tw`!bg-neutral-500 !cursor-not-allowed`;
}

function isDisabled(page: number) {
  if (isNaN(page) || page > props.maxQuestion) return true;
  return current.value?.questionNumber === page && page === props.maxQuestion;
}
</script>

<template>
  <aside class="px-2 border border-border py-2 rounded-sm">
    <Pagination
      v-model:page="current.questionNumber"
      v-slot="{ page }"
      :total="length"
      :items-per-page="1"
      :default-page="1"
      :sibling-count="9"
      :show-edges="false"
    >
      <PaginationContent
        v-slot="{ items }"
        class="vertical-navbar flex flex-col gap-2"
      >
        <template v-for="(item, index) in items">
          <PaginationItem
            v-if="item.type === 'page'"
            :key="index"
            :value="item.value"
            as-child
          >
            <Button
              @click="handleReviewClicked(item.value)"
              :disabled="isDisabled(item.value)"
              :class="getRecordClass(item.value)"
              class="h-4 w-4 p-2.5 !aspect-auto rounded-sm text-xs font-medium cursor-pointer dark:text-primary/80 hover:text-background hover:scale-90"
              :aria-current="item.value === page"
              :aria-label="`Page ${item.value}, Current page`"
            >
              {{ item.value }}
            </Button>
          </PaginationItem>
          <PaginationEllipsis
            v-else
            :key="item.type"
            :index="index"
            class="size-4 aspect-square flex items-center justify-center"
          />
        </template>
      </PaginationContent>
    </Pagination>
  </aside>
</template>

<style scoped>
/* .vertical-navbar {
  display: flex;
  flex-direction: column;
  align-items: center;
} */
</style>
