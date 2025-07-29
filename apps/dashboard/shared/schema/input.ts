import { z } from "zod";
export const inputSchema = z.object({
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
      body: z.string().trim().min(1, "Question cannot be empty"),
      header: z.string().optional().nullable(),
      imgUrls: z.array(z.string()).optional().default([]),
      isStudyMode: z.boolean().optional().nullable().default(false),
      explanation: z.string().trim().min(1, "Explanation cannot be empty"),
      explanationImgUrls: z.array(z.string()).optional().default([]),

      choices: z
        .array(
          z.object({
            id: z.number().int().min(1, "Choice ID is required"),
            body: z.string().trim().min(1, "Choice cannot be empty"),
            isCorrect: z.boolean().optional().nullable(),
            explanation: z.string().optional().nullable(),
          })
        )
        .min(2, "At least 2 choices are required")
        .refine(
          (choices) => choices.some((choice) => choice.isCorrect),
          "At least one choice must be marked as correct"
        ),
    })
  ),
});
