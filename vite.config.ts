import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["bookmark.svg", "favicon.ico", "apple-touch-icon.png"],
			manifest: {
				name: "Bookmarks",
				short_name: "Bookmarks",
				description: "A simple, encrypted bookmark manager.",
				theme_color: "#2563eb",
				background_color: "#242424",
				display: "standalone",
				icons: [
					{
						src: "bookmark.svg",
						sizes: "192x192",
						type: "image/svg+xml",
					},
					{
						src: "bookmark.svg",
						sizes: "512x512",
						type: "image/svg+xml",
					},
					{
						src: "bookmark.svg",
						sizes: "512x512",
						type: "image/svg+xml",
						purpose: "any maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "google-fonts-cache",
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
					{
						urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "gstatic-fonts-cache",
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
		}),
	],
});
