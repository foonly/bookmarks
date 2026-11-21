import { describe, expect, it } from "vitest";
import { parseCredentials } from "./credentials";
import { generateCredentials } from "./crypto";

const key = "0123456789abcdef0123456789abcdef";

describe("parseCredentials", () => {
	it("accepts every generated credential", () => {
		for (let i = 0; i < 100; i++) {
			expect(parseCredentials(generateCredentials()).ok).toBe(true);
		}
	});

	it("splits a valid credential into its parts", () => {
		expect(parseCredentials(` a1b2c3:${key}:${key.toUpperCase()} `)).toEqual({
			ok: true,
			credentials: { id: "a1b2c3", encKey: key, signSecret: key.toUpperCase() },
		});
	});

	it.each(["", "only-an-id", `id:${key}`, `id:${key}:${key}:extra`, `:${key}:${key}`, `id::${key}`])(
		"rejects the malformed %j",
		(value) => expect(parseCredentials(value)).toEqual({ ok: false, problem: "invalid" }),
	);

	it.each([
		["a typed password", "mine:hunter2:hunter2"],
		["a key one character short", `id:${key.slice(1)}:${key}`],
		["a short secret", `id:${key}:abc123`],
		["a non-hex key of the right length", `id:${"z".repeat(32)}:${key}`],
	])("rejects %s as too weak", (_, value) => {
		expect(parseCredentials(value)).toEqual({ ok: false, problem: "weak" });
	});
});
