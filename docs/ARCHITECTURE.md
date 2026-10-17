# SYSTEM ARCHITECTURE & DATA FLOW: CLIPVAULT

**Document Version:** 1.0.0  
**Phase:** Phase 0 (Discovery and Feasibility)  
**System:** Multi-Platform Clipboard Capture & Synchronization Engine  

---

## 1. High-Level System Architecture

```mermaid
graph TD
    subgraph "Client Devices"
        subgraph "Android 16 (Samsung Galaxy A17 5G)"
            A_CAP[Capture Engine<br/>Accessibility / Foreground / Share]
            A_NORM[Payload Normalizer]
            A_DB[(Local Room DB<br/>SQLite + WAL)]
            A_OUT[Durable Outbox Queue]
            A_UI[Compose Material 3 UI]
        end

        subgraph "Windows 10/11 Desktop Agent"
            W_CAP[Win32 Format Listener<br/>WM_CLIPBOARDUPDATE]
            W_NORM[Payload Normalizer]
            W_DB[(Local SQLite DB<br/>WAL Mode)]
            W_OUT[Durable Outbox Queue]
            W_TRAY[System Tray & Quick Bar]
        end

        subgraph "Web Application (Browser)"
            WEB_UI[React 19 / Vite UI<br/>Search & History Explorer]
            WEB_IDB[(Local IndexedDB Cache)]
            WEB_OUT[Local Mutation Queue]
        end
    end

    subgraph "Cloud Backend (Supabase Platform)"
        AUTH[Supabase Auth<br/>JWT & Session Management]
        REST[PostgREST Engine<br/>Row Level Security / RLS]
        RT[Realtime Engine<br/>PostgreSQL CDC WebSockets]
        DB[(PostgreSQL 15+<br/>UUID, JSONB, Full-Text Search)]
        STORAGE[Supabase Storage<br/>Encrypted Attachments & Thumbnails]
    end

    A_CAP --> A_NORM --> A_DB
    A_DB --> A_OUT
    A_DB <--> A_UI

    W_CAP --> W_NORM --> W_DB
    W_DB --> W_OUT
    W_DB <--> W_TRAY

    WEB_UI <--> WEB_IDB
    WEB_IDB --> WEB_OUT

    A_OUT -- TLS / JWT Auth --> REST
    W_OUT -- TLS / JWT Auth --> REST
    WEB_OUT -- TLS / JWT Auth --> REST

    REST --> DB
    RT -- Realtime Sync Push --> A_DB
    RT -- Realtime Sync Push --> W_DB
    RT -- Realtime Sync Push --> WEB_IDB

    A_NORM -. Binary Images .-> STORAGE
    W_NORM -. Binary Images .-> STORAGE
    STORAGE -. Image URLs .-> WEB_UI
```

---

## 2. End-to-End Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant App as External App (Browser / Chat / IDE)
    participant Agent as ClipVault Native Agent (Android / Win)
    participant LocalDB as Local SQLite / Room DB
    participant Outbox as Durable Outbox Queue
    participant Cloud as Supabase Backend (Postgres + RLS)
    participant Peer as Peer Authorized Device

    User->>App: Copies text, URL, code, or image
    App-->>Agent: OS Clipboard Event (WM_CLIPBOARDUPDATE / Selection Change)
    Agent->>Agent: Check Sensitive Exclusion (App blacklist, password managers)
    alt Is Sensitive
        Agent->>Agent: Drop payload immediately (Zero logging)
    else Is Allowed
        Agent->>Agent: Normalize payload into Typed Clipboard Record
        Agent->>Agent: Compute SHA-256 Content Hash & Deduplicate
        Agent->>LocalDB: Atomic Transaction: Insert Record (status: 'local')
        Agent->>Outbox: Enqueue Sync Task (Idempotency Key = record.id)
        LocalDB-->>User: Immediate Local UI Update (Zero latency)
        
        opt Network Available & Authenticated
            Outbox->>Cloud: POST /rest/v1/clipboard_items (Bearer Token)
            Cloud->>Cloud: Verify JWT + Enforce Row Level Security (auth.uid() = user_id)
            Cloud->>Cloud: Upsert Item by (user_id, content_hash) or unique ID
            Cloud-->>Outbox: 201 Created / 200 OK (Sync Acknowledged)
            Outbox->>LocalDB: Update Record status = 'synced'
            Cloud-->>Peer: Supabase Realtime Broadcast (Event: INSERT)
            Peer->>Peer: Ingest to Peer Local DB & Notify UI
        end
    end
```

---

## 3. Universal Clipboard Data Model

The domain model is standardized across Android (Kotlin data classes), Desktop (TypeScript/Node.js), and Backend (PostgreSQL schema).

### 3.1 Domain Schema Contract (`ClipboardRecord`)

| Field | Type | Description | Indexing & Constraints |
| :--- | :--- | :--- | :--- |
| `id` | `UUID (v4)` | Globally unique identifier generated on capture device. | Primary Key |
| `user_id` | `UUID` | Supabase Auth user identifier. | Foreign Key -> `auth.users(id)` |
| `device_id` | `TEXT` | Hardware/session identifier of capturing device. | Indexed |
| `device_name` | `TEXT` | Friendly device name (e.g., "Samsung A17", "Workstation PC"). | Metadata |
| `content_type` | `TEXT` | Enum: `'text'`, `'url'`, `'code'`, `'rich_text'`, `'image'`, `'file_ref'`. | Indexed |
| `plain_text` | `TEXT` | Complete plain-text UTF-8 representation (no silent truncation). | Full-text indexed (`GIN` on `tsvector`) |
| `detected_url` | `TEXT` | Extracted and sanitized HTTP/HTTPS URL, if applicable. | Indexed |
| `html_content` | `TEXT` | Sanitized HTML fragment (for rich-text copies). | Nullable |
| `content_hash` | `TEXT` | SHA-256 hash of normalized payload for deduplication. | Unique composite `(user_id, content_hash)` |
| `content_size_bytes` | `INTEGER` | Byte length of raw payload. | Monitoring |
| `attachment_path` | `TEXT` | Local filesystem path to stored binary image/file. | Nullable |
| `attachment_url` | `TEXT` | Supabase Storage signed/authorized URL for cloud sync. | Nullable |
| `source_app` | `TEXT` | Package name / executable name (e.g., `com.brave.browser`). | Nullable (Privacy-safe) |
| `is_pinned` | `BOOLEAN` | User pinned status (pinned items are protected from retention). | Default `false`, Indexed |
| `is_favorite` | `BOOLEAN` | Starred/favorite flag. | Default `false`, Indexed |
| `tags` | `TEXT[]` | User-defined tags array for categorization. | GIN indexed |
| `captured_at` | `TIMESTAMPTZ` | Timestamp when user initiated the copy on device. | Default `NOW()`, Indexed DESC |
| `sync_status` | `TEXT` | Local status: `'local'`, `'pending_sync'`, `'synced'`, `'failed'`. | Local DB only |
| `retention_policy` | `TEXT` | Retention tag: `'permanent'`, `'30_days'`, `'session_only'`. | Default `'permanent'` |

---

## 4. Repository & Monorepo Structure

ClipVault is structured cleanly to support shared contracts while keeping platform runtimes decoupled:

```
clipvault/
├── docs/                      # Authoritative architecture, feasibility & test docs
│   ├── FEASIBILITY.md         # Hardware & OS feasibility audit
│   ├── ARCHITECTURE.md        # This document
│   ├── THREAT_MODEL.md        # Security, privacy & STRIDE threat model
│   ├── PLAN.md                # Phase-by-phase implementation roadmap
│   └── ACCEPTANCE.md          # Acceptance checklist & verification protocols
├── packages/
│   ├── shared/                # Universal TypeScript contracts, validators (Zod), and hash utils
│   │   ├── src/
│   │   │   ├── types/         # ClipboardItem, Device, SyncPayload interfaces
│   │   │   ├── validators/    # Zod schemas for zero-trust validation
│   │   │   └── utils/         # URL sanitizer, SHA-256 hashers, PII scrubber
│   │   └── package.json
│   ├── desktop-agent/         # Windows 10/11 native clipboard capture agent
│   │   ├── src/
│   │   │   ├── capture/       # Win32 clipboard listener & format normalizers
│   │   │   ├── db/            # Local SQLite database (WAL mode, schema migrations)
│   │   │   ├── sync/          # Durable outbox queue & Supabase sync engine
│   │   │   └── index.ts       # Service entry point & CLI controls
│   │   └── package.json
│   ├── web-dashboard/         # React 19 / Vite / Tailwind-free rich CSS dashboard
│   │   ├── src/
│   │   │   ├── components/    # Timeline, SearchBar, ItemCard, DeviceManager
│   │   │   ├── hooks/         # useClipboardHistory, useSyncStatus
│   │   │   ├── services/      # Supabase client & local IndexedDB cache
│   │   │   └── styles/        # Curated tokens, responsive layout, dark/light themes
│   │   └── package.json
│   └── backend-supabase/      # Supabase configuration, migrations & RLS policies
│       ├── migrations/        # 001_initial_schema.sql, 002_rls_policies.sql
│       └── seed.sql           # Development test seed fixtures
├── android/                   # Native Kotlin & Jetpack Compose Android application
│   ├── app/
│   │   ├── src/main/java/com/clipvault/app/
│   │   │   ├── capture/       # AccessibilityService, ForegroundService & TileService
│   │   │   ├── data/          # Room Database, DAO, Entities, TypeConverters
│   │   │   ├── sync/          # WorkManager outbox sync worker & Supabase client
│   │   │   └── ui/            # Jetpack Compose Material 3 screens & diagnostics
│   │   └── build.gradle.kts
│   ├── build.gradle.kts
│   └── settings.gradle.kts
├── tests/                     # Automated cross-platform test suites
│   ├── unit/                  # Data model, normalizer, and hashing tests
│   ├── integration/           # Local SQLite persistence & outbox sync tests
│   └── security/              # RLS policies, PII scrubbing, sensitive exclusion tests
├── AGENTS.md                  # Operating instructions for Antigravity agents
├── GEMINI.md                  # Mirror of AGENTS.md
└── package.json               # Root workspace scripts (build, test, dev)
```
