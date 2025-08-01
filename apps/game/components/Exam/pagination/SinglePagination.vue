<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
const $$game = useGameStore();
const props = defineProps<{
  pendingIndex: number;
  records: typeof $$game.players.user.records.data;
  totalQuestionsCount: number;
  revertState: () => void;
}>();

const curr = defineModel<{
  caseIdx: number;
  questionIdx: number;
  selectedChoiceIdx: number;
  eliminatedChoicesIdx: Set<number>;
  questionNumber: number;
}>("currentIndexes", { required: true });

const isReviewing = defineModel("isReviewing", {
  type: Boolean,
  required: true,
});

const canShowExplanation = defineModel("canShowExplanation", {
  type: Boolean,
  required: true,
});

function getItemClass(page: number) {
  if (page === props.pendingIndex) return "!bg-orange-500 !opacity-100";
  if (page > props.records.length) return "!bg-neutral-500 scale-90";
  if (props?.records[page - 1]?.isCorrect) return "!bg-green-700 scale-90";
  if (!props?.records[page - 1]?.isCorrect) return "!bg-red-700 scale-90";
}

function canViewPage(page: number) {
  if (page > props.pendingIndex) return false;
  if (curr.value.questionNumber === page) return false;
  return true;
}

function canSelectNext(page: number) {
  if (page >= props.pendingIndex) return false;
  return true;
}

function canSelectLast(page: number) {
  if (page >= props.pendingIndex) return false;
  return true;
}

function handleReviewClicked(page: number) {
  if (page === props.pendingIndex) {
    props.revertState();
    return (isReviewing.value = false);
  }
  isReviewing.value = true;

  curr.value.questionNumber = page;
  curr.value.caseIdx = props.records[page - 1]?.nthCase!;
  curr.value.questionIdx = props.records[page - 1]?.nthQuestion!;
  curr.value.selectedChoiceIdx = props.records[page - 1]?.nthSelectedChoice!;
  curr.value.eliminatedChoicesIdx = new Set(
    props.records[page - 1]?.nthEliminatedChoices
  );
  canShowExplanation.value = true;
}

watch(
  () => curr.value.questionNumber,
  () => {
    handleReviewClicked(curr.value.questionNumber);
  }
);

function handleLastPageClicked() {
  curr.value.questionNumber = props.pendingIndex;
}

const windowWidth = ref(window.innerWidth);
const shouldShowEdges = ref(true),
  siblingCount = ref<number>();

function handleResize() {
  windowWidth.value = window.innerWidth;
  if (windowWidth.value < 650) {
    shouldShowEdges.value = false;
    siblingCount.value = 1;
  } else {
    shouldShowEdges.value = true;
    siblingCount.value = undefined;
  }
}

onMounted(() => window.addEventListener("resize", handleResize));
onUnmounted(() => window.removeEventListener("resize", handleResize));
</script>

<template>
  <Pagination
    v-model:page="curr.questionNumber"
    v-slot="{ page }"
    :total="totalQuestionsCount"
    :show-edges="shouldShowEdges"
    :sibling-count="siblingCount"
    :items-per-page="1"
    :default-page="1"
  >
    <PaginationContent v-slot="{ items }" class="flex items-center gap-1">
      <PaginationFirst class="!bg-transparent" />
      <PaginationPrevious class="!bg-transparent" />

      <template v-for="(item, index) in items">
        <PaginationItem
          v-if="item.type === 'page'"
          :key="index"
          :value="item.value"
          as-child
        >
          <Button
            @click="handleReviewClicked(item.value)"
            v-disabled-click="!canViewPage(item.value)"
            class="!w-4 !h-4 !px-3 py-3 hover:scale-[1.02] dark:text-primary hover:text-primary-forground"
            :class="getItemClass(item.value)"
          >
            {{ item.value }}
          </Button>
        </PaginationItem>
        <PaginationEllipsis v-else :key="item.type" :index="index" />
      </template>

      <PaginationNext
        class="!bg-transparent"
        :disabled="!canSelectNext(page)"
      />
      <PaginationLast
        class="!bg-transparent"
        :disabled="!canSelectLast(page)"
        @click="handleLastPageClicked"
      />
    </PaginationContent>
  </Pagination>
</template>
