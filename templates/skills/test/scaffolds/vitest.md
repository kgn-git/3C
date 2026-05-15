# Vitest scaffold reference

```typescript
import { describe, it, expect } from "vitest";
import { yourFunction } from "./yourModule";

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
