/**
 * @fileoverview Most common queries will be placed here;
 */
import {
	caseWhen,
	db,
	sql,
	eq,
	and,
	or,
	getTableColumns,
	inArray,
	notInArray,
	jsonAggBuildObject,
	isNull,
	notExists,
} from ".";

// import type { PlayerData } from "@server/types";

export type Counters = Omit<
	Awaited<ReturnType<typeof getMatchingCasesCountForTwoUsers>>[0] & {
		unusedCount: number;
	},
	"unusedCount1" | "unusedCount2"
>;

export type Cases = Awaited<
	ReturnType<typeof getAllCasesQuestionsChoicesByCategoriesIdsWithOptions>
>;
export type SystemsCategories = Awaited<
	ReturnType<typeof getSystemsCategoriesForTwoUsers>
>;
type SolvedCasesIdsCTE = ReturnType<typeof SolvedCasesIdsCTEGenerator>;

const {
	systems,
	users_friends,
	users,
	cases,
	cases_questions,
	categories,
	choices,
	questions_choices,
	questions,
	accessCodes,
	users_cases,
} = db.table;
const {
	choice_id,
	question_id: q2,
	...question_choices_columns
} = getTableColumns(questions_choices);
const { question_id, case_id, ...cases_questions_columns } =
	getTableColumns(cases_questions);

/** @description Commonly used CTES	 */
export const QuestionsChoicesCTE = db.$with("QuestionsChoicesCTE").as(
	db
		.select({
			...getTableColumns(questions),
			choices: jsonAggBuildObject({
				...getTableColumns(choices),
				...question_choices_columns,
			}).as("choices"),
		})
		.from(questions_choices)
		.innerJoin(questions, eq(questions_choices.question_id, questions.id))
		.innerJoin(choices, eq(questions_choices.choice_id, choices.id))
		.groupBy(questions.id)
);

const CaseQuestionChoicesCTE = db.$with("CaseQuestionChoicesCTE").as(
	db
		.with(QuestionsChoicesCTE)
		.select({
			...getTableColumns(cases),
			questions: jsonAggBuildObject({
				...QuestionsChoicesCTE._.selectedFields,
				...cases_questions_columns,
				imgUrls: sql<
					string[]
				>` COALESCE(${cases_questions_columns.imgUrls}, ARRAY[]::text[])`,
				explanationImgUrls: sql<
					string[]
				>` COALESCE(${cases_questions_columns.explanationImgUrls}, ARRAY[]::text[])`,
			}).as("questions"),
		})
		.from(cases_questions)
		.innerJoin(cases, eq(cases_questions.case_id, cases.id))
		.where(eq(cases_questions.isStudyMode, false))
		.innerJoin(
			QuestionsChoicesCTE,
			eq(cases_questions.question_id, QuestionsChoicesCTE.id)
		)
		.groupBy(cases.id)
);

const CaseQuestionChoicesStudyModeOnlyCTE = db
	.$with("CaseQuestionChoicesStudyModeCTE")
	.as(
		db
			.with(QuestionsChoicesCTE)
			.select({
				...getTableColumns(cases),
				questions: jsonAggBuildObject({
					...QuestionsChoicesCTE._.selectedFields,
					...cases_questions_columns,
					imgUrls: sql<
						string[]
					>` COALESCE(${cases_questions_columns.imgUrls}, ARRAY[]::text[])`,
					explanationImgUrls: sql<
						string[]
					>` COALESCE(${cases_questions_columns.explanationImgUrls}, ARRAY[]::text[])`,
				}).as("questions"),
			})
			.from(cases_questions)
			.innerJoin(cases, eq(cases_questions.case_id, cases.id))
			.where(eq(cases_questions.isStudyMode, true))
			.innerJoin(
				QuestionsChoicesCTE,
				eq(cases_questions.question_id, QuestionsChoicesCTE.id)
			)
			.groupBy(cases.id)
	);

const SolvedCasesIdsCTEGenerator = (user1Id: number, user2Id: number) =>
	db.$with("SolvedCasesCTE").as(
		db
			.selectDistinct({ solved_case_id: users_cases.case_id })
			.from(users_cases)
			.where(
				or(
					eq(users_cases.user_id, user1Id),
					eq(users_cases.user_id, user2Id)
				)
			)
	);

/**
 * @param SolvedCasesCTE: CTE - The CTE that contains the solved cases ids
 * @param limit: number - Limits the number of cases to be generated - default is 10000 (i,e limitless)
 * @returns
 */
const UnusedCasesGeneratorCTE = (
	SolvedCasesIdsCTE: SolvedCasesIdsCTE,
	limit = 10000
) =>
	db.$with("UnusedCasesCTE").as(
		db
			.with(SolvedCasesIdsCTE)
			.selectDistinct({ unused_case_id: cases.id })
			.from(cases)
			.leftJoin(
				SolvedCasesIdsCTE,
				eq(cases.id, SolvedCasesIdsCTE.solved_case_id)
			)
			.where(isNull(SolvedCasesIdsCTE.solved_case_id))
		// .limit(limit),
	);

export const UsersRanksCTE = db.$with("UsersRanksCTE").as(
	db
		.select({
			id: users.id,
			rank: sql<number>`RANK() OVER (ORDER BY ${users.medPoints} DESC, ${users.gamesTotal} ASC)::int`.as(
				"rank"
			),
		})
		.from(users)
);

export async function getSystems() {
	return await db.select().from(systems);
}

/**
 *
 * @description Get friends of a specific user by his id
 * @param userId Target user id to get friends of
 * @param include Optional friend information to include in the query
 */
// export async function getFriendsByUserId(userId: number, include?: Partial<Record<keyof PlayerData, boolean>>) {
// 	const FriendIdsCTE = db.$with("FriendIds").as(
// 		/**/ db
// 			.select({
// 				friendId: sql<string>`
//             CASE
//                 WHEN ${users_friends.user1_id} = ${userId}
//                 THEN ${users_friends.user2_id}
//                 ELSE ${users_friends.user1_id}
//             END`.as("friendId"),
// 			})
// 			.from(users_friends)
// 			.where(and(or(eq(users_friends.user1_id, userId), eq(users_friends.user2_id, userId)), eq(users_friends.isFriend, true))),
// 	);
// 	const defaultSelection = {
// 		id: users.id,
// 		username: users.username,
// 		avatarUrl: users.avatarUrl,
// 		medSchool: users.medSchool,
// 		university: users.university,
// 		medPoints: users.medPoints,
// 	};

// 	const finalSelection = include
// 		? Object.fromEntries(Object.entries(defaultSelection).filter(([key]) => Object.hasOwn(include!, key)))
// 		: defaultSelection;

// 	return await db.with(FriendIdsCTE).select(finalSelection).from(FriendIdsCTE).innerJoin(users, eq(users.id, FriendIdsCTE.friendId));
// }

export async function getAllCategoriesCount() {
	return await db
		.select({
			categoryId: cases.category_id,
			count: sql<number>`COUNT(*)`,
		})
		.from(cases)
		.groupBy(cases.category_id);
}
export async function getCasesByCategoriesIds(categoriesIds: number[]) {
	const { category_id, ...rest } = getTableColumns(cases);
	return await db
		.select({
			...rest,
		})
		.from(cases)
		.innerJoin(categories, eq(cases.category_id, categories.id))
		.where(inArray(categories.id, categoriesIds));
}
export async function getCasesNotInCategoriesIds(categoriesIds: number[]) {
	const { category_id, ...rest } = getTableColumns(cases);
	return await db
		.select({
			...rest,
		})
		.from(cases)
		.innerJoin(categories, eq(cases.category_id, categories.id))
		.where(notInArray(categories.id, categoriesIds));
}
//TODO: MERGE TO 1 FUNCTION
export async function getCasesQuestionsChoicesByCategoriesIds(
	categoriesIds: number[]
) {
	return await db
		.with(QuestionsChoicesCTE)
		.select({
			...getTableColumns(cases),
			questions: jsonAggBuildObject({
				...QuestionsChoicesCTE._.selectedFields,
				...cases_questions_columns,
				imgUrls: sql<
					string[]
				>` COALESCE(${cases_questions_columns.imgUrls}, ARRAY[]::text[])`,
				explanationImgUrls: sql<
					string[]
				>` COALESCE(${cases_questions_columns.explanationImgUrls}, ARRAY[]::text[])`,
			}).as("questions"),
		})
		.from(cases_questions)
		.innerJoin(cases, eq(cases_questions.case_id, cases.id))
		.innerJoin(categories, eq(cases.category_id, categories.id))
		.where(inArray(categories.id, categoriesIds))
		.innerJoin(
			QuestionsChoicesCTE,
			eq(cases_questions.question_id, QuestionsChoicesCTE.id)
		)
		.groupBy(cases.id)
		.orderBy(sql`RANDOM()`)
		.limit(10);
}
//TODO: MERGE TO 1 FUNCTION
export async function getCasesQuestionsChoicesNotInCategoriesIds(
	categoriesIds: number[]
) {
	const { case_id, question_id, ...cases_questions_columns } =
		getTableColumns(cases_questions);
	return await db
		.with(QuestionsChoicesCTE)
		.select({
			...getTableColumns(cases),
			questions: jsonAggBuildObject({
				...QuestionsChoicesCTE._.selectedFields,
				...cases_questions_columns,
				imgUrls: sql<
					string[]
				>` COALESCE(${cases_questions_columns.imgUrls}, ARRAY[]::text[])`,
				explanationImgUrls: sql<
					string[]
				>` COALESCE(${cases_questions_columns.explanationImgUrls}, ARRAY[]::text[])`,
			}).as("questions"),
		})
		.from(cases_questions)
		.innerJoin(cases, eq(cases_questions.case_id, cases.id))
		.innerJoin(categories, eq(cases.category_id, categories.id))
		.where(notInArray(categories.id, categoriesIds))
		.innerJoin(
			QuestionsChoicesCTE,
			eq(cases_questions.question_id, QuestionsChoicesCTE.id)
		)
		.groupBy(cases.id)
		.orderBy(sql`RANDOM()`)
		.limit(10);
}
export async function getUsedCategoriesIdsByUserId(userId: number) {
	const [result] = await db.select({
		usedCategoriesIds: sql<number[]>`array_agg(category_id)`.as(
			"usedCategoriesIds"
		),
	}).from(sql`(
		SELECT ${categories.id} AS category_id
		FROM ${users_cases}
		INNER JOIN ${cases} ON ${users_cases.case_id} = ${cases.id}
		INNER JOIN ${categories} ON ${cases.category_id} = ${categories.id}
		WHERE ${users_cases.user_id} = ${userId}
		GROUP BY ${categories.id}
		HAVING COUNT(DISTINCT ${cases.id}) = (SELECT COUNT(*) FROM ${cases} WHERE ${cases.category_id} = ${categories.id}))`);
	return result;
}

export async function getSystemsCategoriesByUserId(userId: number) {
	// Single CTE to get all the necessary counts in one pass
	const CategoryStats = db.$with("CategoryStats").as(
		db
			.select({
				categoryId: categories.id,
				systemId: categories.system_id,
				categoryName: categories.name,
				totalCases: sql<number>`COUNT(DISTINCT ${cases.id})::int`.as(
					"totalCases"
				),
				usedCases:
					sql<number>`COUNT(DISTINCT ${users_cases.case_id})::int`.as(
						"usedCases"
					),
			})
			.from(categories)
			.leftJoin(cases, eq(cases.category_id, categories.id))
			.leftJoin(
				users_cases,
				and(
					eq(cases.id, users_cases.case_id),
					eq(users_cases.user_id, userId)
				)
			)
			.groupBy(categories.id)
	);
	return await db
		.with(CategoryStats)
		.select({
			id: systems.id,
			name: systems.name,
			allCount:
				sql<number>`COUNT(DISTINCT ${CategoryStats.categoryId})::int`.as(
					"allCount"
				),
			unusedCount: sql<number>`SUM(CASE WHEN (${CategoryStats.totalCases} - ${CategoryStats.usedCases}) > 0 THEN 1 ELSE 0 END)::int`,
			categories: jsonAggBuildObject({
				id: CategoryStats.categoryId,
				name: CategoryStats.categoryName,
				allCount: CategoryStats.totalCases,
				unusedCount: sql<number>`(${CategoryStats.totalCases} - ${CategoryStats.usedCases})::int`,
			}),
		})
		.from(systems)
		.innerJoin(CategoryStats, eq(systems.id, CategoryStats.systemId))
		.groupBy(systems.id);
}

export async function getSystemsCategoriesForTwoUsers(
	user1Id: number,
	user2Id: number
) {
	// CTE to get counts for both users
	const CategoryStats = db.$with("CategoryStats").as(
		db
			.select({
				categoryId: categories.id,
				systemId: categories.system_id,
				categoryName: categories.name,
				totalCases: sql<number>`COUNT(DISTINCT ${cases.id})::int`.as(
					"totalCases"
				),
				user1UsedCases:
					sql<number>`COUNT(DISTINCT CASE WHEN users_cases.user_id = ${user1Id} THEN ${users_cases.case_id} END)::int`.as(
						"user1UsedCases"
					),
				user2UsedCases:
					sql<number>`COUNT(DISTINCT CASE WHEN users_cases.user_id = ${user2Id} THEN ${users_cases.case_id} END)::int`.as(
						"user2UsedCases"
					),
			})
			.from(categories)
			.leftJoin(cases, eq(cases.category_id, categories.id))
			.leftJoin(
				users_cases,
				and(
					eq(cases.id, users_cases.case_id),
					or(
						eq(users_cases.user_id, user1Id),
						eq(users_cases.user_id, user2Id)
					)
				)
			)
			.groupBy(categories.id)
	);

	return await db
		.with(CategoryStats)
		.select({
			id: systems.id,
			name: systems.name,
			allCount:
				sql<number>`COUNT(DISTINCT ${CategoryStats.categoryId})::int`.as(
					"allCount"
				),

			unusedCount1: sql<number>`SUM(CASE WHEN (${CategoryStats.totalCases} - ${CategoryStats.user1UsedCases}) > 0 THEN 1 ELSE 0 END)::int`,
			unusedCount2: sql<number>`SUM(CASE WHEN (${CategoryStats.totalCases} - ${CategoryStats.user2UsedCases}) > 0 THEN 1 ELSE 0 END)::int`,

			matchCount: sql<number>`
                SUM(
                    CASE WHEN 
                        (${CategoryStats.totalCases} - ${CategoryStats.user1UsedCases}) > 0 
                        AND 
                        (${CategoryStats.totalCases} - ${CategoryStats.user2UsedCases}) > 0 
                    THEN 1 ELSE 0 END
                )::int
            `,
			categories: jsonAggBuildObject({
				id: CategoryStats.categoryId,
				name: CategoryStats.categoryName,
				allCount: CategoryStats.totalCases,
				unusedCount1: sql<number>`(${CategoryStats.totalCases} - ${CategoryStats.user1UsedCases})::int`,
				unusedCount2: sql<number>`(${CategoryStats.totalCases} - ${CategoryStats.user2UsedCases})::int`,
				// A case is unused if neither user has used it
				matchCount: sql<number>`
                    (${CategoryStats.totalCases} - 
                        (
                            SELECT COUNT(DISTINCT uc.case_id)
                            FROM users_cases uc
                            WHERE uc.case_id IN (
                                SELECT c.id 
                                FROM cases c 
                                WHERE c.category_id = ${CategoryStats.categoryId}
                            )
                            AND uc.user_id IN (${user1Id}, ${user2Id})
                        )
                    )::int
                `,
			}),
		})
		.from(systems)
		.innerJoin(CategoryStats, eq(systems.id, CategoryStats.systemId))
		.groupBy(systems.id);
}

export async function getMatchingCasesCountForTwoUsers(
	user1Id: number,
	user2Id: number
) {
	const UserStatsCTE = db.$with("UserStats").as(
		db
			.select({
				user1_count:
					sql<number>`COUNT(DISTINCT CASE WHEN user_id = ${user1Id} THEN case_id END)::int`.as(
						"user1_count"
					),
				user2_count:
					sql<number>`COUNT(DISTINCT CASE WHEN user_id = ${user2Id} THEN case_id END)::int`.as(
						"user2_count"
					),
				matching_count: sql<number>`
				(SELECT COUNT(DISTINCT ${cases.id})
				FROM ${cases} WHERE ${cases.id} NOT IN (
					SELECT ${users_cases.case_id}
					FROM ${users_cases} 
					WHERE ${users_cases.user_id} = ${user1Id} OR ${users_cases.user_id} = ${user2Id}
					)
				)::int
				`.as("matching_count"),
				total_count:
					sql<number>`(SELECT COUNT(DISTINCT id)::int FROM ${cases})`.as(
						"total_count"
					),
			})
			.from(users_cases)
	);

	return await db
		.with(UserStatsCTE)
		.select({
			matchingCount: sql<number>`${UserStatsCTE.matching_count}`,
			allCount: sql<number>`${UserStatsCTE.total_count}`,
			unusedCount1: sql<number>`${UserStatsCTE.total_count} - ${UserStatsCTE.user1_count}`,
			unusedCount2: sql<number>`${UserStatsCTE.total_count} - ${UserStatsCTE.user2_count}`,
		})
		.from(UserStatsCTE);
}

export async function getCasesQuestionsChoicesByCasesIds(caseIds: number[]) {
	return await db
		.with(CaseQuestionChoicesCTE)
		.select()
		.from(CaseQuestionChoicesCTE)
		.where(inArray(CaseQuestionChoicesCTE.id, caseIds));
}

export async function getCasesQuestionsChoicesStudyMode(caseId: number) {
	return await db
		.with(CaseQuestionChoicesStudyModeOnlyCTE)
		.select()
		.from(CaseQuestionChoicesStudyModeOnlyCTE)
		.where(eq(CaseQuestionChoicesStudyModeOnlyCTE.id, caseId));
}

export async function getUserProfile(username: string) {
	const [user] = await db
		.with(UsersRanksCTE)
		.select({ ...getTableColumns(users), rank: UsersRanksCTE.rank })
		.from(users)
		.leftJoin(UsersRanksCTE, eq(users.id, UsersRanksCTE.id))
		.where(eq(users.username, username))
		.limit(1);
	return user;
}

export async function generateAccessCode() {
	await db.insert(accessCodes).values({});
}

export async function getAllCasesQuestionsChoicesByCategoriesIdsWithOptions(
	categoriesIds: number[],
	options = { count: 10, studyMode: false }
) {
	const { case_id, question_id, ...cases_questions_columns } =
		getTableColumns(cases_questions);

	return await db
		.with(QuestionsChoicesCTE)
		.select({
			...getTableColumns(cases),
			questions: jsonAggBuildObject({
				...QuestionsChoicesCTE._.selectedFields,
				...cases_questions_columns,
				imgUrls: sql<
					string[]
				>` COALESCE(${cases_questions_columns.imgUrls}, ARRAY[]::text[])`,
				explanationImgUrls: sql<
					string[]
				>` COALESCE(${cases_questions_columns.explanationImgUrls}, ARRAY[]::text[])`,
			}).as("questions"),
		})
		.from(cases_questions)
		.innerJoin(cases, eq(cases_questions.case_id, cases.id))
		.innerJoin(categories, eq(cases.category_id, categories.id))
		.where(inArray(categories.id, categoriesIds))
		.innerJoin(
			QuestionsChoicesCTE,
			and(
				eq(cases_questions.question_id, QuestionsChoicesCTE.id),
				eq(cases_questions.isStudyMode, options.studyMode)
			)
		)
		.groupBy(cases.id)
		.orderBy(sql`RANDOM()`)
		.limit(options.count);
}

export async function getUnusedCasesQuestionsChoicesByCategoriesIdsWithOptions(
	categoriesIds: number[],
	{ userId, opponentId }: { userId: number; opponentId: number },
	options = { count: 10, studyMode: false }
) {
	if (!(userId && opponentId) || userId === opponentId)
		throw new Error("Invalid user ids");

	const SolvedCasesIdsCTE = SolvedCasesIdsCTEGenerator(userId, opponentId);
	const UnusedCasesIdsCTE = UnusedCasesGeneratorCTE(
		SolvedCasesIdsCTE,
		options.count
	);
	console.log(categoriesIds);
	const { case_id, question_id, ...cases_questions_columns } =
		getTableColumns(cases_questions);
	return await db
		.with(QuestionsChoicesCTE, UnusedCasesIdsCTE)
		.select({
			...getTableColumns(cases),
			questions: jsonAggBuildObject({
				...QuestionsChoicesCTE._.selectedFields,
				...cases_questions_columns,
				imgUrls: sql<
					string[]
				>` COALESCE(${cases_questions_columns.imgUrls}, ARRAY[]::text[])`,
				explanationImgUrls: sql<
					string[]
				>` COALESCE(${cases_questions_columns.explanationImgUrls}, ARRAY[]::text[])`,
			}).as("questions"),
		})
		.from(cases_questions)
		.innerJoin(cases, eq(cases_questions.case_id, cases.id))
		.innerJoin(
			UnusedCasesIdsCTE,
			eq(cases.id, UnusedCasesIdsCTE.unused_case_id)
		)
		.innerJoin(categories, eq(cases.category_id, categories.id))
		.where(inArray(categories.id, categoriesIds))
		.innerJoin(
			QuestionsChoicesCTE,
			and(eq(cases_questions.question_id, QuestionsChoicesCTE.id))
		)
		.groupBy(cases.id)
		.orderBy(sql`RANDOM()`)
		.limit(options.count);
}

export async function useAccessCodeIfExists(code: string) {
	return await db
		.update(accessCodes)
		.set({ used: true })
		.where(eq(accessCodes.code, `${code}`))
		.returning();
}
async function checkIfUserExists(username: string, email: string) {
	const isExists = await db
		.select({
			isExists: sql<boolean>`EXISTS (SELECT 1 WHERE ${users.username} = ${username} OR ${users.email} = ${email})`,
		})
		.from(users);
	return isExists;
}

async function populate() {
	//@ts-expect-error
	const final_data = (await import("./Gastro.json")).default;
	console.log("Adding data");
	for (const system of final_data) {
		const [{ id: sys_id }] = await db
			.insert(systems)
			.values({ name: system.system })
			.returning();
		for (const category of system.categories) {
			const [{ id: cat_id }] = await db
				.insert(categories)
				.values({ name: category.name, system_id: sys_id })
				.returning();
			for (const Case of category.cases) {
				const [{ id: case_id }] = await db
					.insert(cases)
					.values({
						body: Case.body,
						imgUrls: Case.imgUrls,
						category_id: cat_id,
					})
					.returning();
				for (const Question of Case.questions) {
					const [{ id: question_id }] = await db
						.insert(questions)
						.values({ body: Question.body })
						.returning();
					await db.insert(cases_questions).values({
						case_id: case_id,
						question_id: question_id,
						isStudyMode: Question.isStudyMode,
						explanation: Question.explanation,
					});
					const Choices = Question.choices;
					const correct_index = Question.correct_index;
					const choiceExplanation = Question.choice_explanation;
					type explanationX = keyof typeof choiceExplanation;
					for (
						let choice_index = 0;
						choice_index < Choices.length;
						choice_index++
					) {
						const choiceBody = Choices[choice_index];
						const [{ id: choice_id }] = await db
							.insert(choices)
							.values({ body: choiceBody })
							.returning();
						await db.insert(questions_choices).values({
							question_id,
							choice_id,
							isCorrect: choice_index === correct_index,
							explanation:
								`${choice_index}` in choiceExplanation
									? choiceExplanation[
											`${choice_index}` as explanationX
									  ]
									: "",
						});
					}
				}
			}
		}
	}
	console.log("Finished Adding Data");
}

// async function getFriendsOldVersion() {
// 	await db
// 		.select({
// 			outgoing: sql<PlayerData[]>`
// 		COALESCE(
// 			JSONB_AGG(
// 				CASE WHEN ${users_friends.user1_id} = 7
// 				THEN jsonb_build_object(
// 					'id', ${users_friends.user2_id},
// 					'username', ${users.username},
// 					'avatarUrl', ${users.avatarUrl},
// 					'medSchool', ${users.medSchool},
// 					'medPoints', ${users.medPoints})
// 				END
// 			) FILTER (WHERE ${users_friends.user1_id} = 7),
//         '[]'::jsonb
// 		)
//     `,
// 			incoming: sql<PlayerData[]>`
// 		COALESCE(
// 			JSONB_AGG(
// 				CASE WHEN ${users_friends.user2_id} = 7
// 				THEN jsonb_build_object(
// 				'id', ${users_friends.user1_id},
// 				'username', ${users.username},
// 				'avatarUrl', ${users.avatarUrl},
// 				'medSchool', ${users.medSchool},
// 				'medPoints', ${users.medPoints})
// 				END) FILTER (WHERE ${users_friends.user2_id} = 7),
//         '[]'::jsonb
// 	)
//     `,
// 		})
// 		.from(users_friends)
// 		.leftJoin(
// 			users,
// 			sql`CASE
// 				WHEN ${users_friends.user1_id} = 7
// 					THEN ${users.id} = ${users_friends.user2_id}
// 				WHEN ${users_friends.user2_id} = 7
// 					THEN ${users.id} = ${users_friends.user1_id}
// 			END
//     `,
// 		)
// 		.where(and(or(eq(users_friends.user1_id, 7), eq(users_friends.user2_id, 7)), not(users_friends.isFriend)));
// }
// async function getFriendsX() {
// 	await db.execute(
// 		sql<PlayerData[]>`
// 	SELECT
// 		COALESCE(JSONB_AGG(jsonb_build_object('id', subq.id,'username', subq.username, 'avatarUrl', subq.avatar_url, 'university', subq.university, 'medSchool', subq.med_school, 'medPoints', subq.med_points))
// 		FILTER (WHERE request_type = 'outgoing'),'[]'::jsonb)
// 		as outgoing,

// 		COALESCE(JSONB_AGG(jsonb_build_object('id', subq.id,'username', subq.username, 'avatarUrl', subq.avatar_url, 'university', subq.university, 'medSchool', subq.med_school, 'medPoints', subq.med_points))
// 		FILTER (WHERE request_type = 'incoming'),'[]'::jsonb)
// 		as incoming
// 	FROM
// 	(
// 	(
// 	SELECT 'outgoing' as request_type, *
//     FROM ${users_friends}
//     JOIN ${users}  ON ${users.id} = ${users_friends.user2_id}
//     WHERE ${users_friends.user1_id} = 7 AND NOT ${users_friends.isFriend}
//     LIMIT 10
// 	)

// 	UNION ALL

// 	(
// 	SELECT 'incoming' as request_type, *
// 	FROM ${users_friends}
// 	JOIN ${users}  ON ${users.id} = ${users_friends.user1_id}
// 	WHERE ${users_friends.user2_id} = 7 AND NOT ${users_friends.isFriend}
// 	LIMIT 10
// 	)) as subq
//     `,
// 	);
// }
async function insertRequestsIfNotExists() {
	const addingUser = 7;
	const friendId = 10;
	const addAll = db.$with("AddUsersIfNotAlreadyAdded").as(
		db
			.insert(users_friends)
			.select(
				db
					.select({
						user1_id: sql<number>`${addingUser}`.as("user1_id"),
						user2_id: sql<number>`${friendId}`.as("user2_id"),
						isFriend: sql<boolean>`FALSE`.as("isFriend"),
					})
					.from(users_friends)
					.where(
						notExists(
							db
								.select()
								.from(users_friends)
								.where(
									or(
										and(
											eq(
												users_friends.user1_id,
												friendId
											),
											eq(
												users_friends.user2_id,
												addingUser
											)
										),
										and(
											eq(
												users_friends.user1_id,
												addingUser
											),
											eq(users_friends.user2_id, friendId)
										)
									)
								)
						)
					)
					.limit(1)
			)
			.returning({
				addedUser1Id: caseWhen<number>(
					eq(users_friends.user1_id, addingUser)
				)
					.then(users_friends.user2_id)
					.else(users_friends.user1_id)
					.as("addedUser1Id"),
			})
	);

	const result = await db
		.with(addAll)
		.select({
			id: users.id,
			username: users.username,
			avatarUrl: users.avatarUrl,
			university: users.university,
		})
		.from(users)
		.innerJoin(addAll, eq(users.id, addAll.addedUser1Id));
	console.log(result);
}

// async function getCasesAndReviewData() {
// 	const CaseQuestionChoicesWithStudyModeFlag = db
// 		.$with("CaseQuestionChoicesWithStudyModeFlag")
// 		.as(
// 			db
// 				.with(QuestionsChoicesCTE)
// 				.select({
// 					...getTableColumns(cases),
// 					hasStudyMode:
// 						sql<boolean>`EXISTS (SELECT 1 FROM ${cases_questions} WHERE ${cases_questions.case_id} = ${cases.id} AND ${cases_questions.isStudyMode} = true)`.as(
// 							"hasStudyMode"
// 						),
// 					questions: jsonAggBuildObject({
// 						...QuestionsChoicesCTE._.selectedFields,
// 						...cases_questions_columns,
// 						imgUrls: sql<
// 							string[]
// 						>` COALESCE(${cases_questions_columns.imgUrls}, ARRAY[]::text[])`,
// 						explanationImgUrls: sql<
// 							string[]
// 						>` COALESCE(${cases_questions_columns.explanationImgUrls}, ARRAY[]::text[])`,
// 					}).as("questions"),
// 				})
// 				.from(cases_questions)
// 				.innerJoin(cases, eq(cases_questions.case_id, cases.id))
// 				.where(eq(cases_questions.isStudyMode, false))
// 				.innerJoin(
// 					QuestionsChoicesCTE,
// 					eq(cases_questions.question_id, QuestionsChoicesCTE.id)
// 				)
// 				.groupBy(cases.id)
// 		);

// 	const RecordCaseIds = db.$with("RecordCaseIds").as(
// 		db
// 			.select({
// 				gameId: users_games.gameId,
// 				userId: users_games.userId,
// 				caseId: sql<number>`(jsonb_array_elements(${users_games.data})->>'caseId')::int`.as(
// 					"caseId"
// 				),
// 			})
// 			.from(users_games)
// 			.where(and(eq(users_games.userId, 10), eq(users_games.gameId, 31)))
// 	);

// 	const [returnVal] = await db
// 		.select({ reviewData: users_games.data })
// 		.from(users_games)
// 		.where(and(eq(users_games.gameId, 31), eq(users_games.userId, 10)));
// 	const reviewData = returnVal?.reviewData;
// 	if (!reviewData || !reviewData.length)
// 		return console.log("U#2:REVIEW NOT FOUND");

// 	const casesData = await db
// 		.with(CaseQuestionChoicesWithStudyModeFlag, RecordCaseIds)
// 		.select({
// 			...CaseQuestionChoicesWithStudyModeFlag._.selectedFields,
// 		})
// 		.from(RecordCaseIds)
// 		.innerJoin(
// 			CaseQuestionChoicesWithStudyModeFlag,
// 			eq(RecordCaseIds.caseId, CaseQuestionChoicesWithStudyModeFlag.id)
// 		);
// 	console.dir(reviewData, { depth: 1 });
// 	console.dir(casesData, { depth: 1 });

// 	const sortedCasesData = reviewData.map((review) =>
// 		casesData.find((caseData) => caseData.id === review.caseId)
// 	);

// 	console.dir(sortedCasesData, { depth: 1 });
// }

/**@abstract
 *
 * @description Insert access codes into the database
 */
// async function insertAccessCodes() {
// 	const codes = [
// 		"d0075ac8ded95c3d61e84f4a84b587d2",
// 		"440767a584f696f837b76ded36994611",
// 		"2861c019a3c0ecfb481f1cf9b370b99b",
// 		"226e460e857025c10b243abe2ceb8c94",
// 		"e94bae8b900d86b437e84da62c0d5e6f",
// 		"6782bbdfedef2520e9722c671817cd20",
// 		"987ef9d2f0e49d81c0800b386df12ca9",
// 		"b61d51d61c89d45a58a1913dd13dcdcc",
// 		"8ec6145d92664cbca785b78902a95dea",
// 		"3d82de99335fb2267e657726256c5993",
// 		"00df155f81c15e05beb33453858f3e2e",
// 		"7cb326f3f770ecf403b72c2d1dd25d38",
// 		"6b1897b710308e712f03f97925f723cc",
// 		"13043b312398b2c2636ea4d364a08c64",
// 		"a394eb3732bcdfbbda48bd5cdf7231ee",
// 		"302bbb9714189f940f6d8bb97547966f",
// 		"ae3807813186f0d0b75feca1855470eb",
// 		"a6eb106c5de93312f8b0b4bd70546ac5",
// 		"8223257f6b33ba0c62b010d8fbc4fad8",
// 		"b211fed22b130ac4a1a75d5ba6d07336",
// 		"72e069b01e19b8ee2835ac7a48448fd4",
// 		"fecba560a89d44659cc7ddf3ddb20851",
// 		"035e7b645a3b317e657720ed47cbf351",
// 		"9c6d50537b1390217a88680296427fd2",
// 		"96d9675a7a97edc52db775f226f8560b",
// 		"700a647fa88c5a11f778adf426c747db",
// 		"27a6da269cc9187a6e727c3f0da33da8",
// 		"3d9cdf9cc425da877383408968be485f",
// 		"1e773cdf85dd8b00b2155690c55889d3",
// 		"deca3f9a4f3ad0bde6eca52fdf1bb734",
// 		"cd4e4a0598d56619f51f817d2f7aa62b",
// 		"923c6d435a1dafb8c4959efc69995051",
// 		"f15ef0d8099b218232aff87512a6251d",
// 		"30e1ed7909956da6ebcb5cd16bb33d05",
// 		"ba68211455743049e00a2b61d008e5ef",
// 		"01245c0cb51ef9836ff3dc2450577dc0",
// 		"30c14e30f17b60da1eb9def586415524",
// 		"bce21747149ef3ab6dbb88e5d1d034c5",
// 		"c38abf467046e393b6d41524331c224e",
// 		"6559f53ef69a20dc0cf6d816385633cc",
// 		"c66cb812d09db6d0b592ac87b0463e21",
// 		"0dd5c13c9714c217ea04e32727256939",
// 		"83bebfae62c9ac68f73aef0b098b3649",
// 		"03ee741b6ef0c8b14eaa0329bc964a50",
// 		"235cd1d94c414e84a1826bfbdc864c24",
// 		"52b353e6aaa3d70a1c3e172da5c0c82b",
// 		"8ca8d878a44089882acb6c61be933a7c",
// 		"b1d285b2c3394d47b47e8d1a043742a0",
// 		"1731789d2c85bd950c0a18b59d8bef9c",
// 		"db7dc6e1952a6fd95b3e52d556a419fa",
// 	];
// 	await db.insert(accessCodes).values(codes.map((code) => ({ code })));
// }
// await insertAccessCodes();

// async function removeAllUsers(){
// 	await db.delete(users).where(sql`${users.id} > 0`);
// }
// await removeAllUsers();
// async function unsetAccessCodes() {
// 	await db.update(accessCodes).set({ used: false }).where(eq(accessCodes.used, true));
// }
// await unsetAccessCodes();
