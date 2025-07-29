import { TRPCError } from "@trpc/server";
import { authProcedure, createTRPCRouter } from "../init";
import { and, db, eq, sql } from "@package/database";
import { getCache, setCache } from "@package/redis";

import z from "zod";
export const common = createTRPCRouter({
  isValidSystemCategory: authProcedure
    .input(
      z.object({
        system: z.string(),
        category: z.string(),
      })
    )
    .query(async ({ input }) => {
      const cacheKey = `validSystemCategory:${input.system}:${input.category}`;
      const cachedResult = await getCache(cacheKey);
      if (cachedResult) return cachedResult as boolean;

      const result = await db
        .selectDistinct()
        .from(db.table.systems)
        .innerJoin(
          db.table.categories,
          eq(db.table.systems.id, db.table.categories.system_id)
        )
        .where(
          and(
            eq(db.table.systems.name, input.system),
            eq(db.table.categories.name, input.category)
          )
        )
        .limit(1);

      await setCache(cacheKey, result, 600);

      if (result.length <= 0) return false;
      return true;
    }),

  getCategoryIdByName: authProcedure
    .input(
      z.object({
        category: z.string(),
      })
    )
    .query(async ({ input }) => {
      const cacheKey = `categoryId:${input.category}`;
      const cachedId = await getCache(cacheKey);
      if (cachedId) return cachedId as number;

      const result = await db
        .selectDistinct({ id: db.table.categories.id })
        .from(db.table.categories)
        .where(eq(db.table.categories.name, input.category))
        .limit(1);
      if (result.length <= 0)
        throw new TRPCError({
          message: "System or category not found",
          code: "NOT_FOUND",
        });
      await setCache(cacheKey, result[0].id, 600);
      return result[0].id;
    }),

  getUsers: authProcedure
    .input(
      z.object({
        offset: z.number().optional().default(0),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      const users = await db
        .select()
        .from(db.table.users)
        .orderBy(db.table.users.id)
        .limit(input.limit)
        .offset(input.offset);

      // Get total count for pagination
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(db.table.users);

      return {
        users,
        totalCount: count,
        hasMore: input.offset + input.limit < count,
        currentPage: Math.floor(input.offset / input.limit) + 1,
        totalPages: Math.ceil(count / input.limit),
      };
    }),
});
