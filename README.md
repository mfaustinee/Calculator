# KDB Levy Calculator

Offline-capable Progressive Web App for preparing Consumer Safety Levy estimates.

## Company and branch configuration

The official company and branch details are maintained in:

`public/company-config.json`

This is a static configuration file served by Cloudflare Pages. It is not a database. To update company details or add, edit, deactivate, or remove a branch:

1. Edit `public/company-config.json` in the project.
2. Increase the numeric `version` value.
3. Update `lastUpdated` using `YYYY-MM-DD`.
4. Commit/publish the updated project to the Cloudflare Pages production deployment.
5. Each installation receives the new configuration through the PWA's service-worker update. It must reconnect to the internet to receive the update; until then it continues using its last cached configuration.

Keep branch `id` values stable once they are in use. Set `active` to `false` to remove a branch from the branch selector without deleting its historical identity from the configuration.

Example:

```json
{
  "version": 2,
  "lastUpdated": "2026-11-02",
  "company": {
    "name": "Kenya Dairy Board",
    "website": "www.kdb.go.ke",
    "registeredOffice": {
      "address": "",
      "telephone": "",
      "email": ""
    }
  },
  "branches": [
    {
      "id": "kericho",
      "name": "Kericho Office",
      "address": "Ardhi House (Huduma Centre), 5th Floor, Wing B.",
      "telephone": "0717997465",
      "email": "Kericho@kdb.co.ke",
      "active": true
    }
  ]
}
```

Only enter verified official contact details. The registered office is separate from branch addresses and is displayed only when its address is populated.

## Default branch per installation

The first time the app loads its configuration:

- If there is exactly one active branch, that branch is selected automatically.
- If there are multiple active branches, the user selects the branch assigned to that computer/PWA installation.
- The selected branch is saved in that browser/PWA installation's local storage and reused for subsequent estimates.
- The branch selector remains available if a computer is reassigned to another office.

The selected branch is local to the browser profile/device. It is not a centrally enforced user identity, and it does not prevent a user from changing the selection. This approach is suitable for convenience and document branding, not access control.

## Offline behaviour

The company configuration JSON is included in the PWA precache. The app also keeps a validated copy in IndexedDB as a fallback. After a deployment, an installation must connect and complete its service-worker update before it can use the new configuration. Offline installations continue using the last valid cached copy.

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

Deploy the generated `dist` directory using the existing Cloudflare Pages project/build settings.
