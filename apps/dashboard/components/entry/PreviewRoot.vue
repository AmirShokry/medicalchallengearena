<script setup lang="ts">
import { inputData } from ".";
import {
	CheckCircle2Icon,
	NotebookPenIcon,
	SquarePenIcon,
} from "lucide-vue-next";

const params = useRoute("entry-system-category").params;
const { $trpc } = useNuxtApp();

const {
	data: previewData,
	error,
	pending,
} = await $trpc.block.get.useQuery({
	system: params.system as string,
	category: params.category as string,
});
if (error.value) {
	console.error("Failed to fetch block data:", error.value.data?.code);
	window.location.href = "/404";
}

function handleEditCase(caseIndex: number) {
	if (!previewData.value || previewData.value.length === 0) return;
	console.log("Editing case with ID:", caseIndex);
	const editedCase = structuredClone(toRaw(previewData.value[caseIndex]));
	inputData.value = editedCase;
}
</script>
<template>
	<section aria-role="preview-section" class="@container/preview-section">
		<ul
			aria-role="list-container"
			class="@max-[200px]/preview-section:hidden grid grid-cols-1 items-center gap-4"
			v-if="!pending">
			<li
				v-for="(cases, index) in previewData"
				:key="cases.id"
				class="bg-muted min-h-100 rounded-sm px-4 pt-2 pb-10 overflow-hidden">
				<Button
					@click="handleEditCase(index)"
					variant="link"
					title="Edit case"
					class="cursor-pointer hover:text-pink-500 !p-y float-right">
					<SquarePenIcon />
				</Button>
				<div
					aria-role="case-item"
					class="p-4 w-full flex gap-1 justify-between items-center">
					<p>{{ cases.body }}</p>
					<ImagesGallery
						v-if="cases.imgUrls.length"
						:img-urls="cases.imgUrls" />
				</div>

				<div
					aria-role="block-container"
					v-for="(question, index) in cases.questions"
					class="flex flex-col gap-1 px-6 py-4 mx-6 mb-2 rounded-sm bg-sidebar overflow-hidden"
					:key="question.id">
					<div
						aria-role="question"
						class="flex items-center gap-1 w-full">
						<p class="text-sm p-2">
							<NotebookPenIcon
								v-if="question.isStudyMode"
								title="Study Mode"
								class="text-sidebar-primary inline mr-1"
								:size="15" />
							<span class="underline underline-offset-2">
								Q#{{ index + 1 }}
							</span>
							{{ question.body }}
						</p>

						<ImagesGallery
							v-if="question.imgUrls.length"
							:img-urls="question.imgUrls" />
					</div>

					<ol
						aria-role="choices-list"
						class="text-sm pb-2 ml-8 list-[upper-alpha]">
						<li
							v-for="choice in question.choices"
							:key="choice.id"
							class="my-1">
							<p class="inline-flex gap-1 items-center">
								{{ choice.body }}
								<CheckCircle2Icon
									v-if="choice.isCorrect"
									class="h-4 w-4 text-success shrink-0" />
							</p>
						</li>
					</ol>

					<div
						aria-role="explanation"
						class="flex gap-1 items-center justify-between px-2 text-sm">
						<p>
							Explanation
							<span class="block my-1">
								{{ question.explanation }}
							</span>
						</p>

						<ImagesGallery
							:imgUrls="question.explanationImgUrls"
							v-if="question.explanationImgUrls.length" />
					</div>
				</div>
			</li>
			<li v-if="previewData?.length === 0" class="preview-item">
				No cases found.
			</li>
		</ul>
	</section>
</template>
