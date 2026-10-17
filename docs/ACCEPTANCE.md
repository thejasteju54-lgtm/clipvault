# ACCEPTANCE CHECKLIST & VERIFICATION PROTOCOL: CLIPVAULT

**Document Version:** 1.0.0  
**Phase:** Phase 0 (Discovery and Feasibility)  
**Status:** Active Quality Gate Contract  

---

## 1. Master Acceptance Checklist (Definition of Done)

Every acceptance criterion requires verifiable test output, source code references, and reproducible command outputs.

| Criterion | Description | Verification Method | Target Status |
| :--- | :--- | :--- | :---: |
| **AC-01: Auto Capture** | Supported clipboard content is automatically captured by each implemented platform agent. | Windows `WM_CLIPBOARDUPDATE` test + Android Accessibility test suite | Pending Phase 2/3 |
| **AC-02: No Truncation** | Text, code, and URLs are preserved without silent truncation or corruption. | Automated unit test with 100KB multiline string & Unicode characters | Pending Phase 1 |
| **AC-03: Image Ingestion** | Supported copied images are saved as binary files with SHA-256 and visual preview. | Windows DIB test + Web Dashboard image render test | Pending Phase 3/6 |
| **AC-04: Honest Limitations**| Unsupported OS clipboard formats or blocked events are reported cleanly without crash. | Fallback parser unit tests for exotic MIME types | Pending Phase 1 |
| **AC-05: App Restart Survival**| Saved items survive application process kill and restart without loss. | Persistence restart integration test on SQLite & Room | Pending Phase 1/2 |
| **AC-06: Reboot Survival** | Records survive system reboot as long as storage volume remains intact. | Disk storage verification across process teardown | Pending Phase 1 |
| **AC-07: No Rolling Deletion**| System preserves all items permanently by default; zero silent FIFO deletion. | Ingestion test exceeding 1,000 items with count assert | Pending Phase 1 |
| **AC-08: Indexed Search** | Full-text search and filtering return sub-50ms results over 10,000 items. | Performance benchmark script querying SQLite FTS / GIN index | Pending Phase 8 |
| **AC-09: Offline Outbox** | Captures made while network is disabled are safely stored in durable outbox. | Network-mocked integration test verifying outbox queue table | Pending Phase 5 |
| **AC-10: Sync Resumption** | Outbox drains and syncs smoothly once network connectivity returns. | E2E offline-to-online transition test with state assertions | Pending Phase 5 |
| **AC-11: Idempotency** | Upload retries and identical copies do not create duplicate records. | Deduplication test using SHA-256 hash & unique constraints | Pending Phase 1/5 |
| **AC-12: Multi-Device Sync** | Authorized peer devices receive synchronized items via Realtime push. | Multi-client WebSocket sync test | Pending Phase 5 |
| **AC-13: Device Revocation** | Revoking a device instantly terminates its sync access and clears tokens. | Auth integration test asserting 401 on revoked `device_id` | Pending Phase 4 |
| **AC-14: Data Export** | Users can export entire history to JSON, CSV, and Markdown formats. | Export service unit test validating file outputs | Pending Phase 6 |
| **AC-15: Health & Status UI** | Clear indicators for active capture, pending sync, and battery/permission status. | UI inspection & component unit tests | Pending Phase 2/6 |
| **AC-16: Zero PII Logging** | Sensitive clipboard content is strictly excluded from application logs. | Log audit test scanning output logs for clipboard strings | Pending Phase 7 |
| **AC-17: Automated Test Suite**| Unit, integration, security, and API tests pass completely in CI. | `npm test` exit code 0 | Pending Phase 1 |
| **AC-18: Real-Device Android**| Native Android APK verified on real Samsung Galaxy A17 5G. | Device verification protocol log in `docs/ACCEPTANCE.md` | Pending Phase 2 |
| **AC-19: Native Windows Agent**| Windows background capture agent verified on Windows 10/11. | Live desktop capture test execution log | Pending Phase 3 |
| **AC-20: Clean Build** | Fresh clone compiles cleanly with documented setup commands. | Clean build command check (`npm run build`) | Pending Phase 1 |

---

## 2. Test Verification Matrix & Log Template

When tasks are implemented, each test execution log must be recorded below with timestamp, commit hash, and verification status:

| Test Run ID | Scope | Command Executed | Result | Commit | Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| *TR-001* | Phase 0 Discovery | Tool inspection (`node`, `npm`, `javac`, Android SDK) | **PASS** (Node v26, JDK 17, Android SDK 34/37) | `HEAD` | 2026-10-17 |
