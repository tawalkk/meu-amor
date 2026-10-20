$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localToolchain = Join-Path $projectRoot 'android-toolchain'
$localJdk = Join-Path $localToolchain 'jdk\current'
$localSdk = Join-Path $localToolchain 'sdk'
if (Test-Path (Join-Path $localJdk 'bin\java.exe')) { $env:JAVA_HOME = $localJdk }
if (Test-Path (Join-Path $localSdk 'cmdline-tools\latest\bin\sdkmanager.bat')) {
  $env:ANDROID_HOME = $localSdk
  $env:ANDROID_SDK_ROOT = $localSdk
}

Push-Location $projectRoot
try {
  npm run android:sync
  if ($LASTEXITCODE -ne 0) { throw 'A sincronização dos arquivos do app falhou.' }
  Push-Location (Join-Path $projectRoot 'android')
  try {
    & .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -ne 0) { throw 'A compilação do APK falhou.' }
  } finally { Pop-Location }
  $releaseDirectory = Join-Path $projectRoot 'releases'
  New-Item -ItemType Directory -Force -Path $releaseDirectory | Out-Null
  $apkPath = Join-Path $releaseDirectory 'Nosso-amor-teste.apk'
  $builtApkPath = Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
  Copy-Item -LiteralPath $builtApkPath -Destination $apkPath -Force
  $downloadDirectories = @(
    (Join-Path $projectRoot 'web\downloads'),
    (Join-Path $projectRoot 'www\downloads')
  )
  foreach ($directory in $downloadDirectories) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
    Copy-Item -LiteralPath $builtApkPath -Destination (Join-Path $directory 'Nosso-amor-teste.apk') -Force
  }
  Write-Output "APK criado em: $apkPath"
} finally { Pop-Location }
