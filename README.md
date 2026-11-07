# KDB Levy Calculator

Offline-capable Progressive Web App for preparing Consumer Safety Levy estimates.

## Company and branch configuration

Company and branch details are managed centrally by the administrator through the separate KDB Levy Administration dashboard. They are **not** maintained in this project as a public JSON file, and ordinary calculator users cannot edit the official company or branch details.

The public calculator obtains its assigned configuration from the KDB Levy API after device activation. Each installation is assigned to one branch through a single-use activation code. The API uses the installation credential to identify the installation and retrieve its assigned branch; the browser does not choose or submit a branch ID.

To add or update company and branch details:

1. Sign in to the administrator dashboard using the authorised administrator account.
2. Update the company details or create/update the required branch.
3. Generate a single-use activation code for the branch when activating a new device.
4. Enter that code in the calculator on the device being assigned.

Keep activation codes private. Each code can be redeemed once. The device credential is saved in that browser/PWA installation and is not displayed again after activation. If the browser profile or device storage is cleared, the device may need a new activation code.

## Device authorisation and offline use

- First-time activation requires an internet connection.
- After activation, the assigned company and branch configuration is saved locally in IndexedDB.
- The calculator can continue operating offline using the last successfully downloaded configuration.
- When online, the app checks its authorisation at startup, when the connection returns, when the app becomes visible again, and periodically while it remains open.
- A revoked device or inactive branch is blocked the next time the device successfully contacts the API. Revocation cannot be delivered while a device is offline.
- Ordinary connection failures do not erase the saved configuration or prevent offline calculations.

## Environment configuration

Set the API base URL in the build environment:

```env
VITE_API_BASE_URL=https://YOUR-KDB-LEVY-API-WORKER.workers.dev
```

For the existing production deployment, retain the configured KDB API Worker URL. Do not put activation codes, device credentials, administrator credentials, or private company data in frontend environment variables or source files. Only the public API base URL belongs in `VITE_API_BASE_URL`.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

The production build is written to `dist`. Deploy the generated build using the existing Cloudflare Pages/GStudio workflow and preserve the configured `VITE_API_BASE_URL` environment variable.

## Important deployment note

This archive contains the calculator frontend. It does not replace or deploy the separate Cloudflare API Worker, administrator Worker, or D1 database. Those services must remain deployed and configured as they are for activation, branch assignment, central configuration management, and device authorisation to work.
