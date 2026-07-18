# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React + TypeScript frontend for the vocabulary learning backend. App wiring lives in `src/app`, including providers, routes, and layouts. Shared infrastructure lives in `src/shared`: API client, components, constants, hooks, types, and utilities. Feature code is grouped under `src/features/<feature>` with local `api`, `hooks`, `components`, `pages`, and `types` files. Static assets are in `src/assets`. There are currently no test files or dedicated test directory.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite dev server on port `5173`.
- `npm run build`: run TypeScript project build and create a production Vite build.
- `npm run preview`: serve the production build locally.
- `npm run lint`: declared in `package.json`, but ESLint is not currently installed/configured.
- `npm test`: not available yet because no `test` script exists.

## Coding Style & Naming Conventions

Use TypeScript with strict types and React function components. Keep feature-specific code inside its feature folder and shared reusable code under `src/shared`. Use PascalCase for React components and page files, camelCase for functions/hooks, and `use*` naming for hooks. Existing CSS uses BEM-like class names such as `button--primary` and `sidebar__link`. Prefer the existing `apiClient`, `queryKeys`, shared UI components, and local feature patterns over new abstractions.

## Testing Guidelines

No test framework is configured yet. When adding tests, first add an explicit test script and dependencies, then colocate tests near the code or use a clear `__tests__` convention. Prioritize coverage for `src/shared/api`, auth/session behavior, route guards, and complex learning flows.

## Commit & Pull Request Guidelines

There is no meaningful Git history yet; use clear imperative commit messages such as `Add vocabulary review tests`. Pull requests should include a short summary, verification commands with results, linked issues when relevant, and screenshots or screen recordings for visible UI changes.

## Security & Configuration Tips

Use `VITE_API_BASE_URL` for backend configuration; the default backend URL is `http://localhost:8080/vocab-learning`. Do not log JWTs, passwords, cookies, or authorization headers. Do not expose listening challenge solutions in the UI. Treat `backend_context.md` as the API source of truth and mark missing backend features, such as streak and push-token registration, as unavailable rather than inventing endpoints.
