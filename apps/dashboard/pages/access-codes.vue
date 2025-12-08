<script setup lang="ts">
import { Copy, Check } from "lucide-vue-next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const { $trpc } = useNuxtApp();
const offset = ref(0);
const limit = ref(10);

const {
  data: codesData,
  refresh,
  pending,
} = $trpc.common.getAccessCodes.useQuery(
  computed(() => ({
    offset: offset.value,
    limit: limit.value,
  }))
);

const codes = computed(() => codesData.value?.codes || []);
const totalCount = computed(() => codesData.value?.totalCount || 0);
const hasMore = computed(() => codesData.value?.hasMore || false);
const currentPage = computed(() => codesData.value?.currentPage || 1);
const totalPages = computed(() => codesData.value?.totalPages || 1);

const copiedCode = ref<string | null>(null);
const generatedCode = ref<string | null>(null);
const showSuccessDialog = ref(false);

const generateCode = async () => {
  try {
    const newCode = await $trpc.common.generateAccessCode.mutate();
    generatedCode.value = newCode.code;
    showSuccessDialog.value = true;
    refresh();
  } catch (error) {
    console.error("Failed to generate code", error);
  }
};

const copyToClipboard = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code);
    copiedCode.value = code;
    setTimeout(() => {
      copiedCode.value = null;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy: ", err);
  }
};

const nextPage = () => {
  if (hasMore.value) {
    offset.value += limit.value;
  }
};

const prevPage = () => {
  if (offset.value > 0) {
    offset.value = Math.max(0, offset.value - limit.value);
  }
};

const canGoPrev = computed(() => offset.value > 0);
const canGoNext = computed(() => hasMore.value);
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
            <BreadcrumbLink> Access Codes </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  </header>
  <main class="flex flex-1 flex-col gap-4 p-4 px-40 pt-10">
    <div class="bg-muted/50 min-h-[50vh] px-10 py-10 rounded-xl md:min-h-min">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold tracking-tight">Access Codes</h2>
        <Button @click="generateCode"> Generate New Code </Button>
      </div>

      <div v-if="pending" class="flex items-center justify-center py-8">
        <div class="text-muted-foreground">Loading codes...</div>
      </div>
      <div
        v-else-if="!codesData || codes.length === 0"
        class="flex items-center justify-center py-8"
      >
        <div class="text-muted-foreground">No access codes found.</div>
      </div>
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[100px]"> # </TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(code, index) in codes" :key="code.code">
            <TableCell class="font-medium">
              {{ offset + index + 1 }}
            </TableCell>
            <TableCell class="font-mono">{{ code.code }}</TableCell>
            <TableCell>
              <span
                class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                :class="
                  code.used
                    ? 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    : 'border-transparent bg-green-600 text-primary-foreground hover:bg-green-700'
                "
              >
                {{ code.used ? "Used" : "Unused" }}
              </span>
            </TableCell>
            <TableCell class="text-right">
              <Button
                variant="ghost"
                size="icon"
                @click="copyToClipboard(code.code)"
              >
                <Check
                  v-if="copiedCode === code.code"
                  class="h-4 w-4 text-green-600"
                />
                <Copy v-else class="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div
        class="flex items-center items mt-14 w-full"
        v-if="codesData && codes.length > 0"
      >
        <div class="text-sm text-muted-foreground">
          {{ offset + 1 }} to {{ Math.min(offset + limit, totalCount) }} of
          {{ totalCount }} codes
        </div>
        <div class="flex items-center flex-1 justify-center mr-10 gap-2">
          <Button
            variant="outline"
            size="sm"
            :disabled="!canGoPrev || pending"
            @click="prevPage"
          >
            Previous
          </Button>
          <span class="text-sm text-muted-foreground px-2">
            {{ currentPage }} of {{ totalPages }}
          </span>
          <Button
            variant="outline"
            size="sm"
            :disabled="!canGoNext || pending"
            @click="nextPage"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  </main>

  <Dialog v-model:open="showSuccessDialog">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Access Code Generated</DialogTitle>
        <DialogDescription>
          A new access code has been successfully generated. You can copy it
          below.
        </DialogDescription>
      </DialogHeader>
      <div class="flex items-center space-x-2">
        <div class="grid flex-1 gap-2">
          <Label htmlFor="link" class="sr-only"> Link </Label>
          <Input id="link" :defaultValue="generatedCode || ''" readOnly />
        </div>
        <Button
          type="submit"
          size="sm"
          class="px-3"
          @click="generatedCode && copyToClipboard(generatedCode)"
        >
          <span class="sr-only">Copy</span>
          <Copy class="h-4 w-4" />
        </Button>
      </div>
      <DialogFooter class="sm:justify-start">
        <DialogClose as-child>
          <Button type="button" variant="secondary"> Close </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
