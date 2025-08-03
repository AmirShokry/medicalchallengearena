/**
 * @fileoverview Database schema definition for typescript recognition
 */
import { eq, sql, getTableColumns } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  check,
  varchar,
  pgView,
  QueryBuilder,
} from "drizzle-orm/pg-core";
import { jsonAggBuildObject, getTableColumnsExcept } from "./helpers";
import type { ReducedRecordObject } from "@package/types";

// import { type RecordObject } from "@server/types";

// export type ReducedRecordObject = Omit<RecordObject["data"][0], "nthCase" | "nthQuestion" | "medPoints">[];
/**
 **
 * @TABLES
 **
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 50 }).notNull().unique(),
    email: varchar("email", { length: 256 }).notNull().unique(),
    university: varchar("university", { length: 128 }).notNull(),
    medSchool: text("med_school"),
    birthDate: date("birth_date", { mode: "date" }),
    country: text("country"),
    graduationYear: text("grad_year"),
    expectedDegree: text("expected_deg"),
    examDate: date("exam_date", { mode: "date" }),

    avatarUrl: text("avatar_url")
      .default("https://i.ibb.co/j5jqhRm/default-avatar-1.webp")
      .notNull(),
    avatarDeleteUrl: text("avatar_delete_url"),

    medPoints: integer("med_points").notNull().default(0),
    medPointsUnranked: integer("med_points_unranked").default(0),

    questionsCorrect: integer("questions_correct").default(0),
    questionsTotal: integer("questions_total").default(0),

    eliminationsCorrect: integer("eliminations").default(0),
    eliminationsTotal: integer("eliminations_total").default(0),

    gamesWon: integer("games_won").default(0),
    gamesTotal: integer("games_total").default(0),
  },
  (table) => [index("med_points_idx").on(table.medPoints)]
);

export const accessCodes = pgTable("access_codes", {
  code: varchar("code")
    .notNull()
    .primaryKey()
    .default(sql`md5(random()::text || clock_timestamp()::text)`),
  used: boolean("used").notNull().default(false),
});
/**
 **
 *
 **
 */
export const systems = pgTable("systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  system_id: integer("system_id").references(() => systems.id, {
    onDelete: "cascade",
  }),
});

export const caseTypeEnum = pgEnum("case_type", ["STEP 1", "STEP 2", "STEP 3"]);

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  body: varchar("body").notNull(),
  imgUrls: text("img_urls").array().notNull().default([]), // TODO: ASK ABOUT THIS
  type: caseTypeEnum("type").notNull().default("STEP 1"),
  category_id: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
});
export const questionTypeEnum = pgEnum("question_type", ["Default", "Tabular"]);
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  body: varchar("body").notNull(),
  type: questionTypeEnum("type").notNull().default("Default"),
  header: text("header"),
});

export const choices = pgTable("choices", {
  id: serial("id").primaryKey(),
  body: varchar("body").notNull(),
});

export const gameModeEnum = pgEnum("mode", ["ranked", "unranked", "single"]);
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  mode: gameModeEnum("mode").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

/**
 **
 * @JUNCTION_TABLES
 **
 */
export const users_auth = pgTable(
  "users_auth",
  {
    user_id: integer("id"),
    password: varchar("password").notNull(),
    role: varchar("role", { length: 50 }),
    stripe_customer_id: varchar("stripe_customer_id").unique(),
    plan: varchar("plan", { length: 50 }),
    is_subscribed: boolean("is_subscribed").default(false),
  },
  (table) => [
    foreignKey({
      columns: [table.user_id],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
  ]
);

export const users_cases = pgTable(
  "users_cases",
  {
    user_id: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    case_id: integer("case_id")
      .references(() => cases.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.user_id, table.case_id] }),
    index("user_cases_uid_Idx").on(table.user_id),
    index("user_cases_cid_Idx").on(table.case_id),
  ]
);

export const users_friends = pgTable(
  "users_friends",
  {
    user1_id: integer("user1_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    user2_id: integer("user2_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    isFriend: boolean("is_friend").notNull().default(false),
  },

  (table) => [
    primaryKey({ columns: [table.user1_id, table.user2_id] }),
    check("add_self_check", sql`${table.user1_id} <> ${table.user2_id}`),
  ]
);

export const users_games = pgTable(
  "users_games",
  {
    userId: integer("userId")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    opponentId: integer("opponentId").references(() => users.id, {
      onDelete: "cascade",
    }),
    gameId: integer("gameId")
      .references(() => games.id, { onDelete: "cascade" })
      .notNull(),
    hasWon: boolean("hasWon"),
    durationMs: integer("durationMs").default(0).notNull(),
    data: jsonb("data").$type<ReducedRecordObject>().notNull(),
  },
  (table) => [uniqueIndex("usersGamesIndex").on(table.gameId, table.userId)]
);

export const users_mistakes = pgTable(
  "users_mistakes",
  {
    userId: integer("userId").references(() => users.id, {
      onDelete: "cascade",
    }),
    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "cascade",
    }),
    count: integer("count").default(0).notNull(),
  },
  (table) => [uniqueIndex("categoryId_Idx").on(table.userId, table.categoryId)]
);

export const cases_questions = pgTable(
  "cases_questions",
  {
    case_id: integer("case_id")
      .references(() => cases.id, { onDelete: "cascade" })
      .notNull(),
    question_id: integer("question_id")
      .references(() => questions.id, { onDelete: "cascade" })
      .notNull(),
    isStudyMode: boolean("isStudyMode").default(false),
    imgUrls: text("imgUrls").array().notNull().default([]),
    explanation: varchar("explanation").notNull(),
    explanationImgUrls: text("explanationImgUrls")
      .array()
      .notNull()
      .default([]),
  },
  (table) => [primaryKey({ columns: [table.case_id, table.question_id] })]
);

export const questions_choices = pgTable(
  "questions_choices",
  {
    question_id: integer("question_id")
      .references(() => questions.id, { onDelete: "cascade" })
      .notNull(),
    choice_id: integer("choice_id")
      .references(() => choices.id, { onDelete: "cascade" })
      .notNull(),
    explanation: text("explanation"),
    isCorrect: boolean("isCorrect"),
  },
  (table) => [primaryKey({ columns: [table.question_id, table.choice_id] })]
);

///
const query = new QueryBuilder();
export const SystemsCategoriesView = pgView("systems_categories_view").as(
  (qb) =>
    qb
      .select({
        id: systems.id,
        name: systems.name,
        categories: jsonAggBuildObject({
          id: categories.id,
          name: categories.name,
        }).as("categories"),
      })
      .from(systems)
      .innerJoin(categories, eq(systems.id, categories.system_id))
      .orderBy(systems.id)
      .groupBy(systems.name, systems.id)
);

const QuestionsChoicesCTE = query.$with("QuestionsChoicesCTE").as((qb) =>
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

export const CasesQuestionsChoicesView = pgView(
  "cases_questions_choices_view"
).as((qb) =>
  qb
    .with(QuestionsChoicesCTE)
    .select({
      ...getTableColumns(cases),
      questions: jsonAggBuildObject({
        ...QuestionsChoicesCTE._.selectedFields,
        ...getTableColumnsExcept(cases_questions, ["case_id", "question_id"]),
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

export const views = {
  SystemsCategoriesView,
  CasesQuestionsChoicesView,
};
