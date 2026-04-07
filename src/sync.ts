import { store, updateStore, mergeStores } from "./store";
import { encrypt, decrypt, sign, hash } from "./crypto";
import { storageSchema } from "./types";

const API_BASE =
	import.meta.env.VITE_API_BASE || "http://localhost:8080/api/v1";

/**
 * Main synchronization workflow.
 * 1. Fetch the latest encrypted blob from the backend.
 * 2. Decrypt the blob using the local secret key.
 * 3. Merge the remote data with the local store.
 * 4. Check if the local state differs from the remote state.
 * 5. If differences exist, encrypt the new state and upload it.
 */
let syncInProgress = false;

export async function sync(): Promise<{ success: boolean; message: string }> {
	if (syncInProgress) {
		return { success: false, message: "Sync already in progress" };
	}

	const syncConfig = store.sync;

	if (!syncConfig || !syncConfig.enabled || !syncConfig.credentials) {
		return {
			success: false,
			message: "Sync is not enabled or credentials missing.",
		};
	}

	const [id, encKey, signSecret] = syncConfig.credentials.split(":");
	if (!id || !encKey || !signSecret) {
		return {
			success: false,
			message:
				"Invalid sync credentials format (expected ID:EncKey:SignSecret).",
		};
	}

	syncInProgress = true;
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
					const decryptedStr = await decrypt(encryptedBlob, encKey);
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
		const encryptedLocal = await encrypt(JSON.stringify(localState), encKey);

		const timestamp = Math.floor(Date.now() / 1000).toString();
		const body: Record<string, string> = { data: encryptedLocal };

		// If this is a new sync ID (remoteData was null and never successfully synced),
		// include the signing secret for registration.
		if (!remoteData && syncConfig.lastSynced === 0) {
			body.registration_secret = signSecret;
		}

		const bodyString = JSON.stringify(body);
		const payloadHash = await hash(bodyString);
		const signature = await sign(timestamp + payloadHash, signSecret);

		const uploadResponse = await fetch(`${API_BASE}/sync/${id}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Sync-Timestamp": timestamp,
				"X-Sync-Signature": signature,
			},
			body: bodyString,
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
	} finally {
		syncInProgress = false;
	}
}

/**
 * Periodically triggers sync if enabled. Also triggers on local store updates.
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

	// Sync when coming back online
	window.addEventListener("online", () => {
		if (store.sync?.enabled) {
			sync().catch(console.error);
		}
	});

	// Debounced sync on local store updates
	let debounceTimeout: number | undefined;
	let lastState = JSON.stringify({
		bookmarks: store.bookmarks,
		favoriteTags: store.favoriteTags,
	});

	window.addEventListener("store-updated", () => {
		const currentState = JSON.stringify({
			bookmarks: store.bookmarks,
			favoriteTags: store.favoriteTags,
		});

		if (currentState !== lastState) {
			lastState = currentState;
			if (debounceTimeout) clearTimeout(debounceTimeout);
			debounceTimeout = window.setTimeout(() => {
				if (store.sync?.enabled) {
					sync().catch(console.error);
				}
			}, 2000);
		}
	});
}
