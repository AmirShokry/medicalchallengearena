<script setup lang="ts">
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
} from "lucide-vue-next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const { $trpc } = useNuxtApp();

// Fetch systems with categories
const { data: systemsData, refresh, pending } = $trpc.systems.getAll.useQuery();

const systems = computed(() => systemsData.value || []);

// Expanded systems state
const expandedSystems = ref<Set<number>>(new Set());

const toggleSystem = (systemId: number) => {
  if (expandedSystems.value.has(systemId)) {
    expandedSystems.value.delete(systemId);
  } else {
    expandedSystems.value.add(systemId);
  }
};

// Dialog states
const showCreateSystemDialog = ref(false);
const showRenameSystemDialog = ref(false);
const showDeleteSystemDialog = ref(false);
const showCreateCategoryDialog = ref(false);
const showRenameCategoryDialog = ref(false);
const showDeleteCategoryDialog = ref(false);

// Form data
const newSystemName = ref("");
const renameSystemData = ref<{ id: number; name: string } | null>(null);
const deleteSystemData = ref<{ id: number; name: string } | null>(null);

const newCategoryName = ref("");
const newCategorySystemId = ref<number | null>(null);
const renameCategoryData = ref<{ id: number; name: string } | null>(null);
const deleteCategoryData = ref<{ id: number; name: string } | null>(null);

// Confirmation input for delete operations
const deleteSystemConfirmation = ref("");
const deleteCategoryConfirmation = ref("");

// Loading states
const isCreatingSystem = ref(false);
const isRenamingSystem = ref(false);
const isDeletingSystem = ref(false);
const isCreatingCategory = ref(false);
const isRenamingCategory = ref(false);
const isDeletingCategory = ref(false);

// System operations
const openCreateSystemDialog = () => {
  newSystemName.value = "";
  showCreateSystemDialog.value = true;
};

const createSystem = async () => {
  if (!newSystemName.value.trim()) return;
  isCreatingSystem.value = true;
  try {
    await $trpc.systems.create.mutate({ name: newSystemName.value.trim() });
    showCreateSystemDialog.value = false;
    newSystemName.value = "";
    refresh();
  } catch (error: any) {
    console.error("Failed to create system", error);
    alert(error.message || "Failed to create system");
  } finally {
    isCreatingSystem.value = false;
  }
};

const openRenameSystemDialog = (system: { id: number; name: string }) => {
  renameSystemData.value = { ...system };
  showRenameSystemDialog.value = true;
};

const renameSystem = async () => {
  if (!renameSystemData.value || !renameSystemData.value.name.trim()) return;
  isRenamingSystem.value = true;
  try {
    await $trpc.systems.rename.mutate({
      id: renameSystemData.value.id,
      name: renameSystemData.value.name.trim(),
    });
    showRenameSystemDialog.value = false;
    renameSystemData.value = null;
    refresh();
  } catch (error: any) {
    console.error("Failed to rename system", error);
    alert(error.message || "Failed to rename system");
  } finally {
    isRenamingSystem.value = false;
  }
};

const openDeleteSystemDialog = (system: { id: number; name: string }) => {
  deleteSystemData.value = { ...system };
  deleteSystemConfirmation.value = "";
  showDeleteSystemDialog.value = true;
};

const deleteSystem = async () => {
  if (!deleteSystemData.value) return;
  if (deleteSystemConfirmation.value !== deleteSystemData.value.name) return;
  isDeletingSystem.value = true;
  try {
    await $trpc.systems.delete.mutate({ id: deleteSystemData.value.id });
    showDeleteSystemDialog.value = false;
    deleteSystemData.value = null;
    deleteSystemConfirmation.value = "";
    refresh();
  } catch (error: any) {
    console.error("Failed to delete system", error);
    alert(error.message || "Failed to delete system");
  } finally {
    isDeletingSystem.value = false;
  }
};

// Category operations
const openCreateCategoryDialog = (systemId: number) => {
  newCategoryName.value = "";
  newCategorySystemId.value = systemId;
  showCreateCategoryDialog.value = true;
};

const createCategory = async () => {
  if (!newCategoryName.value.trim() || !newCategorySystemId.value) return;
  isCreatingCategory.value = true;
  try {
    await $trpc.systems.createCategory.mutate({
      name: newCategoryName.value.trim(),
      systemId: newCategorySystemId.value,
    });
    showCreateCategoryDialog.value = false;
    newCategoryName.value = "";
    newCategorySystemId.value = null;
    refresh();
  } catch (error: any) {
    console.error("Failed to create category", error);
    alert(error.message || "Failed to create category");
  } finally {
    isCreatingCategory.value = false;
  }
};

const openRenameCategoryDialog = (category: { id: number; name: string }) => {
  renameCategoryData.value = { ...category };
  showRenameCategoryDialog.value = true;
};

const renameCategory = async () => {
  if (!renameCategoryData.value || !renameCategoryData.value.name.trim())
    return;
  isRenamingCategory.value = true;
  try {
    await $trpc.systems.renameCategory.mutate({
      id: renameCategoryData.value.id,
      name: renameCategoryData.value.name.trim(),
    });
    showRenameCategoryDialog.value = false;
    renameCategoryData.value = null;
    refresh();
  } catch (error: any) {
    console.error("Failed to rename category", error);
    alert(error.message || "Failed to rename category");
  } finally {
    isRenamingCategory.value = false;
  }
};

const openDeleteCategoryDialog = (category: { id: number; name: string }) => {
  deleteCategoryData.value = { ...category };
  deleteCategoryConfirmation.value = "";
  showDeleteCategoryDialog.value = true;
};

const deleteCategory = async () => {
  if (!deleteCategoryData.value) return;
  if (deleteCategoryConfirmation.value !== deleteCategoryData.value.name)
    return;
  isDeletingCategory.value = true;
  try {
    await $trpc.systems.deleteCategory.mutate({
      id: deleteCategoryData.value.id,
    });
    showDeleteCategoryDialog.value = false;
    deleteCategoryData.value = null;
    deleteCategoryConfirmation.value = "";
    refresh();
  } catch (error: any) {
    console.error("Failed to delete category", error);
    alert(error.message || "Failed to delete category");
  } finally {
    isDeletingCategory.value = false;
  }
};
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
            <BreadcrumbLink> Systems & Categories </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  </header>

  <main class="flex flex-1 flex-col gap-4 p-4 px-40 pt-10">
    <div class="bg-muted/50 min-h-[50vh] px-10 py-10 rounded-xl md:min-h-min">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold tracking-tight">Systems & Categories</h2>
        <Button @click="openCreateSystemDialog">
          <Plus class="mr-2 h-4 w-4" />
          Add System
        </Button>
      </div>

      <div v-if="pending" class="flex items-center justify-center py-8">
        <div class="text-muted-foreground">Loading systems...</div>
      </div>

      <div
        v-else-if="systems.length === 0"
        class="flex items-center justify-center py-8"
      >
        <div class="text-muted-foreground">
          No systems found. Create your first system to get started.
        </div>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="system in systems"
          :key="system.id"
          class="border rounded-lg overflow-hidden"
        >
          <!-- System Header -->
          <div
            class="flex items-center justify-between p-4 bg-card hover:bg-accent/50 cursor-pointer"
            @click="toggleSystem(system.id)"
          >
            <div class="flex items-center gap-3">
              <component
                :is="
                  expandedSystems.has(system.id) ? ChevronDown : ChevronRight
                "
                class="h-5 w-5 text-muted-foreground"
              />
              <component
                :is="expandedSystems.has(system.id) ? FolderOpen : Folder"
                class="h-5 w-5 text-primary"
              />
              <span class="font-medium">{{ system.name }}</span>
              <span class="text-sm text-muted-foreground">
                ({{ system.categories?.length || 0 }} categories)
              </span>
            </div>
            <div class="flex items-center gap-2" @click.stop>
              <Button
                variant="ghost"
                size="icon"
                @click="openCreateCategoryDialog(system.id)"
                title="Add Category"
              >
                <Plus class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                @click="openRenameSystemDialog(system)"
                title="Rename System"
              >
                <Pencil class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                @click="openDeleteSystemDialog(system)"
                title="Delete System"
              >
                <Trash2 class="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          <!-- Categories List -->
          <div
            v-if="expandedSystems.has(system.id) && system.categories?.length"
            class="border-t bg-muted/30"
          >
            <div
              v-for="category in system.categories"
              :key="category.id"
              class="flex items-center justify-between px-4 py-3 pl-14 hover:bg-accent/30 border-b last:border-b-0"
            >
              <div class="flex items-center gap-2">
                <span>{{ category.name }}</span>
                <span class="text-sm text-muted-foreground">
                  ({{ category.questionCount || 0 }} questions)
                </span>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  @click="openRenameCategoryDialog(category)"
                  title="Rename Category"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  @click="openDeleteCategoryDialog(category)"
                  title="Delete Category"
                >
                  <Trash2 class="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>

          <!-- Empty Categories State -->
          <div
            v-else-if="
              expandedSystems.has(system.id) && !system.categories?.length
            "
            class="border-t bg-muted/30 px-4 py-6 pl-14 text-muted-foreground text-sm"
          >
            No categories in this system. Click the + button to add one.
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Create System Dialog -->
  <Dialog v-model:open="showCreateSystemDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New System</DialogTitle>
        <DialogDescription>
          Enter a name for the new system.
        </DialogDescription>
      </DialogHeader>
      <div class="py-4">
        <Label for="systemName" class="mb-2 block">System Name</Label>
        <Input
          id="systemName"
          v-model="newSystemName"
          placeholder="e.g., Cardiovascular"
          @keyup.enter="createSystem"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showCreateSystemDialog = false">
          Cancel
        </Button>
        <Button
          @click="createSystem"
          :disabled="isCreatingSystem || !newSystemName.trim()"
        >
          {{ isCreatingSystem ? "Creating..." : "Create" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Rename System Dialog -->
  <Dialog v-model:open="showRenameSystemDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Rename System</DialogTitle>
        <DialogDescription>
          Enter a new name for the system.
        </DialogDescription>
      </DialogHeader>
      <div class="py-4">
        <Label for="renameSystemName" class="mb-2 block">System Name</Label>
        <Input
          id="renameSystemName"
          v-model="renameSystemData!.name"
          v-if="renameSystemData"
          placeholder="System name"
          @keyup.enter="renameSystem"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showRenameSystemDialog = false">
          Cancel
        </Button>
        <Button
          @click="renameSystem"
          :disabled="isRenamingSystem || !renameSystemData?.name.trim()"
        >
          {{ isRenamingSystem ? "Saving..." : "Save" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Delete System Dialog -->
  <Dialog v-model:open="showDeleteSystemDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete System</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete "{{ deleteSystemData?.name }}"? This
          will also delete all categories within this system. This action cannot
          be undone.
        </DialogDescription>
      </DialogHeader>
      <div class="py-4">
        <Label for="deleteSystemConfirm" class="mb-2 block">
          Type <span class="font-bold">{{ deleteSystemData?.name }}</span> to
          confirm:
        </Label>
        <Input
          id="deleteSystemConfirm"
          v-model="deleteSystemConfirmation"
          :placeholder="deleteSystemData?.name"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showDeleteSystemDialog = false">
          Cancel
        </Button>
        <Button
          variant="destructive"
          @click="deleteSystem"
          :disabled="
            isDeletingSystem ||
            deleteSystemConfirmation !== deleteSystemData?.name
          "
        >
          {{ isDeletingSystem ? "Deleting..." : "Delete" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Create Category Dialog -->
  <Dialog v-model:open="showCreateCategoryDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New Category</DialogTitle>
        <DialogDescription>
          Enter a name for the new category.
        </DialogDescription>
      </DialogHeader>
      <div class="py-4">
        <Label for="categoryName" class="mb-2 block">Category Name</Label>
        <Input
          id="categoryName"
          v-model="newCategoryName"
          placeholder="e.g., Heart Failure"
          @keyup.enter="createCategory"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showCreateCategoryDialog = false">
          Cancel
        </Button>
        <Button
          @click="createCategory"
          :disabled="isCreatingCategory || !newCategoryName.trim()"
        >
          {{ isCreatingCategory ? "Creating..." : "Create" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Rename Category Dialog -->
  <Dialog v-model:open="showRenameCategoryDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Rename Category</DialogTitle>
        <DialogDescription>
          Enter a new name for the category.
        </DialogDescription>
      </DialogHeader>
      <div class="py-4">
        <Label for="renameCategoryName" class="mb-2 block">Category Name</Label>
        <Input
          id="renameCategoryName"
          v-model="renameCategoryData!.name"
          v-if="renameCategoryData"
          placeholder="Category name"
          @keyup.enter="renameCategory"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showRenameCategoryDialog = false">
          Cancel
        </Button>
        <Button
          @click="renameCategory"
          :disabled="isRenamingCategory || !renameCategoryData?.name.trim()"
        >
          {{ isRenamingCategory ? "Saving..." : "Save" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Delete Category Dialog -->
  <Dialog v-model:open="showDeleteCategoryDialog">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete Category</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete "{{ deleteCategoryData?.name }}"? This
          action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <div class="py-4">
        <Label for="deleteCategoryConfirm" class="mb-2 block">
          Type <span class="font-bold">{{ deleteCategoryData?.name }}</span> to
          confirm:
        </Label>
        <Input
          id="deleteCategoryConfirm"
          v-model="deleteCategoryConfirmation"
          :placeholder="deleteCategoryData?.name"
        />
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showDeleteCategoryDialog = false">
          Cancel
        </Button>
        <Button
          variant="destructive"
          @click="deleteCategory"
          :disabled="
            isDeletingCategory ||
            deleteCategoryConfirmation !== deleteCategoryData?.name
          "
        >
          {{ isDeletingCategory ? "Deleting..." : "Delete" }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
