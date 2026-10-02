NEW ARIF MOBILE CENTER - Compact Dashboard Patch

This patch only changes dashboard spacing/size. It does not change POS, database, API, or business logic.

Recommended installation in the existing project:
1. Copy compact-dashboard.css into the project root.
2. Append its contents to app/globals.css.

PowerShell one-command option:
Get-Content .\compact-dashboard.css | Add-Content .\app\globals.css

Then run:
npm run build

The dashboard is 4 columns on normal laptop widths and card descriptions are hidden so the system menu fits much more tightly on one screen. Mobile remains responsive.
