/**
 * @fileoverview Custom made drizzle-orm helpers
 */

import {
  is,
  sql,
  type Table,
  type AnyColumn,
  type GetColumnData,
  type SQL,
} from "drizzle-orm";
import {
  type AnyPgColumn,
  PgColumn,
  PgTimestampString,
  type SelectedFields,
} from "drizzle-orm/pg-core";
import { type SelectResultFields } from "drizzle-orm/query-builders/select.types";
import { getTableColumns } from "drizzle-orm";

export function getTableColumnsExcept<
  T extends Table,
  K extends keyof T["_"]["columns"],
>(table: T, columnsToExclude: K[]): Omit<T["_"]["columns"], K> {
  const result = {} as any;
  for (const [key, value] of Object.entries(getTableColumns(table))) {
    if (!columnsToExclude.includes(key as K)) result[key] = value;
  }
  return result;
}

export function pickJsonbField<
  U,
  K extends keyof U,
  T extends PgColumn = PgColumn,
>(column: T, field: K, cast?: "uuid") {
  return sql<U[K]>`((${column}->${field})${
    cast ? sql.raw(`::${cast}`) : undefined
  })`;
}
export type ExtractSQLAliasedTypes<T> = {
  [K in keyof T as T[K] extends SQL.Aliased
    ? K
    : never]: T[K] extends SQL.Aliased<infer R>
    ? R extends never
      ? never
      : R
    : never;
} & unknown;
export type ExtractCTETypes<T> = {
  [K in keyof T as T[K] extends AnyPgColumn | SQL.Aliased
    ? K
    : never]: T[K] extends AnyPgColumn<infer R>
    ? R["data"]
    : T[K] extends SQL.Aliased<infer M>
      ? M extends never
        ? never
        : M
      : never;
} & unknown;

export const jsonAgg = <Column extends AnyColumn>(column: Column) =>
  coalesce<GetColumnData<Column, "raw">[]>(
    sql`json_agg(${sql`${column}`})`,
    sql`'[]'`
  );
export function coalesce<T>(value: SQL.Aliased<T> | SQL<T>, defaultValue: SQL) {
  return sql<T>`coalesce(${value}, ${defaultValue})`;
}
export const arrayAgg = <Column extends AnyColumn>(column: Column) =>
  sql<
    GetColumnData<Column, "raw">[]
  >`array_agg(distinct ${sql`${column}`}) filter (where ${column} is not null)`;

export function jsonBuildObject<T extends SelectedFields>(shape: T) {
  const chunks: SQL[] = [];

  Object.entries(shape)
    .filter(([_, value]) => value)
    .forEach(([key, value]) => {
      if (chunks.length > 0) chunks.push(sql.raw(`,`));

      chunks.push(sql.raw(`'${key}',`));
      if (is(value, PgTimestampString))
        // json_build_object formats to ISO 8601 ...
        chunks.push(sql`timezone('UTC', ${value})`);
      else chunks.push(sql`${value}`);
    });

  return sql<SelectResultFields<T>>`json_build_object(${sql.join(chunks)})`;
}

export function jsonAggBuildObject<
  T extends SelectedFields,
  Column extends AnyColumn,
>(
  shape: T,
  options?: { orderBy?: { colName: Column; direction: "ASC" | "DESC" } }
) {
  return sql<SelectResultFields<T>[]>`coalesce(
    json_agg(${jsonBuildObject(shape)}
    ${
      options?.orderBy
        ? sql`ORDER BY ${options.orderBy.colName} ${sql.raw(
            options.orderBy.direction
          )}`
        : undefined
    })
    ,'${sql`[]`}')`;
}

export function caseWhen<T>(when: SQL<unknown> | SQL.Aliased<unknown>) {
  const finalSql = sql<T>`CASE WHEN ${when}`;

  const state = {
    when: (whenValue: SQL<unknown> | SQL.Aliased<unknown>) => {
      finalSql.append(sql` WHEN ${whenValue} `);
      return {
        then: (thenValue: SQL<T> | SQL.Aliased<T> | AnyColumn) => {
          finalSql.append(sql` THEN ${thenValue} `);
          return state;
        },
      };
    },

    else: (elseValue: SQL<T> | SQL.Aliased<T> | AnyColumn) => {
      finalSql.append(sql` ELSE ${elseValue} END`);
      return finalSql;
    },
  };

  return {
    then: (then: SQL<T> | SQL.Aliased<T> | AnyColumn) => {
      finalSql.append(sql` THEN ${then} `);
      return state;
    },
  };
}
