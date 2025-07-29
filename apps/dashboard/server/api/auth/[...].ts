import { NuxtAuthHandler } from "#auth";
import Credentials from "next-auth/providers/credentials";
import { decode, encode } from "next-auth/jwt";
import { appRouter } from "@/server/trpc/routers";
import { setCache, getCache } from "@package/redis";
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

      // @ts-ignore
      authorize: async (credentials) => {
        const { usernameOrEmail, password } = credentials || {};

        const caller = appRouter.createCaller({} as any);
        if (!usernameOrEmail || !password) return null;
        const result = await caller.auth.verifyLogin({
          usernameOrEmail,
          password,
        });
        if (!result) return null;
        if (result.role !== "admin") return null;

        return {
          id: result.id,
          username: result.username,
          email: result.email,
          avatarUrl: result.avatarUrl,
          medPoints: result.medPoints,
          university: result.university,
          role: result.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        Object.assign(token, user);
        // Cache user data in Redis when user first logs in
        const cacheKey = `session:${user.id}`;
        await setCache(cacheKey, JSON.stringify(user), 24 * 60 * 60); // Cache for 24 hours
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        // Try to get fresh user data from Redis cache first
        const cacheKey = `session:${token.id}`;
        const cachedUserData = await getCache(cacheKey);

        if (cachedUserData) {
          // Use cached data if available
          const userData = JSON.parse(cachedUserData);
          Object.assign(session.user, userData);
        } else {
          // Fallback to token data if cache miss
          Object.assign(session.user, token);

          // Re-cache the token data for future requests
          const userDataToCache = {
            id: token.id,
            username: token.username,
            email: token.email,
            avatarUrl: token.avatarUrl,
            medPoints: token.medPoints,
            university: token.university,
            role: token.role,
          };
          await setCache(
            cacheKey,
            JSON.stringify(userDataToCache),
            24 * 60 * 60
          );
        }
      }
      return session;
    },
  },
  jwt: {
    encode,
    decode,
  },
  pages: {
    signIn: "/login",
  },
});
