# Bookmarks browser extension

A toolbar button for [Bookmarks](https://bookmarks.foonly.dev). The extension stores no bookmarks of its own: it opens the web app, where your bookmarks, tags and sync already live.

- **Click the button** (or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>) to open Bookmarks. If it is already open in a tab, that tab comes to the front.
- **Right-click the button**, or right-click the page, and choose *Add this page to Bookmarks* (or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>A</kbd>). The add form opens in a tab next to the page, with the address and title filled in. Add tags and a description, then save. The tab closes and you are back on the page. If the page is already saved, the form shows that bookmark so you can change it instead.

The shortcuts can be changed in Firefox under *about:addons → ⚙ → Manage Extension Shortcuts*, and in Chrome-based browsers at *chrome://extensions/shortcuts*.

It works in Firefox 128 or later and in current Chrome, Edge, Brave and other Chromium browsers, from the same files.

## Permissions

- **Access to bookmarks.foonly.dev**: to find an open Bookmarks tab, and to see when the add form has been saved so its tab can close.
- **Active tab**: to read the address and title of the page you are on, only when you use the button, its menu or a shortcut.
- **Menus** and **storage** (for the session only): for the *Add this page* item, and to remember which tabs were opened for adding.

It does not read your browsing history or any other site.

## Developing

Load it unpacked:

- **Firefox**: open *about:debugging#/runtime/this-firefox*, choose *Load Temporary Add-on…* and pick `extension/manifest.json`. Or run `npx web-ext run --source-dir extension`.
- **Chrome**: open *chrome://extensions*, turn on *Developer mode*, choose *Load unpacked* and pick the `extension` folder.

The web app address is `APP_URL` in `background.js` and the host permission in `manifest.json`. Change both to point it at another instance.

Check it with Mozilla's linter before publishing:

```shell
npx web-ext lint --source-dir extension
```

## Publishing

Raise `version` in `manifest.json`, then build the package:

```shell
make extension
```

This writes `dist-extension/bookmarks-extension-<version>.zip`.

- **Firefox**: upload it at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/). Firefox only installs signed add-ons; choose *On your own* to get a signed file without a public listing, or *On this site* to list it. The add-on ID is `bookmarks@foonly.dev`.
- **Chrome Web Store**: upload it in the [developer dashboard](https://chrome.google.com/webstore/devconsole) (one-time registration fee). The same zip works; Chrome ignores the Firefox-only manifest keys with a warning.
