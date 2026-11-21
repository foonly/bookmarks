/**
 * An in-memory stand-in for the foonblob sync API, enforcing the same rules
 * as the real server (internal/api/auth.go and handlers.go in foonblob-api):
 * timestamps within 300 seconds of the server's clock, a valid HMAC-SHA256
 * signature, no replayed signatures, and registration on the first upload.
 *
 * Install it with `vi.stubGlobal("fetch", server.fetch)`.
 */
import { hash, sign } from "../crypto";

/** The real clock, captured before any test replaces Date.now. */
export const realNow: () => number = Date.now.bind(Date);

const MAX_CLOCK_SKEW_SECONDS = 300;

interface Identity {
	secret: string;
	blob: { data: string; timestamp: number };
}

export function createFakeSyncServer({ exposeDate = true } = {}) {
	const identities = new Map<string, Identity>();
	const seenSignatures = new Set<string>();

	const server = {
		identities,
		/** Every request as "METHOD status", in order. */
		requests: [] as string[],
		/** Number of blobs stored, registration included. */
		uploads: 0,
		/** Whether browsers can read the Date header (foonblob 0.9.0 and later). */
		exposeDate,
		/** Makes the next request fail with this status, or with no response. */
		failNext: null as number | "network" | null,

		fetch: async (
			input: string | URL | Request,
			init: RequestInit = {},
		): Promise<Response> => {
			const method = init.method ?? "GET";
			const res = await respond(String(input), method, init);
			server.requests.push(`${method} ${res.status}`);
			return res;
		},
	};

	function reply(status: number, body: string | object = ""): Response {
		const headers = new Headers();
		if (server.exposeDate) {
			headers.set("Date", new Date(realNow()).toUTCString());
		}
		if (typeof body === "object") {
			headers.set("Content-Type", "application/json");
			body = JSON.stringify(body);
		}
		// 204 and similar must not carry a body.
		return new Response(status === 201 ? null : body, { status, headers });
	}

	/** Returns an error message, or null when the request is authentic. */
	async function verify(
		secret: string,
		headers: Headers,
		content: string,
	): Promise<string | null> {
		const ts = Number(headers.get("X-Sync-Timestamp"));
		const now = Math.floor(realNow() / 1000);
		if (!Number.isInteger(ts) || Math.abs(ts - now) > MAX_CLOCK_SKEW_SECONDS) {
			return "timestamp expired or invalid";
		}
		const signature = headers.get("X-Sync-Signature") ?? "";
		if (signature !== (await sign(ts + content, secret))) {
			return "invalid signature";
		}
		if (seenSignatures.has(signature)) {
			return "request has already been processed";
		}
		seenSignatures.add(signature);
		return null;
	}

	async function respond(
		url: string,
		method: string,
		init: RequestInit,
	): Promise<Response> {
		const failure = server.failNext;
		server.failNext = null;
		if (failure === "network") throw new TypeError("Failed to fetch");
		if (failure !== null) return reply(failure, "injected failure");

		const path = new URL(url).pathname;
		const match = path.match(/^\/api\/v1\/sync\/([^/]+)$/);
		if (!match) return reply(404, "404 page not found");
		const id = decodeURIComponent(match[1]);
		const headers = new Headers(init.headers);
		const identity = identities.get(id);

		if (method === "GET") {
			if (!identity) return reply(404, "sync id not found");
			const error = await verify(identity.secret, headers, path);
			if (error) return reply(401, error);
			return reply(200, identity.blob);
		}

		if (method === "POST") {
			const rawBody = String(init.body ?? "");
			const body = JSON.parse(rawBody) as {
				data: string;
				registration_secret?: string;
			};
			const secret = identity?.secret ?? body.registration_secret;
			if (!secret) return reply(401, "registration secret required for new ID");
			const error = await verify(secret, headers, await hash(rawBody));
			if (error) return reply(401, error);

			// Versions always increase, as on the real server.
			const ts = Number(headers.get("X-Sync-Timestamp"));
			const timestamp = Math.max(ts, (identity?.blob.timestamp ?? 0) + 1);
			identities.set(id, { secret, blob: { data: body.data, timestamp } });
			server.uploads++;
			return reply(201);
		}

		return reply(405, "method not allowed");
	}

	return server;
}

export type FakeSyncServer = ReturnType<typeof createFakeSyncServer>;
