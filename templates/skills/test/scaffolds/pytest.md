# pytest scaffold reference

A scaffold is the RED half of red/green. It must **fail on arrival** — an assertion that passes
the moment the symbol exists looks like coverage and proves nothing. Replace the `pytest.fail`
line with a real assertion about behaviour; do not delete it and leave the test empty.

```python
import pytest

from your_module import your_function


def test_your_function():
    # Arrange
    # Act
    # Assert — replace this line with what your_function should actually do,
    # e.g. assert your_function(2, 3) == 5
    pytest.fail("not implemented — assert what your_function should do")
```

**Not this.** Every line below passes without asserting anything about behaviour:

```python
assert result is not None   # true for any non-None return
assert result               # true for any truthy value
assert your_function        # true because you imported it
```

Pytest discovers files matching `test_*.py` or `*_test.py`. Convention varies — read `.claude/rules/` for the team's choice.
