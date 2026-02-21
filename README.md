# module-contacts

FuzzyPeanut Contacts module — a contact manager and lightweight CRM backed by a REST + CardDAV API.

## Features

- Contact list with search and tag filtering
- Contact detail view (emails, phones, website, address, notes)
- Organization records linked to contacts
- Timeline of interactions per contact (emails, meetings, notes)
- CardDAV sync for native client compatibility (iOS, Android, Thunderbird)
- Cross-module: provides `contacts:pick` for other modules to select a contact
- Cross-module: provides `contacts:get` to look up a contact by email

## Architecture

| Component | Description |
|---|---|
| `contacts-ui` | nginx serving `dist/remoteEntry.js` (Svelte, Vite library build) |
| `contacts-registrar` | One-shot Python container that registers with the shell registry |
| `contacts-api` | REST + CardDAV backend (Python or Rust) |

## Development

```sh
# Install deps and build the UI
npm install
npm run build      # outputs dist/remoteEntry.js

# Watch mode
npm run dev
```

## Docker

```sh
docker compose up
```

The UI is served on port 3002, the API on port 3003.

Set `REGISTRY_URL` and `MODULE_UI_URL` environment variables to point at your shell registry and this module's public URL.

## Cross-Module Events

| Event | Direction | Description |
|---|---|---|
| `contacts:pick` | provided | Opens the contact picker; returns selected contact(s) |
| `contacts:get` | provided | Returns a contact by email address |
