<script setup lang="ts">
import { Upload, Trash2, Loader2 } from "lucide-vue-next";
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
  </main>
</template>
