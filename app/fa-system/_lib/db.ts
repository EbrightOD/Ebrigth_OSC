import "server-only";
import { Pool } from "pg";

declare global {
  // Reuse the pool across hot reloads in dev so we don't exhaust connections.
  // Namespaced separately from any other pg pools the host app might keep.
  var __faPgPool: Pool | undefined;
}

// FA System reads from a different DB than the rest of OSC (studentrecords
// lives in ebrightleads_db, OSC uses ebright_hrfs). Use FA_DATABASE_URL when
// present, else fall back to DATABASE_URL for environments where they happen
// to be the same.
function makePool(): Pool {
  const url = process.env.FA_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("FA_DATABASE_URL (or DATABASE_URL) is not set. Add it to .env / .env.local.");
  return new Pool({ connectionString: url, max: 5 });
}

export const pool: Pool = globalThis.__faPgPool ?? makePool();
if (process.env.NODE_ENV !== "production") globalThis.__faPgPool = pool;
