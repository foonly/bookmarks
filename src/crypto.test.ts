import { describe, expect, it } from "vitest";
import { decrypt, encrypt, generateCredentials, hash, sign } from "./crypto";

describe("hash", () => {
	it("returns the SHA-256 hex digest", async () => {
		expect(await hash("abc")).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});
});

describe("sign", () => {
	it("returns the HMAC-SHA256 hex digest (RFC 4231 test case 2)", async () => {
		expect(await sign("what do ya want for nothing?", "Jefe")).toBe(
			"5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843",
		);
	});
});

describe("encrypt / decrypt", () => {
	it("round-trips text, including non-ASCII", async () => {
		const text = JSON.stringify({ title: "Kirjanmerkit — äöå 🔖" });
		expect(await decrypt(await encrypt(text, "key"), "key")).toBe(text);
	});

	it("handles payloads near the server's 1 MB limit", async () => {
		// Spreading the ciphertext into String.fromCharCode overflowed the
		// call stack above roughly 100 KB.
		const text = "x".repeat(700_000);
		expect(await decrypt(await encrypt(text, "key"), "key")).toBe(text);
	});

	it("uses a fresh IV, so the same input encrypts differently", async () => {
		expect(await encrypt("same", "key")).not.toBe(await encrypt("same", "key"));
	});

	it("rejects the wrong key", async () => {
		await expect(decrypt(await encrypt("secret", "right"), "wrong")).rejects.toThrow();
	});

	it("rejects tampered ciphertext", async () => {
		const bytes = Uint8Array.from(atob(await encrypt("secret", "key")), (c) =>
			c.charCodeAt(0),
		);
		bytes[bytes.length - 1] ^= 1;
		const tampered = btoa(String.fromCharCode(...bytes));
		await expect(decrypt(tampered, "key")).rejects.toThrow();
	});
});

describe("generateCredentials", () => {
	it("returns a random ID:EncKey:Secret triple in hex", () => {
		const credentials = generateCredentials();
		expect(credentials).toMatch(/^[0-9a-f]{12}:[0-9a-f]{32}:[0-9a-f]{32}$/);
		expect(generateCredentials()).not.toBe(credentials);
	});
});
