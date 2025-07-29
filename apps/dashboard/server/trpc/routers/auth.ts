import { authProcedure, createTRPCRouter, publicProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { db, getTableColumns, or, eq } from "@package/database";
import { getTableColumnsExcept } from "@package/database/helpers";
import { UsersRanksCTE } from "@package/database/ctes";
import { z } from "zod";
import { getCache, setCache } from "@package/redis";
import bcrypt from "bcrypt";

export const auth = createTRPCRouter({
  getUser: authProcedure.query(async ({ ctx }) => {
    const cacheKey = `user:${(ctx.session?.user as any)?.id}`;
    const cachedUser = await getCache(cacheKey);
    if (cachedUser) return cachedUser as typeof result;

    const [result] = await db
      .select({
        ...getTableColumns(db.table.users),
      })
      .from(db.table.users)
      //@ts-expect-error
      .where(eq(db.table.users.id, ctx.session?.user?.id))
      .limit(1);

    await setCache(cacheKey, result, 600);
    return result;
  }),
  verifyLogin: publicProcedure
    .input(
      z.object({
        usernameOrEmail: z.string().min(4),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const { users, users_auth } = db.table;

      const [user] = await db
        .with(UsersRanksCTE)
        .select({
          ...getTableColumns(users),
          ...getTableColumnsExcept(users_auth, ["user_id"]),
        })
        .from(users)
        .innerJoin(users_auth, eq(users.id, users_auth.user_id))
        .where(
          or(
            eq(users.username, input.usernameOrEmail),
            eq(users.email, input.usernameOrEmail)
          )
        )
        .limit(1);

      if (!user)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "L#1:Invalid username or password",
        });

      const isPasswordMatch = await bcrypt.compare(
        input.password,
        user.password
      );
      if (!isPasswordMatch)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "L#1:Invalid username or password",
        });

      const { password, ...userdata } = { ...user, password: undefined };

      return userdata;
    }),
});
