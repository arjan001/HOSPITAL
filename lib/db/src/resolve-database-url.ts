/**
 * Resolve Postgres connection string from environment.
 *
 * Replit managed databases inject `DATABASE_URL` automatically in the workspace
 * and (when linked in Publishing → Production database) on deployed apps.
 * Legacy Neon Replit DBs may expose PGHOST/PGUSER/... instead — build URL here.
 */
export function resolveDatabaseUrl(): string | undefined {
  const direct = process.env["DATABASE_URL"]?.trim()
  if (direct) return direct

  const host = process.env["PGHOST"]?.trim()
  const user = process.env["PGUSER"]?.trim()
  const database = process.env["PGDATABASE"]?.trim()
  const password = process.env["PGPASSWORD"]
  const port = process.env["PGPORT"]?.trim() || "5432"

  if (!host || !user || !database || password === undefined) {
    return undefined
  }

  const encodedUser = encodeURIComponent(user)
  const encodedPassword = encodeURIComponent(password)
  const url = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`
  process.env["DATABASE_URL"] = url
  return url
}
