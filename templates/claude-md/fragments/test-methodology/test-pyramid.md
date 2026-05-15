Testing follows the Test Pyramid:

- Most tests MUST be fast unit tests at the function or class level.
- Fewer integration tests SHOULD verify cross-component behaviour.
- A small set of end-to-end tests MAY verify critical user journeys.
- Slow tests SHOULD be tagged so they can be excluded from rapid feedback loops.

> Source: Mike Cohn, *Succeeding with Agile* (Addison-Wesley, 2009).
