$ErrorActionPreference = 'Stop'
$toolchainRoot = Join-Path $PSScriptRoot '..\android-toolchain'
$sdkRoot = Join-Path $toolchainRoot 'sdk'
$jdkRoot = Join-Path $toolchainRoot 'jdk'
$downloadRoot = Join-Path $toolchainRoot 'downloads'
New-Item -ItemType Directory -Force -Path $sdkRoot, $jdkRoot, $downloadRoot | Out-Null

$jdkArchive = Join-Path $downloadRoot 'temurin-jdk21.zip'
$sdkArchive = Join-Path $downloadRoot 'android-commandlinetools.zip'
$jdkExtract = Join-Path $downloadRoot 'jdk-extracted'
$sdkExtract = Join-Path $downloadRoot 'sdk-extracted'
& curl.exe --fail --location --retry 3 --connect-timeout 20 --max-time 1800 'https://aka.ms/download-jdk/microsoft-jdk-21.0.12.1-windows-x64.zip' --output $jdkArchive
if ($LASTEXITCODE -ne 0) { throw 'O download do JDK não terminou.' }
& curl.exe --fail --location --retry 3 --connect-timeout 20 --max-time 1800 'https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip' --output $sdkArchive
if ($LASTEXITCODE -ne 0) { throw 'O download das ferramentas Android não terminou.' }
Expand-Archive -Path $jdkArchive -DestinationPath $jdkExtract -Force
Expand-Archive -Path $sdkArchive -DestinationPath $sdkExtract -Force

$jdkFolder = Get-ChildItem -LiteralPath $jdkExtract -Directory | Select-Object -First 1
if (-not $jdkFolder) { throw 'O arquivo do JDK não contém a pasta esperada.' }
Copy-Item -LiteralPath $jdkFolder.FullName -Destination (Join-Path $jdkRoot 'current') -Recurse -Force
$commandLineRoot = Join-Path $sdkExtract 'cmdline-tools'
New-Item -ItemType Directory -Force -Path (Join-Path $sdkRoot 'cmdline-tools') | Out-Null
Copy-Item -LiteralPath $commandLineRoot -Destination (Join-Path $sdkRoot 'cmdline-tools\latest') -Recurse -Force

$env:JAVA_HOME = Join-Path $jdkRoot 'current'
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$sdkManager = Join-Path $sdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
@('y') * 50 | & $sdkManager "--sdk_root=$sdkRoot" --licenses
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível aceitar as licenças do Android SDK.' }
& $sdkManager "--sdk_root=$sdkRoot" 'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível instalar os pacotes do Android SDK.' }

npm run android:apk
if ($LASTEXITCODE -ne 0) { throw 'A compilação do APK falhou; consulte a saída acima.' }
Write-Output "APK criado em: $(Join-Path $PSScriptRoot '..\android\app\build\outputs\apk\debug\app-debug.apk')"
