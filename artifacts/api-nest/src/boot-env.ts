/**
 * Pre-flight env checks for api-nest.
 */
import { resolveDatabaseUrl } from "@workspace/db/resolve-database-url"

export function assertBootEnv(opts: {
  sessionSecret: string
  devSessionSecret: string
}): void {
  const isProd = process.env["NODE_ENV"] === "production"

  if (!resolveDatabaseUrl()) {
    console.error(
      "[api-nest] FATAL: No database connection found.",
    )
    console.error(
      "  On Replit: open Publishing → Production database settings and ensure your Replit database is linked to the deployment.",
    )
    console.error(
      "  Replit injects DATABASE_URL automatically — you do not paste it manually if the database is connected.",
    )
    console.error(
      "  In Cursor/local dev: set DATABASE_URL in .env.local pointing at your dev database.",
    )
    process.exit(1)
  }

  if (isProd && opts.sessionSecret === opts.devSessionSecret) {
    console.error(
      "[api-nest] FATAL: SESSION_SECRET must be set to a strong, unique value in production.",
    )
    console.error(
      "  On Replit: add SESSION_SECRET in Tools → Secrets (Deployments scope). This is separate from the managed database.",
    )
    process.exit(1)
  }
}
