<script setup lang="ts">
import logo_grey_static from "@/assets/images/logo-grey-static.webp";
import { sounds } from "~/composables/audio.client";

sounds.match_found.loop = true;
const soundPromise = sounds.match_found.play();
const emit = defineEmits(["accept", "decline"]);
const visibleInnerCirclePathIndex = ref(1);
const $$game = useGameStore();
const animationInterval = setInterval(function repeat() {
  if ($$game.players.user.flags.hasAccepted) {
    visibleInnerCirclePathIndex.value = 4;

    return clearInterval(animationInterval);
  }
  visibleInnerCirclePathIndex.value =
    (visibleInnerCirclePathIndex.value + 1) % 5;
}, 400);

function handleAccept() {
  soundPromise.then(() => {
    sounds.match_found.pause();
    sounds.match_found.currentTime = 0;
  });
  emit("accept");
}

function handleDecline() {
  soundPromise.then(() => {
    sounds.match_found.pause();
    sounds.match_found.currentTime = 0;
  });
  emit("decline");
}

onUnmounted(() => {
  clearInterval(animationInterval);
  soundPromise.then(() => {
    sounds.match_found.pause();
    sounds.match_found.currentTime = 0;
  });
});
</script>
<template>
  <div
    class="fixed w-full h-full left-0 top-0 z-[999999] py-20 bg-black bg-opacity-85"
  >
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 668 668"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
    >
      <g>
        <path
          class="animate-pulse"
          d="M668 334C668 518.463 518.463 668 334 668C149.537 668 0 518.463 0 334C0 149.537 149.537 0 334 0C518.463 0 668 149.537 668 334Z"
          fill="url(#paint0)"
        />
        <path
          d="M609 334C609 485.326 485.878 608 334 608C182.122 608 59 485.326 59 334C59 182.674 182.122 60 334 60C485.878 60 609 182.674 609 334Z"
          fill="url(#paint1)"
        />

        <Transition name="fade">
          <path
            v-if="visibleInnerCirclePathIndex === 3"
            class="inner-circle-line3"
            fill="url(#inner-circle-line3)"
            d="M511.263 574.029C562.244 536.69 600.133 484.206 619.525 424.062C638.917 363.918 638.822 299.187 619.254 239.1C599.685 179.013 561.642 126.641 510.551 89.4515C459.46 52.2624 397.93 32.1563 334.738 32.0009C271.545 31.8455 209.917 51.6489 158.644 88.5864C107.371 125.524 69.0706 177.709 49.2067 237.699C29.3428 297.688 28.9294 362.418 48.0256 422.657C67.1218 482.895 104.752 535.565 155.55 573.154L173.253 549.23C127.495 515.37 93.5983 467.925 76.3967 413.663C59.195 359.401 59.5673 301.092 77.4606 247.054C95.3538 193.016 129.854 146.008 176.041 112.735C222.227 79.4621 277.741 61.6234 334.664 61.7633C391.588 61.9033 447.013 80.0147 493.036 113.514C539.058 147.014 573.327 194.191 590.954 248.316C608.581 302.442 608.667 360.752 591.199 414.928C573.73 469.105 539.6 516.383 493.677 550.018L511.263 574.029Z"
          />
        </Transition>
        <Transition name="fade">
          <path
            v-if="visibleInnerCirclePathIndex === 2"
            class="inner-circle-lines"
            fill="url(#inner-circle-line2)"
            d="M511.263 574.029C562.244 536.69 600.133 484.206 619.525 424.062C638.917 363.918
				638.822 299.187 619.254 239.1C599.685 179.013 561.642 126.641 510.551 89.4515C459.46
				52.2624 397.93 32.1563 334.738 32.0009C271.545 31.8455 209.917 51.6489 158.644
				88.5864C107.371 125.524 69.0706 177.709 49.2067 237.699C29.3428 297.688 28.9294
				362.418 48.0256 422.657C67.1218 482.895 104.752 535.565 155.55 573.154L173.253
				549.23C127.495 515.37 93.5983 467.925 76.3967 413.663C59.195 359.401 59.5673 301.092
				77.4606 247.054C95.3538 193.016 129.854 146.008 176.041 112.735C222.227 79.4621
				277.741 61.6234 334.664 61.7633C391.588 61.9033 447.013 80.0147 493.036
				113.514C539.058 147.014 573.327 194.191 590.954 248.316C608.581 302.442 608.667
				360.751 591.199 414.928C573.73 469.105 539.6 516.383 493.677 550.018L511.263
				574.029Z"
          />
        </Transition>

        <Transition name="fade">
          <path
            v-if="visibleInnerCirclePathIndex === 1"
            class="inner-circle-lines"
            fill="white"
            d="M511.263
				574.029C562.244 536.69 600.132 484.206 619.525 424.063C638.917 363.92 638.822
				299.189 619.254 239.103C599.687 179.017 561.645 126.644 510.555 89.4542C459.464
				52.2645 397.936 32.1575 334.743 32.0009C271.551 31.8443 209.924 51.6461 158.65
				88.582C107.376 125.518 69.075 177.702 49.2095 237.69C29.344 297.679 28.9285 362.408
				48.0225 422.647C67.1164 482.885 104.745 535.556 155.54 573.147L173.245
				549.224C127.489 515.362 93.5935 467.916 76.3938 413.654C59.1942 359.392 59.5684
				301.084 77.4631 247.046C95.3578 193.009 129.859 146.003 176.046 112.731C222.233
				79.4596 277.747 61.6223 334.67 61.7633C391.593 61.9044 447.017 80.0166 493.039
				113.517C539.06 147.017 573.328 194.194 590.955 248.319C608.581 302.444 608.667
				360.753 591.198 414.93C573.73 469.106 539.6 516.383 493.677 550.018L511.263
				574.029Z"
          />
        </Transition>

        <Transition name="fade">
          <path
            v-if="visibleInnerCirclePathIndex === 4"
            class="inner-circle-line4"
            fill="black"
            d="M511.263 574.029C562.244 536.69 600.133 484.206 619.525 424.062C638.917 363.918 638.822 299.187 619.254 239.1C599.685 179.013 561.642 126.641 510.551 89.4515C459.46 52.2624 397.93 32.1563 334.738 32.0009C271.545 31.8455 209.917 51.6489 158.644 88.5864C107.371 125.524 69.0706 177.709 49.2067 237.699C29.3428 297.688 28.9294 362.418 48.0256 422.657C67.1218 482.895 104.752 535.565 155.55 573.154L173.253 549.23C127.495 515.37 93.5983 467.925 76.3967 413.663C59.195 359.401 59.5673 301.092 77.4606 247.054C95.3538 193.016 129.854 146.008 176.041 112.735C222.227 79.4621 277.741 61.6234 334.664 61.7633C391.588 61.9033 447.013 80.0147 493.036 113.514C539.058 147.014 573.327 194.191 590.954 248.316C608.581 302.442 608.667 360.752 591.199 414.928C573.73 469.105 539.6 516.383 493.677 550.018L511.263 574.029Z"
          />
        </Transition>
        <path
          d="M509.246 575.506L510.723 577.523L512.74 576.046C564.146 538.396 602.35 485.475 621.904 424.83C641.458 364.186 641.363 298.916 621.632 238.329C601.901 177.742 563.542 124.932 512.026 87.4329C460.51 49.9334 398.468 29.6588 334.75 29.5009C271.031 29.343 208.89 49.3098 157.189 86.5536C105.488 123.797 66.8673 176.416 46.8362 236.904C26.8052 297.393 26.3863 362.662 45.6393 423.402C64.8924 484.143 102.834 537.253 154.053 575.157L156.062 576.644L157.55 574.635L170.356 557.329C216.237 590.763 272.807 610.5 334 610.5C394.697 610.5 450.845 591.082 496.526 558.139L509.246 575.506ZM334 605.5C273.917 605.5 218.378 586.127 173.331 553.31L175.254 550.711L176.741 548.701L174.732 547.214C129.399 513.666 95.8175 466.659 78.777 412.899C61.7365 359.138 62.1072 301.37 79.8363 247.832C97.5655 194.295 131.748 147.723 177.507 114.76C223.267 81.7959 278.267 64.1236 334.664 64.2633C391.06 64.4031 445.972 82.3478 491.568 115.538C537.163 148.728 571.114 195.469 588.578 249.093C606.041 302.718 606.126 360.487 588.819 414.163C571.512 467.838 537.698 514.677 492.199 548.001L490.182 549.478L491.66 551.495L493.572 554.106C448.721 586.44 393.596 605.5 334 605.5ZM500.555 555.179C567.924 504.732 611.5 424.439 611.5 334C611.5 181.285 487.25 57.5 334 57.5C180.75 57.5 56.5 181.285 56.5 334C56.5 423.945 99.6006 503.854 166.342 554.349L155.024 569.642C105.665 532.469 69.0886 480.833 50.4056 421.891C31.4708 362.155 31.8828 297.965 51.5827 238.476C71.2827 178.987 109.265 127.239 160.111 90.6105C210.958 53.9824 272.072 34.3456 334.737 34.5009C397.403 34.6562 458.419 54.5957 509.083 91.4754C559.748 128.355 597.472 180.291 616.877 239.877C636.282 299.463 636.376 363.654 617.145 423.296C598.17 482.145 561.338 533.598 511.796 570.526L500.555 555.179ZM497.601 551.145L497.164 550.548C542.498 516.703 576.204 469.581 593.578 415.697C599.049 398.728 602.814 381.356 604.873 363.835C596.484 440.304 556.221 507.232 497.601 551.145ZM169.316 550.329C111.282 506.405 71.4629 439.831 63.1262 363.831C65.1329 380.909 68.7606 397.846 74.0107 414.409C91.1176 468.379 124.589 515.667 169.755 549.737L169.316 550.329ZM665.5 334C665.5 517.082 517.082 665.5 334 665.5C150.918 665.5 2.5 517.082 2.5 334C2.5 150.918 150.918 2.5 334 2.5C517.082 2.5 665.5 150.918 665.5 334Z"
          stroke="#DCDCDC"
          stroke-width="5"
        />
        <defs>
          <linearGradient
            id="paint0"
            x1="336.296"
            y1="668"
            x2="331.687"
            y2="0.000105712"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.035" stop-color="#9C9C9C" />
            <stop offset="1" stop-opacity="0.7" />
          </linearGradient>
          <linearGradient
            id="paint1"
            x1="336.296"
            y1="668"
            x2="331.687"
            y2="9.02564e-05"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0.035" stop-color="#9C9C9C" />
            <stop offset="1" stop-opacity="0.7" />
          </linearGradient>
          <linearGradient
            id="inner-circle-line3"
            x1="260"
            y1="458"
            x2="520.5"
            y2="542"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="white" stop-opacity="0" />
            <stop offset="1" stop-color="white" />
          </linearGradient>
          <linearGradient
            id="inner-circle-line2"
            x1="486"
            y1="606.5"
            x2="520.5"
            y2="542"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="white" stop-opacity="0" />
            <stop offset="1" stop-color="white" />
          </linearGradient>
          <linearGradient
            id="inner-circle-line"
            x1="521"
            y1="608.5"
            x2="520.5"
            y2="542"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="white" stop-opacity="0" />
            <stop offset="1" stop-color="white" />
          </linearGradient>
        </defs>
      </g>

      <rect
        fill="url(#logo-pattern)"
        name="logo"
        x="151"
        y="157"
        width="366"
        height="315.368"
        fill-opacity="0.05"
      />

      <g class="button-containers">
        <g
          aria-role="decline-button"
          class="cursor-pointer origin-bottom hover:scale-105"
          name="decline"
          @click="handleDecline"
        >
          <path
            id="decline-fill"
            class="hover:!fill-red-200"
            d="M219.421 630.5L199.06 593.5H468.412L447.22 630.5H219.421Z"
            fill="white"
            stroke="#DCDCDC"
            stroke-width="3"
          />
          <text fill="black" font-size="18" x="21%" dy="3.5%">
            <textPath href="#decline-fill">DECLINE</textPath>
          </text>
        </g>
        <g
          aria-role="accept-button"
          filter="url(#accept-filter)"
          :class="
            !$$game.players.user.flags.hasAccepted
              ? 'cursor-pointer origin-bottom hover:scale-95'
              : undefined
          "
          @click="handleAccept"
        >
          <path
            fill="url(#accept-paint)"
            :class="
              !$$game.players.user.flags.hasAccepted
                ? 'hover:fill-black'
                : 'fill-neutral-500'
            "
            id="accept-fill"
            stroke="white"
            stroke-width="5"
            d="M145 589L176.542 539H492.578L522.883 589H145Z"
          />
          <text fill="white" font-size="20" dy="5%" class="unselectable">
            <textPath href="#accept-fill" startOffset="22%">ACCEPT</textPath>
          </text>
        </g>
      </g>
      <text
        filter="url(#matchfound-filter)"
        fill="white"
        x="28.8%"
        y="47.3%"
        font-size="41"
      >
        MATCH FOUND!
      </text>
      <text
        fill="white"
        :font-size="!$$game.players.user.flags.hasAccepted ? 20 : 18"
        :x="!$$game.players.user.flags.hasAccepted ? '42%' : '36%'"
        y="57.4%"
      >
        <tspan filter="url(#unranked-filter)">
          {{
            !$$game.players.user.flags.hasAccepted
              ? "Ranked"
              : "Waiting for opponent"
          }}
        </tspan>
        <tspan v-if="$$game.players.user.flags.hasAccepted">
          <tspan
            class="typewriter"
            filter="url(#unranked-filter)"
            :style="`--char-index: ${i - 1}`"
            v-for="i in 3"
          >
            .
          </tspan>
        </tspan>
      </text>

      <defs>
        <pattern
          id="logo-pattern"
          patternContentUnits="objectBoundingBox"
          width="1"
          height="1"
        >
          <use
            xlink:href="#logo_image"
            transform="matrix(0.0005 0 0 0.000580275 0 -0.000487393)"
          />
        </pattern>
        <image id="logo_image" :href="logo_grey_static" />
        <linearGradient
          id="accept-paint"
          x1="161"
          y1="566.5"
          x2="508.5"
          y2="564.5"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#737373" stop-opacity="0.86" />
          <stop offset="1" />
        </linearGradient>
        <filter
          id="accept-filter"
          x="116.467"
          y="512.5"
          width="434.854"
          height="103"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset />
          <feGaussianBlur stdDeviation="12" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_416_493"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_416_493"
            result="shape"
          />
        </filter>
        <filter
          id="matchfound-filter"
          x="193.46"
          y="286.6"
          width="290"
          height="40"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="3" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_416_493"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_416_493"
            result="shape"
          />
        </filter>
        <filter
          id="unranked-filter"
          x="200"
          y="350"
          width="300"
          height="100"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="2" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_416_493"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_416_493"
            result="shape"
          />
        </filter>
      </defs>
    </svg>
  </div>
</template>

<style scoped>
tspan.typewriter {
  opacity: 0;
  animation: typing 1s steps(50, end) forwards infinite;
  animation-delay: calc(var(--inner-circle-index) * 0.1s);
}
@keyframes typing {
  to {
    opacity: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s linear;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
