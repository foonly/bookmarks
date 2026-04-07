import en from "./locales/en.json";

export const SUPPORTED_LOCALES = ["en", "de", "sv", "fi", "et"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const localeLabels: Record<SupportedLocale, string> = {
	de: "Deutsch",
	et: "Eesti",
	en: "English",
	fi: "Suomi",
	sv: "Svenska",
};

let currentLocale: SupportedLocale = "en";
let translations: any = en;

/**
 * Detects the user's preferred language based on browser settings.
 */
export function getBrowserLanguage(): SupportedLocale {
	const nav = window.navigator;
	const langs = nav.languages ? [...nav.languages] : [];
	if (nav.language) langs.push(nav.language);

	for (const lang of langs) {
		const code = lang.split("-")[0] as SupportedLocale;
		if (SUPPORTED_LOCALES.includes(code as any)) return code;
	}
	return "en";
}

/**
 * Translates a key using the current locale.
 * Supports dot-notation for nested keys (e.g., 'nav.bookmarks').
 * Supports variable replacement (e.g., 'Hello {name}').
 */
export function t(
	key: string,
	variables?: Record<string, string | number>,
): string {
	const result = translateFromObject(translations, key, variables);
	if (result !== null) return result;

	// Fallback to English if not found in current locale
	if (currentLocale !== "en") {
		const fallback = translateFromObject(en, key, variables);
		if (fallback !== null) return fallback;
	}

	return key;
}

function translateFromObject(
	obj: any,
	key: string,
	variables?: Record<string, string | number>,
): string | null {
	const keys = key.split(".");
	let value = obj;

	for (const k of keys) {
		if (value && typeof value === "object" && k in value) {
			value = value[k];
		} else {
			return null;
		}
	}

	if (typeof value !== "string") return null;

	if (variables) {
		let replaced = value;
		for (const [k, v] of Object.entries(variables)) {
			replaced = replaced.split(`{${k}}`).join(String(v));
		}
		return replaced;
	}

	return value;
}

/**
 * Formats a date according to the current locale.
 */
export function formatDate(date: number | Date): string {
	try {
		return new Intl.DateTimeFormat(currentLocale, {
			dateStyle: "medium",
			timeStyle: "short",
		}).format(date);
	} catch (e) {
		return new Date(date).toLocaleString();
	}
}

/**
 * Initializes the i18n system and loads the requested locale.
 */
export async function initI18n(lang?: string) {
	let targetLang = (lang || getBrowserLanguage()) as SupportedLocale;

	if (!SUPPORTED_LOCALES.includes(targetLang)) {
		targetLang = "en";
	}

	console.log(`Initializing i18n with locale: ${targetLang}`);
	currentLocale = targetLang;

	if (targetLang === "en") {
		translations = en;
		document.documentElement.lang = "en";
		return;
	}

	try {
		// Dynamic import allows Vite to bundle only the used locales
		// or split them into separate chunks.
		const module = await import(`./locales/${targetLang}.json`);
		translations = module.default;
		document.documentElement.lang = targetLang;
		console.log(`Successfully loaded locale: ${targetLang}`);
	} catch (e) {
		console.error(
			`Failed to load locale: ${targetLang}, falling back to English`,
			e,
		);
		translations = en;
		currentLocale = "en";
		document.documentElement.lang = "en";
	}
}

export function getCurrentLocale(): SupportedLocale {
	return currentLocale;
}
