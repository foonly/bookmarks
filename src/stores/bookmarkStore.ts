import { defineStore } from "pinia";
import { STORAGE_KEY } from "../constants";
import { storageSchema } from "../types";
import type { Bookmark, Storage } from "../types";
import { encrypt, decrypt, sign, hash } from "../crypto";

const API_BASE =
	import.meta.env.VITE_API_BASE || "http://localhost:8080/api/v1";

let syncInProgress = false;

export const useBookmarkStore = defineStore("bookmarks", {
	state: (): Storage => {
		// Initialize with empty schema-validated object
		return storageSchema.parse({});
	},

	getters: {
		getBookmarkById: (state) => {
			return (id: number): Bookmark | undefined =>
				state.bookmarks.find((b) => b.created === id && !b.deleted);
		},

		sortedTags: (state): string[] => {
			const tags = new Set([...state.favoriteTags]);
			state.bookmarks.forEach((bookmark) => {
				if (bookmark.deleted) return;
				bookmark.tags.forEach((tag) => tags.add(tag));
			});
			return Array.from(tags).sort();
		},

		tagsWithCounts: (state): Record<string, number> => {
			const counts: Record<string, number> = {};
			state.bookmarks.forEach((bookmark) => {
				if (bookmark.deleted) return;
				bookmark.tags.forEach((tag) => {
					counts[tag] = (counts[tag] || 0) + 1;
				});
			});
			return counts;
		},

		activeBookmarks: (state): Bookmark[] => {
			return state.bookmarks.filter((b) => !b.deleted);
		},

		getBookmarksByTag: (state) => {
			return (tag: string): Bookmark[] => {
				return state.bookmarks.filter(
					(b) => !b.deleted && b.tags.includes(tag),
				);
			};
		},
	},

	actions: {
		loadStore() {
			console.log("Loading Pinia store...");
			const dataRaw = window.localStorage.getItem(STORAGE_KEY);
			if (dataRaw) {
				try {
					const parsed = storageSchema.parse(JSON.parse(dataRaw));
					this.$patch(parsed);
				} catch (error) {
					console.error("Error parsing storage:", error);
				}
			}
			this.purgeDeleted();
		},

		saveStore() {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.$state));
			window.dispatchEvent(new Event("store-updated"));
		},

		updateBookmark(updatedBookmark: Bookmark) {
			updatedBookmark.modified = Date.now();
			const index = this.bookmarks.findIndex(
				(b) => b.created === updatedBookmark.created,
			);

			if (index !== -1) {
				this.bookmarks[index] = { ...updatedBookmark };
			} else {
				this.bookmarks.push({ ...updatedBookmark });
			}
			this.saveStore();
		},

		removeBookmark(id: number) {
			const bookmark = this.bookmarks.find((b) => b.created === id);
			if (bookmark) {
				bookmark.deleted = true;
				bookmark.modified = Date.now();
				this.saveStore();
			}
		},

		incrementClick(id: number) {
			const bookmark = this.bookmarks.find((b) => b.created === id);
			if (bookmark) {
				bookmark.clicks = (bookmark.clicks || 0) + 1;
				bookmark.modified = Date.now();
				this.saveStore();
			}
		},

		setLanguage(lang: string) {
			this.language = lang;
			this.saveStore();
		},

		toggleFetchFavicons(enabled: boolean) {
			this.fetchFavicons = enabled;
			this.saveStore();
		},

		updateSyncSettings(syncData: Storage["sync"]) {
			this.sync = { ...syncData };
			this.saveStore();
		},

		mergeStores(remoteStore: Storage): boolean {
			let hasChanges = false;

			// Merge favorite tags
			const mergedFavoriteTags = [
				...new Set([...this.favoriteTags, ...remoteStore.favoriteTags]),
			].sort();

			if (
				JSON.stringify(mergedFavoriteTags) !==
				JSON.stringify([...this.favoriteTags].sort())
			) {
				this.favoriteTags = mergedFavoriteTags;
				hasChanges = true;
			}

			// Merge bookmarks
			const localBookmarks = [...this.bookmarks];
			remoteStore.bookmarks.forEach((remote) => {
				const localIndex = localBookmarks.findIndex(
					(l) => l.created === remote.created,
				);

				if (localIndex === -1) {
					localBookmarks.push(remote);
					hasChanges = true;
				} else {
					const local = localBookmarks[localIndex];
					if (remote.modified > (local.modified || 0)) {
						localBookmarks[localIndex] = remote;
						hasChanges = true;
					}
				}
			});

			if (hasChanges) {
				this.bookmarks = localBookmarks;
				this.saveStore();
			}

			return hasChanges;
		},

		purgeDeleted(forceAll: boolean = false) {
			const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
			const now = Date.now();
			const initialCount = this.bookmarks.length;

			this.bookmarks = this.bookmarks.filter((bookmark) => {
				if (!bookmark.deleted) return true;
				if (forceAll) return false;
				return now - bookmark.modified < THIRTY_DAYS_MS;
			});

			if (this.bookmarks.length !== initialCount) {
				this.saveStore();
			}
		},

		async performSync(): Promise<{ success: boolean; message: string }> {
			if (syncInProgress) {
				return { success: false, message: "Sync already in progress" };
			}

			const syncConfig = this.sync;

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
					this.mergeStores(remoteData);
				}

				// 4. Compare current local state with remote state to avoid redundant uploads
				const localState = {
					bookmarks: this.bookmarks,
					favoriteTags: this.favoriteTags,
				};

				// Check if remote matches exactly what we have now
				if (remoteData) {
					const remoteState = {
						bookmarks: remoteData.bookmarks,
						favoriteTags: remoteData.favoriteTags,
					};

					if (JSON.stringify(localState) === JSON.stringify(remoteState)) {
						// No changes to upload
						this.sync.lastSynced = Date.now();
						this.saveStore();
						return { success: true, message: "Sync complete (no changes)." };
					}
				}

				// 5. Encrypt and Upload local state
				const encryptedLocal = await encrypt(
					JSON.stringify(localState),
					encKey,
				);

				const timestamp = Math.floor(Date.now() / 1000).toString();
				const body: Record<string, string> = { data: encryptedLocal };

				// If this is a new sync ID (remoteData was null), include the
				// signing secret for registration.
				if (!remoteData) {
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
				this.sync.lastSynced = Date.now();
				this.saveStore();

				return {
					success: true,
					message: "Sync completed and updated backend.",
				};
			} catch (error) {
				console.error("Sync error:", error);
				return {
					success: false,
					message:
						error instanceof Error ? error.message : "Unknown sync error",
				};
			} finally {
				syncInProgress = false;
			}
		},

		initAutoSync(intervalMs: number = 300000) {
			// Immediate sync on startup if enabled
			if (this.sync.enabled) {
				this.performSync().catch(console.error);
			}

			setInterval(() => {
				if (this.sync.enabled) {
					this.performSync().catch(console.error);
				}
			}, intervalMs);

			// Sync when coming back online
			window.addEventListener("online", () => {
				if (this.sync.enabled) {
					this.performSync().catch(console.error);
				}
			});

			// Debounced sync on local store updates
			let debounceTimeout: number | undefined;
			let lastState = JSON.stringify({
				bookmarks: this.bookmarks,
				favoriteTags: this.favoriteTags,
			});

			this.$subscribe((_, state) => {
				const currentState = JSON.stringify({
					bookmarks: state.bookmarks,
					favoriteTags: state.favoriteTags,
				});

				if (currentState !== lastState) {
					lastState = currentState;
					if (debounceTimeout) clearTimeout(debounceTimeout);
					debounceTimeout = window.setTimeout(() => {
						if (this.sync.enabled) {
							this.performSync().catch(console.error);
						}
					}, 2000);
				}
			});
		},
	},
});
