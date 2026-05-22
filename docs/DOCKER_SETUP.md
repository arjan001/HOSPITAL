# Docker Setup — Self-hosted Postgres for Shaniid RX

This guide is for **self-hosting** Shaniid RX on a Linux server / VPS. If you
are running on Replit, you do **not** need Docker — use the managed Postgres
on Replit (the `DATABASE_URL` secret) instead. Replit's platform doesn't run
Docker containers.

## What you get

- **Postgres 16** (Alpine) for the app.
- **Adminer** — lightweight DB browser on port `8081`.
- A named volume `shaniidrx-pgdata` so your data survives container restarts.
- A first-boot init script that enables `pgcrypto` and `citext`.

## Prerequisites

- Docker 24+ and Docker Compose v2 (`docker compose`, not `docker-compose`).
- Outbound network access from the host to pull `postgres:16-alpine` and
  `adminer:4`.

## One-time setup

```bash
# from the repo root
cp .env.docker.example .env.docker
# edit .env.docker — at minimum, change POSTGRES_PASSWORD
nano .env.docker

docker compose --env-file .env.docker up -d
docker compose ps          # both services should be "running (healthy)"
```

## Wire the app to the DB

Set the same `DATABASE_URL` in the app's env (Replit Secrets, systemd unit,
`.env`, whatever you use):

```
DATABASE_URL=postgres://shaniidrx:YOUR_PASSWORD@localhost:5432/shaniidrx
```

Then push the schema:

```bash
pnpm --filter @workspace/db run push
```

## Common operations

| Task | Command |
|---|---|
| Tail logs | `docker compose logs -f postgres` |
| Open a psql shell | `docker compose exec postgres psql -U shaniidrx -d shaniidrx` |
| Stop everything | `docker compose down` |
| Stop + wipe data | `docker compose down -v` (⚠ deletes the volume) |
| Backup to a file | `docker compose exec postgres pg_dump -U shaniidrx shaniidrx > backup.sql` |
| Restore a backup | `cat backup.sql \| docker compose exec -T postgres psql -U shaniidrx -d shaniidrx` |
| Browse the DB in a UI | open <http://localhost:8081> (System: PostgreSQL, Server: `postgres`, User/Pwd from your `.env.docker`) |

## Upgrading Postgres

Major-version upgrades (e.g. 16 → 17) are not in-place. Recommended:

```bash
# 1. backup
docker compose exec postgres pg_dump -U shaniidrx shaniidrx > backup-pre-upgrade.sql

# 2. bump the image tag in docker-compose.yml (e.g. postgres:17-alpine)

# 3. remove the old volume and start fresh
docker compose down -v
docker compose --env-file .env.docker up -d

# 4. restore
cat backup-pre-upgrade.sql | docker compose exec -T postgres psql -U shaniidrx -d shaniidrx
```

## Production hardening (when you go live)

1. Put Postgres behind a private network (don't bind 5432 to a public IP).
   Set `POSTGRES_PORT=127.0.0.1:5432` or remove the `ports:` mapping entirely
   if the app runs in the same compose network.
2. Use a long random `POSTGRES_PASSWORD` (32+ chars).
3. Run `pg_dump` on a schedule (cron / systemd timer) and ship dumps to S3
   or another off-host destination.
4. Pin the Postgres image to a specific digest, not just a tag, so a malicious
   image push can't surprise you.
5. Remove the `adminer` service in production, or put it behind an auth proxy.

## Troubleshooting

- **`POSTGRES_PASSWORD is required`** — you forgot `--env-file .env.docker`
  or the file is missing the variable.
- **App can't connect** — confirm the password in `DATABASE_URL` matches
  `.env.docker`. From the host: `pg_isready -h localhost -p 5432`.
- **"no pg_hba.conf entry"** — you're connecting from outside the host. Add
  the client subnet to a custom `pg_hba.conf` and mount it into
  `/etc/postgresql/pg_hba.conf`.
