<script setup lang="ts">
import { toast } from "vue-sonner";
import {
  FileCode2Icon,
  EraserIcon,
  EyeIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  Loader2Icon,
} from "lucide-vue-next";
import type { CaseTypes } from "@/components/entry/Input/Index.vue";
import CodeEditor from "@/components/ui/code-editor/CodeEditor.vue";
import EntryCaseCard from "@/components/entry/CaseCard.vue";

const { caseType, system, category } = defineProps<{
  caseType: CaseTypes;
  system: string;
  category: string;
}>();

const store = useXmlImportStore();
const inputStore = useInputStore();
const previewStore = usePreviewStore();

const showPreview = ref(false);

function onPreview() {
  const ok = store.parse({
    type: caseType,
    category_id: inputStore.activeCategoryId,
  });
  if (ok) showPreview.value = true;
  else
    toast.error("Validation failed", {
      description: "Fix the highlighted problems before importing.",
    });
}

async function onImport() {
  const created = await store.submit({
    type: caseType,
    category_id: inputStore.activeCategoryId,
  });
  if (!created) {
    toast.error("Import failed", {
      description: store.submitError ?? "Please try again.",
    });
    return;
  }
  const count = created.length;
  showPreview.value = false;
  store.reset();
  toast.success(
    `Imported ${count} case${count === 1 ? "" : "s"} successfully.`
  );
  // Reload the live preview panel so the new cases appear immediately.
  await previewStore.fetchPreviewData({ system, category, caseType });
}

function onClear() {
  store.reset();
}
</script>

<template>
  <section
    aria-role="text-editor-section"
    class="h-full flex flex-col p-6 gap-3 min-h-0"
  >
    <!-- Toolbar -->
    <div class="flex items-center gap-2 flex-wrap shrink-0">
      <div class="mr-auto text-xs text-muted-foreground">
        Importing into
        <span class="font-medium text-foreground">{{ system }}</span>
        ›
        <span class="font-medium text-foreground">{{ category }}</span>
        ·
        <span class="font-medium text-featured-foreground">{{ caseType }}</span>
      </div>

      <Button
        variant="secondary"
        size="sm"
        class="cursor-pointer"
        title="Insert a starter template"
        @click="store.insertTemplate()"
      >
        <FileCode2Icon class="mr-1" :size="15" /> Template
      </Button>
      <Button
        variant="secondary"
        size="sm"
        class="cursor-pointer"
        :disabled="!store.hasContent"
        title="Clear the editor"
        @click="onClear"
      >
        <EraserIcon class="mr-1" :size="15" /> Clear
      </Button>
      <Button
        size="sm"
        class="cursor-pointer"
        :disabled="!store.hasContent"
        @click="onPreview"
      >
        <EyeIcon class="mr-1" :size="15" /> Preview &amp; Import
      </Button>
    </div>

    <!-- Editor -->
    <div class="flex-1 min-h-0">
      <CodeEditor
        v-model="store.xmlText"
        :diagnostics="store.diagnostics"
        :readonly="showPreview"
        placeholder="Paste your <cases>…</cases> XML here, or click Template to start."
      />
    </div>

    <!-- Validation problems -->
    <div
      v-if="store.issues.length"
      class="shrink-0 max-h-44 overflow-y-auto thin-scrollbar rounded-md border border-destructive/40 bg-destructive/5 p-3"
    >
      <p
        class="text-sm font-medium text-destructive flex items-center gap-1 mb-2"
      >
        <AlertCircleIcon :size="15" />
        {{ store.issues.length }} problem{{
          store.issues.length === 1 ? "" : "s"
        }}
        found
      </p>
      <ul class="space-y-1">
        <li
          v-for="(issue, i) in store.issues"
          :key="i"
          class="text-xs flex gap-2"
        >
          <span
            class="shrink-0 font-mono rounded bg-destructive/15 text-destructive px-1.5 py-0.5"
          >
            {{ issue.where }}
          </span>
          <span class="text-foreground/90">{{ issue.message }}</span>
        </li>
      </ul>
    </div>

    <!-- Preview / confirm dialog -->
    <Dialog v-model:open="showPreview">
      <DialogContent
        class="!max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <CheckCircle2Icon class="text-success" :size="18" />
            Review before importing
          </DialogTitle>
          <DialogDescription>
            {{ store.summary.cases }} case{{
              store.summary.cases === 1 ? "" : "s"
            }}
            · {{ store.summary.questions }} question{{
              store.summary.questions === 1 ? "" : "s"
            }}
            → {{ system }} / {{ category }} · {{ caseType }}
          </DialogDescription>
        </DialogHeader>

        <div
          class="flex-1 overflow-y-auto thin-scrollbar -mx-2 px-2 space-y-4 py-1"
        >
          <EntryCaseCard
            v-for="caseItem in store.previewCases"
            :key="caseItem.id"
            :item="caseItem"
          />
        </div>

        <DialogFooter class="shrink-0">
          <DialogClose as-child>
            <Button variant="ghost" :disabled="store.submitting"
              >Back to editor</Button
            >
          </DialogClose>
          <Button
            class="cursor-pointer"
            :disabled="store.submitting"
            @click="onImport"
          >
            <Loader2Icon
              v-if="store.submitting"
              class="mr-1 animate-spin"
              :size="15"
            />
            {{
              store.submitting
                ? "Importing…"
                : `Confirm import (${store.summary.cases})`
            }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
</template>
