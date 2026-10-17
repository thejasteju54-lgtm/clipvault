# PROJECT: CLIPVAULT — UNIVERSAL CLIPBOARD CAPTURE, PERMANENT HISTORY & CROSS-DEVICE SYNC

## ROLE AND MISSION

Act as a principal software architect, senior Android engineer, desktop systems engineer, full-stack developer, database architect, security engineer, QA automation engineer, and DevOps engineer.

Build a production-quality product called **ClipVault**: a persistent, searchable, cross-device clipboard platform that captures clipboard content whenever the user copies something on a supported device, preserves it in a durable history, and synchronizes it across the user's authorized devices.

This is not a static prototype, UI-only demo, or basic clipboard list. Build a working product with real capture mechanisms, durable storage, synchronization, search, error recovery, privacy controls, automated tests, and deployment documentation.

Use iterative engineering: inspect, architect, implement, test, identify defects, fix them, rerun the tests, and repeat until every achievable acceptance criterion passes.

Never claim that a feature works unless you have implemented and verified it.

---

# 1. CORE PRODUCT VISION

The user should be able to copy something on a supported device and find it inside ClipVault without manually pressing Save.

Examples include:

- Plain text and formatted text.
- Long AI prompts and ChatGPT responses.
- Website URLs and links.
- Code snippets, commands, SQL queries, and configuration files.
- Copied images and screenshots when image data is actually available through the clipboard.
- Copied files or file references where the operating system exposes them.
- Rich-text content, HTML fragments, and supported clipboard formats.
- Repeated copies of the same content, handled according to configurable deduplication rules.

Every successfully captured item must be persisted, indexed, and retained until the user explicitly deletes it or an explicitly configured retention policy removes it.

**Default retention policy: Never automatically delete saved clipboard history.**

Do not silently discard old entries when a history limit is reached. If storage becomes constrained, warn the user, preserve existing entries, and provide safe storage-management options.

## Primary user experience

1. The user copies content in another app.
2. The appropriate ClipVault capture component detects the copy when supported by that operating system and capture method.
3. The content is normalized into a typed clipboard record.
4. The record is saved to durable local storage.
5. A synchronization task uploads the record when connectivity and permissions allow.
6. Other authorized devices receive the record and store it locally.
7. The user can search, preview, copy, pin, export, and organize the item.
8. If the network is unavailable, the item stays in a local pending-sync queue.
9. When connectivity returns, synchronization resumes without losing entries or creating unintended duplicates.

The UI must clearly distinguish between captured, locally saved, pending synchronization, synchronized, and failed states.

---

# 2. START WITH A FEASIBILITY AUDIT

Before writing application code, investigate the actual operating-system constraints for every target platform.

Prioritize the user's current device: Samsung Galaxy A17 5G, Android 16 / One UI 8.

Research and verify:

- Android clipboard APIs and background access restrictions.
- Clipboard access restrictions imposed on background applications.
- Accessibility Service eligibility, Play Store policy requirements, and whether any proposed use is permitted.
- Android foreground-service requirements and notification behavior.
- Android battery optimization and process termination.
- Supported clipboard MIME types and image/file handling.
- Windows clipboard listeners and history APIs.
- macOS clipboard change monitoring and permissions.
- Browser and web clipboard permissions.
- Cross-device synchronization options.
- App-store distribution requirements.

Create a feasibility matrix containing:

Platform | Capture mechanism | Supported content | Permissions | Background limitations | Reliability | Fallback

Clearly separate:
A. Features verified to work.
B. Features requiring permissions or foreground activity.
C. Features that work only under specific conditions.
D. Features the operating system prevents us from guaranteeing.

Do not assume that an Android clipboard polling loop, background service, Accessibility Service, or web page can access all clipboard changes. Validate the approach on the actual platform.

If Android cannot provide reliable unrestricted background capture, implement the best policy-compliant alternative, explain the limitation in the UI and documentation, and design a complementary desktop capture agent where supported.

Never bypass operating-system security restrictions or misrepresent capture completeness.

---

# 3. TARGET ARCHITECTURE

Design ClipVault as a multi-platform system with shared data models and a common synchronization backend.

## A. Android application

Use native Kotlin and Jetpack Compose for the Android capture application.

Requirements:
- Material 3 interface.
- Persistent local database.
- Clipboard capture component using supported Android APIs.
- Permission and background-monitoring setup screen.
- Capture-status indicator.
- Searchable history.
- Item preview and detail screen.
- Pinning, favorites, tags, and collections.
- Copy-to-clipboard action.
- Local export and backup.
- Sync queue and retry management.
- Battery, permission, and capture-health diagnostics.

Do not rely exclusively on a WebView or a web application for Android clipboard capture.

## B. Desktop capture agent

Provide a desktop application or lightweight background agent, prioritizing Windows 10/11.

Use supported native clipboard change notifications and APIs.

Requirements:
- Start-at-login option with explicit user consent.
- Persistent local history.
- Text, URL, supported image, and supported file-reference capture.
- Local event queue.
- Automatic synchronization.
- Offline operation.
- Clear capture and sync status.
- Safe handling of sensitive content.
- No unnecessary continuous polling when native event notifications are available.

Keep the architecture extensible for macOS and Linux, but do not claim these platforms are implemented until their capture components and tests exist.

## C. Web application

Build a responsive web dashboard for:
- Browsing synchronized history.
- Searching and filtering records.
- Managing devices and sessions.
- Organizing tags and collections.
- Exporting data.
- Configuring retention and privacy settings.
- Viewing synchronization status.

Be explicit: a normal browser tab cannot reliably monitor every clipboard change occurring in unrelated applications. The web dashboard is for managing synchronized content, not a substitute for native capture agents.

## D. Backend and synchronization

Use Supabase for authentication, PostgreSQL, secure storage where needed, and synchronization infrastructure if it passes the architecture review.

Use:
- Supabase Auth.
- PostgreSQL with Row Level Security.
- Supabase Storage for supported binary content.
- Appropriate server-side functions for secure operations.
- A durable local-first synchronization queue.
- Device registration and revocable sessions.

Before implementation, read the current Supabase documentation and verify the recommended integration for the selected Android and web stacks.

Keep secrets out of source code. Use environment variables and documented configuration.

---

# 4. CLIPBOARD DATA MODEL

Design a versioned, extensible clipboard record.

Each record should include, where applicable:

- Unique item ID.
- User ID.
- Device ID.
- Device-local capture sequence.
- Content type.
- Original MIME types.
- Plain-text representation, if available.
- URL, if detected.
- Structured metadata.
- Image or file attachment references.
- Content hash.
- Creation timestamp.
- Capture timestamp.
- Last-modified timestamp.
- Source application, only when reliably available.
- Content size.
- Pin and favorite status.
- Tags and collection membership.
- Local persistence status.
- Sync status.
- Encryption metadata.
- Optional user-defined sensitivity label.

Preserve original content whenever technically feasible. Do not reduce every record to plain text.

### Content handling

Text:
- Preserve Unicode, line breaks, and long content.
- Handle emoji and multilingual text.
- Avoid silent truncation.
- Detect URLs without corrupting the original text.

Images:
- Save image bytes when exposed by the clipboard API.
- Generate thumbnails for previews.
- Preserve the original image when possible.
- Store metadata and content hashes.
- Handle large images without freezing the UI.

Files:
- Capture supported file references or copied file data.
- Clearly distinguish a reference from a permanent file copy.
- Do not promise file recovery if the original file is later deleted and the data was not copied into ClipVault.

Rich text:
- Preserve supported HTML or rich-text representations.
- Provide a safe text preview.
- Sanitize rendered HTML to prevent script execution.

Unknown formats:
- Record supported metadata.
- Report unsupported formats clearly.
- Never silently claim that the full original payload was saved.

---

# 5. RELIABLE CAPTURE ENGINE

Treat the capture engine as the most important subsystem.

Implement it independently of the UI.

## Required behavior

1. Detect supported clipboard changes using the platform's appropriate event mechanism.
2. Capture the content promptly when access is allowed.
3. Validate that the payload is accessible and complete.
4. Normalize the payload without losing its original representation.
5. Assign a stable record ID and capture sequence.
6. Persist the record locally before reporting it as saved.
7. Queue it for synchronization.
8. Retry recoverable failures.
9. Surface unrecoverable failures.
10. Prevent duplicate records caused by retries or repeated events.

Use transactional writes and an appropriate durable database.

Do not depend on in-memory state, a temporary cache, or the currently visible UI for data persistence.

### Capture reliability

Implement:
- Startup recovery.
- Permission-loss detection.
- Service-health monitoring.
- Database corruption recovery where possible.
- Retry queues.
- Idempotent capture.
- Capture latency measurements.
- Pending-write diagnostics.
- Disk-space warnings.
- Capture-gap reporting.

If a clipboard event is missed because the operating system blocked access, report the limitation rather than fabricating an entry.

Do not repeatedly read the clipboard merely to bypass privacy protections.

### Sensitive content

Provide configurable exclusions for:
- Password managers.
- Authentication and OTP applications.
- Banking and payment applications.
- Private browsing or other user-designated applications.
- Content explicitly marked sensitive by the source application.

Support an optional sensitive-item detection warning. Detection must not be presented as infallible.

Give the user an explicit setting to pause capture immediately.

---

# 6. PERMANENT STORAGE AND DATA SAFETY

"Permanent" means durable until the user deletes an item or chooses a different retention policy. It does not mean immune to device destruction, storage failure, account deletion, or lost encryption keys.

Implement:

- A persistent local database on each capture device.
- Database transactions.
- Schema migrations.
- Local encrypted storage for sensitive clipboard content.
- Secure key management using platform-supported mechanisms.
- Server-side authorization.
- Encrypted network transport.
- Optional end-to-end encrypted synchronization, if designed and tested correctly.
- User-controlled export.
- Backup and restore.
- Attachment integrity checks.
- Data integrity verification.
- Explicit retention settings.
- Clear account deletion and data deletion procedures.

Do not claim end-to-end encryption if the server can read the decrypted clipboard contents.

If end-to-end encryption is implemented, document how multi-device key sharing, new-device enrollment, key loss, recovery, and revocation work.

Do not store plaintext clipboard content in analytics, diagnostic logs, crash reports, or ordinary application logs.

### Storage pressure

Never automatically delete the oldest items as a hidden cleanup behavior.

Provide:
- Storage usage display.
- Attachment-size limits with transparent warnings.
- User-selected retention policies.
- Export before deletion.
- Safe handling when disk space is exhausted.

If a new item cannot be persisted, display a clear failure instead of marking it as saved.

---

# 7. CROSS-DEVICE SYNCHRONIZATION

Synchronization must be automatic, durable, observable, and recoverable.

Implement a local-first synchronization protocol with:
- A durable outbox.
- A durable incoming-event queue.
- Idempotency keys.
- Versioned records.
- Retry with exponential backoff and jitter.
- Resumable binary uploads.
- Integrity verification.
- Pagination and incremental synchronization.
- Conflict resolution.
- Device registration and revocation.
- Network reconnection handling.
- Authentication expiry handling.
- Offline mode.
- Sync status per item and per device.

Do not assume that a successful HTTP request means the entire item was safely stored. Confirm the server-side operation and attachment integrity.

Avoid duplicate entries when the same item is uploaded multiple times or synchronized to multiple devices.

Use a clearly documented conflict-resolution policy. For immutable clipboard captures, preserve the original capture and handle subsequent annotations or pin changes as separate versioned metadata.

### Sync acceptance scenarios

Test all of these:
1. Copy content while online.
2. Copy content while offline.
3. Restart the device before syncing.
4. Restore the network.
5. Force-stop and reopen the app.
6. Expire the authentication session.
7. Retry an interrupted upload.
8. Capture identical content twice.
9. Synchronize from two devices simultaneously.
10. Revoke a device and verify that it cannot continue accessing the account.

Never delete the only local copy until the configured persistence and backup requirements have been met.

---

# 8. USER INTERFACE AND EXPERIENCE

Create a polished, minimal, premium interface with excellent readability.

Design direction:
- Modern productivity software.
- Neutral backgrounds and restrained accent colors.
- Clear typography.
- Consistent spacing.
- Accessible contrast.
- Responsive layouts.
- Fast search and keyboard navigation.
- Light and dark themes.
- Helpful empty, loading, error, and offline states.

Avoid excessive gradients, decorative animations, fake statistics, or a generic AI-generated dashboard appearance.

## Main screens

### Dashboard
- Total saved items.
- Recent captures.
- Capture status.
- Pending sync count.
- Connected devices.
- Storage usage.
- Recent images and links.

### Clipboard history
- Newest-first timeline.
- Search input.
- Type filters.
- Date filters.
- Device filter.
- Source-app filter when available.
- Pinned items.
- Multi-select operations.
- Bulk export and deletion.

### Item detail
- Full text and metadata.
- Image preview where supported.
- Original URL.
- Capture timestamp.
- Device source.
- Copy action.
- Pin and tag actions.
- Sync state.
- Delete action.

### Device management
- Registered devices.
- Last successful synchronization.
- Capture health.
- Permission status.
- Revoke-device action.

### Settings
- Capture enable/disable.
- Sensitive-app exclusions.
- Retention policy.
- Sync settings.
- Storage settings.
- Encryption and recovery information.
- Export and restore.
- Account and privacy controls.

### Search
Support:
- Full-text search.
- Exact phrase matching.
- URL search.
- Tag search.
- Date ranges.
- Type filters.
- Device filters.
- Fast results over a large history.

For a large dataset, use appropriate database indexes and pagination. Do not load every clipboard item into memory.

---

# 9. SECURITY AND PRIVACY REQUIREMENTS

Clipboard data may contain passwords, authentication tokens, private conversations, source code, and financial information.

Treat clipboard contents as highly sensitive personal data.

Required:
- Explicit consent before capture starts.
- Clear indication when capture is active.
- One-action pause.
- Device revocation.
- Secure authentication.
- Server-side access controls.
- Database Row Level Security where applicable.
- Attachment authorization.
- Rate limiting.
- Secure session management.
- Input validation.
- Safe rendering.
- Dependency vulnerability checks.
- No hardcoded secrets.
- No public buckets containing private clipboard attachments.
- No content logging.
- No advertising or data selling.
- A clear privacy policy.
- A threat model covering compromised devices and accounts.

Request only the permissions needed for implemented features.

If Android Accessibility is proposed, justify its necessity, implement it transparently, and verify that the intended use satisfies current Android and Google Play requirements. Never use it to collect unrelated screen content, credentials, or keystrokes.

Do not promise absolute security or uninterrupted background capture.

---

# 10. TESTING AND LOOPING ENGINEERING

Use test-driven development wherever practical.

Create separate test suites for:
- Data models.
- Capture engine.
- Local persistence.
- MIME-type handling.
- Image processing.
- Search.
- Authentication.
- Authorization.
- Synchronization.
- Conflict resolution.
- Offline recovery.
- Backup and restore.
- Security.
- UI accessibility.
- Performance.
- Deployment.

Use unit tests, integration tests, API tests, database policy tests, end-to-end tests, and device tests.

Create a test matrix for the actual Samsung Galaxy A17 5G running Android 16 / One UI 8, plus representative Windows 10/11 configurations.

### Required stress scenarios

Test:
- At least 10,000 clipboard records.
- Long prompts and multiline code.
- Unicode and emoji.
- Large supported images.
- Repeated identical content.
- Rapid clipboard changes.
- Network interruptions.
- App process termination.
- Device restarts.
- Storage pressure.
- Expired sessions.
- Permission revocation.
- Interrupted uploads.
- Multiple concurrent devices.
- Database migrations.
- Backup restoration.
- Malformed clipboard payloads.

Do not use simulated clipboard events as the sole evidence that real OS capture works.

Where hardware or OS behavior cannot be tested automatically, explicitly mark the scenario as requiring manual device verification.

## The engineering loop

Repeat this cycle continuously:

1. Inspect the current codebase and environment.
2. Define a small, measurable engineering objective.
3. Implement the smallest complete change.
4. Run static analysis, lint, type checking, and relevant tests.
5. Run integration and end-to-end tests.
6. Inspect the actual UI and runtime behavior.
7. Review logs for failures without exposing clipboard contents.
8. Identify the root cause of every failure.
9. Fix the underlying cause rather than hiding the symptom.
10. Rerun the failed test and all relevant regression tests.
11. Update the acceptance checklist and engineering notes.
12. Proceed to the next objective only when the current quality gate passes.

Do not stop after one successful build.

Do not endlessly refactor working components without a measurable quality benefit.

If a test cannot run because a device, credential, service, or permission is unavailable, document the blocker and provide a precise verification procedure.

Continue until all feasible requirements pass, remaining limitations are explicitly documented, and the final acceptance report is accurate.

---

# 11. MULTI-AGENT ENGINEERING WORKFLOW

Use specialized agents if Antigravity supports them. If not, perform the same work sequentially.

## Agent 1: Principal Architect
Own the feasibility audit, system architecture, data model, ADRs, and dependency choices.

## Agent 2: Android Engineer
Own the native Android application, capture implementation, local persistence, permissions, and real-device testing.

## Agent 3: Desktop Engineer
Own the Windows clipboard agent, native capture APIs, durable storage, and background operation.

## Agent 4: Backend Engineer
Own authentication, database schema, Row Level Security, APIs, file storage, and synchronization.

## Agent 5: Frontend Engineer
Own the web dashboard, history timeline, search, item details, and responsive interface.

## Agent 6: Security Engineer
Review permissions, encryption, device trust, data leakage, authentication, and authorization.

## Agent 7: QA Engineer
Own automated testing, failure injection, acceptance scenarios, regression testing, and defect tracking.

## Agent 8: DevOps Engineer
Own environment configuration, migrations, CI/CD, deployment, monitoring, and recovery documentation.

The architect must review interfaces between agents before integration. Avoid duplicated implementations, conflicting schemas, and incompatible APIs.

---

# 12. DEVELOPMENT PHASES

Execute these phases in order. Do not attempt to build everything in one unverified pass.

### Phase 0 — Discovery and feasibility
Inspect the repository, existing tools, available credentials, operating-system constraints, and installed SDKs.

Deliver:
- Feasibility report.
- Architecture diagram.
- Data-flow diagram.
- Threat model.
- Platform capability matrix.
- Implementation plan.
- Acceptance checklist.

### Phase 1 — Architecture and foundation
Create the repository structure, dependency configuration, database schema, migration strategy, environment templates, shared models, and CI checks.

Verify a clean build before proceeding.

### Phase 2 — Android capture and local persistence
Implement the first end-to-end workflow: supported clipboard event → capture → durable local record → history UI → copy saved item.

Verify it on the real Samsung device.

### Phase 3 — Windows capture
Implement native clipboard change notifications, local persistence, and offline operation.

Verify the application captures supported text, links, and images without requiring the history window to remain open.

### Phase 4 — Backend and authentication
Implement user authentication, device registration, secure database access, attachment storage, and authorization tests.

### Phase 5 — Synchronization
Implement durable queues, idempotency, retries, conflict handling, offline recovery, and multi-device synchronization.

### Phase 6 — Web dashboard
Implement the searchable history, detail views, device management, settings, and export.

### Phase 7 — Security hardening
Perform permission review, dependency scanning, database-policy testing, encryption verification, and sensitive-data leakage tests.

### Phase 8 — Stress testing
Run the complete test matrix, inspect failures, fix root causes, and repeat regression tests.

### Phase 9 — Production readiness
Finalize packaging, deployment, monitoring, documentation, backup and restore instructions, and release checks.

Do not skip phases merely to produce a quick visual demo.

---

# 13. REQUIRED PROJECT DELIVERABLES

Produce actual working files and implementation artifacts, not only explanations.

Deliver:
- Complete source code for every implemented component.
- Android application project.
- Windows capture agent.
- Web dashboard.
- Database schema and versioned migrations.
- Row Level Security policies.
- Secure synchronization implementation.
- Automated test suites.
- Environment variable example file without real secrets.
- CI configuration.
- Deployment instructions.
- Local development instructions.
- Privacy and security documentation.
- Backup and restore guide.
- Architecture and API documentation.
- Known limitations.
- Troubleshooting guide.
- A feature-by-feature acceptance report.

Use a professional repository structure with clear separation between Android, desktop, web, backend, shared schemas, tests, and documentation.

Never generate fake API keys or claim that deployment succeeded without verifying the actual deployment.

If the project already contains code, inspect it and preserve working functionality. Do not overwrite the existing project without understanding its architecture.

---

# 14. DEFINITION OF DONE

The project is not finished merely because the interface renders or the app compiles.

The final acceptance checklist must verify:

- [ ] Supported clipboard content is automatically captured by each implemented platform agent.
- [ ] Text and URLs are preserved without silent truncation.
- [ ] Supported copied images are saved and previewed.
- [ ] Unsupported content is reported honestly.
- [ ] Records survive application restarts.
- [ ] Records survive device restarts where the local storage remains intact.
- [ ] Older records remain available without hidden rolling-history deletion.
- [ ] Search works over large histories.
- [ ] Offline captures are queued durably.
- [ ] Sync resumes after connectivity returns.
- [ ] Retries do not create duplicate records.
- [ ] Authorized devices receive synchronized content.
- [ ] Revoked devices lose access.
- [ ] Users can export their data and understand the backup limitations.
- [ ] Permissions and capture status are visible.
- [ ] Sensitive content is not written to ordinary logs.
- [ ] Automated tests pass.
- [ ] Real-device capture tests pass for the claimed Android capabilities.
- [ ] Desktop capture tests pass for the claimed Windows capabilities.
- [ ] Remaining platform restrictions are documented.
- [ ] A clean checkout can reproduce the documented build.
- [ ] Deployment and recovery instructions are verified.

At completion, provide a report containing:
1. Features implemented.
2. Files and components created or modified.
3. Tests executed and their actual results.
4. Device and platform tests completed.
5. Known limitations and unverified behaviors.
6. Security findings and their status.
7. Build and deployment instructions.
8. Remaining blockers, if any.

Never mark an acceptance criterion as passed without evidence.

---

# 15. FIRST ACTION — BEGIN NOW

Start by inspecting the existing workspace, repository, available SDKs, and development environment.

Do not immediately generate thousands of lines of code.

First produce the feasibility audit, architecture, platform capability matrix, threat model, implementation phases, and measurable acceptance checklist.

Then implement Phase 1 and validate the result. Continue through subsequent phases using the looping engineering process.

Make reasonable engineering decisions independently. Ask questions only when a genuinely blocking decision requires user input.

**Primary objective:** Build the most reliable, privacy-conscious clipboard capture and synchronization platform that the supported operating systems actually permit, with durable history, strong recovery, and measurable evidence of correctness.

**Quality principle:** Working functionality, verified capture, durable persistence, secure synchronization, and honest limitations take priority over visual polish or feature count.