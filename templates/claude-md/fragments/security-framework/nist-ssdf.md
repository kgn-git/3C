Security follows NIST SSDF (Secure Software Development Framework):

- Secure coding training MUST be completed by all engineers contributing to security-relevant code.
- SAST scanning SHOULD run in the IDE and in CI; high-severity findings MUST block merge.
- Software supply chain integrity SHOULD be tracked (SBOMs, signed releases, dependency updates).
- Security-relevant decisions SHOULD be documented in ADRs.

> Source: NIST SP 800-218, *Secure Software Development Framework* — https://csrc.nist.gov/publications/detail/sp/800-218/final.
