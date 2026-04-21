/**
 * Shared fake Supabase client for API-route tests.
 *
 * Seeds a set of tables with rows, then exposes a client that mimics the real
 * Supabase fluent API: `.from().select().eq().in()...`. Tests write their
 * expectations against the same shape they'd see in production. Writes
 * (`insert`, `update`, `delete`) mutate the seeded tables so follow-up reads
 * see the change, and are also captured on `inserted` / `updated` / `deleted`
 * for assertions.
 *
 * Supports every operator the current API routes actually call. Add more
 * operators here when a new route needs one — keep the mock honest.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>
type TableSeed = Record<string, Row[]>

type FilterOp = 'eq' | 'in' | 'gte' | 'lte'
type Filter = { op: FilterOp; col: string; val: unknown }
type Order = { col: string; desc: boolean }

export interface MockDbCapture {
  /** Fluent Supabase-shaped client. Cast as `SupabaseClient` when passing to route handlers. */
  db: SupabaseClient
  /** Live reference to the seeded tables — inserts/updates mutate this. */
  tables: TableSeed
  /** Rows appended by `.insert()`, keyed by table. Auto-generated ids are included. */
  inserted: Record<string, Row[]>
  /** Update calls, keyed by table. Each entry captures the values and the filters at call time. */
  updated: Record<string, Array<{ values: Row; filters: Filter[] }>>
  /** Delete calls, keyed by table. Each entry captures the filters at call time. */
  deleted: Record<string, Array<{ filters: Filter[] }>>
}

export function makeMockDb(seed: TableSeed = {}): MockDbCapture {
  const tables: TableSeed = {}
  for (const k of Object.keys(seed)) tables[k] = seed[k].map((r) => ({ ...r }))

  const inserted: Record<string, Row[]> = {}
  const updated: Record<string, Array<{ values: Row; filters: Filter[] }>> = {}
  const deleted: Record<string, Array<{ filters: Filter[] }>> = {}
  const idCounters: Record<string, number> = {}

  const impl = {
    tables,
    inserted,
    updated,
    deleted,
    nextId(table: string): string {
      idCounters[table] = (idCounters[table] ?? 0) + 1
      return `${table}-id-${idCounters[table]}`
    },
    resolveRead(table: string, filters: Filter[], order: Order | null, limitN: number | null) {
      let rows = (tables[table] ?? []).slice()
      for (const f of filters) rows = rows.filter((r) => matchesFilter(r, f))
      if (order) {
        const { col, desc } = order
        rows = rows.slice().sort((a, b) => compare(a[col], b[col], desc))
      }
      if (limitN !== null) rows = rows.slice(0, limitN)
      return { data: rows, error: null as null }
    },
    recordInsert(table: string, rows: Row[]): Row[] {
      const stored = rows.map((r) => (r.id !== undefined ? { ...r } : { ...r, id: this.nextId(table) }))
      if (!tables[table]) tables[table] = []
      tables[table].push(...stored)
      if (!inserted[table]) inserted[table] = []
      inserted[table].push(...stored)
      return stored
    },
    recordUpdate(table: string, values: Row, filters: Filter[]) {
      if (!updated[table]) updated[table] = []
      updated[table].push({ values, filters })
      for (const row of tables[table] ?? []) {
        if (filters.every((f) => matchesFilter(row, f))) Object.assign(row, values)
      }
    },
    recordDelete(table: string, filters: Filter[]) {
      if (!deleted[table]) deleted[table] = []
      deleted[table].push({ filters })
      if (tables[table]) {
        tables[table] = tables[table].filter((r) => !filters.every((f) => matchesFilter(r, f)))
      }
    },
  }

  const db = {
    from(table: string) {
      return new TableClient(table, impl)
    },
  } as unknown as SupabaseClient

  return { db, tables, inserted, updated, deleted }
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

interface MockImpl {
  tables: TableSeed
  inserted: Record<string, Row[]>
  updated: Record<string, Array<{ values: Row; filters: Filter[] }>>
  deleted: Record<string, Array<{ filters: Filter[] }>>
  nextId(table: string): string
  resolveRead(table: string, filters: Filter[], order: Order | null, limitN: number | null): { data: Row[]; error: null }
  recordInsert(table: string, rows: Row[]): Row[]
  recordUpdate(table: string, values: Row, filters: Filter[]): void
  recordDelete(table: string, filters: Filter[]): void
}

class TableClient {
  constructor(private table: string, private impl: MockImpl) {}
  select(_cols?: string): SelectBuilder { return new SelectBuilder(this.table, this.impl) }
  insert(rows: Row | Row[]): InsertBuilder {
    const arr = Array.isArray(rows) ? rows : [rows]
    return new InsertBuilder(this.table, arr, this.impl)
  }
  update(values: Row): UpdateBuilder { return new UpdateBuilder(this.table, values, this.impl) }
  upsert(rows: Row | Row[]): InsertBuilder {
    const arr = Array.isArray(rows) ? rows : [rows]
    return new InsertBuilder(this.table, arr, this.impl)
  }
  delete(): DeleteBuilder { return new DeleteBuilder(this.table, this.impl) }
}

class SelectBuilder {
  private filters: Filter[] = []
  private orderSpec: Order | null = null
  private limitN: number | null = null
  constructor(private table: string, private impl: MockImpl) {}

  select(_cols?: string): this { return this }
  eq(col: string, val: unknown): this { this.filters.push({ op: 'eq', col, val }); return this }
  in(col: string, val: unknown[]): this { this.filters.push({ op: 'in', col, val }); return this }
  gte(col: string, val: unknown): this { this.filters.push({ op: 'gte', col, val }); return this }
  lte(col: string, val: unknown): this { this.filters.push({ op: 'lte', col, val }); return this }
  order(col: string, opts: { ascending: boolean }): this { this.orderSpec = { col, desc: !opts.ascending }; return this }
  limit(n: number): this { this.limitN = n; return this }

  single(): Promise<{ data: Row | null; error: null }> {
    const { data } = this.impl.resolveRead(this.table, this.filters, this.orderSpec, this.limitN)
    return Promise.resolve({ data: data[0] ?? null, error: null })
  }
  maybeSingle(): Promise<{ data: Row | null; error: null }> { return this.single() }

  then<T1 = { data: Row[]; error: null }, T2 = never>(
    onFulfilled?: ((v: { data: Row[]; error: null }) => T1 | PromiseLike<T1>) | null,
    onRejected?: ((r: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    return Promise.resolve(this.impl.resolveRead(this.table, this.filters, this.orderSpec, this.limitN)).then(
      onFulfilled ?? undefined,
      onRejected ?? undefined,
    )
  }
}

class InsertBuilder {
  private stored: Row[]
  constructor(private table: string, rows: Row[], private impl: MockImpl) {
    this.stored = impl.recordInsert(table, rows)
  }
  select(_cols?: string): this { return this }
  single(): Promise<{ data: Row | null; error: null }> {
    return Promise.resolve({ data: this.stored[0] ?? null, error: null })
  }
  maybeSingle(): Promise<{ data: Row | null; error: null }> { return this.single() }
  then<T1 = { data: Row[]; error: null }, T2 = never>(
    onFulfilled?: ((v: { data: Row[]; error: null }) => T1 | PromiseLike<T1>) | null,
    onRejected?: ((r: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    return Promise.resolve({ data: this.stored, error: null as null }).then(
      onFulfilled ?? undefined,
      onRejected ?? undefined,
    )
  }
}

class UpdateBuilder {
  private filters: Filter[] = []
  private applied = false
  constructor(private table: string, private values: Row, private impl: MockImpl) {}
  eq(col: string, val: unknown): this { this.filters.push({ op: 'eq', col, val }); return this }
  in(col: string, val: unknown[]): this { this.filters.push({ op: 'in', col, val }); return this }
  gte(col: string, val: unknown): this { this.filters.push({ op: 'gte', col, val }); return this }
  lte(col: string, val: unknown): this { this.filters.push({ op: 'lte', col, val }); return this }
  match(obj: Row): this {
    for (const [col, val] of Object.entries(obj)) this.filters.push({ op: 'eq', col, val })
    return this
  }
  private apply() {
    if (this.applied) return
    this.applied = true
    this.impl.recordUpdate(this.table, this.values, this.filters)
  }
  then<T1 = { data: null; error: null }, T2 = never>(
    onFulfilled?: ((v: { data: null; error: null }) => T1 | PromiseLike<T1>) | null,
    onRejected?: ((r: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    this.apply()
    return Promise.resolve({ data: null as null, error: null as null }).then(
      onFulfilled ?? undefined,
      onRejected ?? undefined,
    )
  }
}

class DeleteBuilder {
  private filters: Filter[] = []
  private applied = false
  constructor(private table: string, private impl: MockImpl) {}
  eq(col: string, val: unknown): this { this.filters.push({ op: 'eq', col, val }); return this }
  in(col: string, val: unknown[]): this { this.filters.push({ op: 'in', col, val }); return this }
  match(obj: Row): this {
    for (const [col, val] of Object.entries(obj)) this.filters.push({ op: 'eq', col, val })
    return this
  }
  private apply() {
    if (this.applied) return
    this.applied = true
    this.impl.recordDelete(this.table, this.filters)
  }
  then<T1 = { data: null; error: null }, T2 = never>(
    onFulfilled?: ((v: { data: null; error: null }) => T1 | PromiseLike<T1>) | null,
    onRejected?: ((r: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    this.apply()
    return Promise.resolve({ data: null as null, error: null as null }).then(
      onFulfilled ?? undefined,
      onRejected ?? undefined,
    )
  }
}

// ---------------------------------------------------------------------------
// Filter + sort helpers
// ---------------------------------------------------------------------------

function matchesFilter(row: Row, f: Filter): boolean {
  const v = row[f.col]
  if (f.op === 'eq') return v === f.val
  if (f.op === 'in') return (f.val as unknown[]).includes(v)
  if (f.op === 'gte') return compareValues(v, f.val) >= 0
  if (f.op === 'lte') return compareValues(v, f.val) <= 0
  return false
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const as = String(a)
  const bs = String(b)
  return as < bs ? -1 : as > bs ? 1 : 0
}

function compare(a: unknown, b: unknown, desc: boolean): number {
  const c = compareValues(a, b)
  return desc ? -c : c
}
