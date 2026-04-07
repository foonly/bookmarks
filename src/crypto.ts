/**
 * Utility for AES-GCM encryption and decryption using the Web Crypto API.
 * This is used for local encryption of bookmark data before uploading to a sync server.
 */

/**
 * Derives a CryptoKey from a raw string secret.
 * Uses SHA-256 to ensure the key is exactly 256 bits regardless of input length.
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
	const enc = new TextEncoder();
	const keyMaterial = await window.crypto.subtle.digest(
		"SHA-256",
		enc.encode(secret),
	);
	return window.crypto.subtle.importKey(
		"raw",
		keyMaterial,
		{ name: "AES-GCM" },
		false,
		["encrypt", "decrypt"],
	);
}

/**
 * Encrypts a string using AES-GCM.
 * Returns a base64-encoded string containing the IV and the ciphertext.
 */
export async function encrypt(data: string, secret: string): Promise<string> {
	const key = await deriveKey(secret);
	const iv = window.crypto.getRandomValues(new Uint8Array(12));
	const encodedData = new TextEncoder().encode(data);

	const ciphertext = await window.crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		key,
		encodedData,
	);

	// Combine IV and ciphertext for storage/transmission
	const combined = new Uint8Array(iv.length + ciphertext.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(ciphertext), iv.length);

	// Convert to Base64 for easy string handling
	return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64-encoded string (containing IV + ciphertext) using AES-GCM.
 */
export async function decrypt(
	base64Data: string,
	secret: string,
): Promise<string> {
	const key = await deriveKey(secret);

	// Convert Base64 back to Uint8Array
	const combined = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

	// Extract the 12-byte IV and the remaining ciphertext
	const iv = combined.slice(0, 12);
	const ciphertext = combined.slice(12);

	const decrypted = await window.crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		key,
		ciphertext,
	);

	return new TextDecoder().decode(decrypted);
}

/**
 * Generates a SHA-256 hash of a string.
 */
export async function hash(data: string): Promise<string> {
	const enc = new TextEncoder();
	const hashBuffer = await window.crypto.subtle.digest(
		"SHA-256",
		enc.encode(data),
	);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Generates an HMAC-SHA256 signature for a message using the signing secret.
 */
export async function sign(message: string, secret: string): Promise<string> {
	const enc = new TextEncoder();
	const key = await window.crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signature = await window.crypto.subtle.sign(
		"HMAC",
		key,
		enc.encode(message),
	);

	// Convert to hex string
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Helper to generate a new unique Sync ID, Encryption Key, and Signing Secret.
 * Formatted as "id:enc_key:sign_secret"
 */
export function generateCredentials(): string {
	const idArray = new Uint8Array(6);
	const encKeyArray = new Uint8Array(16);
	const signSecretArray = new Uint8Array(16);

	window.crypto.getRandomValues(idArray);
	window.crypto.getRandomValues(encKeyArray);
	window.crypto.getRandomValues(signSecretArray);

	// Convert bytes to hex strings
	const id = Array.from(idArray)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	const encKey = Array.from(encKeyArray)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	const signSecret = Array.from(signSecretArray)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return `${id}:${encKey}:${signSecret}`;
}
