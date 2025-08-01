<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ChevronRight, ChevronLeft } from "lucide-vue-next";
const props = defineProps<{
  statusIndicies?: boolean[];
  length?: number;
  hideNext?: boolean;
  hidePrev?: boolean;
  orientation?: "horizontal" | "vertical";
}>();
const model = defineModel<number>({ required: true, type: Number, default: 1 });
const totalVisible = defineModel<number>("totalVisible", {
  required: false,
  type: Number,
  default: 5,
});
const totalVisibleDefault = totalVisible.value;

function getItemClass(index: number, isActive?: boolean) {
  if (!props.statusIndicies) return "";
  const onActiveClass = isActive ? " border-3 border-border " : "";
  return props.statusIndicies[index - 1]
    ? `${onActiveClass} !bg-green-900`
    : `${onActiveClass} !bg-red-900`;
}

function handlePageChange(page: number) {
  model.value = page;
}

const windowWidth = ref(window.innerWidth);
const siblingCount = ref<number>();

function handleResize() {
  windowWidth.value = window.innerWidth;
  if (windowWidth.value < 500) {
    siblingCount.value = 0; // This will show fewer pages similar to totalVisible = 2
  } else {
    siblingCount.value = Math.floor((totalVisibleDefault - 3) / 2); // Convert totalVisible to siblingCount
  }
}

onMounted(() => {
  window.addEventListener("resize", handleResize);
  handleResize(); // Initialize on mount
});
onUnmounted(() => window.removeEventListener("resize", handleResize));
</script>

<template>
  <Pagination
    v-model:page="model"
    v-slot="{ page }"
    :total="length || 1"
    :sibling-count="siblingCount"
    :items-per-page="1"
    :default-page="1"
    :class="
      orientation === 'vertical' ? 'vertical-navbar' : 'horizontal-navbar'
    "
  >
    <PaginationContent v-slot="{ items }" class="flex items-center gap-4">
      <PaginationPrevious v-if="!hidePrev" class="w-8 h-8 p-0 cursor-pointer">
        <ChevronLeft class="w-4 h-4" />
      </PaginationPrevious>

      <template v-for="(item, index) in items">
        <PaginationItem
          v-if="item.type === 'page'"
          :key="index"
          :value="item.value"
          as-child
        >
          <Button
            @click="handlePageChange(item.value)"
            class="w-8 h-8 p-0 text-sm hover:scale-[1.02] cursor-pointer dark:text-primary/90 not-dark:hover:text-white"
            :class="getItemClass(item.value, item.value === page)"
            :aria-current="item.value === page"
            :aria-label="`Page ${item.value}, Current page`"
          >
            {{ item.value }}
          </Button>
        </PaginationItem>
        <PaginationEllipsis v-else :key="item.type" :index="index" />
      </template>

      <PaginationNext v-if="!hideNext" class="w-8 h-8 p-0 cursor-pointer">
        <ChevronRight class="w-4 h-4" />
      </PaginationNext>
    </PaginationContent>
  </Pagination>
</template>

<style scoped>
:global(.vertical-navbar .flex) {
  display: flex;
  flex-direction: column;
}
</style>
