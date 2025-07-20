import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";
import { and, db, eq, is } from "@package/database";
import { CasesQuestionsChoicesCTE } from "@package/database/ctes";
import { TRPCError } from "@trpc/server";

export const block = createTRPCRouter({
	get: baseProcedure
		.input(
			z.object({
				system: z.string(),
				category: z.string(),
				caseType: z.enum(["STEP 1", "STEP 2", "STEP 3"]),
			})
		)
		.query(async ({ input }) => {
			const result = await db
				.with(CasesQuestionsChoicesCTE)
				.select()
				.from(CasesQuestionsChoicesCTE)
				.where(
					and(
						eq(
							CasesQuestionsChoicesCTE.category_id,
							db
								.selectDistinct({ id: db.table.categories.id })
								.from(db.table.systems)
								.innerJoin(
									db.table.categories,
									eq(
										db.table.systems.id,
										db.table.categories.system_id
									)
								)
								.where(
									and(
										eq(db.table.systems.name, input.system),
										eq(
											db.table.categories.name,
											input.category
										)
									)
								)
								.limit(1)
						),
						eq(CasesQuestionsChoicesCTE.type, input.caseType)
					)
				);

			if (!result.length)
				throw new TRPCError({
					message:
						"System or category not found, or they are not related",
					code: "NOT_FOUND",
				});

			return result;
		}),
	add: baseProcedure
		.input(
			z.object({
				body: z.string().trim().min(1, "Case cannot be empty"),
				type: z.enum(["STEP 1", "STEP 2", "STEP 3"], {
					message: "Case type is required",
				}),
				imgUrls: z.array(z.string()).optional().default([]),
				category_id: z.number().int().nullable(),
				questions: z.array(
					z.object({
						type: z.enum(["Default", "Tabular"], {
							message: "Question type is required",
						}),
						body: z
							.string()
							.trim()
							.min(1, "Question cannot be empty"),
						header: z.string().optional().nullable(),
						imgUrls: z.array(z.string()).optional().default([]),
						isStudyMode: z
							.boolean()
							.optional()
							.nullable()
							.default(false),
						explanation: z
							.string()
							.trim()
							.min(1, "Explanation cannot be empty"),
						explanationImgUrls: z
							.array(z.string())
							.optional()
							.default([]),

						choices: z
							.array(
								z.object({
									body: z
										.string()
										.trim()
										.min(1, "Choice cannot be empty"),
									isCorrect: z
										.boolean()
										.optional()
										.nullable(),
									explanation: z
										.string()
										.optional()
										.nullable(),
								})
							)
							.min(2, "At least 2 choices are required")
							.refine(
								(choices) =>
									choices.some((choice) => choice.isCorrect),
								"At least one choice must be marked as correct"
							),
					})
				),
			})
		)
		.mutation(async ({ input }) => {
			await db.transaction(async (tx) => {
				console.log(input);
				const caseId = await tx
					.insert(db.table.cases)
					.values({
						body: input.body,
						type: input.type,
						imgUrls: input.imgUrls || [],
						category_id: input.category_id,
					})
					.returning({ id: db.table.cases.id });

				console.log("Case ID:", caseId);
				if (!caseId.length) {
					throw new TRPCError({
						message: "Failed to add case",
						code: "INTERNAL_SERVER_ERROR",
					});
				}

				const questionValues = input.questions.map((question) => ({
					case_id: caseId[0].id,
					type: question.type,
					body: question.body,
					header: question.header || null,
				}));

				const questionsIds = await tx
					.insert(db.table.questions)
					.values(questionValues)
					.returning();
				if (!questionsIds.length) {
					throw new TRPCError({
						message: "Failed to add questions",
						code: "INTERNAL_SERVER_ERROR",
					});
				}

				const casesQuestionsValues = input.questions.map(
					(question, index) => ({
						case_id: caseId[0].id,
						question_id: questionsIds[index].id,
						imgUrls: question.imgUrls,
						isStudyMode: question.isStudyMode,
						explanation: question.explanation,
						explanationImgUrls: question.explanationImgUrls,
					})
				);

				const casesQuestionsValuesResults = await tx
					.insert(db.table.cases_questions)
					.values(casesQuestionsValues)
					.returning();

				if (!casesQuestionsValuesResults.length) {
					throw new TRPCError({
						message: "Failed to assign cases questions",
						code: "INTERNAL_SERVER_ERROR",
					});
				}

				const choicesValues = input.questions.flatMap((question) =>
					question.choices.map((choice) => ({
						body: choice.body,
					}))
				);

				const choicesIds = await tx
					.insert(db.table.choices)
					.values(choicesValues)
					.returning();
				if (!choicesIds.length) {
					throw new TRPCError({
						message: "Failed to add choices",
						code: "INTERNAL_SERVER_ERROR",
					});
				}

				const questionsChoicesValues = input.questions.flatMap(
					(question, questionIndex) =>
						question.choices.map((choice, choiceIndex) => ({
							question_id: questionsIds[questionIndex].id,
							choice_id: choicesIds[choiceIndex].id,
							isCorrect: choice.isCorrect || false,
							explanation: choice.explanation || null,
						}))
				);

				const questionsChoicesResults = await tx
					.insert(db.table.questions_choices)
					.values(questionsChoicesValues)
					.returning();
				if (!questionsChoicesResults.length) {
					throw new TRPCError({
						message: "Failed to assign questions choices",
						code: "INTERNAL_SERVER_ERROR",
					});
				}
			});
			// const { body, questions } = input;

			// const caseId = await db
			// 	.insert(db.table.cases)
			// 	.values({
			// 		body,
			// 	})
			// 	.returning({ id: db.table.cases.id });

			// if (!caseId.length) {
			// 	throw new TRPCError({
			// 		message: "Failed to add case",
			// 		code: "INTERNAL_SERVER_ERROR",
			// 	});
			// }

			// const questionValues = questions.map((question) => ({
			// 	case_id: caseId[0].id,
			// 	type: question.type,
			// 	body: question.body,
			// 	explanation: question.explanation,
			// }));

			// const questionIds = await db
			// 	.insert(db.table.questions)
			// 	.values(questionValues)
			// 	.returning({ id: db.table.questions.id });

			// if (!questionIds.length) {
			// 	throw new TRPCError({
			// 		message: "Failed to add questions",
			// 		code: "INTERNAL_SERVER_ERROR",
			// 	});
			// }

			// const choiceValues = [];
			// for (let i = 0; i < questions.length; i++) {
			// 	for (const choice of questions[i].choices) {
			// 		choiceValues.push({
			// 			question_id: questionIds[i].id,
			// 			body: choice.body,
			// 			is_correct: choice.isCorrect || false,
			// 		});
			// 	}
			// }

			// await db.insert(db.table.choices).values(choiceValues);

			// return { success: true };
		}),
});
