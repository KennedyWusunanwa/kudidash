# KudiDash

KudiDash is a multi-tenant accounting SaaS scaffold built with Next.js App Router, TypeScript, TailwindCSS, shadcn/ui, Supabase, Zod, and React Hook Form.

## Stack

- Next.js 15 (App Router)
- TypeScript (strict)
- TailwindCSS + shadcn/ui
- Supabase (PostgreSQL + Auth + RLS + Storage hooks)
- Zod + React Hook Form
- Server Actions for all mutations
- Vercel-ready deployment

## Local Development

1. Copy environment variables and fill them in:

```bash
cp .env.example .env.local
```

2. Apply the database schema in Supabase SQL Editor (or via migrations tooling):

- `supabase/migrations/0001_kudidash.sql`

3. Run the app:

```bash
npm install
npm run dev
```

4. Open:

- `http://localhost:3000`

## Build / Lint

```bash
npm run lint
npm run build
```

## Deploy (Vercel)

1. Push to Git.
2. Import the repository into Vercel.
3. Configure environment variables from `.env.example`.
4. Apply the Supabase SQL schema to the target project.
5. Deploy.

## Security Warning

- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Never expose it to the browser or client components.
- Normal app flows should use the anon key + session JWT so Supabase RLS stays effective.

## Notes

- Database schema and RLS are defined in `supabase/migrations/0001_kudidash.sql`.
- Storage bucket naming/policies are scaffolded with `UNSPECIFIED` comments where business rules were not provided.
