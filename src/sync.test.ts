/**
 * End-to-end sync tests: separate devices (Pinia stores) syncing through a
 * fake server that enforces the real foonblob rules.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { decrypt, encrypt, generateCredentials } from "./crypto";
import { createFakeSyncServer } from "./test/fakeSyncServer";
import type { FakeSyncServer } from "./test/fakeSyncServer";
import { bookmark, loadApp, skewClock, snapshot } from "./test/helpers";

let server: FakeSyncServer;
let credentials: string;

beforeEach(() => {
	server = createFakeSyncServer();
	vi.stubGlobal("fetch", server.fetch);
	credentials = generateCredentials();
	// Expected failures are logged by the store; keep the output readable.
	vi.spyOn(console, "error").mockImplementation(() => {});
	vi.spyOn(console, "warn").mockImplementation(() => {});
});

const syncIdOf = (creds: string) => creds.split(":")[0];

describe("syncing between devices", () => {
	it("registers a new sync ID and delivers its bookmarks to another device", async () => {
		const { device } = await loadApp();
		const a = device(credentials, [bookmark(1)]);
		const b = device(credentials);

		expect(await a.performSync()).toBeNull();
		expect(server.requests).toEqual(["GET 404", "POST 201"]);
		expect(await b.performSync()).toBeNull();
		expect(snapshot(b)).toEqual(snapshot(a));
	});

	it("converges when both devices change things between syncs", async () => {
		const { device } = await loadApp();
		const a = device(credentials, [bookmark(1), bookmark(2)]);
		const b = device(credentials);
		await a.performSync();
		await b.performSync();

		a.updateBookmark({ ...a.bookmarks[0], title: "edited on A" });
		b.removeBookmark(2);
		b.updateBookmark(bookmark(3));
		await a.performSync();
		await b.performSync();
		await a.performSync();

		expect(snapshot(a)).toEqual(snapshot(b));
		expect(snapshot(a)).toMatchObject([
			{ created: 1, title: "edited on A" },
			{ created: 3 },
		]);
	});

	it("does not re-upload when devices hold the same data in a different order", async () => {
		const { device } = await loadApp();
		const a = device(credentials, [bookmark(1)]);
		const b = device(credentials, [bookmark(2)]);
		await b.performSync();
		await a.performSync();
		await b.performSync();
		// A now holds [1, 2] and B holds [2, 1].
		expect(a.bookmarks.map((x) => x.created)).not.toEqual(
			b.bookmarks.map((x) => x.created),
		);

		const uploads = server.uploads;
		for (let i = 0; i < 3; i++) {
			await a.performSync();
			await b.performSync();
		}
		expect(server.uploads).toBe(uploads);
	});

	it("does not let a click on a stale copy undo an edit from another device", async () => {
		const { device } = await loadApp();
		const a = device(credentials, [bookmark(1, { title: "original", clicks: 5 })]);
		const b = device(credentials);
		await a.performSync();
		await b.performSync();

		a.updateBookmark({ ...a.bookmarks[0], title: "edited on A" });
		await a.performSync();
		b.incrementClick(1); // B has not seen the edit yet
		b.incrementClick(1);
		await b.performSync();
		await a.performSync();

		for (const store of [a, b]) {
			expect(store.bookmarks[0]).toMatchObject({ title: "edited on A", clicks: 7 });
		}
	});
});

describe("deleting", () => {
	const encKey = () => credentials.split(":")[1];
	const remoteBlob = async () =>
		decrypt(server.identities.get(syncIdOf(credentials))!.blob.data, encKey());

	it("reaches a device that was offline for over a month, and leaves no content behind", async () => {
		const { device } = await loadApp();
		const a = device(credentials, [bookmark(1), bookmark(2, { title: "private title" })]);
		const c = device(credentials);
		await a.performSync();
		await c.performSync(); // C has bookmark 2, then goes offline

		a.removeBookmark(2);
		await a.performSync();
		expect(await remoteBlob()).not.toContain("private title");

		skewClock(40 * 24 * 3600); // C comes back weeks later
		await c.performSync();
		expect(snapshot(c).map((b) => b.created)).toEqual([1]);
	});

	it("converges with a device still on an older version", async () => {
		const { device } = await loadApp();
		const a = device(credentials, [bookmark(1), bookmark(2), bookmark(3)]);
		await a.performSync();
		// An older version deletes bookmark 3 by marking it, and its upload
		// drops the deletedIds field it does not know.
		const older = {
			bookmarks: [bookmark(1), bookmark(2), bookmark(3, { deleted: true, modified: Date.now() })],
			favoriteTags: [],
			favoriteTagsMetadata: {},
		};
		a.removeBookmark(2); // meanwhile A deletes bookmark 2
		server.identities.get(syncIdOf(credentials))!.blob.data = await encrypt(
			JSON.stringify(older),
			encKey(),
		);

		await a.performSync();
		expect(snapshot(a).map((b) => b.created)).toEqual([1]);
		const uploaded = JSON.parse(await remoteBlob());
		expect(uploaded.bookmarks.map((b: { created: number }) => b.created)).toEqual([1]);
		expect([...uploaded.deletedIds].sort()).toEqual([2, 3]);
	});
});

describe("favicon failures", () => {
	const icon = "https://example.com/page";

	it("stay on the device that recorded them", async () => {
		const { device } = await loadApp();
		const a = device(credentials, [bookmark(1)]);
		a.markFaviconFailed(icon);
		await a.performSync();

		const encKey = credentials.split(":")[1];
		const blob = server.identities.get(syncIdOf(credentials))!.blob.data;
		expect(Object.keys(JSON.parse(await decrypt(blob, encKey))).sort()).toEqual([
			"bookmarks",
			"deletedIds",
			"favoriteTags",
			"favoriteTagsMetadata",
		]);

		const b = device(credentials);
		await b.performSync();
		expect(b.isFaviconFailed(icon)).toBe(false);
	});

	it("ignores the list older versions sync, without re-uploading", async () => {
		const { device } = await loadApp();
		await device(credentials, [bookmark(1)]).performSync();
		// What an older version uploads: the same data plus its failed list.
		const encKey = credentials.split(":")[1];
		server.identities.get(syncIdOf(credentials))!.blob.data = await encrypt(
			JSON.stringify({
				bookmarks: [bookmark(1)],
				favoriteTags: [],
				favoriteTagsMetadata: {},
				failedFavicons: ["example.com"],
			}),
			encKey,
		);

		const uploads = server.uploads;
		const b = device(credentials);
		expect(await b.performSync()).toBeNull();
		await b.performSync();
		expect(server.uploads).toBe(uploads);
		expect(b.isFaviconFailed(icon)).toBe(false);
	});
});

describe("protecting remote data", () => {
	it("stops instead of overwriting remote data that fails validation", async () => {
		const { device, syncStatus } = await loadApp();
		const a = device(credentials, [bookmark(1)]);
		await a.performSync();
		const identity = server.identities.get(syncIdOf(credentials))!;
		const encKey = credentials.split(":")[1];
		identity.blob.data = await encrypt(JSON.stringify({ bookmarks: "broken" }), encKey);
		const before = identity.blob.data;

		const b = device(credentials, [bookmark(2)]);
		expect(await b.performSync()).toEqual({ code: "remote_unreadable" });
		expect(syncStatus.error).toEqual({ code: "remote_unreadable" });
		expect(server.identities.get(syncIdOf(credentials))!.blob.data).toBe(before);
	});

	it("stops when the remote data cannot be decrypted", async () => {
		const { device } = await loadApp();
		await device(credentials, [bookmark(1)]).performSync();
		const [id, , secret] = credentials.split(":");
		const wrongKey = `${id}:${"0".repeat(32)}:${secret}`;

		const uploads = server.uploads;
		expect(await device(wrongKey, [bookmark(2)]).performSync()).toEqual({ code: "decrypt" });
		expect(server.uploads).toBe(uploads);
	});
});

describe("reporting sync errors", () => {
	it("reports credentials the server does not accept", async () => {
		const { device } = await loadApp();
		await device(credentials, [bookmark(1)]).performSync();
		const [id, encKey] = credentials.split(":");
		const wrongSecret = `${id}:${encKey}:${"0".repeat(32)}`;
		expect(await device(wrongSecret).performSync()).toEqual({ code: "unauthorized" });
	});

	it("reports credentials in the wrong format without contacting the server", async () => {
		const { device } = await loadApp();
		expect(await device("only-an-id").performSync()).toEqual({
			code: "invalid_credentials",
		});
		expect(server.requests).toEqual([]);
	});

	it("refuses weak credentials without contacting the server", async () => {
		const { device } = await loadApp();
		expect(await device("myid:hunter2:hunter2").performSync()).toEqual({
			code: "weak_credentials",
		});
		expect(server.requests).toEqual([]);
	});

	it.each([
		[403, { code: "wrong_origin" }],
		[429, { code: "rate_limited" }],
		[500, { code: "server", status: 500 }],
		["network", { code: "network" }],
	] as const)("classifies a %s failure", async (failure, expected) => {
		const { device, syncStatus } = await loadApp();
		server.failNext = failure;
		expect(await device(credentials).performSync()).toEqual(expected);
		expect(syncStatus.error).toEqual(expected);
	});

	it("clears the error after a successful sync", async () => {
		const { device, syncStatus } = await loadApp();
		const a = device(credentials);
		server.failNext = 500;
		await a.performSync();
		expect(syncStatus.error).not.toBeNull();
		await a.performSync();
		expect(syncStatus.error).toBeNull();
	});
});

describe("device clock", () => {
	it.each([
		["slow", -3 * 3600],
		["fast", 2 * 3600 + 180],
	])("syncs with a clock that is hours %s, and reports the offset", async (_, skew) => {
		const { device } = await loadApp();
		await device(credentials, [bookmark(1)]).performSync();

		skewClock(skew);
		const fresh = await loadApp(); // a page loaded with the wrong clock
		server.requests = [];
		const b = fresh.device(credentials);
		expect(await b.performSync()).toBeNull();
		// The first request is rejected, then retried with the measured offset.
		expect(server.requests).toEqual(["GET 401", "GET 200"]);
		expect(Math.abs((fresh.syncStatus.clockOffsetSeconds ?? 0) + skew)).toBeLessThanOrEqual(1);
		expect(snapshot(b)).toHaveLength(1);
	});

	it("registers a new sync ID with a wrong clock", async () => {
		skewClock(-3 * 3600);
		const { device } = await loadApp();
		expect(await device(credentials, [bookmark(1)]).performSync()).toBeNull();
		// The 404 for the unknown ID already carries the server time.
		expect(server.requests).toEqual(["GET 404", "POST 201"]);
	});

	it("reports the clock when the server does not expose its time", async () => {
		const { device } = await loadApp();
		await device(credentials).performSync();

		server.exposeDate = false;
		skewClock(-3 * 3600);
		const fresh = await loadApp();
		expect(await fresh.device(credentials).performSync()).toEqual({ code: "clock" });
		expect(fresh.syncStatus.clockOffsetSeconds).toBeNull();
	});

	it("gives identical requests in the same second different timestamps", async () => {
		// The same content and timestamp sign to the same signature, which
		// the server rejects as a replay.
		const { device, syncClient } = await loadApp();
		await device(credentials).performSync();
		const [id, , secret] = credentials.split(":");
		server.requests = [];
		await Promise.all([syncClient.fetchLatest(id, secret), syncClient.fetchLatest(id, secret)]);
		expect(server.requests).toEqual(["GET 200", "GET 200"]);
	});

	it("removes the timestamp counter older versions stored", async () => {
		localStorage.setItem("bookmarks-last-timestamp", String(Math.floor(Date.now() / 1000) + 86400));
		const { device } = await loadApp();
		expect(localStorage.getItem("bookmarks-last-timestamp")).toBeNull();
		expect(await device(credentials).performSync()).toBeNull();
	});
});

describe("automatic sync", () => {
	it("uploads after a real change, but not after a click or icon failure", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
		try {
			const { device } = await loadApp();
			const a = device(credentials, [bookmark(1)]);
			await a.performSync();
			// Start auto-sync without its immediate sync, then turn sync back on.
			a.syncSettings.enabled = false;
			a.initAutoSync(60 * 60 * 1000);
			a.syncSettings.enabled = true;
			server.requests = [];
			// Watch for a sync being started: one started by a timer is still
			// busy hashing when the timers return, so requests lag behind.
			const performSync = vi.spyOn(a, "performSync");

			a.incrementClick(1);
			a.markFaviconFailed("https://example.com/page");
			await vi.advanceTimersByTimeAsync(5000);
			expect(performSync).not.toHaveBeenCalled();

			a.updateBookmark({ ...a.bookmarks[0], title: "renamed" });
			await vi.advanceTimersByTimeAsync(2000);
			expect(performSync).toHaveBeenCalledTimes(1);
			await vi.waitFor(() => expect(server.requests).toEqual(["GET 200", "POST 201"]));
		} finally {
			vi.useRealTimers();
		}
	});
});
