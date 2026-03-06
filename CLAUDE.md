# CLAUDE.md

## Project Overview
A personal blog platform backend. Users can write and publish posts, follow each other, like and comment on posts, and browse content by category.

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **Database:** MongoDB (use Mongoose)
- **Package Manager:** npm
- **Testing:** Vitest + Supertest

## How to Run
```bash
npm run dev       # Start dev server
npm run build     # Compile TypeScript
npm run start     # Start compiled app
npm test          # Run tests with Vitest
```

## Code Conventions
- Use **TypeScript strictly** — no `any` types unless absolutely necessary
- Use `async/await`, never raw `.then()` chains
- Always define request/response types explicitly
- Keep controllers thin — business logic belongs in services
- Use a centralized error handler middleware; don't swallow errors silently

## Testing
- Use **Vitest** for unit tests and **Supertest** for integration/route tests
- Tests live in `tests/` and mirror the `src/` structure
- Always write tests for new routes and services
- After making changes, verify with `npm test` before considering a task done

## MongoDB / Mongoose
- Define schemas with strict TypeScript interfaces
- Use lean queries (`.lean()`) where you don't need Mongoose document methods

## What to Avoid
- Don't install new packages without asking first
- Don't use `require()` — this is an ESM/TypeScript project
- Don't bypass TypeScript errors with `// @ts-ignore`

## Verification Checklist
Before finishing any task:
1. `npm run build` passes with no errors
2. `npm test` passes
3. No unhandled promise rejections
4. New routes have corresponding tests