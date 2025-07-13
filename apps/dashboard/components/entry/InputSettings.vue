<script setup lang="ts">
import {
	DEFALT_QUESTIONS_NUMBER,
	DEFAULT_CHOICES_ROWS,
	DEFAULT_CHOICES_COLUMNS,
	CASE_TYPES,
	DEFAULT_CASE_TYPE,
	DEFAULT_ENTRY_PANEL_SIZE,
	IS_SIDEBAR_OPEN,
} from ".";

import { SettingsIcon } from "lucide-vue-next";
import { z } from "zod";

const questionNumberSchema = z.coerce.number().int().min(1);
const choicesNumberSchema = z.coerce.number().int().min(2);

async function hanldeQuestionsNumberChange(value: string | number) {
	if (value === "") return;
	const { success } = questionNumberSchema.safeParse(value);
	if (!success) {
		await nextTick();
		DEFALT_QUESTIONS_NUMBER.value = 1;
	}
}

async function handleChoicesChange(
	value: string | number,
	type: "row" | "column"
) {
	if (value === "") return;
	const { success } = choicesNumberSchema.safeParse(value);
	if (!success) {
		await nextTick();
		if (type === "row") DEFAULT_CHOICES_ROWS.value = 2;
		else DEFAULT_CHOICES_COLUMNS.value = 2;
	}
}
</script>
<template>
	<Dialog>
		<DialogTrigger>
			<Button variant="secondary">
				<SettingsIcon />
			</Button>
		</DialogTrigger>
		<DialogContent class="max-w-2xl">
			<DialogHeader>
				<DialogTitle>Preferences</DialogTitle>
				<DialogDescription> Default settings </DialogDescription>
			</DialogHeader>
			<div class="grid grid-cols gap-2">
				<Label> Exam type </Label>
				<Select v-model="DEFAULT_CASE_TYPE">
					<SelectTrigger class="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem
							v-for="type in CASE_TYPES"
							:key="type"
							:value="type">
							{{ type }}
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div class="grid grid-cols gap-2">
				<Label> Questions number </Label>
				<Input
					tabindex="-1"
					@update:model-value="
						(value) => hanldeQuestionsNumberChange(value)
					"
					@blur="
						DEFALT_QUESTIONS_NUMBER === ('' as any)
							? (DEFALT_QUESTIONS_NUMBER = 1)
							: null
					"
					v-model="DEFALT_QUESTIONS_NUMBER" />
			</div>
			<div class="grid grid-cols gap-2">
				<Label> Choices rows </Label>
				<Input
					tabindex="-1"
					v-model="DEFAULT_CHOICES_ROWS"
					@update:model-value="
						(value) => handleChoicesChange(value, 'row')
					"
					@blur="
						DEFAULT_CHOICES_ROWS === ('' as any)
							? (DEFAULT_CHOICES_ROWS = 2)
							: null
					" />
			</div>

			<div class="grid grid-cols gap-2">
				<Label> Choices columns </Label>
				<Input
					tabindex="-1"
					v-model="DEFAULT_CHOICES_COLUMNS"
					@update:model-value="
						(value) => handleChoicesChange(value, 'column')
					"
					@blur="
						DEFAULT_CHOICES_COLUMNS === ('' as any)
							? (DEFAULT_CHOICES_COLUMNS = 2)
							: null
					" />
			</div>

			<Separator />
			<div class="flex items-center space-x-2">
				<Label for="sidebar-visible">Sidebar visible</Label>
				<Switch v-model="IS_SIDEBAR_OPEN" id="sidebar-visible" />
			</div>
			<Separator />
			<div class="flex flex-col gap-4">
				<Label for="entry-panel-size">Entry area size</Label>
				<div class="flex gap-2">
					<Slider
						id="entry-panel-size"
						v-model="DEFAULT_ENTRY_PANEL_SIZE"
						:max="100"
						:step="1" />
					<p class="text-sm">{{ DEFAULT_ENTRY_PANEL_SIZE[0] }}%</p>
				</div>
			</div>
		</DialogContent>
	</Dialog>
</template>
