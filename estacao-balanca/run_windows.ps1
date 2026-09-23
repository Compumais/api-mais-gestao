$env:Path = "$env:USERPROFILE\flutter\bin;$env:Path"
Set-Location $PSScriptRoot
flutter run -d windows --no-enable-impeller @args
