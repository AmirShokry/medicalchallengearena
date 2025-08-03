import { NuxtAuthHandler } from "#auth";
import Credentials from "next-auth/providers/credentials";
import { decode, encode } from "next-auth/jwt";
import { appRouter } from "@/server/api/v1/_trpc/routers";
import { db, eq, getTableColumns } from "@package/database";
import { getTableColumnsExcept } from "@package/database/helpers";
const CredentialsProvider = ((Credentials as any).default ||
  Credentials) as typeof Credentials;
const caller = appRouter.createCaller({} as any);
type AuthOptions = Parameters<typeof NuxtAuthHandler>[0];
export const authConfig: AuthOptions = {
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: useRuntimeConfig().authSecret,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        usernameOrEmail: { label: "usernameOrEmail", type: "text" },
        password: { label: "Password", type: "password" },
      },
      //@ts-expect-error
      authorize: async (credentials) => {
        const { usernameOrEmail, password } = credentials || {};

        if (!usernameOrEmail || !password) return null;
        const result = await caller.auth.verifyLogin({
          usernameOrEmail,
          password,
        });

        return {
          id: result.id,
          username: result.username,
          email: result.email,
          avatarUrl: result.avatarUrl,
          medPoints: result.medPoints,
          university: result.university,
          isSubscribed: result.isSubscribed,
          plan: result.plan,
          role: "",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) Object.assign(token, user);
      console.log(`session.user ${Math.random()}`, user);

      // else if (!user && token.id) {
      //   const [freshData] = await db
      //     .select({
      //       ...getTableColumnsExcept(db.table.users_auth, [
      //         "password",
      //         "user_id",
      //       ]),
      //     })
      //     .from(db.table.users_auth)
      //     .where(eq(db.table.users_auth.user_id, token.id));
      //   if (freshData) Object.assign(token, freshData);
      // }
      return token;
    },
    async session({ session, token }) {
      session.user = { ...token };

      // if (session.user) Object.assign(session.user, token);
      // console.log(`session.user ${Math.random()}`, session);

      return {
        ...session,
      };
    },
  },

  pages: {
    newUser: "/register", // Will disable the new account creation screen
    signIn: "/login",
  },
};

export default NuxtAuthHandler(authConfig);
