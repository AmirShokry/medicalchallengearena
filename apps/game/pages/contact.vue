<script setup lang="ts">
import { toast } from "vue-sonner";
useSeoMeta({
	title: "MCA | Contact Us",
	description: "Get in touch with us for any inquiries or support.",
});
const contact = ref({
	name: "",
	email: "",
	message: "",
});
function formSubmit() {
	toast("Message has been sent succesfully", {
		description: `${new Date()}`,
	});

	Object.assign(contact.value, { name: "", email: "", message: "" });
}
</script>
<template>
	<div class="px-[12svw] font-geist min-h-[60svh]">
		<form
			class="invisible"
			id="contact-us"
			name="contact-us"
			@submit.prevent="formSubmit"></form>
		<h1 class="text-4xl font-bold">Contact us</h1>
		<UiSeparator class="my-4" />
		<div class="grid gap-2 mb-4">
			<UiLabel> Name * </UiLabel>
			<UiInput v-model="contact.name" form="contact-us" required />
		</div>
		<div class="grid gap-2 mb-4">
			<UiLabel> Email * </UiLabel>
			<UiInput
				v-model="contact.email"
				type="email"
				form="contact-us"
				required />
		</div>
		<div class="grid gap-2 mb-4">
			<UiLabel> Message * </UiLabel>
			<UiTextarea
				class="min-h-[10rem]"
				v-model="contact.message"
				required
				form="contact-us" />
		</div>
		<div class="flex items-center justify-end">
			<UiButton class="cursror-pointer" type="submit" form="contact-us"
				>Submit</UiButton
			>
		</div>
	</div>
</template>
