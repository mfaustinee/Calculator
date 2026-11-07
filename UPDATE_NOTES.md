# Update notes

This update is based on the working KDB Levy Calculator source archive supplied on 6 November 2026.

## Changes

- Added periodic device-authorisation/configuration checks every five minutes while the calculator is open.
- Added a check when the browser reconnects and when the PWA returns to the foreground.
- Prevented overlapping synchronisation requests and cleaned up event listeners/timer when the component is unmounted.
- Preserved the existing offline fallback: temporary network failures continue using the saved approved configuration; explicit API rejection (401/403/404) blocks the installation.
- Added `cache: 'no-store'` to the activation request.
- Replaced the outdated README instructions for a public static company-config file with the current central administration, activation-code, device-assignment and offline model.

## Not changed

- Calculator formulas and calculation behaviour.
- Existing user interface and printed-document layout.
- API Worker, administrator Worker and D1 database. They are separate deployed services and are not included in this frontend archive.

## Build status

A production build could not be verified in this environment because the dependency installation requires a package-registry download (`sharp` was not available in the local npm cache). The source changes are limited to the synchronisation effect, activation fetch cache policy and documentation. Run the normal GStudio/Node build workflow before publishing.
