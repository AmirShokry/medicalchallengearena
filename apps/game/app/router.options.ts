import type { RouterConfig } from "@nuxt/schema";
export default <RouterConfig>{
  scrollBehavior: (to, from, savedPosition) => {
    // scroll to hash, useful for using to="#some-id" in NuxtLink
    // ex: <NuxtLink to="#top"> To Top </ NuxtLink>

    if (to.hash) {
      // Wait for the element to appear in the DOM (max 1s)
      return new Promise((resolve) => {
        const hash = to.hash;
        let attempts = 0;
        const maxAttempts = 20; // 20 x 50ms = 1s
        function findEl() {
          const el = document.querySelector(hash);
          if (el) {
            resolve({ el: hash, behavior: "instant" });
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(findEl, 50);
          } else {
            // fallback: scroll to top if not found
            resolve({ left: 0, top: 0 });
          }
        }
        findEl();
      });
    }

    // The remainder is optional but maybe useful as well

    // if link is to same page, scroll to top with smooth behavior
    // if (to === from) {
    // 	return {
    // 		left: 0,
    // 		top: 0,
    // 		behavior: "smooth",
    // 	};
    // }

    // this will use saved scroll position on browser forward/back navigation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          left: savedPosition?.left || 0,
          top: savedPosition?.top || 0,
        });
      }, 0);
    });
  },
};
