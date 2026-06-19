import { defineConfig } from "drizzle-kit";
import { resolveDatabaseUrl } from "./src/resolve-database-url";

const databaseUrl = resolveDatabaseUrl();
if (!databaseUrl) {
  throw new Error("DATABASE_URL — ensure the database is provisioned");
}

export default defineConfig({
  // Drizzle Kit resolves globs from this config file's directory (lib/db).
  schema: "./src/schema/*.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
