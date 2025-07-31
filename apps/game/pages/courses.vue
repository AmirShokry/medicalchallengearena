<script setup lang="ts">
import {
  CheckCircle,
  Clock,
  Users,
  BookOpen,
  Play,
  Lock,
  ChevronRight,
  Menu,
  X,
} from "lucide-vue-next";

useSeoMeta({
  title: "MCA | USMLE Step 1 Fundamentals",
  description:
    "Master the fundamentals of medical knowledge for USMLE Step 1 with comprehensive practice questions and detailed explanations.",
});
definePageMeta({
  layout: "blank",
});

// Course data
const currentCourse = ref({
  id: 1,
  title: "USMLE Step 1 Fundamentals",
  description:
    "Master the fundamentals of medical knowledge for USMLE Step 1 with comprehensive practice questions and detailed explanations.",
  progress: 75,
  totalLessons: 24,
  completedLessons: 18,
  duration: "8 weeks",
  difficulty: "Beginner",
  students: 1250,
  isPremium: false,
  isEnrolled: true,
});

// Course curriculum organized by sections
const curriculum = ref([
  {
    id: 1,
    title: "Introduction to Medical Sciences",
    lessons: [
      {
        id: 1,
        title: "Course Overview",
        duration: "5:30",
        completed: true,
        current: true,
        premium: false,
      },
      {
        id: 2,
        title: "Study Strategies for USMLE",
        duration: "12:45",
        completed: true,
        current: false,
        premium: false,
      },
      {
        id: 3,
        title: "Medical Terminology Basics",
        duration: "18:20",
        completed: true,
        current: false,
        premium: false,
      },
      {
        id: 4,
        title: "Understanding Medical Literature",
        duration: "15:10",
        completed: false,
        current: false,
        premium: true,
      },
    ],
  },
  {
    id: 2,
    title: "Anatomy & Physiology",
    lessons: [
      {
        id: 5,
        title: "Cardiovascular System Overview",
        duration: "25:30",
        completed: true,
        current: false,
        premium: false,
      },
      {
        id: 6,
        title: "Heart Anatomy and Function",
        duration: "22:15",
        completed: true,
        current: false,
        premium: false,
      },
      {
        id: 7,
        title: "Blood Circulation Pathways",
        duration: "19:45",
        completed: true,
        current: false,
        premium: false,
      },
      {
        id: 8,
        title: "Cardiac Cycle and ECG Basics",
        duration: "28:20",
        completed: true,
        current: false,
        premium: true,
      },
      {
        id: 9,
        title: "Respiratory System Fundamentals",
        duration: "24:10",
        completed: true,
        current: false,
        premium: false,
      },
      {
        id: 10,
        title: "Gas Exchange Mechanisms",
        duration: "20:35",
        completed: false,
        current: false,
        premium: true,
      },
    ],
  },
  {
    id: 3,
    title: "Pathology Essentials",
    lessons: [
      {
        id: 11,
        title: "Introduction to Pathology",
        duration: "16:40",
        completed: true,
        current: false,
        premium: false,
      },
      {
        id: 12,
        title: "Cellular Injury and Death",
        duration: "21:25",
        completed: true,
        current: false,
        premium: false,
      },
      {
        id: 13,
        title: "Inflammation and Healing",
        duration: "23:15",
        completed: true,
        current: false,
        premium: false,
      },
      {
        id: 14,
        title: "Neoplasia Fundamentals",
        duration: "26:50",
        completed: true,
        current: false,
        premium: true,
      },
      {
        id: 15,
        title: "Cardiovascular Pathology",
        duration: "29:30",
        completed: true,
        current: false,
        premium: false,
      },
      {
        id: 16,
        title: "Respiratory Pathology",
        duration: "27:20",
        completed: false,
        current: false,
        premium: true,
      },
    ],
  },
  {
    id: 4,
    title: "Pharmacology Basics",
    lessons: [
      {
        id: 17,
        title: "Pharmacokinetics Principles",
        duration: "22:10",
        completed: false,
        current: false,
        premium: true,
      },
      {
        id: 18,
        title: "Pharmacodynamics Overview",
        duration: "19:55",
        completed: false,
        current: false,
        premium: false,
      },
      {
        id: 19,
        title: "Drug Interactions",
        duration: "17:30",
        completed: false,
        current: false,
        premium: false,
      },
      {
        id: 20,
        title: "Cardiovascular Drugs",
        duration: "25:45",
        completed: false,
        current: false,
        premium: true,
      },
    ],
  },
  {
    id: 5,
    title: "Practice Questions & Review",
    lessons: [
      {
        id: 21,
        title: "Anatomy Practice Questions",
        duration: "30:00",
        completed: false,
        current: false,
        premium: false,
      },
      {
        id: 22,
        title: "Pathology Practice Questions",
        duration: "35:20",
        completed: false,
        current: false,
        premium: true,
      },
      {
        id: 23,
        title: "Pharmacology Practice Questions",
        duration: "28:15",
        completed: false,
        current: false,
        premium: false,
      },
      {
        id: 24,
        title: "Comprehensive Review",
        duration: "45:30",
        completed: false,
        current: false,
        premium: true,
      },
    ],
  },
]);

// Current lesson
const currentLesson = ref({
  id: 1,
  title: "Course Overview",
  description:
    "Welcome to USMLE Step 1 Fundamentals! In this introductory lesson, we'll cover the course structure, learning objectives, and how to make the most of your study time.",
  videoUrl: "https://example.com/video1",
  duration: "5:30",
  transcript: `Welcome to USMLE Step 1 Fundamentals. This comprehensive course is designed to help you master the essential medical knowledge required for the USMLE Step 1 examination.

Throughout this course, we'll cover four main areas:
1. Introduction to Medical Sciences
2. Anatomy & Physiology
3. Pathology Essentials
4. Pharmacology Basics

Each section builds upon the previous one, creating a solid foundation for your medical knowledge. We'll use a combination of video lectures, interactive diagrams, and practice questions to ensure you understand and retain the material.

The course is structured to be completed over 8 weeks, with approximately 3-4 hours of study time per week. However, you can progress at your own pace and revisit any lessons as needed.

Let's begin your journey to USMLE success!`,
  resources: [
    { name: "Course Syllabus", url: "#", type: "PDF" },
    { name: "Study Schedule Template", url: "#", type: "PDF" },
    { name: "Recommended Reading List", url: "#", type: "PDF" },
  ],
  premium: false,
});

// UI State
const sidebarOpen = ref(false);
const activeTab = ref("overview");

// Computed properties
const totalLessons = computed(() => {
  return curriculum.value.reduce(
    (total, section) => total + section.lessons.length,
    0
  );
});

const completedLessons = computed(() => {
  return curriculum.value.reduce((total, section) => {
    return total + section.lessons.filter((lesson) => lesson.completed).length;
  }, 0);
});

const progressPercentage = computed(() => {
  return Math.round((completedLessons.value / totalLessons.value) * 100);
});

// Methods
function selectLesson(lesson: any) {
  // Update current lesson
  curriculum.value.forEach((section) => {
    section.lessons.forEach((l) => {
      l.current = l.id === lesson.id;
    });
  });

  currentLesson.value = {
    ...lesson,
    description: `Learn about ${lesson.title} in this comprehensive lesson.`,
    videoUrl: `https://example.com/video${lesson.id}`,
    transcript: `This is the transcript for ${lesson.title}...`,
    resources: [
      { name: `${lesson.title} Notes`, url: "#", type: "PDF" },
      { name: `${lesson.title} Quiz`, url: "#", type: "Quiz" },
    ],
  };

  sidebarOpen.value = false;
}

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

function markLessonComplete(lessonId: number) {
  curriculum.value.forEach((section) => {
    const lesson = section.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      lesson.completed = true;
    }
  });
}
</script>

<template>
  <div class="h-screen bg-background font-geist overflow-hidden">
    <header
      class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50"
    >
      <div class="flex h-16 items-center px-4">
        <div class="flex items-center gap-4">
          <!-- Mobile menu button -->
          <UiButton
            variant="ghost"
            size="sm"
            class="md:hidden"
            @click="toggleSidebar"
          >
            <Menu class="h-5 w-5" />
          </UiButton>

          <!-- Logo -->
          <NuxtLink to="/" class="flex items-center gap-2">
            <Logo class="h-8 w-auto" />
          </NuxtLink>

          <!-- Breadcrumb -->
          <div
            class="hidden md:flex items-center gap-2 text-sm text-muted-foreground"
          >
            <NuxtLink to="/courses" class="hover:text-foreground"
              >Courses</NuxtLink
            >
            <ChevronRight class="h-4 w-4" />
            <span class="text-foreground">{{ currentCourse.title }}</span>
          </div>
        </div>

        <div class="ml-auto flex items-center gap-4">
          <!-- Progress indicator -->
          <div class="hidden sm:flex items-center gap-2 text-sm">
            <span class="text-muted-foreground">Progress:</span>
            <span class="font-medium"
              >{{ completedLessons }}/{{ totalLessons }}</span
            >
            <div class="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-300"
                :style="{ width: `${progressPercentage}%` }"
              ></div>
            </div>
            <span class="text-muted-foreground">{{ progressPercentage }}%</span>
          </div>
        </div>
      </div>
    </header>

    <div class="flex h-[calc(100vh-4rem)]">
      <!-- 4rem = header height (h-16) -->
      <aside
        :class="[
          'fixed inset-y-0 left-0 z-40 w-80 bg-background border-r transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ]"
      >
        <!-- Mobile close button -->
        <div class="flex items-center justify-between p-4 border-b md:hidden">
          <h2 class="font-semibold">Course Content</h2>
          <UiButton variant="ghost" size="sm" @click="toggleSidebar">
            <X class="h-5 w-5" />
          </UiButton>
        </div>

        <!-- Course info -->
        <div class="p-4 border-b b">
          <h2 class="font-semibold text-lg mb-2">{{ currentCourse.title }}</h2>
          <div class="space-y-2 text-sm text-muted-foreground">
            <div class="flex justify-between">
              <span>Progress</span>
              <span>{{ progressPercentage }}%</span>
            </div>
            <div class="w-full bg-muted rounded-full h-2">
              <div
                class="bg-primary h-2 rounded-full transition-all duration-300"
                :style="{ width: `${progressPercentage}%` }"
              ></div>
            </div>
            <div class="flex justify-between">
              <span>{{ completedLessons }}/{{ totalLessons }} lessons</span>
              <span>{{ currentCourse.duration }}</span>
            </div>
          </div>
        </div>

        <!-- Curriculum -->
        <div>
          <div class="overflow-y-auto thin-scrollbar h-[calc(100vh-12rem)]">
            <div class="p-4 space-y-4">
              <div
                v-for="section in curriculum"
                :key="section.id"
                class="space-y-2"
              >
                <h3
                  class="font-medium text-sm text-muted-foreground uppercase tracking-wide"
                >
                  {{ section.title }}
                </h3>
                <div class="space-y-1">
                  <button
                    v-for="lesson in section.lessons"
                    :key="lesson.id"
                    @click="selectLesson(lesson)"
                    :class="[
                      'w-full text-left p-3 rounded-lg border transition-colors relative',
                      lesson.current
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'hover:bg-muted border-transparent',
                    ]"
                  >
                    <div class="flex items-center gap-3">
                      <div class="flex-shrink-0">
                        <CheckCircle
                          v-if="lesson.completed"
                          class="h-5 w-5 text-green-500"
                        />
                        <div
                          v-else
                          class="h-5 w-5 rounded-full border-2 border-muted-foreground"
                        />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p
                          class="text-sm font-medium truncate flex items-center gap-1"
                        >
                          {{ lesson.title }}
                          <span
                            v-if="lesson.premium"
                            title="Premium Lesson"
                            class="ml-1"
                          >
                            <svg
                              class="inline h-4 w-4 text-yellow-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <circle cx="10" cy="10" r="8" />
                              <text
                                x="10"
                                y="15"
                                text-anchor="middle"
                                font-size="10"
                                fill="#fff"
                              >
                                ★
                              </text>
                            </svg>
                          </span>
                        </p>
                        <p class="text-xs text-muted-foreground">
                          {{ lesson.duration }}
                        </p>
                      </div>
                      <Play
                        v-if="lesson.current"
                        class="h-4 w-4 text-primary"
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Overlay for mobile -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/50 z-30 md:hidden"
        @click="toggleSidebar"
      ></div>

      <!-- Main content -->
      <main class="flex-1 min-w-0 overflow-auto">
        <div class="max-w-4xl mx-auto p-6">
          <!-- Video player placeholder -->
          <div
            class="aspect-video bg-black rounded-lg mb-6 flex items-center justify-center relative overflow-hidden"
          >
            <div
              class="text-center text-white w-full h-full flex flex-col items-center justify-center"
              :style="
                currentLesson.premium
                  ? 'filter: blur(3px); pointer-events: none; opacity: 0.7;'
                  : ''
              "
            >
              <Play class="h-16 w-16 mx-auto mb-4 opacity-70" />
              <p class="text-lg font-medium">{{ currentLesson.title }}</p>
              <p class="text-sm opacity-70">
                Duration: {{ currentLesson.duration }}
              </p>
            </div>
            <div
              v-if="currentLesson.premium"
              class="absolute inset-0 flex flex-col items-center justify-center z-10"
            >
              <div class="bg-black/60 w-full h-full absolute inset-0"></div>
              <div class="relative z-10 flex flex-col items-center">
                <Lock class="h-12 w-12 text-yellow-400 mb-2" />
                <span class="text-yellow-300 font-bold text-lg"
                  >Premium Lesson</span
                >
                <span class="text-white text-sm mt-1"
                  >Unlock this lesson to view the content</span
                >
              </div>
            </div>
          </div>

          <!-- Lesson content tabs -->
          <div class="border-b mb-6">
            <nav class="flex space-x-8">
              <button
                @click="activeTab = 'overview'"
                :class="[
                  'py-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === 'overview'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ]"
              >
                Overview
              </button>
              <button
                @click="activeTab = 'transcript'"
                :class="[
                  'py-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === 'transcript'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ]"
              >
                Transcript
              </button>
              <button
                @click="activeTab = 'resources'"
                :class="[
                  'py-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === 'resources'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ]"
              >
                Resources
              </button>
            </nav>
          </div>

          <!-- Tab content -->
          <div class="space-y-6">
            <!-- Overview tab -->
            <div v-if="activeTab === 'overview'" class="space-y-6">
              <div>
                <h1 class="text-2xl font-bold mb-4">
                  {{ currentLesson.title }}
                </h1>
                <p class="text-muted-foreground leading-relaxed">
                  {{ currentLesson.description }}
                </p>
              </div>

              <div class="flex gap-4">
                <UiButton @click="markLessonComplete(currentLesson.id)">
                  <CheckCircle class="h-4 w-4 mr-2" />
                  Mark as Complete
                </UiButton>
                <UiButton variant="outline">
                  <BookOpen class="h-4 w-4 mr-2" />
                  Take Notes
                </UiButton>
              </div>

              <pre class="whitespace-break-spaces text-balance font-geist">
The USMLE Step 1 Fundamentals Course is a structured, high-yield program designed to build a strong foundation in the essential biomedical sciences required for success on the United States Medical Licensing Examination (USMLE) Step 1. This course is tailored for medical students and international medical graduates who are beginning their preparation journey or seeking to solidify their understanding of core concepts before transitioning to advanced test-taking strategies.
Through a comprehensive, system-based curriculum, the course covers all major disciplines tested on Step 1, including Anatomy, Physiology, Biochemistry, Microbiology, Immunology, Pathology, Pharmacology, and Behavioral Sciences, as well as foundational concepts in Genetics, Biostatistics, and Epidemiology. Emphasis is placed on integrating basic science knowledge with clinical reasoning, ensuring students can apply fundamental principles to patient-centered scenarios.

Participants will engage in:

  • High-Yield Lectures: Expert-led sessions focusing on frequently tested concepts and essential mechanisms.
  • Interactive Learning: Case-based discussions and quizzes to enhance understanding and retention.
  • Visual Learning Tools: Comprehensive diagrams, flowcharts, and pathology images to simplify complex topics.
  • Concept Integration: Linking physiology and pathology to pharmacological interventions & clinical presentations.
  • Foundational Practice: Exposure to board-style questions with detailed explanations to build test-taking skills.

By the end of the course, students will:

  • Possess a solid understanding of high-yield basic science concepts.
  • Develop critical thinking skills necessary for clinical vignette-style questions.
  • Identify personal strengths and areas for improvement for advanced Step 1 preparation.
  • Lay the groundwork for a more targeted, question-heavy review phase leading up to the exam.

This fundamentals course is ideal for students early in their USMLE journey, those returning after a break from medical studies, or anyone seeking a structured, concept-first approach to mastering Step 1 content.
              </pre>
            </div>

            <!-- Transcript tab -->
            <div v-if="activeTab === 'transcript'" class="space-y-4">
              <h2 class="text-xl font-semibold">Lesson Transcript</h2>
              <div class="prose prose-sm max-w-none">
                <div
                  class="whitespace-pre-line text-muted-foreground leading-relaxed"
                >
                  {{ currentLesson.transcript }}
                </div>
              </div>
            </div>

            <!-- Resources tab -->
            <div v-if="activeTab === 'resources'" class="space-y-4">
              <h2 class="text-xl font-semibold">Additional Resources</h2>
              <div class="grid gap-4">
                <div
                  v-for="resource in currentLesson.resources"
                  :key="resource.name"
                  class="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <BookOpen class="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p class="font-medium">{{ resource.name }}</p>
                      <p class="text-sm text-muted-foreground">
                        {{ resource.type }}
                      </p>
                    </div>
                  </div>
                  <UiButton variant="outline" size="sm"> Download </UiButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
