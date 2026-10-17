# ClipVault: Operations, Setup & User Guide

ClipVault is a privacy-conscious, multi-platform clipboard persistence and synchronization system across Android (Android 16 / One UI 8), Windows 10/11, and the Web.

---

## 1. Quick Start & Prerequisites

### System Requirements
- **Node.js**: v20.0.0 or higher (v22+ recommended).
- **Windows**: Windows 10 (Build 19041+) or Windows 11 (Win32 format listener enabled).
- **Android**: Android 10+ (Fully optimized for Android 16 / Samsung One UI 8).
- **Java**: JDK 17 (Microsoft OpenJDK or Eclipse Temurin) for Android build.
- **Backend (Optional for Sync)**: Supabase PostgreSQL database project.

---

## 2. Windows Desktop Agent Setup

The Windows Desktop Agent captures clipboard events natively via the Win32 `AddClipboardFormatListener` / `WM_CLIPBOARDUPDATE` hook, eliminating CPU-intensive polling.

### Running in Development
```powershell
npm run dev --workspace=@clipvault/desktop-agent
```

### Production Build & Execution
```powershell
# 1. Compile TypeScript and copy native PowerShell format listener
npm run build --workspace=@clipvault/desktop-agent

# 2. Launch background agent
npm start --workspace=@clipvault/desktop-agent
```

### Running as a Windows Background Task
To run ClipVault automatically upon Windows login:
1. Press `Win + R`, type `shell:startup`, and press Enter.
2. Create a shortcut pointing to:
   ```powershell
   powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -Command "npm start --prefix c:\Users\Thejas\OneDrive\Desktop\clipvault\packages\desktop-agent"
   ```
3. The agent will run with zero idle CPU utilization, logging captured events (with scrubbed PII) and queuing sync records durably to SQLite WAL storage in `%LOCALAPPDATA%\ClipVault\vault.sqlite`.

---

## 3. Android Application Setup (Samsung One UI 8 / Android 16)

The Android application implements a 4-tier ingestion strategy to overcome modern OS background restrictions:
- **Tier 1 (Real-time Background)**: Accessibility Service (`ClipVaultAccessibilityService`).
- **Tier 2 (1-Tap Quick Action)**: Quick Settings Tile (`ClipVaultTileService`).
- **Tier 3 (Universal Ingestion)**: Android Share Sheet receiver (`ACTION_SEND`).
- **Tier 4 (Focus Catch-up)**: `MainActivity.onResume` foreground catch-up.

### Building the APK
```powershell
cd android
.\gradlew.bat assembleDebug
```
The output APK is located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Installing & Activating on Samsung Galaxy A17 5G
1. Enable USB Debugging on your device: `Settings > Developer Options > USB Debugging`.
2. Install the APK via ADB:
   ```bash
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
3. Grant Accessibility Permission:
   - Go to `Settings > Accessibility > Installed Apps`.
   - Tap **ClipVault** and toggle to **On**.
4. Whitelist from Samsung Device Care / App Sleep:
   - Go to `Settings > Battery > Background usage limits > Never auto-sleeping apps`.
   - Add **ClipVault**.
5. Add Quick Settings Tile:
   - Swipe down twice from the top of the screen to open the Quick Settings panel.
   - Tap Edit (`pencil` icon) > tap **ClipVault Save** to add it to your active tiles.

---

## 4. Web Dashboard Setup & Deployment

The Web Dashboard is built with React 19, Vite, and custom CSS design tokens (zero Tailwind dependency).

### Local Development
```powershell
npm run dev --workspace=@clipvault/web-dashboard
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```powershell
npm run build --workspace=@clipvault/web-dashboard
```
The compiled static assets are located in `packages/web-dashboard/dist`.

### Deployment Options
- **Vercel / Netlify**: Connect repository, set Root Directory to `packages/web-dashboard`, build command `npm run build`, output directory `dist`.
- **Self-Hosted (Caddy / Nginx)**: Serve `packages/web-dashboard/dist` with SPA history fallback (`try_files $uri /index.html`).

---

## 5. Supabase Backend & Synchronization

ClipVault uses Supabase for authentication, Row Level Security (RLS), real-time notifications, and attachment storage.

### Deploying Database Migrations
1. Open your Supabase project's SQL Editor.
2. Execute [`migrations/001_initial_schema.sql`](file:///c:/Users/Thejas/OneDrive/Desktop/clipvault/packages/backend-supabase/migrations/001_initial_schema.sql) to create `clipboard_items`, `devices`, and full-text search indexes.
3. Execute [`migrations/002_rls_policies.sql`](file:///c:/Users/Thejas/OneDrive/Desktop/clipvault/packages/backend-supabase/migrations/002_rls_policies.sql) to enforce strict user-level RLS policies.
4. Enable Supabase Realtime for the `clipboard_items` table in `Database > Replication`.

### Connecting Clients
Set the following environment variables in `.env` (or web environment):
```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## 6. Backup, Restore & Data Portability

ClipVault adheres to local-first principles: your data belongs to you.

### Exporting History from Web Dashboard
1. Open the Web Dashboard.
2. Click **Export** in the top navigation bar.
3. Choose your preferred format:
   - **JSON**: Complete record with all timestamps, hashes, tags, and metadata.
   - **CSV**: Spreadsheet-compatible tabular format.
   - **Markdown**: Formatted document with code syntax blocks and clickable links.

### Direct SQLite Backup (Windows Agent)
The Windows agent stores all items and outbox events in SQLite WAL mode:
- Location: `%LOCALAPPDATA%\ClipVault\vault.sqlite`
- To backup:
  ```powershell
  # Perform safe backup while agent is running using SQLite vacuum
  sqlite3 "$env:LOCALAPPDATA\ClipVault\vault.sqlite" ".backup '$HOME\Desktop\clipvault-backup.sqlite'"
  ```
- To restore: Simply copy `clipvault-backup.sqlite` back to `%LOCALAPPDATA%\ClipVault\vault.sqlite` with the agent stopped.

---

## 7. Troubleshooting & Known OS Constraints

### Issue: Android 12+ Privacy Toast
- **Symptom**: Android displays a system toast notification: "ClipVault pasted from your clipboard".
- **Root Cause**: Mandatory Android 12+ security feature when foreground apps access clipboard.
- **Resolution**: Expected behavior. On Samsung One UI 8, Accessibility Service capture minimizes toast frequency.

### Issue: Windows Agent drops copies from Password Managers
- **Cause**: Built-in security policy. ClipVault automatically detects and drops clipboard events originating from known password manager processes (e.g., 1Password, Bitwarden, KeePass, KeePassXC) to protect sensitive credentials.

### Issue: Device Revocation
- If a laptop or phone is lost or compromised, open the Web Dashboard > **Devices** > click **Revoke Access**. The revoked device will immediately be rejected by the cloud sync engine and blocked from uploading or downloading records.
