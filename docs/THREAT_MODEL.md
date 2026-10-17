# SECURITY SPECIFICATION & THREAT MODEL: CLIPVAULT

**Document Version:** 1.0.0  
**Phase:** Phase 0 (Discovery and Feasibility)  
**Classification:** Security Architecture & STRIDE Threat Analysis  

---

## 1. Security Philosophy & Privacy Mandate

Clipboard data represents the highest-density source of sensitive personal information on any device:
- Cleartext credentials, API keys, and database connection strings.
- One-Time Passwords (OTPs) and multi-factor authentication codes.
- Personal identity documents, addresses, and phone numbers.
- Private communications, confidential emails, and medical/financial records.

**The Golden Security Rule**: ClipVault must never log, broadcast, or transmit clipboard content to ordinary telemetry, log files, or unauthenticated endpoints. Security and privacy constraints supersede convenience.

---

## 2. STRIDE Threat Model

| Threat Category | Threat Scenario | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Malicious actor attempts to impersonate an authorized device or forge sync updates. | Unauthorized insertion or corruption of user's clipboard ledger. | **Device Authentication**: Every sync request must supply a valid Supabase JWT bearer token. Each device registers a unique `device_id` recorded in `devices` table; requests for mismatched `device_id` are rejected by RLS. |
| **Tampering** | Man-in-the-Middle (MitM) intercepts sync traffic and modifies copied code or links. | User pastes altered commands or phishing URLs. | **TLS 1.3 Transport** with strict certificate validation. **Content Hashes**: Each payload includes a SHA-256 hash verified locally before and after synchronization. |
| **Repudiation** | User or process claims a clipboard item was not copied from their device. | Inability to audit unauthorized access. | **Immutable Audit Log**: Every record is signed with `captured_at`, `device_id`, and immutable local sequence number. |
| **Information Disclosure** | 1. Plaintext clipboard leaking into console/system logs.<br/>2. Public cloud storage exposing copied screenshots.<br/>3. Password manager copy captured accidentally. | Critical credential or identity compromise. | **1. Zero-Log Policy**: Plaintext is never written to log files; logs only record metadata (`id`, `content_type`, `size_bytes`, `status`).<br/>**2. Private Buckets**: Supabase storage buckets require signed authorization URLs.<br/>**3. Blacklist Engine**: Automatic drop of copies from known password managers (`com.onepassword`, `com.x8bit.bitwarden`, KeePass, 1Password.exe). |
| **Denial of Service** | Copying massive multi-gigabyte files or rapid-fire clipboard spam filling local and cloud disk. | Application crash, disk exhaustion, cloud quota bust. | **Attachment Limits**: Maximum inline text size capped at 1 MB; images capped at 10 MB. Copies exceeding limits trigger an explicit warning. Rapid repeats deduplicated via SHA-256 in memory before disk write. |
| **Elevation of Privilege** | Attacker obtains a leaked session token and attempts to read other users' clipboards. | Cross-tenant data breach. | **PostgreSQL Row Level Security (RLS)**: Enforced on all tables (`auth.uid() = user_id`). No API endpoint bypasses RLS. |

---

## 3. Sensitive Application Blacklist & Protection Engine

ClipVault includes a built-in, user-configurable exclusion filter that intercepts and drops clipboard events from sensitive sources before they are persisted or hashed:

### 3.1 Default Excluded Applications
- **Password Managers**: 1Password (`1Password.exe`, `com.agilebits.onepassword`), Bitwarden (`Bitwarden.exe`, `com.x8bit.bitwarden`), KeePassXC (`KeePassXC.exe`), Dashlane, LastPass.
- **Authenticators**: Google Authenticator, Microsoft Authenticator, Authy, Yubico Authenticator.
- **Banking & Crypto**: Known banking apps, MetaMask, Ledger Live.
- **Private Browsing**: Incognito tabs when flagged by the browser.

### 3.2 Operating System Sensitivity Flags
- **Android**: Android 13+ supports `ClipDescription.EXTRA_IS_SENSITIVE`. If this extra boolean flag is `true`, ClipVault **automatically skips capture** unless the user has explicitly overridden the setting with master passphrase confirmation.
- **Windows**: The agent checks the foreground process window handle (`GetForegroundWindow` -> `GetWindowThreadProcessId` -> `QueryFullProcessImageNameW`) against the process exclusion blacklist.

---

## 4. Storage Security & Encryption

### 4.1 Local Storage Security
- **Android**: Local SQLite database encrypted via SQLCipher / Room with key secured in the Android Hardware Keystore (`AndroidKeyStore`).
- **Windows**: Local encryption using Windows Data Protection API (DPAPI) via `CryptProtectData` for sensitive tokens and encryption keys.
- **Web**: Local session data encrypted in IndexedDB, cleared upon session revocation.

### 4.2 Network Transport & Cloud Storage
- All network interactions use TLS 1.3 over HTTPS and Secure WebSockets (`wss://`).
- Supabase storage attachments are stored in a private, non-public bucket (`clipboard-attachments`). Access is mediated via short-lived signed URLs (maximum 15 minutes TTL) generated only for the verified account holder.

---

## 5. Device Revocation & Incident Response

If a user's phone or laptop is lost or stolen:
1. The user logs into the Web Dashboard from any trusted browser.
2. Under **Device Management**, the user clicks **Revoke Access** on the compromised device.
3. The server invalidates the device's refresh token and updates `devices.is_revoked = true`.
4. Subsequent sync attempts from the revoked device receive `401 Unauthorized` / `403 Forbidden`.
5. The local client, upon receiving a revocation response, immediately purges all local cache and pending queues.
