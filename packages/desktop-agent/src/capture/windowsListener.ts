import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import { CreateClipboardItemInput, formatSafeLog } from '@clipvault/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type ClipboardCaptureCallback = (input: CreateClipboardItemInput) => void;

export class WindowsClipboardListener {
  private process: ChildProcess | null = null;
  private isRunning: boolean = false;
  private onCapture: ClipboardCaptureCallback;
  private attachmentsDir: string;
  private scriptPath: string;

  constructor(onCapture: ClipboardCaptureCallback, attachmentsDir?: string) {
    this.onCapture = onCapture;
    const appData = process.env.LOCALAPPDATA || process.env.APPDATA || './data';
    this.attachmentsDir = attachmentsDir || path.join(appData, 'ClipVault', 'attachments');

    if (!fs.existsSync(this.attachmentsDir)) {
      fs.mkdirSync(this.attachmentsDir, { recursive: true });
    }

    const directPath = path.join(__dirname, 'clipboard-listener.ps1');
    const srcFallback = path.join(__dirname, '..', '..', 'src', 'capture', 'clipboard-listener.ps1');
    this.scriptPath = fs.existsSync(directPath) ? directPath : srcFallback;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.spawnListenerProcess();
  }

  private spawnListenerProcess(): void {
    if (!this.isRunning) return;

    console.log(formatSafeLog('INFO', 'Starting Windows native clipboard format listener...'));

    this.process = spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', this.scriptPath,
      '-AttachmentsDir', this.attachmentsDir
    ], {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    if (this.process.stdout) {
      const rl = readline.createInterface({
        input: this.process.stdout,
        terminal: false
      });

      rl.on('line', (line) => {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('{')) return;

        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.status === 'READY') {
            console.log(formatSafeLog('INFO', 'Windows native clipboard format listener is READY and active'));
            return;
          }

          if (parsed.plainText || parsed.attachmentPath) {
            const input: CreateClipboardItemInput = {
              plainText: parsed.plainText || '',
              contentType: parsed.type,
              originalMimeTypes: parsed.originalMimeTypes || ['text/plain'],
              htmlContent: parsed.htmlContent,
              attachmentPath: parsed.attachmentPath,
              sourceApp: parsed.sourceApp,
              deviceId: 'win-desktop-01',
              deviceName: 'Windows Workstation'
            };

            this.onCapture(input);
          }
        } catch (err: any) {
          // Ignore JSON parse errors from non-payload lines
        }
      });
    }

    if (this.process.stderr) {
      this.process.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) {
          console.warn(formatSafeLog('WARN', 'Clipboard listener diagnostic note', { error: msg }));
        }
      });
    }

    this.process.on('exit', (code) => {
      console.log(formatSafeLog('WARN', `Windows clipboard listener process exited with code ${code}`));
      this.process = null;

      // Automatically restart after delay if still marked running
      if (this.isRunning) {
        setTimeout(() => this.spawnListenerProcess(), 2000);
      }
    });
  }

  public stop(): void {
    this.isRunning = false;
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    console.log(formatSafeLog('INFO', 'Windows clipboard listener stopped'));
  }
}
