import { z } from "zod";
import { authProcedure, createTRPCRouter } from "../init";
import { and, db, eq, sql, inArray, SQL } from "@package/database";
import { CasesQuestionsChoicesCTE } from "@package/database/ctes";
import { TRPCError } from "@trpc/server";

export const block = createTRPCRouter({
	get: authProcedure
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
	add: authProcedure
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
		}),
	update: authProcedure
		.input(
			z.object({
				id: z.number().int().min(1, "Case ID is required"),
				body: z.string().trim().min(1, "Case cannot be empty"),
				type: z.enum(["STEP 1", "STEP 2", "STEP 3"], {
					message: "Case type is required",
				}),
				imgUrls: z.array(z.string()).optional().default([]),
				category_id: z.number().int().nullable(),
				questions: z.array(
					z.object({
						id: z.number().int().min(1, "Question ID is required"),
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
									id: z
										.number()
										.int()
										.min(1, "Choice ID is required"),
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
				// Update the main case
				await tx
					.update(db.table.cases)
					.set({
						body: input.body,
						type: input.type,
						imgUrls: input.imgUrls || [],
						category_id: input.category_id,
					})
					.where(eq(db.table.cases.id, input.id));

				// Prepare all question IDs for validation
				const questionIds = input.questions.map((q) => q.id);

				// Bulk update questions using Drizzle's CASE statement pattern
				if (input.questions.length > 0) {
					// Build CASE statements for each field
					const typeSqlChunks: SQL[] = [sql`(case`];
					const bodySqlChunks: SQL[] = [sql`(case`];
					const headerSqlChunks: SQL[] = [sql`(case`];

					for (const question of input.questions) {
						typeSqlChunks.push(
							sql`when ${db.table.questions.id} = ${question.id} then ${question.type}`
						);
						bodySqlChunks.push(
							sql`when ${db.table.questions.id} = ${question.id} then ${question.body}`
						);
						headerSqlChunks.push(
							sql`when ${db.table.questions.id} = ${question.id} then ${question.header}`
						);
					}

					// Add ELSE clauses to preserve existing values for non-matching rows
					typeSqlChunks.push(
						sql`else ${db.table.questions.type} end)`
					);
					bodySqlChunks.push(
						sql`else ${db.table.questions.body} end)`
					);
					headerSqlChunks.push(
						sql`else ${db.table.questions.header} end)`
					);

					const typeFinalSql = sql.join(typeSqlChunks, sql.raw(" "));
					const bodyFinalSql = sql.join(bodySqlChunks, sql.raw(" "));
					const headerFinalSql = sql.join(
						headerSqlChunks,
						sql.raw(" ")
					);

					await tx
						.update(db.table.questions)
						.set({
							type: typeFinalSql,
							body: bodyFinalSql,
							header: headerFinalSql,
						})
						.where(inArray(db.table.questions.id, questionIds));
				}

				// Update cases_questions using a hybrid approach (CASE for scalars, individual updates for arrays)
				if (input.questions.length > 0) {
					// Build CASE statements for scalar fields only
					const isStudyModeSqlChunks: SQL[] = [sql`(case`];
					const explanationSqlChunks: SQL[] = [sql`(case`];

					for (const question of input.questions) {
						isStudyModeSqlChunks.push(
							sql`when ${db.table.cases_questions.question_id} = ${question.id} then ${question.isStudyMode ?? false}`
						);
						explanationSqlChunks.push(
							sql`when ${db.table.cases_questions.question_id} = ${question.id} then ${question.explanation}`
						);
					}

					// Add ELSE clauses to preserve existing values
					isStudyModeSqlChunks.push(
						sql`else ${db.table.cases_questions.isStudyMode} end)`
					);
					explanationSqlChunks.push(
						sql`else ${db.table.cases_questions.explanation} end)`
					);

					const isStudyModeFinalSql = sql.join(
						isStudyModeSqlChunks,
						sql.raw(" ")
					);
					const explanationFinalSql = sql.join(
						explanationSqlChunks,
						sql.raw(" ")
					);

					// Update scalar fields with CASE statements
					await tx
						.update(db.table.cases_questions)
						.set({
							isStudyMode: isStudyModeFinalSql,
							explanation: explanationFinalSql,
						})
						.where(
							and(
								eq(db.table.cases_questions.case_id, input.id),
								inArray(
									db.table.cases_questions.question_id,
									questionIds
								)
							)
						);

					// Update array fields individually (Promise.all for performance)
					await Promise.all(
						input.questions.map((question) =>
							tx
								.update(db.table.cases_questions)
								.set({
									imgUrls: question.imgUrls || [],
									explanationImgUrls:
										question.explanationImgUrls || [],
								})
								.where(
									and(
										eq(
											db.table.cases_questions.case_id,
											input.id
										),
										eq(
											db.table.cases_questions
												.question_id,
											question.id
										)
									)
								)
						)
					);
				}

				// Bulk update choices using Drizzle's CASE statement pattern
				const allChoices = input.questions.flatMap((q) => q.choices);
				if (allChoices.length > 0) {
					const choiceIds = allChoices.map((c) => c.id);

					// Build CASE statement for choice body
					const choiceBodySqlChunks: SQL[] = [sql`(case`];
					for (const choice of allChoices) {
						choiceBodySqlChunks.push(
							sql`when ${db.table.choices.id} = ${choice.id} then ${choice.body}`
						);
					}
					choiceBodySqlChunks.push(
						sql`else ${db.table.choices.body} end)`
					);
					const choiceBodyFinalSql = sql.join(
						choiceBodySqlChunks,
						sql.raw(" ")
					);

					await tx
						.update(db.table.choices)
						.set({
							body: choiceBodyFinalSql,
						})
						.where(inArray(db.table.choices.id, choiceIds));

					// Build CASE statements for questions_choices
					const isCorrectSqlChunks: SQL[] = [sql`(case`];
					const explanationSqlChunks: SQL[] = [sql`(case`];

					for (const choice of allChoices) {
						isCorrectSqlChunks.push(
							sql`when ${db.table.questions_choices.choice_id} = ${choice.id} then ${choice.isCorrect ?? false}`
						);
						explanationSqlChunks.push(
							sql`when ${db.table.questions_choices.choice_id} = ${choice.id} then ${choice.explanation}`
						);
					}

					isCorrectSqlChunks.push(
						sql`else ${db.table.questions_choices.isCorrect} end)`
					);
					explanationSqlChunks.push(
						sql`else ${db.table.questions_choices.explanation} end)`
					);

					const isCorrectFinalSql = sql.join(
						isCorrectSqlChunks,
						sql.raw(" ")
					);
					const explanationFinalSql = sql.join(
						explanationSqlChunks,
						sql.raw(" ")
					);

					await tx
						.update(db.table.questions_choices)
						.set({
							isCorrect: isCorrectFinalSql,
							explanation: explanationFinalSql,
						})
						.where(
							inArray(
								db.table.questions_choices.choice_id,
								choiceIds
							)
						);
				}
			});
		}),

	delete: authProcedure
		.input(
			z.object({
				caseId: z.number().int(),
			})
		)
		.mutation(async ({ input }) => {
			await db
				.delete(db.table.cases)
				.where(eq(db.table.cases.id, input.caseId));
		}),
});
