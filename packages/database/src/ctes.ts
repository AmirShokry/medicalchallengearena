import { db, getTableColumns, eq, sql, isNull, or } from ".";
import { jsonAggBuildObject, getTableColumnsExcept } from "./helpers";
const { questions, choices, questions_choices, cases, cases_questions } =
	db.table;
export const QuestionsChoicesCTE = db.$with("QuestionsChoicesCTE").as((qb) =>
	qb
		.select({
			...getTableColumns(questions),
			choices: jsonAggBuildObject({
				...getTableColumns(choices),
				...getTableColumnsExcept(questions_choices, [
					"question_id",
					"choice_id",
				]),
			}).as("choices"),
		})
		.from(questions_choices)
		.innerJoin(questions, eq(questions_choices.question_id, questions.id))
		.innerJoin(choices, eq(questions_choices.choice_id, choices.id))
		.groupBy(questions.id)
);

export const CasesQuestionsChoicesCTE = db
	.$with("CasesQuestionsChoicesCTE")
	.as((qb) =>
		qb
			.with(QuestionsChoicesCTE)
			.select({
				...getTableColumns(cases),
				questions: jsonAggBuildObject({
					...QuestionsChoicesCTE._.selectedFields,
					...getTableColumnsExcept(cases_questions, [
						"case_id",
						"question_id",
					]),
				}).as("questions"),
			})
			.from(cases_questions)
			.innerJoin(cases, eq(cases_questions.case_id, cases.id))
			.innerJoin(
				QuestionsChoicesCTE,
				eq(cases_questions.question_id, QuestionsChoicesCTE.id)
			)
			.groupBy(cases.id)
	);

export const UsersRanksCTE = db.$with("UsersRanksCTE").as(
	db
		.select({
			id: db.table.users.id,
			rank: sql<number>`RANK() OVER (ORDER BY ${db.table.users.medPoints} DESC, ${db.table.users.gamesTotal} ASC)::int`.as(
				"rank"
			),
			username: db.table.users.username,
			medPoints: db.table.users.medPoints,
		})
		.from(db.table.users)
);

export const SolvedCasesIdsCTEGenerator = (user1Id: number, user2Id: number) =>
	db.$with("SolvedCasesCTE").as(
		db
			.selectDistinct({ solved_case_id: db.table.users_cases.case_id })
			.from(db.table.users_cases)
			.where(
				or(
					eq(db.table.users_cases.user_id, user1Id),
					eq(db.table.users_cases.user_id, user2Id)
				)
			)
	);

type SolvedCasesIdsCTE = ReturnType<typeof SolvedCasesIdsCTEGenerator>;

/**
 * @param SolvedCasesCTE: CTE - The CTE that contains the solved cases ids
 * @param limit: number - Limits the number of cases to be generated - default is 10000 (i,e limitless)
 * @returns
 */
export const UnusedCasesGeneratorCTE = (
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
