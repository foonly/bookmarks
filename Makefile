.PHONY: clean install dev test extension

build: install
	pnpm run build

install:
	pnpm i

dev: install
	pnpm run dev

test: install
	pnpm run test

# Packages the browser extension for addons.mozilla.org and the Chrome Web Store.
EXTENSION_VERSION := $(shell sed -n 's/.*"version": "\(.*\)".*/\1/p' extension/manifest.json)
extension:
	mkdir -p dist-extension
	rm -f dist-extension/bookmarks-extension-$(EXTENSION_VERSION).zip
	cd extension && zip -r -X ../dist-extension/bookmarks-extension-$(EXTENSION_VERSION).zip . -x README.md

clean:
	rm -rf node_modules dist-extension
