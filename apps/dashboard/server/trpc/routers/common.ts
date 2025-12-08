import { TRPCError } from "@trpc/server";
import { authProcedure, createTRPCRouter } from "../init";
import {
  and,
  db,
  eq,
  sql,
  getTableColumns,
  or,
  ilike,
} from "@package/database";
import { getCache, setCache } from "@package/redis";

import z from "zod";
export const common = createTRPCRouter({
  toggleSubscription: authProcedure
    .input(z.object({ userId: z.number(), isSubscribed: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(db.table.users_auth)
        .set({ is_subscribed: input.isSubscribed })
        .where(eq(db.table.users_auth.user_id, input.userId));
      return { success: true };
    }),

  getAccessCodes: authProcedure
    .input(
      z.object({
        offset: z.number().optional().default(0),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      const codes = await db
        .select()
        .from(db.table.accessCodes)
        .limit(input.limit)
        .offset(input.offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(db.table.accessCodes);

      return {
        codes,
        totalCount: count,
        hasMore: input.offset + input.limit < count,
        currentPage: Math.floor(input.offset / input.limit) + 1,
        totalPages: Math.ceil(count / input.limit),
      };
    }),

  generateAccessCode: authProcedure.mutation(async () => {
    const [newCode] = await db
      .insert(db.table.accessCodes)
      .values({})
      .returning();
    return newCode;
  }),

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
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // Build search condition
      const searchCondition = input.search
        ? or(
            ilike(db.table.users.username, `%${input.search}%`),
            ilike(db.table.users.email, `%${input.search}%`),
            ilike(db.table.users.university, `%${input.search}%`)
          )
        : undefined;

      const users = await db
        .select({
          ...getTableColumns(db.table.users),
          isSubscribed: db.table.users_auth.is_subscribed,
        })
        .from(db.table.users)
        .leftJoin(
          db.table.users_auth,
          eq(db.table.users.id, db.table.users_auth.user_id)
        )
        .where(searchCondition)
        .orderBy(db.table.users.id)
        .limit(input.limit)
        .offset(input.offset);

      // Get total count for pagination (with search filter)
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(db.table.users)
        .where(searchCondition);

      return {
        users,
        totalCount: count,
        hasMore: input.offset + input.limit < count,
        currentPage: Math.floor(input.offset / input.limit) + 1,
        totalPages: Math.ceil(count / input.limit),
      };
    }),
});
