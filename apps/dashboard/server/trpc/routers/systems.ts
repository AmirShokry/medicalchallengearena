import { db, eq, getTableColumns, sql } from "@package/database";
import {
  getTableColumnsExcept,
  jsonAggBuildObject,
} from "@package/database/helpers";
import { createTRPCRouter, authProcedure } from "../init";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const systems = createTRPCRouter({
  categories: authProcedure.query(
    async () =>
      await db
        .select({
          ...getTableColumns(db.table.systems),
          categories: jsonAggBuildObject({
            ...getTableColumnsExcept(db.table.categories, ["system_id"]),
          }),
        })
        .from(db.table.systems)
        .innerJoin(
          db.table.categories,
          eq(db.table.systems.id, db.table.categories.system_id)
        )
        .groupBy(db.table.systems.id)
        .orderBy(db.table.systems.id)
  ),

  // Get all systems with their categories (including systems without categories)
  getAll: authProcedure.query(async () => {
    const systemsData = await db
      .select({
        ...getTableColumns(db.table.systems),
      })
      .from(db.table.systems)
      .orderBy(db.table.systems.id);

    const categoriesData = await db
      .select({
        ...getTableColumns(db.table.categories),
      })
      .from(db.table.categories)
      .orderBy(db.table.categories.id);

    // Get question counts per category via cases_questions junction table
    const questionCounts = await db
      .select({
        categoryId: db.table.cases.category_id,
        count: sql<number>`count(distinct ${db.table.cases_questions.question_id})`,
      })
      .from(db.table.cases)
      .innerJoin(
        db.table.cases_questions,
        eq(db.table.cases.id, db.table.cases_questions.case_id)
      )
      .groupBy(db.table.cases.category_id);

    const countMap = new Map(
      questionCounts.map((q) => [q.categoryId, Number(q.count)])
    );

    return systemsData.map((system) => ({
      ...system,
      categories: categoriesData
        .filter((cat) => cat.system_id === system.id)
        .map((cat) => ({
          ...cat,
          questionCount: countMap.get(cat.id) || 0,
        })),
    }));
  }),

  // Create a new system
  create: authProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const existing = await db
        .select()
        .from(db.table.systems)
        .where(eq(db.table.systems.name, input.name))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A system with this name already exists",
        });
      }

      const [newSystem] = await db
        .insert(db.table.systems)
        .values({ name: input.name })
        .returning();
      return newSystem;
    }),

  // Rename a system
  rename: authProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const existing = await db
        .select()
        .from(db.table.systems)
        .where(eq(db.table.systems.name, input.name))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A system with this name already exists",
        });
      }

      const [updated] = await db
        .update(db.table.systems)
        .set({ name: input.name })
        .where(eq(db.table.systems.id, input.id))
        .returning();
      return updated;
    }),

  // Delete a system
  delete: authProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .delete(db.table.systems)
        .where(eq(db.table.systems.id, input.id));
      return { success: true };
    }),

  // Create a new category
  createCategory: authProcedure
    .input(z.object({ name: z.string().min(1), systemId: z.number() }))
    .mutation(async ({ input }) => {
      const existing = await db
        .select()
        .from(db.table.categories)
        .where(eq(db.table.categories.name, input.name))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A category with this name already exists",
        });
      }

      const [newCategory] = await db
        .insert(db.table.categories)
        .values({ name: input.name, system_id: input.systemId })
        .returning();
      return newCategory;
    }),

  // Rename a category
  renameCategory: authProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const existing = await db
        .select()
        .from(db.table.categories)
        .where(eq(db.table.categories.name, input.name))
        .limit(1);

      if (existing.length > 0 && existing[0].id !== input.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A category with this name already exists",
        });
      }

      const [updated] = await db
        .update(db.table.categories)
        .set({ name: input.name })
        .where(eq(db.table.categories.id, input.id))
        .returning();
      return updated;
    }),

  // Delete a category
  deleteCategory: authProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .delete(db.table.categories)
        .where(eq(db.table.categories.id, input.id));
      return { success: true };
    }),
});
