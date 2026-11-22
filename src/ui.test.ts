import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commitPendingDelete, deleteWithUndo, pendingDelete, UNDO_MS, undoDelete } from "./ui";
import type { Bookmark } from "./types";

const bookmark = (created: number) => ({ created, title: `b${created}` }) as Bookmark;

describe("deleteWithUndo", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		undoDelete();
		vi.useRealTimers();
	});

	it("removes the bookmark only after the undo time", () => {
		const remove = vi.fn();
		deleteWithUndo(bookmark(1), remove);
		expect(pendingDelete.bookmark?.created).toBe(1);
		vi.advanceTimersByTime(UNDO_MS - 1);
		expect(remove).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(remove).toHaveBeenCalledWith(1);
		expect(pendingDelete.bookmark).toBeNull();
	});

	it("keeps the bookmark when undone", () => {
		const remove = vi.fn();
		deleteWithUndo(bookmark(1), remove);
		undoDelete();
		vi.advanceTimersByTime(UNDO_MS);
		expect(remove).not.toHaveBeenCalled();
		expect(pendingDelete.bookmark).toBeNull();
	});

	it("removes the earlier bookmark at once when another is deleted", () => {
		const remove = vi.fn();
		deleteWithUndo(bookmark(1), remove);
		deleteWithUndo(bookmark(2), remove);
		expect(remove).toHaveBeenCalledWith(1);
		expect(pendingDelete.bookmark?.created).toBe(2);
	});

	it("removes the bookmark at once when committed", () => {
		const remove = vi.fn();
		deleteWithUndo(bookmark(1), remove);
		commitPendingDelete();
		expect(remove).toHaveBeenCalledOnce();
		vi.advanceTimersByTime(UNDO_MS);
		expect(remove).toHaveBeenCalledOnce();
	});
});
