# ClipVault

> Privacy-conscious, local-first clipboard persistence and multi-device synchronization across Windows 10/11, Android 16 (Samsung One UI 8), and the Modern Web.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Automated Tests](https://img.shields.io/badge/tests-22%2F22%20passing-success.svg)]()
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg)]()
[![TypeScript](https://img.shields.io/badge/typescript-v5.3+-blue.svg)]()
[![React](https://img.shields.io/badge/react-v19.0-61dafb.svg)]()
[![Android](https://img.shields.io/badge/android-16%20%7C%20One%20UI%208-green.svg)]()
[![Database](https://img.shields.io/badge/database-SQLite%20WAL%20%7C%20Supabase-3ecf8e.svg)]()
[![License](https://img.shields.io/badge/license-MIT-purple.svg)]()

---

## Overview

**ClipVault** is an enterprise-grade clipboard persistence and synchronization system designed to bridge clipboard history across mobile, desktop, and web environments without compromising user privacy.

Most clipboard sync tools rely on continuous polling or send unencrypted plaintext to third-party cloud servers. ClipVault is engineered around **local-first durability**, **zero plaintext logging**, and **event-driven OS hooks**, ensuring that every copied item is safely persisted on your device before network synchronization takes place.

---

## Core Capabilities

- **Zero Plaintext Logging**: Plaintext clipboard contents are never printed to console logs, error trackers, or debug output. Only deterministic SHA-256 hashes, content types, byte sizes, and status codes are recorded.
- **Local-First Durability**: Captured clipboard items are immediately written to local SQLite WAL (Windows) or Room Database WAL (Android) prior to network transit. Offline queues ensure seamless resilience across connection drops.
- **Privacy & Credential Protection**: Native process inspection detects and automatically drops clipboard events originating from known password managers (1Password, Bitwarden, KeePass, KeePassXC).
- **Event-Driven Capture (No CPU Polling)**:
  - **Windows**: Win32 native clipboard format listener (`AddClipboardFormatListener` / `WM_CLIPBOARDUPDATE`) for 0% idle CPU usage.
  - **Android (Android 16 / One UI 8)**: 4-tier ingestion strategy (Accessibility Service, Quick Settings Tile, Android Share Sheet receiver, Foreground catch-up).
  - **Web / Mobile PWA**: Secure HTTPS asynchronous clipboard API, mobile focus sync, and global native paste handling.
- **Auto-Categorized Segmented Board**: Intelligently classifies captured snippets into dedicated segments:
  - **Links & Web Resources**: Automatically sanitizes tracking parameters (`utm_*`, `fbclid`, `ref`, etc.) and tracks read status.
  - **Notes & Plain Text**: Captures raw text, documentation excerpts, and multi-line thoughts.
  - **Code & Snippets**: Syntax detection across TypeScript, JavaScript, Python, Rust, Go, SQL, HTML, CSS, JSON, and shell scripts.
- **Minimalist Link Status Tracker**:
  - Differentiates unread vs visited links with subtle badges (`● Unopened` in soft sky vs `✓ Opened` in slate).
  - Automatically marks links as opened upon click-through.
  - 1-tap manual status toggle and segment sub-filtering (`All`, `Unopened`, `Opened`).
- **Comprehensive Data Portability**: 1-click export of your full clipboard history into **JSON**, **CSV**, or formatted **Markdown**.

---

## System Architecture

```
                                  +------------------------------+
                                  |       Supabase Cloud         |
                                  | (PostgreSQL 15 + RLS + WS)   |
                                  +---------------+--------------+
                                                  ^
                                                  | TLS 1.3 / WSS
                   +------------------------------+------------------------------+
                   |                                                             |
                   v                                                             v
     +---------------------------+                                 +---------------------------+
     |   Windows Desktop Agent   |                                 |   Android Native App      |
     | (Win32 Hook + SQLite WAL) |                                 | (Accessibility + Room)    |
     +---------------------------+                                 +---------------------------+
                   ^                                                             ^
                   |                                                             |
                   +------------------------------+------------------------------+
                                                  |
                                                  v
                                    +---------------------------+
                                    |     Web Dashboard PWA     |
                                    | (React 19 + Custom CSS)   |
                                    +---------------------------+
```

### Monorepo Structure

```
clipvault/
├── packages/
│   ├── shared/                # Universal TypeScript models, Zod validation, SHA-256 hashers
│   ├── desktop-agent/         # Windows 10/11 native capture agent with SQLite WAL engine
│   ├── web-dashboard/         # React 19 / Vite mobile-optimized dashboard (Zero Tailwind)
│   └── backend-supabase/      # Supabase migrations, RLS security policies, seed fixtures
├── android/                   # Native Kotlin & Jetpack Compose Android 16 application
├── docs/                      # Authoritative architecture, threat model, feasibility, user guide
├── tests/                     # Cross-platform unit, integration, stress, and security test suite
├── package.json               # Monorepo workspace configuration
└── tsconfig.json              # Monorepo TypeScript base configuration
```

---

## Technology Stack

| Component | Technologies |
| :--- | :--- |
| **Desktop Agent** | Node.js v20+, TypeScript, SQLite3 (`better-sqlite3` WAL mode), Win32 API (`User32.dll`) |
| **Android App** | Kotlin 1.9+, Jetpack Compose, Material 3, Room Database (SQLite WAL), Android 16 SDK |
| **Web Dashboard** | React 19, TypeScript, Vite, Custom CSS Design Tokens (Zero Tailwind), Lucide Icons |
| **Cloud Backend** | Supabase (PostgreSQL 15, Row Level Security, Supabase Auth, Realtime WebSockets) |
| **Shared Core** | Zod Schema Validation, Web Crypto SHA-256, Node.js URL Sanitizer |
| **Testing** | Node.js Test Runner (`node:test`, `node:assert/strict`), `tsx` |

---

## Quick Start

### 1. Prerequisites

- **Node.js**: v20.0.0 or higher (v22+ recommended)
- **npm**: v10.0.0 or higher
- **Windows**: Windows 10 (Build 19041+) or Windows 11 (for Desktop Agent)
- **Android**: Android 10+ (tested on Android 16 / Samsung One UI 8)
- **Java**: JDK 17 (Microsoft OpenJDK or Eclipse Temurin, for Android build)

### 2. Installation

Clone the repository and install all workspace dependencies:

```bash
git clone https://github.com/thejasteju54-lgtm/clipvault.git
cd clipvault
npm install
```

---

## Running the Components

### A. Web Dashboard & Mobile PWA

The Web Dashboard offers a mobile-first interface optimized for touch devices, with live clipboard sync, segmented accordions, and unread link tracking.

To run locally with HTTPS (required by mobile browsers to access the Clipboard API):

```bash
npm run dev --workspace=@clipvault/web-dashboard
```

The server binds to all network interfaces (`https://0.0.0.0:3000` / `https://<YOUR-LOCAL-IP>:3000`).
Open the local IP link on your phone (e.g. `https://192.168.1.X:3000`) and accept the self-signed certificate to enable full mobile clipboard sync.

To create a production build:

```bash
npm run build --workspace=@clipvault/web-dashboard
```

Assets are output to `packages/web-dashboard/dist/`.

---

### B. Windows Desktop Agent

The Windows agent runs quietly in the background, listening for system-wide `WM_CLIPBOARDUPDATE` events.

```powershell
# Development mode
npm run dev --workspace=@clipvault/desktop-agent

# Production build and run
npm run build --workspace=@clipvault/desktop-agent
npm start --workspace=@clipvault/desktop-agent
```

Captured clipboard history is stored securely in `%LOCALAPPDATA%\ClipVault\vault.sqlite`.

---

### C. Android Native Application

The Android app provides native accessibility capture, a Quick Settings tile, and share target integration on modern Android devices:

```bash
cd android
./gradlew assembleDebug
```

The generated APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

Install on a connected device via ADB:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

### D. Supabase Backend Setup

1. Open your Supabase project dashboard.
2. Run the SQL schema script in [`packages/backend-supabase/migrations/001_initial_schema.sql`](file:///c:/Users/Thejas/OneDrive/Desktop/clipvault/packages/backend-supabase/migrations/001_initial_schema.sql).
3. Apply Row Level Security in [`packages/backend-supabase/migrations/002_rls_policies.sql`](file:///c:/Users/Thejas/OneDrive/Desktop/clipvault/packages/backend-supabase/migrations/002_rls_policies.sql).
4. Configure your `.env` file based on `.env.example`:
   ```ini
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

---

## Testing & Quality Gates

The codebase includes an automated test suite verifying domain validation, SHA-256 hash determinism, tracking URL sanitization, syntax detection, PII log scrubbing, SQLite WAL durability, offline sync queueing, backoff jitter, stress ingestion, and security isolation:

```bash
npm test
```

### Test Suite Coverage:

- **Domain Models**: Clipboard schema conformance and malformed record rejection.
- **Hasher**: Deterministic SHA-256 hashing and whitespace normalization.
- **URL Sanitizer**: Tracking query stripping (`utm_*`, `gclid`, `fbclid`) while preserving functional query parameters.
- **Code Detector**: Multi-language pattern detection (TypeScript, Rust, SQL, Python, Go, etc.).
- **Security & PII**: Plaintext redaction and structured log formatting.
- **Database Durability**: SQLite WAL persistence across crash simulation and restarts.
- **Sync Engine**: Conflict resolution, device revocation, idempotency, and peer realtime echo prevention.
- **Stress Testing**: High-throughput ingestion (1,000 items in <600ms) and 50-item rapid bursts.

---

## Security & Privacy Standards

- **Row Level Security (RLS)**: PostgreSQL tables enforce user isolation. Devices can only read and mutate records belonging to the authenticated account.
- **Device Revocation**: Lost or decommissioned devices can be revoked instantly from the Web Dashboard. Once revoked, the backend rejects all sync attempts from that device.
- **Password Manager Immunity**: Any clipboard events generated by 1Password, Bitwarden, KeePass, or KeePassXC are discarded at the listener layer and never written to disk or synced.
- **Zero Tailwind Policy**: The Web Dashboard uses strictly hand-crafted, high-performance vanilla CSS tokens with zero third-party utility bloat.

---

## Documentation

Comprehensive design documents and specifications are available in [`docs/`](file:///c:/Users/Thejas/OneDrive/Desktop/clipvault/docs):

- [docs/ARCHITECTURE.md](file:///c:/Users/Thejas/OneDrive/Desktop/clipvault/docs/ARCHITECTURE.md): Deep dive into system components, data flow, and sync topology.
- [docs/THREAT_MODEL.md](file:///c:/Users/Thejas/OneDrive/Desktop/clipvault/docs/THREAT_MODEL.md): STRIDE threat assessment, attack vectors, and mitigation controls.
- [docs/FEASIBILITY.md](file:///c:/Users/Thejas/OneDrive/Desktop/clipvault/docs/FEASIBILITY.md): Platform-by-platform OS clipboard API analysis.
- [docs/USER_GUIDE.md](file:///c:/Users/Thejas/OneDrive/Desktop/clipvault/docs/USER_GUIDE.md): Operations manual, backup procedures, and troubleshooting.
- [docs/ACCEPTANCE.md](file:///c:/Users/Thejas/OneDrive/Desktop/clipvault/docs/ACCEPTANCE.md): Traceable acceptance criteria and verification metrics.

---

## Contributing

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/clipboard-enhancement`).
3. Commit your changes (`git commit -m 'feat: add clipboard enhancement'`).
4. Ensure all tests and type checks pass (`npm test && npm run build --workspaces`).
5. Push to the branch (`git push origin feature/clipboard-enhancement`).
6. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE).
