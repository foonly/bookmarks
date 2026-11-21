.PHONY: clean install dev test

build: install
	pnpm run build

install:
	pnpm i

dev: install
	pnpm run dev

test: install
	pnpm run test

clean:
	rm -rf node_modules
