import { db, getTableColumns, eq } from ".";
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
