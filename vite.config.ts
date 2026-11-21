import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		vue(),
		VitePWA({
			registerType: "autoUpdate",
			// The PNG glob below already precaches the manifest icons.
			includeManifestIcons: false,
			manifest: {
				name: "Bookmarks",
				short_name: "Bookmarks",
				description: "A simple, encrypted bookmark manager.",
				theme_color: "#2563eb",
				background_color: "#242424",
				display: "standalone",
				// Generated from public/bookmark.webp. The maskable icon has the
				// book inside the central safe zone on a white background.
				icons: [
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "maskable-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,png,svg,webp,txt}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/favicon\.im\/.*/i,
						handler: "StaleWhileRevalidate",
						options: {
							cacheName: "site-icons-cache",
							expiration: {
								maxEntries: 1000,
								maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
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
