# Workspace Generators

This folder hosts reusable Nx generators that codify how we scaffold libraries, tooling, and adapters across the Domscribe workspace. Keeping the generators colocated with the workspace lets us evolve conventions without publishing a plugin and ensures new packages inherit the same defaults.

## Folder Layout

- `shared-library/` – scaffolding for reusable libraries (currently a stub that will be expanded alongside additional packages).
- Additional generators live in sibling folders following the `<feature>/index.ts` pattern.

Each generator is implemented in TypeScript, exports a documented default function, and ships with unit tests in the same folder. When authoring new generators, prefer using helpers from `@nx/devkit` and aim for idempotent behavior.
