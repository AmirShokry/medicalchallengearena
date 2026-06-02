<script setup lang="ts">
/**
 * Lightweight CodeMirror 6 wrapper used by the text-editor data-entry mode.
 * Provides XML syntax highlighting, line numbers, bracket matching and a lint
 * gutter wired to the `diagnostics` prop (used to surface XML syntax errors).
 */
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { placeholder as cmPlaceholder } from "@codemirror/view";
import { xml } from "@codemirror/lang-xml";
import { oneDark } from "@codemirror/theme-one-dark";
import { lintGutter, setDiagnostics, type Diagnostic } from "@codemirror/lint";

const model = defineModel<string>({ required: true });
const props = withDefaults(
  defineProps<{
    diagnostics?: Diagnostic[];
    placeholder?: string;
    readonly?: boolean;
  }>(),
  { diagnostics: () => [], placeholder: "", readonly: false }
);

const host = ref<HTMLElement | null>(null);
let view: EditorView | null = null;
const readonlyCompartment = new Compartment();

function readonlyExtensions(ro: boolean) {
  return [EditorState.readOnly.of(ro), EditorView.editable.of(!ro)];
}

const heightTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px" },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  },
  "&.cm-focused": { outline: "none" },
});

function applyDiagnostics() {
  if (!view) return;
  view.dispatch(setDiagnostics(view.state, props.diagnostics ?? []));
}

onMounted(() => {
  if (!host.value) return;
  const state = EditorState.create({
    doc: model.value,
    extensions: [
      basicSetup,
      xml(),
      oneDark,
      heightTheme,
      lintGutter(),
      EditorView.lineWrapping,
      cmPlaceholder(props.placeholder),
      readonlyCompartment.of(readonlyExtensions(props.readonly)),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged) return;
        const text = update.state.doc.toString();
        if (text !== model.value) model.value = text;
      }),
    ],
  });
  view = new EditorView({ state, parent: host.value });
  applyDiagnostics();
});

// External writes (reset, "insert sample", programmatic edits) → editor.
watch(model, (value) => {
  if (!view) return;
  const current = view.state.doc.toString();
  if (value === current) return;
  view.dispatch({
    changes: { from: 0, to: current.length, insert: value ?? "" },
  });
});

watch(() => props.diagnostics, applyDiagnostics, { deep: true });

watch(
  () => props.readonly,
  (ro) => {
    view?.dispatch({
      effects: readonlyCompartment.reconfigure(readonlyExtensions(ro)),
    });
  }
);

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});

defineExpose({ focus: () => view?.focus() });
</script>

<template>
  <div
    ref="host"
    class="cm-host h-full w-full overflow-hidden rounded-md border border-border"
  />
</template>
