import { defineStore } from "pinia";
import { STORAGE_KEY } from "../constants";
import { storageSchema } from "../types";
import type { Bookmark, Storage } from "../types";
import { encrypt, decrypt } from "../crypto";
import { fetchLatest, upload, SyncHttpError } from "../syncClient";
import { syncStatus } from "../syncStatus";
import { parseCredentials } from "../credentials";
import type { SyncError } from "../syncStatus";

let syncInProgress = false;

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a site whose icon failed to load shows the placeholder. */
export const FAVICON_RETRY_MS = 30 * DAY_MS;

/** Classifies an exception thrown during a sync for the UI. */
function syncErrorFrom(error: unknown): SyncError {
	if (error instanceof SyncHttpError) {
		switch (error.status) {
			case 401:
				// The server explains why; a timestamp outside its window means
				// the device clock is off and could not be corrected for.
				return {
					code: /timestamp/i.test(error.reason) ? "clock" : "unauthorized",
				};
			case 403:
				return { code: "wrong_origin" };
			case 429:
				return { code: "rate_limited" };
			default:
				return { code: "server", status: error.status };
		}
	}
	// fetch rejects with a TypeError when no response arrives at all.
	if (error instanceof TypeError) {
		return { code: "network" };
	}
	return { code: "unknown" };
}

type SyncedState = Pick<
	Storage,
	"bookmarks" | "favoriteTags" | "favoriteTagsMetadata" | "deletedIds"
>;

const byKey = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Returns the synced part of the store in a fixed order. Devices merge
 * bookmarks in different orders, so comparing or uploading the raw arrays
 * makes devices see "changes" that are only reordering, and re-upload to
 * each other on every sync.
 */
function canonicalSyncState(state: SyncedState): SyncedState {
	return {
		bookmarks: [...state.bookmarks].sort((a, b) => a.created - b.created),
		deletedIds: [...new Set(state.deletedIds)].sort((a, b) => a - b),
		favoriteTags: [...state.favoriteTags].sort(byKey),
		favoriteTagsMetadata: Object.fromEntries(
			Object.entries(state.favoriteTagsMetadata || {}).sort(([a], [b]) =>
				byKey(a, b),
			),
		),
	};
}

export const useBookmarkStore = defineStore("bookmarks", {
	state: (): Storage => {
		// Initialize with empty schema-validated object
		return storageSchema.parse({});
	},

	getters: {
		getBookmarkById: (state) => {
			return (id: number): Bookmark | undefined =>
				state.bookmarks.find((b) => b.created === id);
		},

		sortedTags: (state): string[] => {
			const tags = new Set([...state.favoriteTags]);
			state.bookmarks.forEach((bookmark) => {
				bookmark.tags.forEach((tag) => tags.add(tag));
			});
			return Array.from(tags).sort();
		},

		tagsWithCounts: (state): Record<string, number> => {
			const counts: Record<string, number> = {};
			state.bookmarks.forEach((bookmark) => {
				bookmark.tags.forEach((tag) => {
					counts[tag] = (counts[tag] || 0) + 1;
				});
			});
			return counts;
		},

		// Deleted bookmarks are removed from the list (see applyDeletions),
		// so every bookmark in it is active.
		activeBookmarks: (state): Bookmark[] => state.bookmarks,

		getBookmarksByTag: (state) => {
			return (tag: string): Bookmark[] => {
				return state.bookmarks.filter((b) => b.tags.includes(tag));
			};
		},

		isFavoriteTag: (state) => {
			return (tag: string): boolean => state.favoriteTags.includes(tag);
		},

		suggestedTags: (state): string[] => {
			if (state.favoriteTags.length > 0) {
				return state.favoriteTags;
			}
			const counts: Record<string, number> = {};
			state.bookmarks.forEach((bookmark) => {
				bookmark.tags.forEach((tag) => {
					counts[tag] = (counts[tag] || 0) + 1;
				});
			});
			return Object.entries(counts)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 4)
				.map(([tag]) => tag);
		},

		isFaviconFailed: (state) => {
			return (url: string): boolean => {
				try {
					const failedAt = state.faviconFailures[new URL(url).hostname];
					return failedAt !== undefined && Date.now() - failedAt < FAVICON_RETRY_MS;
				} catch {
					return true;
				}
			};
		},

		/**
		 * Number of sites shown without their icon. Expired failures are
		 * removed on load (pruneFaviconFailures), so this counts stored ones.
		 */
		failedFaviconCount: (state): number => Object.keys(state.faviconFailures).length,
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
					// The next saveStore() overwrites STORAGE_KEY, so keep the raw
					// data under a separate key rather than losing it.
					try {
						window.localStorage.setItem(
							`${STORAGE_KEY}-unreadable-${Date.now()}`,
							dataRaw,
						);
					} catch (backupError) {
						console.error("Could not back up unreadable storage:", backupError);
					}
				}
			}
			this.applyDeletions();
			this.pruneFaviconFailures();
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

		/** Deletes a bookmark for good, on every device once synced. */
		removeBookmark(id: number) {
			this.bookmarks = this.bookmarks.filter((b) => b.created !== id);
			if (!this.deletedIds.includes(id)) {
				this.deletedIds.push(id);
			}
			this.saveStore();
		},

		/**
		 * Removes every bookmark whose ID is in `deletedIds`, after moving
		 * markers from older versions (`deleted: true`) into the list.
		 */
		applyDeletions() {
			const deleted = new Set(this.deletedIds);
			for (const bookmark of this.bookmarks) {
				if (bookmark.deleted) deleted.add(bookmark.created);
			}
			const bookmarks = this.bookmarks.filter((b) => !deleted.has(b.created));
			if (
				bookmarks.length !== this.bookmarks.length ||
				deleted.size !== this.deletedIds.length
			) {
				this.bookmarks = bookmarks;
				this.deletedIds = [...deleted];
				this.saveStore();
			}
		},

		incrementClick(id: number) {
			const bookmark = this.bookmarks.find((b) => b.created === id);
			if (bookmark) {
				// Clicks deliberately leave `modified` alone: it decides which
				// device's copy of the bookmark wins a merge, and a click on a
				// stale copy must not beat a real edit made elsewhere. Clicks
				// are merged separately (see mergeStores).
				bookmark.clicks = (bookmark.clicks || 0) + 1;
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

		updateSyncSettings(syncData: Storage["syncSettings"]) {
			this.$state.syncSettings = { ...syncData };
			this.saveStore();
		},

		toggleFavoriteTag(tag: string) {
			const index = this.favoriteTags.indexOf(tag);
			if (index > -1) {
				this.favoriteTags.splice(index, 1);
			} else {
				this.favoriteTags.push(tag);
			}
			this.favoriteTagsMetadata[tag] = Date.now();
			this.saveStore();
		},

		markFaviconFailed(url: string) {
			try {
				this.faviconFailures[new URL(url).hostname] = Date.now();
				this.saveStore();
			} catch {
				// Ignore invalid URLs
			}
		},

		/** Forgets all icon failures, so every site icon is tried again. */
		retryFavicons() {
			this.faviconFailures = {};
			this.saveStore();
		},

		/** Drops failures old enough to be retried, keeping the record small. */
		pruneFaviconFailures() {
			const now = Date.now();
			const kept = Object.fromEntries(
				Object.entries(this.faviconFailures).filter(
					([, failedAt]) => now - failedAt < FAVICON_RETRY_MS,
				),
			);
			if (Object.keys(kept).length !== Object.keys(this.faviconFailures).length) {
				this.faviconFailures = kept;
				this.saveStore();
			}
		},

		mergeStores(remoteStore: Storage): boolean {
			let hasChanges = false;

			// Deletions are final: a bookmark deleted on any device is removed
			// everywhere, even if it was edited elsewhere since. Older versions
			// send deletions as bookmarks marked `deleted: true` instead.
			const deleted = new Set([
				...this.deletedIds,
				...remoteStore.deletedIds,
				...remoteStore.bookmarks.filter((b) => b.deleted).map((b) => b.created),
			]);
			if (deleted.size !== new Set(this.deletedIds).size) {
				this.$state.deletedIds = [...deleted];
				hasChanges = true;
			}

			// Merge favorite tags using metadata for "Last Write Wins"
			const allTags = new Set([
				...Object.keys(this.favoriteTagsMetadata),
				...Object.keys(remoteStore.favoriteTagsMetadata || {}),
				...this.favoriteTags,
				...remoteStore.favoriteTags,
			]);

			const newFavoriteTags: string[] = [];
			const newMetadata: Record<string, number> = {
				...this.favoriteTagsMetadata,
			};

			allTags.forEach((tag) => {
				const localTs = this.favoriteTagsMetadata[tag] || 0;
				const remoteTs = (remoteStore.favoriteTagsMetadata || {})[tag] || 0;

				if (remoteTs > localTs) {
					// Remote is newer
					newMetadata[tag] = remoteTs;
					if (remoteStore.favoriteTags.includes(tag)) {
						newFavoriteTags.push(tag);
					}
				} else if (remoteTs === 0 && localTs === 0) {
					// Neither side has a timestamp (favorited before timestamps were
					// recorded). Keep it if either side has it; otherwise devices
					// disagree forever and re-upload on every sync.
					if (
						this.favoriteTags.includes(tag) ||
						remoteStore.favoriteTags.includes(tag)
					) {
						newFavoriteTags.push(tag);
					}
				} else {
					// Local is newer or equal
					if (this.favoriteTags.includes(tag)) {
						newFavoriteTags.push(tag);
					}
				}
			});

			newFavoriteTags.sort();

			if (
				JSON.stringify(newFavoriteTags) !==
					JSON.stringify([...this.favoriteTags].sort()) ||
				JSON.stringify(newMetadata) !==
					JSON.stringify(this.favoriteTagsMetadata)
			) {
				this.$state.favoriteTags = newFavoriteTags;
				this.$state.favoriteTagsMetadata = newMetadata;
				hasChanges = true;
			}

			// Merge bookmarks
			const localBookmarks = this.bookmarks.filter((b) => !deleted.has(b.created));
			if (localBookmarks.length !== this.bookmarks.length) {
				hasChanges = true;
			}
			remoteStore.bookmarks.forEach((remote) => {
				if (deleted.has(remote.created)) return;
				const localIndex = localBookmarks.findIndex(
					(l) => l.created === remote.created,
				);

				if (localIndex === -1) {
					localBookmarks.push(remote);
					hasChanges = true;
				} else {
					const local = localBookmarks[localIndex];
					const remoteIsNewer = remote.modified > (local.modified || 0);
					// Content follows the newest edit; the click count takes the
					// higher of the two, independent of which edit won.
					const clicks = Math.max(local.clicks || 0, remote.clicks || 0);
					if (remoteIsNewer || clicks !== (local.clicks || 0)) {
						localBookmarks[localIndex] = {
							...(remoteIsNewer ? remote : local),
							clicks,
						};
						hasChanges = true;
					}
				}
			});

			if (hasChanges) {
				this.$state.bookmarks = localBookmarks;
				this.saveStore();
			}

			return hasChanges;
		},

		/**
		 * Merges an imported backup into the store, as a restore:
		 * - Bookmarks deleted since the backup was made come back, under a new
		 *   ID, since their old one is in the deleted list.
		 * - Bookmarks without an ID (from other tools or hand-written files)
		 *   all default to ID 0 and would collapse into one, so they get new
		 *   IDs too.
		 * Either kind is skipped when its URL is already bookmarked, so
		 * importing the same file twice adds nothing. Deletions recorded in the
		 * backup itself are not applied.
		 */
		importData(data: Storage): boolean {
			const now = Date.now();
			const deleted = new Set(this.deletedIds);
			const usedIds = new Set([...this.bookmarks.map((b) => b.created), ...deleted]);
			const activeUrls = new Set(this.bookmarks.map((b) => b.url));
			let nextId = now;

			const bookmarks: Bookmark[] = [];
			for (const bookmark of data.bookmarks) {
				if (bookmark.deleted) continue;
				if (bookmark.created && !deleted.has(bookmark.created)) {
					bookmarks.push(bookmark);
					continue;
				}
				if (activeUrls.has(bookmark.url)) continue;
				while (usedIds.has(nextId)) nextId++;
				usedIds.add(nextId);
				activeUrls.add(bookmark.url);
				bookmarks.push({
					...bookmark,
					created: nextId,
					modified: bookmark.modified || now,
				});
			}
			return this.mergeStores({ ...data, bookmarks, deletedIds: [] });
		},

		/**
		 * Syncs with the server and records the outcome in `syncStatus`, which
		 * the UI shows. Returns null on success, or why the sync failed.
		 */
		async performSync(): Promise<SyncError | null> {
			if (syncInProgress || !this.syncSettings.enabled) {
				return null;
			}
			syncInProgress = true;
			try {
				const error = await this.syncOnce();
				syncStatus.error = error;
				return error;
			} catch (error) {
				console.error("Sync error:", error);
				syncStatus.error = syncErrorFrom(error);
				return syncStatus.error;
			} finally {
				syncInProgress = false;
			}
		},

		/** One sync round. Use performSync, which guards and records it. */
		async syncOnce(): Promise<SyncError | null> {
			const check = parseCredentials(this.syncSettings.credentials || "");
			if (!check.ok) {
				return { code: check.problem === "weak" ? "weak_credentials" : "invalid_credentials" };
			}
			const { id, encKey, signSecret } = check.credentials;

			// 1. Fetch latest from backend (null: sync ID not registered yet)
			const latest = await fetchLatest(id, signSecret);

			let remoteData = null;

			if (latest?.data) {
				// 2. Decrypt
				let parsed: unknown;
				try {
					parsed = JSON.parse(await decrypt(latest.data, encKey));
				} catch (decryptError) {
					console.error("Decryption failed", decryptError);
					return { code: "decrypt" };
				}

				// Validate schema
				const validated = storageSchema.safeParse(parsed);
				if (!validated.success) {
					// Never upload over remote data we could not read: that
					// would discard every other device's bookmarks.
					console.error("Remote data schema validation failed", validated.error);
					return { code: "remote_unreadable" };
				}
				remoteData = validated.data;
			}

			// 3. Merge remote into local (Last Modified Wins)
			if (remoteData) {
				this.mergeStores(remoteData);
			}

			// 4. Compare current local state with remote state to avoid redundant uploads
			const localState = canonicalSyncState(this.$state);

			// Check if remote matches what we have now, ignoring order
			const unchanged =
				remoteData &&
				JSON.stringify(localState) ===
					JSON.stringify(canonicalSyncState(remoteData));

			if (!unchanged) {
				// 5. Encrypt and Upload local state
				const encryptedLocal = await encrypt(JSON.stringify(localState), encKey);

				// A sync ID the server does not know yet is registered with this upload.
				await upload(id, signSecret, encryptedLocal, latest === null);
			}

			this.syncSettings.lastSynced = Date.now();
			this.saveStore();
			return null;
		},

		initAutoSync(intervalMs: number = 300000) {
			// Immediate sync on startup if enabled
			if (this.syncSettings.enabled) {
				this.performSync().catch(console.error);
			}

			setInterval(() => {
				if (this.syncSettings.enabled) {
					this.performSync().catch(console.error);
				}
			}, intervalMs);

			// Sync when coming back online
			window.addEventListener("online", () => {
				if (this.syncSettings.enabled) {
					this.performSync().catch(console.error);
				}
			});

			// Debounced sync on local store updates
			let debounceTimeout: number | undefined;
			// Click counts are left out so that opening a bookmark does not
			// upload the whole store each time; they go up with the next sync
			// (startup, the interval, coming online, or any real change).
			const withoutClicks = (key: string, value: unknown) =>
				key === "clicks" ? undefined : value;
			let lastState = JSON.stringify(
				canonicalSyncState(this.$state),
				withoutClicks,
			);

			this.$subscribe((_mutation, state) => {
				const currentState = JSON.stringify(
					canonicalSyncState(state),
					withoutClicks,
				);

				if (currentState !== lastState) {
					lastState = currentState;
					if (debounceTimeout) clearTimeout(debounceTimeout);
					debounceTimeout = window.setTimeout(() => {
						if (this.syncSettings.enabled) {
							this.performSync().catch(console.error);
						}
					}, 2000);
				}
			});
		},
	},
});
