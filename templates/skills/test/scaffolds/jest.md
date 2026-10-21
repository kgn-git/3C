# Jest scaffold reference

A scaffold is the RED half of red/green. It must **fail on arrival** — an assertion that passes
the moment the symbol exists looks like coverage and proves nothing. Replace the `throw` line
with a real assertion about behaviour; do not delete it and leave the test empty.

```javascript
const { yourFunction } = require("./yourModule");

describe("yourFunction", () => {
  it("does the expected thing", () => {
    // Arrange
    // Act
    // Assert — replace this line with what yourFunction should actually do,
    // e.g. expect(yourFunction(2, 3)).toBe(5);
    throw new Error("not implemented — assert what yourFunction should do");
  });
});
```

**Not this.** Every line below passes without asserting anything about behaviour:

```javascript
expect(result).toBeDefined();        // true for any non-undefined return
expect(result).toBeTruthy();         // true for any non-empty value
expect(yourFunction).toBeDefined();  // true because you required it
```

For TypeScript Jest setups, replace `require` with `import { yourFunction } from "./yourModule";` and the `.test.js` suffix with `.test.ts`.
