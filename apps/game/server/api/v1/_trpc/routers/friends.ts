import { type PlayerData } from "@package/types";
import { z } from "zod";
import {
	and,
	eq,
	like,
	not,
	or,
	sql,
	db,
	notExists,
	exists,
} from "@package/database";
import { caseWhen } from "@package/database/helpers";
// import { socialIO } from "..";
import { authProcedure, createTRPCRouter } from "../init";
const { users, users_friends } = db.table;

export const friends = createTRPCRouter({
	list: authProcedure
		.input(z.number().int().min(0).max(500).default(0))
		.query(async ({ ctx, input }) => {
			const FriendsCTE = FriendsCTEg({ userId: ctx.session?.user.id! });
			return await db
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
				.limit(10)
				.offset(input * 10);

			// return getFriendsWithStatuses(friends);
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
			return await db
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
				.limit(10)
				.offset(input.page * 10);
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
								eq(
									users_friends.user2_id,
									ctx.session?.user.id!
								),
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

			console.log("Added record", addedRecord);

			// const { authenticated, ...senderData } = ctx.req.session.data;
			// socialIO
			// 	.to(addedFriend.id.toString())
			// 	.emit("receivedFriendRequest", { ...senderData });
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
			// socialIO
			// 	.to(input.toString())
			// 	.emit("rejectedFriendRequest", { id: ctx.req.session.data.id });
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

// function getFriendsWithStatuses(friends: PlayerData[]) {
// 	const usersStatuses = socialIO.helpers.getUsersStatusById(
// 		friends.map((friend) => friend.id)
// 	);
// 	return friends.map((friend) => ({
// 		...friend,
// 		status: usersStatuses.get(friend.id) || "offline",
// 	}));
// }
