export default defineNuxtRouteMiddleware(async (to, _) => {
  if (to.name === "entry-system-category") {
    const { $trpc } = useNuxtApp();

    const isValidSystemCategory =
      await $trpc.common.isValidSystemCategory.query({
        system: to.params.system,
        category: to.params.category,
      });

    to.meta.sysTest = isValidSystemCategory;
    if (!isValidSystemCategory) return navigateTo("/404");
  }
});
