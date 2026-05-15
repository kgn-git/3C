Testing follows the Testing Trophy:

- Static analysis (TypeScript, ESLint, etc.) MUST run on every change as the broadest layer of safety.
- Integration tests SHOULD form the bulk of the runtime test suite — they catch real cross-component issues.
- Unit tests SHOULD cover non-trivial pure logic; do not duplicate what integration tests already verify.
- A small set of end-to-end tests MAY exercise critical user journeys.

> Source: Kent C. Dodds, *The Testing Trophy and Testing Classifications* — https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications.
