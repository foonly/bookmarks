import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import fi from "./locales/fi.json";
import sv from "./locales/sv.json";
import de from "./locales/de.json";
import et from "./locales/et.json";

export const SUPPORTED_LOCALES = ["de", "et", "en", "fi", "sv"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const localeLabels: Record<SupportedLocale, string> = {
	de: "Deutsch",
	et: "Eesti",
	en: "English",
	fi: "Suomi",
	sv: "Svenska",
};

const messages = {
	en,
	fi,
	sv,
	de,
	et,
};

const datetimeFormats = {
	en: {
		short: {
			dateStyle: "medium" as const,
			timeStyle: "short" as const,
		},
	},
	fi: {
		short: {
			dateStyle: "medium" as const,
			timeStyle: "short" as const,
		},
	},
	sv: {
		short: {
			dateStyle: "medium" as const,
			timeStyle: "short" as const,
		},
	},
	de: {
		short: {
			dateStyle: "medium" as const,
			timeStyle: "short" as const,
		},
	},
	et: {
		short: {
			dateStyle: "medium" as const,
			timeStyle: "short" as const,
		},
	},
};

export const i18n = createI18n({
	legacy: false, // Use Composition API
	locale: "en",
	fallbackLocale: "en",
	messages,
	datetimeFormats,
});
