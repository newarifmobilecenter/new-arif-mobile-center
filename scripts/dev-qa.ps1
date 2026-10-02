$ErrorActionPreference = "Stop"
$env:MONGODB_DB = "new_arif_mobile_center_qa"

npm run dev
exit $LASTEXITCODE