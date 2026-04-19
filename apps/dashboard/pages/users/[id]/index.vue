<script setup lang="ts">
import { ArrowLeft, RotateCcw, CreditCard, Gamepad2, Mail, KeyRound } from "lucide-vue-next";
import { resolveAvatarUrl, type Gender } from "@package/types";

const route = useRoute("users-id");
const router = useRouter();
const { $trpc } = useNuxtApp();
const userId = computed(() => Number(route.params.id));

// User data
const {
  data: user,
  pending: userPending,
  refresh: refreshUser,
} = $trpc.users.getById.useQuery(computed(() => ({ userId: userId.value })));

// Dialog states
const showResetCasesDialog = ref(false);
const showSubscriptionDialog = ref(false);
const showSendResetEmailDialog = ref(false);
const showSetPasswordDialog = ref(false);
const isResetting = ref(false);
const isTogglingSubscription = ref(false);
const isSendingResetEmail = ref(false);
const isSettingPassword = ref(false);
const newPassword = ref("");
const setPasswordError = ref("");

// Reset user cases
const handleResetCases = async () => {
  isResetting.value = true;
  try {
    const result = await $trpc.users.resetUserCases.mutate({
      userId: userId.value,
    });
    showResetCasesDialog.value = false;
    refreshUser();
    alert(`Successfully deleted ${result.deletedCount} case records.`);
  } catch (error) {
    console.error("Failed to reset user cases", error);
    alert("Failed to reset user cases. Please try again.");
  } finally {
    isResetting.value = false;
  }
};

// Toggle subscription
const handleToggleSubscription = async () => {
  if (!user.value) return;
  isTogglingSubscription.value = true;
  try {
    await $trpc.users.toggleSubscription.mutate({
      userId: userId.value,
      isSubscribed: !user.value.isSubscribed,
    });
    showSubscriptionDialog.value = false;
    refreshUser();
  } catch (error) {
    console.error("Failed to toggle subscription", error);
    alert("Failed to update subscription status. Please try again.");
  } finally {
    isTogglingSubscription.value = false;
  }
};

// Send reset password email
const handleSendResetEmail = async () => {
  isSendingResetEmail.value = true;
  try {
    const result = await $trpc.users.sendResetEmail.mutate({
      userId: userId.value,
    });
    showSendResetEmailDialog.value = false;
    alert(`Password reset email sent to ${result.email}`);
  } catch (error) {
    console.error("Failed to send reset email", error);
    alert("Failed to send reset email. Please try again.");
  } finally {
    isSendingResetEmail.value = false;
  }
};

// Manually set password
const handleSetPassword = async () => {
  if (newPassword.value.length < 6) {
    setPasswordError.value = "Password must be at least 6 characters.";
    return;
  }
  isSettingPassword.value = true;
  setPasswordError.value = "";
  try {
    await $trpc.users.setPassword.mutate({
      userId: userId.value,
      newPassword: newPassword.value,
    });
    showSetPasswordDialog.value = false;
    newPassword.value = "";
    alert("Password updated successfully.");
  } catch (error) {
    console.error("Failed to set password", error);
    alert("Failed to set password. Please try again.");
  } finally {
    isSettingPassword.value = false;
  }
};

const goBack = () => {
  router.push({ name: "users" });
};

const goToGames = () => {
  router.push({ name: "users-id-games", params: { id: userId.value } });
};

// Format date helper
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Calculate win rate
const winRate = computed(() => {
  if (!user.value || !user.value.gamesTotal) return 0;
  return Math.round((user.value.gamesWon! / user.value.gamesTotal) * 100);
});

// Avatar resolution (falls back to gender-specific default)
const displayedAvatar = computed(() =>
  resolveAvatarUrl({
    avatarUrl: user.value?.avatarUrl,
    gender: (user.value?.gender as Gender) ?? "male",
  })
);

// Gender update
const isUpdatingGender = ref(false);
const handleGenderChange = async (newGender: Gender) => {
  if (!user.value || user.value.gender === newGender) return;
  isUpdatingGender.value = true;
  try {
    await $trpc.users.setGender.mutate({
      userId: userId.value,
      gender: newGender,
    });
    refreshUser();
  } catch (error) {
    console.error("Failed to update gender", error);
    alert("Failed to update gender. Please try again.");
  } finally {
    isUpdatingGender.value = false;
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
            <BreadcrumbLink class="cursor-pointer" @click="goBack">
              Users
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator class="hidden md:block" />
          <BreadcrumbItem>
            <BreadcrumbLink>
              {{ user?.username || "Loading..." }}
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  </header>

  <main class="flex flex-1 flex-col gap-4 p-4 px-10 md:px-40 pt-10">
    <!-- Loading state -->
    <div v-if="userPending" class="flex items-center justify-center py-20">
      <div class="text-muted-foreground">Loading user details...</div>
    </div>

    <!-- User details -->
    <div v-else-if="user" class="space-y-6">
      <!-- Back button -->
      <Button variant="ghost" size="sm" @click="goBack">
        <ArrowLeft class="w-4 h-4 mr-2" />
        Back to Users
      </Button>

      <!-- User Profile Card -->
      <Card>
        <CardHeader>
          <div class="flex items-center gap-4">
            <Avatar class="w-20 h-20">
              <AvatarImage :src="displayedAvatar" :alt="user.username" />
              <AvatarFallback>{{
                user.username?.slice(0, 2).toUpperCase()
              }}</AvatarFallback>
            </Avatar>
            <div class="flex-1">
              <CardTitle class="text-2xl">{{ user.username }}</CardTitle>
              <CardDescription>{{ user.email }}</CardDescription>
              <div class="flex items-center gap-2 mt-2 flex-wrap">
                <span
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-medium',
                    user.isSubscribed
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
                  ]"
                >
                  {{ user.isSubscribed ? "Subscribed" : "Not Subscribed" }}
                </span>
                <Select
                  :model-value="user.gender ?? 'male'"
                  :disabled="isUpdatingGender"
                  @update:model-value="(v: any) => handleGenderChange(v as Gender)"
                >
                  <SelectTrigger class="h-7 w-36 text-xs">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="unspecified">Unspecified</SelectItem>
                  </SelectContent>
                </Select>
                <span
                  v-if="user.plan"
                  class="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                >
                  {{ user.plan }}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- User Info -->
            <div class="space-y-3">
              <h3 class="font-semibold text-lg border-b pb-2">User Info</h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">ID:</span>
                  <span class="font-medium">{{ user.id }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">University:</span>
                  <span class="font-medium">{{
                    user.university || "N/A"
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Med School:</span>
                  <span class="font-medium">{{ user.medSchool || "N/A" }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Country:</span>
                  <span class="font-medium">{{ user.country || "N/A" }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Birth Date:</span>
                  <span class="font-medium">{{
                    formatDate(user.birthDate)
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Graduation Year:</span>
                  <span class="font-medium">{{
                    user.graduationYear || "N/A"
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Expected Degree:</span>
                  <span class="font-medium">{{
                    user.expectedDegree || "N/A"
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Exam Date:</span>
                  <span class="font-medium">{{
                    formatDate(user.examDate)
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Game Stats -->
            <div class="space-y-3">
              <h3 class="font-semibold text-lg border-b pb-2">
                Game Statistics
              </h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Total Games:</span>
                  <span class="font-medium">{{ user.gamesTotal || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Games Won:</span>
                  <span class="font-medium text-green-600">{{
                    user.gamesWon || 0
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Win Rate:</span>
                  <span class="font-medium">{{ winRate }}%</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground"
                    >Med Points (Ranked):</span
                  >
                  <span class="font-medium">{{ user.medPoints || 0 }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground"
                    >Med Points (Unranked):</span
                  >
                  <span class="font-medium">{{
                    user.medPointsUnranked || 0
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Solved Cases:</span>
                  <span class="font-medium">{{
                    user.solvedCasesCount || 0
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Question Stats -->
            <div class="space-y-3">
              <h3 class="font-semibold text-lg border-b pb-2">
                Question Statistics
              </h3>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Questions Correct:</span>
                  <span class="font-medium text-green-600">{{
                    user.questionsCorrect || 0
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Questions Total:</span>
                  <span class="font-medium">{{
                    user.questionsTotal || 0
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Accuracy:</span>
                  <span class="font-medium">
                    {{
                      user.questionsTotal
                        ? Math.round(
                            (user.questionsCorrect! / user.questionsTotal) * 100
                          )
                        : 0
                    }}%
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground"
                    >Eliminations Correct:</span
                  >
                  <span class="font-medium text-green-600">{{
                    user.eliminationsCorrect || 0
                  }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Eliminations Total:</span>
                  <span class="font-medium">{{
                    user.eliminationsTotal || 0
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Action Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <!-- View Games -->
        <Card
          class="cursor-pointer hover:bg-accent transition-colors"
          @click="goToGames"
        >
          <CardHeader>
            <CardTitle class="flex items-center gap-2 text-lg">
              <Gamepad2 class="w-5 h-5" />
              View Games
            </CardTitle>
            <CardDescription>
              View all games and review records for this user
            </CardDescription>
          </CardHeader>
        </Card>

        <!-- Reset Cases -->
        <Card
          class="cursor-pointer hover:bg-accent transition-colors border-orange-200 dark:border-orange-800"
          @click="showResetCasesDialog = true"
        >
          <CardHeader>
            <CardTitle
              class="flex items-center gap-2 text-lg text-orange-600 dark:text-orange-400"
            >
              <RotateCcw class="w-5 h-5" />
              Reset Cases
            </CardTitle>
            <CardDescription>
              Reset all solved cases for this user ({{
                user.solvedCasesCount
              }}
              cases)
            </CardDescription>
          </CardHeader>
        </Card>

        <!-- Toggle Subscription -->
        <Card
          class="cursor-pointer hover:bg-accent transition-colors"
          :class="[
            user.isSubscribed
              ? 'border-red-200 dark:border-red-800'
              : 'border-green-200 dark:border-green-800',
          ]"
          @click="showSubscriptionDialog = true"
        >
          <CardHeader>
            <CardTitle
              class="flex items-center gap-2 text-lg"
              :class="[
                user.isSubscribed
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400',
              ]"
            >
              <CreditCard class="w-5 h-5" />
              {{
                user.isSubscribed ? "Remove Subscription" : "Add Subscription"
              }}
            </CardTitle>
            <CardDescription>
              {{
                user.isSubscribed
                  ? "Remove the subscription from this user"
                  : "Add subscription to this user"
              }}
            </CardDescription>
          </CardHeader>
        </Card>

        <!-- Send Reset Password Email -->
        <Card
          class="cursor-pointer hover:bg-accent transition-colors border-blue-200 dark:border-blue-800"
          @click="showSendResetEmailDialog = true"
        >
          <CardHeader>
            <CardTitle
              class="flex items-center gap-2 text-lg text-blue-600 dark:text-blue-400"
            >
              <Mail class="w-5 h-5" />
              Send Reset Email
            </CardTitle>
            <CardDescription>
              Send a password reset link to {{ user.email }}
            </CardDescription>
          </CardHeader>
        </Card>

        <!-- Set Password Manually -->
        <Card
          class="cursor-pointer hover:bg-accent transition-colors border-purple-200 dark:border-purple-800"
          @click="showSetPasswordDialog = true"
        >
          <CardHeader>
            <CardTitle
              class="flex items-center gap-2 text-lg text-purple-600 dark:text-purple-400"
            >
              <KeyRound class="w-5 h-5" />
              Set Password
            </CardTitle>
            <CardDescription>
              Manually set a new password for this user
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>

    <!-- User not found -->
    <div v-else class="flex items-center justify-center py-20">
      <div class="text-muted-foreground">User not found.</div>
    </div>

    <!-- Reset Cases Confirmation Dialog -->
    <Dialog v-model:open="showResetCasesDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset User Cases</DialogTitle>
          <DialogDescription>
            Are you sure you want to reset all solved cases for
            <strong>{{ user?.username }}</strong
            >? This will delete {{ user?.solvedCasesCount || 0 }} case records
            and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button
            variant="outline"
            @click="showResetCasesDialog = false"
            :disabled="isResetting"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            @click="handleResetCases"
            :disabled="isResetting"
          >
            {{ isResetting ? "Resetting..." : "Reset Cases" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Toggle Subscription Confirmation Dialog -->
    <Dialog v-model:open="showSubscriptionDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{
              user?.isSubscribed ? "Remove Subscription" : "Add Subscription"
            }}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to
            {{ user?.isSubscribed ? "remove" : "add" }} the subscription for
            <strong>{{ user?.username }}</strong
            >?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button
            variant="outline"
            @click="showSubscriptionDialog = false"
            :disabled="isTogglingSubscription"
          >
            Cancel
          </Button>
          <Button
            :variant="user?.isSubscribed ? 'destructive' : 'default'"
            :class="
              !user?.isSubscribed ? 'bg-green-600 hover:bg-green-700' : ''
            "
            @click="handleToggleSubscription"
            :disabled="isTogglingSubscription"
          >
            {{
              isTogglingSubscription
                ? "Updating..."
                : user?.isSubscribed
                  ? "Remove"
                  : "Add"
            }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Send Reset Email Confirmation Dialog -->
    <Dialog v-model:open="showSendResetEmailDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Password Reset Email</DialogTitle>
          <DialogDescription>
            A password reset link will be sent to
            <strong>{{ user?.email }}</strong
            >. The link will expire in 15 minutes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button
            variant="outline"
            @click="showSendResetEmailDialog = false"
            :disabled="isSendingResetEmail"
          >
            Cancel
          </Button>
          <Button
            @click="handleSendResetEmail"
            :disabled="isSendingResetEmail"
          >
            {{ isSendingResetEmail ? "Sending..." : "Send Email" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Set Password Dialog -->
    <Dialog v-model:open="showSetPasswordDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Password Manually</DialogTitle>
          <DialogDescription>
            Enter a new password for
            <strong>{{ user?.username }}</strong
            >. The password must be at least 6 characters.
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-3 py-4">
          <Label for="newPassword">New Password</Label>
          <Input
            v-model="newPassword"
            id="newPassword"
            type="password"
            placeholder="Enter new password (min 6 characters)"
            autocomplete="new-password"
          />
          <p v-if="setPasswordError" class="text-sm text-red-500">
            {{ setPasswordError }}
          </p>
        </div>
        <DialogFooter class="gap-2">
          <Button
            variant="outline"
            @click="
              showSetPasswordDialog = false;
              newPassword = '';
              setPasswordError = '';
            "
            :disabled="isSettingPassword"
          >
            Cancel
          </Button>
          <Button
            @click="handleSetPassword"
            :disabled="isSettingPassword || newPassword.length < 6"
          >
            {{ isSettingPassword ? "Saving..." : "Set Password" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </main>
</template>
