# Aerless installer: irm https://github.com/havecreator/aerless-code/releases/latest/download/install.ps1 | iex
# With flags: & ([scriptblock]::Create((irm https://github.com/havecreator/aerless-code/releases/latest/download/install.ps1))) --show-files
# Puts aerless.exe and aerless-code.exe in %USERPROFILE%\.aerless\bin, adds that folder to your user PATH
# (skip with $env:AERLESS_NO_MODIFY_PATH=1), then runs aerless. No admin.
# $env:AERLESS_VERSION picks a release (default: latest).
# Everything runs inside a script block so `irm | iex` does not change settings in the user's own window.
& {
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Fail($msg) { throw $msg }

try {
    if (-not [Environment]::Is64BitOperatingSystem) { Fail 'a 64-bit Windows is required' }
    # Windows PowerShell 5.1 may not offer TLS 1.2 by default.
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

    # Downloads come from GitHub Releases; AERLESS_BASE_URL points at another folder layout (<base>/<version>/<file>).
    $gh = 'https://github.com/havecreator/aerless-code/releases'
    $base = if ($env:AERLESS_BASE_URL) { "$env:AERLESS_BASE_URL/$(if ($env:AERLESS_VERSION) { $env:AERLESS_VERSION } else { 'latest' })" }
            elseif ($env:AERLESS_VERSION) { "$gh/download/v$env:AERLESS_VERSION" } else { "$gh/latest/download" }
    $name = 'aerless-windows-x64.exe'  # also runs on Windows on Arm (x64 emulation)
    # The OS architecture, not this PowerShell's: an x64 PowerShell on an Arm PC reports AMD64.
    $arm = try { [Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq 'Arm64' } catch { $env:PROCESSOR_IDENTIFIER -like 'ARM*' }
    # x64 uses the baseline build: it also runs on CPUs without AVX2, at a small speed cost.
    $code = if ($arm) { 'aerless-code-windows-arm64.exe' } else { 'aerless-code-windows-x64-baseline.exe' }

    $tmp = Join-Path ([IO.Path]::GetTempPath()) ("aerless-" + [Guid]::NewGuid())
    New-Item -ItemType Directory -Path $tmp | Out-Null
    try {
        try {
            Invoke-WebRequest -UseBasicParsing "$base/SHA256SUMS" -OutFile "$tmp\SHA256SUMS"
            Invoke-WebRequest -UseBasicParsing "$base/$name" -OutFile "$tmp\$name"
            Write-Host 'Downloading Aerless Code (about 200 MB)...'
            Invoke-WebRequest -UseBasicParsing "$base/$code" -OutFile "$tmp\$code"
        } catch { Fail "cannot download from $base ($($_.Exception.Message))" }

        foreach ($f in @($name, $code)) {
            $line = Get-Content "$tmp\SHA256SUMS" | Where-Object { ($_ -split '\s+')[1] -in @($f, "*$f") } | Select-Object -First 1
            if (-not $line) { Fail "$f is not listed in SHA256SUMS" }
            $want = ($line -split '\s+')[0]
            $got = (Get-FileHash -Algorithm SHA256 "$tmp\$f").Hash
            if ($got -ne $want) { Fail "checksum mismatch for $f, nothing was installed" }
        }

        $dir = Join-Path $env:USERPROFILE '.aerless\bin'
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        # A running exe (Aerless Code, the picture studio) cannot be overwritten but can be renamed.
        Get-ChildItem $dir -Filter '*.old-*' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        foreach ($pair in @(@($name, 'aerless.exe'), @($code, 'aerless-code.exe'))) {
            $dst = Join-Path $dir $pair[1]
            if (Test-Path $dst) { Rename-Item $dst "$($pair[1]).old-$PID" -ErrorAction SilentlyContinue }
            Move-Item -Force "$tmp\$($pair[0])" $dst
        }

        # User PATH, so `aerless` and `aerless-code` work in new terminals (and in this one). Read and write the
        # raw registry value so entries like %JAVA_HOME%\bin keep working (REG_EXPAND_SZ stays expandable).
        $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)
        $old = [string]$key.GetValue('Path', '', 'DoNotExpandEnvironmentNames')
        if (-not $env:AERLESS_NO_MODIFY_PATH -and -not (($old -split ';') -contains $dir)) {
            $key.SetValue('Path', ((@($dir) + ($old -split ';' | Where-Object { $_ })) -join ';'), 'ExpandString')
            # Setting any user variable this way tells Windows to reload the environment for new windows.
            [Environment]::SetEnvironmentVariable('AERLESS_HOME', (Split-Path $dir), 'User')
            Write-Host "Added $dir to your PATH. New terminals can run aerless and aerless-code."
        }
        $key.Close()
        if (-not (($env:Path -split ';') -contains $dir)) { $env:Path = "$dir;$env:Path" }
    } finally {
        Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
    }
} catch {
    Write-Host "Aerless install failed: $($_.Exception.Message)" -ForegroundColor Red
    return
}

$exe = Join-Path $env:USERPROFILE '.aerless\bin\aerless.exe'
if ($args.Count -gt 0) { & $exe @args; return }
& $exe setup
Write-Host ''
Write-Host 'Start Aerless Code: type  aerless   (this window already knows it; new windows too)'
} @args
