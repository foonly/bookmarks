/**
 * Minimal browser globals for the app modules under test. Node already
 * provides crypto, fetch, Response, Headers, Event and navigator.
 */
import { beforeEach } from "vitest";

class MemoryStorage {
	private items = new Map<string, string>();
	getItem(key: string) {
		return this.items.get(key) ?? null;
	}
	setItem(key: string, value: string) {
		this.items.set(key, String(value));
	}
	removeItem(key: string) {
		this.items.delete(key);
	}
	clear() {
		this.items.clear();
	}
	key(index: number) {
		return [...this.items.keys()][index] ?? null;
	}
	get length() {
		return this.items.size;
	}
}

const g = globalThis as Record<string, unknown>;
g.window = globalThis;
g.localStorage = new MemoryStorage();
g.location = { href: "http://localhost:4173/", origin: "http://localhost:4173" };
g.addEventListener ??= () => {};
g.removeEventListener ??= () => {};
g.dispatchEvent ??= () => true;

beforeEach(() => {
	localStorage.clear();
});
