import { store, updateStore, mergeStores } from "./store";
import { encrypt, decrypt } from "./crypto";
import { storageSchema } from "./types";

const API_BASE = "http://localhost:8080/api/v1";

/**
 * Main synchronization workflow.
 * 1. Fetch the latest encrypted blob from the backend.
 * 2. Decrypt the blob using the local secret key.
 * 3. Merge the remote data with the local store.
 * 4. Check if the local state differs from the remote state.
 * 5. If differences exist, encrypt the new state and upload it.
 */
export async function sync(): Promise<{ success: boolean; message: string }> {
	const syncConfig = store.sync;

	if (!syncConfig || !syncConfig.enabled || !syncConfig.credentials) {
		return {
			success: false,
			message: "Sync is not enabled or credentials missing.",
		};
	}

	const [id, secret] = syncConfig.credentials.split(":");
	if (!id || !secret) {
		return {
			success: false,
			message: "Invalid sync credentials format (expected ID:Secret).",
		};
	}

	try {
		// 1. Fetch latest from backend
		const response = await fetch(`${API_BASE}/sync/${id}`);

		let remoteData = null;

		if (response.ok) {
			const result = await response.json();
			const encryptedBlob = result.data;

			if (encryptedBlob) {
				// 2. Decrypt
				try {
					const decryptedStr = await decrypt(encryptedBlob, secret);
					const parsed = JSON.parse(decryptedStr);

					// Validate schema
					const validated = storageSchema.safeParse(parsed);
					if (validated.success) {
						remoteData = validated.data;
					} else {
						console.error(
							"Remote data schema validation failed",
							validated.error,
						);
					}
				} catch (decryptError) {
					console.error("Decryption failed", decryptError);
					return {
						success: false,
						message: "Decryption failed. Check your secret key.",
					};
				}
			}
		} else if (response.status !== 404) {
			// 404 is expected for new accounts; other errors are reported.
			return {
				success: false,
				message: `Server error: ${response.statusText}`,
			};
		}

		// 3. Merge remote into local (Last Modified Wins)
		if (remoteData) {
			mergeStores(remoteData);
		}

		// 4. Compare current local state with remote state to avoid redundant uploads
		const localState = {
			bookmarks: store.bookmarks,
			favoriteTags: store.favoriteTags,
		};

		// Check if remote matches exactly what we have now
		if (remoteData) {
			const remoteState = {
				bookmarks: remoteData.bookmarks,
				favoriteTags: remoteData.favoriteTags,
			};

			if (JSON.stringify(localState) === JSON.stringify(remoteState)) {
				// No changes to upload
				updateStore({
					sync: {
						...store.sync,
						lastSynced: Date.now(),
					},
				});
				return { success: true, message: "Sync complete (no changes)." };
			}
		}

		// 5. Encrypt and Upload local state
		const encryptedLocal = await encrypt(JSON.stringify(localState), secret);

		const uploadResponse = await fetch(`${API_BASE}/sync/${id}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ data: encryptedLocal }),
		});

		if (!uploadResponse.ok) {
			throw new Error(`Upload failed: ${uploadResponse.statusText}`);
		}

		// Update last synced timestamp
		updateStore({
			sync: {
				...store.sync,
				lastSynced: Date.now(),
			},
		});

		return { success: true, message: "Sync completed and updated backend." };
	} catch (error) {
		console.error("Sync error:", error);
		return {
			success: false,
			message: error instanceof Error ? error.message : "Unknown sync error",
		};
	}
}

/**
 * Periodically triggers sync if enabled.
 */
export function initAutoSync(intervalMs: number = 300000) {
	// Default 5 minutes
	// Immediate sync on startup if enabled
	if (store.sync?.enabled) {
		sync().catch(console.error);
	}

	setInterval(() => {
		if (store.sync?.enabled) {
			sync().catch(console.error);
		}
	}, intervalMs);
}
