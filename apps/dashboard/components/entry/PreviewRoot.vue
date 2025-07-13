<script setup lang="ts">
import { type CaseTypes } from ".";
import {
	CheckCircle2Icon,
	NotebookPenIcon,
	SquarePenIcon,
} from "lucide-vue-next";
const props = defineProps<{
	caseType: CaseTypes;
	system: string;
	category: string;
}>();
const inputStore = useInputStore();

const previewStore = usePreviewStore();
await previewStore.fetchPreviewData({
	system: props.system,
	category: props.category,
	caseType: props.caseType,
});

watch(
	() => props.caseType,
	async () => {
		await previewStore.fetchPreviewData({
			system: props.system,
			category: props.category,
			caseType: props.caseType,
		});
	}
);
function handleEditCase(caseIndex: number) {
	if (previewStore.isEmpty) return;

	inputStore.setInput(
		structuredClone(toRaw(previewStore.preview[caseIndex]))
	);
}
</script>
<template>
	<section aria-role="preview-section" class="@container/preview-section">
		<ul
			v-if="!previewStore.error && !previewStore.pending"
			aria-role="list-container"
			class="@max-[200px]/preview-section:hidden grid grid-cols-1 items-center gap-4">
			<li
				v-for="(cases, index) in previewStore.preview"
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
		</ul>
		<div v-else>No data found.</div>
	</section>
</template>
