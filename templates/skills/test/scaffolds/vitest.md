# Vitest scaffold reference

A scaffold is the RED half of red/green. It must **fail on arrival** — an assertion that passes
the moment the symbol exists looks like coverage and proves nothing. Replace the `expect.fail`
line with a real assertion about behaviour; do not delete it and leave the test empty.

```typescript
import { describe, it, expect } from "vitest";
import { yourFunction } from "./yourModule";

describe("yourFunction", () => {
  it("does the expected thing", () => {
    // Arrange
    // Act
    // Assert — replace this line with what yourFunction should actually do,
    // e.g. expect(yourFunction(2, 3)).toBe(5);
    expect.fail("not implemented — assert what yourFunction should do");
  });
});
```

**Not this.** Every line below passes without asserting anything about behaviour:

```typescript
expect(result).toBeDefined();        // true for any non-undefined return
expect(result).toBeTruthy();         // true for any non-empty value
expect(yourFunction).toBeDefined();  // true because you imported it
```
