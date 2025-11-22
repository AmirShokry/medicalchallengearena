import { createTRPCRouter, publicProcedure, authProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { db, getTableColumns, or, eq } from "@package/database";
import { UsersRanksCTE } from "@package/database/ctes";
import { z } from "zod";
import bcrypt from "bcrypt";
import { stripe } from "@/server/utils/stripe";
export const auth = createTRPCRouter({
  getSession: authProcedure.query(async ({ ctx }) => {
    return ctx.session;
  }),

  register: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(20),
        email: z.string().email(),
        password: z.string().min(6),
        university: z.string().min(2),
        accessCode: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const { users, users_auth, accessCodes } = db.table;

      const accessCode = await db
        .select()
        .from(accessCodes)
        .where(eq(accessCodes.code, input.accessCode));
      if (!accessCode || accessCode.length === 0)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "R#1:Invalid access code",
        });

      const [existingUser] = await db
        .select()
        .from(users)
        .where(
          or(eq(users.username, input.username), eq(users.email, input.email))
        )
        .limit(1);

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "R#2:Username or email already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 12);

      // Create user transaction
      const result = await db.transaction(async (tx) => {
        // Insert user
        const [newUser] = await tx
          .insert(users)
          .values({
            username: input.username,
            email: input.email,
            university: input.university,
          })
          .returning();

        // const stripeCustomer = await stripe.customers.create({
        //   email: newUser.email,
        // });

        await tx.insert(users_auth).values({
          user_id: newUser.id,
          password: hashedPassword,
          is_subscribed: true,
          // stripe_customer_id: stripeCustomer.id,
        });

        await tx
          .update(accessCodes)
          .set({ used: true })
          .where(eq(accessCodes.code, input.accessCode));

        return newUser;
      });

      const { ...userData } = result;
      return userData;
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
          plan: users_auth.plan,
          isSubscribed: users_auth.is_subscribed,
          password: users_auth.password,
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

  getUserData: authProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id)
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "U#1:401",
      });
    const { users, users_auth } = db.table;

    const [user] = await db
      .with(UsersRanksCTE)
      .select({
        ...getTableColumns(users),
        rank: UsersRanksCTE.rank,
      })
      .from(users)
      .innerJoin(users_auth, eq(users.id, users_auth.user_id))
      .leftJoin(UsersRanksCTE, eq(users.id, UsersRanksCTE.id))
      .where(eq(users.id, ctx.session.user.id))
      .limit(1);

    if (!user)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "U#1:User not found",
      });
    const { password, ...userdata } = { ...user, password: undefined };
    return userdata;
  }),
});
