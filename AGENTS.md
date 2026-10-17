# AGENTS.md: Project Rules & Operational Instructions for Antigravity

Welcome to **ClipVault**. This document defines the engineering standards, operational constraints, and workflow rules that all AI agents must follow when working in this codebase.

---

## 1. Project Summary & Tech Stack

ClipVault is a multi-platform, privacy-conscious clipboard persistence and synchronization system. It captures clipboard content whenever a user copies on a supported device (Android 16 / Samsung One UI 8, Windows 10/11), stores it in a durable local database, and synchronizes it across authorized devices via Supabase.

- **Desktop Agent**: Windows 10/11 native capture agent using Win32 clipboard format listeners (`WM_CLIPBOARDUPDATE`), Node.js / TypeScript, SQLite WAL persistence.
- **Android App**: Native Kotlin, Jetpack Compose Material 3, Room Database (SQLite + WAL), AccessibilityService / TileService / Share Intent receivers.
- **Web Dashboard**: React 19 SPA, Vite, TypeScript, Custom CSS Tokens (Zero Tailwind), Supabase Client.
- **Backend**: Supabase (PostgreSQL 15+, Row Level Security, Supabase Auth, Supabase Storage, Realtime WebSockets).
- **Shared Contracts**: `@clipvault/shared` monorepo package with Zod validation, SHA-256 hashers, and TypeScript types.
- **Testing**: Native Node.js Test Runner (`node:test`, `node:assert/strict`) via `tsx`, Gradle test runner for Android.

---

## 2. Directory Structure & Architecture Boundaries

```
clipvault/
├── docs/                      # Authoritative documentation (FEASIBILITY, ARCHITECTURE, THREAT_MODEL, PLAN, ACCEPTANCE)
├── packages/
│   ├── shared/                # Universal TypeScript contracts, validators (Zod), and hash utils
│   ├── desktop-agent/         # Windows 10/11 native clipboard capture agent & SQLite database
│   ├── web-dashboard/         # React 19 / Vite Web Dashboard
│   └── backend-supabase/      # Supabase migrations, RLS policies, and seed data
├── android/                   # Native Kotlin & Jetpack Compose Android application
├── tests/                     # Automated cross-platform test suites
├── agent.md                   # Master product specification & requirements
├── AGENTS.md                  # This file (Agent operating instructions)
├── GEMINI.md                  # Mirror of AGENTS.md for IDE compatibility
└── package.json               # Monorepo workspace root configuration
```

### Architectural Boundaries
- **Zero Plaintext Logging**: Plaintext clipboard contents must NEVER be printed to `console.log`, stdout, debug logs, or error reports. Logs may only contain record IDs, content types, byte sizes, and status codes.
- **Local-First Durability**: Captured clipboard items must ALWAYS be written to durable local storage (SQLite / Room) before initiating network synchronization.
- **No Em Dashes**: Never use em dashes (`—`) in code, comments, documentation, or user copy. Use colons, commas, or spaced hyphens instead.
- **Zero Tailwind Rule**: In web components, use hand-crafted vanilla CSS with tokens. Do not import or configure Tailwind CSS unless the user explicitly commands it.

---

## 3. Engineering Loop & Quality Gates

Antigravity agents must adhere to the 12-step looping engineering process:
1. **Inspect**: Inspect the codebase and environment before proposing changes.
2. **Define**: Define small, verifiable engineering objectives.
3. **Implement**: Implement minimal, complete, non-breaking changes.
4. **Test**: Run type checks (`tsc --noEmit`) and unit tests (`npm test`).
5. **Verify**: Check actual runtime behavior and logs.
6. **Fix Root Causes**: If any test fails, fix the underlying defect immediately.
7. **Document**: Update `docs/PLAN.md`, `docs/ACCEPTANCE.md`, and changelogs.
8. **Commit**: Create clean atomic git commits with conventional commit messages.

---

## 4. Session Closure Protocol

At the end of every response or milestone completion, provide a clear, concise health summary covering:
- **Automated Tests**: Current test results and passing count.
- **Build Status**: TypeScript compiler checks and build verification.
- **Documentation Sync**: List of updated documentation files.
- **Git Status**: Commit hash or uncommitted changes.
- **Next Phase / Quality Gate**: The immediate next objective according to `docs/PLAN.md`.
