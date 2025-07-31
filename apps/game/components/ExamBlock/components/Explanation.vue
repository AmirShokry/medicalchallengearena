<script setup lang="ts">
// import Gallery from "@client/components/ui/Gallery.vue";
const show = defineModel({ type: Boolean, required: false });
const props = defineProps<{
  imgUrls?: string[] | null;
  body?: string;
  isBlured?: boolean;
}>();

function getExplanationClass() {
  return props.isBlured ? `blur-sm unselectable` : ``;
}

const alteredBody = computed(() =>
  !props.isBlured
    ? props.body
    : `The quick brown fox jumped over the fence.`.repeat(
        Math.min(30, Math.random() * 30)
      )
);
const alteredImgs = computed(() =>
  !props.isBlured ? props.imgUrls : [`https://picsum.photos/200/300`]
);
</script>

<template>
  <div
    :class="getExplanationClass()"
    class="filter relative rounded-md p-4 flex flex-col gap-2"
  >
    <p class="text-lg font-semibold text-primary">Explanation</p>
    <ul
      :class="isBlured ? '' : 'overflow-y-auto thin-scrollbar'"
      class="py-4 px-3 flex flex-col gap-2 max-h-[60vh] text-[0.9rem]"
    >
      <li class="">
        <div
          class="float-right ml-[3px]"
          v-if="imgUrls?.length"
          v-disabled-click="isBlured!"
        >
          <!-- <Gallery class="floating-image" :list="alteredImgs!" /> -->
        </div>
        <pre class="leading-7 hyphens-auto text-wrap font-geist">{{
          alteredBody
        }}</pre>
      </li>
    </ul>
    <div class="mt-auto self-center w-fit">
      <slot name="footer"></slot>
    </div>
  </div>
</template>
