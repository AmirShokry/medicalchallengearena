import { NuxtAuthHandler } from "#auth";
import Credentials from "next-auth/providers/credentials";
import { decode, encode } from "next-auth/jwt";
import { appRouter } from "@/server/api/v1/_trpc/routers";
const CredentialsProvider = ((Credentials as any).default ||
  Credentials) as typeof Credentials;

export default NuxtAuthHandler({
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
        const caller = appRouter.createCaller({} as any);
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
      return token;
    },
    async session({ session, token }) {
      if (session.user) Object.assign(session.user, token);
      return session;
    },
  },
  jwt: {
    encode,
    decode,
  },
  pages: {
    newUser: "/register", // Will disable the new account creation screen
    signIn: "/login",
  },
});
