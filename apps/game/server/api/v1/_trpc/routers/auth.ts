import { createTRPCRouter, publicProcedure, authProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { db, getTableColumns, or, eq } from "@package/database";
import { UsersRanksCTE } from "@package/database/ctes";
import { z } from "zod";
import bcrypt from "bcrypt";
import { stripe } from "@/server/utils/stripe";
import { createHmac, timingSafeEqual } from "crypto";
import { getMailTransporter } from "@/server/utils/mailer";

function createResetToken(userId: number, secret: string): string {
  const payload = JSON.stringify({
    userId,
    exp: Date.now() + 15 * 60 * 1000,
  });
  const payloadBase64 = Buffer.from(payload).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("base64url");
  return `${payloadBase64}.${signature}`;
}

function verifyResetToken(
  token: string,
  secret: string
): { userId: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadBase64, signature] = parts;
  if (!payloadBase64 || !signature) return null;

  const expectedSignature = createHmac("sha256", secret)
    .update(payloadBase64)
    .digest("base64url");

  const sigBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(payloadBase64, "base64url").toString()
    );
    if (!payload.userId || !payload.exp) return null;
    if (payload.exp < Date.now()) return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
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

  forgotPassword: publicProcedure
    .input(
      z.object({
        usernameOrEmail: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const { users } = db.table;

      const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(
          or(
            eq(users.username, input.usernameOrEmail),
            eq(users.email, input.usernameOrEmail)
          )
        )
        .limit(1);

      // Always return success to prevent user enumeration
      if (!user) return { success: true };

      const config = useRuntimeConfig();
      const token = createResetToken(user.id, config.authSecret);
      const baseUrl = config.public.NUXT_BASE_URL;
      const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

      const transporter = getMailTransporter();
      await transporter.sendMail({
        from: `"Medical Challenge Arena" <${config.EMAIL_USER}>`,
        to: user.email,
        subject: "Reset Your Password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Password Reset</h2>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
            <p style="color:#666;font-size:13px;">This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });

      return { success: true };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const config = useRuntimeConfig();
      const tokenData = verifyResetToken(input.token, config.authSecret);

      if (!tokenData)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset link.",
        });

      const { users_auth } = db.table;
      const hashedPassword = await bcrypt.hash(input.newPassword, 12);

      const result = await db
        .update(users_auth)
        .set({ password: hashedPassword })
        .where(eq(users_auth.user_id, tokenData.userId));

      return { success: true };
    }),
});
