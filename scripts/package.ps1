param(
  [switch]$IncludeRuntimeData,
  [switch]$IncludeNodeModules
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$DistDir = Join-Path $Root "dist"
$PackageName = "camera-monitor-dashboard"
$ZipName = $PackageName
if ($IncludeRuntimeData) {
  $ZipName = "$ZipName-with-data"
}
if ($IncludeNodeModules) {
  $ZipName = "$ZipName-offline-windows"
}
$StageDir = Join-Path $DistDir $ZipName
$ZipPath = Join-Path $DistDir "$ZipName.zip"

if (Test-Path $StageDir) {
  Remove-Item -LiteralPath $StageDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $StageDir | Out-Null
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

$Files = @(
  "package.json",
  "package-lock.json",
  "server.js",
  "ecosystem.config.cjs",
  "install.sh",
  ".env.example",
  "README_DEPLOY.md"
)

foreach ($File in $Files) {
  Copy-Item -LiteralPath (Join-Path $Root $File) -Destination (Join-Path $StageDir $File) -Force
}

Copy-Item -LiteralPath (Join-Path $Root "public") -Destination (Join-Path $StageDir "public") -Recurse -Force

$StageDataDir = Join-Path $StageDir "data"
New-Item -ItemType Directory -Force -Path $StageDataDir | Out-Null

if ($IncludeRuntimeData) {
  Copy-Item -LiteralPath (Join-Path $Root "data\cameras.json") -Destination (Join-Path $StageDataDir "cameras.json") -Force
  Copy-Item -LiteralPath (Join-Path $Root "data\state.json") -Destination (Join-Path $StageDataDir "state.json") -Force
} else {
  Set-Content -LiteralPath (Join-Path $StageDataDir "cameras.json") -Value "[]" -Encoding UTF8
  Set-Content -LiteralPath (Join-Path $StageDataDir "state.json") -Value "{}" -Encoding UTF8
}

if ($IncludeNodeModules) {
  Copy-Item -LiteralPath (Join-Path $Root "node_modules") -Destination (Join-Path $StageDir "node_modules") -Recurse -Force
}

if (Test-Path $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

$ItemsToArchive = Get-ChildItem -LiteralPath $StageDir -Force
Compress-Archive -Path $ItemsToArchive.FullName -DestinationPath $ZipPath -Force

Write-Host "Created package: $ZipPath"
Write-Host "Runtime data included: $IncludeRuntimeData"
Write-Host "node_modules included: $IncludeNodeModules"
