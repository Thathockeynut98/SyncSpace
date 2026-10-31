# SyncSpace local media discovery (read-only).
# Run from PowerShell on the Windows host. Never uploads or prints file contents.
param([string]$Root = "D:\SyncSpace")
$ErrorActionPreference = "Stop"
$extensions = @(".jpg",".jpeg",".png",".webp",".gif",".heic",".mp3",".m4a",".wav",".ogg",".opus",".mp4",".webm",".mov",".pdf",".txt",".md")
$skip = '(?i)[\\/](node_modules|\.git|private-backups|installation-backups|database|postgres|\.next)[\\/]'
if (-not (Test-Path -LiteralPath $Root -PathType Container)) { throw "Folder not found: $Root" }
$results = @(Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() -and $_.FullName -notmatch $skip } |
    Group-Object Extension |
    Sort-Object Name |
    ForEach-Object { [pscustomobject]@{ Type=$_.Name; Count=$_.Count; TotalMB=[math]::Round((($_.Group | Measure-Object Length -Sum).Sum / 1MB),2) } })
Write-Host "SyncSpace local media discovery (metadata only)" -ForegroundColor Cyan
if ($results.Count) { $results | Format-Table -AutoSize } else { Write-Host "No matching media files found under the selected folder." }
Write-Host "No files were uploaded, changed, or imported. Review source locations before any import." -ForegroundColor Yellow
