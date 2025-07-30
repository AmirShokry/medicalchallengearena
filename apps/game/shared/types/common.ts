export type { PlayerData, RecordObject } from "@package/types";
import type { AppRouter } from "~/server/api/v1/_trpc/routers";
import type { inferRouterOutputs } from "@trpc/server";
import { type DefaultSession } from "next-auth";
export type { DefaultSession } from "next-auth";
export type { DefaultUser } from "next-auth";

export interface AnyUser {
  id: number;
  role: string;
  avatarUrl: string | null;
  username: string;
  email: string;
  medPoints: number;
  university: string;
}
declare module "next-auth" {
  interface Session {
    user: AnyUser & DefaultSession["user"];
  }
  interface User extends AnyUser {}
}

declare module "next-auth/jwt" {
  interface JWT extends AnyUser {}
}
export type MatchingSystemCategories =
  inferRouterOutputs<AppRouter>["systems"]["matchingSystemCategories"];
export type Cases =
  inferRouterOutputs<AppRouter>["block"]["allBlockByCategoriesIds"];
