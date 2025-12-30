import {
  db,
  systems,
  categories,
  cases,
  cases_questions,
  questions_choices,
  choices,
  eq,
  and,
  inArray,
} from "@package/database";
import { count } from "drizzle-orm";

async function main() {
  console.log("Starting fix for duplicated choice IDs...");

  // 1. Find the System and Category
  // Per user instruction: Search logic is correct and preserved.
  const systemName = "Renal";
  const categoryName = "Normal structure and function";

  const system = await db.query.systems.findFirst({
    where: eq(systems.name, systemName),
  });

  if (!system) {
    console.error(`System '${systemName}' not found`);
    // If the system is not found, we cannot proceed with category lookup naturally.
    return;
  }

  const category = await db.query.categories.findFirst({
    where: and(
      eq(categories.name, categoryName),
      eq(categories.system_id, system.id)
    ),
  });

  if (!category) {
    console.error(
      `Category '${categoryName}' not found in system '${systemName}'`
    );
    return;
  }

  console.log(`Found Category: ${category.name} (ID: ${category.id})`);

  // 2. Find all Cases in this Category
  const categoryCases = await db.query.cases.findMany({
    columns: { id: true },
    where: eq(cases.category_id, category.id),
  });

  const caseIds = categoryCases.map((c) => c.id);
  console.log(`Found ${caseIds.length} cases.`);

  if (caseIds.length === 0) {
    console.log("No cases found. Exiting.");
    return;
  }

  // 3. Find all Questions linked to these Cases
  const relatedQuestions = await db
    .select({ questionId: cases_questions.question_id })
    .from(cases_questions)
    .where(inArray(cases_questions.case_id, caseIds));

  const questionIds = relatedQuestions.map((q) => q.questionId);
  console.log(`Found ${questionIds.length} questions in this category.`);

  if (questionIds.length === 0) {
    console.log("No questions found. Exiting.");
    return;
  }

  let modifiedCount = 0;
  let processedQuestions = 0;

  // 4. Iterate questions and check choices
  for (const qId of questionIds) {
    processedQuestions++;
    if (processedQuestions % 10 === 0) {
      console.log(
        `Processed ${processedQuestions}/${questionIds.length} questions...`
      );
    }

    // Get choices linked to this question
    const qChoices = await db
      .select()
      .from(questions_choices)
      .where(eq(questions_choices.question_id, qId));

    for (const qc of qChoices) {
      // Check usage count of this choice_id globally.
      // If count > 1, it means this choice is shared (duplicated usage).
      const usageValues = await db
        .select({ count: count() })
        .from(questions_choices)
        .where(eq(questions_choices.choice_id, qc.choice_id));

      const usageCount = usageValues[0].count;

      if (usageCount > 1) {
        // Shared ID detected. Need to isolate it for this question.

        // Fetch the original choice body
        const originalChoice = await db.query.choices.findFirst({
          where: eq(choices.id, qc.choice_id),
        });

        if (!originalChoice) {
          console.warn(
            `Choice ${qc.choice_id} not found in choices table! Skipping.`
          );
          continue;
        }

        // Create a NEW choice with the same content (CLONE)
        const newChoiceResult = await db
          .insert(choices)
          .values({
            body: originalChoice.body,
          })
          .returning({ id: choices.id });

        const newChoiceId = newChoiceResult[0].id;

        // CRITICAL STEP: Update the link for THIS question to use the NEW choice ID.
        // This effectively "removes" the old duplicate association for this question
        // and replaces it with a unique one.
        // Note: 'explanation' and 'isCorrect' are preserved in the row because
        // we are using update() on the junction table row identified by (qId, oldChoiceId)
        // and only changing the choice_id.
        // WAIT: changing choice_id in a WHERE clause that relies on choice_id?
        // Yes, we target the row where choice_id is OLD, and set choice_id to NEW.

        await db
          .update(questions_choices)
          .set({ choice_id: newChoiceId })
          .where(
            and(
              eq(questions_choices.question_id, qId),
              eq(questions_choices.choice_id, qc.choice_id)
            )
          );

        console.log(
          `[Q: ${qId}] Replaced shared Choice ID ${qc.choice_id} with new unique ID ${newChoiceId}`
        );
        modifiedCount++;
      }
    }
  }

  console.log(
    `Finished. Adjusted ${modifiedCount} choice associations to be unique.`
  );
}

main()
  .catch((err) => {
    console.error("Error executing script:", err);
    process.exit(1);
  })
  .then(() => process.exit(0));
