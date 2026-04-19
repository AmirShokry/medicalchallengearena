import { resolveAvatarUrl, type Gender } from "@/shared/types/common";

/**
 * Resolves a user-like object's avatar to either their custom avatar URL or
 * the gender-based default avatar served from `/assets/`.
 *
 * Pass anything with `avatarUrl` and (optionally) `gender`.
 */
export function getAvatarSrc(
  user?: {
    avatarUrl?: string | null;
    gender?: Gender | null;
  } | null
): string {
  return resolveAvatarUrl({
    avatarUrl: user?.avatarUrl ?? null,
    gender: user?.gender ?? "male",
  });
}

export type AvatarSubject = Parameters<typeof getAvatarSrc>[0];
