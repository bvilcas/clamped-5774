# Zips a project folder for the Canvas hand-in.
#
# Not Compress-Archive: on Windows PowerShell that writes backslashes into the
# zip entry names, and macOS then extracts files literally called
# "css\style.css" instead of a css folder. This writes forward slashes.
#
#   powershell -ExecutionPolicy Bypass -File tools/zip-submission.ps1
#   powershell -ExecutionPolicy Bypass -File tools/zip-submission.ps1 -Folder project3

# Each project is zipped into its own folder under dist/, so both can exist at
# once while still carrying the filename Canvas expects.
param(
    [string]$Folder = 'submission',
    [string]$Into = 'project2'
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root $Folder
$out  = Join-Path (Join-Path $root 'dist') $Into
$dst  = Join-Path $out 'brent-vilcas-bvilcas.zip'

if (-not (Test-Path -LiteralPath $src)) { throw "no folder to zip at $src" }
if (-not (Test-Path -LiteralPath $out)) { New-Item -ItemType Directory -Path $out -Force | Out-Null }
if (Test-Path -LiteralPath $dst) { Remove-Item -LiteralPath $dst }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$sep = [System.IO.Path]::DirectorySeparatorChar
$zip = [System.IO.Compression.ZipFile]::Open($dst, 'Create')
try {
    Get-ChildItem -LiteralPath $src -Recurse -File | Sort-Object FullName | ForEach-Object {
        $rel = $_.FullName.Substring($src.Length + 1).Replace($sep, '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel, 'Optimal') | Out-Null
    }
} finally {
    $zip.Dispose()
}

$z = [System.IO.Compression.ZipFile]::OpenRead($dst)
try {
    Write-Output ("{0}: {1} entries, {2:N0} KB" -f (Split-Path -Leaf $dst), $z.Entries.Count, ((Get-Item -LiteralPath $dst).Length / 1KB))
    $z.Entries | ForEach-Object { Write-Output ("  " + $_.FullName) }
} finally {
    $z.Dispose()
}
