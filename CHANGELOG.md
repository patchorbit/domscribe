# Changelog

All notable changes to Domscribe are documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **MCP tool names normalized to underscore grammar (#33, closes #18).** Every
  MCP tool now uses the canonical `domscribe_<verb>_<object>` form
  (e.g. `domscribe_status`, `domscribe_query_by_source`) so it loads in every
  MCP client, including strict clients like Windsurf/Cascade which enforce
  `^[a-zA-Z0-9_-]{1,64}$` and reject the previous dotted form. The pre-RCP
  dotted names continue to resolve through a deprecation alias layer:

  | Legacy name (deprecated)            | Canonical name                       |
  | ----------------------------------- | ------------------------------------ |
  | `domscribe.resolve`                 | `domscribe_resolve`                  |
  | `domscribe.resolve.batch`           | `domscribe_resolve_batch`            |
  | `domscribe.manifest.stats`          | `domscribe_manifest_stats`           |
  | `domscribe.manifest.query`          | `domscribe_manifest_query`           |
  | `domscribe.annotation.list`         | `domscribe_annotation_list`          |
  | `domscribe.annotation.get`          | `domscribe_annotation_get`           |
  | `domscribe.annotation.updateStatus` | `domscribe_annotation_update_status` |
  | `domscribe.annotation.process`      | `domscribe_annotation_process`       |
  | `domscribe.annotation.respond`      | `domscribe_annotation_respond`       |
  | `domscribe.annotation.search`       | `domscribe_annotation_search`        |
  | `domscribe.query.bySource`          | `domscribe_query_by_source`          |
  | `domscribe.status`                  | `domscribe_status`                   |

  **Alias window.** Legacy dotted names emit a deprecation warning on stderr
  when invoked and will be removed in the first major release after RCP
  v1.0.0. Existing `.mcp.json` configurations continue to work but should be
  migrated to canonical names — clients that strictly enforce the MCP grammar
  (notably Windsurf/Cascade) cannot resolve the legacy names at all.
