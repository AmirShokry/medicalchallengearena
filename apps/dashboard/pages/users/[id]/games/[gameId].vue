<script setup lang="ts">
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
} from "lucide-vue-next";

const route = useRoute("users-id-games-gameId");
const router = useRouter();
const { $trpc } = useNuxtApp();

const userId = computed(() => Number(route.params.id));
const gameId = computed(() => Number(route.params.gameId));

// User data
const { data: user } = $trpc.users.getById.useQuery(
  computed(() => ({ userId: userId.value }))
);

// Review data
const {
  data: reviewResult,
  pending,
  error,
} = $trpc.users.getGameReview.useQuery(
  computed(() => ({ userId: userId.value, gameId: gameId.value }))
);

const reviewData = computed(() => reviewResult.value?.reviewData || []);
const cases = computed(() => reviewResult.value?.cases || []);

// Navigation state
const currentQuestionIndex = ref(0);

const currentReview = computed(
  () => reviewData.value[currentQuestionIndex.value]
);
const currentCase = computed(() => {
  if (!currentReview.value || !cases.value.length) return null;
  return cases.value.find((c) => c.id === currentReview.value.caseId);
});
const currentQuestion = computed(() => {
  if (!currentCase.value || !currentReview.value) return null;
  return currentCase.value.questions?.find(
    (q: any) => q.id === currentReview.value.questionId
  );
});

const totalQuestions = computed(() => reviewData.value.length);

const goBack = () => {
  router.push({ name: "users-id-games", params: { id: userId.value } });
};

const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--;
  }
};

const nextQuestion = () => {
  if (currentQuestionIndex.value < totalQuestions.value - 1) {
    currentQuestionIndex.value++;
  }
};

const goToQuestion = (index: number) => {
  currentQuestionIndex.value = index;
};

// Format duration helper
const formatDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

// Get choice class based on selection
const getChoiceClass = (choiceIndex: number, isCorrect: boolean | null) => {
  const selectedIndex = currentReview.value?.nthSelectedChoice;
  const eliminatedChoices = currentReview.value?.nthEliminatedChoices || [];

  const classes = ["p-3 rounded-lg border transition-colors"];

  if (isCorrect) {
    classes.push("border-green-500 bg-green-50 dark:bg-green-900/20");
  } else if (choiceIndex === selectedIndex && !isCorrect) {
    classes.push("border-red-500 bg-red-50 dark:bg-red-900/20");
  } else if (eliminatedChoices.includes(choiceIndex)) {
    classes.push(
      "border-orange-300 bg-orange-50 dark:bg-orange-900/10 line-through opacity-60"
    );
  } else {
    classes.push("border-border");
  }

  return classes.join(" ");
};

// Calculate stats
const stats = computed(() => {
  const correct = reviewData.value.filter((r) => r.isCorrect).length;
  const wrong = reviewData.value.filter((r) => !r.isCorrect).length;
  const totalTime = reviewData.value.reduce(
    (acc, r) => acc + (r.timeSpentMs || 0),
    0
  );
  return {
    correct,
    wrong,
    total: reviewData.value.length,
    accuracy: reviewData.value.length
      ? Math.round((correct / reviewData.value.length) * 100)
      : 0,
    totalTime,
  };
});
</script>

<template>
  <header
    class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
  >
    <div class="flex items-center gap-2 px-4">
      <SidebarTrigger class="-ml-1" />
      <Separator
        orientation="vertical"
        class="mr-2 data-[orientation=vertical]:h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem class="hidden md:block">
            <BreadcrumbLink
              class="cursor-pointer"
              @click="() => router.push({ name: 'users' })"
            >
              Users
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator class="hidden md:block" />
          <BreadcrumbItem class="hidden md:block">
            <BreadcrumbLink
              class="cursor-pointer"
              @click="
                () => router.push({ name: 'users-id', params: { id: userId } })
              "
            >
              {{ user?.username || "User" }}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator class="hidden md:block" />
          <BreadcrumbItem class="hidden md:block">
            <BreadcrumbLink class="cursor-pointer" @click="goBack">
              Games
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator class="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbLink> Game #{{ gameId }} </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  </header>

  <main class="flex flex-1 flex-col gap-4 p-4 px-4 md:px-20 lg:px-40 pt-6">
    <!-- Back button -->
    <Button variant="ghost" size="sm" class="w-fit" @click="goBack">
      <ArrowLeft class="w-4 h-4 mr-2" />
      Back to Games
    </Button>

    <!-- Loading state -->
    <div v-if="pending" class="flex items-center justify-center py-20">
      <div class="text-muted-foreground">Loading review...</div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex items-center justify-center py-20">
      <div class="text-destructive">Failed to load review data.</div>
    </div>

    <!-- Review content -->
    <div v-else-if="reviewData.length > 0" class="space-y-6">
      <!-- Stats Card -->
      <Card>
        <CardHeader class="pb-3">
          <CardTitle class="text-lg"
            >Game #{{ gameId }} Review for {{ user?.username }}</CardTitle
          >
        </CardHeader>
        <CardContent>
          <div class="flex flex-wrap gap-6">
            <div class="flex items-center gap-2">
              <Check class="w-5 h-5 text-green-600" />
              <span class="text-sm">
                <strong>{{ stats.correct }}</strong> correct
              </span>
            </div>
            <div class="flex items-center gap-2">
              <X class="w-5 h-5 text-red-600" />
              <span class="text-sm">
                <strong>{{ stats.wrong }}</strong> wrong
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm">
                Accuracy: <strong>{{ stats.accuracy }}%</strong>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <Clock class="w-5 h-5 text-muted-foreground" />
              <span class="text-sm">
                Total time:
                <strong>{{ formatDuration(stats.totalTime) }}</strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Question Navigation Pills -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(review, index) in reviewData"
          :key="index"
          @click="goToQuestion(index)"
          :class="[
            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
            index === currentQuestionIndex
              ? 'ring-2 ring-primary ring-offset-2'
              : '',
            review.isCorrect
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
          ]"
        >
          {{ index + 1 }}
        </button>
      </div>

      <!-- Current Question -->
      <Card v-if="currentCase && currentQuestion">
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle class="text-lg">
              Question {{ currentQuestionIndex + 1 }} of {{ totalQuestions }}
            </CardTitle>
            <div class="flex items-center gap-4">
              <span
                :class="[
                  'px-3 py-1 rounded-full text-sm font-medium',
                  currentReview?.isCorrect
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
                ]"
              >
                {{ currentReview?.isCorrect ? "Correct" : "Wrong" }}
              </span>
              <span
                class="text-sm text-muted-foreground flex items-center gap-1"
              >
                <Clock class="w-4 h-4" />
                {{ formatDuration(currentReview?.timeSpentMs || 0) }}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- Case Body -->
          <div class="space-y-3">
            <h3 class="font-semibold text-muted-foreground text-sm">Case</h3>
            <div class="p-4 bg-muted/50 rounded-lg">
              <p class="whitespace-pre-wrap">{{ currentCase.body }}</p>
            </div>
            <!-- Case Images -->
            <div
              v-if="currentCase.imgUrls?.length"
              class="flex flex-wrap gap-2"
            >
              <img
                v-for="(url, i) in currentCase.imgUrls"
                :key="i"
                :src="url"
                class="max-h-48 rounded-lg object-contain"
              />
            </div>
          </div>

          <!-- Question Body -->
          <div class="space-y-3">
            <h3 class="font-semibold text-muted-foreground text-sm">
              Question
            </h3>
            <div class="p-4 bg-muted/30 rounded-lg">
              <p class="whitespace-pre-wrap">{{ currentQuestion.body }}</p>
            </div>
          </div>

          <!-- Choices -->
          <div class="space-y-3">
            <h3 class="font-semibold text-muted-foreground text-sm">Choices</h3>
            <div class="space-y-2">
              <div
                v-for="(choice, index) in currentQuestion.choices"
                :key="choice.id"
                :class="getChoiceClass(index, choice.isCorrect)"
              >
                <div class="flex items-start gap-3">
                  <span class="font-medium text-muted-foreground">
                    {{ String.fromCharCode(65 + index) }}.
                  </span>
                  <div class="flex-1">
                    <p>{{ choice.body }}</p>
                    <p
                      v-if="choice.explanation"
                      class="text-sm text-muted-foreground mt-1"
                    >
                      {{ choice.explanation }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <Check
                      v-if="choice.isCorrect"
                      class="w-5 h-5 text-green-600"
                    />
                    <X
                      v-else-if="index === currentReview?.nthSelectedChoice"
                      class="w-5 h-5 text-red-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Explanation -->
          <div v-if="currentQuestion.explanation" class="space-y-3">
            <h3 class="font-semibold text-muted-foreground text-sm">
              Explanation
            </h3>
            <div
              class="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
            >
              <p class="whitespace-pre-wrap">
                {{ currentQuestion.explanation }}
              </p>
            </div>
            <!-- Explanation Images -->
            <div
              v-if="currentQuestion.explanationImgUrls?.length"
              class="flex flex-wrap gap-2"
            >
              <img
                v-for="(url, i) in currentQuestion.explanationImgUrls"
                :key="i"
                :src="url"
                class="max-h-48 rounded-lg object-contain"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter class="flex justify-between">
          <Button
            variant="outline"
            :disabled="currentQuestionIndex === 0"
            @click="prevQuestion"
          >
            <ChevronLeft class="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button
            variant="outline"
            :disabled="currentQuestionIndex === totalQuestions - 1"
            @click="nextQuestion"
          >
            Next
            <ChevronRight class="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>
    </div>

    <!-- No data -->
    <div v-else class="flex items-center justify-center py-20">
      <div class="text-muted-foreground">
        No review data available for this game.
      </div>
    </div>
  </main>
</template>
