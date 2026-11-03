/** 이 파일은 store.ts를 통해서만 쓰인다. server-only 가드는 store.ts가 들고 있다. */

/**
 * Postgres 연결. DATABASE_URL이 있을 때만 쓴다.
 *
 * 쿼리는 전부 "문장 + 값 배열" 형태로 쓴다(`$1`, `$2` …).
 * 그래야 운영에서는 postgres.js로, 테스트에서는 PGlite로 같은 코드를 돌릴 수 있다.
 */

export type Row = Record<string, unknown>;
export type QueryFn = (text: string, params?: unknown[]) => Promise<Row[]>;

let override: QueryFn | null = null;

/** 테스트에서 다른 드라이버(PGlite 등)를 끼울 때. */
export function setQueryFn(fn: QueryFn | null): void {
  override = fn;
}

export const hasDatabase = (): boolean => Boolean(override || process.env.DATABASE_URL);

type Sql = {
  unsafe: (text: string, params?: unknown[]) => Promise<unknown>;
  end: () => Promise<void>;
};

const g = globalThis as unknown as { __sql?: Sql };

async function client(): Promise<Sql> {
  if (g.__sql) return g.__sql;
  const { default: postgres } = await import("postgres");
  // 서버리스라 연결을 적게 쓴다. 인스턴스가 살아 있는 동안 재사용한다.
  const sql = postgres(process.env.DATABASE_URL!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false, // Neon 풀러(pgbouncer)에서는 prepared statement를 쓰지 않는다
  }) as unknown as Sql;
  g.__sql = sql;
  return sql;
}

export const query: QueryFn = async (text, params = []) => {
  if (override) return override(text, params);
  const sql = await client();
  const rows = (await sql.unsafe(text, params)) as Row[];
  return rows;
};

/** 한 줄만 기대할 때. */
export async function one<T = Row>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query(text, params);
  return (rows[0] as T) ?? null;
}

/** 스키마 적용. 처음 한 번, 또는 테스트에서. */
export async function migrate(schemaSql: string): Promise<void> {
  // 세미콜론으로 끊어 한 문장씩 — PGlite가 여러 문장을 한 번에 받지 못하는 경우가 있다.
  for (const stmt of schemaSql.split(/;\s*\n/).map((x) => x.trim()).filter(Boolean)) {
    await query(stmt);
  }
}
