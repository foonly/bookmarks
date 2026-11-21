/**
 * Minimal client for the foonblob sync API.
 *
 * Every request is signed with HMAC-SHA256 over `timestamp + content`, where
 * content is the URL path for GET and the SHA-256 hex digest of the body for POST.
 * The server accepts timestamps within 5 minutes of its own clock and rejects
 * any signature it has already seen. Timestamps come from this device's clock,
 * corrected by the offset to the server's clock, which is measured from the
 * Date header of every response.
 */
import { hash, sign } from "./crypto";
import { syncStatus } from "./syncStatus";

const API_BASE =
	import.meta.env.VITE_API_BASE || "http://localhost:8080/api/v1";

// Older versions kept an ever-increasing timestamp counter here, which the
// server no longer needs. Remove it.
try {
	localStorage.removeItem("bookmarks-last-timestamp");
} catch {
	// Storage unavailable: nothing to remove.
}

/** Server clock minus device clock, in milliseconds. */
let clockOffsetMs = 0;

/**
 * Updates the clock offset from a response's Date header. Servers that do not
 * expose the header to browsers leave the offset unchanged.
 */
function measureClockOffset(res: Response) {
	const serverMs = Date.parse(res.headers.get("Date") ?? "");
	if (Number.isNaN(serverMs)) return;
	// Date has whole-second resolution: on average the server time is half a
	// second later than it says.
	clockOffsetMs = serverMs + 500 - Date.now();
	syncStatus.clockOffsetSeconds = Math.round(clockOffsetMs / 1000);
}

/** The last timestamp used for each signed content. */
const lastTimestampFor = new Map<string, number>();

/**
 * Returns a server-corrected Unix timestamp (seconds) for signing `content`.
 * Signing the same content with the same timestamp gives the same signature,
 * which the server rejects as a replay, so a repeat within the same second
 * gets the next second instead.
 */
function timestampFor(content: string): number {
	let ts = Math.floor((Date.now() + clockOffsetMs) / 1000);
	const last = lastTimestampFor.get(content);
	// Only bump close to the last one: after the clock offset is corrected
	// backwards, following an old timestamp would put requests out of the window.
	if (last !== undefined && ts <= last && last - ts < 60) {
		ts = last + 1;
	}
	lastTimestampFor.set(content, ts);
	return ts;
}

export class SyncHttpError extends Error {
	status: number;
	/** The server's explanation, from the response body. */
	reason: string;

	constructor(status: number, message: string, reason = "") {
		super(message);
		this.status = status;
		this.reason = reason;
	}
}

async function errorFrom(res: Response, what: string): Promise<SyncHttpError> {
	const reason = (await res.text().catch(() => "")).trim();
	return new SyncHttpError(
		res.status,
		`${what}: ${res.status} ${res.statusText}${reason ? ` — ${reason}` : ""}`,
		reason,
	);
}

function syncUrl(id: string): URL {
	return new URL(`${API_BASE}/sync/${encodeURIComponent(id)}`, location.href);
}

async function signedFetch(
	url: URL,
	secret: string,
	init: { method: "GET" } | { method: "POST"; body: string },
	isRetry = false,
): Promise<Response> {
	const content = init.method === "POST" ? await hash(init.body) : url.pathname;
	const timestamp = timestampFor(content);
	const signature = await sign(timestamp + content, secret);

	const res = await fetch(url, {
		...init,
		headers: {
			...(init.method === "POST" ? { "Content-Type": "application/json" } : {}),
			"X-Sync-Timestamp": String(timestamp),
			"X-Sync-Signature": signature,
		},
	});
	measureClockOffset(res);

	// A 401 may come from a clock offset this response has just measured, or
	// from another tab or device making the identical request in the same
	// second. Retry once with a fresh timestamp.
	if (res.status === 401 && !isRetry) {
		return signedFetch(url, secret, init, true);
	}
	return res;
}

/**
 * Fetches the latest blob. Returns null if the sync ID does not exist yet.
 */
export async function fetchLatest(
	id: string,
	secret: string,
): Promise<{ data: string; timestamp: number } | null> {
	const res = await signedFetch(syncUrl(id), secret, { method: "GET" });
	if (res.status === 404) {
		return null;
	}
	if (!res.ok) {
		throw await errorFrom(res, "Server error");
	}
	const result = await res.json();
	if (typeof result?.data !== "string" || typeof result?.timestamp !== "number") {
		throw new SyncHttpError(res.status, "Unexpected response from sync server");
	}
	return result;
}

/**
 * Uploads a new blob. When `register` is true (the ID does not exist yet), the
 * signing secret is sent so the server can store it, and the ID is locked to
 * this site's origin.
 */
export async function upload(
	id: string,
	secret: string,
	data: string,
	register: boolean,
): Promise<void> {
	const body: Record<string, string> = { data };
	if (register) {
		body.registration_secret = secret;
		body.allowed_origin = location.origin;
	}
	const res = await signedFetch(syncUrl(id), secret, {
		method: "POST",
		body: JSON.stringify(body),
	});
	if (res.status !== 201) {
		throw await errorFrom(res, "Upload failed");
	}
}
