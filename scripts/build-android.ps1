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
  Copy-Item -LiteralPath (Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk') -Destination (Join-Path $projectRoot 'Nosso-amor.apk') -Force
  Write-Output "APK criado em: $(Join-Path $projectRoot 'Nosso-amor.apk')"
} finally { Pop-Location }
