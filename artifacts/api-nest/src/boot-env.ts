/**
 * Pre-flight env checks for api-nest.
 *
 * Runs before AppModule is imported so missing DATABASE_URL does not surface as
 * an opaque `@workspace/db` throw during module graph load (common on Replit
 * deploy when Secrets are not wired to production).
 */
export function assertBootEnv(opts: {
  sessionSecret: string
  devSessionSecret: string
}): void {
  const isProd = process.env["NODE_ENV"] === "production"

  if (!process.env["DATABASE_URL"]?.trim()) {
    console.error(
      "[api-nest] FATAL: DATABASE_URL is not set. Provision Replit Postgres and add DATABASE_URL to Deployment Secrets.",
    )
    process.exit(1)
  }

  if (isProd && opts.sessionSecret === opts.devSessionSecret) {
    console.error(
      "[api-nest] FATAL: SESSION_SECRET must be set to a strong, unique value in production. Refusing to start with the known dev secret.",
    )
    process.exit(1)
  }
}
