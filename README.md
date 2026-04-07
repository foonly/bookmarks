# Bookmarks

A secure, responsive web application to manage your bookmarks with local-first storage and encrypted synchronization.

## Features

- **Bookmark Management**: Easily add, edit, and delete bookmarks.
- **Tagging System**: Organize your bookmarks using a flexible tagging system.
- **Categorized Views**: Filter and view bookmarks by specific tags or see an overview in the Tags grid.
- **Encrypted Sync**: Synchronize your data across devices using a decentralized ID/Key system.
  - Data is encrypted client-side using **AES-GCM (Web Crypto API)** before being sent to the backend.
  - The sync server never sees your raw data or your secret key.
- **Responsive Design**: Fully functional on desktop and mobile devices.
- **Import/Export**: Move your data freely with JSON import and export functionality.
- **Local-First**: All data is stored in your browser's `localStorage` for immediate access even when offline.

## Technologies Used

- **Frontend**: TypeScript, Vite
- **Validation**: Zod
- **Security**: Web Crypto API (AES-GCM)
- **Styling**: Modern CSS with nested rules and media queries

## Installation

To install the project dependencies, ensure you have [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed.

```shell
pnpm install
```

## Development

To start the development server with hot-reloading:

```shell
pnpm run dev
```

## Building

To create a production-ready build in the `dist` directory:

```shell
pnpm run build
```

## Synchronization & Backend

The application is designed to work with a specialized Go-based backend (see `BACKEND.md` for specifications).

To enable sync:

1. Go to the **Settings** tab.
2. Generate a new **Sync ID/Key**.
3. Copy this string to your other devices to keep your bookmarks in sync.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

[GPL-3.0-only](https://opensource.org/licenses/GPL-3.0-only)
