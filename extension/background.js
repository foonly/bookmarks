// Bookmarks browser extension. It keeps no bookmarks itself: it opens the
// web app, or the web app's add form filled in with the current page.

const api = globalThis.browser ?? globalThis.chrome;

const APP_URL = "https://bookmarks.foonly.dev/";
const ADD_MENU_ID = "add-page";

// Tabs this extension opened for adding a bookmark, mapped to the tab the
// page was in. Kept in session storage because the background script is
// stopped when idle and would forget a plain variable.
const ADD_TABS_KEY = "addTabs";

api.runtime.onInstalled.addListener(() => {
	api.contextMenus.create({
		id: ADD_MENU_ID,
		title: api.i18n.getMessage("addPage"),
		contexts: ["action", "page"],
	});
});

// Left click on the toolbar button, or its shortcut (_execute_action).
api.action.onClicked.addListener(() => openApp());

api.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === ADD_MENU_ID) addPage(tab);
});

api.commands.onCommand.addListener(async (command, tab) => {
	if (command !== "add-page") return;
	// Older browsers do not pass the tab to command listeners.
	tab ??= (await api.tabs.query({ active: true, currentWindow: true }))[0];
	addPage(tab);
});

/** Switches to an open Bookmarks tab, or opens one. */
async function openApp() {
	const tabs = await api.tabs.query({ url: `${APP_URL}*` });
	const current = await api.windows.getCurrent();
	const tab = tabs.find((t) => t.windowId === current.id) ?? tabs[0];
	if (!tab) {
		await api.tabs.create({ url: APP_URL });
		return;
	}
	await api.tabs.update(tab.id, { active: true });
	await api.windows.update(tab.windowId, { focused: true });
}

/**
 * Opens the add form for the page in `tab`, in a new tab beside it. Pages
 * that cannot be bookmarked (the browser's own pages) open an empty form.
 */
async function addPage(tab) {
	const params = new URLSearchParams();
	if (tab?.url && /^https?:/i.test(tab.url)) {
		params.set("url", tab.url);
		if (tab.title && tab.title !== tab.url) params.set("title", tab.title);
	}
	const query = params.toString();
	const created = await api.tabs.create({
		url: `${APP_URL}#/add${query ? `?${query}` : ""}`,
		index: tab ? tab.index + 1 : undefined,
		openerTabId: tab?.id,
	});
	await setAddTab(created.id, tab?.id ?? null);
}

// Once the form is saved or cancelled, the web app leaves the /add route.
// Close the tab then and go back to the page the bookmark was added from.
api.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
	if (!changeInfo.url) return;
	const addTabs = await getAddTabs();
	if (!(tabId in addTabs)) return;
	if (isAddForm(changeInfo.url)) return;

	const openerId = addTabs[tabId];
	await setAddTab(tabId, undefined);
	if (openerId !== null) {
		await api.tabs.update(openerId, { active: true }).catch(() => {});
	}
	await api.tabs.remove(tabId).catch(() => {});
});

api.tabs.onRemoved.addListener((tabId) => setAddTab(tabId, undefined));

function isAddForm(url) {
	if (!url.startsWith(APP_URL)) return false;
	const hash = new URL(url).hash;
	return hash === "#/add" || hash.startsWith("#/add?");
}

async function getAddTabs() {
	const stored = await api.storage.session.get(ADD_TABS_KEY);
	return stored[ADD_TABS_KEY] ?? {};
}

/** Records the opener of an add tab, or forgets the tab when `openerId` is undefined. */
async function setAddTab(tabId, openerId) {
	const addTabs = await getAddTabs();
	if (openerId === undefined) {
		if (!(tabId in addTabs)) return;
		delete addTabs[tabId];
	} else {
		addTabs[tabId] = openerId;
	}
	await api.storage.session.set({ [ADD_TABS_KEY]: addTabs });
}
