import { type PlayerData } from "@package/types";
import { z } from "zod";
import {
  and,
  eq,
  ilike,
  inArray,
  like,
  ne,
  not,
  or,
  sql,
  db,
} from "@package/database";
import { caseWhen } from "@package/database/helpers";

import { authProcedure, createTRPCRouter } from "../init";
import { userPresenceMap } from "@/server/socket-handlers/social/presence";
const { users, users_friends } = db.table;

const PAGE_SIZE = 10;

export const friends = createTRPCRouter({
  list: authProcedure
    .input(z.number().int().min(0).max(500).default(0))
    .query(async ({ ctx, input }) => {
      const FriendsCTE = FriendsCTEg({ userId: ctx.session?.user.id! });
      const items = await db
        .with(FriendsCTE)
        .select({
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          medSchool: users.medSchool,
          university: users.university,
          medPoints: users.medPoints,
        })
        .from(FriendsCTE)
        .innerJoin(users, eq(users.id, FriendsCTE.friendId))
        .limit(PAGE_SIZE)
        .offset(input * PAGE_SIZE);

      const TotalCTE = FriendsCTEg({ userId: ctx.session?.user.id! });
      const [{ count = 0 } = { count: 0 }] = await db
        .with(TotalCTE)
        .select({ count: sql<number>`count(*)::int` })
        .from(TotalCTE);

      return { items, total: Number(count) };
    }),
  search: authProcedure
    .input(
      z.object({
        username: z.string().min(1).trim(),
        page: z.number().int().min(0).max(500).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const FriendsCTE = FriendsCTEg({ userId: ctx.session?.user.id! });
      const items = await db
        .with(FriendsCTE)
        .select({
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          medSchool: users.medSchool,
          university: users.university,
          medPoints: users.medPoints,
        })
        .from(FriendsCTE)
        .innerJoin(users, eq(users.id, FriendsCTE.friendId))
        .where(like(users.username, `%${input.username}%`))
        .limit(PAGE_SIZE)
        .offset(input.page * PAGE_SIZE);

      const TotalCTE = FriendsCTEg({ userId: ctx.session?.user.id! });
      const [{ count = 0 } = { count: 0 }] = await db
        .with(TotalCTE)
        .select({ count: sql<number>`count(*)::int` })
        .from(TotalCTE)
        .innerJoin(users, eq(users.id, TotalCTE.friendId))
        .where(like(users.username, `%${input.username}%`));

      return { items, total: Number(count) };
    }),
  /**
   * Returns a paginated list of currently online users (excluding self),
   * with friendship status so the UI can render the correct actions.
   */
  online: authProcedure
    .input(
      z
        .object({
          page: z.number().int().min(0).max(500).default(0),
          search: z.string().trim().default(""),
          /** When true, accepted friends are filtered out of the result set */
          excludeFriends: z.boolean().default(false),
        })
        .default({ page: 0, search: "", excludeFriends: false })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user.id!;

      // Snapshot online users from the in-memory presence map
      let onlineIds: number[] = [];
      for (const presence of userPresenceMap.values()) {
        if (presence.userId !== userId) onlineIds.push(presence.userId);
      }

      if (input.excludeFriends && onlineIds.length > 0) {
        // Remove accepted friends of the current user from the candidate set
        const friendRows = await db
          .select({
            user1_id: users_friends.user1_id,
            user2_id: users_friends.user2_id,
          })
          .from(users_friends)
          .where(
            and(
              eq(users_friends.isFriend, true),
              or(
                and(
                  eq(users_friends.user1_id, userId),
                  inArray(users_friends.user2_id, onlineIds)
                ),
                and(
                  eq(users_friends.user2_id, userId),
                  inArray(users_friends.user1_id, onlineIds)
                )
              )
            )
          );
        const friendIds = new Set<number>(
          friendRows.map((r) => (r.user1_id === userId ? r.user2_id : r.user1_id))
        );
        onlineIds = onlineIds.filter((id) => !friendIds.has(id));
      }

      if (onlineIds.length === 0) {
        return { items: [] as Array<OnlineUser>, total: 0 };
      }

      const whereExpr = input.search
        ? and(
            inArray(users.id, onlineIds),
            ilike(users.username, `%${input.search}%`)
          )
        : inArray(users.id, onlineIds);

      const [{ count = 0 } = { count: 0 }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereExpr);

      const rows = await db
        .select({
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          medSchool: users.medSchool,
          university: users.university,
          medPoints: users.medPoints,
        })
        .from(users)
        .where(whereExpr)
        .orderBy(users.username)
        .limit(PAGE_SIZE)
        .offset(input.page * PAGE_SIZE);

      // Friendship state for the rows on this page
      const pageIds = rows.map((r) => r.id);
      let relations: Array<{
        otherId: number;
        isFriend: boolean;
        direction: "outgoing" | "incoming";
      }> = [];
      if (pageIds.length > 0) {
        const friendRows = await db
          .select({
            user1_id: users_friends.user1_id,
            user2_id: users_friends.user2_id,
            isFriend: users_friends.isFriend,
          })
          .from(users_friends)
          .where(
            or(
              and(
                eq(users_friends.user1_id, userId),
                inArray(users_friends.user2_id, pageIds)
              ),
              and(
                eq(users_friends.user2_id, userId),
                inArray(users_friends.user1_id, pageIds)
              )
            )
          );
        relations = friendRows.map((r) => ({
          otherId: r.user1_id === userId ? r.user2_id : r.user1_id,
          isFriend: r.isFriend,
          direction: r.user1_id === userId ? "outgoing" : "incoming",
        }));
      }

      const relMap = new Map(relations.map((r) => [r.otherId, r]));
      const items: OnlineUser[] = rows.map((row) => {
        const rel = relMap.get(row.id);
        const presence = userPresenceMap.get(row.id);
        return {
          ...row,
          status: presence?.status ?? "online",
          isFriend: !!rel?.isFriend,
          requestStatus: !rel
            ? "none"
            : rel.isFriend
              ? "friend"
              : rel.direction === "outgoing"
                ? "outgoing"
                : "incoming",
        };
      });

      return { items, total: Number(count) };
    }),
  requests: {
    all: authProcedure.query(async ({ ctx }) => {
      const [result] = await db.execute<{
        outgoing: PlayerData[];
        incoming: PlayerData[];
      }>(
        sql`
				SELECT COALESCE(JSONB_AGG(jsonb_build_object('id', subq.id,'username', subq.username, 'avatarUrl', subq.avatar_url, 'university', subq.university, 'medSchool', subq.med_school, 'medPoints', subq.med_points)) 
				FILTER (WHERE request_type = 'outgoing'),'[]'::jsonb)
				as outgoing,

				COALESCE(JSONB_AGG(jsonb_build_object('id', subq.id,'username', subq.username, 'avatarUrl', subq.avatar_url, 'university', subq.university, 'medSchool', subq.med_school, 'medPoints', subq.med_points)) 
				FILTER (WHERE request_type = 'incoming'),'[]'::jsonb)
				as incoming

				FROM
				(
					(
						SELECT 'outgoing' as request_type, *
						FROM ${users_friends} 
						JOIN ${users}  ON ${users.id} = ${users_friends.user2_id}
						WHERE ${users_friends.user1_id} = ${ctx.session?.user.id!} AND NOT ${users_friends.isFriend}
						LIMIT 10
					)
					UNION ALL
					(
						SELECT 'incoming' as request_type, *
						FROM ${users_friends} 
						JOIN ${users}  ON ${users.id} = ${users_friends.user1_id}
						WHERE ${users_friends.user2_id} = ${ctx.session?.user.id!} AND NOT ${users_friends.isFriend}
						LIMIT 10
					)
				) as subq
			`
      );
      return result;
    }),
    outgoing: authProcedure
      .input(z.number().int().min(0).max(500).default(0))
      .query(async ({ ctx }) => {
        return await db
          .select({
            id: users.id,
            username: users.username,
            avatarUrl: users.avatarUrl,
            medSchool: users.medSchool,
            university: users.university,
          })
          .from(users_friends)
          .where(
            and(
              eq(users_friends.user1_id, ctx.session?.user.id!),
              not(users_friends.isFriend)
            )
          )
          .innerJoin(users, eq(users_friends.user2_id, users.id));
      }),
    incoming: authProcedure
      .input(z.number().int().min(0).max(500).default(0))
      .query(
        async ({ ctx }) =>
          await db
            .select({
              id: users.id,
              username: users.username,
              avatarUrl: users.avatarUrl,
              medPoints: users.medPoints,
              medSchool: users.medSchool,
              university: users.university,
            })
            .from(users_friends)
            .where(
              and(
                eq(users_friends.user2_id, ctx.session?.user.id!),
                not(users_friends.isFriend)
              )
            )
            .innerJoin(users, eq(users_friends.user1_id, users.id))
      ),
  },
  add: authProcedure
    .input(z.string().min(1))
    .mutation(async ({ ctx, input }) => {
      if (input === ctx.session?.user.username) return; //TODO: Maybe display an error message
      const [addedFriend] = await db
        .select({
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          medSchool: users.medSchool,
          university: users.university,
          medPoints: users.medPoints,
        })
        .from(users)
        .where(eq(users.username, input))
        .limit(1);

      if (!addedFriend) return console.log("User not found");

      const areAlreadyAdded = await db
        .select()
        .from(users_friends)
        .where(
          or(
            and(
              eq(users_friends.user1_id, ctx.session?.user.id!),
              eq(users_friends.user2_id, addedFriend.id)
            ),
            and(
              eq(users_friends.user2_id, ctx.session?.user.id!),
              eq(users_friends.user1_id, addedFriend.id)
            )
          )
        )
        .limit(1);

      if (
        areAlreadyAdded.length != 0 ||
        areAlreadyAdded?.at(0)?.user1_id ||
        areAlreadyAdded?.at(0)?.user2_id
      )
        return console.log("Users are already friends");

      const addedRecord = await db
        .insert(users_friends)
        .values({
          user1_id: ctx.session?.user.id!,
          user2_id: addedFriend.id,
          isFriend: false,
        })
        .returning();
      return { ...addedFriend };
    }),
  remove: authProcedure
    .input(z.number().min(1))
    .mutation(async ({ ctx, input }) => {
      const result = await db
        .delete(users_friends)
        .where(
          or(
            and(
              eq(users_friends.user1_id, ctx.session?.user.id!),
              eq(users_friends.user2_id, input)
            ),
            and(
              eq(users_friends.user2_id, ctx.session?.user.id!),
              eq(users_friends.user1_id, input)
            )
          )
        )
        .returning();
      if (result.length === 0) return false;
    }),
  accept: authProcedure
    .input(z.number().int().min(1))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(users_friends)
        .set({ isFriend: true })
        .where(
          or(
            and(
              eq(users_friends.user1_id, ctx.session?.user.id!),
              eq(users_friends.user2_id, input)
            ),
            and(
              eq(users_friends.user2_id, ctx.session?.user.id!),
              eq(users_friends.user1_id, input)
            )
          )
        );
      return true;
    }),
});

export interface OnlineUser {
  id: number;
  username: string;
  avatarUrl: string | null;
  medSchool: string | null;
  university: string | null;
  medPoints: number | null;
  status: "online" | "offline" | "busy" | "matchmaking" | "ingame";
  isFriend: boolean;
  /** "none" = not added, "outgoing" = current user sent request, "incoming" = received, "friend" = accepted */
  requestStatus: "none" | "outgoing" | "incoming" | "friend";
}

function FriendsCTEg({ userId }: { userId: number }) {
  return db.$with("FriendsCTE").as(
    db
      .select({
        friendId: caseWhen<number>(eq(users_friends.user1_id, userId))
          .then(users_friends.user2_id)
          .else(users_friends.user1_id)
          .as("friendId"),
      })
      .from(users_friends)
      .where(
        and(
          or(
            eq(users_friends.user1_id, userId),
            eq(users_friends.user2_id, userId)
          ),
          eq(users_friends.isFriend, true)
        )
      )
  );
}
