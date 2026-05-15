Tests run on Vitest:

- Test files MUST be named `*.test.ts` (or `*.spec.ts`) and live alongside the code or under a `tests/` directory.
- `describe` / `it` blocks MUST be imported from `vitest`, not used as globals.
- Tests MUST NOT depend on each other; ordering MUST NOT affect outcomes.
- New deps SHOULD be ESM-native; CJS shims are tolerated only when no alternative exists.

> Source: vitest.dev — https://vitest.dev/.
