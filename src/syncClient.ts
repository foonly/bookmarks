/**
 * Minimal client for the foonblob sync API.
 *
 * Every request is signed with HMAC-SHA256 over `timestamp + content`, where
 * content is the URL path for GET and the SHA-256 hex digest of the body for POST.
 * The server only accepts a timestamp that is strictly greater than the last one
 * it accepted for the sync ID, so timestamps are kept monotonic across tabs.
 */
import { hash, sign } from "./crypto";

const API_BASE =
	import.meta.env.VITE_API_BASE || "http://localhost:8080/api/v1";

const TS_KEY = "bookmarks-last-timestamp";

function readLastTimestamp(): number {
	try {
		return parseInt(localStorage.getItem(TS_KEY) || "0", 10) || 0;
	} catch {
		return 0;
	}
}

function writeLastTimestamp(ts: number) {
	try {
		localStorage.setItem(TS_KEY, String(ts));
	} catch {
		// Storage unavailable: monotonicity then only holds within this page.
	}
}

let lastTimestamp = 0;

/** Returns a Unix timestamp (seconds) greater than any previously used one. */
function nextTimestamp(): number {
	lastTimestamp = Math.max(lastTimestamp, readLastTimestamp());
	let ts = Math.floor(Date.now() / 1000);
	if (ts <= lastTimestamp) {
		ts = lastTimestamp + 1;
	}
	lastTimestamp = ts;
	writeLastTimestamp(ts);
	return ts;
}

/** Records a timestamp seen from the server so later requests stay ahead of it. */
function noteTimestamp(ts: number) {
	if (ts > Math.max(lastTimestamp, readLastTimestamp())) {
		lastTimestamp = ts;
		writeLastTimestamp(ts);
	}
}

export class SyncHttpError extends Error {
	status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
	}
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
	const timestamp = nextTimestamp();
	const content = init.method === "POST" ? await hash(init.body) : url.pathname;
	const signature = await sign(timestamp + content, secret);

	const res = await fetch(url, {
		...init,
		headers: {
			...(init.method === "POST" ? { "Content-Type": "application/json" } : {}),
			"X-Sync-Timestamp": String(timestamp),
			"X-Sync-Signature": signature,
		},
	});

	// A 401 may be a timestamp collision with another device or tab using the
	// same sync ID. Retry once with a fresh timestamp.
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
		throw new SyncHttpError(res.status, `Server error: ${res.status} ${res.statusText}`);
	}
	const result = await res.json();
	if (typeof result?.data !== "string" || typeof result?.timestamp !== "number") {
		throw new SyncHttpError(res.status, "Unexpected response from sync server");
	}
	noteTimestamp(result.timestamp);
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
		const text = await res.text().catch(() => "");
		throw new SyncHttpError(
			res.status,
			`Upload failed: ${res.status} ${res.statusText}${text ? ` — ${text.trim()}` : ""}`,
		);
	}
}
