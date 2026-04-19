import { TRPCError } from "@trpc/server";
import { authProcedure, createTRPCRouter } from "../init";
import { db, eq } from "@package/database";
import { z } from "zod";
import {
  createUploadPar,
  deleteObject,
  extractObjectNameFromUrl,
} from "@/server/utils/oci";

const ALLOWED_EXTENSIONS = ["webp", "png", "jpg", "jpeg", "gif"] as const;

export const profile = createTRPCRouter({
  /**
   * Generates a Pre-Authenticated upload URL for a user avatar image.
   * The frontend then PUTs the file directly to `uploadUrl`.
   */
  createAvatarUploadUrl: authProcedure
    .input(
      z.object({
        extension: z.enum(ALLOWED_EXTENSIONS),
        contentType: z.string().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id)
        throw new TRPCError({ code: "UNAUTHORIZED" });

      const objectName = `user-images/${ctx.session.user.id}-${Date.now()}.${input.extension}`;
      const par = await createUploadPar({ objectName, ttlMinutes: 15 });

      return {
        uploadUrl: par.uploadUrl,
        objectUrl: par.objectUrl,
        objectName: par.objectName,
        contentType: input.contentType,
      };
    }),

  /**
   * Persists the new avatar URL on the user, deleting any previous custom
   * avatar from the bucket so we don't leak storage.
   */
  setAvatar: authProcedure
    .input(z.object({ avatarUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id)
        throw new TRPCError({ code: "UNAUTHORIZED" });
      const userId = ctx.session.user.id;
      const { users } = db.table;

      const [existing] = await db
        .select({ avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const oldObjectName = existing?.avatarUrl
        ? extractObjectNameFromUrl(existing.avatarUrl)
        : null;

      await db
        .update(users)
        .set({ avatarUrl: input.avatarUrl })
        .where(eq(users.id, userId));

      if (oldObjectName) {
        // Best-effort cleanup; ignore failures.
        deleteObject(oldObjectName).catch(() => {});
      }

      return { success: true, avatarUrl: input.avatarUrl };
    }),

  /**
   * Removes the user's custom avatar (falls back to gender default).
   */
  deleteAvatar: authProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session?.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
    const userId = ctx.session.user.id;
    const { users } = db.table;

    const [existing] = await db
      .select({ avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const oldObjectName = existing?.avatarUrl
      ? extractObjectNameFromUrl(existing.avatarUrl)
      : null;

    await db
      .update(users)
      .set({ avatarUrl: null })
      .where(eq(users.id, userId));

    if (oldObjectName) {
      deleteObject(oldObjectName).catch(() => {});
    }

    return { success: true };
  }),

  /**
   * Updates the user's gender (drives the default avatar fallback).
   */
  setGender: authProcedure
    .input(z.object({ gender: z.enum(["male", "female", "unspecified"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id)
        throw new TRPCError({ code: "UNAUTHORIZED" });
      const { users } = db.table;
      await db
        .update(users)
        .set({ gender: input.gender })
        .where(eq(users.id, ctx.session.user.id));
      return { success: true, gender: input.gender };
    }),
});
