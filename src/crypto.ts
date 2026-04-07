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
 * Helper to generate a new unique Sync ID and Secret Key pair.
 * Formatted as "id:secret"
 */
export function generateCredentials(): string {
	const idArray = new Uint8Array(6);
	const secretArray = new Uint8Array(16);

	window.crypto.getRandomValues(idArray);
	window.crypto.getRandomValues(secretArray);

	// Convert bytes to hex strings
	const id = Array.from(idArray)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	const secret = Array.from(secretArray)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return `${id}:${secret}`;
}
