# pytest scaffold reference

```python
from your_module import your_function


def test_your_function():
    # Arrange
    # Act
    result = your_function()  # args
    # Assert
    assert result is not None
```

Pytest discovers files matching `test_*.py` or `*_test.py`. Convention varies — read `.claude/rules/` for the team's choice.
