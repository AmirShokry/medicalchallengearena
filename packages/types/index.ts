export type RecordObject = {
  stats: {
    correctAnswersCount: number;
    wrongAnswersCount: number;
    correctEliminationsCount: number;
    wrongEliminationsCount: number;
    totalMedpoints: number;
    totalTimeSpentMs: number;
  };
  data: {
    caseId: number;
    questionId: number;
    nthCase: number;
    nthQuestion: number;
    nthSelectedChoice: number;
    nthEliminatedChoices: number[];
    isCorrect: boolean;
    timeSpentMs?: number;
    medPoints: number;
    categoryId: number;
  }[];
};
export type ReducedRecordObject = Omit<
  RecordObject["data"][0],
  "nthCase" | "nthQuestion" | "medPoints"
>[];

export type Gender = "male" | "female" | "unspecified";

export type PlayerData = {
  id: number;
  username: string;
  medPoints: number;
  avatarUrl: string | null;
  gender?: Gender | null;
  university: string;
};

/**
 * Returns the default avatar URL based on the user's gender.
 * Used as a fallback when a user has no custom avatar uploaded.
 */
export function getDefaultAvatarUrl(gender?: Gender | null): string {
  switch (gender) {
    case "female":
      return "/assets/default-avatar-female-1.webp";
    case "unspecified":
      return "/assets/default-avatar-unspecified-1.webp";
    case "male":
    default:
      return "/assets/default-avatar-male-1.webp";
  }
}

/**
 * Resolves the user's avatar URL, falling back to the gender-specific default.
 */
export function resolveAvatarUrl(opts: {
  avatarUrl?: string | null;
  gender?: Gender | null;
}): string {
  return opts.avatarUrl && opts.avatarUrl.length > 0
    ? opts.avatarUrl
    : getDefaultAvatarUrl(opts.gender);
}

export type ChatMessage = {
  isSelf?: boolean;
  content: string;
};

/**
 * @fileoverview Socket type exports.
 */
