# ====================================================================
# CLIPVAULT: NATIVE WINDOWS CLIPBOARD EVENT LISTENER
# Event-driven via Win32 AddClipboardFormatListener & WM_CLIPBOARDUPDATE
# Zero CPU polling loop: sleeps until Windows emits clipboard change event
# ====================================================================

param(
    [string]$AttachmentsDir = "$env:LOCALAPPDATA\ClipVault\attachments"
)

# Ensure attachments directory exists
if (-not (Test-Path $AttachmentsDir)) {
    New-Item -ItemType Directory -Path $AttachmentsDir -Force | Out-Null
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Win32 Native API Definitions
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32Clipboard {
    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool AddClipboardFormatListener(IntPtr hwnd);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool RemoveClipboardFormatListener(IntPtr hwnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

# Blacklist of sensitive processes
$ExcludedProcesses = @(
    "1Password",
    "Bitwarden",
    "KeePass",
    "KeePassXC",
    "Dashlane",
    "LastPass",
    "Authy",
    "GoogleAuthenticator"
)

# Form to host the Win32 message pump
class ClipboardListenerForm : System.Windows.Forms.Form {
    [string]$AttachmentsPath

    ClipboardListenerForm([string]$attachmentsPath) {
        $this.AttachmentsPath = $attachmentsPath
        $this.ShowInTaskbar = $false
        $this.WindowState = [System.Windows.Forms.FormWindowState]::Minimized
        $this.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
    }

    [void]OnHandleCreated([EventArgs]$e) {
        ([System.Windows.Forms.Form]$this).OnHandleCreated($e)
        [Win32Clipboard]::AddClipboardFormatListener($this.Handle) | Out-Null
        # Signal ready to parent Node.js process
        [Console]::WriteLine('{"status":"READY"}')
        [Console]::Out.Flush()
    }

    [void]OnHandleDestroyed([EventArgs]$e) {
        [Win32Clipboard]::RemoveClipboardFormatListener($this.Handle) | Out-Null
        ([System.Windows.Forms.Form]$this).OnHandleDestroyed($e)
    }

    [void]WndProc([System.Windows.Forms.Message]&$m) {
        # WM_CLIPBOARDUPDATE = 0x031D
        if ($m.Msg -eq 0x031D) {
            $this.ProcessClipboardChange()
        }
        ([System.Windows.Forms.Form]$this).WndProc(&$m)
    }

    [void]ProcessClipboardChange() {
        try {
            # 1. Inspect foreground process
            $fgHwnd = [Win32Clipboard]::GetForegroundWindow()
            $procId = [uint32]0
            [Win32Clipboard]::GetWindowThreadProcessId($fgHwnd, [ref]$procId) | Out-Null
            
            $sourceApp = ""
            if ($procId -gt 0) {
                try {
                    $sourceApp = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
                } catch {}
            }

            # Check if source process is in the sensitive exclusion blacklist
            foreach ($excluded in $global:ExcludedProcesses) {
                if ($sourceApp -like "*$excluded*") {
                    # Skip sensitive capture completely (Zero logging)
                    return
                }
            }

            # Retry up to 5 times for clipboard lock release
            $dataObject = $null
            for ($attempt = 0; $attempt -lt 5; $attempt++) {
                try {
                    $dataObject = [System.Windows.Forms.Clipboard]::GetDataObject()
                    if ($dataObject -ne $null) { break }
                } catch {
                    [System.Threading.Thread]::Sleep(40)
                }
            }

            if ($dataObject -eq $null) { return }

            # 2. Check for Image content
            if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
                $img = [System.Windows.Forms.Clipboard]::GetImage()
                if ($img -ne $null) {
                    $imgId = [System.Guid]::NewGuid().ToString()
                    $imgFile = Join-Path $this.AttachmentsPath "clip_$imgId.png"
                    $img.Save($imgFile, [System.Drawing.Imaging.ImageFormat]::Png)
                    $img.Dispose()

                    $payload = @{
                        type = "image"
                        plainText = "[Image: $imgId.png]"
                        attachmentPath = $imgFile
                        sourceApp = $sourceApp
                        originalMimeTypes = @("image/png")
                    } | ConvertTo-Json -Compress

                    [Console]::WriteLine($payload)
                    [Console]::Out.Flush()
                    return
                }
            }

            # 3. Check for File Drop List
            if ([System.Windows.Forms.Clipboard]::ContainsFileDropList()) {
                $files = [System.Windows.Forms.Clipboard]::GetFileDropList()
                if ($files -ne $null -and $files.Count -gt 0) {
                    $fileList = @($files)
                    $payload = @{
                        type = "file_ref"
                        plainText = ($fileList -join [Environment]::NewLine)
                        sourceApp = $sourceApp
                        originalMimeTypes = @("application/x-file-list")
                    } | ConvertTo-Json -Compress

                    [Console]::WriteLine($payload)
                    [Console]::Out.Flush()
                    return
                }
            }

            # 4. Check for Text & HTML
            if ([System.Windows.Forms.Clipboard]::ContainsText()) {
                $text = [System.Windows.Forms.Clipboard]::GetText()
                if (-not [string]::IsNullOrEmpty($text)) {
                    $htmlContent = $null
                    $mimes = @("text/plain")

                    if ($dataObject.GetDataPresent([System.Windows.Forms.DataFormats]::Html)) {
                        $htmlContent = $dataObject.GetData([System.Windows.Forms.DataFormats]::Html)
                        $mimes += "text/html"
                    }

                    $payload = @{
                        type = "text"
                        plainText = $text
                        htmlContent = $htmlContent
                        sourceApp = $sourceApp
                        originalMimeTypes = $mimes
                    } | ConvertTo-Json -Compress

                    [Console]::WriteLine($payload)
                    [Console]::Out.Flush()
                }
            }
        } catch {
            # Silently catch transient clipboard read errors to prevent listener crash
        }
    }
}

# Run message pump
$form = [ClipboardListenerForm]::new($AttachmentsDir)
[System.Windows.Forms.Application]::Run($form)
