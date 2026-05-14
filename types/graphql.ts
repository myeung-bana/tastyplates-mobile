/**
 * GraphQL response wrapper types.
 * Used when typing raw Apollo query/mutation responses.
 */

/** Standard paginated connection with cursor info. */
export interface Connection<T> {
  edges: Array<{ node: T; cursor: string }>
  pageInfo: PageInfo
  totalCount?: number
}

export interface PageInfo {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

/** Hasura aggregate response shape. */
export interface AggregateResponse {
  aggregate: {
    count: number
  }
}

/** Hasura mutation affected_rows response. */
export interface AffectedRowsResponse {
  affected_rows: number
}

/** Hasura insert_one response. */
export interface InsertOneResponse<T = { id: string }> {
  returning: T[]
}

/** Generic nullable field — common in Hasura GraphQL where fields can be null. */
export type Nullable<T> = T | null

/** Hasura UUID scalar — represented as a string in the client. */
export type UUID = string

/** Hasura timestamptz scalar. */
export type Timestamptz = string

/** Hasura numeric scalar. */
export type Numeric = number

/** Hasura jsonb scalar. */
export type Jsonb = Record<string, unknown>
