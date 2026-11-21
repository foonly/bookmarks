import { reactive } from "vue";

/** Why the last sync failed. The UI turns each code into a translated message. */
export type SyncErrorCode =
	| "invalid_credentials"
	| "weak_credentials"
	| "network"
	| "unauthorized"
	| "clock"
	| "wrong_origin"
	| "rate_limited"
	| "server"
	| "decrypt"
	| "remote_unreadable"
	| "unknown";

export interface SyncError {
	code: SyncErrorCode;
	/** HTTP status, for the "server" code. */
	status?: number;
}

/**
 * The device clock is reported as wrong beyond this. It matches the sync
 * server's timestamp window: further off than this, sync only works because
 * the client corrects for the difference.
 */
export const CLOCK_WARNING_SECONDS = 300;

/** Sync state that is shown in the UI but not stored or synced. */
export const syncStatus = reactive<{
	/** Why the most recent sync failed, or null if it succeeded. */
	error: SyncError | null;
	/** Server clock minus device clock, once a response has reported it. */
	clockOffsetSeconds: number | null;
}>({
	error: null,
	clockOffsetSeconds: null,
});
