import vDisabledClick from "@/directives/v-disabled-click";
import { vConfirmClick } from "@/directives/v-confirm-click";

export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.vueApp.directive("disabled-click", vDisabledClick);
	nuxtApp.vueApp.directive("confirm-click", vConfirmClick);
});
