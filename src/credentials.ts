/**
 * Sync credentials have the form "id:encKey:signSecret", as made by
 * generateCredentials() in crypto.ts.
 */

export interface Credentials {
	/** Identifies the data on the server. Not secret. */
	id: string;
	/** Encrypts the data. Never leaves the device. */
	encKey: string;
	/** Signs requests; the server keeps it to check them. */
	signSecret: string;
}

/**
 * Generated keys are 128 random bits written as 32 hex characters. The
 * encryption key is hashed only once (crypto.ts), which is safe for random
 * keys but would let a typed password be guessed quickly from the encrypted
 * data, so anything that does not look generated is refused.
 */
const STRONG_KEY = /^[0-9a-f]{32,}$/i;

export type CredentialsCheck =
	| { ok: true; credentials: Credentials }
	| { ok: false; problem: "invalid" | "weak" };

export function parseCredentials(value: string): CredentialsCheck {
	const parts = value.trim().split(":");
	if (parts.length !== 3 || parts.some((part) => part === "")) {
		return { ok: false, problem: "invalid" };
	}
	const [id, encKey, signSecret] = parts;
	if (!STRONG_KEY.test(encKey) || !STRONG_KEY.test(signSecret)) {
		return { ok: false, problem: "weak" };
	}
	return { ok: true, credentials: { id, encKey, signSecret } };
}
