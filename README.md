# Inochi Back-end

REST API for **Inochi Global Education Institute**. Powers the public site (`Inochi-global`) and the admin dashboard (`inochi-admin`).

## Stack

- **Runtime:** Node.js ≥ 18 (CommonJS)
- **Framework:** Express 4
- **Database:** MongoDB via Mongoose 8 (migration to PostgreSQL in progress)
- **Auth:** JWT (`jsonwebtoken`) + bcrypt
- **Storage:** Cloudinary for media; multer for uploads
- **Port:** 5000 (or `PORT` env var)

## Folder layout

```
.
├── app.js                # express bootstrap, route mounting
├── database.js           # (legacy MySQL pool, to be removed after Postgres migration)
├── controllers/          # request handlers
├── routes/               # route definitions
├── middleware/           # auth, admin, student guards
├── models/               # Mongoose schemas
└── helpers/              # bcrypt password helpers
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
| `DB_USER`, `DB_PASS` | MongoDB Atlas credentials (Postgres equivalents coming) |
| `JWT_SECRET` | HMAC secret for issuing/verifying JWTs |

## Scripts

| Script | What it does |
|---|---|
| `npm start` | Production: `node app.js` |
| `npm run dev` | Development: nodemon with auto-restart |
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
