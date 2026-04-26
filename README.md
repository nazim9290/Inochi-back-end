# Inochi Back-end

REST API for **Inochi Global Education Institute**. Powers the public site (`Inochi-global`) and the admin dashboard (`inochi-admin`).

## Stack

- **Runtime:** Node.js ≥ 18 (CommonJS)
- **Framework:** Express 4
- **Database:** PostgreSQL via Sequelize 6 (`pg` driver)
- **Auth:** JWT (`jsonwebtoken`) + bcrypt
- **Storage:** Cloudinary for media; multer for uploads
- **Port:** 5000 (or `PORT` env var)

## Folder layout

```
.
├── app.js                # express bootstrap, route mounting, sequelize.authenticate
├── config/database.js    # Sequelize instance (reads DATABASE_URL or PG_* env vars)
├── controllers/          # request handlers
├── routes/               # route definitions
├── middleware/           # auth, admin, student guards
├── models/               # Sequelize models + index.js with associations
├── helpers/              # bcrypt password helpers
└── scripts/syncDb.js     # one-shot schema sync (`npm run db:sync`)
```

## Setup

```bash
npm install
cp .env.example .env      # then fill in real values
npm run dev               # nodemon, hot-reload
```

Production:
```bash
npm start                 # node app.js
```

## Environment variables

See `.env.example` for the canonical list. Required:

| Var | Purpose |
|---|---|
| `PORT` | HTTP port (default 8080 in code, 5000 in Docker) |
| `DATABASE_URL` | Single Postgres connection string (preferred) |
| `PG_HOST` / `PG_PORT` / `PG_USER` / `PG_PASSWORD` / `PG_DATABASE` | Alternative to `DATABASE_URL` |
| `PG_SSL` | `true` for managed providers requiring TLS |
| `DB_SYNC` | `true` runs `sequelize.sync({ alter: true })` on startup (dev only) |
| `JWT_SECRET` | HMAC secret for issuing/verifying JWTs |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary credentials |

## Scripts

| Script | What it does |
|---|---|
| `npm start` | Production: `node app.js` |
| `npm run dev` | Development: nodemon with auto-restart |
| `npm run db:sync` | Run `sequelize.sync()` once (`-- --force` to drop/recreate, `-- --alter` to alter) |
| `npm run lint` | ESLint on the whole tree |
| `npm run lint:fix` | ESLint with `--fix` |
| `npm run format` | Prettier writes the whole tree |
| `npm run format:check` | Prettier in check-only mode (CI) |

## Code style

- 2-space indent, single quotes, semicolons (Prettier-enforced).
- ESLint base config: `eslint:recommended` plus `no-unused-vars` warnings (allow `_`-prefixed) and `eqeqeq` smart.
- All folder names are plural for collections (`controllers/`, `routes/`, `models/`, `middleware/`, `helpers/`).

## Deploying

Built into a Docker image via the included `Dockerfile`:

```bash
docker build -t inochi-back-end .
docker run -p 5000:5000 --env-file .env inochi-back-end
```

`Jenkinsfile` is the CI/CD pipeline used in production.

## Renovation in progress

See [../RENOVATION.md](../RENOVATION.md) for the workspace-wide renovation tracker, including the Postgres migration and pending secret rotation.
