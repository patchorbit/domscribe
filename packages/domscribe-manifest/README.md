# @domscribe/manifest

Append-only manifest writer/reader used by the Resolver and tooling. Phase M1 provides:

- JSONL writer (`.domscribe/manifest/manifest.jsonl`) and in-memory index builder.
- Minimal APIs to append entries, rebuild the index, and look up entries by ID.

This module intentionally avoids IO in tests by allowing custom base paths.

