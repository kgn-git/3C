# Jest scaffold reference

```javascript
const { yourFunction } = require("./yourModule");

describe("yourFunction", () => {
  it("does the expected thing", () => {
    // Arrange
    // Act
    const result = yourFunction(/* args */);
    // Assert
    expect(result).toBeDefined();
  });
});
```

For TypeScript Jest setups, replace `require` with `import { yourFunction } from "./yourModule";` and the `.test.js` suffix with `.test.ts`.
