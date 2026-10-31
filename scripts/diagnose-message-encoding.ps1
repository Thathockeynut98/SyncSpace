# Read-only. Downloads source into memory; no files, containers or data are changed.
# Output contains record IDs, lengths and encoding categories only.
param(
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{40}$')][string]$Commit,
  [string]$Container = 'syncspace-local-starter-api-1',
  [ValidatePattern('^[A-Za-z0-9_-]{1,100}$')][string]$SpaceId = '6adfebfcdb85ad6a8cbb4823'
)
$ErrorActionPreference = 'Stop'
$base = "https://raw.githubusercontent.com/Thathockeynut98/SyncSpace/$Commit/api"
$module = (Invoke-WebRequest -UseBasicParsing -Uri "$base/encoding-diagnostics.js").Content
$runner = (Invoke-WebRequest -UseBasicParsing -Uri "$base/scripts/diagnose-message-encoding.js").Content
$runner = $runner.Replace("import {encodingShape} from '../encoding-diagnostics.js';", '')
# The running API supplies its own pg dependency and existing PG environment.
($module + "`n" + $runner) | docker exec -i $Container node --input-type=module - $SpaceId
if ($LASTEXITCODE -ne 0) { throw 'Read-only diagnostics failed. No database changes were requested.' }
