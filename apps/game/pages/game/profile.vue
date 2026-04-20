<script setup lang="ts">
import { Upload, Trash2, Loader2, Save } from "lucide-vue-next";
import { resolveAvatarUrl, type Gender } from "@/shared/types/common";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "vue-sonner";

definePageMeta({ layout: "lobby" });
useSeoMeta({ title: "MCA | Profile" });

const { $trpc } = useNuxtApp();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const fileInput = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const isDeleting = ref(false);
const isUpdatingGender = ref(false);

const gender = computed<Gender>({
  get: () => (user.value?.gender as Gender) ?? "male",
  set: (value) => {
    void updateGender(value);
  },
});

const displayedAvatar = computed(() =>
  resolveAvatarUrl({
    avatarUrl: user.value?.avatarUrl,
    gender: (user.value?.gender as Gender) ?? "male",
  })
);

const hasCustomAvatar = computed(() => !!user.value?.avatarUrl);

async function updateGender(newGender: Gender) {
  if (!user.value) return;
  if (user.value.gender === newGender) return;
  isUpdatingGender.value = true;
  try {
    await $trpc.profile.setGender.mutate({ gender: newGender });
    await userStore.refreshUserData();
    toast.success("Gender updated");
  } catch (err) {
    console.error(err);
    toast.error("Failed to update gender");
  } finally {
    isUpdatingGender.value = false;
  }
}

function pickFile() {
  fileInput.value?.click();
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    toast.error("Image must be 5MB or smaller");
    return;
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  const allowed = ["webp", "png", "jpg", "jpeg", "gif"] as const;
  if (!ext || !(allowed as readonly string[]).includes(ext)) {
    toast.error("Unsupported file type");
    return;
  }

  isUploading.value = true;
  try {
    const { uploadUrl, objectUrl } =
      await $trpc.profile.createAvatarUploadUrl.mutate({
        extension: ext as (typeof allowed)[number],
        contentType: file.type || "application/octet-stream",
      });

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!uploadRes.ok) {
      throw new Error(`Upload failed (${uploadRes.status})`);
    }

    await $trpc.profile.setAvatar.mutate({ avatarUrl: objectUrl });
    await userStore.refreshUserData();
    toast.success("Profile picture updated");
  } catch (err) {
    console.error(err);
    toast.error("Failed to upload profile picture");
  } finally {
    isUploading.value = false;
  }
}

async function deleteAvatar() {
  if (!hasCustomAvatar.value) return;
  isDeleting.value = true;
  try {
    await $trpc.profile.deleteAvatar.mutate();
    await userStore.refreshUserData();
    toast.success("Profile picture removed");
  } catch (err) {
    console.error(err);
    toast.error("Failed to remove profile picture");
  } finally {
    isDeleting.value = false;
  }
}

// --- Personal details ---------------------------------------------------
const DEGREE_OPTIONS = [
  "MD",
  "DO",
  "MBBS",
  "MBChB",
  "PhD",
  "MD/PhD",
  "Other",
] as const;

function toDateInput(value: unknown): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value as any);
  if (isNaN(d.getTime())) return "";
  // Use local date components to avoid TZ shift in <input type="date">
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const detailsForm = ref({
  country: "",
  birthDate: "",
  graduationYear: "",
  expectedDegree: "",
  examDate: "",
});
const isSavingDetails = ref(false);

function syncDetailsFromUser() {
  const u = user.value as any;
  if (!u) return;
  detailsForm.value = {
    country: u.country ?? "",
    birthDate: toDateInput(u.birthDate),
    graduationYear: u.graduationYear ?? "",
    expectedDegree: u.expectedDegree ?? "",
    examDate: toDateInput(u.examDate),
  };
}

watch(user, syncDetailsFromUser, { immediate: true });

async function saveDetails() {
  isSavingDetails.value = true;
  try {
    await $trpc.profile.setDetails.mutate({
      country: detailsForm.value.country || null,
      birthDate: detailsForm.value.birthDate || null,
      graduationYear: detailsForm.value.graduationYear || null,
      expectedDegree: detailsForm.value.expectedDegree || null,
      examDate: detailsForm.value.examDate || null,
    });
    await userStore.refreshUserData();
    toast.success("Profile details updated");
  } catch (err: any) {
    console.error(err);
    toast.error(err?.message || "Failed to update details");
  } finally {
    isSavingDetails.value = false;
  }
}
</script>

<template>
  <main class="flex flex-1 flex-col gap-6 p-6 max-w-3xl mx-auto w-full">
    <Card>
      <CardHeader>
        <CardTitle>Profile picture</CardTitle>
        <CardDescription>
          Upload a custom photo or remove it to use the default avatar for
          your selected gender.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col sm:flex-row items-center gap-6">
        <Avatar class="w-28 h-28">
          <AvatarImage :src="displayedAvatar" :alt="user?.username || ''" />
          <AvatarFallback>
            {{ user?.username?.slice(0, 2).toUpperCase() }}
          </AvatarFallback>
        </Avatar>

        <div class="flex flex-col gap-3 w-full sm:w-auto">
          <input
            ref="fileInput"
            type="file"
            accept="image/webp,image/png,image/jpeg,image/gif"
            class="hidden"
            @change="onFileChange"
          />
          <Button
            :disabled="isUploading"
            class="gap-2"
            @click="pickFile"
          >
            <Loader2 v-if="isUploading" class="w-4 h-4 animate-spin" />
            <Upload v-else class="w-4 h-4" />
            {{ isUploading ? "Uploading..." : "Upload new picture" }}
          </Button>
          <Button
            variant="destructive"
            :disabled="!hasCustomAvatar || isDeleting"
            class="gap-2"
            @click="deleteAvatar"
          >
            <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin" />
            <Trash2 v-else class="w-4 h-4" />
            {{ isDeleting ? "Removing..." : "Remove picture" }}
          </Button>
          <p class="text-xs text-muted-foreground">
            PNG, JPG, GIF or WEBP. Max 5MB.
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Gender</CardTitle>
        <CardDescription>
          Determines the default avatar shown when you have no custom picture.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select v-model="gender" :disabled="isUpdatingGender">
          <SelectTrigger class="w-full sm:w-64">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="unspecified">Unspecified</SelectItem>
          </SelectContent>
        </Select>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Personal details</CardTitle>
        <CardDescription>
          Update your country, key dates, and academic information. Leave any
          field empty to clear it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          class="grid gap-5 sm:grid-cols-2"
          @submit.prevent="saveDetails"
        >
          <div class="flex flex-col gap-2">
            <Label for="country">Country</Label>
            <Input
              id="country"
              v-model="detailsForm.country"
              placeholder="e.g. United States"
              maxlength="100"
              autocomplete="country-name"
            />
          </div>

          <div class="flex flex-col gap-2">
            <Label for="birthDate">Birth date</Label>
            <Input
              id="birthDate"
              v-model="detailsForm.birthDate"
              type="date"
            />
          </div>

          <div class="flex flex-col gap-2">
            <Label for="graduationYear">Graduation year</Label>
            <Input
              id="graduationYear"
              v-model="detailsForm.graduationYear"
              type="number"
              inputmode="numeric"
              min="1950"
              max="2100"
              placeholder="e.g. 2027"
            />
          </div>

          <div class="flex flex-col gap-2">
            <Label for="expectedDegree">Expected degree</Label>
            <Select v-model="detailsForm.expectedDegree">
              <SelectTrigger id="expectedDegree" class="w-full">
                <SelectValue placeholder="Select expected degree" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in DEGREE_OPTIONS"
                  :key="opt"
                  :value="opt"
                >
                  {{ opt }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex flex-col gap-2 sm:col-span-2">
            <Label for="examDate">Exam date</Label>
            <Input id="examDate" v-model="detailsForm.examDate" type="date" />
          </div>

          <div class="sm:col-span-2 flex justify-end">
            <Button
              type="submit"
              :disabled="isSavingDetails"
              class="gap-2"
            >
              <Loader2
                v-if="isSavingDetails"
                class="w-4 h-4 animate-spin"
              />
              <Save v-else class="w-4 h-4" />
              {{ isSavingDetails ? "Saving..." : "Save changes" }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
